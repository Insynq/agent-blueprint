# Spec: Adopt four discipline techniques from `obra/superpowers`

- **Status:** Draft — pending `/plan-review`
- **Date:** 2026-05-27
- **Type:** Framework improvement (authoring commands + skill template)
- **Source:** Patterns observed in [github.com/obra/superpowers](https://github.com/obra/superpowers) (Jesse Vincent, MIT). We adopt *patterns only* — no verbatim text. See [Attribution](#attribution--licensing).
- **Consumed by:** `/plan-review` (gap analysis), then `/orchestrate` or `/implement`.

### Decisions confirmed (2026-05-27)
1. **Ship path:** Author in this canonical repo → cut a release → pull into the installed agent via `/update-framework`. *Not* hand-edited downstream.
2. **Release packaging:** One `v0.2.0` release for all four changes. Implementation includes the `FRAMEWORK_CHANGELOG.md` entry + `package.json` / `.framework-manifest.json` version bump (the "plumbing").
3. **C1 template sync:** Yes — also update `_dev/skill-template.md` for consistency, accepting the one small `.new`-sibling merge it costs adopters downstream.
4. **Validation:** Dogfood in this repo only (exercise the edited commands here). Downstream `/update-framework --dry-run` is *not* required before shipping.

**Closed by `/plan-review` (2026-05-27):**
5. **C3 placement → Option A** (inline in `/implement` + `/orchestrate`; no new command).
6. **C3 scope → skippable for trivial** changes with a `"skipped — trivial"` note.
7. **C1 enforcement → advisory** (not hard-reject).
8. **C1 coverage → also sync `OC_KB_02_Skills.md`** (review found it still carries a WHAT-phrased example).
9. **C4 strike counter → outer command loop** (review found a fresh subagent can't persist the count).

See [§7 Resolved decisions](#7-resolved-decisions-was-open--closed-by-plan-review-2026-05-27) for the evidence behind each.

---

## 0. TL;DR for reviewers

`superpowers` is a methodology layer for coding agents built from composable `SKILL.md` modules. Its *workflow shape* (brainstorm → plan → subagent execution → review → ship) already exists in agent-blueprint via `/orchestrate` and the command suite. The transferable value is in **four discipline-enforcement techniques** baked into its individual skills that agent-blueprint's equivalents currently lack:

1. **`description` states WHEN, not WHAT** + skill-as-test framing → harden `/gen-skill` and `_dev/skill-template.md`.
2. **Rationalization-guard tables** (`Excuse | Reality`) → add to `/debug` and `/implement`.
3. **Two-stage review** — spec-compliance gate *before* quality review → add a compliance stage to `/implement` + `/orchestrate` Phase 8; reframe `/audit-code` as the quality stage.
4. **Three-strikes circuit breaker** — after 3 failed fixes, stop and question the architecture → add to `/debug`.

All four are low-risk, additive edits to existing markdown command files. No runtime/MCP/deploy changes. All design decisions resolved (see [§7](#7-resolved-decisions-was-open--closed-by-plan-review-2026-05-27)); ready to implement.

> **This repo IS canonical `@insynq/agent-blueprint`.** These are *framework-layer* changes authored here and propagated to installed agents via `/update-framework` — not hand-edited downstream. See [§11 Propagation & release](#11-propagation-release--downstream-update).

---

## 1. Motivation

These four techniques target failure modes agent-blueprint commands are individually strong against but don't *enforce*:

- The router scans skill `description`s on every prompt; a description that paraphrases the *workflow* lets the model act on the summary instead of reading the skill body. `/gen-skill` currently validates that a description is specific, but not that it describes a *trigger condition* vs. a *behavior*.
- Discipline-enforcing commands (`/debug`, `/implement`) rely on prose instructions ("don't write code first"). superpowers' insight is that agents talk *themselves* out of discipline with predictable rationalizations, and a short `Excuse | Reality` table pre-empts each one far more reliably than prose.
- `/audit-code` reviews elegance/reuse/security but never asks the prior question: *did the implementation build exactly what the plan specified — no gaps, no extras?* "Works but wrong thing" passes a quality review.
- `/debug` is rigorously root-cause-first but has no explicit stop condition for thrash. superpowers' rule: 3 failed fixes means the *assumptions* are wrong, not the fix.

---

## 2. Scope

### In scope (this spec)
The four changes above, applied to existing command/template markdown files.

### Out of scope
- **Git worktrees / branch-completion / RED-GREEN-REFACTOR for production code** — superpowers' coding-agent-dev machinery. agent-blueprint agents run in the OpenClaw gateway and ship via `git push` webhook; this doesn't map.
- **The "1% rule" skill-invocation enforcer** (`using-superpowers`) — designed for harnesses where skills aren't reliably surfaced. Claude Code injects the skill list and routes natively, so a heavy meta-skill is redundant. (The rationalization-table idea *from* it is captured in Change 2.)
- **Spec self-review gates** (placeholder/consistency/scope/ambiguity scan before spec handoff) — a 5th candidate floated during review. Genuinely useful but deferred; see [§8 Deferred](#8-deferred--candidates).

---

## 3. Change 1 — `/gen-skill`: description WHEN-not-WHAT + skill-as-test framing

### Current state
[.claude/commands/gen-skill.md](.claude/commands/gen-skill.md):
- **Step 2** (lines 51–68) validates the description: 10–200 chars, single line, rejects `"does stuff"` / `"helps with"`, wants a "specific verb + domain noun."
- The skeleton frontmatter (line 87) emits `description: <description>` with no guidance comment.
- Confirmation (line 134) prints `✓ description is specific (not "does stuff")`.
- **Important rule #4** (line 153): `/gen-skill` is a *scaffold, not a content generator* — sections get `[TODO]`, not synthetic content.

Related description guidance also lives in (verified by `/plan-review` investigation):
- [_dev/skill-template.md](_dev/skill-template.md) line 3 (`Single sentence describing what this skill does and when to use it`) and line 14 (`The description is what the router scans...`).
- [workspace/skills/README.md](workspace/skills/README.md) — currently covers name/`user-invokable` only, **not** description.
- **[docs/OpenClaw KBs/OC_KB_02_Skills.md](docs/OpenClaw%20KBs/OC_KB_02_Skills.md)** — the authoritative skills KB. Lines 32, 41, 96, 147, 157 give description guidance, and **line 96 carries a WHAT-phrased example** (`description: Does X for Y users when they ask about Z`). Leaving it un-synced contradicts C1. *Uncategorized → canonical-only (does not propagate via `/update-framework`), so it's a docs-only pass in this repo.*
- [debug.md:95-102](.claude/commands/debug.md#L95-L102) — skill-routing diagnostics mention description quality, but the phrasing is general ("specific enough to match the user's phrasing") and needs **no change** (no contradiction).

### Gap
"Specific" is necessary but not sufficient. A specific description can still describe *what the skill does* (`"Triages incoming email and summarizes urgent items"`) rather than *when to invoke it* (`"Use when the user asks to process, sort, or summarize their inbox"`). The router matches on the description; a WHAT-phrased description competes with the skill body for the model's attention.

### Proposed change
1. **Step 2 (gen-skill.md):** add a WHEN-not-WHAT check. The description should answer *"when should the router pick this?"* Reframe the good/bad examples:
   - Good (WHEN): `"Use when the user asks to triage, sort, or summarize their inbox."`
   - Weak (WHAT): `"Triages incoming email and summarizes urgent items."`
   - Bad (vague): `"Helps with mail."`
   Keep this advisory, not a hard reject — phrasing is fuzzy and over-strict regex would frustrate. Reject only the existing vague-start cases.
2. **Skeleton (gen-skill.md line ~87):** add an inline comment above the `description` line in the emitted frontmatter restating the WHEN-not-WHAT rule.
3. **`_dev/skill-template.md` lines 3 & 14:** sync the same WHEN-not-WHAT framing so the sources agree.
4. **`OC_KB_02_Skills.md` (CONFIRMED — sync it):** reframe its description example (line 96) and guidance (lines 32, 41, 157) to WHEN-not-WHAT, since it's the KB that teaches skill authoring. Canonical-only pass.
5. **Skill-as-test next-step:** `/gen-skill` is a scaffold, so the full superpowers "watch the agent fail without the skill first" loop does *not* belong inside the command. Instead, add one line to the **confirmation next-steps** (gen-skill.md lines 139–146): *"Before considering the skill done, name the concrete task the agent fails at *without* this skill — that failure is the skill's reason to exist and its acceptance test."* This imports the discipline as guidance without turning the scaffold into a test harness — **verified non-contradictory** with Important rule #4 (it's advisory text in the confirmation output, not auto-generated content).

**Enforcement (CONFIRMED — advisory):** the WHEN-not-WHAT guidance is advisory, not a hard reject. This matches the existing mixed validation pattern (hard-reject only the vague `"does stuff"`/`"helps with"` starts; everything else advisory). Phrasing detection is too fuzzy to hard-reject without false positives.

### Files touched
- [.claude/commands/gen-skill.md](.claude/commands/gen-skill.md) — Step 2, skeleton comment, confirmation next-steps.
- [_dev/skill-template.md](_dev/skill-template.md) — lines 3 & 14.
- [docs/OpenClaw KBs/OC_KB_02_Skills.md](docs/OpenClaw%20KBs/OC_KB_02_Skills.md) — lines 32, 41, 96, 157 (canonical-only).
- [workspace/skills/README.md](workspace/skills/README.md) — optional one-liner for consistency.

### Risk
Low. Advisory guidance + comment text. No behavior change to validation hard-rejects.

### Acceptance criteria
- gen-skill.md Step 2 explains WHEN-vs-WHAT with at least one contrasting example.
- The emitted skeleton frontmatter carries the WHEN-not-WHAT comment.
- gen-skill.md, skill-template.md, and OC_KB_02_Skills.md state the rule consistently (no WHAT-phrased example left behind).
- Confirmation output includes the skill-as-test next-step line.

---

## 4. Change 2 — Rationalization-guard tables in `/debug` and `/implement`

### Current state
- [.claude/commands/debug.md](.claude/commands/debug.md): strong root-cause-first discipline, hard STOP gate at Step 5 (line 191) before any code. Core rule at line 32. **No rationalization table.**
- [.claude/commands/implement.md](.claude/commands/implement.md): the parallel-worker prompt has a `What NOT to Do` list (lines 165–171) and Important Instructions (lines 257–267), but **no `Excuse | Reality` table.**

### Gap
The discipline is stated as rules. superpowers' finding is that agents generate predictable rationalizations to skip discipline ("the fix is obvious," "I'll just try this one thing first") and a compact `Excuse | Reality` table neutralizes each by name more reliably than prose prohibitions.

### Proposed change
1. **debug.md:** add a `## Rationalization Guard` block immediately after the core rule (line 32), inside the subagent prompt so it travels with the agent. ~5 rows targeting the diagnostic-first discipline:

   | Excuse | Reality |
   |--------|---------|
   | "The fix is obvious, I'll skip the diagnostic." | Obvious fixes that skip the diagnostic are how symptom-patching ships. Run the one test. |
   | "I'll just try this one change and see." | That's guess-and-check. One confirmed hypothesis beats five guesses. |
   | "The symptom tells me what's broken." | A symptom is a clue, not a spec. Confirm the cause before the cure. |
   | "Re-running the diagnostic wastes time." | Diagnostics are seconds; a wrong fix is a new bug plus the original. |
   | "It's probably the same as last time." | "Probably" is a hypothesis. Test it before acting on it. |

2. **implement.md:** add a smaller guard to the parallel-worker prompt (near lines 165–171), targeting scope creep:

   | Excuse | Reality |
   |--------|---------|
   | "While I'm here I'll also fix/refactor X." | The plan didn't ask for X. Out-of-plan edits break review and reconciliation. |
   | "This needs error handling the plan missed." | Note it for the PM/plan-review; don't add unrequested scope mid-implementation. |
   | "It's cleaner if I restructure this too." | Cleaner-but-unplanned is still unplanned. Stay inside the step. |

### Files touched
- [.claude/commands/debug.md](.claude/commands/debug.md)
- [.claude/commands/implement.md](.claude/commands/implement.md)

### Risk
Low. Additive prompt text. Reinforces existing instructions; no contradiction with current rules.

### Acceptance criteria
- debug.md subagent prompt contains a rationalization table positioned before Step 1.
- implement.md worker prompt contains a scope-creep rationalization table.
- Tables are tight (≤6 rows each) and OpenClaw-relevant.

---

## 5. Change 3 — Two-stage review: spec-compliance gate before quality review

> Largest change. **Placement CONFIRMED → Option A** (inline in `/implement` + `/orchestrate`). `/plan-review` confirmed no existing command does a gated spec-compliance check (orchestrate Phase 8 does it only as informal prose bundled with integration); a standalone `/audit-spec` (Option B) is easy to forget and folding it into `audit-code` (Option C) couples two concerns. Option A reuses existing structure with no new command.

### Current state
- [.claude/commands/audit-code.md](.claude/commands/audit-code.md): reviews reuse, pattern alignment, anti-patterns, over-engineering, type consistency, and an extensive security checklist. It does **not** check spec-compliance — i.e., "does the implementation match the plan, with no missing items and no unrequested extras."
- [.claude/commands/implement.md](.claude/commands/implement.md): post-batch (4d) and final (Step 5) verification check *build/shape* only (mcporter.json key, MCP builds, frontmatter spelling, char cap) — not plan-conformance.
- [.claude/commands/orchestrate.md](.claude/commands/orchestrate.md) Phase 8 (lines 233–243): PM "verifies the integrated result against `phase-plan.md`" — but this bundles spec-compliance with integration and commit hygiene; it's not a distinct, gated compliance pass.

### Gap
There is no explicit gate answering *"did we build exactly what was specified?"* before the quality review runs. "Technically works, but diverged from the plan" passes silently. superpowers gates every task on **spec-compliance first, then code quality** — two separate reviews, the second only running after the first passes.

### Proposed change (Option A — confirmed)
Introduce spec-compliance as **Stage 1**, with `/audit-code` reframed as **Stage 2 (quality)**:

1. **New lightweight compliance check, invoked from `/implement`:** after Step 5 final verification (inside the implement orchestrator's own subagent prompt — that context has both the plan and the edits), spawn one `Explore` agent that diffs the working tree against the plan and reports, as a checklist:
   - Every plan step → implemented? (no gaps)
   - Every changed file → in the plan's affected-files list? (no unrequested extras — requires a `git diff` against the plan)
   - Any plan-specified behavior missing or altered?
   Output a `PASS / NEEDS-CHANGES` verdict. Gate: do not advance to quality review until compliance passes.
   **Scope threshold (CONFIRMED — skippable):** trivial changes (single-file / tiny diff) may skip the gate with an explicit `"skipped — trivial"` note in the report, so the gate doesn't add an Explore pass to one-line fixes.
2. **orchestrate.md Phase 8:** make the compliance pass explicit — restructure the existing "verify against `phase-plan.md`" prose into a named **Stage 1: spec-compliance gate** (PASS/FAIL) that runs *before* **Stage 2: quality (`/audit-code`)**. This replaces the informal prose, it does not duplicate it.
3. **audit-code.md:** add a one-line header clarifying it is the **quality stage** and assumes spec-compliance already passed; cross-reference the Stage-1 check. (Do *not* duplicate compliance logic into audit-code.)
4. **MULTI_AGENT_WORKFLOW.md:** document the two-stage gate in the Phase 8 description so the canonical workflow reflects it.

*Note: `/verify` (a system plugin skill, not authored in this repo) checks runtime behavior, not plan-conformance — correctly outside this change's scope.*

### Files touched
- [.claude/commands/implement.md](.claude/commands/implement.md) — new Stage-1 compliance step (after Step 5, inside the orchestrator prompt).
- [.claude/commands/orchestrate.md](.claude/commands/orchestrate.md) — Phase 8 restructured into Stage-1 gate → Stage-2.
- [.claude/commands/audit-code.md](.claude/commands/audit-code.md) — quality-stage header + cross-ref (insert after the `## Subagent Prompt` line, before `## Core Question`).
- [docs/MULTI_AGENT_WORKFLOW.md](docs/MULTI_AGENT_WORKFLOW.md) — Phase 8 documentation.
- ~~standalone `/audit-spec.md`~~ — **not** created (Option B rejected).

### Risk
Medium. Touches the orchestration loop. Mitigations: Stage 1 is read-only (an Explore diff-vs-plan); it adds a gate, not a behavior change to implementation; it's skippable for trivial single-file changes.

### Acceptance criteria
- A spec-compliance check exists and runs before quality review in both `/implement` and `/orchestrate` Phase 8.
- The check verifies *both* directions: no missing plan items, no unrequested extras.
- `/audit-code` states it is the quality stage and does not re-implement compliance logic.
- MULTI_AGENT_WORKFLOW.md describes the two-stage gate.

---

## 6. Change 4 — Three-strikes circuit breaker in `/debug`

### Current state
[.claude/commands/debug.md](.claude/commands/debug.md):
- Step 4 (lines 168–176) forms **exactly one** hypothesis.
- Step 5 runs a diagnostic, then STOPs for user confirmation.
- After-subagent loop (lines 248–251): `Hypothesis was wrong → re-characterize, re-spawn debug agent`.

There is **no explicit ceiling** on hypothesis/fix attempts and no instruction to escalate from "fix the bug" to "question the assumptions" after repeated failure.

### Gap
The re-spawn loop can iterate indefinitely on the same flawed mental model. superpowers' rule: **3+ failed fixes means the architecture/assumptions are wrong**, not the next fix — stop patching and re-examine the model.

### Proposed change
**Placement correction (from `/plan-review`):** `/debug` spawns a *fresh* subagent each run (it forms one hypothesis, runs one diagnostic, STOPs for user confirmation). A strike counter living only "in the subagent prompt" resets every spawn — the agent can't count to 3. So the count must be tracked by the **outer command loop** (the main session that re-spawns), with each re-spawn *told* its attempt number.

1. **Outer "After Subagent Returns" block (debug.md lines 248–251) — primary home:** the main session tracks failed hypothesis/fix cycles for this issue. On reaching **3 failures**, STOP — do not re-spawn a 4th debug agent. Escalate: re-examine the assumptions behind the characterization (Step 1) and the layer choice, state *"3 fixes failed — the problem is likely the model of the system, not the fix,"* and recommend a spec + `/brainstorm` or `/plan-review` instead of another fix.
2. **Subagent prompt — supporting:** pass an `Attempt N of 3` line into each re-spawn so the agent knows where it is in the sequence and can raise the architecture concern itself on attempt 3.

### Files touched
- [.claude/commands/debug.md](.claude/commands/debug.md) — outer after-subagent loop (counter + escalation) and the subagent prompt (attempt-number injection).

### Risk
Low. Additive stop condition; complements the existing single-hypothesis discipline.

### Acceptance criteria
- The outer command loop counts failed re-spawn cycles and hard-stops at 3 (the count persists across subagent boundaries — not lost on re-spawn).
- Each re-spawned debug agent is told its attempt number.
- The 3rd-strike stop escalates to questioning assumptions/architecture, not another fix.

---

## 7. Resolved decisions (was: open — closed by `/plan-review` 2026-05-27)

1. **Change 3 placement → Option A** (inline in `/implement` + `/orchestrate`). Evidence: no existing command does a gated spec-compliance check; Option A reuses existing structure, no new command. See §5.
2. **Change 3 scope threshold → skippable for trivial** with an explicit `"skipped — trivial"` note. See §5 step 1.
3. **Change 1 enforcement → advisory** (not hard-reject). Consistent with the existing mixed validation pattern. See §3.
4. **C1 location coverage → sync `OC_KB_02_Skills.md`** (gap found in review). `debug.md` needs no change. See §3.
5. **C4 placement → outer command loop** owns the strike counter (gap found in review — subagent prompt alone can't persist the count). See §6.

---

## 8. Deferred / candidates

- **Spec self-review gates** — before a spec is handed to `/plan-review`, run an inline scan: placeholder check, internal consistency, scope-creep, ambiguity. Natural home is whatever *produces* the spec; today `/brainstorm` returns options to chat rather than writing a spec file, and `/plan-review` already does heavy gap analysis ([plan-review.md §3a–3g](.claude/commands/plan-review.md)), so the marginal value is lower. Revisit if/when a command writes spec docs directly.

---

## 9. Attribution & licensing

`obra/superpowers` is MIT-licensed (Jesse Vincent). This spec adopts **patterns and techniques**, not text. Implementation must author original wording — do not copy SKILL.md prose verbatim. If any phrasing is reused, add attribution per the MIT license. The star counts and other repo stats surfaced during initial review were unverified summarizer output and are deliberately omitted.

---

## 10. Consolidated file-touch map

The **manifest category** column determines how each change reaches a downstream installed agent via `/update-framework` (see [§11](#11-propagation-release--downstream-update)).

| File | Change | Manifest category → downstream behavior | Risk |
|------|--------|------------------------------------------|------|
| [.claude/commands/gen-skill.md](.claude/commands/gen-skill.md) | C1: WHEN-not-WHAT, skeleton comment, skill-as-test next-step | framework-managed → overwrite-with-backup | Low |
| [_dev/skill-template.md](_dev/skill-template.md) | C1: sync description framing | hybrid (`_dev/`) → arrives as `.new` sibling, manual merge | Low |
| [docs/OpenClaw KBs/OC_KB_02_Skills.md](docs/OpenClaw%20KBs/OC_KB_02_Skills.md) | C1: reframe WHAT-phrased example/guidance to WHEN | uncategorized → **canonical-only, does NOT propagate** | Low |
| [workspace/skills/README.md](workspace/skills/README.md) | C1: optional consistency line | hybrid (`workspace/`) → `.new` sibling, manual merge | Low |
| [.claude/commands/debug.md](.claude/commands/debug.md) | C2: rationalization table; C4: 3-strikes rule | framework-managed → overwrite-with-backup | Low |
| [.claude/commands/implement.md](.claude/commands/implement.md) | C2: scope-creep table; C3: Stage-1 compliance step | framework-managed → overwrite-with-backup | Med |
| [.claude/commands/audit-code.md](.claude/commands/audit-code.md) | C3: quality-stage header + cross-ref | framework-managed → overwrite-with-backup | Low |
| [.claude/commands/orchestrate.md](.claude/commands/orchestrate.md) | C3: Phase 8 explicit compliance gate | framework-managed → overwrite-with-backup | Med |
| [docs/MULTI_AGENT_WORKFLOW.md](docs/MULTI_AGENT_WORKFLOW.md) | C3: document two-stage gate | framework-managed → overwrite-with-backup | Low |
| `FRAMEWORK_CHANGELOG.md` + `package.json` + `.framework-manifest.json` | Release plumbing (see §11) | framework-managed | Low |
| *new* `.claude/commands/audit-spec.md` | C3: only if Open Decision 1 → option (b) | framework-managed — **must be added to manifest** | — |
| `docs/superpowers-adoption-spec.md` (this doc) | — | uncategorized in `docs/` → **does NOT propagate** (stays canonical-only) | — |

---

## 11. Propagation, release & downstream update

**Context:** This repo is canonical `@insynq/agent-blueprint` (v0.1.0). Installed agents are separate repos carrying `.framework-version` + `.framework-manifest.json`. There are two independent update surfaces:

- **Framework layer** — `.claude/commands/*`, `docs/MULTI_AGENT_WORKFLOW.md`, reference KBs, `_dev/`, deploy scaffolding. Authored *here*; pulled into installed agents via `/update-framework`. **All four changes in this spec are framework-layer.**
- **Agent layer** — `workspace/skills/*`, bootstrap files, `mcporter.json`, project KBs. Authored *locally* in each agent repo via `/orchestrate` + `_dev/agent-improvement-spec-template.md`. `/update-framework` never overwrites these (they are `project-owned`/`hybrid` and default to `skip`/`sibling`).

This is why this is a `*-spec.md` and **not** an agent-improvement-template spec: we are changing the framework's authoring commands, not a deployed agent's capabilities.

### 11.1 Release path (required to reach an installed agent)

1. Implement the four changes **in this repo**.
2. Add a `## [0.2.0]` section to [FRAMEWORK_CHANGELOG.md](FRAMEWORK_CHANGELOG.md). `/update-framework` parses this to drive its downstream report:
   - `### Changed` — the edits to `gen-skill`, `debug`, `implement`, `audit-code`, `orchestrate`, `MULTI_AGENT_WORKFLOW`.
   - `### Added` — `/audit-spec` only if Open Decision 1 → option (b).
   - `### Migration Notes` — none expected (additive changes).
3. Bump `version` in [package.json](package.json) and in `.framework-manifest.json` (0.1.0 → 0.2.0).
4. *(N/A — Option A adds no new command.)* For reference: `/plan-review` confirmed a new file in `.claude/commands/` is auto-discovered by the manifest's directory walk (classified 🟡 NEW from canonical) and needs **no** manual manifest entry. So if a command is ever added, dropping it in `.claude/commands/` suffices.
5. Cut a GitHub release tagged `v0.2.0`.
6. In the installed agent repo: run `/update-framework` → fetches canonical@0.2.0, diffs vs. the installed version, presents the four-category report, applies with backups.

### 11.2 Additive-only constraint (cross-cutting — applies to all four changes)

Any installed agent that **customized** one of these commands will see it as `🟥 FILES YOU CUSTOMIZED` during `/update-framework`, triggering a three-way `git merge-file` (mechanism verified by `/plan-review`). Additive editing **reduces** merge conflicts but does **not eliminate** them — `git merge-file` is line-based and still conflicts when an insertion lands on a line the adopter also touched. To minimize that:

- **Add** new sections/tables; do **not** rewrite or reorder existing prose.
- Insert new blocks at stable anchor points (e.g., after a named Step header), separated by blank lines, not interleaved into existing paragraphs.
- Don't touch surrounding lines — adjacent-line edits are the main remaining conflict source.

This constraint is why every change in §3–§6 is phrased as an insertion, not a rewrite.

### 11.3 Downstream behavior by file

- **framework-managed** (`.claude/commands/*`, `docs/MULTI_AGENT_WORKFLOW.md`): `overwrite-with-backup` if unmodified locally; three-way merge if customized.
- **hybrid** (`_dev/skill-template.md`, `workspace/skills/README.md`): arrive as `.new` siblings requiring manual merge — adopters routinely customize these. C1's template sync therefore costs the adopter one small manual merge (accepted — the sync is included so guidance doesn't contradict).
- **uncategorized** (this spec doc, `OC_KB_02_Skills.md`): left untouched by `/update-framework`. The OC_KB C1 edit improves *this* repo's KB but does **not** reach installed agents — they'd get it only on a future install/adopt, never via update. Acceptable, since the KB is reference material, not an executable command.

### 11.4 Validation (confirmed: dogfood-only)

- **Dogfood here (required):** apply the changes in this repo and exercise `/gen-skill`, `/debug`, `/implement` to confirm the new guidance reads correctly.
- **Propagation smoke test (skipped per decision 4):** running `/update-framework --dry-run` in an installed agent against the 0.2.0 release would confirm the four-category report classifies each file as expected. Not required before shipping; available as a safety check if a downstream merge later looks wrong.
