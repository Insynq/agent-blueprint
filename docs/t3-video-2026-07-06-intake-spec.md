# Framework intake spec — T3 goal-mode video harvest — 2026-07-06

> **Status: LOCKED 2026-07-07**

> **Source:** practitioner video transcript (Theo/T3, Claude Fable 5 + external-CLI delegation workflow), harvested 2026-07-06 via a 4-agent Opus 4.8 grounding panel (themes: model routing, delegation-skill design, orchestration topology, verification signals). Panel reports grounded every claim against framework files; 8 load-bearing citations spot-checked by the synthesizer and confirmed. Per `[PROCESS-5]`, all adoptions are cross-context ports (his context: PR-workflow against auto-deploying staging; ours: prod-mutating OpenClaw agents) and ship `Installed, not yet proven in a live run` per `[PROCESS-1]`.

## Lock-review corrections (RESOLVED 2026-07-06)

/plan-review anchor verification (3 Explore agents, all edit targets read at file:line) surfaced no architectural forks; six mechanical corrections were applied to the edit-block appendix before lock:

1. `[PROCESS-7]` restructured into LESSONS.md's required `Rule:/Why:/How to apply:` format (convention at LESSONS.md:91–103).
2. OC_KB_11 autonomy-budget section promoted `###`→`##` (peer of Primitive 0, insertion at :43) + reconciling sentence against the `:253` "always autonomous defeats the primitive" anti-pattern.
3. OC_KB_05 cost-attribution cross-ref corrected "(above)" → "(below, :73–85)" — the section sits below the ~:33 insertion point.
4. OC_KB_02 anchors corrected ("The mixed case" heading = :29, insertion = :47); delegation block given a real `###` heading.
5. MAW Phase-6 clause rewritten as net-new (no existing disagreement-handling exists to "mirror"); line anchors pinned (L61/L163/L167/L141/L144/L21).
6. §8 collision scope narrowed to Slice 2(a) only, grounded in a section-level overlap map of the team-of-peers DRAFT.

## 1. Confirmed Decisions

| # | Decision | Choice | Reasoning | Date |
|---|---|---|---|---|
| 1 | Delegation-skill archetype | Document in OC_KB_02 now; build no delegation skill yet | Genuine gap; doctrine is cheap, wiring is premature until a downstream need exists. User-ratified. | 2026-07-06 |
| 2 | `/triage` command | Build it, with mandatory `[PROCESS-3]` coverage-count guard | Real hole (no command drives stale-backlog triage); engine reuses the Refutation Ledger mechanic. User-ratified. | 2026-07-06 |
| 3 | Per-model numeric scoring table (cost/intelligence/taste 1–10) | REJECT | Stale-fact trap (CLAUDE.md DO-NOT: no duplicated system-of-record copies); architecturally a Claude-Code-orchestrator artifact — OpenClaw routes at config level. | 2026-07-06 |
| 4 | "Never use Haiku" | REJECT; convert to anti-pattern against named-model exclusion rules | Direct conflict with `kickoff.md:172` (Haiku 4.5 recommended fallback); lineup-and-pricing snapshot that rots each release. | 2026-07-06 |
| 5 | "Clean verification = under-pushing" | REJECT | Conflicts with honest-no-op discipline (`falsification-primitive-spec.md` §2, `audit-code.md` blind-spot honesty); motivates manufacturing findings. | 2026-07-06 |
| 6 | Unanimity-as-confidence among judge panels | REJECT; adopt only split⇒escalate direction | Correlated judges sharing a seed error launder false negatives (field-proven: kai-harvest F1 case). | 2026-07-06 |
| 7 | Wall-clock thresholds (3/15/60 min) for the effort signal | REJECT; key `[PROCESS-7]` to diff size / files touched / subsystems crossed | Wall-clock is confounded (model speed, machine, rate limits); the diff proxy is already instrumented (Phase-8 `git diff --name-only` vs. plan). | 2026-07-06 |
| 8 | Per-delegate prompt adapters as standalone doctrine | REJECT standalone; one sentence inside the delegation archetype only | No foreign-model delegation surface exists; standalone adoption is scope creep on a deliberately deferred axis (OC_KB_00 V1 scoping). | 2026-07-06 |
| 9 | Anti-archetype, ask-the-model-questions, disjoint-files parallelism | NO-OP (already covered) | Framework already behaves this way (`orchestrate.md` general-purpose workers + per-task prompts; phase-gated question rounds; collisions/worker-shape analysis). Restating is bloat. | 2026-07-06 |

## 2. Sequence

1. **Slice 1 — OC_KB_11:** "Autonomy budget" subsection (after Primitive 0) + committed-ledger companion rule + CLAUDE.md Patterns cross-link.
2. **Slice 2 — MULTI_AGENT_WORKFLOW.md:** "Live orchestration vs. deterministic workflow" subsection (verbatim-quote anchor) + Phase-8 risk-targeted-verification sub-step + worktree-reconciliation rider + model-provenance one-liner. **Coordinate placement with `team-of-peers-and-prod-audit-spec.md` Decision 1 (topology restructure) — see §8.**
3. **Slice 3 — OC_KB_02 + gen-skill.md:** empty-result contract (report convention + validation checklist + scaffold) + delegation-skill archetype section (with capability-vs-credential reconciliation, exact-commands clause, timeout bullet, field-accretion/disposability note) + description-breadth sentence.
4. **Slice 4 — OC_KB_05:** "Routing philosophy" subsection (explore-cheap-escalate-to-ship + defaults-not-limits) + task-shape capability tiers + named-model-exclusion anti-pattern.
5. **Slice 5 — LESSONS.md:** new `[PROCESS-7]` (effort disproportion via disposable probe, fenced) + `[PROCESS-1]` Corollary 1 trigger sharpen (fast-fix ontology probe) + pointer lines in `debug.md` and `audit-code.md`.
6. **Slice 6 — audit-code.md (+ MAW Phase 6/8 mirror):** split-verdict-⇒-escalate clause in the Refutation Ledger step.
7. **Slice 7 — new `.claude/commands/triage.md`** + CLAUDE.md command-table row + `/plan` provenance rule (plans spawned from triage link inspiring PRs/branches + locate the existing implementation).
8. **Slice 8 — CLAUDE.md Preferences glossary stub + kickoff.md Phase-5 glossary question.**

Order rationale: Slices 1–2 are the doctrine spine (autonomy + orchestration boundary) that Slices 5–7 reference; Slice 3–4 are self-contained KB edits; Slice 8 is independent polish. Slice 2 must sequence against the team-of-peers spec (§8).

## 3. Framing

The framework has a mature *human-gate* doctrine (scope graduation, LOCKED specs, Phase 9/10 deploy checkpoints) but no *blast-radius* doctrine: nothing answers "how much unsupervised runway may an agent be granted before the gate, and what structurally earns it?" The video's 5-hour goal-mode run — a month of work merged autonomously, made safe by containment (staging-only deploys, automated-reviewer merge gates, enumerated permission verbs), not by model trust — exposes the missing dial. Relatedly, `MULTI_AGENT_WORKFLOW.md` never tells the operator when a deterministic scripted fan-out is the right tool versus live-session orchestration; the video's own model articulated the rule ("checkpoint-driven programs barrel past or stall") and it is absent from the doc that owns this decision.

On the verification side, three cheap signals we don't name: effort disproportionate to request-class as a *codebase* signal (our three-strikes escalation fires only after failed debug fixes, never on an expensive first fix); the deployed-baseline diff as a risk map for targeting verification; and verifier *disagreement* as an escalation trigger. On the skills side, the single most field-evidenced lesson in the source — the empty-result contract that stopped wasteful parent re-runs — already exists in our Refutation Pass language but was never generalized into the skill KB or scaffold, so new reviewer/delegate skills inherit nothing.

The cost of the status quo: downstream repos (kai, HP/TMT, eXp) are entering exactly the regime the video describes — long semi-autonomous runs, heterogeneous model pools, accumulating backlogs — with no doctrine for autonomy budgeting, no triage command, and skill scaffolds that permit silent empty returns.

## 4. Target State

### 4.1 Success criteria

- OC_KB_11 answers "how much runway" with three named structural properties; CLAUDE.md's prod-gate paragraph cross-links it so the two read as one system.
- MULTI_AGENT_WORKFLOW.md names the live-session-vs-workflow boundary; the Workflow primitive is doctrinally confined to fan-out-and-verify.
- `/gen-skill` scaffolds and OC_KB_02 checklists reject a delegate/reviewer skill that can return silence.
- `/triage` exists, reuses the Refutation Ledger, and fails loud on coverage drop (N in → N verdicts out).
- LESSONS.md `[PROCESS-7]` exists with the diff-keyed signal and the staging/dev fence; `[PROCESS-1]` Corollary 1 carries the fast-fix-ontology trigger.
- Every shipped prose change is flagged `Installed, not yet proven in a live run`; the smoke ledger gains one entry per behavioral claim under section code **`T3V`** (`T3V-1`, `T3V-2`, …), following `smoke-tests-pending.md` ID conventions (:19–24) and the section template (:42–68). Behavioral claims: autonomy-budget preconditions consulted before a long run; empty-result contract prevents a re-dispatch; `/triage` coverage guard fires on a dropped item; `[PROCESS-7]` escalation fires on a disproportionate diff; split-verdict escalation routes a contested finding.

### 4.2 Data model changes

- New command file `.claude/commands/triage.md`; one new CLAUDE.md command-table row. No schema, bootstrap, or MCP changes.

## 5. Capability Fixes

### 5.1 Perception

- N/A.

### 5.2 Extraction

- N/A.

### 5.3 Reasoning

- **Workflow-vs-live-session boundary absent** — operators (and PM sessions) have no rule for scripted-fan-out vs. live orchestration; checkpoint-driven programs mis-shaped into workflows barrel past gates or stall. Fix: Slice 2. See OC_KB_10 §Reasoning.
- **Effort-disproportion blindness** — an expensive first fix is merged with the same ceremony as a cheap one; the three-strikes escalation (`debug.md`) never generalizes to the accept/merge decision. Fix: Slice 5 `[PROCESS-7]`.
- **Fast-fix ontology gap** — a suspiciously fast fix asserting an unexpected entity is a world-model claim nobody currently probes. Fix: Slice 5 Corollary-1 trigger.

### 5.4 Action

- **No autonomy-budget doctrine** — the framework gates the prod boundary but is silent on unsupervised runway before it. Fix: Slice 1. See OC_KB_11 Primitive 0 ("scale the cut to context" is the nascent form).
- **Silent empty returns from reviewer/delegate skills** — parent reads silence as incomplete run and re-dispatches. Fix: Slice 3 empty-result contract (generalizes `audit-code.md:244` blind-spot honesty). See OC_KB_10 §Action.

### 5.5 Data

- N/A.

## 6. Capability Enhancements

### 6.1 Trust & Traceability

- Model-provenance labeling for mixed-model worker pools (one line, MAW dispatch section) — Slice 2. See OC_KB_12.
- Triage provenance rule: plans spawned from triage link every inspiring PR/branch and locate the existing implementation — Slice 7. See OC_KB_12.

### 6.2 Proactive Intelligence

- Risk-targeted verification: diff deployed baseline vs. candidate → spawn verification at highest-delta/blast-radius surfaces first, re-exercising *old* behavior adjacent to the change — Slice 2. See OC_KB_09.

### 6.3 Communication & Collaboration

- Committed todo-ledger as the out-of-band supervision surface for bounded autonomous runs (scoped: contained runs only) — Slice 1.

### 6.4 Learning & Evolution

- Field-failure accretion for delegation/utility skills (harden from live failures; cut the suggested fix in half against char-cap bloat; treat capability-bridge skills as disposable) — Slice 3. Cross-ref OC_KB_13's heavyweight loop: this is the same-thread, developer-as-gate counterpart.

### 6.5 Operational Excellence

- Routing philosophy: cost is not a gate on what ships; explore cheap, escalate to ship; configured routing is a default, not a ceiling — Slice 4. See OC_KB_14 (cost visibility pairs with the per-cron-key attribution in OC_KB_05).
- Verification-burn calibration: for autonomous runs, verification spend routinely exceeding implementation spend is expected and correct (explicitly NOT "clean = under-pushed", per Decision 5) — Slice 2.

### 6.6 Meta-Capabilities

- Split-verdict escalation: disagreement among independent verifiers routes to orchestrator/human as a positive triage signal; unanimity earns nothing (Decision 6) — Slice 6. See OC_KB_11 §8.

## 7. Cross-cutting Principles

- **`[PROCESS-1]`:** every prose adoption ships `Installed, not yet proven in a live run`; each behavioral claim gets a `smoke-tests-pending.md` entry whose flag clears only on an observed live firing.
- **`[PROCESS-5]`:** these are cross-framework ports from a PR-against-staging context into a prod-mutating-agent framework — the receiving side's fences (the `[PROCESS-7]` staging/dev probe fence, the autonomy-budget containment preconditions) are load-bearing, not decoration.
- **`[PROCESS-3]`:** `/triage`'s fan-out carries the fail-loud coverage guard — stub verdict = `UNVERIFIED`, and N items in must yield N verdicts out or the run fails loud.
- **`[SKILL-1]`:** exact command invocations in delegation skills are judgment-side pattern memory (query-template class), NOT guaranteed mechanics — anything that must fire exactly graduates to a `workspace/scripts/` wrapper.
- **CLAUDE.md DO-NOT (stale copies):** no named model IDs, prices, or scores in any adopted prose — capability tiers only.
- **OC_KB_11 Primitive 0 family:** the delegation archetype defaults to read-only/worktree-scoped delegate invocations; the delegate's summary is `relayed`, not verified, until checked against primary source (`[PROCESS-4]`).

## 8. Relationship to Other Specs

- **Runs alongside (placement conflict, verified 2026-07-06):** `docs/team-of-peers-and-prod-audit-spec.md` (confirmed `Status: DRAFT (exploratory)`, its L3) — its Decision 1 adds a Topology 3 to MULTI_AGENT_WORKFLOW.md "alongside single-window and PM/worker" and it reserves `[PROCESS-6]` (its Sequence step 4). Anchor verification narrowed the overlap: **only Slice 2(a)** (the new subsection adjacent to `## When to use this vs. single-window`, MAW L61) sits in the topology-framing zone that spec restructures. Phase 8, Phase 6, `## Dispatch modes`, LESSONS.md (different entries), and all command files are **non-overlapping** (team-of-peers touches plan-review.md, which this spec does not; this spec touches audit-code.md/gen-skill.md/debug.md, which it does not). Rule: Slice 2(a) slots as a *tool-selection* note, NOT a fourth topology; whichever spec lands second rebases that one subsection on the first. Lesson-ID collision avoided by design (`[PROCESS-6]` theirs, `[PROCESS-7]` ours — repo-wide grep confirms 7 is unclaimed).
- **Depends on:** none.
- **Supersedes:** none.

## 9. Parallel Tracks

### Track A: Doctrine spine (Slices 1, 2, 5, 6)

- OC_KB_11 autonomy budget + MAW boundary/verification edits + LESSONS entries + audit-code clause. One worker; these cross-reference each other.

### Track B: Skills & routing KBs (Slices 3, 4)

- OC_KB_02/gen-skill delegation + empty-result contract; OC_KB_05 routing philosophy. Independent of Track A.

### Track C: Command & onboarding (Slices 7, 8)

- `/triage` command + CLAUDE.md row + `/plan` provenance rule; glossary stub + kickoff question. Independent of A and B (triage references the Refutation Ledger mechanic read-only).

## 10. Deferred / Out of Scope

- **Building an actual delegation skill** (wrapping any external agent CLI) — deferred until a downstream repo has a concrete need; this spec ships doctrine only (Decision 1).
- **Worktree-per-worker parallelism as the default implementation mode** — larger architectural shift; the shared-tree subagent model stays. Slice 2 carries only the *conditional* reconciliation note (merge N worktrees → one integration branch) for runs that do use worktrees.
- **Per-model scoring table, "never Haiku", "clean = under-pushed", unanimity-as-confidence, standalone prompt adapters** — rejected (Decisions 3–6, 8).
- **A5 model-prefix observability beyond the one-liner** — payoff only in mixed-model pools; revisit if downstream heterogeneous routing becomes real.
- **OpenClaw-side goal-mode tooling** (an actual "goal" primitive) — the runtime doesn't expose one; the autonomy-budget doctrine is written to be mechanism-agnostic.

## 11. Prioritization Hints

- **If only one thing ships:** Slice 1 (autonomy budget) — it is the missing half of the framework's central safety story and every downstream repo is entering the long-autonomous-run regime now.
- **Highest risk:** Slice 3's delegation archetype — it reopens a deliberately narrowed seam (OC_KB_02:20 MCP-over-CLI); the capability-vs-credential reconciliation paragraph is load-bearing and must not be trimmed in implementation.
- **Lowest-cost-highest-value:** Slice 3's empty-result contract (field-evidenced, mechanism already owned) and Slice 8's glossary (zero staleness risk).
- **Sequencing trap:** Slice 2(a) vs. the team-of-peers topology restructure — do not let two workers edit MAW's topology-framing prose (around L61) concurrently. The rest of Slice 2 (Phase 8, Phase 6, Dispatch modes) is verified non-overlapping and may proceed independently.

---

# Edit-block appendix

Draft prose per slice (implementers adapt in place; do not trim load-bearing caveats).

## Slice 1 — `docs/OpenClaw KBs/OC_KB_11_Safety_Primitives.md` (after Primitive 0)

Insert as a `##` **peer** section at line 43 — between Primitive 0 (`:28–42`) and `## Least privilege` (`:44`). A `###` would wrongly render as a child of Primitive 0.

> ## Autonomy budget — scale unsupervised runway to structural containment
>
> A long autonomous run is safe not because the model is trusted but because the downside is structurally bounded. Grant standing multi-step autonomy only when three properties hold: (1) **the reachable deploy target cannot touch prod** — the agent's merges land somewhere revertible, and prod promotion stays human-gated; the containment earns the runway, not the model's judgment. (2) **An automated approval gate precedes each irreversible step** — "do not merge until the automated reviewers approve" is an enforced precondition, not a request. (3) **The permission grant is explicit and enumerated up front** — name the exact verbs the agent may take autonomously, so scope is a closed set. Absent all three, autonomy stays turn-by-turn. This is the write-path complement to CLAUDE.md's prod-mutation gate: the gate says *stop at the prod boundary*; this says *how far you may run before it*. Verification disciplines (`[PROCESS-1]`, Refutation Pass) still run on the output — containment bounds damage, it does not certify quality. This grants a *bounded* runway, not "always autonomous": inside the run, the per-operation confidence-threshold and confirmation anti-patterns (§Anti-patterns below) still apply.
>
> **Supervision surface:** a bounded autonomous run writes its whole program as an in-repo checklist and commits each item's completion as it goes — the committed ledger lets a human watch progress land out-of-band without interrupting the run. Scoped to contained runs only: committing-as-you-go to a live deploying branch *without* the three properties above is the anti-pattern the deploy gate exists to stop.

Plus one cross-link sentence in CLAUDE.md Patterns (scope-graduation paragraph): *"For how much unsupervised runway may precede the gate, see OC_KB_11 §Autonomy budget."*

## Slice 2 — `docs/MULTI_AGENT_WORKFLOW.md`

Verified anchors: `## When to use this vs. single-window` = L61 (body L63–75); `### Phase 8: PM verification + integration` = L163 (Stage 1 `git diff --name-only` L167, commit hygiene L169); `## Dispatch modes` = L21; `### Phase 6: PM reconciliation` = L141 (gap-brainstorm bullet L144).

New subsection after the L61 section's closing prose (~L75, before the L77 divider). **This is the one zone contended with the team-of-peers restructure — see §8.**

> ### Live orchestration vs. deterministic workflow
>
> *"Workflows are deterministic scripts that shine for fan-out and verify. But this program is checkpoint-driven. Each PR needs CI, your review, and a merge before the next rebase. Midstream you'll make product calls a script can't anticipate. One giant workflow would either barrel past those checkpoints or stall at the first one."*
>
> A scripted fan-out is the right tool for one shape only: **fan-out-and-verify** — N independent units processed in parallel, results reduced, with the `[PROCESS-3]` coverage-count guard. A **checkpoint-driven program** (CI, human review, or a merge between steps; midstream product calls) is the wrong shape for it: orchestrate those from the live PM session, and reach for a workflow only *inside* it, for the fan-out/verify passes (e.g., the multi-agent review before each merge).

Phase 8 addition (risk-targeted verification) — new bullet after Stage 1 (L167):

> After integration, diff the deployed baseline against the candidate (`git diff <deployed>..HEAD --stat`) and treat the changed surface as the risk map: spawn verification at the highest-delta / highest-blast-radius areas first, and re-exercise **old** behaviors adjacent to the change, not only the new feature. For a fully-autonomous multi-worker phase, verification spend routinely exceeding implementation spend is expected and correct. A clean verification is an honestly-clean result, not proof of under-testing (per `falsification-primitive-spec.md` §2).

Phase 8 rider (conditional): *"When implementation ran across separate git worktrees, reconcile by pulling all worktree branches into one integration branch with conflicts resolved — one reviewable PR, not N overlapping ones."*
Dispatch-modes note (prose under `## Dispatch modes`, ~L23 — not a heuristics-table row): *"When workers run on different models, label each worker/artifact with the producing model — provenance and cost visible at a glance."*
Phase 6 addition (net-new, after the L144 gap-brainstorm bullet — no existing disagreement-handling clause exists to mirror; the split-verdict concept is introduced here and in Slice 6's audit-code clause): *"When independent workers or verifiers disagree on the same finding, the split is a positive escalation trigger — resolve it at the PM/human layer with both positions quoted; never average it away."*

## Slice 3 — `docs/OpenClaw KBs/OC_KB_02_Skills.md` + `.claude/commands/gen-skill.md`

Verified anchors: `### The mixed case: split judgment from mechanics` = OC_KB_02:29 (body :29–46; insertion point :47, before `## Required frontmatter` :48); Boundary note = :20; report conventions = :93/:142; `## Validation checklist` = :176 (checkbox entries :178–187 — new checkbox appends after :187); gen-skill Report line = gen-skill.md:125; gen-skill Step 2 WHEN-not-WHAT = :59–63 (gen-skill has no separate validation checklist — the checkbox lands in OC_KB_02 only).

Empty-result contract (OC_KB_02 report-convention area + OC_KB_02 validation checklist + gen-skill Step-4 Report line):

> **Empty-result contract (required for any skill that delegates or reviews).** A workflow that can legitimately return *nothing found* MUST say so explicitly and name the exact target it inspected — e.g., `[skill-name] no findings — inspected <diff/branch/target>`. A bare silent return reads to the caller as an incomplete run and triggers wasteful re-invocation. Delegation-scale twin of the Refutation Pass's blind-spot-honesty rule (`audit-code.md`) and the log-the-drop discipline (`[PROCESS-3]`).
> Checklist: ☐ If the skill can return an empty result, it states that explicitly and names the inspected target.

Delegation-skill archetype — new `###` subsection (peer of "The mixed case" under the :9 `##`), inserted at :47:

> ### Delegation skills — wrapping an external agent CLI or capability
>
> A skill may teach the agent to shell out to a **peer agent CLI** to (a) fill a capability gap (computer use, browser/simulator automation) or (b) offload token-heavy work (log spelunking, large-document reading, bulk screenshot analysis). Three canonical shapes: external-review (independent second-pass on a diff/branch/commit), external-implementation (bounded change on a throwaway worktree), external-verification. **Boundary reconciliation:** the note above prefers MCP when reaching a *credentialed system of record* (auth-boundary erosion); delegation-for-capability borrows a *peer's compute* — no per-user data-access boundary at stake — but still default to read-only/worktree-scoped invocations (OC_KB_11 Primitive 0), and verify the delegate's important claims against primary source before relaying upward (`[PROCESS-4]`: a delegate's summary is `relayed`, not verified). If the delegate is a non-Claude model, note how to prompt it — conventions differ across families.
> **Exact commands are the highest-value content** — not because the model usually errs, but because the rare miss is disproportionately costly. Capture the corrected invocation the moment a miss happens. These are judgment-side pattern memory (query-template class, `[SKILL-1]`-safe); mark them a staleness/verify-before-relying surface, and graduate anything that must fire *exactly* to a `workspace/scripts/` wrapper.
> **Timeouts:** delegated long tasks can time out; state the recovery (re-scope narrower, or re-dispatch per `orchestrate.md`'s dispatch-mode table) so a timeout doesn't read as hard failure.
> **Lifecycle:** grow these skills by field-failure accretion — get ~80% working fast; on each live failure, ask for a prevention, cut the suggested fix roughly in half (models over-correct; the char cap is real), append. Capability-bridge skills are disposable: delete them when the base model closes the gap.

Description-breadth sentence (gen-skill Step 2): *"Description breadth is a routing lever: widening 'when the user asks to delegate X' to 'when the user asks for X' makes the skilled path the default for that task shape — widen deliberately; too-broad triggers compete with other skills."*

## Slice 4 — `docs/OpenClaw KBs/OC_KB_05_Models_and_Prompts.md` (new subsection at ~:33, after `## Routing config` :12–33, before `## Cache config` :34)

> ### Routing philosophy
>
> **Cost is not a gate on what ships.** Use the cheapest capable model to explore, gather information, and try approaches; escalate to a stronger model as work moves toward something that ships. Escalating costs less than shipping mediocre work; cost breaks ties only when quality axes are genuinely equal.
> **Configured routing is a default, not a ceiling.** A skill routed to a cheaper model has standing permission to redo the work on a stronger one when the output doesn't meet the bar — judge the output, not the price tag. Keep escalation visible via per-cron-key cost attribution (see §Per-cron API keys, below at :73–85). Record *which axes* matter for your agent in `KB_1_Architecture.md`, in prose — not a per-model score sheet that rots each release.
> **Task-shape tiers (per-skill overrides):** bulk mechanical work (clear-spec implementation, data analysis, migrations, log-digging, large-document reading) → cheapest capable tier. Output the user judges directly (copy, API/UX surfaces) → highest-quality tier. Plan/implementation reviews → strongest reasoning tier, optionally plus one *independent, cheaper* perspective (the routing form of the Refutation Pass).
> **Anti-pattern:** blanket "never use model X" rules are lineup-and-pricing snapshots that rot each release — express routing as capability tiers, never named exclusions.

## Slice 5 — `docs/LESSONS.md`

New entry appends after `[PROCESS-5]` (ends LESSONS.md:71, before the `:73` divider), in the section's required `Rule:/Why:/How to apply:` format:

> ### [PROCESS-7] Effort disproportion is an architecture signal — measure by diff, not wall-clock
>
> **Rule:** When a fix costs *wildly more than its request-class implies* — many files touched, subsystems crossed, a bounded ask sprawling into a large diff — treat that as evidence about the **codebase**, not just the change: do not low-ceremony-merge; escalate to design scrutiny (`/brainstorm` / `/plan-review`). A cheap way to *generate* the signal is a **disposable probe**: a bounded speculative fix whose primary deliverable is the measurement (diff size, files touched, subsystems crossed), with the code expected to be discarded. Anchor to diff/blast-radius, never elapsed time. **Fence:** disposable probing is a dev/staging-sandbox instrument — forbidden for runtime agents at prod-mutating surfaces (scope-graduation gate + OC_KB_11 Primitive 0).
>
> **Why:** Harvested from a practitioner goal-mode run (T3 video intake, 2026-07-06 — see `docs/t3-video-2026-07-06-intake-spec.md`): time-to-fix cleanly ranked codebase health for him ("under 3 minutes… an hour or more — something's wrong with our architecture"), but wall-clock is confounded by model speed, machine, and rate limits; the robust half of his own heuristic is "the amount of changes it has to make." The framework already holds the conclusion in a narrower form — `/debug`'s three-strikes escalates to "the problem is the model of the system, not the fix" — but only after three *failed* fixes, never on an expensive *first* fix, and Phase 8 already computes the robust proxy (`git diff --name-only` vs. plan).
>
> **How to apply:** The trigger is accepting or merging a completed fix whose diff is disproportionate to its request-class. Reframe from "it works, merge it" to "why did this cost so much *here*?" — and route the answer to design scrutiny, not a ceremony-free merge. To probe a suspect area deliberately, spawn a disposable bounded fix in a sandbox and read the measurement, not the code. Generalizes `/debug`'s three-strikes from failed-fix count to first-fix cost.

`[PROCESS-1]` Corollary 1 trigger append: *"Trigger: a fix that resolves suspiciously fast AND references an entity/component you didn't expect to exist is asserting a world-model claim — have it point at where the entity lives, then read it, before trusting the fix."*
Pointer lines: `debug.md` Rationalization Guard + `audit-code.md` §Over-Engineering → *"a fix disproportionate to its request is a codebase signal, not only an over-engineering smell — see `[PROCESS-7]`."*

## Slice 6 — `.claude/commands/audit-code.md` (Refutation Ledger step, insert at the :240 ledger definition; companion Phase-6 clause lives in Slice 2)

Note: today's Refutation Pass runs ONE refuter per finding (:236), so splits arise only when a finding accumulates multiple independent verdicts (re-runs, judge panels, multi-refuter configurations) — the clause is written to cover that case without mandating multi-refuter spend by default.

> **Split-verdict escalation:** when independent verifiers disagree on a finding, that split is a *positive* escalation trigger — route the contested finding to the orchestrator/human with both positions quoted. Unanimity earns nothing: correlated verifiers sharing a seed error produce worthless consensus (`[PROCESS-4]`; the F1 false-negative case). Escalate splits; never promote unanimity to "verified clean."

## Slice 7 — new `.claude/commands/triage.md` (+ CLAUDE.md row under Planning & Review; + `/plan` provenance rule)

Command skeleton: input = a set of stale PRs / branches / work items. Fan out one investigator per item → bucket verdict {ready-to-merge / good-but-needs-touch-up / trumped / good-idea-but-rewrite} with evidence (operator may rename buckets per backlog). Independent judge pass stress-tests each verdict (reuse the Refutation Ledger mechanic — do not invent a new panel format). Orchestrator resolves ONLY contested (non-unanimous) verdicts. **Mandatory `[PROCESS-3]` guard:** N items in → N verdicts out, stub = `UNVERIFIED`, or fail loud. Output: triage table + suggested order of operations. Provenance rule (also folded into `/plan`): any plan spawned from triage MUST link every inspiring PR/branch and describe where the existing implementation lives before proposing the next one.

## Slice 8 — CLAUDE.md Preferences + `.claude/commands/kickoff.md` Phase 5

CLAUDE.md Preferences stub (inserts at the :69–70 `[TODO]` stub): `- Glossary — evaluative terms and what they mean here (e.g., "done", "clean", "taste", "good enough"), so task descriptions and routing rules interpret consistently. [TODO — populate during /kickoff]`
Kickoff Phase-5 question — appends as question 6 after :242, matching the numbered double-quoted format: *"Any evaluative words you use a lot that you'd want defined so the agent reads them the way you mean them? (e.g., what 'clean', 'taste', or 'good enough' means to you.) These sharpen task instructions and model-routing rules."* The answer flows to both the CLAUDE.md Preferences glossary line and the Phase-5 `project_preferences.md` seed (kickoff.md:516–533).
