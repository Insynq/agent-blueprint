# Operator Handoff

How to hand a running agent to another person, who operates it on their own Claude subscription, while the owner keeps the code, the data structure and the secrets. The machine is the one described in `docs/AGENT_HOSTING.md`.

Two roles:

- **Owner** (developer): builds and changes the agent. Holds the repository, the schema, the development secrets and admin access to the machine.
- **Operator**: uses the agent every day to do the work. Decides what the work needs. Does not change how the agent behaves.

In the project this comes from, the owner left the daily work, an operator took it over on a VM the owner provisioned, and the owner stayed on as the person who maintains the system. The operator works with the agent daily on their own subscription, the store is kept current, and scheduled jobs run without either of them.

## What the operator gets, and does not

| The operator gets | The operator does not get |
|---|---|
| An account on the machine, without sudo | Admin access to the machine |
| The agent, with every runbook and skill, on their own Claude subscription | The owner's Claude account, or a shared login |
| Read and write access to the data, through the agent's scripts and tools | Any way to change the schema, roles or policies |
| A read-only copy of the repository that updates itself | Any way to push, or to make a local change last |
| A channel for suggesting rule changes | The ability to change rules, runbooks, scripts or memory |
| Authority over the business decisions the owner delegates (list them) | Development secrets, deploy credentials, other projects |

One subscription is one person. The operator signs in as themselves and nobody else uses that sign-in. If the owner also works on the machine, the owner uses a separate account and their own subscription. Scheduled model runs draw on the allowance of whoever's sign-in they use, so decide that deliberately, and read your plan's terms on unattended use before relying on it.

## What this protects, and what it does not

State both to yourself before handing anything over. The arrangement is strong where it rests on a credential being absent and weak where it rests on a setting.

**It protects:**

- The schema, the deploy path and the repository's history. The credentials that change them are not on the machine.
- The owner's other projects, and the owner's own Claude account.
- The agent's behaviour over time. A change made on the machine is discarded at the next sync and leaves a record that it was tried.
- Outward actions from happening without a person seeing them, as long as the session uses the settings layer.

**It does not protect:**

- **The code's confidentiality.** The operator has a shell and the checkout is readable by their account. They can read every runbook, script and memory file, and copy them. A read-only token stops pushing, not reading. If the code must stay unseen, the operator needs a front end with no shell, not this model. Otherwise the control is the agreement you have with the person.
- **The operating secrets.** The operator's account can read the secrets-manager token file, because the agent running as that account must. So the operator can use the operating secrets directly, outside the agent's guards: read and write any record those secrets reach, and call any vendor API they open. Scope those secrets as if you were handing them over, because you are.
- **The data.** Operating the agent means writing to the store. The pre-image log and the validation marks let you see and reverse changes; they do not prevent them.
- **The window before a sync.** An edit to a script in the checkout is live for interactive sessions until the next sync resets it. Scheduled runs refuse a modified tree; interactive ones do not check.
- **Anything, against sudo.** An account with sudo can read and change every file here, including the managed settings. The operator account must not have it.

## How each tier is enforced

Hardest first. A lower row is never the reason a higher row can be skipped.

| Layer | What it is | Holds against |
|---|---|---|
| 1. Absent credentials | No schema, admin, deploy or push credential on the machine | Everyone on the machine, and the agent |
| 2. The checkout is a deploy target | A read-only repository token, and a sync that resets to the named ref | Lasting changes by anyone on the machine |
| 3. Managed settings | The operator layer installed in Claude Code's managed settings directory, root-owned | The agent in every session, and an operator without sudo |
| 4. Local settings | The same layer in `.claude/settings.local.json` | The agent, in sessions that load local settings. The operator can edit the file |
| 5. Written rules | `CLAUDE.md` and `.claude/rules/` saying what an operator session does not do | Nothing by itself. It is why the agent declines politely and explains |

Label each rule you add by its row. A rule in row 4 or 5 presented as a wall is a promise presented as a wall.

## The operator settings layer

`.claude/settings.operator.json` is the layer. It is a template, not a file Claude Code reads by that name. Edit it for the project, commit it, and `agent/vm/onboard-operator.sh` applies it.

What is in it:

- **`deny` on `Edit(...)`** for `CLAUDE.md`, `.claude/settings.json`, skills, rules, hooks, agents, `agent/runbooks/`, `agent/scripts/`, `agent/schedule/`, `agent/vm/`, `docs/` and the memory directory under `~/.claude/projects/`. An operator session reads all of these and changes none. `Edit` rules cover every built-in tool that edits files.
- **`deny` on `Bash(git commit *)` and `Bash(git push *)`.** A commit on the machine would be discarded; saying no at the start is kinder than losing it later.
- **`deny` on any command that sets `AGENT_WRITE_AUTHORIZED`**, repeated here so that the managed copy carries it.
- **`ask` on `crontab`, `launchctl`, a sync with `--discard-local`, and a confirmed delete.** These always stop for the person.
- **`disableBypassPermissionsMode`**, so a session cannot be switched into the mode that skips permission checks.

What to add for the project: a `deny` for each command that changes schema (the migration CLI's push, reset and link commands), and an `ask` for each outward command (create or send an invoice, send mail, write to a vendor's system) and each tool-server tool that writes. Before any outward command, the agent shows exactly what will go out, so the prompt sits under the thing being approved.

How it is applied, and why two ways:

- **Local**: `onboard-operator.sh --apply` merges it into `.claude/settings.local.json` in the checkout. That file is untracked, so the sync leaves it alone, and it must be ignored by git or scheduled runs will refuse the tree.
- **Managed**: `sudo ... onboard-operator.sh --apply --layer managed` writes it to `/etc/claude-code/managed-settings.d/50-agent-operator.json` (on a Mac, under `/Library/Application Support/ClaudeCode/`). Rules that start with `./` are rewritten to the checkout's absolute path. The managed layer applies to every account on the machine, which is one more reason the owner develops somewhere else.

Do both. The managed copy is the one the operator cannot edit.

Checked against Claude Code's documentation and `claude --help` (version 2.1.322) when this was written:

- Precedence, highest first: managed settings, `--settings` on the command line, `.claude/settings.local.json`, `.claude/settings.json`, `~/.claude/settings.json`. Nothing in a user's files overrides a managed key.
- Lists such as `permissions.deny` are combined across files, not replaced. Rules are evaluated deny, then ask, then allow, and an allow rule cannot carve an exception out of a deny or an ask. So when the operator answers "don't ask again" and Claude Code saves an allow rule to the local file, the layer's deny and ask rules still win.
- An `ask` rule still prompts in auto mode. Under `dontAsk`, which scheduled runs use, it is a denial.
- `auto` and `bypassPermissions` as a default mode do not take effect from project or local settings, so the layer does not try to set a mode.
- `Edit` and `Read` deny rules cover Claude's file tools and the file commands it recognises in Bash. They do not cover a program that opens files itself. A script the agent runs can still write where a rule says no, which is why rows 1 and 2 exist.

Not verified: no live session was run with the layer applied. How a path rule beginning with a single `/` anchors in a managed file is not documented, which is why the script writes absolute `//` paths instead; that rewrite was checked by reading the file back, not by a session. By its help text `--setting-sources` can leave the local file out of a session; the managed copy is not in its list. Whether a desktop-app session over SSH reads the remote machine's settings files in every case was not tested.

## Onboarding

Owner and operator together, in one sitting. The owner has already provisioned the machine (`docs/AGENT_HOSTING.md`).

1. **The operator has their own Claude subscription** and is signed in to it on their own computer. The owner's account is signed out there.
2. **The operator creates an SSH key on their computer** and sends the owner the public half. The owner adds it to the operator account's `authorized_keys` with a comment naming the person and the computer. Their computer needs a login password and disk encryption: the key is only as safe as the laptop.
3. **The owner runs `agent/vm/onboard-operator.sh`** as the operator account, reads the dry run, runs it with `--apply`, then applies the managed layer as root.
4. **The operator signs in to Claude on the machine as themselves.** Either they open a session on the machine from the Claude desktop app over SSH, which uses the sign-in on their own computer and stores none on the machine, or they run `claude` in a terminal there and sign in. The first is what the source project uses daily and is easier for someone new to a terminal.
5. **Check the stop.** The operator asks the agent to run one outward command in a form that changes nothing (its help text). A permission prompt must appear even though nothing else prompts.
6. **Check the wall.** The operator asks the agent to edit a runbook. It must decline and offer to record a suggestion.
7. **The owner runs `agent/vm/vm-check.sh`** and clears every FAIL.
8. **One real piece of work, the operator driving and the owner watching.** Not a demonstration. Then fix what it exposed and do a second one.
9. **Write the operator's own page**: how to get in, the few things they will ask for most, what "this does not add up" looks like, and what to do by hand when the agent is unavailable. One rule at the top: the agent is fast and usually right, and it is not the last word on anything that goes out.

## How the operator proposes a rule change

The operator will notice things the owner cannot: a step the agent keeps getting wrong, a rule that no longer fits. Those must reach the owner without the operator editing anything.

- **Facts go to the store**, as always: a corrected date, a preference, a reassignment. Written straight away, marked for validation when inferred.
- **A change to how the agent should behave goes to one suggestion queue** that the owner reviews: a table in the project's store, written through the guarded write helper. Each row has a one-line title, what happened, what the rule should be, the evidence, the operator's name as its source, and an open status.
- **The bar is high.** A suggestion is about future behaviour ("it keeps filing supplier credits as new purchases"), not a one-off fact or a passing remark.
- **Look before adding.** If an open suggestion already says it, add the new evidence to that row.
- **The owner reviews weekly**, turns the good ones into commits, and they reach the machine at the next sync. A suggestion never changes behaviour by itself: recording is automatic, applying is a reviewed commit.

Tell the agent this in `CLAUDE.md`, so that when an operator asks for a rule change it records a suggestion and says who decides.

## Offboarding and revocation

In this order, so that access ends before anything else is tidied.

1. Remove the operator's lines from `authorized_keys`. Check that no other account or forwarding rule lets them in.
2. Remove the schedule if it ran on their sign-in: `agent/vm/onboard-operator.sh --remove --apply`.
3. Sign their Claude account out on the machine (`claude auth logout` as that account), and delete any long-lived Claude token they created for it. Their subscription is theirs; you are only removing it from your machine.
4. Rotate the secrets-manager token and every operating secret it could read. They were readable by that account, so treat them as known.
5. Revoke the repository token and issue a new one.
6. Remove their access to anything beside the machine: the store's application accounts, vendor systems, shared mailboxes.
7. Read `agent/logs/vm-local-changes/` and the last weeks of the write log once more.
8. Disable or delete the OS account. Keep its logs.

A lost laptop is steps 1 and, if a session was open, 4.

## What the owner checks weekly

- `agent/vm/vm-check.sh`: no FAIL, and each warn understood.
- Scheduled runs: expected against completed. A run that never started is not in the failure log.
- `agent/logs/vm-local-changes/`: anything new means something tried to change the code on the machine. Find out what.
- The SSH key list against the people and computers you expect.
- The suggestion queue: decide each open item.
- Outward actions taken that week, against what you would have approved. A sample is enough.
- The sign-in the schedule depends on, and how long until it expires.
- Usage against the operator's allowance, if scheduled runs share it.
- One restored snapshot per quarter, so that the rollback is known to work.
