---
description: Deep-research brainstorm with codebase-grounded options and trade-offs
argument-hint: "<the feature, problem, or architectural decision to brainstorm>"
---

# Brainstorm Orchestrator

**This skill spawns a general-purpose subagent that does deep research before generating options.**

## Action Required

Spawn a Task with `subagent_type: general-purpose` using the prompt below. The orchestrator will explore the codebase deeply, then generate well-grounded options.

---

## Subagent Prompt

```
# Brainstorm Orchestrator

Topic: **$ARGUMENTS**

> **Role in the phase loop:** `/brainstorm` is the PM's primary pre-dispatch tool. When invoked from `/orchestrate` Phase 2, it produces the option-comparison that feeds the decisions table in `phase-plan.md`. See [MULTI_AGENT_WORKFLOW.md → PM Pre-Dispatch Responsibilities](../../docs/MULTI_AGENT_WORKFLOW.md#pm-pre-dispatch-responsibilities-phases-13).

## Your Role

You are a brainstorm orchestrator acting as a **senior architect + product designer**.
You do DEEP RESEARCH before generating options.
Your options must be grounded in the actual codebase — not generic suggestions.

**Output style:** Concise and scannable. The user should understand each option in 30 seconds.
Lead with the recommendation. No walls of text.

You have access to the Task tool and can spawn these subagent types:
- `Explore` - for codebase investigation (read-only)

You also have direct access to Read, Glob, and Grep tools for quick lookups.

## Phase 1: Context Gathering

**Anchor first (if the topic names a specific artifact).** If the topic references a specific primary artifact — a failing output, a transcript, a data row, a prior decision doc, or a user's verbatim claim — open it and **quote the relevant lines verbatim before** reading the project KB or exploring related code. Ground options in what the artifact actually says, not the topic's paraphrase of it; tag the premise `[verified: read it]` or `[relayed: topic-said]` per the Phase 2 provenance discipline. If the topic names no specific artifact (a pure greenfield question), note "no primary artifact — exploratory" and proceed.

### 1a: Read Project Knowledge Base

Read these files to understand the project's architecture, constraints, and current state:
- `CLAUDE.md` — primary source of truth: tech stack, patterns, current phase, DO NOTs
- `README.md` — if CLAUDE.md is absent or sparse
- Look for documentation in common locations: `docs/`, `.claude/`, `docs/architecture/`
  Use `Glob("docs/**/*.md")` to find relevant docs for this topic
- Check any archive or completed-phase docs if the topic relates to prior work

Note the project's tech stack, role/auth system, and key conventions before proceeding.

### 1b: Deep Codebase Exploration

Spawn an Explore subagent with this prompt:

```
# Deep Context Exploration for Brainstorm

Topic: [topic description]

## Exploration Protocol

### 1. Find Related Existing Code
Search for anything related to this topic:
- Skills in `workspace/skills/` that touch this area (read each `SKILL.md` frontmatter + Triggers + Systems sections)
- Bootstrap files in `workspace/` (SOUL/AGENTS/TOOLS/SCHEMA/MEMORY/HEARTBEAT/NOTIFICATIONS/INDEX) that define related agent behavior
- In-repo MCP servers in `workspace/mcp-servers/` and entries in `workspace/config/mcporter.json`
- Deterministic scripts in `workspace/scripts/` (cron-invoked Node CLIs)
- Deploy and runtime config in `deploy/` (webhook receiver, rsync excludes, plist template)

### 2. Map Existing Patterns
For each related file: read it, note the pattern (data flow, skill/tool structure, state handling), and identify what's reusable vs. net-new.

### 3. Identify Constraints
- What auth/access controls affect this area?
- What role hierarchy applies (if any)?
- What feature flags or tier gates apply (if any)?
- What existing contracts (MCP tool shapes, skill frontmatter, scheduled cron behavior, deploy script excludes) can't change?
- What invokes the affected skills/scripts (router triggers, cron schedules, calling skills)?

### 4. Find Similar Implementations
Find the closest analogous feature: how was it implemented, what patterns did it establish, what worked and what was awkward?

### 5. Check for Blockers
- Are there missing DB tables or columns needed?
- Are there missing server-side handlers?
- Are any MCP servers missing from `workspace/config/mcporter.json`? (Missing entries cause silent tool unavailability — the router will never see those tools.)
- Does any `${ENV_VAR}` reference in `mcporter.json` lack a corresponding entry in the runtime host's launchd plist `EnvironmentVariables`? (Substitution reads `process.env`, not `.env` files — silent failure on the runtime side.)
- Does this depend on unfinished work (check CLAUDE.md phase status)?

## Output Format

### Related Code Found
| File | What It Does | Reuse Potential |

### Established Patterns
- [Pattern]: used in [files], approach: [description]

### Constraints
- [Constraint type]: [specific constraint]

### Similar Implementations
- [Feature]: in [files], approach: [description], relevance: [why]

### Potential Blockers
- [Blocker or "None found"]

### Raw Materials for Options
Based on the above, here are the building blocks available:
- [Building block 1]: [what exists, what's missing]
- [Building block 2]: [what exists, what's missing]
```

## Phase 2: Synthesize Options

Using the exploration findings AND the project context, generate 2-3 DISTINCT approaches.

> **Provenance discipline.** For every claim you carry forward from the Explore digest into an option, tag it `[verified: how]` or `[relayed: source-said]`; never harden a hedge ("appears to" stays "appears to," a grep-count stays a grep-count); re-read the digest's own caveats and surface any buried blocker so front-confidence never exceeds back-caveats. Failure this prevents: `docs/investigations/2026-06-24-kai-verification-grounding-findings.md`.

Each option MUST be:
- **Grounded** — References specific existing files, patterns, and constraints
- **Scoped** — Includes concrete file list (new + modified) with rough counts
- **Honest** — Acknowledges what's hard, not just what's easy
- **Different** — Not variations of the same approach (different architecture, not different naming)

## Phase 2.5: Visualize UI Changes

**For any option that changes UI layout or adds visible components:**
Generate an ASCII mockup showing the before → after, or the new layout.

Use box-drawing characters for layout mockups:
```
┌─────────────────────────────────────────┐
│ Component Name                          │
├─────────────────────────────────────────┤
│ [Element] [Element]     [Action Button] │
│ ┌─────────────────────────────────────┐ │
│ │ Content area                        │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

Only include mockups for options with meaningful UI differences.
Skip mockups for backend-only or data-layer changes.

## Phase 3: Evaluate (internal — do NOT output the full evaluation)

For each option, internally evaluate feasibility, risk, and effort.
Distill findings into the concise format below.

## Final Output Format (Required)

```markdown
## Brainstorm: [Topic Summary]

### Recommendation: Option [A/B/C] — [Name]
[2-3 sentences: why this is best, grounded in codebase evidence]

---

### Context
[2-3 sentences on what exists today]

### Constraints
- [Only list constraints that actually affect the decision]

---

### Option A: [Name] ⭐ (if recommended)
[1 paragraph: what it does and how it works architecturally]

**Builds on:** [existing files/patterns]
**New:** [N files] | **Modifies:** [M files] | **DB:** [yes/no]
**UX impact:** [How does this change the user's experience? Clicks saved, workflow simplified, cognitive load reduced?]
**Risk:** [1 sentence — the hardest part]

[ASCII mockup if UI changes — see Phase 2.5]

### Option B: [Name]
[1 paragraph: what it does differently]

**Builds on:** [existing files/patterns]
**New:** [N files] | **Modifies:** [M files] | **DB:** [yes/no]
**UX impact:** [How does this change the user's experience?]
**Risk:** [1 sentence]

[ASCII mockup if UI changes and different from Option A]

### Option C: [Name] (only if genuinely different)
...

---

### When to pick a different option
- Pick [B] if: [specific scenario]
- Pick [C] if: [specific scenario]

---

> **Scope note:** Answering these decisions resolves the design; it does not by itself authorize implementation or deploy — scope graduation is a separate explicit confirmation.
```

## Phase 4: Cross-Cutting Audit

When any option introduces or modifies a contract that other parts of the agent depend on (MCP tool shape, skill frontmatter, bootstrap-file structure, cron-script JSON output schema):

1. Grep the workspace for every consumer of the contract (other skills referencing the tool, scripts piping the JSON, bootstrap files cross-linking the section).
2. Flag that those consumers must be updated as part of the option's scope.
3. Include this in the option's scope under `### Cross-Cutting Updates`.

## Important Instructions

1. **Reference real files** — Every option must cite actual codebase files
2. **Acknowledge project docs** — If a KB or doc already has a plan for this, reference it
3. **Don't over-option** — If there's really only one good approach, say so (2 options minimum still)
4. **Flag if already exists** — If the feature is already built, say so immediately
5. **Don't implement** — Research and synthesize only
6. **Audit explicit selects** — When adding DB columns, find all queries that need updating
7. **Earned vs. assumed scope-out** — For any option that says "builds on existing X" or treats a foundation as given, verify X actually behaves the way the option assumes. If you couldn't verify it, flag the option as depending on an unverified foundation rather than recommending it as solid ground. "I couldn't find evidence it's broken" is not the same as "I confirmed it works." See `docs/LESSONS.md` `[PROCESS-1]`.
```

---

## After Orchestrator Returns

The brainstorm will return well-researched options grounded in the actual codebase.

1. **Review the options** — pick your preferred approach (or ask for modifications)
2. **Feed your choice into orchestrate** — run `/orchestrate --type feature "implement [topic] using approach [A/B/C]"`
3. The orchestrator will plan, validate, and audit based on your chosen direction
