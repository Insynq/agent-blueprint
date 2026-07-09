---
description: Create an implementation plan from investigation findings
argument-hint: "<task to plan> [— optional: investigation findings; uses recent context if omitted]"
---

# Planning Subagent

## When to use /plan vs. /plan-review
- Use `/plan` **after `/investigate`** — when you have investigation findings and need to turn them into an implementation plan
- Use `/plan-review` **when you have a spec doc** — when someone wrote a design document and you want to audit it for gaps before building
- Quick rule: `/plan` creates a plan from findings; `/plan-review` audits a plan that already exists

**IMPORTANT: This command spawns a subagent to protect main context.**

## Action Required

Spawn a Task with `subagent_type: Plan` using the prompt below.

---

## Subagent Prompt

```
# Implementation Planner

Task / context (free-text): **$ARGUMENTS**

Treat the above as the task to plan. If it includes investigation findings (or references recent investigation context), fold them in; otherwise rely on the recent conversation context for findings.

## Step 0: Read Project Context

Read `CLAUDE.md` FIRST to understand:
- Tech stack and frameworks
- Established patterns and conventions
- Hard constraints (DO NOTs)
- Role/permission model (if applicable)

All recommendations must fit the existing project. Don't introduce patterns that contradict what's established.

## Planning Process

### 1. Understand the Scope
- What exactly needs to change?
- What components/files are involved?
- Are there existing patterns to follow?
- What constraints apply?
- **Earned vs. assumed scope-out:** For every "out of scope," "existing behavior preserved," or "verifiable later" assumption, classify it. Earned = "I confirmed X works." Assumed = "I couldn't confirm X — building anyway." Mark every assumed scope-out as a dependency that must be verified before or during implementation. See `docs/LESSONS.md` `[PROCESS-1]`.
- **Provenance of superseded work:** If this plan supersedes or is inspired by prior work — PRs, branches, or an existing implementation (e.g. a plan spawned from `/triage`) — link every inspiring artifact and state where the existing implementation lives *before* proposing the replacement. Don't design a rewrite in a vacuum when the code it replaces already exists.

### 2. Identify Affected Areas
Search the codebase for:
- Files that need modification
- Existing utilities/functions that can be reused
- Related components that might need updates
- Database/API changes if data shapes change

### 3. Design the Approach
Consider:
- **Minimal change** — smallest change that solves the problem
- **Reuse existing** — follow patterns that are already there
- **Unified model** — one normalized type beats two types plus a translator; flag any proposed adapter as a smell
- **No over-engineering** — don't design for hypothetical future requirements
- **Security** — auth checks, input validation at boundaries, sensitive data handling

### 4. Break Down into Steps

Each step should be:
- **Atomic** — can be completed and verified independently
- **Ordered** — dependencies respected
- **Specific** — exact file and change described
- **Closure-owner tagged** — every step carries exactly one inline tag naming who can close it and how (see below). This makes it structurally impossible to fool yourself that a product is validated by editing docs.

**Closure-owner tags (required on every step).** Prefix each step heading with one of:
- **`[EDIT]`** — the agent closes this by changing repo files. Done when the diff lands.
- **`[RUN]`** — live validation only the user can perform (a real end-to-end exercise against the running system). **Can NEVER be closed by editing** — no amount of doc-writing marks it done. Every `[RUN]` item must also be written into `docs/smoke-tests-pending.md` with a stable ID, so the true-closure signal lives on the committed ship-gate ledger, not in this plan.
- **`[DECIDE]`** — a strategy/architecture call not blocking the near-term edits. Maps to the scope-graduation gate (CLAUDE.md `## Patterns` → scope graduation): a `[DECIDE]` that gates a prod-mutating action must be resolved before that action, not silently carried. **If the `[DECIDE]` is architecturally upstream** — it reshapes downstream work, so deciding it late forces a re-port / re-architecture — it must be flagged **decide-early**, filed under the spec template's §10.1 "Upstream forks — decide early" and surfaced by `/plan-review` Step 6a, not carried indefinitely. A "decide early" label is not a decision.

**Closure-owner classification rule (no loophole).** Any step whose success claim depends on *runtime behavior* — a live system actually doing the thing (a cron firing, an email drafting, a write landing in the store, a reminder surfacing) — MUST be `[RUN]`. "The diff landed" NEVER closes a behavior claim; only an observed live exercise does. Corollary: a plan for behavior-changing work with **zero `[RUN]` steps is a red flag** — the plan must explicitly justify it in one line ("why does nothing here require live validation?"). If you can't answer that honestly, a behavior step is mis-tagged `[EDIT]`.

This is a design-validated convention graduated from a downstream product (Kai-RE) that had not yet cleared a live run — it exists precisely because editing-closes-everything is how such products convince themselves they shipped. Treat the tags as load-bearing, not decorative.

## Output Format (Required)

```markdown
## Implementation Plan: [Task Name]

### Summary
[1–2 sentences describing what this plan accomplishes]

### Prerequisites
- [ ] Investigation complete (root cause/approach identified)
- [ ] Approach approved

### Data Dependencies (required when code references specific values by name)
| Value Referenced | Source | Verified? |
|-----------------|--------|-----------|
| e.g., enum value 'active' | schema.ts line 24 | Yes |

### Affected Files
| File | Change Type | Description |
|------|-------------|-------------|
| workspace/skills/x/SKILL.md | Modify | Add trigger condition |
| workspace/scripts/y.js | Modify | Pass new argument |

### Implementation Steps

**Minimum set that MUST land before the next live run:** [list the step numbers — the smallest subset that has to be closed before it is safe to exercise the system end-to-end. This is the sequencing spine: everything else can follow the live run.]

Tag every step heading with its closure owner — `[EDIT]` (agent closes by editing files), `[RUN]` (live validation only the user can perform; also written to `docs/smoke-tests-pending.md`), or `[DECIDE]` (strategy call; maps to the scope-graduation gate).

#### Step 1: [EDIT] [Description]
**File:** `path/to/file.ts`
**Change:** [What to change]
**Why:** [Reason for this change]

#### Step 2: [RUN] [Description]
**Validation:** [what the user must exercise live; cannot be closed by editing]
**Smoke-test ID:** [stable ID mirrored into docs/smoke-tests-pending.md]
**Why:** [Reason]

[Continue for all steps — each with an `[EDIT]` / `[RUN]` / `[DECIDE]` tag...]

### Expected Observations & Failure Signals (Complexity ≥ Medium)
For each step with a non-obvious failure mode, in one or two lines:
- **Expected observation** — exactly what you should see if the step worked (an artifact, output, or state you can point at).
- **Most-likely failure** — the single most probable way it goes wrong, the cause that signals, and the counter-move.
- **Fork-trigger (only if a real branch exists)** — "if you observe X, take route B." Observable trigger + both routes designed here; no bare judgment call left dangling.
Omit this section for Low-complexity plans (see Complexity marker below). Keep these judgment-based signals, NOT hard-coded if/then trees (docs/LESSONS.md [SKILL-1], [PROCESS-2]).

### Testing Checklist
- [ ] **Happy path** — the primary use case works end-to-end
- [ ] **Error paths** — invalid input, network failure, permission denied each show the right response
- [ ] **Edge case data** — null/undefined values, empty arrays, maximum length strings, zero/negative numbers
- [ ] **Role coverage** — every affected user role sees the correct behavior (and can't access what they shouldn't)
- [ ] **Regression** — existing features in adjacent areas still work (check the most likely breakage points)
- [ ] **Loading and async states** — UI handles pending states without flicker or layout shift

### Rollback Plan
1. [How to undo if something goes wrong]

### Abort conditions
Applies when Complexity ≥ Medium; Low-complexity plans may omit.
- **Blocked — escalate/stop:** conditions where continuing would invent a required input (one whose invention changes a persisted/irreversible outcome), mutate the wrong target, or cross a real guardrail. Name them; on hit, stop and flag — do NOT improvise.
- **Friction — push through:** expected obstacles (transient errors, retries, noisy output) that are NOT reasons to stop. Name them so the executor doesn't over-stop.

### Risks
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| [Risk] | Low/Med/High | [How to handle] |

### Complexity
[ ] Simple (1–2 files, straightforward)
[ ] Medium (3–5 files, coordination needed)
[ ] Complex (6+ files, architectural changes)
```
```

---

## After Subagent Returns

1. Review the plan with the user
2. If approved → run `/audit-code` to verify the approach is sound
3. If changes needed → refine or ask user for clarification
4. Once approved → `/implement`

## Workflow

```
/investigate → findings
     ↓
/plan → implementation plan
     ↓
/audit-code → verify approach
     ↓
/implement → execute
     ↓
/ship → commit and push
```
