# Done-vs-True Closure Discipline — Spec

> **Status: LOCKED 2026-06-24**

> **What this is.** The framework-side fix for the "done vs true" gap (thread 3 of the [framework-verification-agenda](../../.claude/projects/-Users-chrisparsons-Documents-GitHub-agent-blueprint/memory/framework-verification-agenda.md)). Closure/synthesis commands emit "done / validated / complete / Ship Complete" claims that assert **step-completion** or **conformance-to-plan**, never **truth-in-the-world**. This spec adds a truth check at the one boundary it can't be gamed, plus an inline synthesis-provenance discipline.

## 1. Decisions

| Decision | Choice | Reasoning | Date |
|---|---|---|---|
| Intervention shape | **Hybrid-minimal** — 2 machine-checkable edits + 2 inline prose disciplines; **no new commands or files** | The 4-lens adversarial workflow (run `wf_171a714a-71e`) showed every *structural* design (inline gate, shared primitive, `/accept` command, ledger) is **self-graded** → reproduces the bug it polices. Only a machine-readable seam (the smoke-catalog file state) can't be gamed. | 2026-06-24 |
| Never-run smoke handling | `/ship` Step 3.5 gates on **"not Passed"**, not just `Failed`; a never-run/`Pending`/absent smoke surfaces verbatim as `Unverified at ship: <id>` in the commit/changelog body | `ship.md` Step 3.5 STOPs only on `Failed`; a never-run smoke is *not* `Failed` → ship proceeds and the commit asserts completion. The fix reads the literal catalog state — an external artifact, not an agent self-grade. | 2026-06-24 |
| Synthesis provenance | Inline a compact **verified-vs-relayed + no-hedge-hardening + counter-evidence-sweep** block at the 5 pinned synthesis sites | Chris rejected the DRY/shared-file option; the adversarial pass showed include-by-reference silently no-ops under context pressure, so inline beats pointer for enforcement. | 2026-06-24 |
| Deferred | **No** `/accept` command, **no** closure ledger | Both are self-synthesizing (reproduce the bug) or premature (measure-forever). Build only if hybrid-minimal proves insufficient against real misses. | 2026-06-24 |

**Grounding artifacts (per `/plan-review` §6c):** workflow run `wf_171a714a-71e` (6 independent inventories + 4 designs each adversarially refuted against source); [grounding-findings doc](investigations/2026-06-24-kai-verification-grounding-findings.md); memory notes `synthesis-amplification-risk`, `framework-verification-agenda`.

## 2. What already exists (do NOT duplicate)

- `/plan-review` §3a (earned-vs-assumed scope-out) and §6c (cite-or-flag-UNVERIFIED) — strong, but fire at the **input** boundary (before the `LOCKED` header), on the spec. This spec is their **output-boundary** mirror.
- `/implement` Step 5b and `/orchestrate` Phase 8 Stage 1 — conformance-to-plan (no-gaps/no-extras/no-drift). This spec runs *after* them and asks the orthogonal question they explicitly disclaim.

## 3. Changes

**The provenance block** (inlined verbatim at each synthesis site):

> **Provenance discipline.** For every claim carried from a worker/sub-agent self-report, tag it `[verified: how]` or `[relayed: source-said]`; never harden a hedge ("appears to" stays "appears to," a grep-count stays a grep-count); re-read the source's own caveats and carry the strongest dissenting line forward so front-confidence never exceeds back-caveats. Failure this prevents: `docs/investigations/2026-06-24-kai-verification-grounding-findings.md`.

| # | File | Site | Edit |
|---|------|------|------|
| 1 | `.claude/commands/ship.md` | Step 3.5 item 3 | Broaden the smoke STOP from `Failed`-only to **not-Passed**; never-run claims become `Unverified at ship: <id>` in the body, never asserted as done |
| 2 | `.claude/commands/ship.md` | Step 5 (commit compose) | Inline the provenance block; commit body may not assert more completion than the smoke catalog verified |
| 3 | `.claude/commands/orchestrate.md` | Phase 6 (PM annotations) | Inline the provenance block on reconciled worker audits |
| 4 | `.claude/commands/orchestrate.md` | Phase 8 (read worker logs) | Inline the provenance block where the PM ingests Implementation log + Completion notes |
| 5 | `.claude/commands/retro.md` | "After Subagent Returns" | Inline the provenance block so candidate LESSONS carry verified/relayed tags and keep the worker's hedge wording |
| 6 | `.claude/commands/brainstorm.md` | Phase 2 (option synthesis) | Inline the provenance block so options distilled from the single Explore digest surface buried blockers |

## 4. Out of scope

- Runtime instrumentation of "which files were in context at a wrong output" (the agenda's cheap-first idea) — separate, needs a transcript hook; not blocked by this spec.
- Thread 1 (ground-first reorder in `/brainstorm` `/investigate`) and thread 2 (falsification-as-primitive) — separate threads.

## 5. Verification

This spec's own changes are markdown-prose edits to command files; the acceptance check is **read-back of each diff** (no build/smoke applies). The disciplines themselves are exercised the next time `/ship` or `/orchestrate` runs — add no smoke-test entries here.
