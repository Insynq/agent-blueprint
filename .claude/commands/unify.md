---
description: Identify similar or duplicate skills, scripts, or MCP servers and design a unified replacement
argument-hint: "<description of the duplication problem>"
---

# Unify

**For when similar skills, scripts, or MCP servers have accreted. Design the unified replacement before touching any code.**

Built on the core principle: one normalized shape + one artifact beats N nearly-identical variants + N translators. These artifacts accrete because each new flow gets its own copy — this command audits the damage and designs the consolidation.

**Output:** A spec document for `/implement`. This command produces only the spec — no code.

## Action Required

Spawn a Task with `subagent_type: general-purpose` using the prompt below.

---

## Subagent Prompt

```
# Unify Agent

Problem: **$ARGUMENTS**

## Your Role

You are an architect specializing in artifact consolidation. Your job is to:
1. Find all similar/duplicate skills, scripts, or MCP servers
2. Inventory what they share vs. how they differ
3. Design a unified artifact with a normalized data shape
4. Produce a spec document for `/implement` to execute

Do NOT write any implementation code. Produce only the spec.

## Step 0: Read Project Context

Read `CLAUDE.md` to understand:
- Tech stack — skills, scripts, MCP servers, bootstrap files, deploy story
- Roles/personas model (behavior that varies by persona is often a key dimension)
- Unified model preference — one normalized shape beats adapters/translators
- Any hard constraints (DO NOTs)

Read the relevant project KB (if one exists) to understand:
- Established skill/script conventions
- Existing catalog entries that may inform the design
- Any architecture decisions relevant to this consolidation

## Step 1: Find All Similar Skills/Scripts/Servers

Spawn an `Explore` agent (thoroughness: "very thorough") with this prompt:

```
# Artifact Discovery

Problem: [description of duplication]

Find every skill, script, or MCP server that overlaps with this description. For each:

1. File path and approximate line count
2. Which persona(s)/roles invoke it, if behavior varies by persona
3. Entry point — where is it invoked or triggered from (router, cron, another skill)?
4. Input shape it receives (arguments or the data structure it consumes)
5. Actions it exposes (side effects, tool calls, what state it changes)
6. Status/state variations — which branches exist inside it?
7. Any shared helpers or utilities it uses

Also find:
8. Any types/schemas that define the data it works with
9. Any notification or side-effect logic that must be preserved
10. Any known bugs or tech debt flagged in comments or TODOs

Report with exact file paths and line numbers for key sections.
```

## Step 2: Build the Artifact Inventory

From the Explore findings, build a table:

| Artifact | Role | ~Lines | Entry point | Input shape | Actions |
|----------|------|--------|-------------|-------------|---------|

Then identify:

**Shared across all artifacts:**
- Data fields every artifact handles
- Sections/steps every artifact runs
- Behavior every artifact has

**What differs by role:**
- Data fields only some roles see
- Actions only some roles can take
- Sections that are role-gated

**What differs by state/status:**
- Sections that appear only in certain states
- Actions that appear only at certain lifecycle stages

## Step 3: Design the Normalized Data Shape

If multiple different data shapes feed the similar artifacts (common when two skills handle the same domain from different sources), define one canonical shape: pick the most complete source as canonical, reuse its field names to minimize transform work, add optional fields for source-specific data, and note the per-source transforms. Fill the **Normalized Data Type** section of the Step-6 template (the field map + transform signatures).

If all artifacts already receive the same data shape, skip the transform design.

## Step 4: Design the Unified Artifact

Define what the unified skill/script/server accepts and how it varies — each item fills the correspondingly-named section of the Step-6 template:

- **Input contract** — the normalized shape from Step 3 (or the existing shared shape), any role indicator used to gate behavior, and any required callbacks/helpers it must delegate to rather than re-implement.
- **Role-aware section map** — which sections/branches each role sees.
- **State-aware section map** — which sections appear in each status/state.
- **Side-effect contracts** — for every action that triggers a notification, audit log, or external call, name the existing function and its file. The unified artifact CALLS that function; it does not re-implement the logic.

## Step 5: Identify Migration Constraints

For each artifact being replaced:
1. Is there notification/audit/side-effect logic that must be preserved? Name the function and its file.
   (Check: `workspace/scripts/`, shared helpers, MCP server handlers, and bootstrap files.)
2. Is there a known bug the migration should fix? Describe it.
3. What's the safest migration order? (Which artifact can be replaced first with lowest blast radius?)

## Step 6: Write the Spec Document

Write to `docs/[unified-name]-spec.md`:

```markdown
# Unified [ArtifactName] — Scope Plan
**Status:** Ready for plan-review

## Problem

| Component | Role | ~Lines | Entry point |
|-----------|------|--------|-------------|

[1-2 sentences on maintenance cost, bug surface, inconsistency caused by the current state]

## Goal

[One paragraph: what the unified artifact will be — role-aware, status-aware, one normalized shape, single source of truth for this domain]

## Normalized Data Type

### `[TypeName]` field map

| Field | TS type | [Source A] transform | [Source B] transform | Notes |
|-------|---------|---------------------|---------------------|-------|

### Transform functions
- `toTypeNameFrom[SourceA](source: SourceAType, context?: ContextType): TypeName`
- `toTypeNameFrom[SourceB](source: SourceBType): TypeName`

## Role-Aware Section Map

| Section | [Role A] | [Role B] | [Role C] |
|---------|----------|----------|----------|

## State-Aware Section Map

| Section | [State 1] | [State 2] | [State 3] |
|---------|-----------|-----------|-----------|

## Migration Constraints

1. [Function/logic that must be preserved — name and file]
2. [Bug to fix during migration]
3. [Recommended migration order and rationale]

## Implementation Phases

### Phase 1 — [First role or safest entry point]
**Files to create:**
- normalized shape + transform functions (e.g., a shared script under `workspace/scripts/` or `workspace/lib/`)
- the unified artifact (`workspace/skills/[name]/SKILL.md`, or the target script / MCP server)
- [any new shared helpers needed]

**Files to modify:**
- [entry points that will invoke the new artifact]

**Files to retire (after Phase 1 verified):**
- [artifacts replaced by this phase]

### Phase 2 — [Second role or entry point]
[Same structure]

## What This Does NOT Change

[Explicit list: what's out of scope, what stays as-is, what's deferred]
```

## Step 7: Report

Summarize:
- N artifacts found, ~X total lines replaced by one unified artifact
- Key design decisions made (normalized shape, section organization, side-effect contracts)
- Path to the spec doc
- Recommended next step
```

---

## After Subagent Returns

1. **Review the spec carefully** — especially the normalized shape field map and the role/state section maps. These are the decisions that determine implementation quality.
2. **Run `/plan-review docs/[name]-spec.md`** → catch any data gaps or edge cases before implementation
3. **Run `/implement docs/[name]-spec.md`** → execute phase by phase
4. **After shipping: record the unified artifact in the relevant project KB (if one exists)** → update the catalog so future work references it instead of building something new
