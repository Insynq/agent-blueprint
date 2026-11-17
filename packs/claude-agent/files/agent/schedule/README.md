# Scheduling

`agent/scripts/scheduled-run.sh <skill>` runs one skill headlessly. This folder holds what points a scheduler at it. Read the script's header for its settings and exit codes.

The primary path is cron on the Linux machine the agent lives on (`docs/AGENT_HOSTING.md`). launchd on an always-on Mac is the alternative, described further down.

## Before scheduling anything

1. **Give scheduled runs their own checkout.** A scheduled run executes whatever is in its working tree, so if it shares the tree you work in, a half-finished edit is live at the next fire. On the hosted machine the checkout is already separate, and `agent/vm/sync-checkout.sh` holds it at a named ref. Releasing a change is then a deliberate act: moving that ref. On a machine you also develop on, clone the repository a second time and point the scheduler there. The script refuses to run from a checkout with uncommitted changes, or one whose HEAD is not `AGENT_RUN_REF` when that is set.
2. **Run the selftest from the scheduler's environment**, not only from your terminal: `agent/scripts/scheduled-run.sh --selftest <skill>`. A scheduled job has a different PATH and may not have your sign-in or your secrets. The selftest starts no model.
3. **Check the headless sign-in.** `claude -p` needs credentials that work with nobody at the keyboard. A stored interactive sign-in expires; `claude auth status` shows when. For a job that must keep running, the person whose subscription it uses creates a long-lived token with `claude setup-token`, and the scheduler's environment carries it as `CLAUDE_CODE_OAUTH_TOKEN`, read from a file outside the repository.
4. **Define `notify_failure`** in `agent/schedule/notify.sh` (sourced by the script if present). Until you do, failures are written to `agent/logs/scheduled/FAILURES.log` and nowhere else. Send to the owner or operator only.

   ```bash
   # agent/schedule/notify.sh
   notify_failure() {   # $1 subject, $2 log path
     tail -n 40 "$2" | mail -s "$1" owner@example.com
   }
   ```
5. **Decide the permission mode** (`AGENT_PERMISSION_MODE`, explained in the script). The default, `dontAsk`, runs only what `.claude/settings.json` allows, so check that the allow list covers the scripts the runbook calls and nothing broader than you intend.
6. **Leave `AGENT_WRITE_AUTHORIZED` unset** until the owner has seen scheduled dry runs and approved scheduled writes. Then put it on that job's own line in the scheduler, and nowhere else.

Secrets: start the job through your secrets manager's run command, with its token read from a root-owned file outside the repository. Do not commit them, and do not write them into the crontab or a plist.

## cron (the hosted Linux machine)

Copy `crontab.template` to `agent/schedule/crontab`, edit the jobs and times, and commit it. Then, as the account the agent runs under:

```bash
agent/vm/onboard-operator.sh              # dry run: shows the block it would install
agent/vm/onboard-operator.sh --apply      # installs it, and reads it back
crontab -l                                # what is scheduled now
```

The script replaces `__RUNTIME_CHECKOUT__` with the checkout's path and installs the lines as one marked block, leaving the rest of the crontab alone. Running it again replaces the block. The crontab holds a copy: after a change to `agent/schedule/crontab` reaches the machine, run it again (`agent/vm/vm-check.sh` reports when the two differ).

The template has three kinds of line:

```cron
*/15 * * * * AGENT_SYNC_REF=main /home/agent/repo/agent/vm/sync-checkout.sh --discard-local >/dev/null 2>&1
5 7 * * 1-5 /home/agent/repo/agent/scripts/scheduled-run.sh run-example
10,40 * * * * cd /home/agent/repo && node agent/scripts/health-check.mjs --json > agent/logs/scheduled/health.json 2>&1 || <your alert command>
```

Things cron does differently from your shell:

- **Times are in the machine's time zone.** Check `date` on the machine before trusting an hour.
- **PATH is minimal.** The scripts add the usual locations themselves; anything else needs a full path.
- **Put a job's settings on its own line** (`AGENT_RUN_REF=v12 /path/scheduled-run.sh job`). A `NAME=value` line in a crontab applies to every line after it, including ones that are not yours.
- **`%` is special in a crontab line.** Keep it out of commands.
- **Keep the sync, the jobs and the health check on different minutes.** The sync will not move the tree while a job holds the lock, but a job that starts in the middle of a sync reads a tree that is half moved.

`agent/vm/onboard-operator.sh --remove --apply` takes the block out again.

## launchd (an always-on Mac)

```bash
cp agent/schedule/com.example.agent-run.plist.template ~/Library/LaunchAgents/com.yourorg.agent-run.run-example.plist
# edit: label, __RUNTIME_CHECKOUT__, times
plutil -lint ~/Library/LaunchAgents/com.yourorg.agent-run.run-example.plist
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.yourorg.agent-run.run-example.plist
launchctl kickstart gui/$(id -u)/com.yourorg.agent-run.run-example    # run once now
launchctl print gui/$(id -u)/com.yourorg.agent-run.run-example        # state and last exit
launchctl bootout gui/$(id -u)/com.yourorg.agent-run.run-example      # unload
```

A LaunchAgent runs only while that user is logged in, which is also what gives it access to the user's keychain. `launchctl list | grep agent-run` shows what is loaded; check it before saving an edit that could change what a run does. One plist per job, plus one for `agent/vm/sync-checkout.sh` and one for the health check if the Mac is the hosted machine. `onboard-operator.sh` installs cron only; on a Mac use `--no-schedule` and load the plists by hand.

## The health check

Schedule `agent/scripts/health-check.mjs` separately and more often than the runs. It has no model in it and exits non-zero when a required variable is missing, the last run failed or is too old, or the checkout is dirty. It is what tells you that runs have stopped happening, which a notify-on-failure hook cannot: a run that never starts never fails. Wire its non-zero exit to the same notifier, and have it alert when a problem first appears, not on every pass.

## Where things land

| Path | What |
|---|---|
| `agent/logs/scheduled/<skill>-<stamp>.log` | Script log for one run |
| `agent/logs/scheduled/<skill>-<stamp>.out.md` | The skill's report |
| `agent/logs/scheduled/last-run.json` | Outcome of the latest run, read by the health check |
| `agent/logs/scheduled/FAILURES.log` | Failures, when no notifier is defined |
| `agent/logs/sync/sync.log`, `last-sync.json` | What the checkout sync did, and its latest result |
| `agent/logs/vm-local-changes/<stamp>/` | Local changes the sync saved before discarding them |
| `agent/logs/guarded-writes.jsonl` | Pre-image of every guarded write |

`agent/logs/` and `agent/data/` are gitignored. Runtime state must stay out of tracked paths, or every run would dirty the checkout it runs from.
