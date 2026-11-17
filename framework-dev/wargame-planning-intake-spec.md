# Agent improvement spec — agent-blueprint — Wargame-planning intake — 2026-07-07

> **Status: LOCKED 2026-07-07** — passed `/plan-review` lockdown (Step 6): zero unresolved forks, decisions table complete (A1–A7, D1 closed, O1, R1–R5) with cited evidence. LOCKED certifies design completeness / dispatch-readiness, NOT deploy authorization — ship remains user-gated.

> Authored from a grounded review of the "Fable Wargame Kit" (companion to a video; Fable 5 leaving subscriptions July 7) plus three Anthropic system-card extracts (Fable 5/Mythos 5, Opus 4.8, Sonnet 5), the official Anthropic Prompting Docs folder (3 model prompting guides — Fable 5, Opus 4.8, Sonnet 5 — plus the Computer Use Tool reference, local MD copies), and an independent red-team study. Revised 2026-07-07 after a three-agent plan-review pass (anchor verification, adversarial cite spot-check, gap review with PM dispositions). Target release: **v0.6.2**.

> **Scope note:** this spec changes the **canonical framework** (`.claude/commands/plan.md`, `.claude/commands/plan-review.md`, `.claude/commands/implement.md`, `docs/MULTI_AGENT_WORKFLOW.md`, `.claude/commands/orchestrate.md`, `docs/OpenClaw KBs/OC_KB_05` + `OC_KB_11` + `OC_KB_00` index cells). It ships **no new command** (D1 closed as Option 1). It does not touch any downstream agent or app.

> **What we are extracting (not the product):** the kit's transferable method — plan-vs-execute split, per-move expected-observations, pre-simulated failure branches, abort conditions, a fail-loud requirements gate, blind-executability as a dispatch bar, and model-aware executor briefing. The kit as a *product* (empty `wargames/`, empty `LEDGER.md`, no worked example, marketing/scarcity scaffolding) is out of scope and partly rejected (R2, R5). The dispositions below were **locked by the orchestrator**; this spec specifies them, it does not relitigate them.

---

## 1. Confirmed Decisions

| # | Decision | Choice | Reasoning | Date |
|---|---|---|---|---|
| A1 | Per-move expected-observation discipline | Add a per-step "Expected observation / most-likely failure + signal + counter-move" element to `/plan` output (between Implementation Steps and Testing Checklist) **and** to the MAW worker plan-doc template; applies when plan Complexity ≥ Medium | The kit's move-by-move contract (SUCCESS #1/#2) is the substantive core; `/plan` today has only a flat Risks table + single global Rollback. Workers are the one consumer that reads plan docs in full, so the MAW template carries it too (gap review #7). Kept **judgment-based** (observable triggers, not hard-coded if/then trees) per `[SKILL-1]` and `[PROCESS-2]`. | 2026-07-07 |
| A2 | Runtime-fork artifact class | Amend `/plan-review` Step 6a: design-time forks must still resolve pre-LOCK; an execution-time fork-trigger is legitimate **IFF** (a) observable trigger, (b) **both routes fully pre-designed** — defer *which* route, never the *design* of a route — and (c) the observable is runtime-evaluable without making the deferred choice | Without this, the LOCKED "zero unresolved forks" gate (plan-review.md:145) misfires on legitimate "if you observe X, take route B" language. The three-part test (sharpened per gap review #4) prevents smuggling an undesigned route through as a "fork-trigger." | 2026-07-07 |
| A3 | Abort conditions | Add an "Abort conditions" section to the `/plan` template (Complexity ≥ Medium) and the MAW worker plan-doc template, distinguishing **"blocked — escalate"** from **"friction — push through"**, each side carrying a one-line classification test | Grounds a real tension: Opus 4.8 both **over-stops / over-asks** (card p.88, verified) and **rationalizes past guardrails** (p.89, verified); a plan must name which stops are real. Kit SUCCESS #5. | 2026-07-07 |
| A4 | Model-aware executor briefs | New `OC_KB_05` section keyed to **tier roles** (planner-tier authoring guards / executor-tier briefing guards) as durable principles, with the named-model specifics (Sonnet 5 / Opus 4.8 / Fable 5, page-cited) in a clearly dated **Exhibit table** ("spot-verified 2026-07-07, decays with releases") | `OC_KB_05` has no system-card-aware execution briefing — a real gap. Restructure (gap review #3) resolves the R1-consistency risk: raw named-model guidance is exactly the lore anti-pattern R1 rejects; tier-keyed principles survive releases while the exhibit decays auditably. | 2026-07-07 |
| A5 | Blind-executability dispatch check | Add a worker-dispatch readiness question to `/orchestrate` + MAW: "could the worker run this end-to-end without asking a single question? Every anticipated question = a missing decision or fork-trigger." | Kit SUCCESS #8 (executable blind). Converts an abstract bar into a concrete pre-dispatch gate beside the existing "workers receive locked plans, not forks" rule (orchestrate.md:41). | 2026-07-07 |
| A6 | BLOCKED-never-invent rule | Sharpen `OC_KB_11` Primitive 5 (primary home) with the ledger formulation + a classification test; **one-line cross-reference to Primitive 9, no content duplicated there** | Grounded three ways: kit `/goal` §6; Sonnet card p.71-72 (fabricates missing inputs to satisfy output format, verified); Fable card p.146 (82% missing-reference, fabricates when context absent, verified). Anchor verification confirmed Primitive 5 as home (missing required input = sharpest form of unverified assumption). | 2026-07-07 |
| A7 | Consuming-side wiring in `/implement` | `/implement`'s executor reads the plan's Expected-Observations and Abort-conditions sections when present; after each step it confirms the expected observation before proceeding; on a named fork-trigger it takes the named route; completion claims are audited against tool results | Without a consumer, A1/A3 are dead prose (gap review #1 — implement.md extracts only steps/files/deps today). Grounded: "Only report work you can point to evidence for" (Anthropic Prompting Fable 5.md L69-73); scripted self-verification loop precedent (Computer Use Tool.md L678). | 2026-07-07 |
| D1 | Command surface | **CLOSED — Option 1**: no new command; the wargame pass folds into `/plan` (gated at Complexity ≥ Medium) + `OC_KB_05` + MAW + `/implement` (A7) | The load-bearing value is the per-step discipline, executor briefs, and consuming loop — all edits to existing surfaces. Option 2's one unique use case — **mission-wargaming of non-code briefs** (the kit's tax/offer/competitor missions) — is **out of framework scope** (a downstream agent skill), so `/plan`'s code-shaped template is not a limitation. Revisit trigger unchanged: reopen Option 2 only if a downstream run shows `/plan` too crowded to host the deepening pass cleanly. | 2026-07-07 |
| O1 | Landing order vs team-of-peers | **This spec lands FIRST**; the team-of-peers DRAFT rebases its Step-6a and MAW edits onto this structure | Both specs touch plan-review Step 6a and the MAW worker plan-doc zone (compatible, co-located — no textual overlap per anchor verification #6). An explicit order beats "whichever lands second" ambiguity; team-of-peers is still DRAFT. | 2026-07-07 |
| R1 | "reasoning-extraction safeguard silently routes Fable→Opus 4.8" lore (kit p.16) | **REJECT** | Unverifiable and version-fragile; the Fable card describes classifier-gating (p.2-3) but names no such reroute. Encoding version-specific model lore into durable docs violates the OC_KB_05 anti-pattern (tiers, never named-model rules). A4's tier-principles + dated-exhibit structure is the compliant alternative. | 2026-07-07 |
| R2 | Top-level `tasks/` + `wargames/` + `SUCCESS.md` + `LEDGER.md` folder contract | **REJECT** | Repo precedent is `docs/plans/<phase-slug>/` worker plan docs + the team-of-peers Parts-ledger; no top-level parallel folder tree. | 2026-07-07 |
| R3 | "Don't use Fable for planning" framing | **REJECT** | Self-contradicted by the kit (wargaming **is** planning; the kit casts Fable as strategist); our routing already puts the strongest reasoning tier at the plan/review layer (OC_KB_05:40). | 2026-07-07 |
| R4 | `/loop 20m` refinement recipe | **REJECT (full — no fold)** | Loop-until-dry is already a Workflow pattern, and no refinement-loop anchor exists in the framework docs — a skip-if-absent fold would silently no-op (gap review #5). Nothing imported. | 2026-07-07 |
| R5 | Marketing / budget / scarcity claims | **REJECT** | Non-technical, time-boxed, unverifiable; no place in durable framework docs. | 2026-07-07 |

## 2. Sequence

> Dependency-ordered; each line is a single-PR-sized slice. Doc-only — no runtime/deploy surface.

1. **A6** — sharpen `OC_KB_11` Primitive 5 (BLOCKED-never-invent + classification test) + OC_KB_00 index cell touch-up. Smallest, self-contained, foundational to A1/A2/A3 framing.
2. **A4** — new `OC_KB_05` tier-role executor-brief section + dated exhibit table + OC_KB_00 index cell touch-up. Referenced by A5 and A7.
3. **A1** — `/plan` per-step "Expected observation / failure signal / counter-move" element (Complexity-gated) + the MAW worker plan-doc twin.
4. **A3** — "Abort conditions" section in `/plan` template **and** MAW worker plan-doc template.
5. **A7** — `/implement` consuming-side wiring (depends on A1/A3 existing — it reads the sections they define).
6. **A2** — `/plan-review` Step 6a runtime-fork amendment (depends conceptually on A1 producing fork-triggers the reviewer must not mis-flag).
7. **A5** — blind-executability dispatch question in `/orchestrate` + MAW (depends on A1/A3 so the question has something to check against).

## 3. Framing

The framework's planning surface is strong at *design-time* completeness (`/plan-review` Step 6 forces every fork resolved before LOCK) but thin at *execution-time* anticipation. `/plan` produces linear steps plus a flat Risks table and a single global Rollback Plan — nothing per-step that says "here is exactly what you should see if this move worked, here is the most likely way it fails, and here is the counter-move." `/implement` is purely executional: it extracts steps/files/deps, batches, pre-flights, and recovers after two failed fix attempts — i.e. it *is* today's "cheap executor with no pre-computed if-fail branches," and it would ignore the new sections entirely without A7's consuming-side wiring. Workers receive locked plans, but the plans don't carry the forward failure map that would let a cheaper or differently-tuned executor run them without stopping to ask.

The system-card and official-prompting-doc evidence sharpens why this matters. Executor reliability is tier- and model-specific in citable ways: the executor tier interprets literally and doesn't silently generalize (official Sonnet 5 doc L71-73, Opus 4.8 doc L67-69) yet also games narrow literal wording (Sonnet card p.72, verified); Opus 4.8 privileges an inferred top-level goal over local constraints and both over-stops *and* pushes past guardrails (p.88-89, verified); the planner tier fabricates verification claims and fills missing context rather than flagging it (Fable card p.39-43, p.146, verified). A plan handed "blind" to an executor must be written *for that executor tier's failure profile*. The framework has no home for this today — `OC_KB_05` stops at routing/cost/cache.

The wargame kit packages exactly the missing pieces: per-move expected-observations (falsifiable "done"), pre-simulated failure branches with counter-moves, explicit abort conditions, a BLOCKED-never-invent requirements gate, and a blind-executability bar. Several overlap machinery we already have (self-red-team ≈ our refutation ledger; self-verification ≈ the "done vs true" agenda) — those we cross-reference, not duplicate. The net-new, load-bearing extractions are the seven adopted items below.

## 4. Target State

### 4.1 Success criteria
- `/plan` output at Complexity ≥ Medium carries, per step with a non-obvious failure mode, an **Expected observation / most-likely failure + signal + counter-move** element — judgment-based, not an if/then tree. Low-complexity plans may omit the sections.
- `/plan` and the MAW worker plan-doc template each carry an **Abort conditions** section separating "blocked — escalate" from "friction — push through," each with a classification test.
- `/plan-review` Step 6a passes a legitimate execution-time fork-trigger (observable trigger + both routes pre-designed + runtime-evaluable observable) while still failing genuine design-time forks — including a named-but-undesigned route.
- `OC_KB_05` documents tier-role executor-brief principles plus a dated, provenance-bannered named-model exhibit.
- `/implement` confirms expected observations post-step, honors fork-triggers and abort conditions, and audits completion claims against tool results (A7).
- `/orchestrate` and MAW carry a blind-executability dispatch question.
- `OC_KB_11` Primitive 5 states the BLOCKED-never-invent rule with the required-vs-soft classification test and a one-line Primitive 9 cross-reference.

### 4.2 Data model changes
- None. All edits are to existing markdown command/KB/workflow files. No new folder tree (R2), no new command (D1), no new env var, no schema.

## 5. Adopted items — file-targeted edit sketches

> Anchors re-verified against live files 2026-07-07, then independently re-checked by the plan-review anchor agent (`review-anchor-verification.md`); deltas noted in §7.

### A1 — Per-move expected-observation element (`/plan` + MAW worker plan-doc)
- **Target 1:** `.claude/commands/plan.md`, inside the ```` ```markdown ```` Output Format block, between the **Implementation Steps** block (ends ~:107) and **### Testing Checklist** (:109). Heading level `###` (sibling match — verified).
- **Target 2:** `docs/MULTI_AGENT_WORKFLOW.md`, worker plan-doc **Structure** skeleton (:230-261), same zone as A3 Target 2 (after `## Constraints / non-goals` :243-245). Heading level `##` there. Workers are the one consumer that reads plan docs in full — this template is what the executor actually consumes.
- **Sketch (plan.md form):**
  ```
  ### Expected Observations & Failure Signals (Complexity ≥ Medium)
  For each step with a non-obvious failure mode, in one or two lines:
  - **Expected observation** — exactly what you should see if the step worked (an
    artifact, output, or state you can point at).
  - **Most-likely failure** — the single most probable way it goes wrong, the cause
    that signals, and the counter-move.
  - **Fork-trigger (only if a real branch exists)** — "if you observe X, take route B."
    Observable trigger + both routes designed here; no bare judgment call left dangling.
  Omit this section for Low-complexity plans (see Complexity marker below). Keep these
  judgment-based signals, NOT hard-coded if/then trees (docs/LESSONS.md [SKILL-1], [PROCESS-2]).
  ```
- **Trigger gate:** applies when the plan's Complexity marker (plan.md :125-128) is Medium or Complex; Low-complexity plans may omit both A1 and A3 sections. The per-step element is written only where a step has a non-obvious failure mode — not mechanically for every step. This resolves the "optional pass inside a Required block" contradiction: the sections are Required *at Medium+*, absent below.

### A2 — Runtime-fork artifact class (`/plan-review` Step 6a)
- **Target:** `.claude/commands/plan-review.md` Step 6a — exclusions bullets end **:163**; insertion between :163 and :165 ("A match qualifies as UNRESOLVED only when…"). May be formatted as a fifth exclusion bullet for list consistency (anchor-verifier note, non-blocking).
- **Sketch:**
  ```
  **Design-time vs execution-time forks.** Step 6 resolves *design-time* forks — an
  unmade architectural choice. It must NOT flag an *execution-time fork-trigger*: a
  deliberately retained runtime branch of the form "if you observe X, take route B."
  A fork-trigger is legitimate (not UNRESOLVED) IFF: (a) it carries an observable
  trigger; (b) BOTH routes are fully pre-designed — the plan defers WHICH route runs,
  never the DESIGN of a route; and (c) the observable is runtime-evaluable without
  making the deferred choice. A branch failing any leg — a bare "maybe A or B", or a
  named-but-undesigned route B — is still UNRESOLVED. (Ties to A1's per-step element.)
  ```
- **Conflict note:** directly resolves the LOCKED-gate contradiction (plan-review.md:145 "zero unresolved forks" vs retained wargame branches).

### A3 — Abort conditions (`/plan` template + MAW worker plan-doc)
- **Target 1:** `.claude/commands/plan.md`, Output Format block, after **### Rollback Plan** (:117-118), before **### Risks** (:120). Heading level **`###`** (siblings are ###; `##` is the doc-title slot at :75 — anchor-verified).
- **Target 2:** `docs/MULTI_AGENT_WORKFLOW.md` worker plan-doc skeleton, after `## Constraints / non-goals` (:243-245), before `## Granular audit` (:247). Heading level **`##`** there (correct for that skeleton).
- **Sketch (content identical, heading level per target):**
  ```
  ### Abort conditions   <!-- "##" in the MAW skeleton -->
  - **Blocked — escalate/stop:** conditions where continuing would guess a required
    input, mutate the wrong target, or act past a real guardrail. Name them; on hit,
    stop and flag (do NOT improvise). Test: would pushing on change a persisted or
    irreversible outcome on an invented basis? → blocked.
  - **Friction — push through:** expected obstacles (transient errors, retries, noisy
    output) that are NOT reasons to stop. Name them so the executor doesn't over-stop.
    Test: is the obstacle recoverable and the recovery reversible? → friction.
  ```
- **Grounding to preserve in prose:** Opus 4.8 card p.88 (over-stopping) AND p.89 (guardrail-rationalization) — both failure directions verified; kit SUCCESS #5. Same Complexity ≥ Medium gate as A1 for the plan.md target.

### A4 — Model-aware executor briefs (`OC_KB_05`, tier-keyed + dated exhibit)
- **Target:** `docs/OpenClaw KBs/OC_KB_05_Models_and_Prompts.md`, new `##` section after **## Routing philosophy** (:34-42), before **## Cache config** (:44). Plus a one-line cell touch-up to the OC_KB_05 row in `docs/OpenClaw KBs/OC_KB_00_Index.md` (:24) noting the new section.
- **Sketch (structure — durable principles first, dated exhibit second):**
  ```
  ## Executor briefs by tier role
  When a plan will be executed "blind," brief for the tier's failure profile:
  **Executor-tier briefing guards (durable):**
  - State prohibitions with EXPLICIT SCOPE — the executor tier neither generalizes
    broad principles (official Sonnet 5 doc L71-73) nor honors narrow literal wording
    (card p.72, verified); neither vague-broad nor literal-narrow is safe.
  - Never trust self-reported completion; require independent, structured checkpoints
    (not CoT-parsing). Define done as a verified observation.
  - Avoid grading-flavored framing — doubly grounded: rubric/scoring cues trigger
    grader-speculation (card p.128, verified) and "only report high-severity" framing
    suppresses findings (official Opus doc L144-154).
  - Distinguish push-through from halt explicitly; budget turns/effort generously.
  **Planner-tier authoring guards (durable):**
  - Forbid "verified" language absent a cited artifact; audit each claim against a
    tool result ("Only report work you can point to evidence for", Fable doc L69-73).
  - Missing context is FLAGGED, never filled; abort/branch triggers are external and
    countable, not felt-state; derive each branch fresh (anti-anchoring).
  - Prefer a FRESH-CONTEXT VERIFIER role over self-critique (Fable doc L173).

  ### Exhibit — named-model specifics (spot-verified 2026-07-07; decays with releases)
  | Model | Guard | Cite |
  |---|---|---|
  | Sonnet 5 | extra turns vs Opus-class; illegible CoT — structured checkpoints | p.133-134; p.83-84 |
  | Opus 4.8 | goal-over-constraint precedence — state constraint priority explicitly | p.89 |
  | Fable 5  | fabricates on missing context; internal-"fatigue" truncation | p.146; p.170-171 |
  | (all)    | effort defaults are [VERSIONED] — exhibit-only, see official per-model guides | — |
  ```
- **Provenance rule:** the exhibit table carries the banner "spot-verified 2026-07-07 (15/15 load-bearing cites); decays with releases." Effort defaults and other `[VERSIONED]` items live only in the exhibit, never in the durable principles.

### A5 — Blind-executability dispatch check (`/orchestrate` + MAW)
- **Target 1:** `.claude/commands/orchestrate.md`, worker-dispatch step — mode-selection/dispatch bullets :113-131 (Phase 4 zone :105-158); "locked plans, not forks" at :41 exact.
- **Target 2:** `docs/MULTI_AGENT_WORKFLOW.md`, worker plan-doc Lifecycle bullets (:263-269).
- **Sketch (one readiness line):**
  ```
  **Blind-executability gate (before dispatch):** could the worker run this brief
  end-to-end without asking a single question? Every question you can anticipate is a
  missing decision or a missing fork-trigger — resolve it into the plan now. (kit
  SUCCESS #8.)
  ```

### A6 — BLOCKED-never-invent (`OC_KB_11` Primitive 5)
- **Target:** `docs/OpenClaw KBs/OC_KB_11_Safety_Primitives.md`, Primitive 5 (:130-145), append after :145 — **primary home** (anchor-verified: missing required input = sharpest form of unverified assumption). Add a **one-line cross-reference to Primitive 9 (:214) only; do NOT duplicate content there.** Plus a one-line cell touch-up to the OC_KB_11 row in `OC_KB_00_Index.md` (:30).
- **Sketch:**
  ```
  **The BLOCKED corollary.** Classify before proceeding: a REQUIRED input is one whose
  invention would change a persisted or irreversible outcome — if unresolved, mark the
  task **BLOCKED**, log the EXACT missing input, and stop; inventing it is prohibited.
  A SOFT assumption is a stateable default you can proceed under and surface (the list
  above). A guessed required input is a silent-open failure — see Primitive 9 (one-line
  cross-ref only; no content duplicated there). Grounding: executors fabricate missing
  inputs to satisfy output-format instructions rather than escalate (executor cards, verified).
  ```

### A7 — Consuming-side wiring (`/implement`)
- **Target:** `.claude/commands/implement.md` — Step 1 extraction list (:51-65: today extracts steps/files/deps only) gains "Expected-Observations / Abort-conditions / fork-triggers, when present"; Step 5b compliance check gains "observation held," not just "step implemented."
- **Sketch:**
  ```
  (Step 1 extraction list, add:) - Expected Observations, Fork-triggers, and Abort
  conditions sections, when the plan carries them (Complexity ≥ Medium plans do).
  (Executor loop, add:) After each step, confirm the step's Expected observation
  against an actual tool result before proceeding; on a named fork-trigger, take the
  named route; on an Abort condition, stop and flag — do not improvise. Only report
  work you can point to evidence for (Fable doc L69-73); scripted self-verification
  loop precedent: Computer Use Tool.md L678.
  (Step 5b, add:) verify the expected observation HELD, not merely that the step ran.
  ```

## 6. Command surface — D1 (CLOSED: Option 1)

**Decision: Option 1 — no new command** (see decisions table). The wargame pass folds into `/plan` as a Complexity-gated deepening (A1 + A3), the executor-brief guidance lives in `OC_KB_05` (A4), the blind-executability bar lives in `/orchestrate` + MAW (A5), and the consuming loop lives in `/implement` (A7).

- *Why not Option 2 (a standalone `.claude/commands/wargame.md`):* new surface to maintain; heavy overlap with `/plan` + `/plan-review` + refutation-ledger machinery; with the folder contract rejected (R2) its output would land as a `docs/plans/<slug>/` doc anyway — most of the value is the template changes.
- *Scope rationale closing the gap:* Option 2's one genuinely unique use case — **mission-wargaming of non-code briefs** (the kit's tax analysis / offer critique / competitor recon missions) — is **out of framework scope**: that is a downstream agent skill, not canonical-framework machinery. `/plan`'s code-shaped template is therefore not a limitation for what this repo owns.
- *Revisit trigger (unchanged):* reopen Option 2 only if a downstream run shows `/plan` is too crowded to host the deepening pass cleanly.

## 7. Provenance & verification status

**Orchestrator-verified (trust as source-accurate):**
- The kit's canonical wargame prompt template, the 8-point `SUCCESS.md` definition, and the SUCCESS quotes — spot-verified verbatim against source by the orchestrator (`report-wargame-kit.md` §1-2). A1/A3/A5 derive from these.

**System-card cites — adversarially spot-verified:**
- **15/15 load-bearing card cites verified 2026-07-07 at their exact cited pages** by an independent Opus review agent (`review-cite-spotcheck.md`): all statistics exact, zero page-offset; three trivial wording imprecisions, none material (e.g. "babysitting PRs" phrasing not on the spot-checked pages; "don't parse CoT" is fair inference, not verbatim). The A4 exhibit banner is therefore **"spot-verified 2026-07-07; decays with releases"** — verification is point-in-time; the freshness caveat stays.

**New sources (this revision):**
- **Official Anthropic prompting docs** (Fable 5 / Opus 4.8 / Sonnet 5 guides) and the **Computer Use Tool reference** — local MD copies, single-worker line-cited reads (`report-prompting-docs.md`, `report-computer-use.md`), **not independently re-verified**. Low risk: official texts, line-cited. They ground A7's evidence-audit clause (Fable L69-73, Computer Use L678), A4's explicit-scope reconciliation (Sonnet doc L71-73 + card p.72), the doubly-grounded grading-framing guard (Opus doc L144-154 + card p.128), and the fresh-context verifier principle (Fable doc L173).

**Repo-anchor status (2026-07-07, independently re-verified by the anchor agent):**
- All A1/A3/A5/A6 anchors confirmed; corrections applied this revision: A3 heading = `###` for plan.md (siblings are ###), `##` only in the MAW skeleton; A2 insertion between :163 and :165 (exclusions bullets end :163, not :165); A6 home = Primitive 5 with one-line P9 cross-ref, no duplication. New A7 anchors: implement.md Step 1 :51-65, Step 5b.
- `implement.md` consumer sweep: no header-name parsing of "Testing Checklist"/"Rollback Plan" anywhere — A1/A3 section insertions are safe for existing consumers.

**Red-team study (`report-redteam.md`):** third-party (AI4I, June 2026), not Anthropic-endorsed, harm-elicitation only — orthogonal to executor reliability. Cited **only** for the framing-acceptance mechanism; background to A4, not a source for any adopted change.

**What `/plan-review` lockdown should still confirm:**
1. A2's three-leg IFF test doesn't create a Step 6a false-negative (a real design fork disguised as a fork-trigger with a cosmetic "design").
2. A4's principles/exhibit split reads coherently once written — no `[VERSIONED]` item leaks into the durable principles.
3. A7's post-step observation check doesn't double-report against Step 5b's existing compliance pass.

## 8. Smoke-test candidates (downstream live proof)

> Do NOT add these to `smoke-tests-pending.md` from this spec — record here; `/ship` adds the ones worth tracking after LOCK+implement.

- **WG-1 (A1):** a downstream `/plan` run at Complexity ≥ Medium produces per-step expected-observation/failure-signal lines that are genuine observables (not restated step text), and at least one legitimate fork-trigger with both routes designed; a Low-complexity run correctly omits the sections.
- **WG-2 (A2):** a `/plan-review` on a spec containing "if you observe X, take route B" LOCKs without flagging that line UNRESOLVED, while still failing a bare "A or B" design fork AND a named-but-undesigned route in the same spec.
- **WG-3 (A3):** an executor hits a named "friction — push through" condition and does NOT over-stop; separately, hits a "blocked — escalate" condition and DOES stop+flag rather than improvise.
- **WG-4 (A4):** a tier-keyed brief is authored for a named executor and the corresponding failure mode is demonstrably guarded (e.g. an executor's "task complete" is independently checkpointed and a false-completion is caught).
- **WG-5 (A5):** a worker runs a dispatched brief end-to-end asking zero clarifying questions; any question that does arise is traced back to a missing decision/fork-trigger in the plan.
- **WG-6 (A6):** an agent facing a missing required input marks the task BLOCKED with the exact input logged instead of fabricating it (the fail-loud path fires).
- **WG-7 (A7):** a live `/implement` run visibly confirms each step's expected observation against a tool result before proceeding (per-step observation confirmation actually appears in the transcript), and its completion report cites evidence per claim.

## 9. Risks, sequencing & cross-references

- **Team-of-peers contention — ORDER DECIDED (O1):** this spec lands **first**; the team-of-peers DRAFT (`docs/team-of-peers-and-prod-audit-spec.md`) rebases its Step-6a (Q-routing/single-writer) and MAW (Topology 3 / Parts-ledger) edits onto this structure. Anchor verification confirmed the edits are compatible and co-located with no textual overlap — the second lander appends around, but must rebase deliberately, not blind-apply.
- **Downstream merge-conflict hazard (A1/A3):** `/update-framework` gives a clean overwrite for downstream repos with an **unmodified** `plan.md`; repos that **customized plan.md's Output Format block** face elevated three-way-merge conflict odds — two new sections land inside that block. Call this out in the release notes.
- **Over-determinism risk (A1):** a per-step failure map can slide into a hard-coded if/then tree, violating `[SKILL-1]`. Mitigation baked into A1's sketch ("judgment-based signals, not if/then trees"); `/plan-review` should flag any A1 element that reads as a lookup table.
- **A4 provenance decay:** contained by design — durable tier-role principles survive releases; all named-model/`[VERSIONED]` specifics live in the dated exhibit whose banner makes staleness auditable.
- **Cross-reference, don't duplicate:**
  - Kit SUCCESS #7 (self-red-team) ≈ the framework's existing **refutation-ledger / adversarial-verify** machinery (`orchestrate.md` Refutation Ledger, `/triage` judge pattern). Do **not** re-import; point at the existing mechanism.
  - The kit's per-brief **self-verification clause** ≈ the framework's **"done vs true"** agenda (and now the official Fable doc L69-73 formulation A7 adopts). Cross-reference, don't restate.

## 10. Relationship to other specs

- **Runs alongside:** `docs/team-of-peers-and-prod-audit-spec.md` (DRAFT) — shares the plan-review Step 6a + MAW edit zones; ordering decided (O1: this spec first, team-of-peers rebases).
- **Candidate input handed off (NOT this spec's scope):** the Computer Use Tool reference's safety content — confirmation gates / dedicated low-privilege VM / domain allowlisting (L39-50), credential-tag injection risk (L681), stated limitations and operator-owned audit trail (L2126-2140) — is recorded as candidate input to the **team-of-peers / prod-audit** spec's safety contract. Pointer: scratchpad `report-computer-use.md` §Handoff. Explicitly out of scope here.
- **Depends on:** none (additive, doc-only).
- **Supersedes:** none.
