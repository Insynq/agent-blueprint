#!/usr/bin/env bash
#
# scheduled-run.sh: run one skill headlessly with `claude -p`, for launchd or cron.
#
#   agent/scripts/scheduled-run.sh <skill-name> [arguments for the skill]
#   agent/scripts/scheduled-run.sh --selftest [skill-name]
#
# What it does, in order:
#   1. takes a lock shared by every scheduled run, so two runs never overlap;
#   2. refuses to run unless the checkout is clean (and at AGENT_RUN_REF, when
#      that is set), because a scheduled run executes whatever is in the
#      working tree and an uncommitted edit would be live;
#   3. runs `claude -p "/<skill-name> ..."` and keeps its output and a log;
#   4. records the outcome in last-run.json for agent/scripts/health-check.mjs;
#   5. calls notify_failure only when the run failed or came back empty.
#
# --selftest checks every prerequisite and never starts a model. Run it from
# the scheduler's own environment once: a launchd or cron job has a different
# PATH and different credentials from your terminal.
#
# Exit codes: 0 ran and succeeded, or skipped because the lock was held
#             1 the run failed or returned nothing
#             2 bad usage
#             3 refused: the checkout is not in a runnable state
#
# Settings (environment variables; set them in the plist or crontab):
#   AGENT_REPO              checkout to run in (default: the one holding this script)
#   AGENT_PERMISSION_MODE   see below (default: dontAsk)
#   AGENT_MODEL             model alias or full name (default: the CLI's default)
#   AGENT_MAX_BUDGET_USD    spending cap for one run (default: none)
#   AGENT_RUN_REF           commit, tag or branch HEAD must equal (default: none)
#   AGENT_ALLOW_DIRTY       set to 1 to run despite uncommitted changes
#   AGENT_LOCK_STALE_MIN    break a lock older than this many minutes (default 90)
#   AGENT_MIN_OUTPUT_BYTES  output smaller than this counts as empty (default 40)
#   AGENT_REQUIRED_ENV      comma separated variable names --selftest checks for
#
# This script never sets AGENT_WRITE_AUTHORIZED. A scheduled run may write only
# if whoever owns the schedule put that variable in the scheduler's environment.

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="${AGENT_REPO:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
# launchd and cron start with a minimal PATH.
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$PATH"

CLAUDE_BIN="${AGENT_CLAUDE_BIN:-claude}"

# Permission mode for the headless session. Nobody is there to answer a prompt,
# so the mode decides what happens to a tool call that would have asked:
#
#   dontAsk            denies it. Only what .claude/settings.json allows, plus
#                      reads, will run. The run can do exactly what you listed
#                      in advance and nothing else. This is the default here.
#   auto               a classifier model reviews each action instead of you.
#                      Fewer allow rules to maintain; you are trusting the
#                      classifier with whatever the allow list does not cover.
#   acceptEdits        file edits in the checkout run without asking; other
#                      commands still need an allow rule.
#   bypassPermissions  everything runs, allow rules or not. Only for a machine
#                      that is itself the sandbox (a VM or container holding no
#                      credentials you would mind the run using). Not a default.
#
# Whatever the mode, deny rules in settings still apply, and under dontAsk an
# `ask` rule is a denial. Keep the write guards in the scripts (dry run by
# default, environment flag to write) so that no mode can skip them.
PERMISSION_MODE="${AGENT_PERMISSION_MODE:-dontAsk}"

MODEL="${AGENT_MODEL:-}"
MAX_BUDGET_USD="${AGENT_MAX_BUDGET_USD:-}"
RUN_REF="${AGENT_RUN_REF:-}"
ALLOW_DIRTY="${AGENT_ALLOW_DIRTY:-0}"
STALE_MIN="${AGENT_LOCK_STALE_MIN:-90}"
MIN_BYTES="${AGENT_MIN_OUTPUT_BYTES:-40}"

LOG_DIR="$REPO/agent/logs/scheduled"
LOCK_DIR="$LOG_DIR/.lock"
LAST_RUN="$LOG_DIR/last-run.json"

# ---- notification: fill this in --------------------------------------------
# Called once, only when a run fails. $1 is a one-line subject, $2 the log path.
# The default records the failure locally, which nobody will see. Define your
# own notify_failure in agent/schedule/notify.sh (email, chat webhook, pager);
# it is sourced below and replaces this one. Notify the operator only: a
# failure message is not something to send to customers or the whole team.
notify_failure() {
  printf '%s\t%s\t%s\n' "$(date '+%Y-%m-%dT%H:%M:%S%z')" "$1" "$2" >> "$LOG_DIR/FAILURES.log"
  echo "FAILURE (not delivered anywhere; define notify_failure in agent/schedule/notify.sh): $1" >&2
}
NOTIFY_FILE="$REPO/agent/schedule/notify.sh"
# shellcheck disable=SC1090
[ -f "$NOTIFY_FILE" ] && . "$NOTIFY_FILE"

# ---- checkout state ---------------------------------------------------------
# Prints the reason the checkout must not be run from, or nothing.
tree_problem() {
  if [ -n "$RUN_REF" ]; then
    local want have
    want="$(git -C "$REPO" rev-parse --verify -q "$RUN_REF^{commit}" 2>/dev/null)" \
      || { echo "AGENT_RUN_REF '$RUN_REF' does not resolve to a commit"; return; }
    have="$(git -C "$REPO" rev-parse HEAD 2>/dev/null)"
    [ "$want" = "$have" ] || { echo "HEAD is ${have:0:12}, but AGENT_RUN_REF '$RUN_REF' is ${want:0:12}"; return; }
  fi
  local dirty
  dirty="$(git -C "$REPO" status --porcelain 2>/dev/null)" || { echo "git status failed in $REPO"; return; }
  if [ -n "$dirty" ] && [ "$ALLOW_DIRTY" != "1" ]; then
    echo "uncommitted changes in $REPO ($(printf '%s\n' "$dirty" | wc -l | tr -d ' ') path(s), first: $(printf '%s\n' "$dirty" | head -1 | cut -c4-))"
  fi
}

skill_problem() {
  case "$1" in
    ''|*[!a-z0-9-]*|-*) echo "skill name '$1' must be lowercase letters, digits and hyphens"; return ;;
  esac
  [ -f "$REPO/.claude/skills/$1/SKILL.md" ] || echo "no skill at .claude/skills/$1/SKILL.md"
}

# ---- selftest ---------------------------------------------------------------
if [ "${1:-}" = "--selftest" ]; then
  fails=0
  row() { printf '  %-5s %-24s %s\n' "$1" "$2" "$3"; [ "$1" = "FAIL" ] && fails=$((fails + 1)); return 0; }
  echo "scheduled-run selftest ($(date '+%Y-%m-%d %H:%M:%S %z'))"
  echo "  repo: $REPO"

  for b in "$CLAUDE_BIN" node git; do
    if p="$(command -v "$b" 2>/dev/null)"; then row ok "$b" "$p"; else row FAIL "$b" "not on PATH ($PATH)"; fi
  done

  if [ -d "$REPO/.git" ] || git -C "$REPO" rev-parse --git-dir >/dev/null 2>&1; then row ok "git checkout" "yes"; else row FAIL "git checkout" "$REPO is not a git checkout"; fi

  # Read the flags this script uses from the installed CLI's own help, so a
  # renamed flag fails here and not at 3am. This does not start a model.
  if help="$("$CLAUDE_BIN" --help 2>/dev/null)"; then
    for f in "--print" "--permission-mode" "--model" "--max-budget-usd"; do
      if printf '%s' "$help" | grep -q -- "$f"; then row ok "flag $f" "supported"; else row FAIL "flag $f" "not in '$CLAUDE_BIN --help'"; fi
    done
    choices="$(printf '%s' "$help" | grep -A4 -- '--permission-mode <mode>' | tr -d '\n')"
    if printf '%s' "$choices" | grep -q "\"$PERMISSION_MODE\""; then row ok "permission mode" "$PERMISSION_MODE"; else row FAIL "permission mode" "'$PERMISSION_MODE' is not a choice this CLI lists"; fi
  else
    row FAIL "claude --help" "could not run"
  fi
  [ "$PERMISSION_MODE" = "bypassPermissions" ] && row warn "permission mode" "bypassPermissions: every tool call runs unchecked"

  if mkdir -p "$LOG_DIR" 2>/dev/null && [ -w "$LOG_DIR" ]; then row ok "log directory" "$LOG_DIR"; else row FAIL "log directory" "cannot write $LOG_DIR"; fi

  tp="$(tree_problem)"
  if [ -z "$tp" ]; then row ok "checkout state" "clean${RUN_REF:+, at $RUN_REF}"; else row FAIL "checkout state" "$tp"; fi
  [ "$ALLOW_DIRTY" = "1" ] && row warn "checkout state" "AGENT_ALLOW_DIRTY=1: uncommitted edits will run"

  if [ -n "${2:-}" ]; then
    sp="$(skill_problem "$2")"
    if [ -z "$sp" ]; then row ok "skill" "$2"; else row FAIL "skill" "$sp"; fi
  fi

  if [ -n "${AGENT_REQUIRED_ENV:-}" ]; then
    old_ifs="$IFS"; IFS=','
    for v in $AGENT_REQUIRED_ENV; do
      v="$(printf '%s' "$v" | tr -d ' ')"
      [ -z "$v" ] && continue
      # Presence only. Never print the value.
      if [ -n "${!v:-}" ]; then row ok "env $v" "set"; else row FAIL "env $v" "not set"; fi
    done
    IFS="$old_ifs"
  fi

  if [ -f "$NOTIFY_FILE" ]; then row ok "notify hook" "agent/schedule/notify.sh"; else row warn "notify hook" "not defined; failures are only written to FAILURES.log"; fi
  if [ "${AGENT_WRITE_AUTHORIZED:-}" = "true" ]; then row warn "write flag" "AGENT_WRITE_AUTHORIZED=true: scheduled runs may write"; else row ok "write flag" "not set; scheduled runs are dry-run only"; fi

  if [ "$fails" -eq 0 ]; then echo "selftest passed."; exit 0; fi
  echo "selftest FAILED: $fails problem(s)."; exit 1
fi

# ---- arguments --------------------------------------------------------------
SKILL="${1:-}"
if [ -z "$SKILL" ]; then
  echo "usage: scheduled-run.sh <skill-name> [arguments] | --selftest [skill-name]" >&2
  exit 2
fi
shift
SKILL_ARGS="$*"
sp="$(skill_problem "$SKILL")"
if [ -n "$sp" ]; then echo "scheduled-run: $sp" >&2; exit 2; fi

mkdir -p "$LOG_DIR" || { echo "scheduled-run: cannot create $LOG_DIR" >&2; exit 1; }
STAMP="$(date +%Y%m%d-%H%M%S)"
LOG="$LOG_DIR/$SKILL-$STAMP.log"
OUT="$LOG_DIR/$SKILL-$STAMP.out.md"
exec >>"$LOG" 2>&1
echo "=== scheduled-run $SKILL @ $STAMP (pid $$) ==="

# ---- lock -------------------------------------------------------------------
# mkdir is atomic. One lock for every scheduled skill: runs that share
# credentials or cursors must not interleave.
take_lock() { mkdir "$LOCK_DIR" 2>/dev/null && echo "$SKILL $STAMP pid=$$" > "$LOCK_DIR/owner"; }
if ! take_lock; then
  owner="$(cat "$LOCK_DIR/owner" 2>/dev/null)"
  owner_pid="${owner##*pid=}"
  if [ -n "$owner_pid" ] && [ "$owner_pid" != "$owner" ] && ! kill -0 "$owner_pid" 2>/dev/null; then
    echo "WARN: breaking lock left by a dead process ($owner)"
    rm -rf "$LOCK_DIR"
  elif [ -n "$(find "$LOCK_DIR" -maxdepth 0 -mmin +"$STALE_MIN" 2>/dev/null)" ]; then
    echo "WARN: breaking lock older than ${STALE_MIN}m ($owner)"
    rm -rf "$LOCK_DIR"
  else
    echo "SKIP: lock held by another run ($owner)"
    exit 0
  fi
  take_lock || { echo "SKIP: lost the race for the lock"; exit 0; }
fi
trap 'rm -rf "$LOCK_DIR" 2>/dev/null' EXIT

STARTED="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

record() { # status exit_code
  AGENT_R_SKILL="$SKILL" AGENT_R_STATUS="$1" AGENT_R_EXIT="$2" AGENT_R_STARTED="$STARTED" \
  AGENT_R_LOG="$LOG" AGENT_R_OUT="$OUT" AGENT_R_FILE="$LAST_RUN" node -e '
    const e = process.env;
    require("fs").writeFileSync(e.AGENT_R_FILE, JSON.stringify({
      skill: e.AGENT_R_SKILL, status: e.AGENT_R_STATUS, exit_code: Number(e.AGENT_R_EXIT),
      started: e.AGENT_R_STARTED, finished: new Date().toISOString(),
      log: e.AGENT_R_LOG, output: e.AGENT_R_OUT,
    }, null, 2) + "\n");' || echo "WARN: could not write $LAST_RUN"
}

# ---- checkout state ---------------------------------------------------------
tp="$(tree_problem)"
if [ -n "$tp" ]; then
  echo "REFUSED: $tp"
  record refused 3
  notify_failure "scheduled $SKILL refused to run: $tp" "$LOG"
  exit 3
fi
[ "$ALLOW_DIRTY" = "1" ] && echo "WARN: AGENT_ALLOW_DIRTY=1, running with whatever is in the working tree"
echo "checkout: $(git -C "$REPO" rev-parse --short HEAD)${RUN_REF:+ (pinned to $RUN_REF)}"

# ---- run --------------------------------------------------------------------
cd "$REPO" || { echo "FATAL: cannot cd $REPO"; record failed 1; notify_failure "scheduled $SKILL: cannot cd to $REPO" "$LOG"; exit 1; }

cmd=("$CLAUDE_BIN" -p "/$SKILL${SKILL_ARGS:+ $SKILL_ARGS}" --permission-mode "$PERMISSION_MODE")
[ -n "$MODEL" ] && cmd+=(--model "$MODEL")
[ -n "$MAX_BUDGET_USD" ] && cmd+=(--max-budget-usd "$MAX_BUDGET_USD")
echo "--- ${cmd[*]} ---"
"${cmd[@]}" >"$OUT" 2>>"$LOG" </dev/null
RC=$?
BYTES="$(wc -c <"$OUT" | tr -d ' ')"
echo "exit=$RC output_bytes=$BYTES output=$OUT"

# A zero exit with nothing to say is a failed run: the session ended before
# producing its report (expired sign-in, denied tool, crashed early).
if [ "$RC" -ne 0 ] || [ "$BYTES" -lt "$MIN_BYTES" ]; then
  record failed "$RC"
  notify_failure "scheduled $SKILL FAILED (exit=$RC, output=${BYTES}B)" "$LOG"
  echo "=== failed $SKILL $STAMP ==="
  exit 1
fi

record ok 0
echo "=== done $SKILL $STAMP ==="
exit 0
