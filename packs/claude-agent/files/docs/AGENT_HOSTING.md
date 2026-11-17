# Agent Hosting

How to host the agent on a virtual machine: one small Linux VM, a checkout of the repository, cron running `claude -p`, and a person who signs in over SSH. For the engineer setting it up. `docs/OPERATOR_HANDOFF.md` covers handing the running agent to someone else; `docs/AGENT_PATTERNS.md` covers how the agent itself is built.

Where this comes from: a production agent hosted this way since its owner handed it to an operator. Each section says what that project proved and what is this pack's recommendation beyond it.

## Why a VM with cron, and not an agent gateway

An agent gateway is a long-running server that holds the agent's credentials, listens for messages and events, and starts model sessions when one arrives. It is convenient and it concentrates risk in one place:

- **Whoever can reach the inbound channel can start the agent.** A message, a webhook or a forwarded email becomes a model session holding your credentials, with text the sender wrote as its input, at a rate and cost the sender controls.
- **The process is always up and always holding the keys.** There is no moment at which nothing is running.
- **Behaviour lives partly in the gateway's own configuration and state**, outside the repository, where a change is not a reviewed commit.

The VM model removes each of those by construction:

- **Nothing listens except SSH.** A model session starts for two reasons only: a cron line you wrote fired, or a person who signed in typed something. An incoming event is recorded by a script and read by the next scheduled run (`docs/AGENT_PATTERNS.md` section 6).
- **Each run is a fresh process** with a stated permission mode. It starts, does one job from a runbook, writes a log and exits.
- **The repository is the whole agent.** What runs is what is at a named ref. The checkout on the machine cannot push and is reset to that ref, so a change made on the machine does not survive.
- **The blast radius is the machine, and you choose what is on it.** Only the credentials the agent needs to operate are there. Schema, deploy and source-control write credentials are not.
- **Revocation is small and certain.** Remove a key, rotate one token, or power the machine off. A provider snapshot is a full rollback.

What it costs: there is no instant reaction to events (the agent is as fresh as its schedule), someone has to patch a server, and "the machine is down" is a real failure. Say what the manual fallback is for each job.

## What the machine looks like

```
/home/<operator>/<repo>/          the checkout: cloned with a read-only token, reset to a named ref
  .claude/settings.local.json     the operator settings layer (untracked)
  agent/logs/, agent/data/        runtime state (ignored by git)
/etc/agent/                       credential files, root-owned, outside the checkout
  git-token                       read-only repository token
  secrets-token                   secrets-manager token for the operating config
crontab of <operator>             sync, scheduled jobs, health check
<admin> account                   the owner: sudo, one SSH key per computer
<operator> account                the operator: no sudo, one SSH key per computer
```

One machine, one OS account per person. Claude Code stores its sign-in per OS account, so each person runs on their own subscription and nobody sees another's session. A second machine per person only adds a second copy of the credentials to patch and watch.

## Provisioning checklist

Done by the owner, once. `agent/vm/vm-check.sh` checks what it can see afterwards and lists what it cannot.

1. **Create the VM** with a provider that takes scheduled snapshots. A small general-purpose Linux instance is enough unless a job needs memory (local transcription, a large local database).
2. **Before anything else, prove that Claude Code signs in on it** with a subscription and that `claude -p "say ok"` answers from a non-interactive shell. Everything else is built on this, so find out on the first day.
3. **Harden access.** An admin account with sudo for the owner and an operator account without it. SSH keys only: password sign-in off, root sign-in off. One key per person per computer, each labelled, so a lost laptop means removing one line. A firewall that admits SSH only. Automatic security updates. Something that bans repeated failed sign-ins.
4. **Install** git, Node, Claude Code, the secrets-manager CLI, and a terminal multiplexer so a dropped connection does not end a session.
5. **Set the time zone** the schedule is written in, and check it with `date`.
6. **Place the credential files** under a root-owned directory outside the checkout (see the next section).
7. **Clone the repository as the operator account** with the read-only token, then run `agent/vm/sync-checkout.sh` once.
8. **Run `agent/vm/onboard-operator.sh`**, read the dry run, then `--apply`. As root, apply the managed layer too (`docs/OPERATOR_HANDOFF.md`).
9. **Run `agent/vm/vm-check.sh`** as the operator account until it shows no FAIL, and work through its `manual` lines by hand.
10. **Take a snapshot** and note how to restore it.

The source project provisioned by hand from a list like this one and recorded what it did. It has no provisioning script, and this pack ships none: the steps differ by provider and are done once.

## Credentials

The rule that does the work: **a credential that is not on the machine cannot be used from it.** Everything else is a courtesy on top.

| Credential | Where it lives | Scope | Owned by | Can | Cannot |
|---|---|---|---|---|---|
| Claude sign-in | The operator's home directory, or nowhere on the machine when the operator connects through an app that forwards their sign-in | The operator's own subscription | Operator | Run model sessions, billed to the operator | Reach the owner's Claude account or anything in the repository's remote |
| Long-lived Claude token (`claude setup-token`), only if scheduled runs use a model | An owner-only file outside the checkout, read into the scheduler's environment | Model requests on the subscription of whoever created it | That person | Let `claude -p` run with nobody signed in, for a year | Use claude.ai connectors or remote control |
| Secrets-manager token | `/etc/agent/secrets-token`, root-owned, readable by the operator account only | One config that holds only the operating secrets | Owner | Fetch the operating secrets when a script or tool server starts | Read the development config, where schema and deploy credentials live |
| Operating secrets (data API key, vendor API keys) | In the environment of the process that needs them, fetched at launch. Not in the checkout, not in a dotfile | The data plane: read and write records | Owner | Do the agent's work | Change schema, manage the project, deploy |
| Repository token | `/etc/agent/git-token`, root-owned, readable by the operator account only | This one repository, contents read-only, with an expiry | Owner | Fetch | Push, open pull requests, read other repositories |
| SSH public keys | Each account's `authorized_keys` | One person on one computer | Owner manages the list | Sign in as that account | Anything once the line is removed |
| Write authorisation (`AGENT_WRITE_AUTHORIZED=true`) | On the job's own line in the crontab, and nowhere else | One scheduled job | Owner decides | Let that job's scripts write | Be set by the model: a settings rule denies it and the scripts read it from the environment only |

**Never on the machine:** schema or migration credentials, the database admin password, the secrets manager's development config, any credential that can push to the repository, the owner's own Claude sign-in, and secrets for unrelated projects.

Three details that each cost the source project an iteration or would have:

- **Make the operating config its own root in the secrets manager, not a branch of the development one.** In at least one secrets manager a branch config inherits its parent's values, so a "restricted" branch held every migration credential.
- **Give tool servers their secrets through a launch wrapper.** An MCP server is registered as a small script that asks the secrets manager for that server's keys and then starts it. The registration in the repository names the wrapper and contains no secret, and the model never holds a key: it calls a tool by name.
- **One writer per rotating credential.** If a vendor token rotates on use, exactly one machine may hold it. Remove every other copy, including fallback env files, or the chain breaks.

What the source project did not do, and you may want: a database role for the agent that is limited to the tables it uses. There, the operating key had the whole data plane and the boundary was the absence of schema credentials. Where the store supports narrower roles, use one.

## Getting the repository, and keeping it current

Clone over HTTPS with the read-only token supplied by a one-off credential helper, so the token is never in the remote URL or the git config:

```bash
export AGENT_GIT_TOKEN_FILE=/etc/agent/git-token AGENT_GIT_TOKEN_USER=x-access-token
git -c credential.helper= \
    -c 'credential.helper=!f() { test "$1" = get || exit 0; echo "username=$AGENT_GIT_TOKEN_USER"; echo "password=$(cat "$AGENT_GIT_TOKEN_FILE")"; }; f' \
    clone https://<host>/<org>/<repo>.git
```

After that, `agent/vm/sync-checkout.sh` keeps the checkout at a named ref, using the same helper when `AGENT_GIT_TOKEN_FILE` is set. It refuses to sync over local changes unless given `--discard-local`, and with that flag it saves them under `agent/logs/vm-local-changes/<timestamp>/` before resetting. On the hosted machine the schedule passes `--discard-local`: nobody develops there, and a checkout that quietly stops updating because one tracked file changed is worse than a discarded edit you can read later. Each saved folder is a signal worth reading.

Choose what the machine tracks (`AGENT_SYNC_REF` on the sync line):

- **A release branch** (recommended): the machine tracks `live`, and releasing is `git push origin main:live`. Pushing to `main` does not deploy.
- **The main branch**: every push is live within one sync interval, including a broken one. This is what the source project does, with "test before pushing" as the only gate.
- **A tag**: strict pinning. Set `AGENT_RUN_REF` to the same tag on the job line and `scheduled-run.sh` refuses to run anywhere else. The sync refuses a tag that has moved on the remote.

The installed crontab is a copy. When a sync brings a changed `agent/schedule/crontab`, rerun `agent/vm/onboard-operator.sh --apply`; `vm-check.sh` reports the difference until you do.

## Scheduled runs

`agent/schedule/README.md` has the mechanics. On the VM, the operator account's crontab holds three kinds of line, installed by `onboard-operator.sh` from `agent/schedule/crontab`:

- the sync, every fifteen minutes;
- one line per job, calling `agent/scripts/scheduled-run.sh <skill>` (lock, clean-tree check, `claude -p`, log, failure notice), or a plain script for jobs that need no model;
- the health check, on its own minutes.

Start the secrets manager on the line itself, reading its token from the file: `SECRETS_TOKEN="$(cat /etc/agent/secrets-token)" <secrets-cli> run -- <the job>`.

Prefer a plain script on the schedule and a model only where judgment is needed. The source project's unattended work on the VM is deterministic scripts; its model sessions there are the operator's interactive ones. It designed `claude -p` jobs on the operator's subscription for the VM and had not moved them there when this was written, so treat an unattended model job on the VM as designed and sign-in-tested, not as run for months. Two things follow if you schedule one: a stored sign-in expires, so use a long-lived token and alert on its age; and every run draws on the operator's usage allowance.

The source project uses systemd timers where this pack uses cron. Either works. Cron is one file and one command to read back.

## Monitoring

Nobody watches a healthy agent, so the design is: silence when well, one message when not.

- **A failed run notifies the owner.** `scheduled-run.sh` calls `notify_failure` from `agent/schedule/notify.sh`. Owner only, failures only.
- **The health check catches runs that never started.** `agent/scripts/health-check.mjs` has no model in it. Alert when a problem first appears and once when it clears, not on every pass.
- **`vm-check.sh` weekly**, and after any change to the machine.
- **Watch the machine as well as the agent.** The source project's health check also reports: a change to any account's SSH keys, a sign-in from a key it does not know, pending security updates, a required reboot, disk space, and each time the sync discarded local changes. Facts only root can read are gathered by a small script installed as a fixed copy outside the checkout, because code that arrives from the remote by itself must never run as root.
- **A weekly summary for the owner**: runs expected and completed, failures, discarded local changes, and the operator's open suggestions.

## How the owner sees and intervenes

| To | Do |
|---|---|
| See what ran | Read `agent/logs/scheduled/` over SSH, or the failure notices |
| Change behaviour | Commit where you develop, then push to the ref the machine tracks |
| Apply a change now | `ssh <admin>@<vm>`, then run `agent/vm/sync-checkout.sh --discard-local` as the operator account |
| Stop scheduled writes | Remove `AGENT_WRITE_AUTHORIZED=true` from the job line. Runs continue as dry runs |
| Stop the schedule | `agent/vm/onboard-operator.sh --remove --apply` as the operator account |
| Lock someone out | Remove their line from `authorized_keys` |
| Stop everything | Power the machine off. Nothing else holds the operating secrets |
| Undo the machine | Restore the snapshot, then rotate the two tokens |

The owner does not edit files in the checkout on the machine. The next sync would discard the edit, and until then it would be live with no review.

## When something goes wrong

| What you see | Likely cause | What to do |
|---|---|---|
| Runs fail with a sign-in error | The stored Claude sign-in expired | The operator signs in again; for scheduled jobs move to a long-lived token |
| Runs "refused: uncommitted changes" | Something wrote into a tracked path | Read `agent/logs/vm-local-changes/` after the next sync; find what wrote it and move its output to an ignored path |
| The health check says runs stopped | Cron not running, the machine rebooted, the block was removed | `crontab -l` as the operator account, then the job's last log |
| The sync reports a fetch failure | The repository token expired or was revoked | Issue a new read-only token, replace the file, run the sync by hand |
| The sync says a tag moved | Someone re-pointed a release tag | Decide whether that was meant. If so, delete the local tag and sync |
| A vendor rejects a rotating token | A second machine used the same token | Re-authorise, then remove the token from every machine but one |
| A bad change went live | The tracked ref moved to a broken commit | Move the ref back and sync. Restore rows from `agent/logs/guarded-writes.jsonl` |
| The machine is unreachable | Provider outage, firewall change, full disk | Provider console. Meanwhile each job's manual fallback applies |
| You suspect the machine is compromised | | Power it off, rotate both tokens and every operating secret, restore or rebuild, and read the access log before reconnecting anyone |
