# Framework intake spec — kai Jul 2–6 harvest + 12-judge panel — 2026-07-06

> **Status: LOCKED 2026-07-06** — lock review by the maintainer session (Fable): all 19 edit anchors verified verbatim-unique against live files; all 21 open decisions resolved inline below; D4 upgraded from optional to adopted.

> **Provenance.** Derived from a 15-transcript kai-openclaw harvest (2026-07-02→06), stress-tested by a 12-judge Fable+Opus adversarial panel on 2026-07-06.
> Every change was verified against primary transcripts, not synthesis summaries.
> The panel corrected 5 synthesis-layer errors before this spec was assembled.

> **Scope note.** This initiative improves the **canonical framework itself** — OC_KB reference prose, `.claude/` command templates, `CLAUDE.md` template, and `docs/LESSONS.md` — plus one downstream kai fix handed off as a ready-to-paste prompt (Appendix E). It does **not** modify a single runtime agent. Where a template section does not apply to a framework-prose change, it is marked N/A with a reason rather than deleted.

---

## Lock-review decisions (RESOLVED 2026-07-06)

All 21 drafter-escalated decisions, resolved at lock. Attribution is to the originating drafter section (A–E). Rulings are inline as **→ RESOLVED:** notes.

**A — Seeded-negative capability verdict (OC_KB_11 + LESSONS Corollary 3):**
1. **Primitive 9 anti-pattern echo (OC_KB_11 line 240).** The test-sentence phrase is repeated verbatim in the Primitive 9 anti-pattern bullet. Edit A3 only updates the canonical instance (line 208). Decision: mirror the "— nor a blockage no attempt verified" clause into line 240 too (consistency), or leave the anti-pattern bullet scoped to the write-path only (it is literally about a swallowed *write*). Draft leaves 240 untouched. **→ RESOLVED: leave 240 untouched.** That bullet is genuinely write-path; the blocked-side message already lives in the new A2 bullet beside it — mirroring the clause would muddy both.
2. **Where the blocked-side anti-pattern bullet lives.** Edit A2 places the new bullet in the shared `## Anti-patterns` list, right before the fail-silent-open bullet. Confirm placement, or move it elsewhere (no other Primitive-8 anti-pattern exists, so it is first-of-kind wherever it goes). **→ RESOLVED: placement confirmed as drafted** — adjacent to the fail-silent-open bullet groups the two "status lies" traps.
3. **Diagnosing section (OC_KB_11 lines 242–253).** The destructive-action postmortem checklist is entirely write-path. The seeded-negative trap is read/report-path. Draft leaves the section alone; reviewer may add a step 0 for blocked-side diagnosis. **→ RESOLVED: omit.** The checklist stays a coherent destructive-action postmortem; anti-sprawl.
4. **Panel item (5) — "runbook-named tools are ground truth" is explicitly NOT asserted.** Both the Primitive 8 sharpen and Corollary 3 include the negative ("do not treat runbook-named tools as ground truth"). Confirm this framing is desired — the incident makes it load-bearing (the runbook lied, the grep won), but it adds a sentence to each edit. **→ RESOLVED: keep the explicit negative.** The panel dropped the "runbook = ground truth" hardening precisely because the evidence contradicts it; stating the negative prevents the next author from re-adding it.

**B — Scope-graduation confirm (CLAUDE.md Patterns + command templates):**
5. **Edit B1 bullet length.** The C4 conduct bullet is four sentences — longer than the Patterns norm — because each load-bearing specific comes from a distinct panel verdict. Accept as-is, or split the self-presupposition clause into a second bullet? Drafter recommends keeping as one bullet (anti-sprawl). **→ RESOLVED: accept as one bullet.** Each sentence is a distinct panel verdict; splitting makes two half-rules.
6. **Redundancy across Edits B2/B5/B6.** The "LOCKED ≠ deploy authorization" clarification lands in three files, mirroring how the LOCKED convention is already stated in all three. Confirm the reviewer wants all three (vs. CLAUDE.md + one canonical location). **→ RESOLVED: all three.** The LOCKED convention is already stated in all three files; a partial update leaves contradictory prose.
7. **Footer placement in the fenced templates (Edits B3/B4).** The footer sits INSIDE the output-format fenced block so it is emitted as part of the deliverable the free-form session inherits. Confirm that is the intended surface. **→ RESOLVED: confirmed.** The deliverable is exactly the artifact the user answers — the incident's six-answer reply was to such a deliverable.
8. **No new machinery confirmed.** This section adds zero gates and zero orchestrate/plan-review steps. Flag if the lock reviewer expected an enforcement hook (there is intentionally none). **→ RESOLVED: no hook, confirmed** — panel verdict is conduct-not-gate; an enforcement hook is the "highest risk" drift §11 warns against.

**C — Data-integrity rules (OC_KB_11/12 + CLAUDE.md DO-NOT):**
9. **R4-b form (OC_KB_04).** Rendered as a full anti-pattern bullet (house style) rather than a bare cross-ref. Reviewer may collapse to a terser pure cross-ref line. **→ RESOLVED: keep the full bullet** — matches OC_KB_04 house style; a bare cross-ref would be the only one of its kind in that list.
10. **R3 "installed → field-proven" label.** OC_KB_12 carries no inline `installed | field-proven` status convention, so the upgrade is expressed as a "Field-proven (real incident)" note. If the framework maintains that status distinction elsewhere, mirror the flip there too. Confirm the convention's canonical location. **→ RESOLVED: prose note as drafted.** The framework's proven/unproven ledger lives in LESSONS.md flags and ship-time CHANGELOG lines (appendix preamble already routes there); OC_KB_12 gets the prose note only.
11. **R1 incident date.** The R1 citation is written date-free to avoid fabricating one. If a canonical migration date exists, the reviewer may add it for parity with R5/R3. **→ RESOLVED: date added.** The hardening migration is kai `20260625000001` (2026-06-25); the $97k ruling session was 2026-07-03. Edit C-R1's parenthetical now carries the migration date.
12. **R1 placement within OC_KB_11.** Appended to the end of the Anti-patterns list — a Data-layer concern in a primarily Action-layer KB. Reviewer may prefer an additional one-line pointer from the OC_KB_10 Data layer or OC_KB_12. **→ RESOLVED: no extra pointer.** The OC_KB_11 anti-patterns list is the canonical silent-trap shelf; a second pointer is sprawl.
13. **now() vs DB DEFAULT nuance (R5).** The rule names both `now()` and a column `DEFAULT` as valid sources. If the project standard prefers exactly one, tighten at lock time. **→ RESOLVED: keep both.** Both are server-clock sources; the rule's point is "never a typed literal," not which server mechanism stamps it.

**D — Workflow-args sharpen + field attestations (LESSONS + OC_KB_11):**
14. **Edit D1 density.** `[PROCESS-4]` point (3) grows from a one-clause parenthetical to a full guidance sentence. Reviewer may instead keep point (3) short and move the guard-parse recipe into the `[PROCESS-4]` **Why** paragraph. Drafter recommends keeping it in the Rule. **→ RESOLVED: keep in the Rule.** The Rule is what a mid-task agent consults; a recipe in the Why is a recipe unread.
15. **Edit D1 caveat surfacing.** Decide whether the "guard branch not yet field-exercised" scoping needs to appear in the lesson prose, or is adequately carried by the spec/ship line only. Drafter recommends spec/ship line only. **→ RESOLVED: spec/ship line only** (§4.1 carries it) — inline hedging would weaken the rule's imperative force.
16. **Edit D4 adopt-or-drop.** One added sentence to Primitive 3 making "read back the audit row too" discoverable from the read-back primitive. Drafter leans adopt; drop for strict anti-sprawl. **→ RESOLVED: ADOPT.** Both C2 judges independently identified this exact sentence as "the only defensible net-new content" from the rejected C2 candidate, and Primitive 3 is where implementers of read-back actually look. D4 is no longer optional.

**E — Downstream kai fix prompt:**
17. **Fix 3 scope.** Confirm timesheet-sync is the right seam, and whether the fail-loud fix should generalize to other catch-up scripts with the same `logRun`/`okOverall` shape. **→ RESOLVED: scoped to timesheet-sync as the panel specified**, plus a report-only survey line added to Fix 3 (list — don't fix — sibling scripts with the same shape).
18. **Fix 4 include/defer.** Currently optional/agent-judgment. Reviewer may make it deterministic or a tracked item. **→ RESOLVED: stays optional/agent-judgment** — the recipient grounds on live code and kai's two-tier autonomy owns the call; the prompt already requires a skip-reason in the report.
19. **Fix 5c placement.** The COALESCE-fallback half spans two CLAUDE.md sections in kai (DO NOT vs Supabase rules). Reviewer may pin placement to avoid a split rule. **→ RESOLVED: leave to the recipient** — the prompt's placement note already frames the criterion (where a future reader looks before writing a migration), and the recipient sees the live file.
20. **Verification depth for Fix 3.** A dry-run does not exercise logRun; the prompt asks for code-review reasoning rather than forcing a prod audit-write failure. Confirm acceptable. **→ RESOLVED: acceptable.** Forcing a prod audit-write failure to prove a reporting fix is unjustifiable blast radius; the fix inherits installed-not-proven until a real failure exercises it.
21. **Memory-write trigger (Fix 5 / Gmail-CLI rule).** Reviewer may pre-decide whether the Gmail-CLI-not-MCP rule warrants a dedicated kai memory file rather than leaving it to the recipient. **→ RESOLVED: pre-decided — deterministic.** The rule is thrice-proven durable; the prompt's close-out now instructs: ensure a durable kai memory file for Gmail-CLI-not-MCP exists (create if missing), never a transaction fact.

---

## 1. Confirmed Decisions

| # | Decision | Choice | Reasoning | Date |
|---|---|---|---|---|
| 1 | F1 trap class ("seeded-negative capability verdict" — a false "blocked" seeded by a banner/stale prose) | Sharpen `OC_KB_11` Primitive 8 (verify-by-attempt), NOT a new primitive | ~75% duplication of Primitive 8 found by both reconciling judges; blocked/skipped is a capability claim held to the same bar | 2026-07-06 |
| 2 | C1 — where the seeded-negative lesson lands in LESSONS | `[PROCESS-1]` **Corollary 3**, NOT a new lesson ID | Anti-sprawl; it is the negative-side twin of the existing belief-vs-verification gap | 2026-07-06 |
| 3 | C2 — false-blocked as a candidate *new* rule | REJECTED — already covered by `OC_KB_11` Primitive 9; **field-attestation only** | Rule authored 6/26, fix verified in prod 7/2 (kai `be760be`); the incident closes the loop, does not open a new rule | 2026-07-06 |
| 4 | R4 — memory/bootstrap files holding system-of-record fact copies | Home: **CLAUDE.md `## DO NOT`** (stack-canonical) + a cross-ref bullet in **OC_KB_04** | Memory/bootstrap files are OpenClaw substrate → a stack-canonical silent-failure trap; field-attested (kai 2026-07-03) | 2026-07-06 |
| 5 | R1 — semantic defaults on attribution/financial columns (DEFAULT + COALESCE) | Home: **OC_KB_11 Anti-patterns**, NOT the DO-NOT list | Two-headed write/read trap; field-attested (~$97,156 at-risk across 13 settlements) | 2026-07-06 |
| 6 | R5 — audit/status timestamps must come from `now()`/DB default | Home: **OC_KB_12 audit-trail conventions** | Typed literal silently inverts event ordering across timezones; field-attested (kai 2026-07-04 UTC) | 2026-07-06 |
| 7 | R3 — reconciliation hierarchy (system-of-record outranks user memory + user message) | Home: **OC_KB_12 reconciliation** as a field-proof note — NO new rule | Mechanism already prescribed; the Nash-rate-churn incident (2026-07-02) is the documented mechanism firing → **upgrade to field-proven** | 2026-07-06 |
| 8 | R2 — subtraction-inference (residual-of-totals) | DEFERRED — kai-only per `[PROCESS-5]` | No agent-blueprint occurrence, no cross-framework proof; re-open on a second independent instance | 2026-07-06 |
| 9 | C4 — scope graduation (design sign-off ≠ deploy authorization) | Session-level **conduct rule** in CLAUDE.md Patterns + template footers, NOT a hard gate or new orchestrate/plan-review machinery | The incident ran entirely outside the phase loop; the three existing deploy gates never fired because there was no phase loop to fire them | 2026-07-06 |
| 10 | C5 — Workflow `args` may arrive as a JSON string | Sharpen `[PROCESS-4]` point (3), NOT a new lesson ID | Single-session field obs (kai 2026-07-02) + ecosystem corroboration (GitHub #67488); guard-parse-then-fail-loud, not `\|\| FALLBACK` masking | 2026-07-06 |
| 11 | `[PROCESS-3]` (schema-forced fan-out die-silently) | **No demotion** — evidence append only | Two clean 8/8 small-flat-schema fan-outs corroborate the mitigation, proving the failure is intermittent not deterministic; the lesson stands intact | 2026-07-06 |

---

## 2. Sequence

Dependency-ordered file-slices. Each slice is one PR-sized unit. Full edit text is in the **Edit-block appendix**; slice lines reference edits by ID.

1. **Slice 1 — `OC_KB_11_Safety_Primitives.md`** (one file, six edits): A1 Primitive 8 sharpen, A2 Primitive 8 anti-pattern bullet, A3 Primitive 9 test-sentence dual, C-R1 semantic-defaults anti-pattern, D3 Primitive 9 field closure, D4 Primitive 3 read-back scope (adopted at lock). *Apply in Primitive order (8 → 9 → anti-patterns → Primitive 3) to keep anchors stable; see §Composition conflicts for the two Primitive-9 co-anchors.*
2. **Slice 2 — `OC_KB_12_Trust_and_Provenance.md`** (one file, two edits): C-R5 timestamp-source (audit-trail conventions) + C-R3 reconciliation-hierarchy field-proof note.
3. **Slice 3 — `CLAUDE.md` DO-NOT + `OC_KB_04_Bootstrap_Files.md`** (two files, two edits): C-R4-a DO-NOT entry + C-R4-b OC_KB_04 cross-ref anti-pattern.
4. **Slice 4 — `docs/LESSONS.md`** (one file, three edits): A4 `[PROCESS-1]` Corollary 3, D1 `[PROCESS-4]` point (3) sharpen, D2 `[PROCESS-3]` corroboration append.
5. **Slice 5 — `CLAUDE.md` Patterns + command templates** (five files, six edits): B1 C4 conduct bullet, B2 CLAUDE.md LOCKED clarification, B3 brainstorm.md footer, B4 investigate.md footer, B5 plan-review.md Step 6d clarification, B6 MULTI_AGENT_WORKFLOW.md Lockdown clarification.
6. **Slice 6 — downstream kai fix prompt** (independent; NOT in this repo): hand Appendix E to Chris to paste into a fresh kai-openclaw session. Can run anytime; no dependency on Slices 1–5.

---

## 3. Framing

The kai-openclaw agent ran fifteen catch-up / build sessions between 2026-07-02 and 07-06 that a 12-judge adversarial panel mined for framework-improvement signal. The harvest surfaced four classes of silent failure that the canonical framework's prose does not yet name — each one parsing cleanly, producing no error, and only surfacing later as broken behavior:

- **False-negative capability verdicts.** Three sessions each declared Gmail "blocked" on the strength of a harness auth banner plus stale in-repo prose pointing at a dead MCP, while their *own greps* surfaced the working CLI as a top hit and discounted it without opening the file. One session persisted the false "blocked" to a durable row and skipped a downstream reconcile step that depended on the lane having run. The framework's verify-by-attempt primitive (Primitive 8) was written for the *positive* side only.
- **Scope graduation without authorization.** An explicitly investigation-only session ("build nothing yet") graduated to a same-session prod deploy ~2.5 minutes after the user answered six design questions — the agent announced "proceeding to build" rather than asking, and treated the user's echo of the agent's own phrasing as deploy authorization. Zero harm here, but the same pattern with a sloppier build is a live-prod incident, and the three existing deploy gates never fired because the session ran outside the phase loop.
- **Silent data corruption.** Five data-integrity failure modes — semantic column defaults, typed-literal audit timestamps, memory files holding stale fact copies, a mis-crediting COALESCE fallback, and a residual-of-totals inference — each stamped a wrong-but-parseable value that only surfaced downstream as a mis-credit or an ordering inversion.
- **Workflow-args brittleness.** A Workflow died at launch in 29ms because `args` arrived as a JSON string despite the docs' contract, and the incident agent's takeaway ("arg-passing is unreliable → hardcode") is itself the anti-pattern.

The cost of the status quo is that each of these traps is re-derived from scratch on every occurrence — three times for the Gmail trap alone. This spec installs the naming and the guard prose so the next agent lacking the instinct inherits it.

---

## 4. Target State

### 4.1 Success criteria

- Every canonical change ships flagged **`Installed <date>, not yet proven in a live run`** (carried at ship time in the CHANGELOG/commit line, per `[PROCESS-1]` house style). A change's flag clears only on a live downstream firing — an agent lacking the instinct consulting the new prose and behaving differently.
- **Two exceptions are upgrades TO proven, not installed-not-proven:** the `OC_KB_11` **Primitive 9 field closure** (D3 — fix prod-verified downstream 2026-07-02, kai `be760be`) and the `OC_KB_12` **reconciliation-hierarchy field-proof note** (C-R3 — Nash-rate-churn 2026-07-02, the documented mechanism firing in production). These two land as field-attested.
- Per-change proving detail:
  - **A1–A4 (seeded-negative):** installed-not-proven. The 2026-07-03/07-06 sessions are the *seeding incident* (evidence the trap exists), not proof the lesson text changes behavior. Clears when an agent declines to persist an unverified "blocked" after consulting Corollary 3.
  - **B1–B6 (scope-graduation):** installed-not-proven. Clears on the first captured downstream firing — an agent in a free-form design/investigation brief that pauses for the explicit "Design ratified — proceed to build + deploy now?" line, or that refuses to treat its own echoed phrasing as deploy authorization.
  - **C-R4 / C-R1 / C-R5:** field-attested incidents, landing as canonical rules; the *prose* clears on a live downstream firing.
  - **C-R3, D3:** field-attested → **proven** on landing.
  - **D1 (`[PROCESS-4]` sharpen):** installed-not-proven, with an honest gap — the guard branch has not yet executed against a stringified `args` in the field (the incident was the crash; the relaunch passed no args). Inherits `[PROCESS-4]`'s status.
  - **D2 (`[PROCESS-3]` append):** field-attested corroboration; strengthens, does not alter, the lesson.
  - **D4 (Primitive 3 read-back scope, adopted at lock):** installed-not-proven. Clears when a read-back pass catches a dropped audit/side-effect row in the field.

### 4.2 Data model changes

N/A — this initiative changes framework prose (KBs, command templates, CLAUDE.md, LESSONS.md) only. No new entity, field, bootstrap file, or MCP server. Appendix E's downstream kai Fix 3 touches a script's exit-status logic but that is downstream, not an agent-blueprint schema change.

---

## 5. Capability Fixes

### 5.1 Perception

N/A — no perception-layer defect in this harvest. (The Gmail trap is adjacent — a banner is an ingested signal — but the failure is in *reasoning over* the banner, not in receiving it, so it lands in 5.3.)

### 5.2 Extraction

N/A — no extraction-layer defect in this harvest.

### 5.3 Reasoning

- **F1/C1 — seeded-negative capability verdict.** Agent reasons from a false "blocked" (seeded by an auth banner + stale prose) and cascades a skipped downstream step. Fix: Primitive 8 blocked-side sharpen + Primitive 9 test dual + `[PROCESS-1]` Corollary 3. See Edit-block appendix **A1, A2, A3, A4**; OC_KB_10 §Reasoning.

### 5.4 Action

- **C4 — scope graduation is separate authorization from design sign-off.** Agent commits prod-mutating side effects (migration, prod write, deploying-push) off a design-only brief without an explicit deploy confirm. Fix: session-level conduct rule + LOCKED clarifications + template footers. See Edit-block appendix **B1–B6**; OC_KB_10 §Action, OC_KB_11.

### 5.5 Data

- **R4 — memory/bootstrap files never hold copies of system-of-record facts.** A duplicated fact parses fine, silently diverges from source, and the agent then defends the stale copy against the live system. Fix: CLAUDE.md DO-NOT entry + OC_KB_04 cross-ref. See Edit-block appendix **C-R4-a, C-R4-b**; OC_KB_10 §Data.

---

## 6. Capability Enhancements

### 6.1 Trust & Traceability

- **R1 — semantic defaults on attribution/financial columns.** Two-headed DEFAULT + COALESCE trap that stamps a business rule on every field-omitting row. See **C-R1**; OC_KB_11 Anti-patterns / OC_KB_12.
- **R5 — audit/status timestamps from `now()`/DB default, never a typed literal.** Typed literal silently inverts cross-timezone event ordering. See **C-R5**; OC_KB_12 audit-trail conventions.
- **R3 — reconciliation hierarchy field-proof (upgrade to proven).** System-of-record outranks user-curated memory and the user message; the user-message loss is the case the hierarchy says to surface. See **C-R3**; OC_KB_12 reconciliation.

### 6.2 Proactive Intelligence

N/A — no anomaly-detection or scheduled-review enhancement in this harvest.

### 6.3 Communication & Collaboration

N/A — no notification-routing or hand-off enhancement in this harvest. (The scope-graduation confirm in 5.4 is a conduct rule about *pausing to ask*, not a routing/escalation change.)

### 6.4 Learning & Evolution

- **C5 — `[PROCESS-4]` point (3) Workflow-args sharpen.** Guard-parse-then-fail-loud on a possibly-stringified `args`, never `|| FALLBACK` masking, never canonizing hardcoding. See **D1**; OC_KB_13.
- **`[PROCESS-3]` corroboration append (no demotion).** Two clean small-schema fan-outs prove the die-silently failure is intermittent; the log-the-drop guard stands. See **D2**; OC_KB_13.
- **C2 — Primitive 9 field closure.** The 2026-06-26 audit-row-drop incident is fixed and prod-verified downstream (2026-07-02); C2-as-new-rule was rejected as a duplicate. See **D3**; OC_KB_13.

### 6.5 Operational Excellence

N/A — no SLO/canary/dashboard/rollback enhancement in this harvest.

### 6.6 Meta-Capabilities

- **F1/C1 — Primitive 8 as capability self-assessment.** The blocked-side sharpen makes Primitive 8 symmetric: a "blocked"/"skipped"/"unavailable" verdict is a claim about the agent's *own* capability, held to the same verify-by-attempt bar, bounded to the candidate set the agent's own probes surfaced. See **A1, A2**; OC_KB_11 §8, OC_KB_13 §2.

---

## 7. Cross-cutting Principles

- **Verify by attempt, not by banner, prose, or assumption** — and the primitive is symmetric: a negative verdict (blocked/skipped/no-data) carries the same evidence bar as a positive one. (OC_KB_11 Primitives 8/9.)
- **A negative status is a claim too, and it is more dangerous** — a false negative silently disables every downstream check predicated on the lane having run. (`[PROCESS-1]` Corollary 3.)
- **Silent-corruption traps parse cleanly** — the DO-NOT / anti-pattern discipline exists because each trap produces no error and only surfaces downstream. (CLAUDE.md `## DO NOT`.)
- **Design sign-off is not deploy authorization; LOCKED certifies dispatch-readiness, not deploy consent** — deploy stays gated at the Phase 9/10 checkpoints. (MULTI_AGENT_WORKFLOW.md Lockdown convention.)
- **Anti-sprawl** — sharpen an existing primitive/lesson rather than mint a new one when the overlap is high (F1→Primitive 8, C1→Corollary 3, C5→`[PROCESS-4]`, C2→field-attestation).
- **Field-prove cross-framework ports before locking** — R2 is deferred per `[PROCESS-5]`.

---

## 8. Relationship to Other Specs

- **Depends on:** none.
- **Supersedes:** none.
- **Runs alongside:** `docs/MULTI_AGENT_WORKFLOW.md` (Edit B6 clarifies its Lockdown convention). The eXp team-of-peers intake and the app-blueprint verification intake (both in maintainer memory) are separate, non-conflicting tracks.

---

## 9. Parallel Tracks

`/orchestrate` can dispatch these concurrently — the six Sequence slices touch disjoint files except for the two multi-edit KBs (OC_KB_11 in Slice 1, OC_KB_12 in Slice 2, CLAUDE.md in Slices 3 and 5).

### Track A: Canonical framework edits (Slices 1–5)

- Five file-slices across OC_KB_11, OC_KB_12, OC_KB_04, CLAUDE.md, LESSONS.md, and five command templates. **Caution:** CLAUDE.md is touched by both Slice 3 (DO-NOT list) and Slice 5 (Patterns block) — different sections, but sequence them or a single worker owns CLAUDE.md to avoid a merge race.

### Track B: Downstream kai fix (Slice 6)

- Independent of Track A entirely — a ready-to-paste prompt (Appendix E) handed to Chris for a fresh kai-openclaw session. No agent-blueprint file changes. Lands the five kai-side fixes (Gmail stale-pointer purge, blocked-side guard, timesheet fail-loud, optional db-write guard, three DO-NOT rules).

---

## 10. Deferred / Out of Scope

- **R2 — subtraction-inference (residual-of-totals)** — deferred: kai-only, no cross-framework proof, per `[PROCESS-5]`. Re-open on a second independent instance; natural home is the OC_KB_12 provenance-flags section (`inferred` must never be silently promoted to `verified`).
- **C2 as a new rule** — out of scope: rejected as a duplicate of `OC_KB_11` Primitive 9. It lands only as the field-attestation closure (Edit D3).
- **"Runbook-named tools are ground truth" hardening** — dropped: evidence contradicts it. In the incident the runbook *lied* and the grep succeeded, so both the Primitive 8 sharpen and Corollary 3 state the *negative* ("do not treat runbook-named tools as ground truth").
- **OC_KB_11 Primitive 9 anti-pattern echo (line 240)** — out of scope per lock decision 1: the bullet is genuinely write-path; the blocked-side message lives in the adjacent A2 bullet.
- **OC_KB_11 diagnosing-section blocked-side step** — out of scope per lock decision 3: the checklist stays a coherent destructive-action postmortem.
- **Generalizing the timesheet fail-loud fix to other kai catch-up scripts** — deferred per lock decision 17: Fix 3 now includes a report-only sibling survey; fixes wait for that survey's findings.

---

## 11. Prioritization Hints

- **If only one thing ships:** the **downstream kai Gmail stale-pointer purge** (Appendix E, Fix 1) — it is the root fix for the 3×-recurring false-blocked trap, removing the stale in-repo prose that seeds it. Note: this is a **downstream** change, not in this repo's edits — it ships by handing Appendix E to Chris.
- **Highest risk:** the **C4 conduct-rule wording (Edit B1) drifting into a hard gate.** The panel verdict is explicitly *conduct, not gate*; if the bullet is read as a mandatory stop it adds friction to every free-form session. Keep it a one-line "ask, then wait," not an enforcement hook.
- **Lowest-cost-highest-value:** the **Primitive 9 one-clause dual (Edit A3)** and the **`[PROCESS-4]` point (3) sharpen (Edit D1)** — each a single sentence into an existing primitive/lesson, each closing a named field-observed trap with no new structure.

---

# Edit-block appendix

Full verbatim edit text so an implementer can execute Slices 1–5 without opening the scratchpad. Anchors are quoted verbatim; line numbers are advisory (locate by quoted text). **Proving flags** are carried at ship time in the CHANGELOG/commit line, not inline in the KBs (OC_KB house style), except where an edit itself adds a flag.

## Slice 1 — `docs/OpenClaw KBs/OC_KB_11_Safety_Primitives.md`

### Edit A1 — Primitive 8 blocked-side sharpen

**Type:** Insertion. Insert immediately AFTER the closing paragraph of Primitive 8 (line 187), BEFORE the `### 9.` heading.

Anchor (verbatim — insert after it):
```
The bad version is plausible-sounding noise that wastes the user's time. The good version surfaces the actual missing capability — usually a config gap (env var, plist entry, MCP server registration) the user can fix in a minute.
```

Inserted text:
```

**Sharpen — a "blocked" / "skipped" / "unavailable" verdict is a capability claim too, held to the same bar.** The primitive is symmetric: before you *report or persist* that a lane is blocked, execute-verify every candidate your **own** probes already surfaced — open the file, run `--help`, invoke the smallest call. The set to try is bounded and self-defining: it is your own search hits, not an open-ended hunt. An MCP-auth banner (`needsAuthMcpServers`, "unauthorized") rules out only *that one MCP path* — never the capability, which may have a working CLI or script sitting in the same grep. And do **not** treat runbook- or skill-named tools as ground truth: in the incident below the in-repo prose pointed at a dead MCP while the grep surfaced the live tool, and the agent believed the prose. Verify by attempt, not by banner, prose, or assumption — and make the negative claim evidence-carrying: name the exact commands attempted and their verbatim errors (the negative twin of "state the counts you read").

```text
Blocked-side example (real incident):

  Task: pull settlement emails. Harness banner: "claude.ai Gmail — unauthorized."
  In-repo prose: a SKILL says "pull-via-MCP"; a parser header says "via the Gmail MCP".

  Bad: digest declares Gmail "blocked", persists blocked=true to a durable row,
       skips the reconcile step predicated on the lane, recommends the forbidden
       connector as the only fix. (The agent's own grep had surfaced
       gmail-attachment.js — a working CLI whose usage header documents `search` —
       as a top hit; it discounted the hit WITHOUT opening the file.)

  Good: before writing "blocked", open gmail-attachment.js / run its --help.
        The banner rules out the MCP path only; the CLI path works. No blockage —
        and the reconcile step that depended on the lane still runs.
```
```

### Edit A2 — Primitive 8 anti-pattern bullet

**Type:** Insertion into the `## Anti-patterns` list. Insert AFTER the "Undo primitive only documented for the happy path" bullet (line 238), BEFORE the "Fail-silent-open error trap" bullet (line 240).

Anchor (verbatim — insert after it):
```
- **Undo primitive only documented for the happy path.** The inverse is named for the success case; the partial-success case (write committed half-way) is undocumented. → fix: think through partial-success modes in the skill's Important Rules section; name the inverse for each.
```

Inserted bullet:
```

- **Declaring a lane "blocked" on a banner or a stale runbook, without attempting it.** An MCP-auth banner (or in-repo prose naming a dead tool) gets read as the *capability* being unavailable; the agent persists a false "blocked" and skips the downstream steps that depended on the lane — even though its own grep surfaced a working CLI it never opened. → fix: Primitive 8's blocked-side — before reporting or persisting blocked/skipped, execute-verify every candidate your own probes surfaced (open the file, run `--help`); the banner rules out one MCP path, never the capability. Enumerate the exact commands attempted + verbatim errors so "blocked" carries evidence.
```

### Edit A3 — Primitive 9 test-sentence dual

**Type:** In-place replacement of one clause (line 208).

Current text (verbatim):
```
The test: **the digest must not be able to assert a success the write never achieved.**
```

Replacement:
```
The test: **the digest (or any persisted status) must not be able to assert a success the write never achieved — nor a blockage no attempt verified.**
```

### Edit C-R1 — Semantic defaults on attribution/financial columns

**Type:** Insertion — append to the `## Anti-patterns` list, AFTER the fail-silent-open bullet.

Anchor (verbatim — insert after it):
```
- **Fail-silent-open error trap.** A write wrapped in a broad `catch → log Warning → continue`: the write silently no-ops while the run reports success (a green "N done, 0 errors" digest sitting over a swallowed failure), or a *transient* blip trips the same broad catch and skips a guard's protection for that run. → fix: Primitive 9 — scope the catch to the *specific* expected error; make every other path fail-loud (counted in the run summary) or fail-closed (aborts). The digest must not be able to assert a success the write never achieved.
```

Inserted bullet:
```
- **Semantic defaults on attribution/financial columns.** A column `DEFAULT` — or a view's `COALESCE(...)` fallback — set to a *business-rule value* instead of an inert one silently stamps its assertion on every row whose writer omitted the field. This is a two-headed trap: the write-side `DEFAULT` and the read-side `COALESCE` each assert the same business rule and can be introduced (or dropped) independently, so fixing one head leaves the other live. → fix: defaults and `COALESCE` fallbacks on attribution/financial columns must be inert (`NULL` / `0` / `'unknown'`), never a business meaning — force the omission to be visible so a real value has to be supplied, and audit both heads together. (Real incident: a `parsons_split_pct DEFAULT 75` plus a view `COALESCE(..., 75)` put ~$97,156 of mis-credit at risk across 13 settlements; hardening migration `20260625000001` (2026-06-25) dropped both heads, and the ruling session cleared the flags 2026-07-03.)
```

> **Anchor note (composition conflict).** Edit A2 inserts a bullet immediately BEFORE the fail-silent-open bullet; Edit C-R1 appends immediately AFTER it. Both use the fail-silent-open bullet as an anchor — apply either order; the anchor text is unaffected by the other insertion.

### Edit D3 — Primitive 9 field closure

**Type:** Insertion — new paragraph AFTER the final sentence of the Primitive 9 section (line 208 area).

Anchor (verbatim — insert after it):
```
This is the write-path sibling of the orchestration-path rule in `docs/LESSONS.md` `[PROCESS-3]` ("log the drop, don't let it pass silently") and the authoring-side complement of the `[PROCESS-1]` runtime corollary (which tells the *reviewer* not to trust that green digest).
```

Inserted paragraph:
```

**Field closure (2026-07-02):** the "real incident" this primitive was authored from (2026-06-26) is fixed downstream — the column the audit writer expected was migrated and prod-verified, and the audit row wrote for the first time since the drop began (6/25). Field-attested end to end: the drop itself was surfaced only by the `[PROCESS-1]` Corollary 2 adversarial re-verification against the raw tool-results, never by the run's own green digest — which is exactly the reviewer/authoring pairing this primitive names.
```

> **Anchor note (composition conflict).** Edits A3 and D3 both operate on the Primitive 9 closing paragraph near line 208. A3 *replaces* the earlier "The test:" clause; D3 *inserts after* the later "write-path sibling…" sentence. They are different anchors in the same paragraph — apply both; A3 does not disturb D3's anchor and vice versa. Apply A3 before D3 for clarity.

### Edit D4 — Primitive 3 read-back scope sharpen (ADOPTED at lock; decision 16)

**Type:** Append to the final sentence of Primitive 3 (line 103).

Anchor (verbatim — append after it, same paragraph):
```
Some fields will differ (timestamps, server-assigned IDs); the invariant is that the user-visible content the agent meant to write is now actually there.
```

Appended text:
```
 Read-back scope explicitly includes the **side-effect rows** a write is supposed to *also* emit — the audit / log / provenance record, not just the primary row: a primary write that succeeds while its audit row silently drops is the Primitive 9 failure, and reading back only the primary misses it.
```

## Slice 2 — `docs/OpenClaw KBs/OC_KB_12_Trust_and_Provenance.md`

### Edit C-R5 — Timestamp source (audit-trail conventions)

**Type:** Insertion — within the "Audit trail conventions" section, AFTER the Retention paragraph.

Anchor (verbatim — insert after it):
```
**Retention:** decisions for at least one full audit cycle (often 90 days, sometimes longer for regulated domains). Document the retention policy in `KB_1_Architecture.md` and enforce via a deterministic cron that prunes old rows.
```

Inserted paragraph:
```
**Timestamp source:** audit and status timestamps (`executed_at`, `approved_at`, `resolved_at`, and the like) come from `now()` or a column `DEFAULT` — never a hand-typed literal. A typed literal parses fine and silently corrupts event ordering across timezones: the agent's local sense of "today" is not the DB clock. (Real incident: a kai session on 2026-07-04 UTC — the evening of 07-03 local — wrote `executed_at: "2026-07-03T00:00:00Z"` onto flags whose `first_detected_at` was `2026-07-04T02:13Z`, inverting the true event order. The typed midnight literal, not the database clock, produced the inversion.)
```

### Edit C-R3 — Reconciliation hierarchy field-proof note (UPGRADE TO PROVEN)

**Type:** Insertion — within the "Reconciliation hierarchy" section, AFTER the "Key property" paragraph.

Anchor (verbatim — insert after it):
```
**Key property:** when the agent picks source A over source B, the decision log row contains the alternative that lost. Future-you can audit "we picked A; was that right?" — the alternative is right there.
```

Inserted paragraph:
```
**Field-proven (real incident):** on 2026-07-02 a user quoted rates from memory; the agent overwrote the canonical rate table to match; the user reversed it — *"We have a table for this… I probably told you the wrong amounts. Return the table back."* The rate table (system of record) outranks both user-curated memory and the user message for this field, and the user-message loss is exactly the case the hierarchy says to surface. This is the documented mechanism firing in production — not a new rule.
```

## Slice 3 — `CLAUDE.md` DO-NOT + `docs/OpenClaw KBs/OC_KB_04_Bootstrap_Files.md`

### Edit C-R4-a — CLAUDE.md DO-NOT entry

**Type:** Insertion — AFTER the rsync-excludes bullet in `## DO NOT`.

Target: `/Users/chrisparsons/Documents/GitHub/agent-blueprint/CLAUDE.md`

Anchor (verbatim — insert after it):
```
- Adding a new runtime-mutable path (where the agent writes at runtime) requires updating the rsync excludes in `deploy/deploy.sh` BEFORE next deploy. Otherwise `rsync --delete` wipes the path.
```

Inserted bullet:
```
- Memory/bootstrap files hold durable rules and query paths, NOT copies of system-of-record facts. A duplicated fact parses fine, then silently diverges from the source — the agent then defends the stale copy against the live system. Store the rule and the query path; fetch the facts fresh.
```

### Edit C-R4-b — OC_KB_04 cross-ref anti-pattern

**Type:** Insertion — AFTER the "Putting runtime state in non-mutable bootstrap files" bullet.

Target: `/Users/chrisparsons/Documents/GitHub/agent-blueprint/docs/OpenClaw KBs/OC_KB_04_Bootstrap_Files.md`

Anchor (verbatim — insert after it):
```
- **Putting runtime state in non-mutable bootstrap files.** Agent writes to MEMORY.md at runtime → next deploy's `rsync --delete` wipes it. → fix: only TASK-QUEUE.md (and other configured-mutable paths) are runtime-write targets; everything else is repo-write-only.
```

Inserted bullet:
```
- **Copying system-of-record facts into bootstrap files.** A memory/bootstrap file that stores a *copy* of a live fact (a deal amount, a rate, a status) parses fine, then silently diverges from the source — and the agent defends the stale copy against the live system on the next turn. → fix: bootstrap files hold the durable rule and the query path, never the fact; fetch facts fresh at runtime. Canonical DO-NOT trap (see CLAUDE.md `## DO NOT`); composes with the character-cap trap above — both are silent, and a stale fact is worse than a truncated one.
```

## Slice 4 — `docs/LESSONS.md`

### Edit A4 — `[PROCESS-1]` Corollary 3

**Type:** Insertion — AFTER the Corollary 2 paragraph (line 37), BEFORE the `### [PROCESS-2]` heading.

Anchor (verbatim — end of Corollary 2, insert after it):
```
**Why it earned its clause:** in the first kai-openclaw catch-ups after a four-phase prod rollout (2026-06-26), **5 of 6 shipped deliverables were dormant** (their triggers never fired that run), and a real regression — a write to a column the migration never added — failed `PGRST204` *every run*, trapped as a Warning and hidden behind a clean "9 synced, 0 flags" digest that both the running agent and the maintainer's first read missed; only an adversarial re-verification against the raw tool-results caught it.
```

Inserted paragraph:
```

**Corollary 3 — a negative status is a claim too; a false "blocked" cascades.** The belief-vs-verification gap runs on the *negative* side as well: "blocked", "skipped", "unavailable", "no data" are assertions that need the same evidence bar as a positive result — and they are *more* dangerous, because a false negative silently **disables every downstream check predicated on the lane having run**. Before you report or persist a blocked/skipped status, execute-verify every candidate your **own** probes surfaced (open the file, run `--help` — the set to try is your own search hits, bounded, not an open-ended hunt), and make the claim evidence-carrying: name the exact commands attempted + the verbatim errors (the negative twin of the "state the counts you read" all-clear rule). An MCP-auth banner rules out only that one MCP path, never the capability. The authoring-side dual is `OC_KB_11` Primitive 8's blocked-side sharpen and Primitive 9's "nor a blockage no attempt verified" test. **Why it earned its clause:** three kai-openclaw sessions (2026-07-03, 2026-07-06 ×2) each falsely declared Gmail "blocked" — seeded by the harness `needsAuthMcpServers` banner plus stale in-repo prose (a SKILL's "pull-via-MCP", a parser header's "via the Gmail MCP") — while their **own greps surfaced the working CLI** (`gmail-attachment.js`, whose usage header documents `search`) as a top hit and they discounted it *without opening the file*. One session persisted `blocked=true` to a durable `catch_up_runs` row **and skipped the reconcile step predicated on the lane**; another's digest recommended the forbidden connector as the only remediation — a structural dead end. Recovery was user-prompted every time. Note the trap is *not* "trust the runbook" — here the runbook lied and the grep succeeded. Like every lesson here, this prose is itself `Installed, not yet proven in a live run` until an agent lacking the instinct consults it and refuses to persist a "blocked" its own probes could have disproved.
```

### Edit D1 — `[PROCESS-4]` point (3) sharpen

**Type:** In-place replacement.

Anchor (verbatim):
```
(3) **validate the workflow's own `args`/wiring** (a silent `undefined` arg can misroute every artifact).
```

Replacement:
```
(3) **validate the workflow's own `args`/wiring**: a silent `undefined` arg can misroute every artifact, and `args` may itself arrive as a JSON **string** despite the docs' promise that a script can call array/object methods on it directly (GitHub issue #67488 documents the identical `CUSTOMERS.map is not a function`-class launch failure) — so guard-parse it (`const a = typeof args === 'string' ? JSON.parse(args) : (args ?? {})`) then **fail loud** on any missing key (`if (!a.customers) throw ...`), never masking with `|| FALLBACK` (which converts a loud launch failure into a silent stale-data run) and never canonizing hardcoding the data as the fix (inlining is fine only for a genuinely one-shot script).
```

### Edit D2 — `[PROCESS-3]` corroboration append

**Type:** Insertion — append to the end of the `[PROCESS-3]` **Why** paragraph.

Anchor (verbatim — end of the `[PROCESS-3]` **Why** paragraph):
```
In both cases "complete" was asserted while part of the planned coverage had silently vanished — and a schema-forced agent gives no louder signal than a `null` you have to look for.
```

Appended text (same paragraph, leading space):
```
 **Corroborated (2026-07-02):** two 8-agent schema-forced fan-outs in the same downstream window completed 8/8 clean (~443K and ~402K tokens), both on small flat schemas — exactly this lesson's recommended mitigation — evidence that the die-silently failure is *intermittent* (not deterministic) and that the small-schema reflex holds up in the field; the lesson and its log-the-drop guard stand intact.
```

## Slice 5 — `CLAUDE.md` Patterns + command templates

### Edit B1 — CLAUDE.md Patterns: C4 conduct bullet

**Type:** Insertion — AFTER the last Patterns bullet (line 66).

Target: `/Users/chrisparsons/Documents/GitHub/agent-blueprint/CLAUDE.md`

Anchor (verbatim — insert after it):
```
- Spec docs and `KB_1_Architecture.md` record architectural decisions in `Decision | Choice | Reasoning | Date` table format (per `_dev/agent-improvement-spec-template.md` §1).
```

Inserted bullet:
```
- Scope graduation is separate authorization from design sign-off. A brief that declares design-only scope ("build nothing yet") is NOT upgraded to build+deploy authority by the user answering the design's open decisions — even build-scope ones. Before the first prod-mutating action (migration, prod write, push to a deploying branch), ask one explicit line ("Design ratified — proceed to build + deploy now?") and wait; announcing "proceeding to build" is not asking. Beware ratifying your own presupposition: if the phrase implying a built artifact originated in your question, the user's echo is not deploy authorization.
```

### Edit B2 — CLAUDE.md Patterns: LOCKED clarification

**Type:** In-place replacement (line 65).

Target: `/Users/chrisparsons/Documents/GitHub/agent-blueprint/CLAUDE.md`

Anchor (verbatim):
```
- Spec docs become implementable once `/plan-review` writes a `Status: LOCKED YYYY-MM-DD` header. Drafts without the header are exploratory only — `/orchestrate` Phase 6 and `/implement` use the header to decide whether to dispatch workers.
```

Replacement:
```
- Spec docs become implementable once `/plan-review` writes a `Status: LOCKED YYYY-MM-DD` header. Drafts without the header are exploratory only — `/orchestrate` Phase 6 and `/implement` use the header to decide whether to dispatch workers. LOCKED certifies design completeness / dispatch-readiness, NOT user authorization to deploy — deploy stays gated at the Phase 9/10 checkpoints.
```

### Edit B3 — brainstorm.md: scope footer

**Type:** Insertion — AFTER the tail of the Final Output Format template (lines 202–205), still inside the fenced block.

Target: `/Users/chrisparsons/Documents/GitHub/agent-blueprint/.claude/commands/brainstorm.md`

Anchor (verbatim — insert after these three lines):
```
### When to pick a different option
- Pick [B] if: [specific scenario]
- Pick [C] if: [specific scenario]
```

Inserted text:
```

---

> **Scope note:** Answering these decisions resolves the design; it does not by itself authorize implementation or deploy — scope graduation is a separate explicit confirmation.
```

### Edit B4 — investigate.md: scope footer

**Type:** Insertion — AFTER the tail of the Output Format template (lines 121–122), still inside the fenced block.

Target: `/Users/chrisparsons/Documents/GitHub/agent-blueprint/.claude/commands/investigate.md`

Anchor (verbatim — insert after these two lines):
```
### Recommended Fix/Approach
[Specific change needed — file and line if known]
```

Inserted text:
```

> **Scope note:** Answering any open decisions here resolves the design; it does not by itself authorize implementation or deploy — scope graduation is a separate explicit confirmation.
```

### Edit B5 — plan-review.md Step 6d: LOCKED clarification

**Type:** In-place replacement (line 197).

Target: `/Users/chrisparsons/Documents/GitHub/agent-blueprint/.claude/commands/plan-review.md`

Anchor (verbatim):
```
The LOCKED header is the convention that downstream `/orchestrate` (Phase 6) and `/implement` use to decide whether the spec is dispatch-ready. Drafts without the header are exploratory only.
```

Replacement:
```
The LOCKED header is the convention that downstream `/orchestrate` (Phase 6) and `/implement` use to decide whether the spec is dispatch-ready. Drafts without the header are exploratory only. LOCKED certifies design completeness and dispatch-readiness — NOT user authorization to deploy; deploy remains gated at the Phase 9/10 checkpoints.
```

### Edit B6 — MULTI_AGENT_WORKFLOW.md: Lockdown clarification

**Type:** In-place replacement (line 148).

Target: `/Users/chrisparsons/Documents/GitHub/agent-blueprint/docs/MULTI_AGENT_WORKFLOW.md`

Anchor (verbatim):
```
**Lockdown convention.** Worker plan docs that descend from a spec carrying the `> **Status: LOCKED YYYY-MM-DD**` header (written by `/plan-review` Step 6) are clear to dispatch into Phase 7 implementation. Specs without the LOCKED header are exploratory only — do not dispatch implementation workers against them.
```

Replacement:
```
**Lockdown convention.** Worker plan docs that descend from a spec carrying the `> **Status: LOCKED YYYY-MM-DD**` header (written by `/plan-review` Step 6) are clear to dispatch into Phase 7 implementation. Specs without the LOCKED header are exploratory only — do not dispatch implementation workers against them. LOCKED certifies design completeness and dispatch-readiness, not authorization to deploy — deploy stays gated at Phase 9 (smoke pause) and Phase 10 (ship approval).
```

---

# Appendix E — Downstream kai fix prompt

Independent of Slices 1–5. Hand this to Chris to paste into a **fresh kai-openclaw session**. The current-state findings below were verified against live kai files on 2026-07-06 so the prompt's anchors stay accurate after line drift.

## Current-state findings (verified in the kai repo)

Repo: `/Users/chrisparsons/Documents/GitHub/kai-openclaw` (read-only for this drafting pass).

**Item 1 — Gmail stale-pointer language (3× recurring trap):**
- `workspace/skills/catch-up-hp/SKILL.md:113` — literally: `- Renew the Gmail watch — currently pull-via-MCP.` (under "## What this does NOT do"). Stale — implies an MCP pull path that is a permanent dead end.
- `workspace/scripts/settlement-parser.js:6-8` header prose: *"Claude Code reads the labeled eXp settlement email **via the Gmail MCP**, extracts the fields to the --input JSON"*. Wrong path — should name the CLI helper.
- `catch-up-hp/SKILL.md:46-49` — the **Gmail sweep** step never names a Gmail tool at all; the reader has to guess. Needs `gmail-attachment.js search/body` named as THE in-session path.
- `catch-up-tmt/SKILL.md:67` — the **Settlements** step also names no tool. `catch-up-tmt/SKILL.md:74` transcripts step hands to `meeting-processing` (already correct).
- The **canonical correct prose already exists** to copy — `workspace/skills/meeting-processing/SKILL.md:20`: *"Find + read the forwarded transcript email via `doppler run -- node workspace/scripts/gmail-attachment.js search "from:… after:<wm>"` then `… body <msgId>` … **Use this, NOT the claude.ai Gmail MCP** — that connector stays unauthenticated."*
- `gmail-attachment.js` subcommands (verified from its header): `search "<query>"`, `list <messageId>`, `body <messageId>`, `get <messageId> <attachmentId> <out>`. Run under `doppler run -- node …`. This is unambiguously the live in-session Gmail path.

**Item 2 — symmetric blocked-claim guard:**
- The **all-clear** (positive) guard exists in both skills and is strong: `catch-up-hp/SKILL.md:103` and the twin at `catch-up-tmt/SKILL.md:127`.
- There is **no blocked-side twin.** Nothing requires a "blocked"/"NOT run" claim to carry the exact commands attempted + verbatim errors, nothing bars treating an MCP auth failure alone as "blocked," and nothing forces an expected-but-unrun lane to still write a `catch_up_runs` row. This is the gap the panel flagged.

**Item 3 — timesheet-sync.js logRun / okOverall (the uncertain one): CONFIRMED NOT COUNTED.**
- `logRun(record)` at `timesheet-sync.js:374-379` POSTs the audit row to `timesheet_sync_runs`; on non-2xx it **only logs a warning** and returns. It never sets `runRecord.error`, never increments any failure counter.
- `okOverall` at line 728 = `!runRecord.error && runRecord.batch_failures === 0`. logRun's failure feeds **neither** term.
- Worse, the two early-return paths (line 605 "nothing to sync" and 633 "all caught up") call `logRun` and then hardcode `ok: true` — so an audit-write failure on those paths is doubly invisible.
- **Verdict: a failed audit-row write is fully swallowed.** The fix is real work, not a no-op. Ordering is favorable: `logRun` runs at line 726, before `okOverall` at 728.

**Item 4 — db-write.js PGRST102 / "All object keys must match" (optional):**
- `db-write.js` POST path passes the parsed payload straight to `sbReq('POST', PATHQ, payload)` (line 174) with no key-set normalization. A bulk array with differing key sets triggers PostgREST `PGRST102`. Fix is optional per agent judgment (panel counted ≥5 field re-learns).

**Item 5 — kai CLAUDE.md DO-NOT homes:**
- kai's `CLAUDE.md` has a `## DO NOT (active silent-failure traps)` section (lines 98-104), bullet style `- **Bold lead.** explanation.` — the three panel rules have a natural home here; none is currently present. (kai also keeps a `## Supabase rules` section, lines 60-66, where the view-COALESCE / security-invoker rules live — the COALESCE half of rule (c) may fit better there; leave placement to the recipient's judgment.)

## The prompt (ready to paste into a fresh kai session)

```
You are in the kai-openclaw repo (Home Prep ops/billing, operated hands-on through
Claude Code). A 12-judge review of recent catch-up runs identified five load-bearing
fixes. Land them per kai's own rituals: TWO-TIER AUTONOMY (internal Supabase writes are
write-then-validate, not pre-approved; only outward/irreversible actions confirm-first),
DRY-RUN before any write, VERIFY in the store (never trust a script's own success
output), and update memory only with DURABLE RULES (never transaction facts). These are
mostly doc/code edits with no live DB writes — but ground on the LIVE files first
because line numbers below have drifted.

GROUNDING (do this first): open each target file and locate the anchor by its quoted
text, not the line number. If an anchor's wording has changed, adapt — the intent is
what matters.

────────────────────────────────────────────────────────
FIX 1 — Purge the stale Gmail-MCP pointers (a 3×-recurring dead-end)
────────────────────────────────────────────────────────
WHY: the claude.ai Gmail MCP connector is unauthenticated and is a PERMANENT dead end
(Chris correction 2026-07-01). The live in-session Gmail path is the CLI helper
`gmail-attachment.js` (auth = GMAIL_REFRESH_TOKEN, kai@insynqk.com). Several docs still
point at the MCP or name no tool at all, so the wrong path keeps getting re-derived.
The CORRECT prose already exists to copy — workspace/skills/meeting-processing/SKILL.md
(the "Gmail (Doppler CLI helper)" row): it names
`doppler run -- node workspace/scripts/gmail-attachment.js search "<query>"` then
`… body <msgId>` and says "Use this, NOT the claude.ai Gmail MCP — that connector stays
unauthenticated." Make the other Gmail touchpoints consistent with it.

1a. workspace/skills/catch-up-hp/SKILL.md — under "## What this does NOT do", the line:
    "- Renew the Gmail watch — currently pull-via-MCP."
    Correct it so it does NOT imply an MCP pull path. Replace with language naming the
    CLI path, e.g.:
    "- Renew the Gmail watch (a runtime/webhook concern). In-session Gmail reads go
      through `gmail-attachment.js` (CLI), never the claude.ai Gmail MCP — that
      connector is unauthenticated, a permanent dead end (Chris correction 2026-07-01)."

1b. workspace/scripts/settlement-parser.js — the header comment currently says the
    settlement email is read "via the Gmail MCP". Correct it to the CLI:
    "…reads the labeled eXp settlement email via the Gmail CLI helper
     (`doppler run -- node workspace/scripts/gmail-attachment.js search … | body …`),
     NOT the claude.ai Gmail MCP (unauthenticated dead end — Chris 2026-07-01)…"

1c. workspace/skills/catch-up-hp/SKILL.md — in the "### Tier 3 … 3. Gmail sweep" step
    (the one that says "date-bound every query with `after:<next.gmail_after>` … Search
    for:"), add a leading sentence naming the tool explicitly, e.g.:
    "Run every Gmail query through `doppler run -- node workspace/scripts/gmail-attachment.js
     search "<query> after:<next.gmail_after>"` then `… body <msgId>` to read a match —
     never the claude.ai Gmail MCP (unauthenticated, permanent dead end — Chris 2026-07-01)."

1d. workspace/skills/catch-up-tmt/SKILL.md — in "### 3. Settlements + deposits", the
    Settlements bullet ("Gmail `from:no-reply@exprealty.com …`") and, if it doesn't
    already defer entirely to meeting-processing, the transcripts step (### 5): name
    `gmail-attachment.js search/body` as the read path with the same "never the claude.ai
    Gmail MCP — permanent dead end (Chris 2026-07-01)" note. (The transcripts step hands
    to the shared meeting-processing skill, which is already correct — you only need to
    ensure the Settlements read names the CLI.)

Keep the note wording consistent with the existing meeting-processing SKILL prose so all
Gmail touchpoints read the same.

────────────────────────────────────────────────────────
FIX 2 — Add the BLOCKED-side twin of the all-clear guard (both skills)
────────────────────────────────────────────────────────
WHY: both digests already have a strong POSITIVE guard — "Emit 'ready to bill' /
'ready to manage transactions' ONLY when the reads you actually ran are all empty …
State the counts you read so the claim is auditable." (catch-up-hp "**Rules:**" block;
catch-up-tmt "**Rules:**" block.) There is no symmetric guard on the NEGATIVE claim: a
lane reported "blocked" or "NOT run" can currently be asserted on faith, and a downstream
step (e.g. catch-up-reconcile) can be skipped on an unattempted-blocked belief.

Next to each skill's existing all-clear guard (catch-up-hp "**Rules:**" block near the
digest format; catch-up-tmt "**Rules:**" block), add the blocked-side twin. Wording to
adapt:

  "**Blocked-claim guard (twin of the all-clear rule):** A lane reported 'blocked' or
   'NOT run' — in the digest OR persisted to catch_up_runs — MUST carry the exact
   command(s) attempted and their VERBATIM error output. An MCP/auth failure alone NEVER
   establishes 'blocked' (the CLI path — gmail-attachment.js, doppler-run scripts — is
   the real path; a dead MCP connector is not evidence a lane can't run). An expected
   lane that did not run STILL gets a catch_up_runs row carrying those attempts (so the
   gap is auditable, not silent). NEVER skip a downstream step (e.g. catch-up-reconcile,
   open-items-sweep) on an unattempted-blocked belief — attempt it, and if it truly
   fails, record the command + error."

────────────────────────────────────────────────────────
FIX 3 — Count a failed audit-row write in timesheet-sync.js (fail-loud)
────────────────────────────────────────────────────────
WHY (verified current state): in workspace/scripts/timesheet-sync.js, `logRun(record)`
POSTs the run to `timesheet_sync_runs`; on a non-2xx it ONLY logs a warning and returns.
It sets neither `runRecord.error` nor any failure counter. `okOverall` (main's final
line) = `!runRecord.error && runRecord.batch_failures === 0`, so a failed audit-row write
is SWALLOWED — the run still reports ok:true / exit 0 and the digest surfaces nothing.
The two early-return paths ("nothing to sync", "all caught up") are worse: they call
logRun then hardcode `ok: true`. This violates kai's own Primitive-9-derived fail-loud
rule (an unwritten audit row must make the run not-ok).

FIRST: re-read the live function and CONFIRM this is still the state (the panel judges
split on it — report what you actually find). If confirmed:

  - Make logRun signal failure. Simplest: have `logRun` return a boolean (or set a
    `runRecord.log_write_failed = true` on non-2xx), and add that term to `okOverall`:
    `const okOverall = !runRecord.error && runRecord.batch_failures === 0 && !runRecord.log_write_failed`.
  - Fix the two early-return paths so a logRun failure there is NOT reported as ok:true —
    e.g. capture logRun's result and use it in that path's `ok:`.
  - Surface it in the JSON footer (a `log_write_failed` field) so the digest can show it.
  - Do NOT change the write-then-validate posture or add a permission prompt — this is a
    reporting/exit-status fix only.

VERIFY: run `doppler run -- node workspace/scripts/timesheet-sync.js --dry-run` (dry-run
does not call logRun, so it won't exercise the new term — that's fine; confirm no
regression). Reason through the failure path in code review; do not force a real
audit-write failure against prod.

SURVEY (report-only, do NOT fix): while you're in there, grep the other catch-up scripts
for the same shape — a run-log write whose failure is caught/warned without feeding the
script's ok/exit status — and LIST any siblings in your report for a future pass.

────────────────────────────────────────────────────────
FIX 4 — db-write.js PGRST102 guard on bulk POST (OPTIONAL — your judgment)
────────────────────────────────────────────────────────
WHY: the "All object keys must match" (PostgREST PGRST102) error has been re-learned on
≥5 catch-ups. In workspace/scripts/db-write.js the POST payload is passed straight to
`sbReq('POST', …, payload)` with no key-set normalization. A bulk array whose objects
have differing key sets hits PGRST102.

If you judge it worth it, add EITHER: (a) key-set normalization for array POSTs — union
all keys across the array, null-fill missing ones on each object before POST; OR (b) a
pre-POST validation that detects a mismatched key set and dies with a clear message
naming the offending keys. Keep it inside db-write.js's existing guard style (the `die()`
+ audit-log posture). If you skip it, note why in your report.

────────────────────────────────────────────────────────
FIX 5 — Add three durable rules to kai's CLAUDE.md DO NOT section
────────────────────────────────────────────────────────
WHY: three panel rules are durable invariants with no home. Add them to CLAUDE.md's
"## DO NOT (active silent-failure traps)" section, matching its bullet style
(`- **Bold lead.** explanation`). Keep each to the evidence + the rule.

5a. "- **Audit/status timestamps come from now() or a server default — never a typed
     literal.** A hand-typed `executed_at` can invert real event order (evidence
     2026-07-03: an audit row's executed_at `2026-07-03T00:00:00Z` sorted BEFORE its own
     first_detected_at `2026-07-04T02:13Z UTC` — an impossible inversion from a literal
     midnight). Let the DB stamp the time."

5b. "- **Never derive a financial component as the residual of totals.** Carry each
     component (fees, splits, credits) EXPLICITLY; use subtraction only as a
     reconciliation CHECK, never as the source value. (Evidence: a $296.25/deal audit-fee
     leak = 0.75 × $395 that a residual-of-totals derivation hid — still queued unfixed in
     ops_improvement_queue.)"

5c. "- **Defaults on attribution/financial columns must be INERT — and so must view
     COALESCE fallbacks.** A non-inert default silently re-arms a trap when a write omits
     the column. (Evidence: `parsons_split_pct DEFAULT 75` + a `COALESCE(...,75)` view
     fallback mis-credited ~$97k until migration 20260625000001 dropped the default and
     flipped the COALESCE to 0.)"

    (Placement note: 5c's COALESCE-fallback half also relates to the "## Supabase rules"
     section, which already governs views/security_invoker. Put the rule wherever a
     future reader will actually see it before writing a migration — your call; if you
     split it, keep the DO NOT bullet as the short pointer.)

────────────────────────────────────────────────────────
CLOSE-OUT
────────────────────────────────────────────────────────
- Memory: ENSURE a durable kai memory file for the Gmail-CLI-not-MCP rule exists —
  create it if missing (rule + query path only; the rule is thrice-proven, 2026-07-03 and
  2026-07-06 ×2). Beyond that, update memory ONLY if a fix surfaced a NEW durable rule
  not already captured. Never write a transaction/amount fact to memory.
- Commit with a clear message, e.g. "catch-up: purge stale Gmail-MCP pointers, add
  blocked-claim guard, fail-loud on timesheet audit-write, DO-NOT rules (panel fixes)".
  Commit + push the memory edits alongside code (kai's memory is version-controlled).
- REPORT BACK: for Fix 3, state exactly what you found in the LIVE logRun/okOverall
  (confirmed swallowed vs already-counted) and what you changed. For Fix 4, say whether
  you added the guard and why. List every file touched.
```
