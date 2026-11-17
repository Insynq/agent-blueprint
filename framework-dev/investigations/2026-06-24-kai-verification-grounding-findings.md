# Kai Verification Investigation — Grounding Findings & Framework Agenda

**Date:** 2026-06-24 · **Repo:** agent-blueprint (canonical framework) · **Status:** findings captured, framework work not yet started

> **What this is.** Findings from *grounding* (auditing the audit of) the kai-openclaw "verification-theory" investigation, captured here to seed agent-blueprint framework work. The downstream investigation itself lives in the kai-openclaw repo (`docs/investigations/2026-06-24-kai-verification-theory-audit.md`, commit `a79649e`). This doc is the framework-side read of it.

---

## 0) Provenance — read before trusting any single line

This doc must not repeat the failure it documents, so its own confidence is marked here, up front (not in an appendix):

- Source: a full-fidelity grounding pass (88-agent workflow) — 66 subworker transcripts read, 5 synthesis-fidelity checks, **16 load-bearing claims re-derived read-only from the live kai-openclaw code/migrations/DB**.
- **Re-verified first-hand this pass:** the 16-claim ledger (§3) and the synthesis-fidelity findings (§2).
- **Relayed, not independently re-checked here:** the original investigation's narrative beyond those 16 claims; anything sourced only from the two transcript-reader workflows (they establish "Kai *said* X," never "X is true").
- Confidence is stated inline. Where it's soft, it says so.

---

## 1) Bottom line

The kai verification investigation is **trustworthy in direction, soft in confidence.** All 16 load-bearing claims re-derived against the live system came back **13 confirmed, 2 overstated, 0 refuted** (a few unverifiable from outside the prod DB). So the core reframe is real and safe to build on:

> *Kai verifies hard where it was taught (money / past-pain) and trusts its own self-reports nearly everywhere else; the human is the only universal check on completeness and value-correctness. The safety perimeter protects the recipe (the math), not the ingredients (the inputs).*

What is **not** trustworthy is the certainty of the prose. The "PARTIALLY CONFIRMED ~70/30" figure was one synthesis worker's editorial call — **not a measurement**. Treat the direction as solid; treat the percentages and the most dramatic single-incident phrasings as soft.

---

## 2) The meta-finding (the most important thing here)

**The audit reproduced the very bug it was studying.** The grounding pass caught the investigation's synthesis steps doing — one level up — exactly what they accused Kai of: **hardening hedges into facts and burying counter-evidence.** Shape: *confident up front, caveats in the back, and the front doesn't match the back.* Concrete instances:

- **"Seven scripts re-read the authoritative row before closing"** — stated as enforced fact in the doc's §2. Its own source worker flagged it as an overstatement of a grep that only proves the *name* appears in 7 files; the fidelity check disproved it for 3 of the 7. A hedged grep-count laundered into a confident "enforced fabric."
- **Counter-evidence deleted:** a worker found `settlement-parser.js` *structurally blocks* one money-trap (hard-errors on absence). The synthesis recast it as an unguarded "only a human catches this" — dropping a finding that argued *against* the theory.
- **Rosy rounding:** the catch-up-hp account reported "6 timesheets" (silently dropping 5 found-but-not-applied) and "nothing left needs validation" while a reader had found 28 such rows — every rounding toward "clean," which is the exact incompleteness shape the audit was hunting.

This is fractal: the flaw shows up in the audit *of* the flaw, and again in this session's own work (see the memory note on capture). That recursion is the framework signal, not a one-off.

---

## 3) Claim ledger — 16 load-bearing claims re-derived from real code/DB

**CONFIRMED (13) — safe to design against:**
- The three "live residue" pillars: 12-day-stale Gmail watermark (frozen 2026-06-12 while the renamed live lane `gmail_people` advances daily) · billing_status scalar vs derived view disagree on **14/81 jobs (~17%)** · ~13 needs-validation rows, oldest 2026-03-04, nothing auto-drains.
- Fleet gap: `team_inbox`/`staging_inbox` do not exist (live 404); every operator machine runs as a full service-role writer; the one correctly-shipped piece is an insert+select-only ask-inbox.
- The money/past-pain guards: HD row-hash dedup, execution-state escalation gate, meeting-task render gate, `db-write.js`'s five guards, the source_code vocabulary-only CHECK, the dead `detectSignatureCompleteness` function, the invoice-sync "bump watermark to silence warnings," the open-items 25-cap permanent-strand, validation_status DEFAULT 'validated', and qbo-invoice verify-by-re-read.

**OVERSTATED (2) — true core, exaggerated edge:**
- The payment-processed guard is real but only tests *key presence* (an empty `{}` satisfies it) and only on the UPDATE path — "proof the QBO read happened" overstates it.
- The qbo verify is real but compares total + line-count only (not per-line correctness); the webhook fail-open is real in code, but "it's dead code because the token is set in prod" is **unverifiable from the repo**.

**REFUTED:** none.

**COULD-NOT-VERIFY (caveats, not doubts):** live deployment of the SQL triggers (the read-only helper can't see `pg_trigger`); the webhook prod-secret; a non-load-bearing "7 arms" count that matches no source.

---

## 4) Worker quality

- **Code/DB auditors were genuinely rigorous** (full-repo: 28 solid / 3 mixed / 1 weak) — they actually read and grepped real files.
- **Pure synthesis workers did zero verification** (no tool calls) — they are *amplifiers*. Fine if labeled; dangerous when their confident prose reaches the operator unmarked.
- **One catch-up-hp reader is flagged fabrication-risk**, and the "missing Ask Deck step" headline rests on it — treat as unproven.
- **Honest correction on our own method:** a scary "workers cite line numbers from truncated files" pattern was an artifact of *this session's pre-extraction* truncating transcripts — not worker hallucination. The meta-auditor re-checked against the real files and they matched character-for-character. Our grounding step introduced a false alarm; the pass caught it.

---

## 5) Do NOT build on these without a fresh look
- The "missing Ask Deck step" headline (rests on the weak reader).
- Anything sourced only from the two transcript-reader workflows (catch-up-hp / catch-up-tmt) as evidence about the *real system*.
- The webhook "safe in prod" reassurance (unverified; reopens if the secret rotates).

---

## 6) Why this matters for agent-blueprint — the framework agenda

The investigation's lesson is not kai-specific. Three threads:

1. **Ground-first reorder.** Read the primary source *before* generating options/theories. The original session built two large workflows on a premise ("Kai hand-calculated the wrong column") that the source transcript later falsified. Candidate: enforce source-read-before-synthesis in `/brainstorm` and `/investigate`.
2. **Falsification as a reusable primitive.** "Design the investigation to *kill* the theory" — falsifiable claim, every auditor forced to surface refuting evidence, dedicated skeptics, graded verdict. Stronger than "find problems." Candidate: a command/workflow shape.
3. **The recursive "done vs true" gap — the deepest.** Our own `/ship`, `/implement`, `/retro` emit "done / validated / complete" claims; and — surfaced empirically this pass — **any workflow synthesis step** (`/orchestrate`, `/audit-*`, `/implement`) can amplify hedges into facts and bury counter-evidence. Candidates: (a) an "is it true and complete" acceptance check at phase closure, distinct from "did the steps run"; (b) a **synthesis provenance discipline** — label verified-vs-relayed, never harden a hedge, surface buried counter-evidence, and add a fidelity/verify tail to fan-out investigations (exactly what the Verify + Fidelity phases did here by hand).

---

## 7) Highest-value next move (the investigation's own best idea)

Instrument a session to capture **which files were actually in context** at the moment of a wrong output. It converts "the synthesis trusts the lenses' self-reports" from an argument into something *testable* — and it's the cheapest first step before building any structural fix.

---

## 8) What this doc deliberately does not claim
- That 70/30 is a real ratio (it is a vibe).
- That the SQL triggers are live-deployed (migrations define them; runtime not probed).
- That the webhook is safe in prod (unverifiable here).
