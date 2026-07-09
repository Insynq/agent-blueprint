---
description: Review a spec doc for gaps, missing decisions, and risks before implementation
argument-hint: "<path to the spec document, e.g. docs/my-feature-spec.md>"
---

# Plan Review

## When to use /plan-review vs. /plan
- Use `/plan-review` **when you have a spec or design doc** — it audits the doc for gaps, missing decisions, and risks
- Use `/plan` **after `/investigate`** — when you have investigation findings and need to structure them into a plan
- Quick rule: `/plan-review` is pre-implementation QA on an existing plan; `/plan` creates the plan

**Pre-implementation gap analysis. Run this BEFORE `/implement` to catch design issues early.**

## Action Required

1. Read the spec thoroughly
2. Spawn **3–5 parallel Explore agents** to investigate all areas the spec touches
3. Synthesize findings into a gap analysis
4. Present grouped findings to the user for decisions

---

## Step 1: Read the Spec

Read the spec at `$ARGUMENTS` in full. Extract:
- Every file, table, schema, type, component, and service referenced
- Every new entity being created
- Every existing entity being modified
- The implementation order / phases
- Any assumptions about current behavior

Also read `CLAUDE.md` to understand project patterns and constraints.

## Step 2: Launch Parallel Investigations

Spawn 3–5 `Explore` agents (thoroughness: "very thorough") covering:

**Agent 1 — Data layer**: Read every data schema, migration, or data model the spec touches or depends on. Report exact field names, types, constraints, and relationships. Identify what exists vs. what the spec assumes exists.

**CRITICAL — full-table/schema audit requirement:** When the spec extends an existing data model for a new use case, DO NOT just check the parts the spec mentions. For each touched model, audit ALL of the following:
- Every constraint on every field the new use case will write to
- Every access control policy or permission check on the model (SELECT, INSERT, UPDATE, DELETE equivalents)
- Every unique or foreign key constraint that the new use case might violate
- Every trigger, hook, or side effect that might fire on the new write pattern

This is a real failure mode: auditing one constraint while missing others on the same model. Always read the full model definition.

**Agent 2 — Skill & script layer**: Read every skill, deterministic script, and config file the spec references. Report tool invocations, transform functions, input/output shapes. Identify gaps between what the spec expects and what's actually there.

**Agent 3 — Bootstrap & command surfaces**: Read every bootstrap file and command surface the spec touches. Report durable rules, query paths, and invocation points. Identify where new features need to integrate.

**Agent 4 — API/integration layer**: Read every API endpoint, server function, webhook handler, or external integration the spec involves. Report the current contract, validation, error handling.

**Agent 5 (if needed) — End-to-end flows**: Trace flows that the spec modifies from entry to storage. Report the full sequence and identify where the spec's changes intersect with existing behavior.

Each agent should report **exact file paths, line numbers, and code snippets** for everything relevant.

## Step 3: Synthesize Findings

Analyze combined findings against the spec.

### 3a: Verification Discipline (read first — gates the rest)

Scan the spec for every assumption labeled "out of scope," "existing behavior preserved," "verifiable later," "separate concern," "trust the system," or any phrase that defers a check to later. For each one, classify it as **earned** or **assumed**:

- **Earned scope-out** = "I confirmed X works; we can build on top of it." (engineering)
- **Assumed scope-out** = "I couldn't confirm X; let's build on top anyway." (hope wearing engineering's clothes)

Watch for the warning sign: a verification that keeps resisting clean answers. If the spec (or your own thinking) rephrases the same question into progressively softer forms — `"does X fire?"` → `"does X fire somewhere?"` → `"is existing behavior preserved?"` → `"trust the system?"` — that resistance IS the answer. Don't shrink the question until it's tractable; expand the investigation until it can actually be answered.

Two supporting rules:

1. **Treat "I couldn't find X" as a fact about your search, not about reality.** When grep doesn't show something, ask "what kind of thing does grep miss?" — not "this must not exist."
2. **Domain-owner intent is verification-grade data.** If the user has stated "this was working before," that's a load-bearing claim — flip your posture from "probably fine" to "probably broken until I prove otherwise."

For every flagged item: either VERIFY now (and mark as earned in your findings) or list it as a **GAP** or **RISK** that implementation depends on. Pause cost is almost always less than retrofit cost. See `docs/LESSONS.md` `[PROCESS-1]` for the full incident behind this verify-now-or-GAP rule.

**In-spec verification ledger (`[VERIFY…]` tags).** A well-formed spec carries its own verification ledger inline: every host-capability or environment claim it leans on is tagged `[VERIFY per host]` / `[VERIFY-on-runtime-host]` / `[VERIFY BEFORE SHIPPING]` at the point of use, and each is resolved against the real install and rewritten as `[RESOLVED]` (claim held) or `[RESOLVED, corrected: …]` (claim was wrong, here's the truth) before lockdown. **A resolution must carry its evidence:** rewrite as `[RESOLVED: checked <what> on <where>]` (e.g. `[RESOLVED: checked gateway schema on runtime host]`) — a bare `[RESOLVED]` with no how-verified note is unfalsifiable and counts as UNRESOLVED in the Step 6a check. This idiom is already in the wild — see `docs/context-instrumentation-spec.md`, which guards an un-inspectable OpenClaw gateway schema behind `[VERIFY-on-runtime-host]` rather than guessing it. When you see an untagged environment claim, flag it and recommend a `[VERIFY…]` tag; when you see an unresolved `[VERIFY…]` tag, it blocks lock (Step 6a). *(This convention is design-validated, graduated from a downstream product that had not yet run its claims against a live host — which is exactly the state the tag exists to make visible.)*

### 3b: Missing Pieces
- Does the spec reference fields/types/components that don't exist and aren't in the creation plan?
- Does the spec assume behavior that doesn't match the current implementation?
- Are there files the spec should modify but doesn't mention?
- For every existing model the spec extends: does the plan cover ALL constraints the new use case touches?

### 3c: Event-Driven Side Effects

For every notification, email, webhook, audit log entry, or any other side effect triggered by a state change:
- **Find ALL callsites** that write the triggering state — not just the most visible one
- Common trap: a manual action triggers the side effect, but an automated or programmatic path that writes the same state does not
- Search strategy: grep for every place that writes the triggering status value (client-side mutations, RPC calls, server-side triggers/functions)
- Flag any side effect wired to only one callsite when multiple exist

**Why this matters:** Missing a trigger path means the side effect silently never fires for certain code paths. The happy-path test usually exercises the obvious callsite and misses the rest. This is especially common with cron writes, MCP mutations, and deploy hooks — each often has both a manual (interactive) path and an automated (scheduled or programmatic) path that writes the same state.

### 3d: Architectural Gaps
- Does the spec define a data model change without updating all consumers?
- Are there security/auth implications not addressed?
- Are there audit trail or logging requirements not covered?
- Does the spec introduce an adapter/translator between contexts? Flag as anti-pattern — recommend unified type instead.

### 3e: Edge Cases
- What happens with empty data (0 items, null values)?
- What happens at boundaries (single item, maximum values)?
- What happens with concurrent operations (race conditions)?
- What happens when a session is interrupted or compacted mid-flow?

### 3f: Decision Points
- Where does the spec leave ambiguity that needs a choice?
- Where are there multiple valid approaches and the spec picked one without justification?
- Where might business requirements conflict with the technical approach?

Examples of decision points worth flagging: skill-vs-script split for a new capability, MCP tool contract design for a new integration, error handling granularity (silent vs. user-visible), where state lives (bootstrap-file rule vs. system-of-record query). These are cases where multiple approaches are valid and the spec should justify the choice — not leave it to implementation time.

### 3g: Dependency Risks
- Which phases have tight dependencies that could cascade failures?
- Which changes are hard to reverse once shipped?
- What's the critical path?

## Step 4: Present Findings

Group related findings into **review items** (A, B, C, ...). For each:
- Brief overview of the issue
- Options that need a decision (if any)
- Recommendation

Categorize each:
- **GAP**: Something the spec doesn't cover but needs to
- **DECISION**: A choice the user needs to make
- **RISK**: Something that could go wrong and how to mitigate
- **SUGGESTION**: An improvement that would make the implementation smoother

Present as a numbered list. Ask the user which to address first or whether to go in order.

## Step 5: Update the Spec

After the user makes decisions on each review item, update the spec doc with:
- Decisions recorded in the relevant section
- New steps added to the implementation order
- Risks documented in a risk register

## Step 6: Lockdown Check

Final gate: verify the spec has no unresolved architectural forks before declaring it implementable. Run **after** Step 5 (so any decisions surfaced during review have been recorded). A spec that passes Step 6 receives a `Status: LOCKED YYYY-MM-DD` header; a spec that fails has unresolved items listed and does not receive the header.

### 6a: Scan for unresolved-fork patterns

Grep the spec for textual signals that a fork was raised but not closed:

- `[TODO decision]`, `TODO`, `[decide]`, `(decide)` — explicit unresolved markers
- ` or ` between architectural alternatives (e.g., "use approach A or B")
- `(a)/(b)/(c)`, `(1)/(2)/(3)` enumerations without a confirmed pick
- Phrases like `open decision`, `unresolved`, `to be determined`, `TBD`, `revisit`, `figure out later`
- `[VERIFY…]` tags — `[VERIFY per host]`, `[VERIFY-on-runtime-host]`, `[VERIFY BEFORE SHIPPING]`, or any `[VERIFY …]` variant (see §3a). An unresolved `[VERIFY…]` is an environment claim the spec has not yet checked against the real install; it blocks lock. It is closed only by rewriting it in place with an evidence-bearing note — `[RESOLVED: checked <what> on <where>]` or `[RESOLVED, corrected: …]`. A **bare `[RESOLVED]` with no how-verified note counts as UNRESOLVED** (it asserts a check without showing one), and deleting the tag without a resolution note does not close it either.

For each match: confirm there's an adjacent decision (in the decisions table or an inline "decided: X" annotation) closing the fork. If none, list it as **UNRESOLVED**.

**Exclusions (avoid false positives).** Self-referential specs — ones that *document* the fork patterns Step 6 detects — generate noise. For every grep hit, skip the match if any of the following apply:

- The match sits inside a fenced code block (```` ``` ```` … ```` ``` ````) — that's example syntax or a template skeleton, not a real unresolved item.
- The match sits inside a backtick-delimited inline code span (`` `[TODO decision]` ``) — same reason.
- The match is in a paragraph that describes Step 6 itself, or documents the fork-detection patterns (e.g., a sentence enumerating the patterns to scan for). That's commentary, not content.
- The match is inside a `§Resolved decisions` or `§8` section that lists post-release revisit triggers (`"revisit if X happens"`, `"revisit in a later release"`) — those are deliberate future milestones, not unresolved forks within this release's scope.
- The match is an **execution-time fork-trigger** ("if you observe X, take route B" — a deliberately retained runtime branch), not the design-time fork Step 6 exists to resolve. Such a fork-trigger is legitimate (not UNRESOLVED) **IFF all three hold**: (a) it names an **observable trigger**; (b) **both routes are fully pre-designed** — the plan defers WHICH route runs, never the DESIGN of a route; and (c) the observable is **runtime-evaluable without making the deferred choice**. A branch failing any leg — a bare "maybe A or B", or a named-but-undesigned route B — is still UNRESOLVED. (This ties to the per-step Expected Observations element `/plan` emits at Complexity ≥ Medium, which is where legitimate fork-triggers originate.)
- The match is a **genuinely-deferrable open item** parked in the spec's Deferred/Out-of-Scope section (template §10) under **"Genuinely deferrable"** *and* carrying a recorded why-safe-to-sit rationale (nothing downstream depends on it this release). A properly-justified deferrable is a decision, not an omission — do not false-flag it.

**Upstream forks DO block (the inverse rule).** An open design fork classified as **architecturally upstream** — it reshapes downstream work, so delaying it is expensive — is UNRESOLVED whenever it lacks a recorded decision, even if the spec files it under "deferred." Specifically: any item in template §10's **"Upstream forks — decide early"** subsection that has no closing decision blocks lock; and any open fork that would force a re-port / re-architecture if decided late blocks lock regardless of which subsection it sits in. **A "decide early" label is not a decision** — the field case is Kai-RE's IP-protection fork, marked "Decide early — it shapes the architecture" yet carried shipped-in-the-clear across nine version-string bumps without ever being decided (a downstream product's upstream fork silently rotting into a shipped default). Flag such items as UNRESOLVED and name them in the FAIL list.

A match qualifies as **UNRESOLVED** only when it represents an actual decision *in this spec's content* that has no corresponding closure in the decisions table.

### 6b: Verify decisions-table coverage

The spec should carry a decisions table in the `Decision | Choice | Reasoning | Date` format (per `_dev/agent-improvement-spec-template.md` §1). Verify:

- Every fork surfaced in Step 3f Decision Points has a corresponding row.
- Every review item the user resolved in Step 4 (categorized **DECISION**) has a corresponding row.
- Every row has all four columns filled — no empty `Choice` or `Reasoning` cells.

If the spec uses the older bullet format (grandfathered for pre-v0.3.0 specs per `superpowers-adoption-spec.md` precedent), verify each decision bullet carries a date stamp and a one-line reasoning. New specs should use the table.

### 6c: Verify exploration evidence is cited

Each decision should reference the artifact that grounds it — the headless equivalent of the sister framework's "user clicked through the mockup." Look for:

- Brainstorm trace citation (`/brainstorm` output, option-comparison evidence)
- Investigation log citation (`/investigate` finding, file:line citation)
- Source-of-evidence link (existing skill / KB section / external doc)

If a decision is recorded without a cited grounding artifact, flag it as **UNVERIFIED** (the decision may still be correct, but the trace is missing — write it in now or the next reviewer can't audit the reasoning).

**Engineering-judgment exception.** Some decisions are pure technical choices — runtime layout, error-handling style, file naming, mkdir-on-demand — that have no external "artifact" to cite because the rationale *is* the technical reasoning. For these, the Reasoning column itself must make the technical justification visible (e.g., `"self-healing — runtime mkdir is idempotent, zero bootstrap cost"`). Don't flag a stated technical rationale as UNVERIFIED; flag *missing* rationale.

Distinguishing rule: if the decision could only be answered by reading an external artifact (a KB, a brainstorm trace, a prior incident), require the citation. If the decision is justified by self-contained engineering reasoning, accept the Reasoning column as the citation.

### 6d: Verdict

**On PASS** (no UNRESOLVED items, every decision has a row and a cited evidence source): prepend a `> **Status: LOCKED YYYY-MM-DD**` blockquote header to the spec file (immediately under the H1 title, before any other content). Replace `YYYY-MM-DD` with today's date.

**On FAIL** (one or more UNRESOLVED or UNVERIFIED items): output a numbered list of the unresolved items. Do **not** write the LOCKED header. Tell the user: "Spec failed lockdown check — [N] unresolved items below. Resolve and re-run Step 6."

The LOCKED header is the convention that downstream `/orchestrate` (Phase 6) and `/implement` use to decide whether the spec is dispatch-ready. Drafts without the header are exploratory only. LOCKED certifies design completeness and dispatch-readiness — NOT user authorization to deploy; deploy remains gated at the Phase 9/10 checkpoints.

## Important

- **Be specific** — cite exact file paths, line numbers, and code snippets
- **Don't implement anything** — this is analysis only
