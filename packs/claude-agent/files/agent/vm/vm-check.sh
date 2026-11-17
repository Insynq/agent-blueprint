#!/usr/bin/env bash
#
# vm-check.sh: provisioning checklist for the machine the agent lives on.
# It only looks and reports. It changes nothing, starts no model and prints no
# secret value.
#
#   agent/vm/vm-check.sh [--role operator|owner] [--no-network]
#
# Run it as the account the agent runs under, after provisioning, after
# onboarding an operator, and weekly. Each line is one of:
#
#   ok      checked and as it should be
#   warn    works, but worth a decision
#   FAIL    the hosting model's protection does not hold while this is true
#   manual  this script cannot see it from this account; a person checks it
#
# --role operator (default) expects the restricted setup: no sudo, a
# repository credential that cannot push, the operator settings layer applied.
# --role owner skips those expectations.
# --no-network skips the two checks that contact the git remote.
#
# Exit codes: 0 no FAIL lines, 1 at least one FAIL, 2 bad usage.
#
# Settings (environment variables):
#   AGENT_REPO            checkout to check (default: the one holding this script)
#   AGENT_SYNC_REMOTE     git remote to probe (default: origin)
#   AGENT_GIT_TOKEN_FILE  read-only repository token file, if one is used
#   AGENT_GIT_TOKEN_USER  username sent with it (default: x-access-token)
#   AGENT_SECRET_FILES    colon separated paths of credential files on this
#                         machine; their permissions are checked, never their
#                         contents
#   AGENT_REQUIRED_ENV    comma separated variable names that must be present
#   AGENT_CRONTAB_BIN     crontab command (default: crontab)
#   AGENT_CLAUDE_BIN      claude command (default: claude)

set -u

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="${AGENT_REPO:-$(cd "$script_dir/../.." && pwd)}"
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$PATH"
role=operator
network=1
remote="${AGENT_SYNC_REMOTE:-origin}"
token_file="${AGENT_GIT_TOKEN_FILE:-}"
token_user="${AGENT_GIT_TOKEN_USER:-x-access-token}"
crontab_bin="${AGENT_CRONTAB_BIN:-crontab}"
claude_bin="${AGENT_CLAUDE_BIN:-claude}"

while [ $# -gt 0 ]; do
  case "$1" in
    --role) role="${2:-}"; shift 2 || { echo "vm-check: --role needs a value" >&2; exit 2; } ;;
    --no-network) network=0; shift ;;
    -h|--help) sed -n '3,34p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "vm-check: unknown argument '$1' (try --help)" >&2; exit 2 ;;
  esac
done
case "$role" in operator|owner) ;; *) echo "vm-check: --role must be operator or owner" >&2; exit 2 ;; esac

fails=0; warns=0; manuals=0
row() {
  printf '  %-6s %-24s %s\n' "$1" "$2" "$3"
  case "$1" in FAIL) fails=$((fails + 1)) ;; warn) warns=$((warns + 1)) ;; manual) manuals=$((manuals + 1)) ;; esac
  return 0
}
section() { echo; echo "$1"; }
file_mode() { stat -c '%a' "$1" 2>/dev/null || stat -f '%Lp' "$1" 2>/dev/null; }
have() { command -v "$1" >/dev/null 2>&1; }

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

echo "vm-check (role: $role, $(date '+%Y-%m-%d %H:%M:%S %z'))"
echo "  repo:    $repo"
echo "  account: $(id -un) on $(uname -s) $(uname -m)"

# ---- machine ---------------------------------------------------------------------
section "Machine"
if [ "$(id -u)" = 0 ]; then
  row FAIL "account" "running as root. The agent runs as an ordinary user."
elif sudo -n true 2>/dev/null; then
  if [ "$role" = operator ]; then row FAIL "account" "$(id -un) has passwordless sudo: every root-owned file and credential here is within its reach"
  else row ok "account" "$(id -un) (has sudo)"; fi
else
  row ok "account" "$(id -un), no passwordless sudo"
fi

used="$(df -P "$repo" 2>/dev/null | awk 'NR == 2 { gsub("%", "", $5); print $5 }')"
if [ -n "$used" ]; then
  if [ "$used" -ge 90 ]; then row FAIL "disk" "${used}% used on the checkout's volume"
  elif [ "$used" -ge 80 ]; then row warn "disk" "${used}% used on the checkout's volume"
  else row ok "disk" "${used}% used"; fi
fi
[ -f /var/run/reboot-required ] && row warn "reboot" "the system says a reboot is required"

if [ "$(uname -s)" = Linux ]; then
  sshd_val() { # last effective-looking value for a keyword across the config files we can read
    cat /etc/ssh/sshd_config /etc/ssh/sshd_config.d/*.conf 2>/dev/null \
      | awk -v k="$1" 'tolower($1) == tolower(k) { v = tolower($2) } END { print v }'
  }
  if [ -r /etc/ssh/sshd_config ]; then
    v="$(sshd_val PasswordAuthentication)"
    if [ "$v" = no ]; then row ok "ssh passwords" "PasswordAuthentication no"
    else row warn "ssh passwords" "PasswordAuthentication is '${v:-unset (default yes)}'; use keys only"; fi
    v="$(sshd_val PermitRootLogin)"
    if [ "$v" = no ]; then row ok "ssh root login" "PermitRootLogin no"
    else row warn "ssh root login" "PermitRootLogin is '${v:-unset}'; set it to no"; fi
  else
    row manual "ssh config" "cannot read /etc/ssh/sshd_config; confirm keys only and no root login"
  fi
fi

# ---- tools -----------------------------------------------------------------------
section "Tools"
for b in git node "$claude_bin"; do
  if p="$(command -v "$b" 2>/dev/null)"; then row ok "$b" "$p"; else row FAIL "$b" "not on PATH"; fi
done
if have "$crontab_bin"; then row ok "crontab" "$(command -v "$crontab_bin")"
else row warn "crontab" "not found; scheduled runs need cron, or launchd on a Mac"; fi

# ---- Claude sign-in --------------------------------------------------------------
section "Claude sign-in"
if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
  row warn "api key" "ANTHROPIC_API_KEY is set: sessions here bill to an API account, not to a person's subscription"
fi
if [ -n "${CLAUDE_CODE_OAUTH_TOKEN:-}" ]; then
  row ok "sign-in" "CLAUDE_CODE_OAUTH_TOKEN is set (value not shown); headless runs use it"
elif have "$claude_bin" && have node; then
  status="$("$claude_bin" auth status --json 2>/dev/null)"
  parsed="$(printf '%s' "$status" | node -e '
    let s = ""; process.stdin.on("data", (d) => s += d).on("end", () => {
      try {
        const j = JSON.parse(s);
        if (!j.loggedIn) return console.log("out");
        let days = "";
        if (j.loginExpiresAt) days = String(Math.floor((Date.parse(j.loginExpiresAt) - Date.now()) / 86400e3));
        console.log(["in", j.authMethod || "?", j.subscriptionType || "?", days].join("|"));
      } catch { console.log("unknown"); }
    });' 2>/dev/null)"
  case "$parsed" in
    in\|*)
      IFS='|' read -r _ method plan days <<EOF
$parsed
EOF
      row ok "sign-in" "stored login for this account ($method, plan: $plan). Confirm it is the operator's own."
      if [ -n "$days" ]; then
        if [ "$days" -lt 7 ]; then row warn "sign-in expiry" "the stored login expires in $days day(s); scheduled runs fail after that until someone signs in again"
        else row ok "sign-in expiry" "stored login valid for $days more day(s)"; fi
      fi ;;
    out) row warn "sign-in" "no stored Claude login for $(id -un). Fine if the operator only connects from an app that forwards their login; scheduled claude -p runs need a stored login or CLAUDE_CODE_OAUTH_TOKEN." ;;
    *) row manual "sign-in" "'$claude_bin auth status --json' gave nothing readable; check the sign-in by hand" ;;
  esac
fi

# ---- checkout --------------------------------------------------------------------
section "Checkout"
if top="$(git -C "$repo" rev-parse --show-toplevel 2>/dev/null)"; then
  repo="$top"
  row ok "git checkout" "HEAD $(git -C "$repo" rev-parse --short HEAD 2>/dev/null)"
  dirty="$(git -C "$repo" status --porcelain)"
  if [ -z "$dirty" ]; then row ok "working tree" "clean"
  else row FAIL "working tree" "$(printf '%s\n' "$dirty" | wc -l | tr -d ' ') uncommitted path(s), first: $(printf '%s\n' "$dirty" | head -1 | cut -c4-)"; fi

  url="$(git -C "$repo" remote get-url "$remote" 2>/dev/null)"
  if [ -z "$url" ]; then
    row FAIL "remote" "no remote named '$remote'"
  else
    case "$url" in
      *://*:*@*) row FAIL "remote url" "a credential is embedded in the '$remote' URL. Move it to a token file (AGENT_GIT_TOKEN_FILE)." ;;
      *) row ok "remote url" "no credential embedded" ;;
    esac
    if [ "$network" -eq 1 ]; then
      if rgit ls-remote --exit-code "$remote" HEAD >/dev/null 2>&1; then
        row ok "remote read" "'$remote' is readable"
        # A dry-run push contacts the remote and asks to write. Nothing is sent.
        if rgit push --dry-run --quiet "$remote" "HEAD:refs/heads/agent-vm-check-probe" >/dev/null 2>&1; then
          if [ "$role" = operator ]; then row FAIL "remote write" "a push to '$remote' would be accepted: the repository credential here is not read-only"
          else row ok "remote write" "this account can push"; fi
        else
          row ok "remote write" "push refused: the repository credential is read-only"
        fi
      else
        row warn "remote read" "cannot read '$remote' from here; push not probed"
      fi
    else
      row manual "remote write" "--no-network: confirm by hand that a push from this machine is refused"
    fi
  fi

  tracked_env="$(git -C "$repo" ls-files | grep -E '(^|/)\.env($|\.)' | grep -vE '\.(example|sample|template)$' || true)"
  if [ -n "$tracked_env" ]; then row FAIL "env files" "tracked in git: $(printf '%s' "$tracked_env" | tr '\n' ' ')"
  else row ok "env files" "none tracked"; fi
  loose_env="$(cd "$repo" && ls -a 2>/dev/null | grep -E '^\.env($|\.)' | grep -vE '\.(example|sample|template)$' || true)"
  [ -n "$loose_env" ] && row warn "env files" "present in the checkout: $(printf '%s' "$loose_env" | tr '\n' ' '). Secrets on this machine belong in the secrets manager."
else
  row FAIL "git checkout" "$repo is not a git checkout"
fi

# ---- credentials -----------------------------------------------------------------
section "Credentials on this machine"
if [ -n "${AGENT_SECRET_FILES:-}${token_file}" ]; then
  old_ifs="$IFS"; IFS=':'
  for f in ${AGENT_SECRET_FILES:-}:$token_file; do
    [ -n "$f" ] || continue
    if [ ! -e "$f" ]; then row FAIL "$(basename "$f")" "$f does not exist"; continue; fi
    m="$(file_mode "$f")"
    case "$m" in
      400|600|440|640) row ok "$(basename "$f")" "$f mode $m" ;;
      *) row FAIL "$(basename "$f")" "$f mode ${m:-unknown}: readable or writable more widely than its owner and group" ;;
    esac
  done
  IFS="$old_ifs"
else
  row manual "credential files" "AGENT_SECRET_FILES is not set, so no file permissions were checked. List the token files and rerun."
fi
if [ -n "${AGENT_REQUIRED_ENV:-}" ]; then
  old_ifs="$IFS"; IFS=','
  for v in $AGENT_REQUIRED_ENV; do
    v="$(printf '%s' "$v" | tr -d ' ')"
    [ -n "$v" ] || continue
    if [ -n "${!v:-}" ]; then row ok "env $v" "set"; else row FAIL "env $v" "not set"; fi
  done
  IFS="$old_ifs"
fi
# A deny rule that names the variable is expected. The variable as a settings key is not.
flagged="$(grep -lE '"[A-Z0-9_]*_WRITE_AUTHORIZED"[[:space:]]*:' "$repo"/.claude/settings*.json 2>/dev/null | sed "s|$repo/||" | tr '\n' ' ')"
if [ -n "$flagged" ]; then
  row FAIL "write flag" "a write-authorising variable is set in a settings file: $flagged"
fi
if [ "${AGENT_WRITE_AUTHORIZED:-}" = true ]; then
  row warn "write flag" "AGENT_WRITE_AUTHORIZED=true in this shell: anything started from it may write"
else
  row ok "write flag" "not set in this shell"
fi

# ---- operator settings layer -------------------------------------------------------
section "Operator settings layer"
template="$repo/.claude/settings.operator.json"
local_file="$repo/.claude/settings.local.json"
case "$(uname -s)" in
  Darwin) managed_dir="/Library/Application Support/ClaudeCode" ;;
  *) managed_dir="/etc/claude-code" ;;
esac
if [ "$role" = owner ]; then
  row ok "layer" "not expected for the owner role"
elif [ ! -f "$template" ]; then
  row FAIL "template" "no .claude/settings.operator.json in this checkout"
elif ! have node; then
  row manual "layer" "node is missing, so the rules could not be compared"
else
  layer_state() { # prints "<present> <total>" for the template's deny and ask rules in file $1
    AGENT_O_TEMPLATE="$template" AGENT_O_DEST="$1" AGENT_O_PIN="$2" AGENT_O_REPO="$repo" node -e '
      const fs = require("fs"); const e = process.env;
      const tpl = JSON.parse(fs.readFileSync(e.AGENT_O_TEMPLATE, "utf8"));
      let got = {}; try { got = JSON.parse(fs.readFileSync(e.AGENT_O_DEST, "utf8")); } catch {}
      const pin = (r) => e.AGENT_O_PIN === "1" ? r.replace(/^([A-Za-z]+)\(\.\//, (m, tool) => tool + "(/" + e.AGENT_O_REPO + "/") : r;
      let present = 0, total = 0;
      for (const key of ["deny", "ask"]) for (const r of ((tpl.permissions || {})[key] || []).map(pin)) {
        total++; if (((got.permissions || {})[key] || []).includes(r)) present++;
      }
      console.log(present + " " + total);' 2>/dev/null
  }
  managed_hit=""
  for mf in "$managed_dir/managed-settings.d/50-agent-operator.json" "$managed_dir/managed-settings.json"; do
    [ -r "$mf" ] || continue
    set -- $(layer_state "$mf" 1)
    if [ "${1:-0}" = "${2:-x}" ] && [ "${2:-0}" != 0 ]; then managed_hit="$mf"; fi
  done
  if [ -n "$managed_hit" ]; then
    row ok "managed layer" "all rules present in $managed_hit (root-owned; the operator cannot edit it)"
  else
    row warn "managed layer" "not installed under $managed_dir. The local layer below is a file the operator account can edit."
  fi
  if [ -f "$local_file" ]; then
    set -- $(layer_state "$local_file" 0)
    if [ "${1:-0}" = "${2:-x}" ]; then row ok "local layer" "$1 of $2 rule(s) present in .claude/settings.local.json"
    elif [ -n "$managed_hit" ]; then row warn "local layer" "${1:-0} of ${2:-?} rule(s) present; the managed layer covers the rest"
    else row FAIL "local layer" "${1:-0} of ${2:-?} rule(s) present in .claude/settings.local.json. Run agent/vm/onboard-operator.sh --apply."; fi
  elif [ -z "$managed_hit" ]; then
    row FAIL "local layer" "no .claude/settings.local.json. Run agent/vm/onboard-operator.sh --apply."
  fi
  if git -C "$repo" check-ignore -q .claude/settings.local.json 2>/dev/null; then row ok "local file ignored" "yes"
  else row FAIL "local file ignored" ".claude/settings.local.json is not ignored by git, so it dirties the checkout"; fi
fi

# ---- schedule --------------------------------------------------------------------
section "Schedule"
if have "$crontab_bin"; then
  tab="$("$crontab_bin" -l 2>/dev/null || true)"
  if printf '%s\n' "$tab" | grep -qxF "# >>> agent-schedule: $repo >>>"; then
    row ok "crontab block" "installed for this checkout"
    for want in agent/vm/sync-checkout.sh agent/scripts/scheduled-run.sh agent/scripts/health-check.mjs; do
      if printf '%s\n' "$tab" | grep -v '^[[:space:]]*#' | grep -F "$repo" | grep -qF "$want"; then row ok "$(basename "$want")" "scheduled"
      else row warn "$(basename "$want")" "no crontab line runs $want"; fi
    done
    # The crontab holds a copy made at install time. A sync that brings a new
    # schedule file does not change it.
    sched_src="$repo/agent/schedule/crontab"
    [ -f "$sched_src" ] || sched_src="$repo/agent/schedule/crontab.template"
    if [ -f "$sched_src" ]; then
      want_block="$(sed "s|__RUNTIME_CHECKOUT__|$repo|g" "$sched_src" | grep -v '^[[:space:]]*$')"
      have_block="$(printf '%s\n' "$tab" | awk -v o="# >>> agent-schedule: $repo >>>" -v c="# <<< agent-schedule: $repo <<<" '
        $0 == o { on = 1; next } $0 == c { on = 0; next } on { print }')"
      if [ "$want_block" = "$have_block" ]; then row ok "schedule current" "the installed block matches ${sched_src#"$repo"/}"
      else row warn "schedule current" "the installed block differs from ${sched_src#"$repo"/}. Rerun agent/vm/onboard-operator.sh --apply to install the current one."; fi
    fi
    if printf '%s\n' "$tab" | grep -v '^[[:space:]]*#' | grep -q 'AGENT_WRITE_AUTHORIZED=true'; then
      row warn "scheduled writes" "AGENT_WRITE_AUTHORIZED=true is in the crontab: scheduled runs may write. Confirm the owner approved that."
    else
      row ok "scheduled writes" "not authorised; scheduled runs dry-run"
    fi
  else
    row warn "crontab block" "none for this checkout in $(id -un)'s crontab. Run agent/vm/onboard-operator.sh, or see agent/schedule/README.md for launchd."
  fi
else
  row manual "schedule" "no crontab command; check the scheduler in use by hand"
fi

# ---- monitoring ------------------------------------------------------------------
section "Monitoring"
if [ -f "$repo/agent/schedule/notify.sh" ]; then row ok "failure notifier" "agent/schedule/notify.sh"
else row warn "failure notifier" "agent/schedule/notify.sh is not defined: failures are written to a log nobody reads"; fi
if [ -f "$repo/agent/logs/scheduled/last-run.json" ]; then row ok "last run record" "present (node agent/scripts/health-check.mjs judges it)"
else row warn "last run record" "no scheduled run has been recorded yet"; fi
if [ -f "$repo/agent/logs/sync/last-sync.json" ]; then row ok "last sync record" "present"
else row warn "last sync record" "agent/vm/sync-checkout.sh has not completed a sync here yet"; fi
n_local="$(ls "$repo/agent/logs/vm-local-changes" 2>/dev/null | wc -l | tr -d ' ')"
if [ "$n_local" != 0 ]; then
  row warn "discarded changes" "$n_local time(s) the sync found local changes and set them aside; newest: agent/logs/vm-local-changes/$(ls "$repo/agent/logs/vm-local-changes" | tail -1). Read it."
else
  row ok "discarded changes" "none: nothing on this machine has tried to change the code"
fi

# ---- what this script cannot see -------------------------------------------------
section "Not visible from this account"
row manual "secrets scope" "the secrets-manager token here opens one config holding only what the agent needs to operate, and no schema or admin credential"
row manual "repository token" "it is scoped to this one repository, contents read-only, with an expiry date"
row manual "firewall and updates" "inbound is limited to SSH, and security updates install by themselves"
row manual "access list" "every SSH key on the machine belongs to a known person and computer"
row manual "snapshots" "the provider snapshots or backs up the machine on a schedule"

echo
echo "$fails FAIL, $warns warn, $manuals manual."
[ "$fails" -eq 0 ] || exit 1
exit 0
