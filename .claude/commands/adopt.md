---
description: Existing-repo onboarding — populate KBs, audit existing docs, merge CLAUDE.md
argument-hint: "[--minimal]"
---

# Adopt — Existing-Repo Onboarding

**This is a conversation command.** No destructive change happens until you've approved each draft, audit decision, and merged section. Files only get written after explicit user OK.

`/adopt` is to existing-repo onboarding what `/kickoff` is to greenfield. Run it after the framework installer (`npx @insynq/agent-blueprint init`) has dropped framework files into your repo. It reads your existing OpenClaw agent project state, drafts proposed populations for the project-state KBs, audits any existing user KBs against current code, and assists merging an existing `CLAUDE.md` with the framework template.

**Prerequisites:**
1. The framework installer must have run successfully (`.framework-version` should exist at the project root).
2. Ideally `/preflight` has run (writes the `## Environment` block to CLAUDE.md). If not, this command will prompt you to run it.
3. The repo should be a single OpenClaw agent project, not a multi-agent monorepo (V1 limitation — see Step 1).

**If `--minimal` was passed:** skip the discovery flow (Step 4 KB drafts and Step 5 existing-KB audit). Still run Steps 1, 2, 3, 6 (lightweight merge), and 7. Reasoning: even minimal users need the framework's Reference Documents and Custom Commands tables in their CLAUDE.md, otherwise other slash commands (`/orchestrate`, `/ship`, etc.) will not know what's available.

---

## Step 0 — Welcome

Before anything else, deliver this welcome message. Reproduce it largely verbatim — light tone-matching is fine, don't paraphrase away the structure or the boundaries.

```
Welcome — /adopt is the existing-repo onboarding command for OpenClaw agent
projects. The framework's files are installed; this command makes them fit
your existing agent. It will:

  1. Verify the install is complete and the project state is sane.
  2. Auto-derive your runtime shape from workspace/, mcporter.json, and any
     in-repo MCP servers.
  3. Draft KB_1_Architecture from your repo structure — you approve before
     anything is written.
  4. Audit any existing /docs/KB_*.md files you have for staleness against
     the current codebase (skill names, MCP tool ids, script names, env vars).
  5. Merge your existing CLAUDE.md with the framework template, section by
     section, with a three-pane preview at every conflict. Your content wins
     on conflicts; original CLAUDE.md is backed up before any change.

Run with --minimal if you just want the commands installed without the
drafting and auditing flow (a lightweight CLAUDE.md merge still runs so the
other slash commands can find their references).

This is a conversation. I will not write or modify a file without your OK.
```

After delivering the welcome, proceed to Step 1. Don't wait for an explicit "ready?" — Step 1 is read-only verification and starts immediately.

---

## Step 1 — Sanity & Re-invocation Checks

Before anything, verify the repo is in a state that `/adopt` can work with. Each check is a hard gate or a warn-only signal as noted.

### 1a. Re-invocation detection (HARD GATE — exit if matched)

Check whether `/adopt` has already run on this project. Two markers indicate prior adoption:

- `CLAUDE.md.pre-adopt-backup` exists at the project root (proves Step 6's merge ran)
- Any file matching `docs/adopt-audit-*.md` exists (proves Step 5's audit log was written)

If either is present, **exit cleanly** with this message (don't treat as an error — the state is fine):

```
/adopt has already run on this project.

  Detected: <CLAUDE.md.pre-adopt-backup | docs/adopt-audit-YYYY-MM-DD.md>

V1 doesn't support re-running /adopt — re-adopt logic is deferred to V2. The
framework files are already in place and you can use the slash commands
normally.

If you genuinely need to re-run (e.g., framework version bumped and you want
to re-merge), delete BOTH markers:
  - rm CLAUDE.md.pre-adopt-backup
  - rm docs/adopt-audit-*.md

Then re-invoke /adopt. Your current CLAUDE.md is preserved as-is.
```

Stop. Do not proceed.

### 1b. Framework install verification (HARD GATE — exit if incomplete)

Verify the installer ran successfully:

1. `.framework-version` exists at the project root. If missing → exit:

   ```
   Framework not installed. Run `npx @insynq/agent-blueprint init` first.
   ```

2. `.claude/commands/` exists and contains the framework commands. Glob `.claude/commands/*.md` and confirm at least 22 `.md` files. If fewer:

   ```
   Framework files incomplete — found N command(s), expected 22+.
   Re-run `npx @insynq/agent-blueprint init` to repair.
   ```

3. `docs/OpenClaw KBs/` exists with the OC_KB collection. Glob `docs/OpenClaw KBs/OC_KB_*.md` — expect at least 10 files (00 index + 01–09). If fewer:

   ```
   Framework files incomplete — found N OpenClaw KB file(s), expected 10.
   Re-run `npx @insynq/agent-blueprint init` to repair.
   ```

If any check fails, stop. Don't try to repair — that's the installer's job.

### 1c. Multi-agent monorepo detection (HARD GATE — V1 limitation)

If the repo contains multiple `workspace/` directories (e.g., `agents/foo/workspace/`, `agents/bar/workspace/`), treat it as a multi-agent monorepo and exit with guidance:

```
Multi-agent monorepo detected (multiple workspace/ directories found).

V1 of /adopt does not support multi-agent monorepos. The auto-derivation
logic assumes a single agent at the repo root.

Workaround for V1:
  1. cd into the agent project you want to adopt (e.g., agents/foo/)
  2. Confirm the framework files (.framework-version, .claude/, docs/) are
     accessible from there
  3. Re-run /adopt from that working directory

V2 will support multi-agent layouts with a --target-agent flag.
```

Stop. Do not proceed.

### 1d. Environment block check (warn — non-blocking)

Read `CLAUDE.md`. Check whether it contains a `## Environment` section with populated values (not `[TODO]`). If missing or unpopulated, surface:

```
Note: CLAUDE.md doesn't have a populated ## Environment section yet.
That's normally written by /preflight. Recommended (but not required):
run /preflight in a fresh session before /adopt finishes, or after.
You can continue now and come back to it.
```

Don't block.

### 1e. Dirty git tree (warn — non-blocking)

Run `git status --porcelain`. If it returns non-empty output, surface:

```
Your git working tree has uncommitted changes:

<paste of git status --porcelain output>

/adopt is non-destructive (it only writes new files and creates a backup),
but your eventual `git diff` will show the install + adopt changes mixed
with whatever else is in your working tree. Consider committing or
stashing first, then re-running.

Continue anyway? [y/N]
```

If user says no, exit cleanly. If they say yes, proceed.

If git is unavailable (no `.git` directory or git command fails), skip this check silently and surface a one-line warning: "Note: git not available — backups are the only recovery path if anything goes sideways."

### 1f. Global command shadow re-detection (warn — non-blocking)

Glob `$HOME/.claude/commands/*.md`. For each match whose basename matches a framework command (`audit-code`, `audit-full`, `audit-infra`, `brainstorm`, `changelog`, `debug`, `gen-skill`, `gen-test`, `implement`, `investigate`, `kickoff`, `orchestrate`, `plan`, `plan-review`, `preflight`, `research`, `ship`, `unify`, `update-kb`, `visualize`, `adopt`, `update-framework`), warn:

```
Found user-global command shadow(s) at ~/.claude/commands/:
  - <name>.md

These may shadow the project-local framework versions. Recommended:
rename ~/.claude/commands/ to ~/.claude/commands_legacy/ until you
confirm everything works, OR see docs/MULTI_AGENT_WORKFLOW.md for
multi-project hygiene.

Continue anyway? [Y/n]
```

Default to yes (Enter accepts). Don't block.

---

## Step 2 — Confirm Adopt Plan

After sanity checks pass, summarize what's about to happen. Wait for user confirmation before proceeding.

**If `--minimal` is set, present the minimal version:**

```
/adopt --minimal — discovery skipped

Plan:
  1. Verify framework files (done — Step 1).
  2. Lightweight CLAUDE.md merge:
     - Insert framework's Reference Documents block (the OpenClaw KB family)
     - Insert framework's Custom Commands table
     - Preserve everything else in your CLAUDE.md verbatim
     - Backup original to CLAUDE.md.pre-adopt-backup before any change
  3. Final summary.

Skipped:
  - KB_1 draft (run /adopt without --minimal to populate)
  - Existing-KB audit (run /adopt without --minimal or audit manually)

Proceed? [Y/n]
```

**Otherwise (full mode), present:**

```
/adopt — full discovery flow

Plan:
  1. Sanity checks (done).
  2. Auto-derive runtime shape from workspace/, mcporter.json, in-repo MCP
     servers, and scripts.
  3. Draft KB_1_Architecture.md (skills inventory, MCP integrations, cron,
     deploy target). You approve each draft before it's written.
  4. Audit any existing /docs/KB_*.md files for staleness against the current
     codebase. Per-file triage: keep / update / archive / merge / diff / skip.
  5. Merge your CLAUDE.md with the framework template, section by section.
     Three-pane preview (yours / framework / proposed merge) at each conflict.
  6. Write docs/adopt-audit-YYYY-MM-DD.md as the durable record.

Time estimate: 5–15 minutes depending on how many existing KBs you have.

Proceed? [Y/n]
```

Default to yes (Enter accepts). If the user declines, exit cleanly.

**If declined:** print "OK — no changes made. Re-run /adopt when ready." and stop.

**If `--minimal` is set, after this confirmation jump directly to Step 6 (CLAUDE.md merge — lightweight branch).** Then Step 7. Skip Steps 3, 4, 5.

---

## Step 3 — Auto-Derive Runtime Shape

Goal: produce a draft of the agent's shape (skills, MCP integrations, cron, deploy target) from observable signals, never from inference. Cite the source for every line ("from `workspace/skills/foo/SKILL.md` frontmatter" etc.) so the user can verify.

This step **does not write any file yet** — it produces a draft to use in Step 4 (KB drafts) and Step 6 (CLAUDE.md merge).

### 3a. Read deterministic signal files

Read only these (don't whole-tree scan — token budget):

- `workspace/config/mcporter.json` (if present) — MCP registry; capture each entry under `mcpServers`
- `workspace/skills/*/SKILL.md` (Glob; read frontmatter + first 500 chars of each)
- `workspace/mcp-servers/*/package.json` (Glob; capture name + version + dependencies for each)
- `workspace/scripts/` (Glob; list filenames only; do not read contents)
- Bootstrap files at `workspace/` root — confirm presence of SOUL.md, AGENTS.md, TOOLS.md, SCHEMA.md, MEMORY.md, HEARTBEAT.md, NOTIFICATIONS.md, TASK-QUEUE.md, INDEX.md
- `deploy/deploy.sh`, `deploy/webhook-receiver.js`, `deploy/*.plist.template` (presence only — don't parse)
- `.env.example` (read top-to-bottom for env var names; do NOT parse values)
- `.github/workflows/*.yml` (Glob; if any, list filenames)

**Fallback when `workspace/` doesn't exist or is empty:** mark project as "Greenfield-but-installed" — all auto-derivation is skipped; ask the user to populate workspace/ first via `/kickoff` or manual editing, then re-run `/adopt --minimal` for the CLAUDE.md merge only.

### 3b. Skills inventory

For each `workspace/skills/*/SKILL.md`:
- Confirm folder name matches frontmatter `name` — flag mismatches (this is a silent-failure trap)
- Capture `description`, `user-invokable` value, and `Systems` section (which MCP tools the skill uses)
- Spell-check `user-invokable` (NOT `user-invocable`) — flag typos

### 3c. MCP integrations

From `mcporter.json`:
- Confirm top-level key is `mcpServers` (not `servers`) — flag if wrong
- For each entry: classify as stdio vs HTTP, in-repo (under `workspace/mcp-servers/`) vs external (npm package or other source)
- Grep for `${ENV_VAR}` references; list the env vars

### 3d. Scripts inventory

List the script filenames under `workspace/scripts/`. Don't try to classify them as deterministic vs LLM-driven — that's user input. Just surface the list.

### 3e. Deploy target

Inspect:
- `deploy/deploy.sh` present? → "GitOps deploy with rsync"
- `deploy/webhook-receiver.js` present? → "Webhook receiver (HMAC verify)"
- `deploy/*.plist.template` present? → "macOS launchd template"
- None of the above? → "Deploy story not yet committed (dev-only or manual)"

### 3f. Build the draft block

Assemble a draft like this (concrete example):

```markdown
## Runtime Shape (auto-derived — please confirm)

### Skills (4)
- `skill-name-here` — [description from frontmatter] (user-invokable: true)
- `skill-name-here-2` — [description] (user-invokable: false)
- ...

### MCP integrations (3)
- `server-name` — stdio — in-repo (workspace/mcp-servers/server-name/)
- `external-name` — stdio — npm package (mcporter.json#args[0])
- `http-name` — HTTP — baseUrl: <hostname>

### Required env vars (from mcporter.json `${...}` references)
- ENV_VAR_1 (referenced by server-name)
- ENV_VAR_2 (referenced by external-name)

### Scripts (workspace/scripts/)
- script-name-here.js
- another-script.ts

### Deploy
- GitOps deploy with rsync (deploy/deploy.sh present)
- Webhook receiver (HMAC verify) (deploy/webhook-receiver.js present)
- macOS launchd template (deploy/openclaw.plist.template present)
```

### 3g. Show draft and get approval

Print the draft and ask:

```
Runtime shape draft (auto-derived from workspace/ and deploy/):

<draft block>

Anything wrong, missing, or that you want to add? You can:
  - Confirm as-is: just say "looks good" or hit Enter
  - Edit: paste the corrected version (or describe what to change)
  - Add notes: e.g., "model routing isn't visible in repo because the runtime config lives on the host"
```

Wait for user input. If they correct anything, update the draft. Hold the approved draft in working memory — it's used by Step 4 (KB drafts) and Step 6 (CLAUDE.md merge).

If silent-failure traps were detected (mismatched folder/name, `user-invokable` typo, `servers` instead of `mcpServers`, `${ENV_VAR}` with no `.env.example` documentation), surface them prominently and ask the user if they want to fix them now or note for follow-up. **Don't auto-fix** — surface and ask.

---

## Step 4 — Draft Project-State KBs

> **If `--minimal` is set, skip this entire step.** Jump to Step 6.

Goal: write proposed contents for `KB_1_Architecture.md` based on auto-detection from the repo. **Show the draft to the user before writing.** Never write KB content without explicit approval.

`KB_8_Current_State.md` is left as the framework template (it's session-state; nothing to auto-derive).

`APP_CONCEPT.md` and `SCOPE.md` are **never auto-drafted** by `/adopt`. They require user discovery (problem statement, user types, success criteria, V1 scope). Auto-derivation would produce noise. Mention this at the end of Step 4 and offer to run a kickoff-style mini-session for them.

### 4a. KB_1_Architecture draft

Read existing `docs/KB_1_Architecture.md` to detect whether it's the empty framework template or the user has populated it. If populated (more than the boilerplate `[TODO]` markers), surface:

```
docs/KB_1_Architecture.md already has content. Options:
  [d]raft a new version anyway (you'll see both in side-by-side)
  [s]kip — keep your existing KB_1 untouched
  [a]ppend auto-derived content as a new section at the bottom

Choice [s]:
```

Default skip. If [d]raft, build the draft below and show side-by-side. If [a]ppend, add the auto-derived block as a new `## Auto-Derived Findings (added by /adopt)` section.

If `KB_1_Architecture.md` is the framework template (mostly `[TODO]` markers), proceed straight to drafting.

**Draft structure** (populated from Step 3's approved draft):

```markdown
# KB 1 — Architecture

## Overview
[TODO — confirm during /adopt]

## Tech Stack
- Runtime: OpenClaw gateway (CLI: `openclaw`)
- Agent format: markdown skills + bootstrap files
- Tools: MCP via mcporter
- LLM: Anthropic Claude — primary [TODO confirm], fallback [TODO confirm]

## Skills
[Auto-derived from workspace/skills/. List each with description from frontmatter.]
- `skill-name-here` — description (user-invokable: true)
- ...

## MCP Integrations
[Auto-derived from workspace/config/mcporter.json. Classify each.]
- `server-name` — stdio — in-repo
- ...

## Cron / Proactive Behavior
[Scripts found at workspace/scripts/ — confirm which are cron-driven and what schedule]
- `script-name.js` — [TODO confirm schedule + purpose]
- ...

## Notification Routing
[TODO — confirm during /adopt; populate from workspace/NOTIFICATIONS.md if present]

## Deploy & Infrastructure
- Deploy: [GitOps webhook+rsync | manual | dev-only]
- Required env vars (set in launchd plist EnvironmentVariables, NOT .env):
  - [list from Step 3c]

## Architecture Decisions
[TODO — leave empty unless user surfaces decisions during /adopt]

## Open Questions
[TODO]
```

Show the draft and ask:

```
KB_1_Architecture.md draft above. Action:
  [a]ccept — write this draft to docs/KB_1_Architecture.md
  [e]dit — paste corrections or describe what to change
  [s]kip — leave docs/KB_1_Architecture.md untouched (uses framework template)

Choice [a]:
```

If [a], write the file. If [e], iterate until user accepts. If [s], note for the audit log and move on.

### 4b. APP_CONCEPT.md and SCOPE.md offer

After KB_1 is written (or skipped), surface:

```
docs/APP_CONCEPT.md and docs/SCOPE.md require discovery (problem statement,
users, success criteria, V1 scope). I can't auto-derive these — they need
your input.

Options:
  [k]ickoff — run a kickoff-style mini-session now (~10 min) to populate them
  [l]eave — leave the framework templates with [TODO] markers; fill in later
  [s]kip — same as leave

Choice [l]:
```

Default leave. If [k], guide the user through Phase 1 (problem) and Phase 3 (scope) of `/kickoff` inline — don't run the actual `/kickoff` command, just walk the questions in this command and write the same `docs/APP_CONCEPT.md` and `docs/SCOPE.md` structures kickoff produces. (Reference the kickoff file structure at `kickoff.md` Step 2 if needed.) If [l] or [s], move on.

---

## Step 5 — Audit Existing User KBs

> **If `--minimal` is set, skip this entire step.** Jump to Step 6.

Goal: surface every `docs/KB_*.md` (and any user-authored docs in `/docs/`) that's not framework-managed, then check whether the symbols/files/skills/tools it references still exist in the current codebase. Bucket each file by staleness, then ask the user per-file what to do.

### 5a. Discover candidate user KBs

Glob `docs/KB_*.md`. Filter out framework-managed files:

```
Framework-managed (per .framework-manifest.json):
  - docs/KB_1_Architecture.md      (hybrid — adopter content goes here)
  - docs/KB_8_Current_State.md     (hybrid)
  - docs/KB_INDEX.md               (framework-managed)
```

Everything else matching `docs/KB_*.md` is a "user KB candidate."

**Also broaden to `docs/*.md`** that's not in `.framework-manifest.json` categories (skip `docs/OpenClaw KBs/` directory — those are framework-managed). Skip `APP_CONCEPT.md`, `SCOPE.md`, `CHANGELOG.md`, `LESSONS.md`, `MULTI_AGENT_WORKFLOW.md`, `smoke-tests-pending.md`. Anything else under `docs/` (root level) is a candidate.

If there are docs in `docs/<other-folder>/` that are NOT in the manifest's framework-managed folders, surface them in a separate "Found these docs/ subfolders I didn't audit — want me to look at any?" prompt at the end (5e).

Show the discovered list:

```
Found N candidate user KBs to audit:
  - docs/KB_2_OldSkills.md
  - docs/KB_3_MCPIntegrations.md
  - docs/KB_4_DeployRunbook.md
  - ...

Audit all? [Y/n] (Or pick a subset by number — e.g., "1,3,5".)
```

Default yes. If user picks subset, narrow the list. If empty list (no candidates found), skip to Step 6 with note: "No user-authored KBs detected — nothing to audit."

### 5b. Reference extraction (per file)

For each user KB, extract every "checkable claim" — symbols and references that can be verified against the codebase:

- **Skill names** — `workspace/skills/<name>/` references; bare snake-or-hyphen names in headings/lists if section heading mentions "skill"
- **MCP server ids** — references to mcporter.json server names
- **MCP tool ids** — snake_case identifiers if section heading mentions "tool"
- **File paths** — match regex `(workspace|deploy|_dev|docs)/[\w/.\-]+\.(md|json|js|ts|sh|toml)`
- **Script names** — `workspace/scripts/[\w-]+\.(js|ts|sh)` references
- **Env var names** — `[A-Z_][A-Z0-9_]*` if section heading mentions "env" or appears in code-fenced shell blocks
- **OpenClaw CLI commands** — `openclaw [\w -]+` patterns
- **Bootstrap file references** — `(SOUL|AGENTS|TOOLS|SCHEMA|MEMORY|HEARTBEAT|NOTIFICATIONS|TASK-QUEUE|INDEX)\.md`

Capture file:line for each claim so the audit can cite the original.

### 5c. Cross-reference scan via Explore subagent

For each user KB with extracted claims, **spawn a Task with `subagent_type: Explore`** to do the cross-reference scan.

**Subagent prompt template:**

```
# Codebase Stale-Reference Audit

Audit document: docs/KB_X_OldKB.md

## Task

For each "checkable claim" extracted (passed in the prompt as a list),
verify whether it still exists in the codebase as described.

Claims to verify:
- Skill name: triage-mail (referenced in KB_X line 47)
- MCP server: gmail-mcp (referenced in KB_X line 89)
- File path: workspace/scripts/nightly-summary.js (referenced in KB_X line 124)
- Env var: GMAIL_OAUTH_TOKEN (referenced in KB_X line 156)
- Bootstrap file: TASK-QUEUE.md (referenced in KB_X line 201)
- ...

## Verification protocol

For each claim:

1. **Skill name:** test if `workspace/skills/<name>/SKILL.md` exists. If
   not, search for similarly-named skills via Glob and report best match.

2. **MCP server id:** Read `workspace/config/mcporter.json` and confirm
   the entry exists under `mcpServers`. If absent, mark MISSING.

3. **File path:** test existence. If not present, search via Glob for
   similarly-named files and report best match.

4. **Env var:** Grep `mcporter.json` for `${ENV_VAR}` and `.env.example`
   for `ENV_VAR=`. Confirm both. Report any reference that's used in
   mcporter.json but not in .env.example as MISSING_DOC.

5. **Bootstrap file:** Confirm the file exists at workspace/<NAME>.md.

## Output (markdown table per file)

| Claim | Status | Evidence |
|---|---|---|
| triage-mail skill | MOVED | Found at workspace/skills/triage/SKILL.md |
| gmail-mcp server | MISSING | Not in mcporter.json |
| nightly-summary.js | CURRENT | Found at workspace/scripts/nightly-summary.js |
| GMAIL_OAUTH_TOKEN | CURRENT | In mcporter.json + .env.example |
| TASK-QUEUE.md | CURRENT | Present at workspace/TASK-QUEUE.md |

Read-only. Don't modify files. Return only the table.
```

The Explore subagent runs read-only and returns the markdown table. Integrate the result.

**If a KB has zero checkable claims** (pure prose, no code references), don't dispatch the subagent — just mark the KB's bucket as "Orphaned (no verifiable references)" directly.

### 5d. Bucket each KB

Tally per file:

```
total_claims = number of extracted checkable claims
stale_count  = MISSING + MOVED count
stale_pct    = stale_count / total_claims  (if total > 0)
```

**Bucketing thresholds:**

| Stale percentage | Bucket | Default action |
|---|---|---|
| `stale_pct == 0` | Current | keep |
| `0 < stale_pct <= 30%` | Partially Stale | update |
| `30% < stale_pct <= 70%` | Mostly Stale | update |
| `stale_pct > 70%` OR `total_claims == 0` | Orphaned | archive |

**"Too few claims" caveat:** if `total_claims < 3`, treat as Current with a low-confidence note: "[FILE] has only N checkable claims; treating as Current with low confidence."

### 5e. Per-file triage UX (summary table first, then per-file decisions)

Print the summary table first — give the user the whole picture before any decisions:

```
## Existing KB Audit — N files reviewed

| # | File | Bucket | Stale | Total | Default action |
|---|---|---|---|---|---|
| 1 | KB_2_OldSkills.md   | Orphaned        | 12/12 | 12 | archive |
| 2 | KB_3_MCPIntegrations.md | Mostly Stale | 8/11  | 11 | update  |
| 3 | KB_4_DeployRunbook.md   | Partially Stale | 2/15  | 15 | update  |
```

Then prompt per-file in sequence. For each file, print stale references inline before asking for the action:

```
─── KB_3_MCPIntegrations.md (Mostly Stale, 8/11 stale) ───

Stale references:
  Line 47:  gmail-mcp server                  → MISSING (not in mcporter.json)
  Line 89:  GMAIL_OAUTH_TOKEN env var        → MISSING_DOC (referenced in mcporter.json but not in .env.example)
  Line 124: ${OLD_API_KEY} substitution      → MISSING (no plist entry documented)
  ...

Current references (still valid):
  Line 12: TASK-QUEUE.md → CURRENT
  Line 78: openclaw cron list → CURRENT

Action: [k]eep / [u]pdate / [a]rchive / [m]erge / [d]iff / [s]kip [u]:
```

The default in brackets is bucket-driven. Just hitting Enter accepts the default.

**Action mappings:**

- **keep (k)** — no-op. Note in the audit log.
- **update (u)** — emit a TODO list at the top of the file pointing at stale lines. Format:

  ```markdown
  > **/adopt staleness report — YYYY-MM-DD**
  > This KB has stale references against the current codebase. Review and
  > update or archive sections referencing these:
  > - Line 47: gmail-mcp server → MISSING
  > - Line 89: GMAIL_OAUTH_TOKEN → MISSING_DOC
  > - ...
  > Re-run /adopt on a future framework version to re-audit.

  [original KB content begins here]
  ```

  Insert this block above the existing first line of the file. Don't modify the rest.

  Alternative: write the staleness report to a sibling file `docs/KB_X.staleness-report.md` and leave the original untouched.

- **archive (a)** — move file to `docs/archive/<original-filename>` (create the directory if needed). Prepend an "Archived during /adopt on YYYY-MM-DD" header with the staleness report.

- **merge (m)** — propose a target framework KB (KB_1 typically). Show side-by-side draft. **Only enable for files bucketed Current or Partially Stale.**

- **diff (d)** — print the staleness table again with surrounding context lines. Then re-prompt.

- **skip (s)** — defer the decision. Note in the audit log with status "deferred."

After each file, move to the next. Stop when all are processed.

### 5f. Surface untouched docs

If 5a found docs in `docs/<other-folder>/` that aren't framework-managed and weren't in the audit candidate list, surface them:

```
Found additional docs/ files I didn't audit:
  - docs/legacy/old-runbook.md
  - docs/internal/onboarding.md

Want me to audit any? [list numbers, or "n" to skip]
```

If user opts in, run 5b–5e on those files.

### 5g. Audit log

Write `docs/adopt-audit-YYYY-MM-DD.md` summarizing all decisions. Use today's actual date. Format:

```markdown
# /adopt audit — YYYY-MM-DD

Generated by `/adopt` on YYYY-MM-DD.

## Summary

- Project: <repo basename>
- Framework version: <read from .framework-version>
- KBs reviewed: N
- KBs kept: N | updated: N | archived: N | merged: N | skipped: N

## Runtime shape auto-derived

<paste of approved Step 3 draft>

## Silent-failure traps detected

<list any folder/name mismatches, user-invokable typos, mcpServers/servers wrong key, env-var-without-doc>

## KB triage decisions

| File | Bucket | Stale ratio | Action | Result |
|---|---|---|---|---|
| KB_2_OldSkills.md   | Orphaned        | 12/12 | archive | Moved to docs/archive/KB_2_OldSkills.md |
| ...

## Project-state KB drafts written

- docs/KB_1_Architecture.md — written / skipped (kept existing) / appended

## CLAUDE.md merge

- Backup at: CLAUDE.md.pre-adopt-backup
- Mode: section-by-section (or wrap fallback if applicable)
- Sections refreshed from framework: Reference Documents, Custom Commands, KB Maintenance, DO NOT
- Sections preserved verbatim: Overview, Tech Stack, Build Commands, Roles, Core Entities, Current Phase, Patterns, Preferences

## Notes

<any warnings, deferred decisions, or follow-up items>
```

Write this file at the end of Step 5. It also serves as the re-invocation marker (Step 1a).

---

## Step 6 — Merge CLAUDE.md

Goal: reconcile the user's existing `CLAUDE.md` with the framework template, section by section. Always backup first. Always show drafts before writing. Project content wins on conflicts.

### 6a. Backup

Before any merge work:

1. Read existing `CLAUDE.md` from the project root.
2. Read `CLAUDE.md.framework` (the sibling file the installer wrote — this is the framework template). If `CLAUDE.md.framework` doesn't exist, surface:

   ```
   CLAUDE.md.framework not found. The installer should have written this
   sibling file. Re-run `npx @insynq/agent-blueprint init` to repair, or
   skip this step ([s]) and merge manually later.

   Choice: [r]e-install / [s]kip Step 6 / [a]bort:
   ```

   Default `r`. If skip, jump to Step 7 with note in the audit log.

3. Copy `CLAUDE.md` → `CLAUDE.md.pre-adopt-backup`. Confirm to user:

   ```
   Backed up your CLAUDE.md to CLAUDE.md.pre-adopt-backup. Original is safe.
   ```

### 6b. Detect heading overlap (decide normal merge vs. wrap fallback)

Parse both `CLAUDE.md` and `CLAUDE.md.framework` for `## H2` headings.

Framework's expected H2 set:

```
## Environment
## Overview
## Tech Stack
## Build Commands
## Roles
## Core Entities
## Reference Documents
## Current Phase
## Patterns
## Preferences
## Custom Commands
## KB Maintenance
## DO NOT
```

Count overlap with the user's H2 headings. If `user_heading_overlap < 3`, fall back to **wrap mode** (6e). Otherwise, do **section-by-section merge** (6c).

### 6c. Section-by-section merge (default path)

**If `--minimal` is set, only process the framework-owned sections (Reference Documents, Custom Commands, KB Maintenance, DO NOT). Skip the project-owned section walk.**

For each H2 section in the framework template, in framework order:

#### Framework-owned sections (always refresh from template):

These contain framework infrastructure that updates with each framework version. Always insert/refresh from the framework version:

- `## Reference Documents`
- `## Custom Commands`
- `## KB Maintenance`
- `## DO NOT` — the template ships pre-filled with canonical OpenClaw silent-failure traps. Refresh unless the user has added project-specific DO NOTs on top.

For these, the rule is: **take the framework version verbatim** (no three-pane preview needed unless the user has substantive content under that heading that would be lost — in which case show a three-pane).

Detection: if the user's section content is non-empty AND not already a subset of the framework version, show a three-pane preview (6d). Otherwise just refresh silently and add to the "Sections preserved unchanged from framework: …" summary.

**For DO NOT specifically:** if the user has additional entries beyond the framework's canonical traps, MERGE — keep both. Surface this in the three-pane.

#### Project-owned sections (preserve user content; insert from framework only if user lacks the section):

- `## Overview`
- `## Tech Stack` — **cross-check vs. Step 3 derivation; warn if mismatch**
- `## Build Commands` — same cross-check
- `## Roles`
- `## Core Entities`
- `## Current Phase`
- `## Patterns`
- `## Preferences`

For these, the rule is:

- User has matching H2 with content → **preserve verbatim**, but cross-check Tech Stack against Step 3's auto-derived runtime shape. If they disagree (e.g., user wrote "Sonnet 4.5 primary" but no model is in mcporter or runtime config evidence and the framework recommends Sonnet 4.6), surface a warning and ask:

  ```
  ## Tech Stack mismatch:
    Your CLAUDE.md says:        - Models: Sonnet 4.5 primary
    Auto-derived (no evidence in repo): - Models: not visible (runtime-host config)

  Action: [k]eep yours / [u]pdate to framework default / [m]erge (paste edited version)
  ```

- User has matching H2 but it's empty / `[TODO]` only → insert framework version (with auto-derived content from Step 3 if applicable).

- User has no matching H2 → insert framework section with `[TODO]` markers (or auto-derived content if Step 3 produced one).

#### Cross-referenced section (`## Environment`):

Handled by `/preflight`, not `/adopt`. If missing, prompt:

```
Your CLAUDE.md doesn't have a populated ## Environment section. That's
written by /preflight. Recommended: run /preflight in a separate session
after /adopt completes.

For now, I'll insert a [TODO] placeholder block. /preflight will overwrite it.
```

Insert the placeholder:

```markdown
## Environment
[TODO — run /preflight to populate this. Captures which AI agent, OS, and shell are being used.]
```

#### Project-specific sections in user's CLAUDE.md NOT in framework template:

Preserve verbatim. Append to the bottom of the new CLAUDE.md under:

```markdown
## Project-Specific Sections (preserved during /adopt)

[Verbatim copy of user's H2 sections that aren't in the framework template.]
```

Don't try to merge them into framework sections — they're project content.

### 6d. Three-pane preview (per section that needs reconciliation)

For each section where there's an actual conflict:

```
─── Section: ## Reference Documents ───

YOUR VERSION (CLAUDE.md.pre-adopt-backup):
[paste of user's section content]

FRAMEWORK VERSION (CLAUDE.md.framework):
[paste of framework's section content]

PROPOSED MERGE:
[reconciled version]

Action: [a]ccept / [e]dit / [k]eep mine / [f]orce framework / [s]kip section
```

- **accept (a)** — write the proposed merge for this section.
- **edit (e)** — let the user paste a corrected version, then accept that.
- **keep mine (k)** — preserve the user's version verbatim. Note in the audit log; warn if it's a framework-owned section.
- **force framework (f)** — overwrite with the framework version. Warn if it's a project-owned section.
- **skip section (s)** — leave the user's version verbatim with no merge. Note in audit log.

### 6e. Wrap mode (fallback when user CLAUDE.md is wildly different)

Triggered when user CLAUDE.md has < 3 framework H2 headings. Behavior:

1. Write the framework template fresh as the new `CLAUDE.md`.
2. Append the user's entire original CLAUDE.md content under a new section:

   ```markdown
   ---

   ## Project-Specific Notes (preserved from previous CLAUDE.md)

   The previous CLAUDE.md didn't follow the framework structure, so its content
   has been preserved verbatim below. You can manually re-integrate sections
   into the framework structure above as needed.

   ---

   [verbatim original CLAUDE.md content]
   ```

3. Surface to user:

   ```
   Your CLAUDE.md doesn't follow the framework structure (only N of the 13
   framework H2 headings overlap). I've used "wrap mode": the framework
   template is now the top of your CLAUDE.md, and your original content is
   preserved verbatim at the bottom under "## Project-Specific Notes".

   Original backup at CLAUDE.md.pre-adopt-backup.

   You can re-integrate sections later by copy-pasting from the bottom into
   the matching framework sections (Overview, Tech Stack, etc.).
   ```

### 6f. Lightweight merge (`--minimal` mode)

If `--minimal` is set, the merge is minimal:

1. Backup as 6a.
2. Read user's CLAUDE.md and framework template.
3. Insert/refresh ONLY these sections:
   - `## Reference Documents` — refresh from framework (overwrite user's if exists).
   - `## Custom Commands` — refresh from framework.
   - `## DO NOT` — merge framework's canonical OpenClaw traps with any user-authored DO NOTs.
4. Preserve everything else verbatim.
5. Skip three-pane preview unless there's a substantive user-authored block under those sections that would be lost — in which case show a single three-pane and ask.

The result: framework's structural anchors are present so other slash commands work, but no aggressive reconciliation happens.

### 6g. Write merged CLAUDE.md and clean up

After all sections are decided:

1. Assemble the final merged `CLAUDE.md` content.
2. Show the user a final preview:

   ```
   Final CLAUDE.md preview (N lines, K sections):

   <truncated preview — first 50 lines + section headings>

   Write? [Y/n] (or [d]iff against backup)
   ```

3. On confirmation, write `CLAUDE.md`.
4. **Delete `CLAUDE.md.framework`** (the installer's sibling file). It served its purpose; leaving it lingers as confusing artifact. Note in audit log: "Cleaned up CLAUDE.md.framework after merge."
5. Confirm:

   ```
   Wrote CLAUDE.md (N lines).
   Backup at CLAUDE.md.pre-adopt-backup (your original).
   Removed CLAUDE.md.framework (no longer needed).
   ```

---

## Step 7 — Final Summary & Handoff

Print a single summary that names the artifacts created and the recommended next steps.

**If full mode:**

```
/adopt complete.

Files written:
  - CLAUDE.md (merged — backup at CLAUDE.md.pre-adopt-backup)
  - docs/KB_1_Architecture.md (auto-derived draft, approved)
  - docs/adopt-audit-YYYY-MM-DD.md (durable record of all decisions)

KB triage:
  - N kept | N updated | N archived | N merged | N skipped

Silent-failure traps surfaced:
  - <list, or "none">

Cleanup:
  - Removed CLAUDE.md.framework (no longer needed; installer's sibling file)

Recommended next steps:
  1. Review CLAUDE.md and KB_1_Architecture — correct anything that
     doesn't feel right.
  2. If silent-failure traps were surfaced, fix them now (folder/name
     mismatches, user-invokable typos, mcpServers/servers wrong key).
  3. If you skipped APP_CONCEPT.md / SCOPE.md, fill them in when ready
     (kickoff-style discovery, ~10 minutes each).
  4. Run /preflight in a fresh session if you haven't already (writes the
     ## Environment block to CLAUDE.md).
  5. /brainstorm or /plan when you're ready to start your next feature.

Re-running /adopt:
  V1 doesn't support re-running /adopt on an already-adopted project. If
  the framework releases a new version with structural changes, /update-framework
  (separate command) handles that.
```

**If `--minimal` mode:**

```
/adopt --minimal complete.

Verified:
  ✓ .framework-version present (v<version>)
  ✓ .claude/commands/ has N framework commands
  ✓ docs/OpenClaw KBs/ has the OC_KB collection

Updated:
  ✓ CLAUDE.md — inserted Reference Documents + Custom Commands + DO NOT sections
                (your other content preserved; backup at CLAUDE.md.pre-adopt-backup)

Skipped (--minimal):
  - KB_1 draft (run /adopt without --minimal to populate)
  - Existing-KB audit (run /adopt without --minimal or audit manually)

Cleanup:
  - Removed CLAUDE.md.framework (no longer needed)

Run /preflight if you haven't already (Environment block missing in CLAUDE.md).
```

Then stop. Don't proceed into `/kickoff` or any other command — those are separate user-initiated commands.

---

## Boundaries with the Installer

For reference (don't act on this — it's documentation of the contract):

| Action | Owner |
|---|---|
| Write framework files (`.claude/commands/*`, `docs/OpenClaw KBs/*`) | Installer |
| Write `.framework-version` | Installer |
| Write `CLAUDE.md.framework` (sibling) when user has CLAUDE.md | Installer |
| Detect user-global command shadows (pre-flight) | Installer |
| Write `CLAUDE.md` (the merged version) | `/adopt` |
| Backup `CLAUDE.md` → `CLAUDE.md.pre-adopt-backup` | `/adopt` |
| Re-detect global command shadows (warn-only) | `/adopt` |
| Populate KB_1 with project content | `/adopt` |
| Audit existing user KBs | `/adopt` |
| Verify framework files present (sanity check) | `/adopt` |
| Delete `CLAUDE.md.framework` after merge | `/adopt` |

`.framework-version` is the shared "framework installed?" signal:
- Installer refuses to install if it already exists.
- `/adopt` requires it before running (Step 1b).

`CLAUDE.md.framework` is the boundary handoff:
- Installer writes it as a sibling when user already has `CLAUDE.md`.
- `/adopt` reads it during Step 6 merge, then deletes it after successful merge (Step 6g).

No write collisions.

---

## V1 Limitations (Document for User Awareness)

- **Multi-agent monorepo support:** not in V1. Detected and refused early (Step 1c).
- **Re-adopt:** not in V1. Detected and refused early (Step 1a). Use `/update-framework` for framework version bumps.
- **Runtime-host config visibility:** Step 3 reads what's in the repo only. Things that live solely on the runtime host (`~/.openclaw/openclaw.json`, launchd plist `EnvironmentVariables`) aren't auto-derivable — surface as `[TODO]` and ask the user to fill in.
- **Skill content not parsed:** Step 3b reads SKILL.md frontmatter and the first 500 chars only. Doesn't audit Workflows or Important Rules sections — that's `/audit-skills` (future).
