#!/usr/bin/env bash
#
# sync-checkout.sh: bring this checkout to a named ref on its remote.
#
#   agent/vm/sync-checkout.sh [--ref <branch-or-tag>] [--remote <name>]
#                             [--discard-local] [--dry-run]
#
# The hosted checkout is a deploy target. Nothing is developed there, so the
# only correct state for it is "exactly the ref the owner named". This script
# gets it there, and says so plainly when it cannot:
#
#   1. looks the ref up on the remote (a branch or a tag, not both);
#   2. refuses if the checkout has local changes: modified tracked files,
#      untracked files that are not ignored, or commits that exist nowhere on
#      the remote. A plain `git pull` would stop on these too, but silently,
#      and the machine would then run stale code until somebody noticed;
#   3. with --discard-local, first saves those changes under
#      agent/logs/vm-local-changes/<timestamp>/ (patch files and copies), and
#      only then resets. Nothing is lost, and the folder is the evidence that
#      something on the machine tried to change the code;
#   4. fetches, resets to the ref, and checks that HEAD is the commit it meant
#      and the tree is clean.
#
# Ignored files (logs, data, .claude/settings.local.json) are never touched.
# A tag that has moved on the remote is refused by git, on purpose: a pinned
# ref that changes under you is something to look at, not to follow.
#
# --dry-run asks the remote where the ref is and reports what would happen. It
# does not fetch, write or reset.
#
# Exit codes: 0 at the ref (already, or after syncing), or skipped because a
#               scheduled run holds the lock
#             1 synced but the result did not verify, or an unexpected failure
#             2 bad usage
#             3 refused: local changes, and --discard-local was not given
#             4 the remote or the ref could not be read
#
# Settings (environment variables):
#   AGENT_REPO            checkout to sync (default: the one holding this script)
#   AGENT_SYNC_REF        branch or tag to track (default: main); --ref overrides
#   AGENT_SYNC_REMOTE     remote name (default: origin); --remote overrides
#   AGENT_GIT_TOKEN_FILE  file holding a read-only repository token. When set,
#                         git is given the token through a credential helper
#                         that reads the file at fetch time. The token is never
#                         written into the remote URL, the git config or argv.
#   AGENT_GIT_TOKEN_USER  username sent with the token (default: x-access-token)
#
# This file is replaced by the reset it performs. Everything runs inside
# main(), which bash reads in full before executing, so that is safe. On a
# machine where this runs with more privilege than the operator has, install a
# fixed copy outside the checkout instead: code that arrives by itself from the
# remote should not run as root.

set -u

main() {
  local script_dir repo remote ref token_file token_user discard dry
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  repo="${AGENT_REPO:-$(cd "$script_dir/../.." && pwd)}"
  export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$PATH"
  remote="${AGENT_SYNC_REMOTE:-origin}"
  ref="${AGENT_SYNC_REF:-main}"
  token_file="${AGENT_GIT_TOKEN_FILE:-}"
  token_user="${AGENT_GIT_TOKEN_USER:-x-access-token}"
  discard=0
  dry=0

  while [ $# -gt 0 ]; do
    case "$1" in
      --ref) ref="${2:-}"; shift 2 || { echo "sync-checkout: --ref needs a value" >&2; return 2; } ;;
      --remote) remote="${2:-}"; shift 2 || { echo "sync-checkout: --remote needs a value" >&2; return 2; } ;;
      --discard-local) discard=1; shift ;;
      --dry-run) dry=1; shift ;;
      -h|--help) sed -n '3,52p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; return 0 ;;
      *) echo "sync-checkout: unknown argument '$1' (try --help)" >&2; return 2 ;;
    esac
  done

  case "$ref" in ''|-*|*[[:space:]]*) echo "sync-checkout: '$ref' is not a usable ref name" >&2; return 2 ;; esac
  case "$remote" in ''|-*|*[[:space:]]*) echo "sync-checkout: '$remote' is not a usable remote name" >&2; return 2 ;; esac
  git check-ref-format --allow-onelevel "$ref" 2>/dev/null \
    || { echo "sync-checkout: '$ref' is not a valid ref name" >&2; return 2; }

  local top
  top="$(git -C "$repo" rev-parse --show-toplevel 2>/dev/null)" \
    || { echo "sync-checkout: $repo is not a git checkout" >&2; return 2; }
  repo="$top"

  local log_dir log
  log_dir="$repo/agent/logs/sync"
  log="$log_dir/sync.log"
  [ "$dry" -eq 1 ] || mkdir -p "$log_dir" 2>/dev/null
  say() {
    local line
    line="$(date '+%Y-%m-%dT%H:%M:%S%z') sync-checkout: $*"
    echo "$line"
    [ "$dry" -eq 1 ] || [ ! -d "$log_dir" ] || echo "$line" >> "$log"
  }

  # git against the remote. With a token file, a one-off credential helper
  # hands git the token; the empty helper entry first clears any other helper.
  rgit() {
    if [ -n "$token_file" ]; then
      AGENT_GIT_TOKEN_FILE="$token_file" AGENT_GIT_TOKEN_USER="$token_user" GIT_TERMINAL_PROMPT=0 \
        git -C "$repo" -c credential.helper= \
        -c 'credential.helper=!f() { test "$1" = get || exit 0; echo "username=$AGENT_GIT_TOKEN_USER"; echo "password=$(cat "$AGENT_GIT_TOKEN_FILE")"; }; f' \
        "$@"
    else
      GIT_TERMINAL_PROMPT=0 git -C "$repo" "$@"
    fi
  }

  if [ -n "$token_file" ] && [ ! -r "$token_file" ]; then
    say "FAILED: AGENT_GIT_TOKEN_FILE ($token_file) is not readable by $(id -un)"
    return 4
  fi

  # A scheduled run reads the working tree while it runs. Do not move the tree
  # under it; the next pass will sync.
  if [ -d "$repo/agent/logs/scheduled/.lock" ] && [ "$dry" -eq 0 ]; then
    say "SKIP: a scheduled run holds the lock ($(cat "$repo/agent/logs/scheduled/.lock/owner" 2>/dev/null)); not moving the tree under it"
    return 0
  fi

  # ---- where is the ref on the remote? --------------------------------------
  local listing heads tags kind remote_sha
  listing="$(rgit ls-remote "$remote" "refs/heads/$ref" "refs/tags/$ref" 2>&1)" \
    || { say "FAILED: cannot read remote '$remote': $(printf '%s\n' "$listing" | grep -v '^[[:space:]]*$' | head -1)"; return 4; }
  heads="$(printf '%s\n' "$listing" | awk -v r="refs/heads/$ref" '$2 == r { print $1 }')"
  tags="$(printf '%s\n' "$listing" | awk -v r="refs/tags/$ref" '$2 == r { print $1 }')"
  if [ -n "$heads" ] && [ -n "$tags" ]; then
    say "FAILED: '$ref' is both a branch and a tag on '$remote'; name one that is unambiguous"
    return 4
  elif [ -n "$heads" ]; then kind=branch; remote_sha="$heads"
  elif [ -n "$tags" ]; then kind=tag; remote_sha="$tags"
  else
    say "FAILED: '$remote' has no branch or tag named '$ref'"
    return 4
  fi

  # ---- local changes ---------------------------------------------------------
  local before tracked untracked local_commits
  before="$(git -C "$repo" rev-parse HEAD 2>/dev/null)" || { say "FAILED: the checkout has no HEAD"; return 1; }
  tracked="$(git -C "$repo" status --porcelain --untracked-files=no)"
  untracked="$(git -C "$repo" ls-files --others --exclude-standard)"
  # Commits on HEAD that no remote branch and no tag contains. Moving a pin
  # back to an older tag is not a local commit.
  local_commits="$(git -C "$repo" rev-list --count HEAD --not --remotes="$remote" --tags 2>/dev/null || echo 0)"
  count() { if [ -z "$1" ]; then echo 0; else printf '%s\n' "$1" | wc -l | tr -d ' '; fi; }
  local n_tracked n_untracked
  n_tracked="$(count "$tracked")"
  n_untracked="$(count "$untracked")"
  local has_local=0
  if [ "$n_tracked" != 0 ] || [ "$n_untracked" != 0 ] || [ "$local_commits" != 0 ]; then has_local=1; fi

  if [ "$has_local" -eq 1 ]; then
    say "local changes: $n_tracked modified tracked file(s), $n_untracked untracked file(s), $local_commits commit(s) not on '$remote'"
    [ -n "$tracked" ] && printf '%s\n' "$tracked" | head -5 | sed 's/^/    /'
    [ -n "$untracked" ] && printf '%s\n' "$untracked" | head -5 | sed 's/^/    ?? /'
    if [ "$discard" -eq 0 ]; then
      say "REFUSED: not syncing over local changes. Look at them, then commit them where development happens or rerun with --discard-local (which saves them under agent/logs/vm-local-changes/ first)."
      return 3
    fi
  fi

  # ---- dry run stops here ----------------------------------------------------
  if [ "$dry" -eq 1 ]; then
    if [ "$kind" = tag ]; then
      say "dry run: '$ref' is a tag on '$remote' (object ${remote_sha:0:12}); HEAD is ${before:0:12}"
    elif [ "$before" = "$remote_sha" ]; then
      say "dry run: already at $kind '$ref' (${before:0:12})"
    else
      say "dry run: would move ${before:0:12} -> ${remote_sha:0:12} ($kind '$ref' on '$remote')"
    fi
    [ "$has_local" -eq 1 ] && say "dry run: would first save the local changes above under agent/logs/vm-local-changes/ and discard them"
    say "dry run: nothing fetched, nothing changed"
    return 0
  fi

  # ---- fetch -----------------------------------------------------------------
  local spec target_ref target out
  if [ "$kind" = branch ]; then
    spec="+refs/heads/$ref:refs/remotes/$remote/$ref"
    target_ref="refs/remotes/$remote/$ref"
  else
    # No leading +: git refuses to overwrite a local tag that differs.
    spec="refs/tags/$ref:refs/tags/$ref"
    target_ref="refs/tags/$ref"
    local have_tag
    have_tag="$(git -C "$repo" rev-parse --verify -q "refs/tags/$ref" 2>/dev/null || true)"
    if [ -n "$have_tag" ] && [ "$have_tag" != "$remote_sha" ]; then
      say "FAILED: tag '$ref' has moved on '$remote' (here ${have_tag:0:12}, there ${remote_sha:0:12}). A pinned tag should not move; staying on ${before:0:12}. If the move is intended, delete the local tag and sync again."
      return 4
    fi
  fi
  out="$(rgit fetch --quiet --no-tags "$remote" "$spec" 2>&1)" \
    || { say "FAILED: fetch of $kind '$ref' from '$remote' failed; staying on ${before:0:12}: $(printf '%s\n' "$out" | grep -v '^[[:space:]]*$' | head -1)"; return 4; }
  target="$(git -C "$repo" rev-parse --verify -q "$target_ref^{commit}")" \
    || { say "FAILED: $target_ref does not resolve to a commit after fetch"; return 4; }

  # ---- save local changes aside, then discard them ---------------------------
  local saved=""
  if [ "$has_local" -eq 1 ]; then
    saved="agent/logs/vm-local-changes/$(date -u +%Y%m%d-%H%M%S)"
    mkdir -p "$repo/$saved" || { say "FAILED: cannot create $saved; nothing discarded"; return 1; }
    git -C "$repo" status --porcelain > "$repo/$saved/status.txt"
    git -C "$repo" diff --binary HEAD > "$repo/$saved/tracked-changes.patch" \
      || { say "FAILED: could not save tracked changes; nothing discarded"; return 1; }
    if [ "$local_commits" != 0 ]; then
      git -C "$repo" log -p --binary HEAD --not --remotes="$remote" --tags > "$repo/$saved/local-commits.patch" \
        || { say "FAILED: could not save local commits; nothing discarded"; return 1; }
    fi
    if [ -n "$untracked" ]; then
      local f
      while IFS= read -r f; do
        [ -n "$f" ] || continue
        mkdir -p "$repo/$saved/untracked/$(dirname "$f")" \
          && cp -p "$repo/$f" "$repo/$saved/untracked/$f" \
          || { say "FAILED: could not save untracked file $f; nothing discarded"; return 1; }
      done <<EOF
$untracked
EOF
      while IFS= read -r f; do
        [ -n "$f" ] && rm -f "$repo/$f"
      done <<EOF
$untracked
EOF
    fi
    say "WARN: local changes saved to $saved and discarded"
  fi

  # ---- reset and verify ------------------------------------------------------
  git -C "$repo" reset --quiet --hard "$target" || { say "FAILED: git reset to ${target:0:12} failed"; return 1; }
  local after left
  after="$(git -C "$repo" rev-parse HEAD)"
  left="$(git -C "$repo" status --porcelain)"
  if [ "$after" != "$target" ] || [ -n "$left" ]; then
    say "FAILED: after reset HEAD is ${after:0:12} (wanted ${target:0:12}) with $(count "$left") path(s) still dirty"
    return 1
  fi

  printf '{\n  "at": "%s",\n  "remote": "%s",\n  "ref": "%s",\n  "kind": "%s",\n  "before": "%s",\n  "after": "%s",\n  "changed": %s,\n  "local_changes_saved_to": %s\n}\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$remote" "$ref" "$kind" "$before" "$after" \
    "$([ "$before" = "$after" ] && echo false || echo true)" \
    "$([ -n "$saved" ] && printf '"%s"' "$saved" || echo null)" > "$log_dir/last-sync.json"

  if [ "$before" = "$after" ]; then
    say "up to date at ${after:0:12} ($kind '$ref' on '$remote')"
  else
    say "synced ${before:0:12} -> ${after:0:12} ($kind '$ref' on '$remote')"
  fi
  return 0
}

main "$@"; exit $?
