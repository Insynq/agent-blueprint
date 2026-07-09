# Agent improvement spec — <agent-name> — <YYYY-MM-DD>

<!--
  Spec skeleton for an agent-improvement initiative.

  Use when: scoping a non-trivial change to an existing OpenClaw agent that
  spans multiple skills, MCP servers, or operational primitives. Created by
  /brainstorm or /unify; consumed by /plan-review and /implement.

  Save as: docs/<initiative-name>-spec.md  (per project convention).

  Each section has a 1–3 line guidance comment. Replace [TODO] markers with
  content. Delete the comments before committing the final spec.

  References to OpenClaw KBs use OC_KB_<NN> shorthand. The capability-layer
  taxonomy from OC_KB_10 is the spine of Section 5; the enhancement axes from
  OC_KB_11–14 are the spine of Section 6. Don't rename layers or axes — they
  cross-reference back to the OC_KB collection.
-->

## 1. Confirmed Decisions

<!--
  Decisions already made and not up for debate in this spec. Each line
  carries a date stamp so future readers know when the decision was made
  (and how stale it might be). One bullet per decision; keep terse.
-->

| # | Decision | Choice | Reasoning | Date |
|---|---|---|---|---|
| 1 | [TODO decision] | [TODO choice] | [TODO reasoning] | YYYY-MM-DD |
| 2 | [TODO decision] | [TODO choice] | [TODO reasoning] | YYYY-MM-DD |

## 2. Sequence

<!--
  Ordered execution plan, top to bottom. This is what /implement will work
  through. Each line names one slice that's small enough to land in a
  single PR. Don't list dependencies in prose; let the order encode them.
-->

1. [TODO step]
2. [TODO step]
3. [TODO step]

## 3. Framing

<!--
  Problem statement, in 2–3 paragraphs. What's broken or missing today?
  What's the cost of the status quo? What's the user-visible signal that
  surfaced the need? Avoid solution language here — that's what later
  sections are for.
-->

[TODO 2–3 paragraphs framing the problem]

## 4. Target State

<!--
  What does success look like? Concrete, observable. Include data-model
  changes if any (new fields, new entities, schema bumps). One subsection
  per major target outcome; avoid sprawl.
-->

### 4.1 Success criteria

- [TODO criterion]
- [TODO criterion]

### 4.2 Data model changes

<!-- Skip this subsection if there are no schema changes. -->

- [TODO new entity / new field / new bootstrap file / new MCP server]

<!--
  Environment-claim convention: any row here (or anywhere in the spec) that
  asserts a host capability you have not verified against the real install —
  "connector X exposes Y", "the runtime writes to Z" — carries an inline
  `[VERIFY per host]` tag at the point of use. Resolve each before lockdown by
  rewriting it in place as `[RESOLVED: checked <what> on <where>]` (claim held) or
  `[RESOLVED, corrected: …]` (claim was wrong; here's the truth). A bare
  `[RESOLVED]` with no how-verified note counts as UNRESOLVED at lock; an
  unresolved `[VERIFY…]` blocks /plan-review Step 6a. Prior art: docs/context-instrumentation-spec.md.
-->

#### 4.2a Overridable-vs-locked config boundary

<!--
  For an agent whose users can steer its behavior: draw the line between what a
  user may override and what is locked by the author. State it as a hard rule,
  not a vibe. Locked rows are typically safety / correctness invariants
  (deadline validation, duplicate handling, doc classification, approval
  guardrails); overridable rows are personalization (voice, brokerage/org name,
  vendor list). See the plugin-distribution "user state across updates" rule in
  docs/investigations/2026-07-07-codex-and-claude-code-plugins-build-publish-gate.md
  for the KB-side treatment of WHERE overridable config is persisted (in the
  user's own store, never in shipped read-only code). Skip if the agent exposes
  no user-tunable config.
-->

| Config surface | Overridable by user? | Enforced how | Rationale |
|---|---|---|---|
| [TODO e.g. voice / tone] | Yes | — | personalization |
| [TODO e.g. deadline validation] | **No — locked** | author-owned rule | safety invariant |

#### 4.2b New persisted config fields (manifest)

<!--
  If this spec introduces user-overridable config, list EACH new persisted
  field here as an explicit manifest — one row per field — so the fields are
  reviewable and so the update path knows what user state it must never
  overwrite. These live in the user's own store (Sheet Meta tab, config file,
  etc.), NOT in shipped read-only skill/.md files. Skip if no new fields.
-->

| Field | Store / location | Type | Default | Who writes it |
|---|---|---|---|---|
| [TODO field name] | [TODO user store] | [TODO] | [TODO] | [onboarding / user / agent] |

### 4.3 Audience & Voice constraints (non-negotiable)

<!--
  For a CONVERSATIONAL / user-facing agent, the exact words ARE the
  implementation — user-facing copy is not decoration to be paraphrased at
  build time. Pin three things and treat them as locked spec content:

    1. Reading level — a concrete target (e.g. "12th-grade / plain English").
    2. Forbidden vocabulary — a hard never-say list of terms that leak the
       machinery (e.g. MCP, API, schema, JSON, OAuth, scope, "database
       structure"). Implementers must not surface these to users.
    3. Verbatim user-facing copy WITH per-phrase rationale — embed the literal
       scripts the agent speaks, each annotated with WHY that wording (what it
       reassures, what it must NOT claim). The rationale is load-bearing: it is
       what keeps a later editor from "improving" a line into a lie or an
       awkward read.

  Skip this section for a non-conversational / internal agent. When present,
  its lines are locked copy — /plan-review treats an unresolved wording fork
  here the same as any other unresolved decision.
-->

**Reading level:** [TODO e.g. 12th-grade, plain English — no jargon]

**Never-say list (forbidden vocabulary):**
- [TODO term] — [TODO what to say instead / why it's banned]

**Verbatim user-facing copy (exact words + rationale):**

| Situation | Exact words (verbatim) | Why this wording |
|---|---|---|
| [TODO trigger] | "[TODO literal script]" | [TODO reassurance it carries / claim it must avoid] |

<!--
  Example (design-validated, from a downstream product): a "what will you do to
  my data" reassurance rides on the literal line "I won't change, send, move, or
  delete a single thing" — and deliberately does NOT append "I'm only looking,"
  because that addition "reads weird." The exact words, and the reason for them,
  are both the spec.
-->

## 5. Capability Fixes

<!--
  Organized by capability layer (per OC_KB_10). A "fix" is a defect being
  remediated — something the agent does badly today. Use 5.1–5.5 even if
  some subsections are empty (write "N/A" rather than deleting them; the
  fixed structure helps reviewers spot omissions).
-->

### 5.1 Perception

<!--
  How the agent ingests external input. Fixes here address: missing
  signals, mistyped signals, filtered-upstream signals, sample-only
  signals.
-->

- [TODO fix] — affects skill <name>; see OC_KB_10 §Perception

### 5.2 Extraction

<!--
  How structured info is pulled from unstructured input. Fixes here
  address: parser drift, format drift, multi-instance under-counting,
  forced hallucination on absent fields.
-->

- [TODO fix] — affects skill <name>; see OC_KB_10 §Extraction

### 5.3 Reasoning

<!--
  How the agent reconciles conflicts and decides. Fixes here address:
  rule rot, over-confident inference, skill-routing miss, missing
  reconciliation hierarchy.
-->

- [TODO fix] — affects skill <name>; see OC_KB_10 §Reasoning

### 5.4 Action

<!--
  How the agent commits side effects. Fixes here address: wrong-target
  writes, partial commits, idempotency gaps, missing dry-run / sanity-gate
  paths.
-->

- [TODO fix] — affects skill <name>; see OC_KB_10 §Action, OC_KB_11

### 5.5 Data

<!--
  What state the agent maintains and reads back. Fixes here address:
  agent-state vs external-state drift, no canonical source named, skipped
  data layer, bootstrap truncation.
-->

- [TODO fix] — affects bootstrap file <name>; see OC_KB_10 §Data

## 6. Capability Enhancements

<!--
  Organized by enhancement axis (per OC_KB_11–14). An "enhancement" is a
  capability being added — something the agent doesn't do today but
  should. Use the six axes below; write "N/A" if an axis isn't in scope
  for this initiative.
-->

### 6.1 Trust & Traceability

<!--
  Decision logs, rationale storage, provenance flags, reconciliation
  hierarchy. See OC_KB_12.
-->

- [TODO enhancement] — see OC_KB_12

### 6.2 Proactive Intelligence

<!--
  Catching cases before the user surfaces them: anomaly detection,
  threshold-driven prompts, scheduled review skills. Pulls from OC_KB_06
  (cron) and OC_KB_13 (self-improvement).
-->

- [TODO enhancement] — see OC_KB_06, OC_KB_13

### 6.3 Communication & Collaboration

<!--
  How the agent surfaces information to the user and other agents:
  notification routing, summary cadences, escalation paths, hand-off
  protocols. Anchored in NOTIFICATIONS.md routing per OC_KB_04.
-->

- [TODO enhancement] — see OC_KB_04 §NOTIFICATIONS.md

### 6.4 Learning & Evolution

<!--
  Self-improvement loops: correction memory, telemetry, edge-case
  library, weekly retro, deviation reporting, template evolution. See
  OC_KB_13. Aspirational; pick the subset feasible for this initiative.
-->

- [TODO enhancement] — see OC_KB_13

### 6.5 Operational Excellence

<!--
  SLOs, canary, cost visibility, dashboards, rollback paths. See OC_KB_14.
-->

- [TODO enhancement] — see OC_KB_14

### 6.6 Meta-Capabilities

<!--
  Capabilities about capabilities: capability self-assessment (per
  OC_KB_11 §8), skill-effectiveness telemetry (OC_KB_13 §2),
  cross-skill orchestration. Things that don't fit cleanly into the
  other axes but make the agent more reliable about its own behavior.
-->

- [TODO enhancement] — see OC_KB_11 §8, OC_KB_13 §2

## 7. Cross-cutting Principles

<!--
  Project-wide invariants this initiative honors. These should already
  exist in KB_1_Architecture.md or CLAUDE.md DO NOT — restate the
  relevant ones here so reviewers don't have to context-switch.
-->

- [TODO principle, e.g., "All Action-layer side effects log to decisions.ndjson per OC_KB_12"]
- [TODO principle]

## 8. Relationship to Other Specs

<!--
  Other specs this depends on, supersedes, or runs alongside. Use exact
  filenames; reviewers will follow the links. If none, write "Independent
  of other specs in flight."
-->

- Depends on: [TODO spec filename, or "none"]
- Supersedes: [TODO spec filename, or "none"]
- Runs alongside: [TODO spec filename, or "none"]

## 9. Parallel Tracks

<!--
  Slices that can ship independently and in parallel. Different from
  Sequence (Section 2): Sequence is dependency-ordered; Parallel Tracks
  is what /orchestrate can dispatch to multiple workers at once. List
  each track and its rough scope.
-->

### Track A: [TODO name]

- [TODO scope summary, 1–3 lines]

### Track B: [TODO name]

- [TODO scope summary, 1–3 lines]

## 10. Deferred / Out of Scope

<!--
  Explicitly NOT in this spec, with a one-line reason. Saves reviewers
  from re-asking. Items that get deferred during /plan-review or
  /implement should land here too.

  Split open items by architectural upstream-ness — a flat backlog hides the
  ones that are expensive to delay. /plan-review Step 6a reads this split:
  an unresolved "Upstream fork" BLOCKS lockdown; a "Genuinely deferrable" item
  WITH a recorded why-safe-to-sit rationale does NOT.
-->

### 10.1 Upstream forks — decide early

<!--
  Architecturally upstream: choosing late forces a re-port / re-architecture,
  so delaying is expensive. For each, record WHAT downstream work it reshapes.
  A "decide early" LABEL is not a decision — until a row has a closing decision
  (in §1), /plan-review Step 6a treats it as UNRESOLVED and blocks lock.

  Field case (design-validated, downstream product): an IP-protection fork was
  filed here as "Decide early — it shapes the architecture," yet the crown-jewel
  extraction logic shipped in-the-clear as readable markdown across nine
  version-string bumps because the decision was never actually made. Labeling it did
  not protect it; deciding it would have.
-->

- [TODO upstream fork] — reshapes: [TODO downstream work]; decision status: [OPEN — blocks lock / decided in §1 row N]

### 10.2 Genuinely deferrable

<!--
  Nothing in this release depends on these. Each MUST record WHY it is safe to
  sit — that rationale is what lets /plan-review accept it instead of flagging
  it UNRESOLVED. No rationale ⇒ treated as an unjustified open fork.
-->

- [TODO item] — deferred because [TODO reason]; safe to sit because [TODO nothing downstream depends on it]
- [TODO item] — out of scope: [TODO reason]

## 11. Prioritization Hints

<!--
  Hints for the implementer about what matters most. Risk callouts,
  ordering preferences, "if you can only ship one thing, ship X." Lets
  the implementer make smart trade-offs when reality intervenes.
-->

- **If only one thing ships:** [TODO]
- **Highest risk:** [TODO]
- **Lowest-cost-highest-value:** [TODO]

---

<!--
  After this spec is filled in:
    1. Run /plan-review on it. The reviewer will surface gaps.
    2. Address gaps.
    3. Run /implement, which will dispatch the Sequence (Section 2) and
       Parallel Tracks (Section 9) into worker contexts.
    4. As the work proceeds, edit this spec in place — sections are
       living artifacts, not handoff documents.
-->
