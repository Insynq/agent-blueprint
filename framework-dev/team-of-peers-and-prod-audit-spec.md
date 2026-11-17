# Agent improvement spec — agent-blueprint — Team-of-peers topology + live-prod audit — 2026-06-29

> **Status: DRAFT (exploratory).** Authored from a review of 6 eXp Onboarding weekend transcripts (2026-06-27→29). Not yet implementable — run `/plan-review` to LOCK before `/implement`. Origin: `[[exp-team-of-peers-pattern]]` review (26-agent verification Workflow `wf_b1358d53-52e`, adversarially verified; one cross-lens lost to the `[PROCESS-3]` retry cap — see §7).

> **Scope note:** this spec changes the **canonical framework** (`docs/MULTI_AGENT_WORKFLOW.md`, `.claude/commands/*`, a new skill, `docs/LESSONS.md`). It does **not** touch the eXp app. The one product bug surfaced (the booking dead-end) is recorded in the Evidence appendix as a hand-off to the eXp repo, not framework work.

---

## 1. Confirmed Decisions

| # | Decision | Choice | Reasoning | Date |
|---|---|---|---|---|
| 1 | How to document the weekend's coordination shape | Add **Topology 3 — Team-of-peers (horizontal)** as a third documented topology in `MULTI_AGENT_WORKFLOW.md`, alongside single-window and PM/worker | The framework only documents *vertical* coordination (PM → ephemeral workers receiving locked plans). The weekend ran *horizontal* coordination (N long-lived co-equal role windows reviewing each other). Genuinely orthogonal; not a variant of PM/worker. | 2026-06-29 |
| 2 | How to name the async-handoff primitive | Name it precisely as **`ScheduleWakeup`** (the `/loop` self-pacing wakeup), explicitly **NOT** `openclaw cron`/routines | An operator reaching for "scheduling" today finds only `cron` (OC_KB_06), a runtime-host mechanism — the wrong tool. The chain depended on `ScheduleWakeup`; the framework mentions it nowhere. | 2026-06-29 |
| 3 | Entry point for the peer pattern | A **thin `/convene` sibling command**, NOT a branch of `/orchestrate` | `/orchestrate` is too worker-coupled (74 worker mentions / 316 lines) to graft a co-equal-peer branch without bloat. Keep peer-mode opt-in and separate. | 2026-06-29 |
| 4 | How the live-prod UI audit capability ships | A new **`/prod-audit` skill** carrying a reusable **safety contract**; audit creds live in **env / a gitignored file**, never pasted into the prompt | The S6 prod-audit prompt is a gold-standard template, but its password is plaintext in the prompt → written to the transcript JSONL on disk. Codify the capability *with* its guardrails. | 2026-06-29 |
| 5 | The sharpest lesson to codify | `docs/LESSONS.md` — **smoke the user's end-to-end job, not the component you built** | The build window (S4) read the booking copy and rationalized away its own gap ("button correctly doesn't render"); the smoke (S2) tested an *ungated* phase and never visited the booking item. Both are component-scoped misses, not job-scoped. | 2026-06-29 |
| 6 | Lock status | DRAFT until `/plan-review` writes `Status: LOCKED` | Framework convention: drafts without the LOCKED header are exploratory; `/implement` and `/orchestrate` Phase 6 gate on it. User will continue on another machine. | 2026-06-29 |

## 2. Sequence

> Dependency-ordered. Each line is a single-PR-sized slice.

1. **(Optional pre-step) Back-port the eXp-drifted sections** into canonical `MULTI_AGENT_WORKFLOW.md` so the new sections slot onto the current base (the field copy is 542 lines vs canonical 408 — see §6.4). Land the genuinely-absent slices only (e.g. "Scaling the PM across waves"); do not blindly copy.
2. **Add Topology 3 — Team-of-peers** section to `MULTI_AGENT_WORKFLOW.md`: role-charter windows, the **Parts-ledger** shared-doc template (append-only numbered Parts, one role per Part, role+date stamp, single top status line, lettered Q-routing, provenance footer), and **concurrency rules** (append-only mandatory; claim-before-edit; exactly one ratifier owns the `Status: LOCKED` header).
3. **Add the "Async handoff via self-scheduled wakeup" subsection** (D2): name `ScheduleWakeup`, give delay guidance (cache window: <270s warm vs 1200s+; stagger peers), and the rule **prefer a "ready signal" in the doc over a blind wall-clock timer**.
4. **Add `docs/LESSONS.md` entries:** `[PROCESS-6]` smoke-the-user's-job (D5) and a fail-loud guard for schema-forced fan-out drop (extends `[PROCESS-3]`; ties to OC_KB_11 Primitive 9).
5. **Extend `.claude/commands/plan-review.md` Step 6a:** when a peer-coordination doc is detected (Q-routing + numbered Parts), assert (a) **every `Q-<letter>` has a `↳ role → §` answer**, (b) zero open blockers, and (c) **single-writer header ownership** — exactly one role writes `Status: LOCKED`, and prose verdict == the machine-readable status line.
6. **Create the `/prod-audit` skill** + a CLAUDE.md command row, carrying the safety contract (§7).
7. **Create the thin `/convene` entry point** that scaffolds the per-peer seed prompts + the Parts-ledger skeleton (`_dev/peer-plan-doc-template.md`). Depends on step 2.

## 3. Framing

The framework's `docs/MULTI_AGENT_WORKFLOW.md` documents exactly one multi-role shape: a vertical hub-and-spoke — one persistent PM context window dispatching short-lived workers that receive locked plans (never forks) and return one summary, with the human relaying up and down in real time. Over the weekend of 2026-06-27→29, the eXp Onboarding repo ran a **different topology that worked well and is invisible to the framework**: three long-lived, co-equal, role-specialized human-driven windows (Systems Architect, UI Designer, UX Engineer), plus a downstream prod-audit window, that **reviewed and answered each other** through a shared append-only "Parts ledger" document, handed off asynchronously via `ScheduleWakeup` timers, and audited the live production app with Playwright through a disposable login.

The cost of leaving this undocumented is twofold. First, the pattern is **un-reproducible**: every one of the six sessions opened with a hand-rolled free-text role prompt, and the coordination conventions (numbered Parts, lettered Q-routing, the LOCKED-header convergence gate) were re-invented in prose each time. Second, its **failure modes were dodged by luck, not design**: the shared doc had no lock and hit "File has been modified since read" three times (a real near-clobber); the convergence status lived in two places that drifted (prose said "LOCKED" while the status line still said "pending Q-D"); and one peer's wakeup fired 60 seconds after the peer it was waiting on finished — a 90-second-slower peer would have woken to a half-finished document.

The capability is real and proven (Program Engine V2 shipped to prod; the prod audit caught a population-wide P0). The job of this spec is to **codify the topology, template the coordination doc, name the scheduling primitive, harden the three realized failure modes, and ship the prod-audit capability with the safety contract that made it safe** — so the next operator gets the pattern, not a blank prompt.

## 4. Target State

### 4.1 Success criteria

- `MULTI_AGENT_WORKFLOW.md` documents three topologies; a reader can pick team-of-peers and find the Parts-ledger template, the Q-routing convention, the concurrency rules, and the async-handoff guidance without inventing them.
- The async-handoff primitive is named (`ScheduleWakeup`) and disambiguated from `cron`; delay-setting guidance prevents both the cache-miss tax and the wake-to-half-finished-doc race.
- `/convene` produces, from a one-line "Architect + UI Designer + UX Engineer on <goal>" request, the per-peer seed prompts and an empty Parts-ledger doc.
- `/prod-audit` exists and, when run, refuses to proceed without the safety contract (disposable account, no outward-facing side effects, logged-out flows last, read-only on code, creds-from-env).
- `plan-review` Step 6a mechanically rejects a peer-coordination LOCK when any `Q-<letter>` is unanswered or the prose/status-line disagree.
- `docs/LESSONS.md` carries the smoke-the-job lesson and the fail-loud fan-out guard.

### 4.2 Data model changes

- New file: `docs/MULTI_AGENT_WORKFLOW.md` (edited, not new) + a new `_dev/peer-plan-doc-template.md` (Parts-ledger skeleton).
- New command: `.claude/commands/convene.md`.
- New skill: `workspace/skills/prod-audit/SKILL.md` (or a `.claude/commands/prod-audit.md`, per where the project routes user-invokable audits) + a CLAUDE.md command-table row.
- New env convention: `PROD_AUDIT_URL` / `PROD_AUDIT_EMAIL` / `PROD_AUDIT_PASSWORD` in `.env.local` (gitignored), referenced by `/prod-audit` — never inlined into a prompt.

## 5. Capability Fixes
*(by OC_KB_10 capability layer)*

### 5.1 Perception
- N/A — no input-ingestion defect in scope.

### 5.2 Extraction
- N/A.

### 5.3 Reasoning
- **Self-rationalization of a component-scoped gap.** A building window read the literal "Use the Schedule button above" copy and concluded the absent button "correctly doesn't render" rather than asking whether the *agent's job* (book the call) was completable. Fix: `[PROCESS-6]` smoke-the-user's-job + a `/prod-audit`/smoke gate that walks the end-to-end task, not the built component. See OC_KB_10 §Reasoning.

### 5.4 Action
- **Shared-doc concurrent write with no lock.** Append-only was convention, unenforced; "File has been modified since read" fired ×3. Fix: append-only-mandatory + claim-before-edit + single-ratifier header ownership (step 5). See OC_KB_10 §Action, OC_KB_11.
- **Credentials in context.** Prod password pasted into the prompt → persisted in transcript JSONL. Fix: creds-from-env contract in `/prod-audit` (D4). See OC_KB_11 (least privilege: no keys in context).
- **Prod-write blast radius.** Live audit on a 53-real-agent app. Fix: the safety contract's "disposable account + no outward-facing side effects (no invites / messaging real people / real bookings) + logged-out flows last + read-only on code." See OC_KB_11.

### 5.5 Data
- **Dual source of truth for convergence status.** The LOCKED state lived in both the top status line and Part-prose, and they drifted (Part 10 caught it). Fix: one canonical status line; prose must not assert a lock the status line doesn't. See OC_KB_10 §Data.

## 6. Capability Enhancements
*(by OC_KB_11–14 enhancement axis)*

### 6.1 Trust & Traceability
- **Provenance footer convention** — the ledger's closing paragraph attributed every Part to its authoring role *and method* (e.g. "Part 5 = an 8-agent adversarial verification vs live SQL + a write-guard exercise"). Codify it in the Parts-ledger template. See OC_KB_12.

### 6.2 Proactive Intelligence
- **`ScheduleWakeup` async handoff** as the self-pacing cross-window primitive, documented with delay rules and the "ready-signal > blind-timer" guidance. Explicitly distinguished from `cron` (OC_KB_06). See OC_KB_06, OC_KB_13.
- **Fail-loud guard for schema-forced fan-out** — a `StructuredOutput`-retry-cap death drops coverage silently while "complete" is asserted (it recurred *in this very review* — §7). Extend `[PROCESS-3]`: stub-verdict = `UNVERIFIED` + a coverage-count assertion so dropped work fails loud. See OC_KB_13, ties to OC_KB_11 Primitive 9.

### 6.3 Communication & Collaboration
- **The Parts-ledger as a peer↔peer message bus** — append-only numbered Parts + **lettered Q-routing to a named peer** (Q-A/B/C → Architect, Q-D/E → Designer) + one convergence gate. This is the core enhancement: the framework's only hand-off protocol today is vertical PM↔worker. See OC_KB_04 §hand-off protocols.

### 6.4 Learning & Evolution
- **Close the canonical-behind-downstream harvest gap.** `/update-framework` pulls canonical *into* downstream, but nothing harvests proven improvements *back out*: the eXp copy of `MULTI_AGENT_WORKFLOW.md` (542 lines) has 5 sections canonical (408) lacks. Add an intake step (in `/update-framework` or `/retro`) that flags downstream drift-ahead for back-port. See OC_KB_13.

### 6.5 Operational Excellence
- N/A for this spec (no SLO/dashboard scope) — but the safety contract's "logged-out/destructive flows last" is an operational-sequencing rule worth keeping in the `/prod-audit` skill. See OC_KB_14.

### 6.6 Meta-Capabilities
- **Live-prod UI audit** as a first-class capability (`/prod-audit`) — the framework's audits today are code/infra static (`/audit-code`, `/audit-infra`, `/audit-full`); none drives the running product. Three windows drove `retrailhead.com` (122/95/46 Playwright calls) and found what static review can't. See OC_KB_11 §8.

## 7. Cross-cutting Principles

- **No outward-facing side effects in a prod audit** — disposable account; never invite, message a real person, or book a real calendar slot (OC_KB_11; CLAUDE.md DO-NOT spirit).
- **No keys in context** — audit creds load from env/gitignored file, never the prompt/transcript (OC_KB_11 least-privilege).
- **Fail loud or fail closed; never fail silent-open** (OC_KB_11 Primitive 9) — applies to the schema-forced-fan-out drop guard.
- **One canonical source of truth for status** — a convergence gate may not be encoded in two places that can drift.
- **Peer mode is opt-in** — the single-window default and the PM/worker loop are unchanged; team-of-peers is a third option a user explicitly chooses.

## 8. Relationship to Other Specs

- Depends on: none (additive).
- Supersedes: none.
- Runs alongside: `docs/done-vs-true-closure-spec.md` (the smoke-the-job lesson is its end-to-end twin); references `docs/LESSONS.md` `[PROCESS-3]`/`[PROCESS-4]` (the fan-out brittleness this spec's §6.2 guard hardens).

## 9. Parallel Tracks

### Track A: Doc additions (the proven core)
- `MULTI_AGENT_WORKFLOW.md`: Topology 3 + Parts-ledger template + concurrency rules + the `ScheduleWakeup` async-handoff subsection; `_dev/peer-plan-doc-template.md` skeleton. **If only one track ships, ship this.**

### Track B: Live-prod audit capability
- `/prod-audit` skill + safety contract + env-creds convention + CLAUDE.md row. Independent of A.

### Track C: Seam hardening
- `plan-review.md` Step 6a (Q-routing + single-writer header check) + `LESSONS.md` `[PROCESS-6]` + the §6.2 fail-loud fan-out guard. Independent of A and B.

### Track D: Entry point
- `/convene` command. **Depends on Track A** (it scaffolds the template A defines).

## 10. Deferred / Out of Scope

- **Replacing `ScheduleWakeup` timers with a real dependency/inbox signal** — deferred: bigger design; document the "ready-signal > blind-timer" principle now, build the mechanism later.
- **Refactoring `/orchestrate` to host peer mode** — out of scope: explicitly kept separate (Decision 3).
- **Back-porting all 5 eXp-drifted sections** — deferred to its own intake pass; only the genuinely-absent slice is in scope as the optional step 1.
- **Fixing the eXp booking dead-end** — out of scope: it's an eXp app bug, not framework (handed off in the Evidence appendix).

## 11. Prioritization Hints

- **If only one thing ships:** Topology 3 + the Parts-ledger template (Track A core) — it captures the whole proven pattern and is what makes it reproducible.
- **Highest risk:** `/convene` scope creep, and the concurrency rules leaking into the single-window default. Mitigate: peer mode strictly opt-in; `/convene` stays thin (scaffold-and-exit, no phase loop).
- **Lowest-cost-highest-value:** the `LESSONS.md` smoke-the-job entry + the single-writer LOCKED-header rule — two small edits that each kill a *realized* failure.

---

## Appendix — Findings & Evidence

Reviewed transcripts (eXp Onboarding repo), most-recent-6 substantive sessions of the weekend, plus the architect-joining session for context:

| Tag | Session | Role | When |
|---|---|---|---|
| C0 | `31b52256` | Systems Architect (joining) | Jun 26 22:04 |
| S1 | `01577932` | Architect+Implementer — engine slice (migs 1–4) | Jun 27 16:36 |
| S2 | `38081dce` | Architect+Implementer — content slice + flip | Jun 27 18:39 |
| S3 | `95da408f` | UI Designer (team) → later prod UX audit | Jun 27 23:05 |
| S4 | `d625dbf7` | Systems Architect (team) → implement → ship | Jun 27 23:21 |
| S5 | `54bafebd` | UX Engineer (team) | Jun 27 23:23 |
| S6 | `f855f537` | UI/UX prod audit (chained fresh window) | Jun 29 00:00 |

**What worked (evidence):**
- Shared **Parts-ledger** doc `docs/plans/program-engine-v2/NEXT_BUILD_ui-layer.md` — Parts 1→11, lettered Q-routing (Q-A/B/C→architect §8, Q-D/E→designer §9), one `Status: LOCKED 2026-06-27` gate, per-role provenance footer. A waking peer reads only new Parts, not a re-summarized context dump.
- `ScheduleWakeup` async handoff — 3 calls: S3 (3600s), S4 (1800s), S5 (1800s).
- Live-prod Playwright audit — S3=122, S6=95, S4=46 calls against `retrailhead.com`; S2=13, S5=15 local smoke.
- The verification disciplines fired: 8-agent adversarial refutation passes; `/audit-rls` found 2 over-permissions the window's own check missed; byte-for-byte parity proof of the inert engine.

**Realized failure modes (evidence):**
- **Concurrency:** S3 hit "File has been modified since read" **×3** on the shared doc; the agent noted "another context appears to be editing it."
- **Status drift:** Part 10 caught the doc asserting "PASS, header written" in prose while the top status line still said "pending Q-D."
- **Blind-timer near-race:** UX Engineer landed **Part 7 at 01:06:05**; Architect's 30-min wakeup (set 00:36:50) fired at **01:07:05** — a **60-second** margin.
- **Creds in transcript:** S6 prompt contains a plaintext prod password → persisted on disk.
- **`[PROCESS-3]` recurrence in the review itself:** the 26-agent review Workflow lost its audit-quality cross-lens and an 'ia' design area to `StructuredOutput` retry-cap deaths.

**Correction folded in (don't over-claim):** the booking dead-end was largely a *known/pre-existing* issue carried in the seed copy, not a fresh heroic catch. The valuable signal is the *build-window self-rationalization* (S4 ~03:01) and the *wrong-surface smoke* (S2 tested an ungated phase) — hence `[PROCESS-6]` is framed as "smoke the job," not "audits are heroes."

**Hand-off to the eXp app (not framework work) — open P0:** the booking step ("Book Onboarding Call 1") copy says *"Use the **Schedule** button above…"* but `BookingCTACard.tsx:78` (`if (!sponsor?.booking_url) return null`) suppresses the button whenever the sponsor has no booking link (the default-empty state). Copy is hard-coded in both seeds — `supabase/migrations/20260529100000_seed_v1_content.sql:956` (V1) and `20260626000500_program2_items.sql:196` (V2 Template #2) — with no fallback; Call 1 gates the next phase → dead-end. Fix: template the sentence on `booking_url` + add a "contact your sponsor" fallback.
