# Framework Changelog

All notable changes to the **agent-blueprint** framework.

Format: based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), structured for parsing by `/update-framework`.
Versioning: [Semantic Versioning](https://semver.org/).

## Parsing contract for `/update-framework`

The `/update-framework` command parses this file to surface migration notes and detect command renames during update operations. Maintainers of this framework MUST keep this format intact:

### Required structure

- Each version entry starts with: `## [X.Y.Z] - YYYY-MM-DD`
- The unreleased section uses: `## [Unreleased]`
- Within a version, subsections use H3 headers: `### Added`, `### Changed`, `### Removed`, `### Renamed`, `### Migration Notes`
- All five subsections are optional within a version; omit if empty (or include with content `N/A` or empty bullets — parser tolerates both)
- Order of subsections within a version: Added, Changed, Removed, Renamed, Migration Notes (parser is order-insensitive but consistency aids readability)
- Versions appear in **descending chronological order** (newest first), with `[Unreleased]` at the top

### `### Renamed` format (parser-critical)

One bullet per rename. Used by `/update-framework` to auto-create deprecation shims:

```
### Renamed
- `/old-command` → `/new-command` (slash command rename — auto-shim created)
- `docs/Old Path/` → `docs/New Path/` (directory rename — auto-detected during diff)
```

Format rules:
- Backticks around old and new names
- Single arrow `→` (Unicode) separating old and new — parser keys on this character
- Optional parenthetical explanation after the arrow
- Slash commands include the leading `/`

### `### Migration Notes` format

Free-form prose, displayed verbatim to users when they encounter the corresponding deprecated files during update. Group by what's changing:

```
### Migration Notes
- **`/old-command` → `/new-command`:** behavior is identical for V1; new name is more accurate. The auto-created shim will redirect for one version, then be removed in vX.Y.
- **`docs/Old Path/` → `docs/New Path/`:** Windows compatibility — colons in paths break `tar` extraction.
```

The parser surfaces these notes when:
- A user has the old file (rename detected via local file matching the canonical@install-version's old name)
- A `### Removed` entry mentions a file the user has locally

### Adopter projects do not have this file

Only the canonical repo (this repo) maintains `FRAMEWORK_CHANGELOG.md`. Adopter projects have their own `docs/CHANGELOG.md` for their project's state. Don't confuse the two.

---

## [Unreleased]

[Changes pending release land here.]

---

## [0.8.1] - 2026-07-13

Docs-only patch: backfills the missing changelog entries for **v0.4.0 through v0.6.3** (eight releases that were tagged and published on GitHub but never recorded here — the file previously jumped from 0.7.0 straight to 0.3.0). Restores the `/update-framework` parsing contract's migration-note coverage for adopters crossing that range. Entries are condensed from each version's GitHub release notes and flagged as backfilled in place; rename detection was re-run across every gap pair (`git diff -M90` between adjacent tags) — **no renames anywhere in the range**, so no `### Renamed` sections were needed.

### Changed

- **`FRAMEWORK_CHANGELOG.md`** — added `[0.6.3]`, `[0.6.2]`, `[0.6.1]`, `[0.6.0]`, `[0.5.1]`, `[0.5.0]`, `[0.4.1]`, `[0.4.0]` entries in descending order.
- **`package.json`** — version `0.8.0` → `0.8.1`.

### Migration Notes

- No framework content changed — this release exists so the backfilled changelog ships in a release tarball (the v0.8.0 tarball is pinned without it). Safe to skip if you're already on v0.8.0 and don't need the historical migration notes.

---

## [0.8.0] - 2026-07-13

Graduates one reasoning-discipline pattern from the downstream kai-openclaw agent (its `[CTME-5]`, commit `862a08a`) into the framework: **an unverified negative is defended by every later run**. A recorded negative assertion ("X isn't present," "no match found," "arrived outside our pipeline") is a claim requiring evidence at a *higher* bar than a positive — negatives written into durable state (watermarks, queues, caches, notes) become the surviving record and suppress the re-check that would correct them. Field-proven downstream (a real 7-day wrong-diagnosis incident); the framework prose itself is `Installed, not yet proven in a live run` per `[PROCESS-1]`.

### Added

- **`docs/LESSONS.md [PROCESS-10]`** — "An unverified negative is defended by every later run — exhaust the source before recording one." Three-part rule (exhaust the source of truth / cite the queries + IDs in the record itself / a stored pattern is a hypothesis to test, never a presumption), with the downstream incident as the Why. Numbered 10 because `[PROCESS-6]` remains reserved by `docs/team-of-peers-and-prod-audit-spec.md` (DRAFT).
- **`CLAUDE.md` DO-NOT trap** — never record a negative into durable state without exhausting the source first; make the record cite the queries and IDs checked.

### Changed

- **`docs/LESSONS.md [PROCESS-1]` Corollary 3** — closing cross-reference to `[PROCESS-10]` for the persisted, domain-data side of the negative-claims asymmetry (Corollary 3 keeps the in-run capability side: "blocked"/"skipped").
- **`docs/OpenClaw KBs/OC_KB_11_Safety_Primitives.md` Primitive 8 blocked-side sharpen** — extended from capability claims to domain-data negatives persisted into durable state, pointing at `[PROCESS-10]`.
- **`package.json`** — version corrected `0.3.0` → `0.8.0`; it had been stale since v0.3.0 while releases advanced through v0.7.0.

### Migration Notes

- All edits are additive at stable anchors; no renames, no breaking changes. Adopters with customized `LESSONS.md` / `CLAUDE.md` receive the changes per the standard hybrid/sibling merge pattern.
- The pattern's domain-specific worked example (real-estate contract capture) intentionally stays downstream in kai-openclaw's `[CTME-5]`; the framework wording is domain-agnostic.


---

## [0.7.0] - 2026-07-09

Graduates field-proven patterns from the Kai-RE agent (G1–G14) into framework KBs, templates, and commands. All changes passed a 6-judge Opus+Fable stress-test panel: 21 findings fixed and re-verified FIXED by the same lenses, plus 8 residual minors fixed. **Patterns are design-validated, not runtime-proven** — the source product had not run a live end-to-end deal at graduation time, and each KB text carries this label.

### Added

- **`docs/OpenClaw KBs/OC_KB_16_Datastore_Modeling.md`** — new Datastore Modeling KB: four rules for tool-call-read stores, the sanctioned named-cache exception (the only allowed form of a second copy), and the persist-scaffolding-IDs corollary. Numbered 16 (renumbered from a draft 15) because `OC_KB_15` stays reserved per `docs/sister-framework-adoption-spec.md`.
- **`/stress-test` command** (`.claude/commands/stress-test.md`) — multi-lens adversarial judge panel: parallel judges locked to distinct lenses over a change set or spec/doc, optional fix pass, re-verification by the same lenses.
- **`OC_KB_11_Safety_Primitives.md` sections** — two-tier safety loading; §3a write discipline with the sole-writer precondition; SOFT/HARD enforcement classes; the git-tracked-ledger anti-pattern.
- **Spec template sections** (`_dev/agent-improvement-spec-template.md`) — audience & voice; overridable-vs-locked config boundary; §10 upstream-fork vs deferrable split; `[VERIFY]` → `[RESOLVED: how]` lifecycle.
- **Closure-owner tags in `/plan`** (`.claude/commands/plan.md`, checked by `/plan-review`) — `[EDIT]`/`[RUN]`/`[DECIDE]` tags marking who closes each plan item.
- **Capability-abstraction pattern** in `OC_KB_01_Architecture.md`.
- **Capability-scoped gotcha log** in `OC_KB_02_Skills.md` (owning skill's `references/` gotcha log, force-read before acting on that capability).
- **`OC_KB_03_MCP_Tools.md` → `OC_KB_16` cross-link** for datastore modeling of tool-call-read stores.
- **Config-home rule + dual-manifest table** in `docs/investigations/2026-07-07-codex-and-claude-code-plugins-build-publish-gate.md`, with an `OC_KB_07_Deploy_and_Ops.md` cross-reference.
- **Two Kai-RE investigation reports** — `docs/investigations/2026-07-09-kai-re-transcript-harvest.md` and `docs/investigations/2026-07-09-kai-re-second-pass.md`.

### Changed

- **`CLAUDE.md`** — DO-NOT list gains two traps: validation/readiness ledgers must be git-tracked, and denormalized in-datastore copies are sanctioned only as a named cache over a single canonical source (per `OC_KB_16`). Reference Documents KB map and `/stress-test` command row updated to include the new surfaces.
- **`docs/LESSONS.md`** — scope note added: cross-cutting project-wide lessons live here; capability-scoped environmental quirks belong in the owning skill's `references/` gotcha log per `OC_KB_02`.

### Migration Notes

- **`OC_KB_15` remains reserved** (see `docs/sister-framework-adoption-spec.md`); the new Datastore Modeling KB is numbered `OC_KB_16`. No renames, no breaking changes — all edits are additive.
- **Patterns from the Kai-RE graduation are design-validated, not runtime-proven.** The source product had not run a live end-to-end deal when these patterns were graduated; each affected KB text carries this label. Treat the patterns as vetted designs pending runtime evidence, and record runtime confirmations in your project's `LESSONS.md` when they land.


---

## [0.6.3] - 2026-07-07

*Backfilled 2026-07-13 from the v0.6.3 GitHub release notes (entries condensed; no content changes to the release itself).*

Doc-only prose cleanup of all 25 command files plus `docs/MULTI_AGENT_WORKFLOW.md`, net −370 lines, graded by an 8-judge panel (6 Opus-family judges + 2 adversarial Fable adjudicators) over ~30 findings. **Zero guardrail cuts** — every LESSONS-cited rule, refutation block, seed prompt, fresh-context copy, and destructive-op rule preserved.

### Changed

- **All 25 command files + `docs/MULTI_AGENT_WORKFLOW.md`** — prose condensation; consumed-verbatim artifacts (seed prompts, worker templates, executable blocks) left intact per what later became `[PROCESS-8]`/`[PROCESS-9]`.
- **`/kickoff` embedded CLAUDE.md template** — drift vector closed: now fills the on-disk `[TODO]`s in place instead of regenerating the DO NOT / Custom Commands / Reference Documents blocks (its embedded DO-NOT copy had already drifted 7-vs-8 traps).
- **Hardcoded 22-command rosters** replaced by a `.framework-manifest.json` pointer; a duplicated KB_1 template removed.
- **Framework-wide app-blueprint web-residue sweep** — audit-code globs, plan-review agent briefs, unify/update-kb/research vocabulary, dead KB_7/gen-component pointers.

### Migration Notes

- No runtime behavior changed; no renames. The one behavior-adjacent change (the fill-don't-regenerate `/kickoff` rewrite) shipped `Installed, not yet proven in a live run` (smoke flag SA-1).


---

## [0.6.2] - 2026-07-07

*Backfilled 2026-07-13 from the v0.6.2 GitHub release notes (entries condensed).*

Wargame-planning intake: extracts the transferable planning method from the "Fable Wargame Kit" into the canonical framework (no new command). Sources: the kit + 3 Anthropic system cards + official prompting docs + an independent red-team study; 15/15 load-bearing cites page-verified. Spec LOCKED after a 3-agent plan-review; hardened by an 8-judge skill-audit panel.

### Added

- **Per-step expected-observation lines + Abort conditions section** (blocked-escalate vs friction-push-through) in `/plan` and the MAW worker plan-doc template, gated at Complexity ≥ Medium.
- **`/plan-review` Step 6a runtime-fork-trigger artifact class** — an observable "if you observe X, take route B" line LOCKs only when both routes are fully pre-designed.
- **`/implement` per-step observation-confirmation consuming loop.**
- **Blind-executability dispatch gate** in `/orchestrate` + `docs/MULTI_AGENT_WORKFLOW.md`.
- **`OC_KB_05` tier-role executor-brief section** — durable planner/executor guards; named-model specifics quarantined in a dated, decays-with-releases Exhibit table.
- **`OC_KB_11` BLOCKED-never-invent corollary** — never invent a required input; classify required vs soft, fail loud on required.

### Migration Notes

- Additive at stable anchors; no renames. Smoke flags WG-1..WG-7 await first downstream firing.


---

## [0.6.1] - 2026-07-07

*Backfilled 2026-07-13 from the v0.6.1 GitHub release notes (entries condensed).*

T3 goal-mode video intake (LOCKED spec `docs/t3-video-2026-07-06-intake-spec.md`), harvested from a practitioner goal-mode video via a 4-agent Opus grounding panel with anchor-verified edit targets. 12 files modified + one new command. Rejected imports (per-model score tables, "never use Haiku", unanimity-as-confidence, wall-clock thresholds, and more) are recorded with reasons in the spec's decisions table.

### Added

- **`/triage` command** (`.claude/commands/triage.md`) — triage a stale backlog into action buckets with judge-verified verdicts and a mandatory `[PROCESS-3]` fail-loud coverage tally.
- **`OC_KB_11` autonomy-budget doctrine** — standing multi-step autonomy only when the deploy target is revertible, an automated approval gate precedes each irreversible step, and the permission grant is enumerated; absent all three, stay turn-by-turn. Plus the committed-ledger supervision surface.
- **`docs/LESSONS.md [PROCESS-7]`** — effort disproportion is an architecture signal, measured by diff not wall-clock; cross-referenced from `/debug` and `/audit-code`.
- **`OC_KB_02` delegation-skill archetype + empty-result contract** (also in `/gen-skill`).
- **`OC_KB_05` routing philosophy** — cost gates exploration, not what ships; routing is a default not a ceiling; named-model exclusions are an anti-pattern.
- **Evaluative-terms glossary** in `/kickoff` + `CLAUDE.md` Preferences.

### Changed

- **`docs/MULTI_AGENT_WORKFLOW.md`** — live-orchestration-vs-deterministic-workflow rule (scripted fan-outs fit fan-out-and-verify only; checkpoint-driven programs run from the live PM session); Phase-8 risk-targeted verification (diff as risk map; re-exercise old adjacent behaviors) with conditional worktree reconciliation; Phase-6 split-verdict escalation (mirrored in `/audit-code`'s Refutation Pass).
- **`docs/LESSONS.md [PROCESS-1]` Corollary 1** — trigger sharpen.

### Migration Notes

- Cross-context port per `[PROCESS-5]`; every prose/doctrine change shipped `Installed, not yet proven in a live run` (smoke flags T3V-1..T3V-5). No renames.


---

## [0.6.0] - 2026-07-06

*Backfilled 2026-07-13 from the v0.6.0 GitHub release notes (entries condensed).*

Kai Jul 2–6 harvest intake (LOCKED spec `docs/kai-harvest-2026-07-06-intake-spec.md`): a 15-transcript kai-openclaw harvest stress-tested by a 12-judge Fable+Opus adversarial panel that corrected 5 synthesis-layer errors before lock. All 20 edit blocks landed across 9 files; no code.

### Added

- **`OC_KB_11` Primitive 8 blocked-side sharpen** — a "blocked"/"skipped" verdict is a capability claim held to the verify-by-attempt bar; plus a seeded-negative anti-pattern.
- **`OC_KB_11` Primitive 9 negative test-sentence dual + field closure; Primitive 3 read-back extended to side-effect rows; semantic-defaults anti-pattern** (the ~$97k DEFAULT/COALESCE two-headed trap).
- **`docs/LESSONS.md [PROCESS-1]` Corollary 3** — a false "blocked" cascades; negative statuses need the same evidence bar.
- **`CLAUDE.md` DO-NOT fact-copy trap** (memory/bootstrap files hold rules and query paths, not copies of facts; + `OC_KB_04` cross-ref) and the **scope-graduation conduct rule** (design sign-off is not deploy authorization), with LOCKED-not-deploy clarifications mirrored in `/plan-review` and `docs/MULTI_AGENT_WORKFLOW.md`.

### Changed

- **`OC_KB_12`** — timestamps from `now()`/DB DEFAULT, never typed literals; reconciliation hierarchy upgraded to field-proven.
- **`docs/LESSONS.md`** — `[PROCESS-4]` args-as-JSON-string sharpen; `[PROCESS-3]` corroboration append (no demotion).

### Migration Notes

- Prose-only diff; no renames. Every canonical prose change shipped flagged `Installed 2026-07-06, not yet proven in a live run`, except the two field-attestation upgrades (Primitive 9 field closure, reconciliation field-proof), which record already-observed production firings.


---

## [0.5.1] - 2026-06-26

*Backfilled 2026-07-13 from the v0.5.1 GitHub release notes (entries condensed).*

Post-v0.5.0 verification & safety hardening, learned and adversarially filtered from a week of kai-openclaw downstream proving runs (a phases-1–4 build session, a 75-agent phases-5–8 workflow build, four live catch-ups). No code. Three candidates deliberately DROPPED by the adversarial filter.

### Added

- **`docs/LESSONS.md [PROCESS-1]` input-side corollary** — a prior analysis/audit/roadmap is `relayed`, not `read-it`, until re-grounded (a 424-line audit drove 4 phases, wrong in all 4).
- **`docs/LESSONS.md [PROCESS-1]` runtime corollary** — a shipped code path is unproven until its trigger fires AND you inspect the persisted artifact, not the digest ("deployed ≠ exercised").
- **`docs/LESSONS.md [PROCESS-3]`** — a schema-forced Workflow fan-out can silently under-cover; log the drop.
- **`docs/LESSONS.md [PROCESS-4]`** — a fan-out's synthesis is the least-trustworthy layer; verify the primaries.
- **`OC_KB_11` Primitive 9** — fail loud or fail closed, never fail silent-open (+ anti-pattern + diagnosis step; primitive count 8→9).
- **`OC_KB_13`** — "output metrics without a paired outcome metric" anti-pattern; concrete-defect-over-abstract-lesson refinement.

### Changed

- **`/retro`** (`.claude/commands/retro.md`) — outcome-vs-output check in the phase retro.

### Migration Notes

- Every addition shipped `Installed, not yet proven in a live run`. No renames.


---

## [0.5.0] - 2026-06-25

*Backfilled 2026-07-13 from the v0.5.0 GitHub release notes (entries condensed).*

Bundles the full two-talk *Insecure Agents* (Sentry) framework review (Tiers 1–3). The review's adversarial filter deliberately dropped one candidate (an "over-decomposition" anti-pattern resting on a single confounded anecdote) and one proposed audit-infra check (false-positive generator for single-tenant agents).

### Added

- **`docs/LESSONS.md [PROCESS-1]`** ("a prose change is unproven until a live run") **and `[PROCESS-2]`** ("augment the deterministic baseline; don't replace it").
- **`OC_KB_11` Primitive 0** — don't expose the operation (close the capability); least-privilege / default-deny section.
- **`_dev/tools/validate-skills.mjs`** — zero-dependency Node validator for the CLAUDE.md DO-NOT skill traps (folder==name, `user-invokable` spelling, bootstrap char-cap). Homed in `_dev/tools/` (dev/CI), NOT the rsync-deployed `workspace/scripts/`.
- **Multi-user conditional notes** — `MEMORY.md` single-operator isolation; least-privilege / default-deny.

### Changed

- **`OC_KB_02`** — `references/` reframed as a proactive accuracy lever; MCP-vs-CLI auth-boundary note. **`/gen-test`** — "Before you trust these tests" discipline (behavior-verified at ship: an independent `/gen-test` run reached and applied it). **`OC_KB_01`** — build-vs-buy (anchor on the data, not the harness). **`OC_KB_05`** — confounded-model-swap anti-pattern.
- **`.framework-manifest.json`** release version bumped to 0.5.0.

### Migration Notes

- Verification ledger at ship: 2 items verified (validate-skills.mjs on fixtures; the /gen-test discipline firing), all other additions `Installed, not yet proven in a live run`. No renames.


---

## [0.4.1] - 2026-06-25

*Backfilled 2026-07-13 from the v0.4.1 GitHub release notes (entries condensed).*

Encodes the skill/script-boundary lesson: keep judgment in the skill, mechanics in a script (dry-run handoff: build payload → invoke `--dry-run` → review → invoke for real). Originated from a read-only assessment of a production agent's six longest skills; an independent refutation pass caught one false positive, so the guidance ships with a "don't over-extract / verify per-block" caveat.

### Added

- **`docs/LESSONS.md [SKILL-1]`** — the decision record; the ships-empty note now distinguishes framework-level lessons (which propagate) from app-specific ones.
- **`OC_KB_02` "The mixed case" section** + over-determinism anti-pattern + validation-checklist item.

### Changed

- **`_dev/skill-template.md`** — determinism guidance at the Workflows section (prevent at creation).
- **`/audit-code`** — over-determinism anti-pattern row (detect in review).

### Migration Notes

- Additive prose only; no renames.


---

## [0.4.0] - 2026-06-25

*Backfilled 2026-07-13 from the v0.4.0 GitHub release notes (entries condensed).*

Completes the three-thread verification-discipline agenda: thread 3 closure provenance, thread 2 falsification primitive (independent Refutation Pass), thread 1 ground-first primary-artifact anchor (this release's headline). All three threads are markdown-prose command edits, shipped `Installed, not yet proven in a live run`.

### Added

- **`/investigate` "Step 0: Anchor on the Primary Artifact"** — quote the literal artifact (error text, log line, data row, transcript, or the user's verbatim claim) and derive the entry point from it, not from a theory; downstream root-cause claims marked UNVERIFIED when the artifact is unavailable; checkable "Primary Artifact" / "Entry point derived from:" output fields.
- **`/brainstorm` Phase 1 conditional artifact-anchor line** reusing the `[verified]`/`[relayed]` provenance vocabulary.
- **Spec:** `docs/ground-first-anchor-spec.md` (LOCKED).

### Migration Notes

- Bundles threads landed since v0.3.0 (closure provenance `c48f93d`, falsification primitive `7aea047`). Open follow-up at ship: session instrumentation (capture which files were in context at a wrong output) — later shipped as the context-at-turn tool (`666b817`). No renames.


---

## [0.3.0] - 2026-06-01

Adopts four discipline-enforcement patterns from a sister app-focused framework's phase-9 retro (forwarded by the user, reframed for headless agents — no text copied verbatim). The four changes reinforce a single loop: **surface decisions early → lock them before dispatch → reflect after ship**. The load-bearing artifact is the new decisions table, created in spec, verified at lockdown, referenced in retro. See `docs/sister-framework-adoption-spec.md` for the full rationale.

### Added

- **`/retro` command** (`.claude/commands/retro.md`) — phase-closure skill that runs **post-`/ship`** (Phase 10.5 of the PM phase loop), non-blocking. Spawns an `Explore` subagent that reads phase artifacts on a **best-effort** basis (spec doc with decisions table, `docs/plans/[phase-slug]/` worker docs if present, smokes filtered by phase-slug prefix, `git log` for the phase commit range, changelog entry if parseable) and produces a structured retro at `docs/retros/[phase-slug]-retro.md`. Self-heals the `docs/retros/` directory via runtime `mkdir`. Candidate `LESSONS.md` entries are surfaced with `[CATEGORY-N]` tags but never auto-committed — PM decides per entry.
- **`_dev/phase-retro-template.md`** — 7-section template skeleton (What worked / Harder than expected / Close-calls / Lessons (candidate `LESSONS.md` entries) / Tools to build / TL;DR recipe / Inputs available vs missing). Lives in `_dev/` (matching `_dev/skill-template.md` and `_dev/agent-improvement-spec-template.md` precedent) so it propagates to installed agents via `/update-framework` as a `.new` sibling for manual merge.
- **Decisions-table format in `_dev/agent-improvement-spec-template.md` §1 and `docs/KB_1_Architecture.md` Architecture Decisions** — replaces the prior bullet skeleton with a required `# | Decision | Choice | Reasoning | Date` table. The empty table heading itself is the discipline; bullets don't enforce columns. Backward-compatible — existing specs with the bullet format remain valid; new specs use the table. `docs/sister-framework-adoption-spec.md` dogfoods the format at its top.
- **Lockdown checkpoint in `/plan-review` Step 6** (`.claude/commands/plan-review.md`) — new final step that scans the spec for unresolved-fork patterns (`[TODO decision]`, `or`-between-alternatives, `(a)/(b)/(c)` enumerations, "open decision" mentions), verifies the decisions table has at least one row per fork raised in conversation, and verifies a brainstorm trace / investigation log / source-of-evidence is cited for each decision. On pass, prepends `> **Status: LOCKED YYYY-MM-DD**` blockquote header to the spec. On fail, lists unresolved items and stops. Includes F1/F2 refinements caught by dogfooding: 6a excludes matches inside fenced code blocks, inline backtick spans, paragraphs documenting the patterns themselves, and `§Resolved decisions`-style revisit-trigger sections; 6c adds an engineering-judgment exception where stated technical reasoning serves as the citation for pure tech choices.
- **PM Pre-Dispatch Responsibilities subsection in `docs/MULTI_AGENT_WORKFLOW.md`** (before Phase 4) — explicitly names the architect work that already happens inside `/orchestrate` Phases 1–3 (research codebase context, generate/compare options via `/brainstorm`, capture decisions in the decisions table, audit the plan via `/audit-code`, verify no unresolved forks via the lockdown check). No new role, no new command — the work is now named so it's harder to skip when dispatch pressure mounts.
- **`Status: LOCKED YYYY-MM-DD` convention** — header written by `/plan-review` Step 6 marking a spec as implementable. Documented in `MULTI_AGENT_WORKFLOW.md` (Phase 6 — workers descending from a LOCKED spec are clear to dispatch into Phase 7) and in `CLAUDE.md` Patterns.

### Changed

- **`/orchestrate`** (`.claude/commands/orchestrate.md`) — added a header note before Phase 1 framing Phases 1–3 as the PM's pre-dispatch (architect) phase that must complete before any worker dispatch in Phase 4. Added a post-Step-10 note pointing at `/retro` as the optional post-ship habit (Phase 10.5).
- **`/brainstorm`** (`.claude/commands/brainstorm.md`) — added a one-line role-in-the-phase-loop tie at the top of the subagent prompt, explicitly framing `/brainstorm` as the PM's primary pre-dispatch tool that feeds the decisions table in `phase-plan.md`.
- **`CLAUDE.md`** — added three Patterns-section bullets: PM owns architectural decisions before worker dispatch; spec docs become implementable once `/plan-review` writes a `Status: LOCKED YYYY-MM-DD` header; spec docs and `KB_1` record architectural decisions in `Decision | Choice | Reasoning | Date` table format.
- **`_dev/agent-improvement-spec-template.md`** — §1 Confirmed Decisions skeleton upgraded from bullets to the new `# | Decision | Choice | Reasoning | Date` table format.

### Migration Notes

- All edits are additive insertions at stable anchors (carrying forward the v0.2.0 additive-only constraint). Adopters customizing `MULTI_AGENT_WORKFLOW.md`, `orchestrate.md`, `brainstorm.md`, or `plan-review.md` should get clean three-way merges via `/update-framework`. Hybrid files (`CLAUDE.md`, `_dev/agent-improvement-spec-template.md`, the new `_dev/phase-retro-template.md`) arrive as `.framework` siblings for manual merge per the standard hybrid pattern.
- **`docs/KB_1_Architecture.md` adopters get a `.new` sibling for the first time post-manifest-update.** The v0.3.0 manifest changes `default_action_on_conflict` for `docs/KB_1_Architecture.md` from `"skip"` to `"sibling"` — previously, adopters' customized `KB_1` never received framework-side updates to that file. After the v0.3.0 update lands, adopters will see the new decisions-table skeleton arrive as a `.framework` sibling for manual merge into their existing `KB_1`.
- Reference patterns captured in `docs/sister-framework-adoption-spec.md` §7 (five reframed sister-framework lessons: ARCH-3 capability ≠ default responsibility, ARCH-8 architecture lockdown before PM dispatch, PROC-1 talk it out before any docs, PROC-2 git commits as conversation checkpoints, PROC-3 when all options feel meh the framing is wrong) are **not seeded** into `docs/LESSONS.md` — that file is project-owned and ships starter-empty by design. Adopters may consult §7 and selectively copy entries into their own `LESSONS.md` if matching incidents surface.


---

## [0.2.0] - 2026-05-27

Adopts four discipline-enforcement techniques observed in `obra/superpowers` (Jesse Vincent, MIT) — patterns only, original wording. All changes are additive edits to existing authoring commands, templates, and reference docs; no new commands, no runtime/MCP/deploy changes. See `docs/superpowers-adoption-spec.md` for the full rationale.

### Changed

- **`/gen-skill`** (`.claude/commands/gen-skill.md`) — Step 2 description validation now teaches WHEN-not-WHAT (state the trigger condition the router matches, not a behavior summary) with contrasting good/weak/bad examples, kept advisory (only the existing vague `"does stuff"`/`"helps with"` starts hard-reject). The emitted skeleton frontmatter carries a WHEN-not-WHAT comment above `description`. The confirmation next-steps add a skill-as-test line: name the concrete task the agent fails at *without* the skill — that failure is its reason to exist and acceptance test.
- **`_dev/skill-template.md`** — `description` framing (frontmatter line + frontmatter-rules comment) synced to WHEN-not-WHAT for consistency with `/gen-skill`.
- **`docs/OpenClaw KBs/OC_KB_02_Skills.md`** — reframed the description guidance and the WHAT-phrased anonymous-skill example to WHEN-not-WHAT, and updated the validation checklist accordingly, so the skills KB no longer contradicts `/gen-skill`. (Canonical-only — uncategorized, does not propagate via `/update-framework`.)
- **`/debug`** (`.claude/commands/debug.md`) — added a Rationalization Guard table (Excuse | Reality) after the core diagnostic-first rule inside the subagent prompt; added a three-strikes circuit breaker whose strike counter lives in the outer "After Subagent Returns" loop (a fresh subagent can't persist the count), with an `Attempt N of 3` line injected into each re-spawn. After 3 failed fixes the loop STOPs and escalates to questioning the system model (spec + `/brainstorm` or `/plan-review`) instead of a 4th fix.
- **`/implement`** (`.claude/commands/implement.md`) — added a Scope-Creep Guard table to the parallel-worker prompt; added a Stage-1 spec-compliance gate (new Step 5b) after final verification that diffs the working tree against the plan (no gaps, no unrequested extras, no drift) and gates the Stage-2 quality review, skippable for trivial changes with a `"skipped — trivial"` note.
- **`/audit-code`** (`.claude/commands/audit-code.md`) — added a one-line header framing it as the quality stage (Stage 2) that assumes the Stage-1 spec-compliance gate already passed; it does not re-check plan-conformance.
- **`/orchestrate`** (`.claude/commands/orchestrate.md`) — Phase 8 restructured into a named two-stage gate: Stage 1 spec-compliance (PASS/FAIL) before Stage 2 quality (`/audit-code`), replacing the prior informal "verify against phase-plan.md" prose.
- **`docs/MULTI_AGENT_WORKFLOW.md`** — Phase 8 documentation updated to describe the two-stage spec-compliance → quality gate.

### Migration Notes

- All edits are additive insertions at stable anchors. Unmodified adopter copies update via `overwrite-with-backup`; customized copies trigger a three-way merge. `_dev/skill-template.md` and `workspace/skills/README.md` are hybrid and arrive as `.framework` siblings requiring a small manual merge. The `OC_KB_02_Skills.md` edit is canonical-only and does not reach installed agents via `/update-framework`.


---

## [0.1.0] - 2026-05-08

Initial release of `@insynq/agent-blueprint`. Forked from `@insynq/app-blueprint` v0.1.3, reframed for OpenClaw agent dev. The two frameworks share the multi-agent workflow methodology and the slash-command structure but diverge in stack assumptions: this framework is opinionated for OpenClaw + Anthropic Claude + MCP via mcporter + GitOps deploy.

### Added

- **OpenClaw KB collection** at `docs/OpenClaw KBs/` — fourteen stack-reference KBs split into a runtime-stack half and a capability-primitives half:
  - **Runtime stack (`OC_KB_01–09`):**
    - `OC_KB_00_Index.md` — routing layer with by-task table + Always/Never rules + dependency tree
    - `OC_KB_01_Architecture.md` — runtime model, gateway, bootstrap loading, workspace tree
    - `OC_KB_02_Skills.md` — SKILL.md format, frontmatter, 5-section convention, name=folder rule
    - `OC_KB_03_MCP_Tools.md` — mcporter.json schema, ${ENV_VAR} resolution, in-repo MCP server skeleton
    - `OC_KB_04_Bootstrap_Files.md` — purpose of the 9 bootstrap docs + per-file character cap
    - `OC_KB_05_Models_and_Prompts.md` — routing (singular `model`) vs cache (PLURAL `models`) gotcha, per-cron API keys, **plus a new "Static-context optimization (system-prompt diet)" section** with bootstrap-budget discipline (~5K–15K char per-file targets, "if it changes per-conversation it doesn't belong in bootstrap" rule, references/ pattern for long-form domain knowledge)
    - `OC_KB_06_Cron_and_Scripts.md` — `openclaw cron` ops + deterministic-script JSON-stdout convention
    - `OC_KB_07_Deploy_and_Ops.md` — GitOps webhook+rsync, plist EnvironmentVariables, rsync-excludes correctness
    - `OC_KB_08_Observability.md` — log locations, session transcript replay, Anthropic Console cost
    - `OC_KB_09_Evals.md` — **aspirational** golden-trace replay pattern (framework gap; recommended shape)
  - **Capability primitives (`OC_KB_10–14`):**
    - `OC_KB_10_Capability_Layers.md` — five-layer diagnostic taxonomy (Perception / Extraction / Reasoning / Action / Data) for organizing skills and localizing failures; framing layer for OC_KB_11–14
    - `OC_KB_11_Safety_Primitives.md` — defensive write patterns: dry-run, sanity gate, round-trip verify, confidence scoring, pre-write assumption surfacing, soft-delete + time-delayed commits, undo primitive, capability self-assessment
    - `OC_KB_12_Trust_and_Provenance.md` — decision log, rationale storage, provenance flags (verified | inferred | unverifiable), reconciliation hierarchy, audit trail conventions
    - `OC_KB_13_Self_Improvement_Loops.md` — **aspirational** — correction pattern memory, skill effectiveness telemetry, edge-case library, weekly self-retro, deviation self-reporting, template evolution
    - `OC_KB_14_Operational_Excellence.md` — SLOs per skill (with `on_breach` responses), canary testing of skill changes, cost visibility (per-cron API keys, cross-ref `OC_KB_05`/`OC_KB_06`), dashboards (cross-ref `OC_KB_08`), skill-change rollback paths
- **`workspace/` template** with the 9 bootstrap files as empty scaffolds (SOUL, AGENTS, TOOLS, SCHEMA, MEMORY, HEARTBEAT, NOTIFICATIONS, TASK-QUEUE, INDEX) plus `config/mcporter.json` (`{ "mcpServers": {} }`) and READMEs for `skills/`, `mcp-servers/`, `scripts/`.
- **`deploy/` template** with `deploy.sh` (git-pull + rsync skeleton with TODO markers), `webhook-receiver.js` (HMAC-verified entry point), `com.example.openclaw-deploy.plist.template` (launchd unit), and `README.md`.
- **`_dev/` template** with `onboarding-checklist.md`, `skill-template.md`, `validation-checklist.md`, and **`agent-improvement-spec-template.md`** — an 11-section structural skeleton for non-trivial agent-improvement initiatives (Section 5 organized by `OC_KB_10` capability layers; Section 6 organized by `OC_KB_11–14` enhancement axes).
- **`/gen-skill` command** at `.claude/commands/gen-skill.md` — scaffolds a new `workspace/skills/<name>/SKILL.md` with valid frontmatter (name=folder, user-invokable spelling) and the 5-section skeleton.
- **CLAUDE.md DO NOT section pre-filled** with the canonical OpenClaw silent-failure traps (mcpServers key, ${ENV_VAR} source, user-invokable spelling, folder=name, bootstrap char cap, cache plural-models, rsync excludes).
- **Permissions allowlist** in `.claude/settings.json` — three-tier (`allow` / `ask` / `deny`) policy that defines an autonomy contract: edit/write/build/install/stage are allowed without prompting; commit/push/destructive-git/cron-mutation/`rm -rf`/`npm publish` ask first; force-push, `rm -rf /`, `rm -rf ~`, and `sudo` are denied. Documented in README.md under "Autonomy contract."

### Changed

- **Package identity:** `@insynq/app-blueprint` → `@insynq/agent-blueprint`. New canonical repo at `Insynq/agent-blueprint`. Bin command renamed to `agent-blueprint`. Version reset to `0.1.0`.
- **`/audit-full` bundle:** reduced from `audit-code + audit-rls + audit-infra` to `audit-code + audit-infra`. Future candidates for inclusion: `/audit-skills`, `/audit-mcporter`.
- **Web-stack-flavored commands genericized to OpenClaw equivalents** per the framework's mapping rules:
  - `/audit-infra` rewritten around mcporter.json shape, plist env-var resolution, deploy-script HMAC + rsync-excludes, MCP server deps
  - `/implement` rewritten around skill / MCP server / mcporter.json / bootstrap-file batching (no DB migrations, no edge functions)
  - `/debug` rewritten around 6 OpenClaw layers (skill routing, bootstrap loading, MCP/tool, model/prompt, cron/script, deploy/runtime)
  - `/audit-code`, `/brainstorm`, `/preflight`, `/research`, `/ship`, `/visualize`, `/orchestrate`, `/update-framework`, `/kickoff`, `/adopt` had stack-specific examples replaced with OpenClaw equivalents (gateway, mcporter, plist, rsync, cron)
- **`.env.example`** rewritten — comments clarify that real secrets live in launchd plist `EnvironmentVariables`, not `.env`. `.env` is for local-dev MCP servers only.
- **CLAUDE.md template:** Tech Stack pre-fills OpenClaw runtime; Build Commands pre-fills `openclaw gateway restart`/`doctor`/`session cleanup`/`git push origin main`; Reference Documents points at `docs/OpenClaw KBs/`; Custom Commands table reflects 22 commands (was 25); Roles relabeled as "agent capabilities and personas".

### Removed

- All web-stack KB folders: `docs/Supabase Structure KBs/`, `docs/UI-UX KBs/`, `docs/Auth KBs/`, `docs/Bill KBs/`, `docs/Form KBs/`, `docs/AI KBs/`, `docs/Test KBs/`, `docs/Job KBs/`, `docs/Obs KBs/`.
- `docs/KB_7_UI_Patterns.md` and `docs/KB_9_Screen_Catalog.md` (UI-shaped templates).
- Web-stack-only commands: `/db-push`, `/gen-migration`, `/audit-rls`, `/gen-component`.
- `docs/AUDIT_FINDINGS.md` (one-off audit output not template content).
- `docs/plans/framework-distribution/` (app-blueprint's own development plans).

### Renamed

- N/A (initial release of new package; no renames within `agent-blueprint` itself yet)

### Migration Notes

- **For users coming from `@insynq/app-blueprint`:** this is a sibling framework, not an upgrade path. There is no migration tool. If you have an OpenClaw agent project that was scaffolded with `app-blueprint`, you'll need to fresh-install `agent-blueprint` and use `/adopt` to merge in your existing project state.
- **Future commands under consideration:** `/gen-mcp-server` (scaffold an in-repo MCP server with @modelcontextprotocol/sdk + zod boilerplate), `/audit-skills` (validate folder=name and frontmatter spelling across all skills), `/audit-mcporter` (validate `mcpServers` key + ${ENV_VAR} resolution against deploy plist template). These are framework gaps tracked here for adopters who want them sooner. The `/audit-full` bundle would expand to include them when they ship.
- **For adopters of the capability-primitives KBs (`OC_KB_10–14`):** these are framework conventions, not runtime-enforced. Adopt incrementally — most projects start with the decision log from `OC_KB_12` (prerequisite for the self-improvement loops in `OC_KB_13`) and the per-cron API keys from `OC_KB_05`+`OC_KB_06` (prerequisite for the cost visibility in `OC_KB_14`). Document the chosen subset in `KB_1_Architecture.md` so future maintainers know what's wired up vs aspirational.
- **Autonomy contract in `.claude/settings.json`:** the merged-in permissions allowlist enables set-and-forget autonomy on local file/code work and preserves prompts only for irreversible / shared-state operations. Adopters can override locally in `.claude/settings.local.json` if their workflow needs a different boundary.
