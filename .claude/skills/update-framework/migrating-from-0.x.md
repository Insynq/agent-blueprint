# Migrating from 0.x

Read by `/update-framework` when `.framework-version` is below 1.0.0, or when the project still has the framework's old command files or `docs/MULTI_AGENT_WORKFLOW.md`. Also read by `/adopt` when it finds the same.

Version 1 changed the layout, not only the contents. The migration is still an update, run through the same steps with the same three properties: the user sees the whole plan first, nothing is replaced or removed without a backup, and project-owned files are not written. This file says what is different.

## What changed

| 0.x | 1.x |
|---|---|
| Framework commands in `.claude/commands/*.md` | Skills in `.claude/skills/<name>/SKILL.md` |
| Subagent prompts written out inside each command | Roles in `.claude/agents/` |
| Conventions repeated in `CLAUDE.md` and commands | Path-scoped rules in `.claude/rules/` |
| Checks stated as instructions | Hook scripts in `.claude/hooks/`, registered in `.claude/settings.json` |
| `docs/MULTI_AGENT_WORKFLOW.md` | `docs/WORKFLOW.md` |
| A hosted agent gateway built into the core: its stack docs, `workspace/`, `deploy/`, `/audit-infra`, `/gen-skill` | Retired. The framework no longer supports that runtime; the `claude-agent` pack covers agents that run as Claude Code on a machine you control |
| An `ask` list in `.claude/settings.json` | No `ask` list; deny rules and a Bash guard hook |
| Specs at `docs/<name>-spec.md` | Specs at `docs/plans/<slug>/spec.md` |

Commands that have no skill of the same name in 1.x:

| Command | What replaced it |
|---|---|
| `/retro` | folded into `/ship` |
| `/changelog` | folded into `/ship` |
| `/visualize` | removed, no successor |
| `/audit-infra`, `/gen-skill` | removed with the gateway runtime, no successor |

## Getting this skill into a 0.x project

A 0.x project does not have this skill, and its own `/update-framework` command does not understand packs. Copy `.claude/skills/update-framework/` from a clone or an unpacked release of 1.x into the project, start a new session, and run `/update-framework`. If the 0.x command was already run against a 1.x release, the project is in a mixed state with a 1.x version stamp and 0.x leftovers. That is fine: this procedure detects the leftovers and starts from whatever is there.

## Differences from a normal update

### The base is not flattened

A 0.x release has no `packs/` and no `bin/pack.js`. Unpack the base and use it as it is. If the installed 0.x version cannot be downloaded, continue without a base: every file that differs from the target is then treated as customised, which means more questions and no lost work.

### Decide the packs before flattening the target

There is no `.framework-packs.json` yet. Work out what the project needs and confirm it with the user before the target is flattened, because the answer changes every path that follows.

- Add `claude-agent` if the repository holds an agent that runs as Claude Code driving scripts, `app` if it holds a web or mobile product with a database, and `devdash` if the owner wants the dashboard.

Flatten the target with the chosen packs. Writing `.framework-packs.json` becomes a step in the plan.

A 0.x project was scaffolded for a hosted agent gateway that 1.x no longer supports, so its stack-reference docs, `workspace/` and `deploy/` are in the base and absent from the target. They classify as retired. Framework files there that the project never changed are removed with a backup. Anything that differs from the base is the project's own work: the default is to keep it, and the plan must say so in as many words. Never propose removing a customised file under those directories. If the project still runs on that gateway, stop and tell the user that 1.x has nothing for it and they may prefer to stay on 0.x.

### Old command files

A file in `.claude/commands/` is the framework's if a file of the same name exists in the base's `.claude/commands/`. Without a base, use this list of every command 0.x shipped: `adopt`, `audit-code`, `audit-full`, `audit-infra`, `brainstorm`, `changelog`, `debug`, `gen-skill`, `gen-test`, `implement`, `investigate`, `kickoff`, `orchestrate`, `plan`, `plan-review`, `preflight`, `research`, `retro`, `ship`, `stress-test`, `triage`, `unify`, `update-framework`, `update-kb`, `visualize`.

- **Framework commands are backed up and removed**, including the ones with no successor. They cannot stay: a command and a skill with the same name collide, and nothing guarantees which one runs.
- **A framework command the project edited** is still removed, but first show the user what they had changed, as a diff against the base. Offer to carry the change into the new skill inside `<!-- local: reason -->` markers. The 1.x skills are rewrites, so a change usually has to be re-expressed, not pasted; if it no longer applies, say so and leave it in the backup.
- **Commands the project wrote itself are left exactly where they are.** They keep working as commands. Tell the user they can be moved to `.claude/skills/<name>/SKILL.md` later, following `docs/AUTHORING_SKILLS.md`, and list them.

### Skills, agents, rules and hooks

All of `.claude/skills/`, `.claude/agents/`, `.claude/rules/` and `.claude/hooks/` classify as new and are added. If the project already has a skill or agent with the same name as one of the framework's, that is a collision the user must resolve by renaming theirs; do not overwrite it and do not skip the framework's silently.

### docs/MULTI_AGENT_WORKFLOW.md

Retired and replaced by `docs/WORKFLOW.md`, which is new. Back up and remove the old file. If the project had edited it, show those edits: `docs/WORKFLOW.md` is a rewrite, so they do not merge across. The user chooses whether each edit goes into `docs/WORKFLOW.md` inside local markers, into a project doc, or stays in the backup.

Then search the project for `MULTI_AGENT_WORKFLOW` and list every reference. References in `CLAUDE.md` are handled by the restructure below. Propose fixing the others in the plan, except those in project-owned records such as changelogs and old specs, which describe the past and are left alone.

### .claude/settings.json

The normal structural merge applies, with one thing to get right. The 0.x file had an `ask` list covering commit, push, merge and similar commands. Version 1 removed it on purpose: the working agreement is to settle questions up front and then run without interruption, with deny rules and the Bash guard hook stopping the few commands that are never wanted. Ask rules take precedence over allow rules, so an `ask` list left in place would bring the prompts back.

- Entries in `ask` that came from the 0.x base are proposed for removal.
- Entries in `ask` that the project added itself are shown to the user, who decides whether each stays.
- The new `hooks` section is added, along with the new `allow` and `deny` entries. Entries the project added to `allow` or `deny` stay.

Show the resulting file as a diff and say plainly what the user is agreeing to: fewer prompts, and two hook scripts that run on every Bash call and every edit.

### CLAUDE.md

Restructured, not merged in place, because the section layout changed. Follow `.claude/skills/adopt/merging-claude-md.md`, using the flattened target's `CLAUDE.md` as the template. That file has the 0.x section mapping and the line-by-line accounting that proves nothing the project wrote was dropped. The merged file needs the user's approval like any other part of the plan.

### Project docs

- `docs/KB_INDEX.md` is framework-managed and is replaced. Rows the project added for its own KBs are carried over.
- `docs/KB_1_Architecture.md`, `docs/KB_8_Current_State.md` and everything project-owned keep their content.
- Starter files that 1.x introduces and the project lacks, such as `docs/PARKING_LOT.md`, are offered and created only if absent.
- Existing specs stay where they are. New specs go in `docs/plans/<slug>/`. Do not move old ones; their paths are cited in changelogs and commits.

## Order of work

1. Checks, fetch, pack decision, flatten the target, classify. Nothing in the project has changed.
2. One plan, covering the normal groups plus: packs to record, commands to remove, commands left in place, the workflow doc, the settings diff, the restructured `CLAUDE.md`, and references to fix. Wait for the user's go.
3. Back up everything that will be replaced, merged or removed, and confirm the backups.
4. Apply in this order: manifest, new files, replaced files, settings, `CLAUDE.md`, reference fixes, removals, `.framework-packs.json`, then `.framework-version` last.

Removals come after the additions so that an interrupted run leaves the project with both the old commands and the new skills, which is a visible collision, and never with neither.

## After applying

Check, and report each result as observed:

- No name exists both as `.claude/commands/<name>.md` and as `.claude/skills/<name>/`.
- `node .claude/hooks/check-edit.mjs` passes over every skill and agent file.
- A search for `MULTI_AGENT_WORKFLOW` finds only the references that were deliberately left.
- `.framework-packs.json` lists the packs that were decided, and `CLAUDE.md` has a section for each between the pack markers.

Then tell the user to restart the session, confirm both hooks under `/hooks`, and run `/preflight`. Suggest `/adopt` afterwards if the project's own docs have not been checked against the code recently; the migration does not audit them.
