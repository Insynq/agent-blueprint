# Spec: v0.3.0 — Decision discipline & phase closure (sister-framework intake)

> **Status: LOCKED 2026-06-01** — `/plan-review` complete; all decisions resolved (top decisions table rows 1–11; §8 lists the originally-open items now closed). Dogfoods the C2 convention this spec introduces.

- **Status:** LOCKED 2026-06-01 (was: Draft)
- **Date:** 2026-06-01
- **Type:** Framework improvement (orchestration commands + workflow doc + spec template + KBs)
- **Source:** Patterns from a sister app-focused framework retro (forwarded by the user). Adopted as **raw material reframed for headless agents**, not drop-in. See [§9 Attribution](#9-attribution--licensing).
- **Consumed by:** `/plan-review` (gap analysis), then `/implement`.

### Decisions confirmed (dogfooded — uses the new table format C4 introduces)

| # | Decision | Choice | Reasoning | Date |
|---|---|---|---|---|
| 1 | Ship path | Author here → release `v0.3.0` → `/update-framework` downstream | Same pattern as v0.2.0; framework-layer changes always land canonically first | 2026-06-01 |
| 2 | Release packaging | Bundle all 4 adapts + the reference-patterns capture as one `v0.3.0` "Decision discipline & phase closure" | The 4 adapts reinforce a single loop (surface decisions early → lock before dispatch → reflect after ship); splitting them ships the decisions table without the gate that makes it load-bearing | 2026-06-01 |
| 3 | LESSONS.md seeding | **Do NOT seed canonical `LESSONS.md`** with the 6 reframed entries — captured as reference patterns in this spec instead | Reading the file revealed it is explicitly a starter-empty template ([LESSONS.md:9](docs/LESSONS.md#L9)) — seeding it would directly contradict its documented design intent | 2026-06-01 |
| 4 | Architect role shape | Collapse "Architect" into PM's pre-dispatch responsibilities — do **not** add a separate role | Agent-blueprint already does this work inside `/orchestrate` Phases 2–3; three-role handoff (Architect → PM → Worker) adds cognitive overhead for headless agents without UI-deliverable distinctions | 2026-06-01 |
| 5 | Spec-lockdown shape | Fold into `/plan-review` as a new final step — do **not** add a standalone `/lockdown` command | `/plan-review` already runs pre-implementation and surfaces decision gaps; adding a Step 6 checkpoint reinforces existing discipline rather than introducing a new command | 2026-06-01 |
| 6 | `/retro` timing | Phase 10.5 — **post-`/ship`**, retroactive, non-blocking | Per the workflow synthesizer: don't gate ship cadence on retros; retroactive capture is the habit | 2026-06-01 |
| 7 | `/retro` input strategy | Best-effort: read worker docs + git log + smokes + the implemented spec doc; produce a lighter retro if the phase didn't go through `/orchestrate` | `/plan-review` found phase-plan.md has no canonical decisions-table section and CHANGELOG.md has no per-phase format. Best-effort avoids requiring schema changes; decisions are read from the spec doc (where C4's table lives anyway) | 2026-06-01 |
| 8 | §7 ARCH-4 disposition | **Drop** — §7 becomes 5 reframed patterns | `/plan-review` found ARCH-4 (signal-driven feature gating) is already canonical in `OC_KB_02_Skills.md` via the v0.2.0 WHEN-not-WHAT description rule. Keeping it duplicates guidance | 2026-06-01 |
| 9 | `docs/retros/` directory creation | Runtime `mkdir` inside `/retro` | Self-healing, zero bootstrap, no canonical artifact needed | 2026-06-01 |
| 10 | KB_1 manifest action | Change `default_action_on_conflict` for `docs/KB_1_Architecture.md` from `"skip"` to `"sibling"` | Currently `"skip"` means adopters' customized KB_1 never receives the new decisions-table skeleton via `/update-framework`. `"sibling"` matches the `CLAUDE.md` model — adopters get a `.new` for manual merge | 2026-06-01 |
| 11 | `phase-retro-template.md` location | **`_dev/phase-retro-template.md`** (hybrid), NOT `docs/` | Precedent: every framework-owned template (`_dev/skill-template.md`, `_dev/agent-improvement-spec-template.md`) lives in `_dev/`. `docs/` would be uncategorized → wouldn't propagate to adopters via `/update-framework` | 2026-06-01 |

*All decisions resolved (§8 was "Open decisions"; closed by `/plan-review` 2026-06-01).*

---

## 0. TL;DR for reviewers

A sister app-focused framework's phase-9 retro surfaced six framework-level patterns. `/plan-review` against an earlier intake report (a workflow invocation, 2026-06-01) returned: **0 adopt, 4 adapt, 2 reject** — every "process" pattern is already partially encoded in agent-blueprint under different names. The four adapts reinforce one loop:

1. **Architect-in-PM** — name the PM's pre-dispatch responsibilities (research → options → decision capture) that already happen inside `/orchestrate` Phases 2–3. No new role, no new command.
2. **Spec-lockdown checkpoint** — fold into `/plan-review` as a Step 6 verifying the spec has no remaining forks before implementation. Adds `Status: LOCKED YYYY-MM-DD` header.
3. **`/retro` skill** — the only genuinely new command. Phase 10.5, post-`/ship`, retroactive. Reads phase artifacts → produces a structured retro doc.
4. **Decisions log table** — upgrade `_dev/agent-improvement-spec-template.md` Section 1 from bullets to a required `Decision | Choice | Reasoning | Date` table (this spec dogfoods the format).

Plus a **reference-patterns capture** of five reframed sister-framework lessons (ARCH-3, ARCH-8, PROC-1, PROC-2, PROC-3) — see [§7](#7-reference-patterns-capture-not-seeded-into-lessonsmd). ARCH-4 was originally in scope but `/plan-review` found it already canonical in [OC_KB_02_Skills.md](docs/OpenClaw%20KBs/OC_KB_02_Skills.md) (the v0.2.0 WHEN-not-WHAT rule *is* signal-driven feature gating); dropped to avoid duplication.

Rejected: **mockup harness with persona switcher** (UI-specific; agent-blueprint builds headless agents, and `/brainstorm` Phase 2.5 ASCII mockups already cover the multi-option comparison need). Dropped: **ARCH-4** (already canonical, see above), **ARCH-5, ARCH-6, ARCH-7** (UI-pattern-specific).

> This repo is canonical `@insynq/agent-blueprint` (currently v0.2.0). All four changes are framework-layer, propagating to installed agents via `/update-framework`. See [§11 Propagation & release](#11-propagation-release--downstream-update).

---

## 1. Motivation — the single loop these four reinforce

The four changes are not independent. They reinforce one loop:

```
surface decisions early   →   lock them before dispatch   →   reflect after ship
   (architect-in-PM)            (lockdown checkpoint)          (/retro)
            ↓                           ↓                            ↓
       decisions table             decisions table                feeds LESSONS
       (created in spec)           (verified complete)            (project-owned)
```

The **decisions table** is the load-bearing artifact. Architect-in-PM creates it; lockdown verifies it; `/retro` references it when assessing close-calls. Ship the decisions-table format without the lockdown gate and the table becomes optional. Ship the lockdown gate without `/retro` and you lose the feedback signal that says "this decision actually mattered." All four together close the loop.

---

## 2. Scope

### In scope
The four adapts above (§3–§6) and a reference-patterns capture (§7) covering six reframed sister-framework lessons.

### Out of scope

- **Mockup harness with persona switcher** — rejected as wrong-fit. Agent-blueprint builds headless agents. `/brainstorm` Phase 2.5 ASCII mockups + `/visualize` already cover the multi-option comparison need.
- **Standalone `/architect` command** — collapsed into PM pre-dispatch responsibilities.
- **Standalone `/lockdown` command** — folded into `/plan-review` Step 6.
- **ARCH-5, ARCH-6, ARCH-7** — UI-pattern-specific lessons (HTML mockups, empty states, action-on-self-vs-other CRUD semantics). Do not transfer to headless agents.
- **Seeding `docs/LESSONS.md`** with reframed entries — would violate its starter-empty design intent ([LESSONS.md:9](docs/LESSONS.md#L9)). Reframed patterns live in §7 of this spec instead.

---

## 3. Change 1 — Name PM Pre-Dispatch Responsibilities (architect-in-PM)

### Current state
- [.claude/commands/orchestrate.md](.claude/commands/orchestrate.md) Phases 1–3 already do architect work: pivot review (Phase 1), `/brainstorm` to generate codebase-grounded options (Phase 2), holistic plan + `/audit-code` (Phase 3). The work happens, but is never **named** as "architect responsibilities" or as a distinct pre-dispatch phase boundary.
- [docs/MULTI_AGENT_WORKFLOW.md](docs/MULTI_AGENT_WORKFLOW.md) describes the same phases but in workflow-prose form. No explicit "before dispatching workers, the PM must own X, Y, Z" enumeration.
- [.claude/commands/brainstorm.md](.claude/commands/brainstorm.md) is the actual architect-phase tool but isn't framed that way — its prompt calls it "senior architect + product designer" inline ([brainstorm.md:28](.claude/commands/brainstorm.md#L28)) without connecting to the broader workflow role.
- The sister framework's three-layer model (Architect → PM → Workers) implies a separate role with separate deliverables (specs + mockups). For headless agents, no UI deliverable exists, and the "Architect" responsibilities are exactly what `/orchestrate` Phases 1–3 already do.

### Gap
The work is invisible as a distinct concept. New PMs (human or LLM) reading `MULTI_AGENT_WORKFLOW.md` see "Phase 2: brainstorm, Phase 3: plan + audit" without understanding *why* those phases exist before dispatch. When pressure mounts to "just get workers started," the unnamed pre-dispatch phase is the first thing to get skipped — leading to the (a)/(b)/(c) forks the workflow synthesizer identified.

### Proposed change

*Phase-boundary clarification (from `/plan-review`):* Phase 4 is where workers are first dispatched, so Phases 1–3 are clearly pre-dispatch. **Phase 6 (PM reconciliation) is a gray zone** — workers have been dispatched and have reported audits, but the PM is still editing worker plan docs before workers begin implementation in Phase 7. The "pre-dispatch architect" framing applies cleanly to Phases 1–3; the framing for Phase 6 is "PM-prep-after-dispatch" and is best treated as part of dispatch hygiene rather than pre-dispatch.

1. **`docs/MULTI_AGENT_WORKFLOW.md`** — add a new "PM Pre-Dispatch Responsibilities" subsection inside Phase 2 or just before Phase 4 (dispatch). Enumerate:
   - Research the codebase context (Phase 2 brainstorm + investigate if needed).
   - Generate and compare options (`/brainstorm` produces grounded alternatives).
   - Capture every architectural decision in a **decisions table** (using the C4 format) in `phase-plan.md`.
   - Audit the resulting plan against existing patterns (Phase 3 `/audit-code`).
   - Verify no unresolved forks remain (the C2 lockdown check sits here).
2. **`.claude/commands/orchestrate.md`** — add a one-line header before Phase 1 noting that Phases 1–3 are the PM's pre-dispatch (architect) phase and must complete before any worker dispatch.
3. **`.claude/commands/brainstorm.md`** — small note at the top tying it explicitly to the PM's pre-dispatch responsibilities (so a PM reading brainstorm knows it's *the* architect-phase tool, not a side trip).
4. **`CLAUDE.md` Patterns section** — add a line: "PM owns architectural decisions before worker dispatch (Phases 1–3 of `/orchestrate`). Workers receive locked plans, not forks."

### Files touched
- [docs/MULTI_AGENT_WORKFLOW.md](docs/MULTI_AGENT_WORKFLOW.md) — new "PM Pre-Dispatch Responsibilities" subsection.
- [.claude/commands/orchestrate.md](.claude/commands/orchestrate.md) — header note before Phase 1.
- [.claude/commands/brainstorm.md](.claude/commands/brainstorm.md) — tie to pre-dispatch role.
- [CLAUDE.md](CLAUDE.md) — Patterns section note.

### Risk
Low. Naming and framing only — no behavior change. Additive headers.

### Acceptance criteria
- `MULTI_AGENT_WORKFLOW.md` enumerates PM pre-dispatch responsibilities as a named subsection.
- `orchestrate.md` Phases 1–3 are explicitly labeled as the pre-dispatch (architect) phase.
- `brainstorm.md` references its role as the pre-dispatch tool.
- `CLAUDE.md` Patterns includes the "PM owns architectural decisions before dispatch" line.

---

## 4. Change 2 — Spec-lockdown checkpoint inside `/plan-review`

### Current state
- [.claude/commands/plan-review.md](.claude/commands/plan-review.md) ends at Step 5 ("Update the Spec") followed by an "Important" rules block. No final lockdown gate.
- The command surfaces gaps and decisions (Step 3f "Decision Points") and asks the user to resolve them (Step 4), then records resolutions in the spec (Step 5). But it does not require *all* forks be resolved before declaring the spec ready.
- No convention for marking a spec as "locked" — adopters can't tell at a glance whether a spec has been through `/plan-review` and had all forks resolved, vs. a draft.

### Gap
"Substantially rewritten when design changed" (sister framework's incident) maps directly to "started implementing before all forks were resolved." The current `/plan-review` flow surfaces decisions but does not enforce closure.

### Proposed change
1. **`.claude/commands/plan-review.md`** — add a new **Step 6: Lockdown Check** between Step 5 and "## Important":
   - Scan the spec for unresolved forks (any `[TODO decision]`, `or`, `(a)/(b)/(c)` patterns, or "open decision" mentions without a confirmed answer).
   - Verify the decisions table (per C4 format) has at least one row per fork raised in conversation.
   - Verify a brainstorm trace / investigation log / source-of-evidence is cited for each decision (the headless equivalent of sister framework's "user clicked through the mockup" — the artifact that grounds the decision).
   - On pass, prepend a `> **Status: LOCKED YYYY-MM-DD**` header to the spec file.
   - On fail, list the unresolved items and stop. Do not write the LOCKED header.
2. **`docs/MULTI_AGENT_WORKFLOW.md`** — note the lockdown convention in Phase 6 (PM reconciliation): worker plan docs that descend from a LOCKED spec can be dispatched; specs without LOCKED headers cannot.
3. **`CLAUDE.md` Patterns section** — add a line: "Spec docs become implementable once `/plan-review` writes a `Status: LOCKED YYYY-MM-DD` header. Drafts without the header are exploratory only."

### Files touched
- [.claude/commands/plan-review.md](.claude/commands/plan-review.md) — new Step 6.
- [docs/MULTI_AGENT_WORKFLOW.md](docs/MULTI_AGENT_WORKFLOW.md) — Phase 6 lockdown convention note.
- [CLAUDE.md](CLAUDE.md) — Patterns section.

### Risk
Low–Medium. The LOCKED header is procedural (Markdown text, not a tooling gate). Risk: PMs ignore it. Mitigation: `/orchestrate` Phase 6 (or `/implement` Step 1) can grep for the header and refuse to dispatch otherwise. *This enforcement question is an open decision — see §8.*

### Acceptance criteria
- `/plan-review` Step 6 exists and runs after Step 5.
- A spec passing Step 6 receives a `Status: LOCKED YYYY-MM-DD` header.
- A spec failing Step 6 surfaces unresolved items and does not get the header.
- `MULTI_AGENT_WORKFLOW.md` and `CLAUDE.md` document the convention.

---

## 5. Change 3 — `/retro` phase-closure skill

### Current state
- [docs/LESSONS.md](docs/LESSONS.md) exists as a starter-empty template. Projects accumulate entries during development. There is no command that *generates* candidate entries — they accumulate ad-hoc.
- [docs/MULTI_AGENT_WORKFLOW.md](docs/MULTI_AGENT_WORKFLOW.md) Phase 10 ends at `/ship`. No retro step.
- [docs/OpenClaw KBs/OC_KB_13_Self_Improvement_Loops.md](docs/OpenClaw%20KBs/OC_KB_13_Self_Improvement_Loops.md) describes an *aspirational* runtime self-retro (cron-driven, agent-side, reads gateway logs). That is **agent-runtime** retro — for the deployed agent reviewing its own behavior weekly. The sister framework's pattern is **dev-phase** retro — for the team reviewing a development phase post-ship. The two are complementary, not duplicative.
- `/changelog` generates changelog entries from git history but does not capture process lessons or close-calls.

### Gap
Phase 9's reframed lessons in the sister framework are exactly the kind of pattern that should accumulate in `LESSONS.md` — *if* there's a habit that surfaces them. Today there isn't. Lessons that should land in `LESSONS.md` instead stay in the PM's head and decay.

### Proposed change

1. **New file: `.claude/commands/retro.md`** — `/retro [phase-slug]` (default: most recent phase). **Best-effort input strategy** (per `/plan-review` decision 7): read whatever exists, produce a correspondingly-detailed retro. Don't fail on missing artifacts. Action: spawn an `Explore` agent that reads, in priority order:
   - **The implemented spec doc** (`docs/<phase-slug>-spec.md` or whatever the phase shipped from) — this is the canonical home for the **decisions table** (per C4); the previous draft of this spec assumed decisions lived in `phase-plan.md`, but `/plan-review` found phase-plan.md has no canonical decisions section. Read decisions from the spec instead.
   - All `docs/plans/[phase-slug]/worker-N-*.md` if they exist (implementation logs, completion notes — section names `Implementation log` and `Completion notes` verified canonical). Missing for phases that went through `/implement` directly (e.g., v0.2.0); skip in that case.
   - `docs/smoke-tests-pending.md` (smokes added during this phase, filtered by ID prefix `<phase-slug>-`)
   - `git log` for the phase's commit range (commit messages, file counts)
   - `docs/CHANGELOG.md` if a parseable per-phase section exists (don't depend on it — format is currently undefined)

   **Pre-flight:** `mkdir -p docs/retros/` if the directory doesn't exist. Self-heal — no canonical `.gitkeep` needed.

   Output: a structured retro doc at `docs/retros/[phase-slug]-retro.md` covering:
   - **What worked** — patterns/tools that paid off
   - **Harder than expected** — items that took longer or surfaced unforeseen depth
   - **Close-calls** — things that almost shipped wrong (caught by smoke / `/audit-code` / user review)
   - **Lessons** — candidate `LESSONS.md` entries with proposed `[CATEGORY-N]` tags (PM decides which to commit)
   - **Tools to build** — friction worth a future framework change
   - **TL;DR recipe** — 2–3 sentences distilling the phase
   - **Inputs available / inputs missing** — explicit note of which artifacts were present (so the retro's depth is auditable; phases that bypassed `/orchestrate` produce a lighter retro and the reader knows why)

2. **New file: `_dev/phase-retro-template.md`** — the section skeleton `/retro` fills in. Lives in `_dev/` (hybrid) matching the precedent of [_dev/skill-template.md](_dev/skill-template.md) and [_dev/agent-improvement-spec-template.md](_dev/agent-improvement-spec-template.md). This ensures the template propagates to installed agents via `/update-framework` (as a `.new` sibling for manual merge). Previous draft put it in `docs/` (uncategorized → wouldn't propagate); corrected per `/plan-review` decision 11.

3. **`docs/MULTI_AGENT_WORKFLOW.md`** — add Phase 10.5 (between Phase 10 ship and "Worker plan docs"): "PM runs `/retro [phase-slug]` retroactively, post-ship. Output is non-blocking — review at next session start or before kicking off the next phase."

4. **`.claude/commands/orchestrate.md`** — note `/retro` as the optional post-ship habit (Step 11 or appended to Step 10).

### Files touched
- `.claude/commands/retro.md` — **NEW**.
- `_dev/phase-retro-template.md` — **NEW** (relocated from `docs/` per `/plan-review`).
- [docs/MULTI_AGENT_WORKFLOW.md](docs/MULTI_AGENT_WORKFLOW.md) — Phase 10.5.
- [.claude/commands/orchestrate.md](.claude/commands/orchestrate.md) — post-Step 10 note.

### Risk
Low. Additive new skill + workflow expansion. Non-blocking by design (post-ship). The retro doc can be skipped on small phases without consequence — habit, not gate.

### Acceptance criteria
- `/retro` exists and produces a structured doc at `docs/retros/<phase-slug>-retro.md`.
- The doc covers all six sections (worked / harder / close-calls / lessons / tools / TL;DR).
- `MULTI_AGENT_WORKFLOW.md` documents Phase 10.5.
- Candidate `LESSONS.md` entries are proposed with `[CATEGORY-N]` tags but **not** auto-committed (PM decides per entry).

---

## 6. Change 4 — Decisions log table format (upgrade)

### Current state
- [_dev/agent-improvement-spec-template.md](_dev/agent-improvement-spec-template.md) Section 1 ("Confirmed Decisions") currently uses bullet format ([lines 29–30](_dev/agent-improvement-spec-template.md#L29-L30)):
  ```
  - [TODO decision] — confirmed YYYY-MM-DD
  - [TODO decision] — confirmed YYYY-MM-DD
  ```
- [docs/KB_1_Architecture.md](docs/KB_1_Architecture.md) has an "Architecture Decisions" section ([line 17](docs/KB_1_Architecture.md#L17)) that is currently `[Empty — add decisions here as they're made during development]` with no format guidance.
- The `superpowers-adoption-spec.md` (shipped in v0.2.0) uses a numbered-bullets-with-reasoning pattern — works but isn't scannable as a table.

### Gap
Bullets don't enforce columns. A decisions-table format (`Decision | Choice | Reasoning | Date`) makes each decision scannable and forces the architect to fill every column. The empty table heading itself is the discipline.

### Proposed change
1. **`_dev/agent-improvement-spec-template.md`** — replace Section 1 bullet skeleton with a required table:
   ```
   | # | Decision | Choice | Reasoning | Date |
   |---|---|---|---|---|
   | 1 | [TODO decision] | [TODO choice] | [TODO reasoning] | YYYY-MM-DD |
   | 2 | [TODO decision] | [TODO choice] | [TODO reasoning] | YYYY-MM-DD |
   ```
   Backward-compatible: existing specs with bullet format remain valid; the table is for **new** specs.
2. **`docs/KB_1_Architecture.md`** — replace the empty placeholder under "Architecture Decisions" with the table skeleton + a one-line instruction.
3. **`.framework-manifest.json`** — change `default_action_on_conflict` for `docs/KB_1_Architecture.md` from `"skip"` to `"sibling"` (per `/plan-review` decision 10). Without this, adopters' customized `KB_1` never receives the new decisions-table skeleton via `/update-framework`; with it, adopters get a `.new` sibling for manual merge — matching the `CLAUDE.md` model.
4. **`CLAUDE.md` Patterns section** — add a line: "Spec docs and KB_1 record architectural decisions in `Decision | Choice | Reasoning | Date` table format (per `_dev/agent-improvement-spec-template.md` §1)."
5. **`.claude/commands/plan-review.md` Step 6 (from C2)** — verifies the decisions table has at least one row per fork raised.

### Files touched
- [_dev/agent-improvement-spec-template.md](_dev/agent-improvement-spec-template.md) — Section 1.
- [docs/KB_1_Architecture.md](docs/KB_1_Architecture.md) — Architecture Decisions section.
- [CLAUDE.md](CLAUDE.md) — Patterns section.

### Risk
Low. Template change only. Existing specs untouched.

### Acceptance criteria
- `_dev/agent-improvement-spec-template.md` Section 1 uses a required table.
- `KB_1_Architecture.md` Architecture Decisions uses the same format.
- `CLAUDE.md` documents the convention.
- *This spec itself* uses the new table at the top — dogfooded.

---

## 7. Reference-patterns capture (NOT seeded into `LESSONS.md`)

> **Why not seeded:** [docs/LESSONS.md:9](docs/LESSONS.md#L9) is explicitly a starter-empty template: *"The framework ships with this file empty so that lessons accumulate from your own incidents rather than carrying app-specific lessons from another project."* Seeding it with the sister framework's reframed lessons would directly contradict that design. The patterns below are captured here as **reference content** that adopters may consult and selectively copy into their own `LESSONS.md` if and when matching incidents surface in their projects.

The **five** sister-framework lessons reframed for agent-blueprint context (originally six; ARCH-4 dropped per `/plan-review` decision 8 — it's already canonical in [OC_KB_02_Skills.md](docs/OpenClaw%20KBs/OC_KB_02_Skills.md) via the v0.2.0 WHEN-not-WHAT description rule):

### [ARCH-3] Capability ≠ default responsibility
**Rule:** Exposing an MCP tool to a skill (or a skill to the router) does not mean the skill should *default* to using the tool / the router should *default* to invoking the skill. Capability = "may"; responsibility = "should." Keep them distinct.
**Reframe from app context:** Sister framework's pattern was about RBAC capabilities not implying default UI actions. Same shape: in MCP terms, registering `gmail_send` in `mcporter.json` doesn't mean every skill with that registration should default to sending email — the skill's *Workflows* section decides.
**How to apply:** When auditing a skill that references a new MCP tool, ask "does this skill *default* to invoking the tool, or only when explicitly triggered?"

### [ARCH-8] Architecture lockdown BEFORE PM dispatch
**Rule:** No worker dispatch until the spec is `Status: LOCKED YYYY-MM-DD` (per C2) — every architectural fork raised in conversation has a confirmed answer in the decisions table.
**Reframe from app context:** Universal — applies cleanly. This pattern is the direct motivator for C2 (lockdown checkpoint).
**How to apply:** In `/orchestrate` Phase 6 (PM reconciliation), verify each worker plan doc descends from a LOCKED spec before dispatch.

### [PROC-1] "Talk it out" before any docs
**Rule:** When in brainstorm/architect mode, do not write a spec until the decision space has been talked through. Premature spec-writing locks in a fork that hasn't been fully explored.
**Reframe from app context:** Universal — applies to any multi-agent workflow.
**How to apply:** Use `/brainstorm` to surface options first. Only invoke `/plan` or write a `*-spec.md` after the conversation has converged on a direction.

### [PROC-2] Git commits as conversation checkpoints
**Rule:** Commit at every meaningful state transition (phase boundary, decision finalized, sub-task completed). Commits are durable state that survives context compaction; a clean working tree is recoverable, a dirty one with no checkpoints is not.
**Reframe from app context:** Universal — applies to any long agent dev session.
**Explicit cadence** (per `/plan-review` finding F — the original draft was abstract): commit at *each* of these triggers, whichever comes first —
- Every `/orchestrate` phase boundary (Phase 3 → 4, Phase 8 → 9, Phase 10 → 10.5, etc.).
- Every worker completion (worker reports `Implementation log` complete).
- Every architectural decision finalized (a row added to the decisions table).
- Every `/plan-review` Step 6 `Status: LOCKED` write.
- A 30-minute soft ceiling between commits inside long-running phases.

**How to apply:** When in doubt, commit. The cost of an extra commit is negligible; the cost of losing state to context compaction or a wrong-turn is large.

### [PROC-3] When all options feel meh, the framing is wrong — back up
**Rule:** If every option surfaced by `/brainstorm` feels unconvincing, the problem statement (not the options) is the issue. Back up to Phase 1 (pivot review) and re-frame.
**Reframe from app context:** Universal — applies to any architectural decision.
**How to apply:** In `/orchestrate` Phase 2, if the user rejects all generated options without picking a refinement direction, return to Phase 1 rather than generating more options at the same framing.

### What is *not* captured here
- **ARCH-4 (signal-driven feature gating)** — already canonical in [OC_KB_02_Skills.md](docs/OpenClaw%20KBs/OC_KB_02_Skills.md) via the v0.2.0 WHEN-not-WHAT description rule. Capturing it again here would duplicate guidance.
- **ARCH-5, ARCH-6, ARCH-7** — UI-pattern-specific (mockup tooling, empty states, action-on-self-vs-other CRUD semantics). Headless agents have no UI surface; these do not transfer.

---

## 8. Resolved decisions (was: open — closed by `/plan-review` 2026-06-01)

All originally-open items are resolved per the recommendations stated when the spec was drafted. The four `/plan-review` findings that opened new questions are resolved in the top decisions table (rows 7–11).

1. **C2 enforcement strength → convention-first.** `Status: LOCKED YYYY-MM-DD` ships as advisory in v0.3.0. Revisit gating (`/implement` refusing to dispatch without the header) in a later release after observing whether PMs honor it.
2. **C3 `/retro` invocation → optional/manual.** PM invokes after `/ship`; not auto-wired. Retros work best when intentional. Auto-wiring revisitable if the habit doesn't stick.
3. **C4 decisions-table backward-compatibility → grandfather.** This spec dogfoods the new format. Existing specs (`superpowers-adoption-spec.md`) stay in their bullet form. New specs use the table.
4. **§7 reference-patterns location → stay-in-spec.** Do not extract to `OC_KB_15` yet. Revisit if a second source of process patterns shows up; premature extraction adds taxonomy noise.

(See top decisions table, rows 7–11, for the `/plan-review`-surfaced resolutions: `/retro` best-effort inputs, ARCH-4 drop, `docs/retros/` runtime mkdir, KB_1 manifest change, template location in `_dev/`.)

---

## 9. Attribution & licensing

The four adapts and six lessons originate from a sister app-focused framework's phase-9 retro (forwarded by the user 2026-06-01). All patterns are **reframed for headless agent context** — no text is copied verbatim. The sister framework's author offered to provide drop-in artifact drafts (`/architect`, mockup harness, `/lockdown`, `/retro` skill prompts, LESSONS entries); the workflow synthesis verdict was that those drafts are **raw material to reframe**, not drop-in — reflected in every change above.

---

## 10. Consolidated file-touch map

The **manifest category** column determines how each change reaches a downstream installed agent via `/update-framework` (see [§11](#11-propagation-release--downstream-update)).

| File | Change | Manifest category → downstream behavior | Risk |
|------|--------|------------------------------------------|------|
| [docs/MULTI_AGENT_WORKFLOW.md](docs/MULTI_AGENT_WORKFLOW.md) | C1: PM Pre-Dispatch Responsibilities subsection; C2: Phase 6 lockdown convention; C3: Phase 10.5 retro | framework-managed → overwrite-with-backup | Med |
| [.claude/commands/orchestrate.md](.claude/commands/orchestrate.md) | C1: pre-dispatch header before Phase 1; C3: post-Step 10 retro note | framework-managed → overwrite-with-backup | Low |
| [.claude/commands/brainstorm.md](.claude/commands/brainstorm.md) | C1: tie to PM pre-dispatch role | framework-managed → overwrite-with-backup | Low |
| [.claude/commands/plan-review.md](.claude/commands/plan-review.md) | C2: new Step 6 Lockdown Check | framework-managed → overwrite-with-backup | Low |
| `.claude/commands/retro.md` | C3: **NEW** | framework-managed → auto-discovered (no manifest edit needed) | Low |
| `_dev/phase-retro-template.md` | C3: **NEW** (relocated from `docs/` per `/plan-review` decision 11) | hybrid (`_dev/`) → `.new` sibling, manual merge — matches `_dev/skill-template.md` precedent so the template propagates | Low |
| [CLAUDE.md](CLAUDE.md) | C1/C2/C4: Patterns-section notes | hybrid → `.new` sibling, manual merge | Low |
| [_dev/agent-improvement-spec-template.md](_dev/agent-improvement-spec-template.md) | C4: Section 1 bullets → table | hybrid (`_dev/`) → `.new` sibling, manual merge | Low |
| [docs/KB_1_Architecture.md](docs/KB_1_Architecture.md) | C4: Architecture Decisions table skeleton | hybrid → `.new` sibling, manual merge **(after manifest update below)** | Low |
| `.framework-manifest.json` | C4 (per `/plan-review` decision 10): change `default_action_on_conflict["docs/KB_1_Architecture.md"]` from `"skip"` to `"sibling"`; also release plumbing version bump | framework-managed | Low |
| `FRAMEWORK_CHANGELOG.md` + `package.json` | Release plumbing (§11) | framework-managed | Low |
| [docs/sister-framework-adoption-spec.md](docs/sister-framework-adoption-spec.md) (this doc) | — | uncategorized in `docs/` → **does NOT propagate** (stays canonical-only) | — |

**Note:** [docs/LESSONS.md](docs/LESSONS.md) is **not in the file-touch map** — see [§7](#7-reference-patterns-capture-not-seeded-into-lessonsmd) for the rationale (starter-empty design intent).

---

## 11. Propagation, release & downstream update

Same shape as `superpowers-adoption-spec.md` §11. Summary:

### 11.1 Release path
1. Implement the four changes + §7 reference capture here.
2. Add a `## [0.3.0] - 2026-06-01` section to `FRAMEWORK_CHANGELOG.md`:
   - `### Added` — `/retro` command, `_dev/phase-retro-template.md`, decisions-table format in spec template + KB_1, lockdown checkpoint in `/plan-review`, PM pre-dispatch responsibilities subsection in `MULTI_AGENT_WORKFLOW.md`.
   - `### Changed` — `orchestrate.md`, `brainstorm.md`, `CLAUDE.md`, `_dev/agent-improvement-spec-template.md`.
   - `### Migration Notes` — for adopters customizing affected files: the new sections insert at stable anchors (additive); merges should be clean. Reference patterns in §7 are available for selective copy into project `LESSONS.md` if matching incidents arise.
3. Bump `version` in `package.json` and `.framework-manifest.json` (0.2.0 → 0.3.0).
4. Cut a GitHub release tagged `v0.3.0`.
5. In the installed agent repo: `/update-framework` → fetches canonical@0.3.0, presents the four-category report, applies with backups.

### 11.2 Additive-only constraint (carried forward from v0.2.0)
All edits insert at stable anchors with blank-line padding. New files (`retro.md`, `phase-retro-template.md`) are simple additions. Hybrid files (`_dev/skill-template.md` precedent from v0.2.0) arrive as `.new` siblings — manual merge for any adopter who customized them.

### 11.3 Downstream behavior summary
- **framework-managed** (`/orchestrate`, `/brainstorm`, `/plan-review`, `/retro`, `MULTI_AGENT_WORKFLOW.md`, `.framework-manifest.json`): clean propagation or three-way merge.
- **hybrid** (`CLAUDE.md`, `_dev/agent-improvement-spec-template.md`, `_dev/phase-retro-template.md`, `KB_1_Architecture.md` *after the manifest action_on_conflict update*): `.new` siblings for manual merge. **Note for adopters:** `KB_1_Architecture.md` previously had `default_action_on_conflict: "skip"` — they will receive the new decisions-table skeleton as a `.new` sibling only after the v0.3.0 manifest change lands.
- **uncategorized** (this spec doc only): stays canonical-only; does not propagate. Fresh installs and `/adopt` runs pick it up.
- **`LESSONS.md`** (project-owned): never touched. Reference patterns in §7 are documented here for adopters to consult; nothing auto-flows.

### 11.4 Validation
- **Dogfood here (required):** apply the changes in this repo and exercise `/plan-review` against this spec (Step 6 should run on it — meta-dogfood). `/retro` cannot be dogfooded against v0.2.0 (which went through `/implement`, not `/orchestrate`, so `docs/plans/` is empty per `/plan-review` Agent 2 finding #3) — instead, exercise `/retro` against the **first phase that goes through `/orchestrate` post-v0.3.0**, or run a synthetic `/orchestrate` micro-phase to generate artifacts before invoking. The best-effort input strategy (decision 7) means `/retro` will work on either.
- **Propagation smoke test (optional):** `/update-framework --dry-run` in an installed agent against v0.3.0 to confirm the four-category report classifies each file as expected — especially the new `KB_1_Architecture.md` sibling behavior.
