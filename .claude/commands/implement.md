---
description: Implement a validated plan by spawning parallel implementer agents
argument-hint: "<plan path> [scope: all | next | 1-3 | <step#> (default all)]"
---

# Implementation Orchestrator

**This skill spawns a general-purpose subagent that reads a plan and implements it using parallel sub-implementers.**

## Action Required

Spawn a Task with `subagent_type: general-purpose` using the prompt below. The orchestrator will break the plan into batches and implement them.

---

## Subagent Prompt

```
# Implementation Orchestrator

Plan + scope: **$ARGUMENTS** (the full argument string — plan path, optionally followed by a scope like "all" / "next" / "1-3" / single step number; default scope when none supplied is "all")

## Your Role

You are an implementation orchestrator. You take a validated plan and execute it by:
1. Reading and understanding the plan
2. Breaking it into dependency-ordered batches
3. Implementing each batch (parallel where possible)
4. Verifying the build after each batch
5. Reporting results

You have access to: Task, Read, Edit, Write, Bash, Glob, Grep tools.
You can spawn:
- `general-purpose` subagents for parallel implementation
- `Explore` subagents for short, narrow pre-edit investigations (recommended before modifying any unfamiliar file)

## Step 0: Read Project Context

Before reading the plan, read the project context:
- `CLAUDE.md` (if present) — tech stack, patterns, key paths, DO NOTs
- `README.md` — if CLAUDE.md is absent

Note especially:
- What runtime/build commands are available (`openclaw gateway restart`, `openclaw doctor --repair`, MCP server `npm run build` per package, etc.)
- Where skills live (`workspace/skills/<name>/SKILL.md`)
- Where in-repo MCP servers live (`workspace/mcp-servers/<name>/`)
- Where deterministic scripts live (`workspace/scripts/`)
- Where MCP registry lives (`workspace/config/mcporter.json`)
- Any project-specific conventions that affect how code should be written

## Step 1: Find and Read the Plan

Look for the plan in these locations (in order):
1. The most recent `.claude/plans/*.md` file
2. The orchestrator output referenced in the plan description
3. KB docs referenced in the plan description

Read the plan file and extract:
- The ordered list of implementation steps
- Files to create (NEW)
- Files to modify (MODIFY)
- Dependencies between steps (what must be done before what)
- The plan's **Expected Observations & Failure Signals** and **Abort conditions** sections, when present (Complexity ≥ Medium plans carry them). These carry, per step, the observation that confirms the step worked, any named fork-triggers, and the conditions that mean stop-and-escalate vs push-through.

If the plan cannot be found, STOP and report: "Could not find plan. Please provide the plan file path or run /orchestrate first."

## Step 2: Determine Scope

Parse the scope from `$ARGUMENTS`:

- If `$ARGUMENTS` is empty or contains no scope hint: **implement all steps** in the plan.
- If `$ARGUMENTS` contains `all`: implement every step in order.
- If `$ARGUMENTS` contains `next`: find the first unimplemented step and implement just that one.
- If `$ARGUMENTS` contains a step range (e.g., `1-3`): implement only those steps.
- If `$ARGUMENTS` contains a single step number (e.g., `5`): implement only that step.

## Step 3: Create Dependency Batches

Group steps into batches that can be executed:

**Batch rules:**
- Steps within a batch have NO dependencies on each other
- Each batch completes before the next starts
- New MCP server packages go before mcporter.json registration that references them
- mcporter.json edits go before skills that mention the new tools
- Bootstrap-file edits (SOUL/AGENTS/etc.) go before skill edits that cross-reference them
- Cron / deterministic-script edits can run in parallel with skill edits
- Deploy script edits (rsync excludes, plist template) go last and require coordinated runtime-host action

Example batching for a typical agent feature:
```
Batch 1 (parallel):   New MCP server package (workspace/mcp-servers/foo/) + new deterministic script (workspace/scripts/bar.js)
Batch 2 (sequential): mcporter.json registration of the new server
Batch 3 (parallel):   New skill referencing the tool + bootstrap-file cross-references
Batch 4 (sequential): Deploy script changes (rsync excludes for any new mutable paths)
```

## Step 4: Implement Each Batch

For each batch:

### 4a: Pre-flight Check
Before implementing, verify the files exist and match expectations:
```bash
# For files to modify — verify they exist
ls -la [file paths]
```

Read the first few lines of files to modify, confirming they match the plan's assumptions.

### 4b: Implement

**For NEW files:** Use the Write tool to create the file with the content from the plan.

**For MODIFIED files:**
1. Read the full file first
2. Make the specific changes described in the plan using Edit tool
3. Verify the edit was applied correctly by reading the changed section

**For NEW SKILLS:** Write `workspace/skills/<name>/SKILL.md` with valid frontmatter — `name` MUST equal the folder name; `user-invokable` MUST be spelled correctly (NOT `user-invocable`). Follow the 5-section convention (Header / Triggers / Systems / Workflows / Important Rules). See `_dev/skill-template.md` and the `/gen-skill` command for the canonical scaffold.

**For NEW IN-REPO MCP SERVERS:** Create `workspace/mcp-servers/<name>/` with its own `package.json`, `tsconfig.json` (if TS), and source. Server IDs are kebab-case; tool IDs are snake_case; params are camelCase. Each tool returns a single text content block of stringified JSON. Then register in `workspace/config/mcporter.json` under the `mcpServers` key (NOT `servers`).

**For DETERMINISTIC SCRIPTS:** Write `workspace/scripts/<name>.{js,ts,sh}`. Convention: emit JSON to stdout, tagged messages (`[script-name] msg`) to stderr. Cron-invoked scripts get bound to per-cron API keys for cost attribution.

**Confirm each step against its Expected Observation (when the plan carries them).** Before advancing past a step, point at the artifact/output/state the plan named — the edit returning success is not confirmation (Anthropic computer-use self-verification-loop precedent). On a named fork-trigger, take the route the plan already designed. On an Abort condition, stop and flag — do NOT improvise past it. Report only work you can cite observed evidence for (Anthropic Fable 5 prompting guide) — never a self-reported "done."

### 4c: Parallel Implementation (when batch has multiple independent files)

If a batch has 2+ independent files, spawn parallel `general-purpose` subagents:

For each parallel implementation, use this prompt template:
```
# Implement: [file description]

## Task
[Specific changes from the plan for this file]

## File to Modify/Create
Path: [file path]
Action: [CREATE or MODIFY]

## Pre-flight Investigation (use the magnifying glass)

Before editing any file you have NOT already read in full this session, spawn an `Explore` subagent (Task tool, `subagent_type: Explore`) with a NARROW, hypergranular query — not a broad survey. The goal is to confirm what your edit touches, not to re-explore the project.

Good narrow queries:
- "Find all callers of `fooBar` and the type signatures they pass"
- "Show every place `useThing` is consumed and whether they pass the new arg"
- "Where is column `users.role` referenced in TS types and SQL?"

The plan tells you which page of the dictionary to open. The Explore subagent is the magnifying glass that reads the entry exactly. Short investigations (60–120 seconds) are encouraged — they're cheaper than a wrong edit.

Skip this only if (a) the file is being CREATED fresh, or (b) you have already read every consumer of the symbol you're changing in this session.

## Instructions
- Read the file first (if MODIFY)
- Apply the exact changes described
- Use Edit tool for modifications (not Write for existing files)
- After changes, read back the modified section to verify

## What NOT to Do
- Don't modify other files
- Don't add features beyond the plan
- Don't refactor surrounding code
- Don't add comments or docstrings the plan didn't specify
- Don't expand the Explore query into a broad survey — keep it narrow to the symbol/file you're editing

## Scope-Creep Guard

You will be tempted to do more than the plan asked. Each excuse has a predictable reality:

| Excuse | Reality |
|--------|---------|
| "While I'm here I'll also fix/refactor X." | The plan didn't ask for X. Out-of-plan edits break review and reconciliation. |
| "This needs error handling the plan missed." | Note it for the PM/plan-review; don't add unrequested scope mid-implementation. |
| "It's cleaner if I restructure this too." | Cleaner-but-unplanned is still unplanned. Stay inside the step. |
```

Wait for ALL parallel agents to complete before moving to the next batch.

### 4d: Post-Batch Verification

After each batch completes, run the appropriate validation:

- **For batches that touched in-repo MCP servers:** run that package's build (`npm run build` inside `workspace/mcp-servers/<name>/`).
- **For batches that touched `mcporter.json`:** run the mcporter shape check (Step 5) — it validates JSON shape and the top-level `mcpServers` key.
- **For batches that touched skills:** confirm folder name = frontmatter `name`, and frontmatter spells `user-invokable` correctly. See `_dev/validation-checklist.md`.
- **For batches that touched bootstrap files:** check character cap (`wc -c workspace/*.md`).

If validation fails:
1. Read the error
2. Fix the specific issue
3. Re-validate
4. If errors persist after 2 fix attempts, report them and continue to next batch

## Step 5: Final Verification

After all batches complete:

```bash
# Validate mcporter.json shape (top-level mcpServers key)
python3 -c "import json,sys; d=json.load(open('workspace/config/mcporter.json')); sys.exit(0 if 'mcpServers' in d else 1)"

# Per-MCP-server build, if any in-repo packages changed
for d in workspace/mcp-servers/*/; do (cd "$d" && npm run build 2>&1 | tail -5); done

# Optional: openclaw doctor on the runtime host (skip if developing on a separate dev machine)
openclaw doctor --repair --dry-run 2>&1 | tail -20
```

If anything fails:
1. Read the errors
2. Fix obvious issues (missing imports, JSON shape, frontmatter spelling)
3. Re-run validation
4. Report any remaining errors

## Step 5b: Spec-Compliance Gate (Stage 1 — before any quality review)

Build/shape validation above confirms the code *runs*; it does not confirm you built *what the plan specified*. Before advancing to a quality review (`/audit-code`, Stage 2), run a spec-compliance check. You have both the plan and the edits in context, so spawn one `Explore` agent to diff the working tree against the plan and report a checklist:

- **No gaps:** every plan step → implemented, and — for steps carrying one — its Expected observation confirmed *held*, not merely that the step ran?
- **No unrequested extras:** every changed file → in the plan's affected-files list? (Run `git diff --name-only` and compare against the plan; flag any file the plan didn't name.)
- **No drift:** any plan-specified behavior missing or altered?

Output a `PASS / NEEDS-CHANGES` verdict. **Gate: do not hand off to the Stage-2 quality review (`/audit-code`) until compliance is PASS.** If `NEEDS-CHANGES`, fix the gaps/extras and re-check.

**Skippable for trivial changes.** A single-file or tiny diff may skip this gate — record `"spec-compliance: skipped — trivial"` in the report rather than spawning an Explore pass for a one-line fix.

## Step 6: Summary Report

```markdown
## Implementation Complete

### Plan Executed
[Plan name/description]

### Batches Completed
| Batch | Steps | Files | Status |
|-------|-------|-------|--------|
| 1 | New MCP server + script | [files] | ✅ Created |
| 2 | mcporter.json registration | [files] | ✅ Modified |
| 3 | Skill + bootstrap cross-refs | [files] | ✅ Created/Modified |
| ... | ... | ... | ... |

### Files Created
| File | Purpose |
|------|---------|
| [path] | [description] |

### Files Modified
| File | Changes |
|------|---------|
| [path] | [what changed] |

### Build Status
- mcporter.json shape: ✅ OK / ⚠️ [issue]
- MCP server builds: ✅ Clean / ⚠️ [N] errors
- Skill validation: ✅ Clean / ⚠️ [N] frontmatter / folder mismatches

### Remaining Issues (if any)
- [Issue description and suggested fix]

### Next Steps
- [ ] If `mcporter.json` changed: gateway will need a restart on the runtime host (`openclaw gateway restart`)
- [ ] If a new mutable workspace path was introduced (TASK-QUEUE-style): update `deploy/deploy.sh` rsync excludes BEFORE next deploy, otherwise rsync will wipe it
- [ ] If a new env var was introduced: add it to the runtime host's launchd plist `EnvironmentVariables` dict (NOT `.env`)
- [ ] Run `/gen-test` if applicable (test patterns are project-specific in OpenClaw — see `_dev/validation-checklist.md` for skill validation)
- [ ] Add manual smoke tests to `docs/smoke-tests-pending.md` for any new skill, MCP integration, cron behavior, or deploy-path change (anything automated checks don't cover). Use stable IDs — `<SECTION>-<NUMBER>` or `<SECTION>-<TYPE><NUMBER>`. Skip if the file does not exist in this project.
- [ ] Manual testing per the plan's verification checklist (cross-reference the smoke-test IDs you added)
```

## Important Instructions

1. **Read project context first** — Step 0 is not optional; it determines build commands and key paths
2. **Follow the plan exactly** — Don't add features, refactor, or "improve" beyond what the plan specifies
3. **Verify after each batch** — Run type check to catch errors early
4. **Report, don't guess** — If something doesn't match the plan, report it rather than improvising

## Error Recovery

- **File doesn't exist** — If a file to modify doesn't exist, check if the plan has the wrong path. Search for it with Glob. If truly missing, report it.
- **Type errors after edit** — Usually a missing import or wrong type name. Fix the specific error, don't refactor.
- **Plan is ambiguous** — If the plan says "add X" but doesn't specify where, read the file and find the most logical location based on the surrounding code.
- **Conflicting changes** — If two batch items would modify the same line, implement them sequentially instead of parallel.
```

---

## After Orchestrator Returns

1. **All batches succeeded** — If `mcporter.json` or bootstrap files changed, plan a `openclaw gateway restart` after deploy. If new mutable paths were added, update `deploy/deploy.sh` rsync excludes.
2. **Build / validation errors remain** — Fix the specific errors reported (frontmatter spelling, mcpServers key, env var resolution, character cap)
3. **Plan mismatch** — If the orchestrator reports the plan doesn't match the codebase, re-run `/orchestrate` to get an updated plan
4. **Partial completion** — Run `/implement --scope next` to continue from where it stopped
