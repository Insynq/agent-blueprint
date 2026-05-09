---
description: Diagnose and fix a bug using root-cause investigation before any code changes
arguments:
  - name: issue
    description: Description of the bug or unexpected behavior
    required: true
---

# Debug

**Diagnose before you code. Treat symptoms as clues, not specs.**

The most expensive debugging mistakes come from implementing hypotheses before testing them. This command enforces a deliberate sequence: characterize → investigate → diagnose → test → fix.

## Action Required

Spawn a Task with `subagent_type: general-purpose` using the prompt below.

---

## Subagent Prompt

```
# Debug Agent

Issue: **$ARGUMENTS.issue**

## Your Role

You are a systematic debugger. Your job is to find the root cause of the reported issue and fix it with the minimal, most targeted change possible.

**Core rule: Run one diagnostic before writing any code. A symptom is a clue, not a spec — never implement a hypothesis until a test confirms it.**

## Step 0: Read Project Context

Read `CLAUDE.md` and `docs/LESSONS.md` (if it exists). Extract:
- Agent shape and runtime (typically OpenClaw gateway + bootstrap files + on-demand skills + MCP via mcporter)
- Established patterns for the area being debugged
- Any known gotchas in LESSONS.md that match the symptom category — particularly the canonical silent-failure traps:
  - `mcporter.json` top-level key is `mcpServers`, not `servers`
  - Skill folder name MUST equal frontmatter `name`
  - Skill frontmatter spelling: `user-invokable` not `user-invocable`
  - `${ENV_VAR}` substitution reads `process.env`, not `.env` files
  - Bootstrap files have a per-file character cap; long-running content silently truncates
  - Prompt cache config goes under PLURAL `models`, not singular `model`

## Step 1: Characterize the Symptom

Before investigating code, answer these questions precisely:

1. What is the **exact behavior**? (Not what you think is wrong — the literal, observable symptom)
2. When does it happen? (Always / sometimes / after specific action / only in specific context / only on the runtime host / only locally)
3. What **layer** is the symptom in?
   - **Skill routing** — the wrong skill activates, or no skill activates when it should
   - **Bootstrap loading** — gateway starts but agent context is missing or truncated
   - **MCP / tool** — a tool the agent expects is unavailable, errors, or returns wrong data
   - **Model / prompt** — wrong model used, cache miss, output unexpectedly long/short
   - **Cron / script** — a scheduled job didn't fire, or a deterministic script errored
   - **Deploy / runtime** — webhook didn't fire, rsync excluded a file, plist env var missing on the runtime host

Write out the answers before proceeding. This shapes every step that follows.

## Step 2: Spawn an Investigation

Spawn an `Explore` agent (thoroughness: "very thorough") with this prompt (spawn via the Agent tool with `subagent_type: "Explore"` and `thoroughness: "very thorough"`):

```
# Debug Investigation

Symptom: [exact symptom from Step 1]
Layer: [layer identified]

Investigate:
1. Identify every file involved in the code path for this symptom (skill files, MCP server source, scripts, bootstrap files, mcporter.json, deploy script)
2. Trace the full flow end-to-end (user request → router → skill → MCP tool → external system → result)
3. Look specifically for:
   - Wrong skill activated (router scanning skill descriptions and matching the wrong one)
   - Skill folder name mismatched with frontmatter `name` (skill silently invisible to router)
   - MCP server registered under `servers` instead of `mcpServers` (silently absent)
   - `${ENV_VAR}` reference with no corresponding entry in the runtime host's plist
   - Bootstrap file exceeded character cap (content silently truncated)
   - Cache config under singular `model` instead of plural `models` (silently disabled)
4. Search for ALL places that could produce this symptom — not just the obvious one
5. Report exact file paths and line numbers for everything relevant
```

## Step 3: Apply Layer-Specific Diagnosis

Based on the investigation, diagnose using the playbook for the relevant layer.

---

### Skill Routing Layer (wrong skill or no skill activates)

**Skill discovery is description-scan-driven. Router reads frontmatter + first lines of every SKILL.md.**

Check in order:
1. Does `workspace/skills/<name>/SKILL.md` exist? Is the **folder name exactly equal** to the frontmatter `name`? (Mismatch → skill is invisible to router.)
2. Read the skill's frontmatter `description` — is it specific enough that the router can match the user's phrasing? Generic descriptions ("does stuff") match nothing.
3. Read the `Triggers` section — does it actually list phrases that match the user's invocation?
4. Is `user-invokable` spelled correctly? (Common typo: `user-invocable`. Silent failure — skill won't be user-callable.)
5. Are there OTHER skills with overlapping descriptions? Router may be picking the alphabetically-first match.

---

### Bootstrap Loading Layer (gateway starts but context is missing)

**Bootstrap files load with a per-file character cap (default ~20K, configurable as `bootstrapMaxChars` in `~/.openclaw/openclaw.json`).**

Check in order:
1. Are all expected bootstrap files present at `workspace/`? (SOUL.md, AGENTS.md, TOOLS.md, SCHEMA.md, MEMORY.md, HEARTBEAT.md, NOTIFICATIONS.md, TASK-QUEUE.md, INDEX.md)
2. Run `wc -c workspace/*.md` — does any file exceed the configured cap? (Likely culprit if context "feels" cut off.)
3. Are they being read from the right path? On the runtime host this is `~/.openclaw/workspace/`, not the repo path.
4. Did the most recent deploy actually reach the runtime host? Check deploy log under `~/Library/Logs/`.

---

### MCP / Tool Layer (tool unavailable, errors, or returns wrong data)

**Tools live in `workspace/config/mcporter.json`. Top-level key MUST be `mcpServers` — `servers` parses without error and silently fails.**

Check in order:
1. Read `workspace/config/mcporter.json`. Confirm top-level key is `mcpServers`.
2. Is the server entry present and `enabled` (or unset, which defaults to enabled)?
3. Grep the entry for `${ENV_VAR}` references. For each, confirm it's set in the runtime host's launchd plist `EnvironmentVariables` dict — NOT in `.env`. (`.env` is for local-dev only.)
4. For stdio servers: does `command` resolve on the runtime host's PATH? (Try `command -v <name>` on the runtime host.)
5. For HTTP servers: is the gateway reachable from the runtime? Network firewall, DNS, TLS issues.
6. If the tool returns wrong data: is the MCP server's input zod schema validating what you pass? Add a log at the tool entry point.

---

### Model / Prompt Layer (wrong model used, unexpected output)

Check in order:
1. Read the routing config — is `agents.defaults.model.primary` set correctly? (Singular `model` for routing — easy to confuse with plural `models` for cache config.)
2. For cache misses: is cache config under `agents.defaults.models["<id>"].params.cacheRetention`? (PLURAL `models`. Singular `model` parses without error and silently disables caching.)
3. For "long" cacheRetention: is the framework injecting the `extended-cache-ttl-2025-04-11` beta header? (Required for 1-hour cache.)
4. For unexpectedly-long output: is the agent's system prompt + bootstrap + skill exceeding the model's context window? Run a token-count on assembled prompt.
5. For per-cron cost spikes: is each cron using its own API key? (Per-key cost attribution in Anthropic Console is the practical mechanism.)

---

### Cron / Script Layer (scheduled job didn't fire)

**Cron is configured imperatively via `openclaw cron list/edit/create/delete` on the runtime host. In-repo cron docs can drift from runtime state.**

Check in order:
1. On the runtime host, run `openclaw cron list` — is the cron actually registered? (Source of truth.)
2. Read the script under `workspace/scripts/<name>.{js,ts,sh}`. Run it manually with `--dry-run` or equivalent. Does it error?
3. For deterministic scripts: does it emit JSON to stdout and tagged messages (`[script-name] msg`) to stderr? Mixed-format output breaks downstream parsing.
4. Check the gateway log via launchd `StandardOutPath` / `StandardErrorPath` for the time the cron should have fired.
5. Is the API key bound to this cron set in the plist? (Per-cron keys are how cost attribution works.)

---

### Deploy / Runtime Layer (webhook didn't fire, file missing on runtime)

Check in order:
1. Was a `git push` actually pushed to the canonical branch?
2. Did GitHub deliver the webhook? Check the repo's webhook delivery log.
3. Did the webhook receiver process it? Check `~/Library/Logs/<receiver>.log`.
4. Did `deploy.sh` succeed? Check the deploy log.
5. **Most common silent failure:** the file is in a path excluded from `rsync --delete`. Check the rsync excludes in `deploy.sh`. Adding a new runtime-mutable path (TASK-QUEUE.md, deliverables/, private/, etc.) without updating excludes wipes it on next deploy.
6. Is the launchd plist still loaded? `launchctl list | grep openclaw`. Is the `EnvironmentVariables` dict current?

---

## Step 4: Form One Hypothesis

Based on the investigation and layer diagnosis, form **exactly one** hypothesis:

> "The root cause is [X] because [specific evidence from investigation — file path, line number, observation]. The fix is [Y]."

If the investigation points to multiple candidates, pick the most likely one and note the others.

Then run the diagnostic test specified in Step 5 below.

## Step 5: Run a Diagnostic Test

Before writing any fix, identify the single smallest test that would confirm or disprove the hypothesis without code changes:

- A `console.log` at a specific MCP tool entry point
- A direct read of the gateway log around the time the symptom occurred
- A re-run of the agent with `--session isolated` to repro in clean context
- A direct invocation of the deterministic script with sample input
- A grep for the suspect mcporter.json key
- A `wc -c` on a suspect bootstrap file

Run the test now. Then:

**STOP HERE.** Report to the user:
1. The hypothesis (one sentence)
2. The diagnostic test result (what you ran, what it showed)

Do not write any code until the user confirms the hypothesis is correct.

---

*After user confirms the hypothesis is correct:*

---

## Step 6: Implement the Fix

Write the minimal, targeted fix:
- Read the full file before editing
- Make only the change that addresses the root cause
- Don't refactor surrounding code
- Don't add error handling for unrelated scenarios
- Don't add features the plan didn't include

If the fix touches `mcporter.json`, plan to restart the gateway after applying (`openclaw gateway restart`).

If the fix touches a SKILL.md, double-check folder name = frontmatter `name` and `user-invokable` spelling.

## Step 7: Verify

Run any project-level checks listed in `CLAUDE.md` (e.g., `openclaw doctor --repair`, MCP server build for in-repo packages).

Confirm:
- The exact symptom is gone — describe how to verify it manually (typically: re-run the user prompt that surfaced the bug, or wait for the next cron firing)
- No obvious regressions in adjacent skills, MCP tools, or scripts

## Step 8: Report

```markdown
## Debug Report

**Symptom:** [original issue as reported]
**Layer:** [skill routing / bootstrap / MCP / model / cron / deploy]
**Root Cause:** [one sentence — what was actually wrong]
**Fix:** [what changed and why it resolves the root cause]
**How to verify:** [exact manual check to confirm it's fixed]
**Files changed:** [list]
**Runtime impact:** [requires gateway restart? requires rsync excludes update? requires plist reload?]

**Why it wasn't obvious:** [what made this hard to find — useful for LESSONS.md]
**Worth adding to LESSONS.md?** [yes/no — if yes, describe the pattern]
```

If the root cause reveals a pattern worth adding to `docs/LESSONS.md`, note it explicitly and propose the entry text.
```

---

## After Subagent Returns

- **Hypothesis confirmed + fix implemented** → run `/gen-test` to add a regression test if applicable, then `/ship`
- **Hypothesis was wrong** → re-read the investigation, re-characterize the symptom, re-spawn debug agent with the corrected hypothesis
- **LESSONS.md addition suggested** → add the entry before shipping so future sessions inherit the lesson
- **Fix is large/multi-file** → stop here, write a spec doc, run `/plan-review` + `/implement` instead
