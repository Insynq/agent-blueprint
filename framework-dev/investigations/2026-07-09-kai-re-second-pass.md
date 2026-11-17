# Kai-RE Second Pass — Primary-Artifact Review & Graduation Candidates

**Date:** 2026-07-09
**Method:** Multi-agent workflow (`kai-re-second-pass`, run `wf_6e17f6ed-b12`, all Opus 4.8): re-harvest of the missed `86d41ebd` transcript + six primary-artifact read seams over the actual repos (`~/Documents/GitHub/Kai/Kai RE Slice/{Kai-RE,kai-re-plugin}`), followed by per-candidate dedup checks against agent-blueprint's existing docs, and a synthesis pass. 46 candidates found across 7 seams; 29 graduation/gap candidates dedup-checked (22 in-workflow + 7 recovered after structured-output failures, of which 4 were unique and re-checked individually); 17 risks/corrections.
**Companion:** first pass at `2026-07-09-kai-re-transcript-harvest.md` (transcript-narration layer; several of its framings are corrected below).
**Status:** REVIEW DRAFT — nothing graduated yet. Sections 1–6 are the working agenda.

---

# Second-Pass Synthesis: Kai-RE Artifacts → agent-blueprint Graduation Review

The first pass read only session narration. This pass read the primary artifacts (schema files, safety references, both repos' git history, the plugin package, and the build script). Result: several first-pass framings invert or soften against the artifact record, and the strongest transferable engineering is in seams the narration barely touched. Below, graduation candidates are deduped against existing framework coverage, merged across seams, and ranked by framework value.

---

## 1. Graduation shortlist

Ranked by framework value. Duplicates across the seven read seams are merged.

### G1 — Update-safe config-home: user state lives in the user's own store, never in shipped code
**(merges data-modeling "Meta-tab config-home" + plans-specs "Update-safe config-home")** — *PARTIAL*

Kai-RE ships as read-only `.md` skills updated centrally; all runtime-mutable user state (preferences, persisted scaffolding IDs, consents, provider routing, watermarks) lives in a Meta tab inside the *user's own* Google Sheet, so a plugin update can never overwrite it. The rule is stated hard: "The .md files never hold user config," paired with an explicit overridable-vs-locked boundary (users may steer voice/brokerage/state/vendors; may NOT edit deadline validation, duplicate handling, doc classification, approval guardrails), and operationalized by a per-spec "new Meta fields" manifest.

- **Lands:** the plugins/distribution investigation (`docs/investigations/2026-07-07-codex-and-claude-code-plugins-build-publish-gate.md`) as a first-class "user state across updates" rule; cross-ref from `OC_KB_07`'s rsync-excludes section as its plugin-distribution analogue; extend spec template `_dev/agent-improvement-spec-template.md` §4.2 with an overridable-vs-locked table + persisted-fields manifest.
- **Why #1:** the framework already carries the *sibling* hazard (rsync `--delete` wiping runtime-mutable paths) but has no rule for plugin-distributed agents where the author doesn't control the update. Highest leverage, and the most crisply-recorded decision in the corpus.
- **Effort:** new KB rule + small template edit.

### G2 — Data-modeling law for tool-call-read stores: normalize for integrity, denormalize for read-speed
**(merges data-modeling "normalize/denormalize" + missed-transcript "data-modeling law")** — *NEW*

When your datastore is read one API round-trip at a time (Sheets/Notion/Airtable), a JOIN is not free — every FK hop is a separate read tool call. Kai-RE stores each party twice on purpose: an inline denormalized hot field (`client_name`, `coop_agent_name`…) for the everyday single-tab "who's on this deal" read, plus a deduped `_contact_id` FK resolved lazily only when details are needed. It bans the naive fix ("never use live VLOOKUP/XLOOKUP — reading a computed cell doesn't save a read") and persists scaffolding IDs so the agent stops re-deriving folder/calendar IDs each session.

- **Lands:** a new capability-primitive KB (`OC_KB_15 — Datastore Modeling for Tool-Call Reads`) registered in `OC_KB_00_Index.md`, or a substantial new section under `OC_KB_10`'s Data layer, cross-linked from `OC_KB_03`. Four rules: (1) the tool round-trip is the cost unit, not the byte; (2) denormalize hot fields to collapse reads; (3) keep FKs for integrity, resolve lazily; (4) never delegate joins to spreadsheet formulas.
- **Why high:** genuinely absent as guidance and the largest unsurfaced engineering seam. But see **Conflict C1** — it must be reconciled with the existing duplicated-fact ban.
- **Effort:** new KB section (the biggest single writing task).

### G3 — Wide-row write discipline: full-width single-batch write + one consolidated read-back
*(data-modeling)* — *PARTIAL*

Write each wide Deals row as ONE full-width batch across all 45 columns (blanks included), never partial patches; pin volatile fields (`created_at`/`updated_at`) to fixed FRONT columns so partial writes can't misalign them; verify with a SINGLE consolidated range read, not per-cell re-reads. This replaced trailing-timestamp thrash that forced 3–4 corrective write-then-read cycles per deal.

- **Lands:** a short subsection on `OC_KB_11` Primitive 3 (Round-trip verification) — "3a. Make the write verifiable and the read-back cheap." The verify *half* already exists there; the write-side discipline (atomic full-width, volatile-fields-front, one-read verify) is net-new and makes the existing read-back primitive cheap instead of a read storm.
- **Effort:** new KB subsection. Naturally pairs with G2.

### G4 — Two-tier safety loading + domain-safety extension points
**(merges safety-compliance "two-tier loading" + "domain-safety layer/compliance.md" + "deadline-safety invariants")** — *PARTIAL*

Kai-RE splits safety by altitude. The universal four-rule spine (+ deadline-safety block) lives in `AGENTS.md` and is force-re-injected by a SessionStart hook on **four** matchers — startup, resume, clear, **and compact** (the load-bearing one: it re-asserts the spine after compaction evicts it). Layered onto it: (a) a labeled "irreversible domain invariants" block bolted into the *same* always-on file without diluting the abstract spine (never auto-close a protective deadline; "'All clear' is an honest count, not a hope"; dates from the signed doc not the email); and (b) a domain-safety output floor (`compliance.md` — Fair Housing, no legal/tax advice, no guaranteed outcomes, CAN-SPAM/TCPA) run as *silent self-checks on the agent's own draft before showing*, loaded lazily by the one skill it governs.

- **Lands:** `OC_KB_11` gains three named patterns — the "always-on spine vs path-loaded extension" tier model, the "domain-invariant extension point," and the "domain-safety output-gate layer." Canonicalize the four-matcher (incl. `compact`) SessionStart pattern out of the investigation doc and into the KB. Cross-ref `OC_KB_02` §references (lazy floors), `OC_KB_04` (always-on surface), `OC_KB_12` (newest-wins).
- **Why high:** reframes the KB's "safety is one spine" claim into spine + per-domain floors with a deliberate enforcement asymmetry. But see **Product Risk R2** — in Kai-RE this floor is unhooked and unrun.
- **Effort:** new KB section (medium).

### G5 — Planning taxonomy: `[EDIT]` / `[RUN]` / `[DECIDE]` closure-owner tags
*(missed-transcript)* — *PARTIAL*

Tag every plan item by who can close it and how: `[EDIT]` = agent changes repo files; `[RUN]` = live validation only the user can perform (cannot be "done" by editing); `[DECIDE]` = strategy call not blocking the near-term run. Plus a "Minimum set that MUST land before the next live run" sequencing header. Makes it structurally impossible to fool yourself that a product is validated by editing docs.

- **Lands:** harden `/plan`'s Output Format (`.claude/commands/plan.md` Implementation Steps) with the inline tag, where `[RUN]` items auto-flow into `docs/smoke-tests-pending.md` (closing the loop to the existing done-vs-true-closure ship gate) and `[DECIDE]` maps to the scope-graduation gate.
- **Why:** the framework enforces the edit-vs-validate seam only at *ship* time across separate artifacts; this surfaces it at *plan-authoring* time in one artifact.
- **Effort:** small command edit.

### G6 — Capability-abstraction routing: skills route off capability, not vendor
**(merges data-modeling "provider-agnostic routing" + plans-specs "per-capability provider_stack")** — *PARTIAL*

A `provider_stack` key in Meta maps four capabilities — email, calendar, files, database — to whichever vendor provides each, with a mixed stack first-class (files=Dropbox while database=Sheets). "Skills route off the capability, never a hard-coded vendor." The design was *derived*, not asserted: Codex's connector directory has Outlook/SharePoint/Dropbox/Smartsheet but no standalone Excel and no monolithic Microsoft store, so a real second stack is capability-mixed, not vendor-monolithic — the recorded decision names the abstraction boundary AND the market evidence forcing it.

- **Lands:** `OC_KB_01_Architecture.md` as a named "capability abstraction" pattern (name the capabilities → keep user-facing language vendor-neutral → route internal calls through a user-recorded capability→provider map), with a cross-ref addition to `OC_KB_03` for the multiple-interchangeable-connectors-per-capability case (a real fixed-toolset gap). NOT `KB_1_Architecture` (per-project stub).
- **Effort:** new KB section (medium).

### G7 — Durable per-capability gotcha artifacts, force-read before acting
**(merges missed-transcript + data-modeling + safety-compliance "calendar-gotchas.md")** — *PARTIAL*

`calendar-gotchas.md` exists to stop the agent rediscovering environmental quirks every run (adding attendees emails them + double-displays; secondary calendars need an `@`-form ID not a display name; deadline holds auto-attach a Meet link). Distinct from the monolithic `LESSONS.md`: it is capability-scoped, force-read by the owning skill at the top of the relevant step ("read it before you create, invite to, or write a deadline onto any calendar"), each entry keyed to a **verbatim** failure signature, and grown incrementally from live tests (commit `48c98a6` appended the exact error string). This is the lightweight learn-once/write-back loop *without* auto-mutating memory.

- **Lands:** extend `OC_KB_02_Skills.md` §references (~line 178) with the gotcha-log / force-read-before-acting variant seeded and amended verbatim from live-run error strings; cross-ref as the low-ceremony front-end to `OC_KB_13`'s edge-case library; one-liner in `LESSONS.md` distinguishing the capability-scoped tier from the project-wide log.
- **Effort:** small doc edits in two places.

### G8 — Slice→plugin build pipeline + dual-ecosystem packaging
**(merges plugin-repo "one-way build pipeline" + "dual-ecosystem layout")** — *PARTIAL*

`tools/build-plugin.py` deterministically regenerates a public plugin from the private source repo (flat `skills/<name>.md` → `SKILL.md` folders, injects frontmatter, strips stray fences, rewrites cross-refs, synthesizes Codex `agents/openai.yaml` UI chips). The private repo is the edit surface; the public snapshot is regenerable, so slice drift is a re-run, not a re-port. It targets both ecosystems from one payload via parallel manifest sets (Claude reads `.claude-plugin/*`; Codex reads `.codex-plugin/*` + `.agents/plugins/marketplace.json` with structured source/policy), with the mandatory `plugins/<name>/` nesting Codex requires; skills/AGENTS.md/references/hooks are shared verbatim, only chips+icon diverge.

- **Lands:** the individual facts already live scattered in the 2026-07-07 investigation. The graduation delta: a consolidated "one payload, two manifest sets" comparison table (shared-verbatim vs host-divergent split), and — if promoting to an operational surface — a `/package-plugin` skill in `.claude/commands/` plus a cross-ref from `/ship` so distribution follows deploy. The framework has *no* packaging phase after `/ship`.
- **Effort:** new skill + KB table (largest if the skill is built; small if doc-only). See **Product Risk R7** for the build-script footguns any such skill must guard against.

### G9 — Audience & Voice spec section: verbatim copy + per-phrase rationale + forbidden-vocabulary list
*(plans-specs)* — *PARTIAL*

For a conversational agent the exact words *are* the implementation. Kai-RE's spec pins a 12th-grade reading level and a hard never-say list (MCP, API, schema, JSON, OAuth, scope, "database structure"), embeds the literal scripts Kai speaks, and annotates why each phrase is chosen (reassurance must ride on "I won't change, send, move, or delete a single thing" and must NOT add "I'm only looking" because it "reads weird"). The template is entirely abstract with no home for user-facing copy.

- **Lands:** add an "Audience & Voice constraints (non-negotiable)" section to `_dev/agent-improvement-spec-template.md` (reading level + forbidden-term list + verbatim-copy-with-rationale convention); extend `OC_KB_04`/`OC_KB_05` (SOUL.md/Tone) with the reading-level/never-say pattern.
- **Effort:** small template + KB edit.

### G10 — Committed, ID-addressable validation ledger (anti-pattern: gitignored TODO)
*(history-validation)* — *PARTIAL*

The positive pattern (`smoke-tests-pending.md` with stable IDs + literal-state ship gate) already exists. Kai-RE demonstrates the **failure mode**: its entire readiness sequence lives in a *gitignored, untracked* `TODO.md` that never reaches the derived plugin, and every Phase 1–6 box is still `[ ]` unchecked even though the work landed in commits. The delta to graduate is normative: name the gitignored-parallel-ledger anti-pattern and require git-tracked `[RUN]` state.

- **Lands:** anti-pattern line in `OC_KB_11` §Supervision-surface ("must be git-tracked; a gitignored TODO is not a supervision surface and never reaches a derived plugin"), a DO-NOT in `CLAUDE.md`, and optionally tighten `/ship` Step 3.5 to assert the `[RUN]`-item ledger is committed.
- **Effort:** small doc edits. Pairs naturally with G5.

---

## 2. Conflicts

**C1 — "Denormalize hot fields" (G2/G3) vs the framework's duplicated-fact ban.** `CLAUDE.md` DO-NOT and `OC_KB_10` (line 108) forbid "the same fact in two stores with no canonical source" — a facts-diverge-silently trap. G2's hot fields deliberately store each party twice. These are reconcilable but only if graduated carefully: the framework rule targets *duplication across independent stores with no owner*; the hot field must be graduated as a **named denormalized cache over a single canonical source** (the Contacts tab), written by the same batch operation, not an independent copy. If G2 lands without this reconciliation it will read as licensing the exact anti-pattern the DO-NOT list bans. This is the one place the shortlist directly abuts existing canon and must be worded to strengthen, not contradict, it. (Note: the stale-README bug in R4 is the duplicated-fact trap actually *firing* — evidence that the ban is right and the cache must name its canonical owner.)

No other `CONFLICTS`-status candidates.

---

## 3. Already covered (no action)

- **Alternatives-comparison / "Product Shapes" trade matrix** — already `/brainstorm`'s Final Output Format (per-option blocks + recommendation), consumed by `/plan-review` decision-grounding; the winner-only spec template §1 is the intended downstream home by design (twice-rejected in the sister-framework spec).
- **SessionStart safety-spine re-injection hook mechanics** — fully documented in the 2026-07-07 investigation Part 4 (four matchers, `${CLAUDE_PLUGIN_ROOT:-$PLUGIN_ROOT}` dual-runtime fallback, Codex trust-gating, `~/.codex/AGENTS.md` backstop). *Note:* the four-matcher pattern is referenced by G4 for canonicalization into a KB — that's a promotion of form, not missing content.
- **The `framework-intake` seam candidate** — empty placeholder tokens; nothing to evaluate.

---

## 4. Product risks & debt (Kai-RE / kai-re-plugin — not framework)

Ranked by severity.

1. **Core value loop has never fired end-to-end.** Every artifact is authoring/design. TODO Phase 6a (real OPEN deal — future protective deadlines, their reminders, the "never auto-close inspection/loan/appraisal/title" guardrail) and 6b (draft-email) are both open. All prior runs were on a CLOSED file. Commit `2bb9476`: "Not yet exercised by a live run." Everything graduated from Kai-RE is **design-validated, not runtime-proven** — the framework should ideally require a live end-to-end pass before promoting a pattern from a downstream product.
2. **The compliance floor is unenforced and unrun — on a Fair-Housing (legal-liability) surface.** `compliance.md` is *not* hooked; it fires only via `draft-email.md`'s prose "silently run it through references/compliance.md." Any client-facing text drafted off a different path skips the entire floor, with no session-level guardrail. And draft-email — the sole skill that puts the user's name in another person's inbox — has executed **zero times**. The one content-safety layer is both unhooked and untested.
3. **IP protection is an OPEN architectural fork, shipped-in-the-clear by default.** The crown-jewel contract date/deadline extraction ships as readable markdown; "a skill is a loading mechanism, not a security boundary." The only real protection is server-side-behind-an-API (thin-client plugin). TODO 7a keeps this deferred with "Decide early — it shapes the architecture," yet the logic has shipped plaintext across a dozen version bumps without the decision being made.
4. **Stale README ships a deleted dependency.** Schema-v2 removed the Google Contacts dependency (people now live in the Sheet's Contacts tab; even dropped from the onboarding probe). But `Kai-RE/README.md` (source) still says "Keep your people organized in your Google Contacts." This is the duplicated-fact-diverges trap firing on the marketing surface — the operational spine was fixed and propagated, the human-facing doc rotted. *(But see First-Pass Correction FP6: the divergence is in the SOURCE repo README, not the shipped plugin, which was authored fresh and is correct.)*
5. **No committed validation ledger.** The readiness plan is gitignored and every box is stale-unchecked despite the work landing — the only durable validation signal is prose in commit bodies. (This is the concrete instance behind graduation G10.)
6. **Versioning is decorative.** Zero git tags in either repo. Versions run 0.1.0→0.1.7 then jump to 1.7.1 — carried by an *icon-only* commit (`1d359eb`) with no rationale. Version is duplicated across two manifests bumped by hand (drift-prone), gating nothing. A version string reading like a confident 1.x release on a product that has never run end-to-end.
7. **Build-script footguns.** `build-plugin.py` has asymmetric file ownership: generated dirs (`references/`, `assets/`) are `rmtree`'d and recopied every run (manual edits silently lost), while hand-maintained files (manifests, README) never propagate from source. Separately, frontmatter injection reads a hand-kept 4-skill allowlist and **KeyErrors** (rather than failing gracefully) if a currently-frontmattered skill ever loses it. Any `/package-plugin` graduation (G8) must guard both.
8. **`compliance.md` ships wrapped in a stray ```markdown fence** (lines 1 and 78), unlike every other reference. `build-plugin.py` strips fences from *skills* only, not references, so the fence rode verbatim into the shipped plugin's most liability-sensitive file. Cosmetic at best; risks degraded rendering/truncation at worst.

---

## 5. First-pass corrections (artifacts contradicted or refined the narration)

1. **The "self-editing knowledgebase" premise was REVERSED, not affirmed.** The session opens on "can a GPT edit its own knowledgebase .md files?" and narration leans affirmative ("let onboarding write preferences back into the docs… self-updating knowledgebase"). But the durable artifact records the opposite: TODO Decision 4 + RAW NOTES mark write-back-to-docs **"SUPERSEDED"** in favor of the config-vs-code split (config in the user's Sheet; `.md` never holds config). Any framing of Kai-RE as a self-editing-KB exemplar is inverted from what shipped.
2. **"112-call regression" is a mislabel** — it was a first-run baseline inefficiency, not a degradation. Git shows only `Initial` → `Schema v2`; no faster prior version existed. The 112-call run was the *first* exercise of the initial schema. This is a *stronger* argument for "design your read/write discipline up front" than "watch for regressions."
3. **"Safety spine bundled via SessionStart hooks" oversimplified.** The hook bundles ONLY `AGENTS.md`, across four matchers (the `compact` one being the point). `compliance.md` and `calendar-gotchas.md` are NOT hooked — lazily skill-loaded. The framework-relevant insight is the deliberate **enforcement asymmetry** (compaction-proof spine vs best-effort domain floors), not the mere existence of `compliance.md`.
4. **The onboarding spec was called "locked" — it carries no LOCKED header.** Its subtitle is "_Working design doc_" and it still holds unresolved `[VERIFY per host]` flags. Under the framework's own convention, implementation proceeded off an admittedly-provisional design — exactly the state the LOCKED gate exists to flag.
5. **The Meta-tab config pattern was under-weighted as "only glancing"** — in the artifacts it is a first-class, twice-stated decision (distribution Decision 5 + TODO Decision 4) operationalized by the onboarding spec's §9 field manifest. Arguably the single most crisply-recorded decision in the corpus (this is why it is graduation G1).
6. **The stale "Google Contacts" README is the SOURCE repo's, not the shipped plugin's.** The critic asserted the *shipped* plugin README carries the claim; verified false across its full history. `build-plugin.py` deliberately excludes README from sync, so the plugin README was authored fresh and correct while the source README rotted independently — the two files were conflated.
7. **"9 releases" is internally inconsistent and overstated.** The first-pass timeline presents "versioned across 9 releases" as a shipping achievement while its own §3 scare-quotes "12 releases" when debunking. Ground truth: 9 version strings, 12 commits, **zero** tags, zero published releases. Accurate framing: "nine manifest version-string bumps, none an actual release."

---

## 6. Recommended sequencing

A pragmatic order that front-loads highest-leverage, resolves the one conflict early, and clusters by target file to minimize KB churn.

1. **G1 (config-home) + G10 (committed ledger).** Highest leverage, lowest ambiguity, both are doc/rule additions. G1 fills the framework's missing plugin-distribution story; G10 is a small anti-pattern line the field evidence directly justifies. Do these first.
2. **Resolve Conflict C1 on paper** before writing G2/G3 — decide the exact wording that frames the hot field as a named cache over a canonical source, so it strengthens rather than contradicts the duplicated-fact DO-NOT. This unblocks the data-modeling work.
3. **G2 (data-modeling law) + G3 (write discipline).** The single largest writing task (new KB) plus its natural companion on `OC_KB_11` P3. Do together; they share the same motivating case (the 112-call run — relabeled per FP2).
4. **G4 (two-tier safety).** New `OC_KB_11` section. Sequence after G3 since both touch `OC_KB_11`; land the write-discipline subsection and the safety-tier section in one editing pass.
5. **G5 (plan taxonomy) + G7 (gotcha artifacts).** Small, independent command/doc edits. G5 closes the loop with G10's `[RUN]` ledger; G7 touches `OC_KB_02`.
6. **G6 (capability abstraction) + G9 (audience/voice).** Medium KB/template additions, independent of the above.
7. **G8 (packaging pipeline).** Largest if the `/package-plugin` skill is built; defer until the pattern's shape is settled and fold in the R7 build-script guards as acceptance criteria. Doc-only consolidation (the dual-manifest table) can land earlier if a skill isn't yet warranted.

Throughout: label anything graduated from Kai-RE as **design-validated, not runtime-proven** (Product Risk R1) — the source product has never cleared a live open-deal run.

---

## 7. Late additions — candidates recovered after dedup-agent failures

Seven dedup agents died on structured-output retries; three of their candidates duplicated items checked via sibling seams (config-home → G1, provider routing → G6, compliance floor → G4). The four unique ones were re-checked individually. All four came back **PARTIAL**:

### G11 — Persist scaffolding IDs at first-run setup
After creating cloud artifacts (Drive folder, calendar, spreadsheet), store their IDs in the persistent config surface (Meta tab) so later sessions jump straight to the resource instead of re-searching by name — fewer tool calls, and no duplicate-name ambiguity / accidental re-creation.
**Dedup:** PARTIAL — the "pointer to where the truth lives" principle exists (OC_KB_04 line 54, CLAUDE.md DO-NOT), and an ID pointer is the sanctioned thing to store; but the concrete first-run capture-IDs pattern with its idempotency payoff is unnamed. **Lands:** OC_KB_04 cross-reference-patterns section, linked to OC_KB_10/11 idempotency. Naturally folds into G2.

### G12 — Claim-verification lifecycle in-spec: `[VERIFY per host]` → `[RESOLVED]` / `[RESOLVED, corrected: …]`
Every host-capability/environment claim a spec relies on gets an inline `[VERIFY]` tag; each must be resolved against the real install and rewritten as `[RESOLVED…]` before lockdown. The spec carries its own verification ledger.
**Dedup:** PARTIAL — plan-review §3a + §6 already block lock on unresolved assumptions, and the tag idiom exists ad hoc (`[VERIFY-on-runtime-host]` in context-instrumentation-spec.md); missing is formalization: `[VERIFY…]` in plan-review §6a's blocking-marker grep list, the `[RESOLVED…]` end-state convention, and seeding in the spec template. **Lands:** plan-review.md §6a + §3a; _dev/agent-improvement-spec-template.md. Small edits; pairs with G5.

### G13 — Enforcement-class encoding: SOFT promise vs HARD gate, stated together
Label every safety rule by enforcement class — SOFT (behavioral promise, e.g. folder-only access on an account-wide connector) vs HARD (host-enforced, e.g. Codex's write approve prompt) — and always state the soft promise and hard gate together; never dress a promise as a wall.
**Dedup:** PARTIAL — the control-engineering half is OC_KB_11 doctrine (Primitive 0, least-privilege scoping) and the raw observation sits in the first-pass harvest; missing are the labeling convention and the user-facing honesty doctrine (disclosure rule, not just control rule). **Lands:** OC_KB_11 least-privilege section, with OC_KB_12's flag taxonomy as structural precedent.

### G14 — Parked-vs-Deferred: classify open decisions by architectural upstream-ness
Open items are split into upstream forks (reshape everything downstream — flag "decide early"; e.g. the TODO 7a IP-protection fork) vs genuinely deferrable (nothing depends on them), each with a recorded why-safe-to-sit rationale.
**Dedup:** PARTIAL — plan-review Step 6a handles only execution-time fork-triggers and treats every design-time open fork as binary UNRESOLVED; spec template §10 is exactly the flat backlog the pattern argues against. **Lands:** spec template §10 (upstream/deferrable split) + plan-review Step 6a refinement. Note: R3 (IP fork shipped-in-the-clear) is this anti-pattern firing live.
