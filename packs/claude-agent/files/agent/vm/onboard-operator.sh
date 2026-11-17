#!/usr/bin/env bash
#
# onboard-operator.sh: set this checkout up for an operator. Run it as the
# operator's own account on the machine the agent lives on.
#
#   agent/vm/onboard-operator.sh                     show what it would do
#   agent/vm/onboard-operator.sh --apply             do it
#   agent/vm/onboard-operator.sh --apply --layer managed   (as root: see below)
#   agent/vm/onboard-operator.sh --remove [--apply]  take the schedule out again
#
# It dry-runs unless --apply is given. In order:
#
#   1. checks prerequisites and stops before changing anything if one fails;
#   2. applies the operator settings layer, .claude/settings.operator.json:
#        --layer local (default)  merged into .claude/settings.local.json in
#            this checkout. Lists are unioned, so rules already there are kept.
#            The file belongs to the operator's account and is not tracked.
#        --layer managed          written to Claude Code's managed settings
#            directory, which only root can write and which no other settings
#            file can override. It applies to every account on the machine.
#            Rules that start with ./ are rewritten to this checkout's absolute
#            path, because a managed file has no project to be relative to.
#   3. installs the schedule: agent/schedule/crontab if the project has one,
#      otherwise agent/schedule/crontab.template, with __RUNTIME_CHECKOUT__
#      replaced, as a marked block in this account's crontab. Lines outside the
#      block are left alone, and running it again replaces the block.
#   4. reads both back and prints what it did and what is left for a person.
#
# It never signs anyone in to Claude, never handles a secret, and never sets a
# write-authorising variable. See docs/OPERATOR_HANDOFF.md.
#
# Options:
#   --apply               make the changes
#   --layer local|managed where the settings layer goes (default: local)
#   --managed-dir <dir>   managed settings directory (default: the system one)
#   --no-settings         skip step 2
#   --no-schedule         skip step 3
#   --remove              remove the schedule block; leaves settings in place
#
# Exit codes: 0 done, or dry run completed
#             1 a change was made but did not read back as expected
#             2 bad usage
#             3 a prerequisite failed; nothing was changed
#
# Settings (environment variables):
#   AGENT_REPO         checkout to set up (default: the one holding this script)
#   AGENT_CRONTAB_BIN  crontab command to use (default: crontab)
#   AGENT_CLAUDE_BIN   claude command to look for (default: claude)

set -u

main() {
  local script_dir repo apply layer managed_dir do_settings do_schedule remove
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  repo="${AGENT_REPO:-$(cd "$script_dir/../.." && pwd)}"
  export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$PATH"
  apply=0; layer=local; managed_dir=""; do_settings=1; do_schedule=1; remove=0
  local crontab_bin="${AGENT_CRONTAB_BIN:-crontab}"
  local claude_bin="${AGENT_CLAUDE_BIN:-claude}"

  while [ $# -gt 0 ]; do
    case "$1" in
      --apply) apply=1; shift ;;
      --layer) layer="${2:-}"; shift 2 || { echo "onboard-operator: --layer needs a value" >&2; return 2; } ;;
      --managed-dir) managed_dir="${2:-}"; shift 2 || { echo "onboard-operator: --managed-dir needs a value" >&2; return 2; } ;;
      --no-settings) do_settings=0; shift ;;
      --no-schedule) do_schedule=0; shift ;;
      --remove) remove=1; shift ;;
      -h|--help) sed -n '3,48p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; return 0 ;;
      *) echo "onboard-operator: unknown argument '$1' (try --help)" >&2; return 2 ;;
    esac
  done
  case "$layer" in local|managed) ;; *) echo "onboard-operator: --layer must be local or managed" >&2; return 2 ;; esac

  local top
  top="$(git -C "$repo" rev-parse --show-toplevel 2>/dev/null)" \
    || { echo "onboard-operator: $repo is not a git checkout" >&2; return 3; }
  repo="$top"

  if [ -z "$managed_dir" ]; then
    case "$(uname -s)" in
      Darwin) managed_dir="/Library/Application Support/ClaudeCode/managed-settings.d" ;;
      *) managed_dir="/etc/claude-code/managed-settings.d" ;;
    esac
  fi

  local template="$repo/.claude/settings.operator.json"
  local local_file="$repo/.claude/settings.local.json"
  local managed_file="$managed_dir/50-agent-operator.json"
  local sched_src="$repo/agent/schedule/crontab"
  [ -f "$sched_src" ] || sched_src="$repo/agent/schedule/crontab.template"
  local mark_open="# >>> agent-schedule: $repo >>>"
  local mark_close="# <<< agent-schedule: $repo <<<"

  local fails=0 did="" todo=""
  row() { printf '  %-5s %-22s %s\n' "$1" "$2" "$3"; [ "$1" = "FAIL" ] && fails=$((fails + 1)); return 0; }
  note_did() { did="$did
  - $1"; }
  note_todo() { todo="$todo
  - $1"; }

  echo "onboard-operator ($([ "$apply" -eq 1 ] && echo apply || echo 'dry run'), $(date '+%Y-%m-%d %H:%M:%S %z'))"
  echo "  repo:    $repo"
  echo "  account: $(id -un)"
  echo
  echo "1. prerequisites"

  local b p
  for b in git node "$claude_bin"; do
    if p="$(command -v "$b" 2>/dev/null)"; then row ok "$b" "$p"; else row FAIL "$b" "not on PATH"; fi
  done

  if [ "$(id -u)" = 0 ] && [ "$layer" != managed ]; then
    row FAIL "account" "running as root. The operator account is an ordinary user; only --layer managed is run as root."
  elif [ "$(id -u)" != 0 ] && sudo -n true 2>/dev/null; then
    row warn "account" "$(id -un) has passwordless sudo, so nothing on this machine is out of its reach"
  else
    row ok "account" "$(id -un)"
  fi

  local dirty
  dirty="$(git -C "$repo" status --porcelain 2>/dev/null)"
  if [ -z "$dirty" ]; then row ok "checkout" "clean at $(git -C "$repo" rev-parse --short HEAD 2>/dev/null)"
  else row warn "checkout" "uncommitted changes; scheduled runs will refuse until agent/vm/sync-checkout.sh has run"; fi

  if [ "$remove" -eq 0 ] && [ "$do_settings" -eq 1 ]; then
    if [ ! -f "$template" ]; then
      row FAIL "settings layer" "no .claude/settings.operator.json in this checkout"
    elif ! node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))' "$template" 2>/dev/null; then
      row FAIL "settings layer" ".claude/settings.operator.json is not valid JSON"
    else
      row ok "settings layer" ".claude/settings.operator.json parses"
    fi
    if [ "$layer" = local ]; then
      # An untracked, un-ignored settings file would make every scheduled run
      # refuse the checkout as dirty.
      if git -C "$repo" check-ignore -q .claude/settings.local.json 2>/dev/null; then
        row ok "local settings" ".claude/settings.local.json is ignored by git"
      else
        row FAIL "local settings" ".claude/settings.local.json is not ignored by git. Add it to .gitignore in the repository first."
      fi
    else
      if [ "$apply" -eq 1 ] && ! { mkdir -p "$managed_dir" 2>/dev/null && [ -w "$managed_dir" ]; }; then
        row FAIL "managed settings" "cannot write $managed_dir. Run as root: sudo AGENT_REPO='$repo' bash '$repo/agent/vm/onboard-operator.sh' --apply --layer managed --no-schedule"
      else
        row ok "managed settings" "$managed_file"
      fi
    fi
  fi

  if [ "$do_schedule" -eq 1 ]; then
    if command -v "$crontab_bin" >/dev/null 2>&1; then row ok "crontab" "$(command -v "$crontab_bin")"
    else row FAIL "crontab" "'$crontab_bin' not found. Install cron, or use --no-schedule and schedule another way (agent/schedule/README.md)."; fi
    if [ "$remove" -eq 0 ]; then
      if [ -f "$sched_src" ]; then row ok "schedule source" "${sched_src#"$repo"/}"
      else row FAIL "schedule source" "neither agent/schedule/crontab nor agent/schedule/crontab.template exists"; fi
      case "$repo" in
        *[[:space:]]*|*%*) row FAIL "checkout path" "'$repo' contains a space or %, which a crontab line cannot carry safely" ;;
      esac
    fi
  fi

  if [ "$fails" -gt 0 ]; then
    echo
    echo "stopped: $fails prerequisite(s) failed. Nothing was changed."
    return 3
  fi

  local bad=0

  # ---- 2. settings layer -----------------------------------------------------
  if [ "$remove" -eq 0 ] && [ "$do_settings" -eq 1 ]; then
    echo
    echo "2. operator settings layer ($layer)"
    local dest="$local_file"
    [ "$layer" = managed ] && dest="$managed_file"
    AGENT_O_TEMPLATE="$template" AGENT_O_DEST="$dest" AGENT_O_LAYER="$layer" AGENT_O_REPO="$repo" AGENT_O_APPLY="$apply" node -e '
      const fs = require("fs");
      const e = process.env;
      const tpl = JSON.parse(fs.readFileSync(e.AGENT_O_TEMPLATE, "utf8"));
      const managed = e.AGENT_O_LAYER === "managed";
      // ./path means "relative to the session directory". A managed file is
      // not inside a project, so pin those rules to this checkout.
      const pin = (r) => managed ? r.replace(/^([A-Za-z]+)\(\.\//, (m, tool) => tool + "(/" + e.AGENT_O_REPO + "/") : r;
      let cur = {};
      if (!managed && fs.existsSync(e.AGENT_O_DEST)) cur = JSON.parse(fs.readFileSync(e.AGENT_O_DEST, "utf8"));
      const out = JSON.parse(JSON.stringify(cur));
      out.permissions = out.permissions || {};
      const added = [];
      for (const [key, val] of Object.entries(tpl.permissions || {})) {
        if (Array.isArray(val)) {
          const have = new Set(out.permissions[key] || []);
          for (const r of val.map(pin)) if (!have.has(r)) { have.add(r); added.push(key + ": " + r); }
          out.permissions[key] = [...have];
        } else if (out.permissions[key] !== val) {
          out.permissions[key] = val; added.push(key + " = " + JSON.stringify(val));
        }
      }
      for (const [key, val] of Object.entries(tpl)) {
        if (key === "permissions") continue;
        if (JSON.stringify(out[key]) !== JSON.stringify(val)) { out[key] = val; added.push(key + " (set)"); }
      }
      const verb = e.AGENT_O_APPLY === "1" ? "added" : "would add";
      if (!added.length) console.log("  ok    nothing to add: every rule is already in " + e.AGENT_O_DEST);
      else { console.log("  " + verb + " " + added.length + " entr" + (added.length === 1 ? "y" : "ies") + " to " + e.AGENT_O_DEST + ":"); for (const a of added) console.log("    " + a); }
      if (e.AGENT_O_APPLY === "1" && added.length) {
        fs.mkdirSync(require("path").dirname(e.AGENT_O_DEST), { recursive: true });
        fs.writeFileSync(e.AGENT_O_DEST, JSON.stringify(out, null, 2) + "\n", { mode: managed ? 0o644 : 0o600 });
      }
    ' || { echo "  FAIL  could not merge the settings layer"; bad=1; }

    if [ "$apply" -eq 1 ] && [ "$bad" -eq 0 ]; then
      # Read back: every rule in the template must now be in the destination.
      if AGENT_O_TEMPLATE="$template" AGENT_O_DEST="$dest" AGENT_O_LAYER="$layer" AGENT_O_REPO="$repo" node -e '
        const fs = require("fs"); const e = process.env;
        const tpl = JSON.parse(fs.readFileSync(e.AGENT_O_TEMPLATE, "utf8"));
        const got = JSON.parse(fs.readFileSync(e.AGENT_O_DEST, "utf8"));
        const pin = (r) => e.AGENT_O_LAYER === "managed" ? r.replace(/^([A-Za-z]+)\(\.\//, (m, tool) => tool + "(/" + e.AGENT_O_REPO + "/") : r;
        let missing = 0, total = 0;
        for (const [key, val] of Object.entries(tpl.permissions || {})) {
          if (!Array.isArray(val)) continue;
          for (const r of val.map(pin)) { total++; if (!((got.permissions || {})[key] || []).includes(r)) missing++; }
        }
        console.log("  read back: " + (total - missing) + " of " + total + " rule(s) present in " + e.AGENT_O_DEST);
        process.exit(missing ? 1 : 0);
      '; then
        note_did "operator settings layer in place at $dest"
      else
        bad=1
      fi
    fi
    if [ "$layer" = local ]; then
      note_todo "the local layer is a file the operator account owns. For a boundary the operator cannot edit, the owner also runs: sudo AGENT_REPO='$repo' bash '$repo/agent/vm/onboard-operator.sh' --apply --layer managed --no-schedule"
    fi
  fi

  # ---- 3. schedule -----------------------------------------------------------
  if [ "$do_schedule" -eq 1 ]; then
    echo
    echo "3. schedule ($([ "$remove" -eq 1 ] && echo 'remove' || echo "from ${sched_src#"$repo"/}"))"
    local current kept block new
    current="$("$crontab_bin" -l 2>/dev/null || true)"
    kept="$(printf '%s\n' "$current" | awk -v o="$mark_open" -v c="$mark_close" '
      $0 == o { skip = 1; next }
      $0 == c { skip = 0; next }
      !skip { print }')"
    if [ "$remove" -eq 1 ]; then
      new="$kept"
      if [ "$current" = "$kept" ]; then echo "  ok    no schedule block for this checkout in the crontab"
      else echo "  $([ "$apply" -eq 1 ] && echo removing || echo 'would remove') the schedule block for $repo"; fi
    else
      block="$(sed "s|__RUNTIME_CHECKOUT__|$repo|g" "$sched_src" | grep -v '^[[:space:]]*$')"
      new="$(printf '%s\n%s\n%s\n%s' "$kept" "$mark_open" "$block" "$mark_close" | sed '/./,$!d')"
      if [ "$new" = "$current" ]; then echo "  this block is already in $(id -un)'s crontab:"
      else echo "  $([ "$apply" -eq 1 ] && echo installing || echo 'would install') this block in $(id -un)'s crontab:"; fi
      printf '%s\n' "$block" | sed 's/^/    /'
      local n_other
      n_other="$(printf '%s\n' "$kept" | grep -c . || true)"
      echo "  $n_other other crontab line(s) kept as they are"
    fi
    if [ "$apply" -eq 1 ] && [ "$new" != "$current" ]; then
      if printf '%s\n' "$new" | "$crontab_bin" -; then
        local after
        after="$("$crontab_bin" -l 2>/dev/null || true)"
        if [ "$remove" -eq 1 ]; then
          if printf '%s\n' "$after" | grep -qxF "$mark_open"; then echo "  FAIL  the block is still in the crontab"; bad=1
          else echo "  read back: block gone"; note_did "schedule block removed from $(id -un)'s crontab"; fi
        else
          if printf '%s\n' "$after" | grep -qxF "$mark_open" && printf '%s\n' "$after" | grep -qxF "$mark_close"; then
            echo "  read back: block present ($(printf '%s\n' "$block" | grep -vc '^#') job line(s))"
            note_did "schedule installed in $(id -un)'s crontab from ${sched_src#"$repo"/}"
          else echo "  FAIL  the block did not read back from the crontab"; bad=1; fi
        fi
      else
        echo "  FAIL  '$crontab_bin -' rejected the new crontab; the old one is unchanged"; bad=1
      fi
    elif [ "$apply" -eq 1 ]; then
      echo "  ok    crontab already matches; not rewritten"
    fi
    if [ "$remove" -eq 0 ]; then
      note_todo "run the selftest from cron's own environment once: add a temporary line calling agent/scripts/scheduled-run.sh --selftest <skill>, read its output, remove it"
    fi
  fi

  # ---- 4. report -------------------------------------------------------------
  echo
  if [ "$apply" -eq 0 ]; then
    echo "dry run: nothing was changed. Rerun with --apply to make these changes."
    return 0
  fi
  echo "done:${did:-
  - nothing needed changing}"
  if [ "$remove" -eq 0 ]; then
    note_todo "the operator signs in to Claude with their own account (docs/OPERATOR_HANDOFF.md, step 4). This script does not and must not do it for them."
    note_todo "the owner runs agent/vm/vm-check.sh and reads every line"
    note_todo "AGENT_WRITE_AUTHORIZED is not set anywhere by this script. Scheduled runs dry-run until the owner adds it to the schedule."
  else
    note_todo "this removed the schedule only. Revoke the credentials: docs/OPERATOR_HANDOFF.md, Offboarding."
  fi
  echo "left for a person:$todo"
  [ "$bad" -eq 0 ] || { echo; echo "FAILED: at least one change did not read back. See above."; return 1; }
  return 0
}

main "$@"; exit $?
