---
description: Deep codebase investigation — trace data flows, find all usages, identify root causes
argument-hint: "<issue or feature area to investigate> [— optional: skill/file to start from]"
---

# Investigation Subagent

**IMPORTANT: This command spawns a subagent to protect main context.**

## Action Required

Spawn a Task with `subagent_type: Explore` using the prompt below.

---

## Subagent Prompt

```
# Codebase Investigation

Investigate: **$ARGUMENTS** (the full argument string — issue description, optionally with focus area)

## CRITICAL INSTRUCTIONS

Be extremely thorough. Do NOT stop at the first potential issue. Follow ALL paths.

## Investigation Protocol

### 0. Anchor on the Primary Artifact

Before reading project context or tracing any code, locate the **literal primary artifact** this investigation is about — the actual error text, failing test output, log line, data row, transcript, or the user's verbatim claim in the request. **Quote it verbatim** in your output (the `### Primary Artifact` block below). Trace from what the artifact actually shows, not from what the issue description *implies* it shows — these often differ, and an entry point chosen from an unchecked premise is the classic ground-first failure. **Derive the §2 entry point from this artifact, not from a theory of what's wrong.** If you cannot retrieve the artifact (no log path, no repro, no quoted output), say so explicitly and mark every downstream root-cause claim as UNVERIFIED — built on the issue's framing, not on observed evidence. (This is `/debug` Step 1's discipline, moved to the front; `/investigate` needs it too.)

### 1. Read Project Context First

Read `CLAUDE.md` to understand the project's patterns, conventions, and constraints before diving into code.

Also read `docs/LESSONS.md` if it exists. Before diving into the investigation, check whether the symptom matches any known gotcha category. If it does, note the match — recurrence debugging wastes time that a known fix prevents.

### 2. Trace the Full Data Flow

Start at the entry point (router message, MCP tool call, cron trigger) and follow through each layer:

```
Entry → Handler → Service → Data Access → Storage
```

For each step, identify:
- What data is passed?
- What transformations occur?
- Where could data be lost or modified incorrectly?

### 3. Find All Usages and Consumers

Search for ALL places the function / skill / tool / API is called, then map every consumer of each — do NOT stop at the first caller:
- Use Grep to find all occurrences
- Check for duplicate implementations (same logic in multiple places)
- Look for dead code that looks correct but isn't connected (not routed, not imported)
- Multiple skills or modules that do similar things with different callbacks

For each usage, trace its consumers by kind (completeness check):
- **Skills / handlers:** find everything that invokes them (router, calling skills, cron)
- **Functions / MCP tools / services:** find every caller or client
- **Shared state (DB, store, bootstrap files):** find ALL code that reads or writes that state

### 4. Verify Routing/Wiring

Confirm which code is actually executing at the relevant path:
- Which skill or handler the router selects for this request
- Which handler processes this event
- Which module is actually being imported

**This is critical** — the code you're reading might not be the code that's running.

### 5. Check for Reusable Patterns

Before recommending new code:
- Search for existing utilities or scripts that solve a similar problem
- Search for skills with similar structure or triggers
- Search for services or MCP tools with similar data-access patterns
- Flag anything that already exists and could be extended vs. creating something new

## Output Format (Required)

```markdown
## Investigation: [Issue Description]

### Primary Artifact
[Verbatim quote of the literal artifact — error text / log line / data row / transcript / user's claim — or "UNAVAILABLE: downstream root-cause claims are UNVERIFIED"]

### Data Flow Trace
**Entry point derived from:** [what in the quoted artifact points here — not a theory]
[Entry Point] → [Handler] → [Service] → [Data Access]

### All Usages Found
| Location | File:Line | Notes |
|----------|-----------|-------|
| Usage 1  | file.ts:123 | Primary path |
| Usage 2  | other.ts:456 | Also calls this |

### Parent/Consumer Map
| Code | Consumers | File:Line |
|------|-----------|-----------|
| digest skill | router, nightly cron | workspace/skills/digest/SKILL.md, workspace/scripts/nightly.js:45 |

### Routing/Wiring Verification
- Active code path: [what is actually running]
- Dead code identified: [if any]

### Reusable Patterns Found
| Existing Code | Location | Could Solve |
|--------------|----------|-------------|
| [utility name] | file.ts:line | [what problem] |

### Root Cause / Gap
**File:** `path/to/file.ts:line`
**Issue:** [Specific description]

### Recommended Fix/Approach
[Specific change needed — file and line if known]

> **Scope note:** Answering any open decisions here resolves the design; it does not by itself authorize implementation or deploy — scope graduation is a separate explicit confirmation.
```

## Red Flags to Report

| Symptom | Likely Cause |
|---------|-------------|
| Expected logs don't appear | Wrong code path — find the actual file being run |
| Fix doesn't take effect | Code you edited isn't the code being executed |
| Multiple similar skills/modules | Check which one the router actually selects for this request |
| Code looks correct but behavior is wrong | May be dead code — verify imports and routing |
```

---

## After Subagent Returns

1. Root cause identified → run `/plan` for implementation planning
2. Need more context → ask user or run again with narrower focus
