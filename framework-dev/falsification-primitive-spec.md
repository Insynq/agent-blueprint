# Falsification Primitive (Independent Refutation Pass) — Spec

> **Status: LOCKED 2026-06-25**

> **What this is.** Thread 2 of the [framework-verification-agenda](../../.claude/projects/-Users-chrisparsons-Documents-GitHub-agent-blueprint/memory/framework-verification-agenda.md): a reusable **falsification primitive** for agent-blueprint's verification commands. Today every audit ends in a binary, self-graded `APPROVED`/`PASSED` checkbox written by the same agent that ran the checklist — a clean verdict means "the auditor found nothing," not "an independent skeptic tried to kill the findings and failed." This installs the missing seam: a fresh agent, separate context, inverted "KILL this finding" mandate, graded verdict.

## 1. Decisions

| Decision | Choice | Reasoning | Date |
|---|---|---|---|
| Primitive shape | **Independent-skeptic Refutation Pass** — per load-bearing finding, spawn a fresh agent (a context that never saw the audit's reasoning) with an inverted "prove this finding WRONG against primary source" mandate; a graded **Refutation Ledger** (confirmed/overstated/refuted + confidence) replaces the binary verdict | Only design that came back **strong** and **non-self-graded** in the adversarial workflow (run `wf_0713158c-5bc`). Inline-turn was self-graded/**weak** ("worse than a bare APPROVED"); `/falsify` standalone relocates self-grading up a level (opt-in, skipped when stakes highest); pattern-codification can't force the spawn (markdown ≠ runtime). | 2026-06-25 |
| Cost bound | Refute only the **load-bearing set**: every Critical/High finding **plus** every finding touching a CLAUDE.md DO-NOT canonical trap — **regardless of producer-assigned severity** | Severity alone is producer-self-graded: an under-rated Critical never reaches a refuter. The fixed DO-NOT allowlist is a gate the producing auditor cannot shrink (the verifier's primary fix). | 2026-06-25 |
| Tally | **Mechanical**: emit `APPROVED`/`PASSED` only if every load-bearing finding came back `REFUTED`; a finding leaves the must-fix list only if graded `REFUTED` with cited contradicting evidence | Stops a bad ledger being laundered into a pass (the verifier's second fix). | 2026-06-25 |
| Unconditional firing site | Bind a **mandatory** independent refutation at `/debug`'s three-strikes boundary | Embedded audit gates only fire on findings that exist; the three-strikes moment is where confirmation bias is most entrenched and the seam must fire *without the author's permission* (grafted from the `/falsify` verifier — the runner-up's best idea). | 2026-06-25 |
| Placement | **Inline** in each command's "After Subagent Returns" (run by the **main session** — already a separate context from the Explore auditor). NOT a shared `_dev/` file, NOT a new `/falsify` command | The main-session/subagent split already supplies independence for free; pattern-codification's include-by-reference no-ops under pressure, and a standalone command is skippable. Inline beats pointer (thread-3 finding). | 2026-06-25 |

**Grounding artifacts (per `/plan-review` §6c):** workflow run `wf_0713158c-5bc` (5 independent inventories + 4 designs each adversarially refuted against source); the thread-3 kill-criterion (commit `c48f93d`); memory notes `synthesis-amplification-risk`, `framework-verification-agenda`.

## 2. Known limitation — recorded, not solved

**False negatives are out of this primitive's reach.** An auditor that misses a real Critical entirely produces zero findings, so the Refutation Pass is a no-op exactly when self-grading is most dangerous. Falsification refutes findings that *exist*; it cannot conjure a missing one. A clean no-op verdict is **labeled as such** so it can't read as "independently verified clean." Closing false negatives is a *discovery-breadth* lever (more/diverse finders) — a separate thread, not this one.

## 3. What already exists (reused, not reinvented)

- `/debug` Step 4–5 (form ONE hypothesis → a test that confirms OR **disproves**), the Rationalization Guard, and the three-strikes circuit breaker — the strongest existing DNA. The Pass reuses the disprove-test shape and three-strikes escalation; it adds the missing piece: a **different** agent runs the kill-test.
- `/plan-review` §3a ("probably broken until proven," "absence is a fact about my search") — the *posture* the refuter is told to adopt; the Pass externalizes it into an independent agent.
- `/investigate` follow-all-paths — the refuter's search method.

## 4. Changes

**The canonical Refutation Pass** is inlined (adapted per command) at each command's results-handling section, run by the main session:

| # | File | Site | Edit |
|---|------|------|------|
| 1 | `.claude/commands/audit-code.md` | "After Subagent Returns" | Add the Refutation Pass; graded ledger + mechanical tally supersede the provisional `APPROVED` checkbox |
| 2 | `.claude/commands/audit-infra.md` | "After Subagent Returns" | Same, over Critical/High + DO-NOT-trap infra findings; supersedes the provisional `PASSED` checkbox |
| 3 | `.claude/commands/audit-full.md` | "After All Subagents Return" | Add a central Refutation Pass step over the merged Critical/High + trap findings (refuters spawned by audit-full's context, separate from Subagents 1 & 2) |
| 4 | `.claude/commands/debug.md` | three-strikes branch | Mandatory independent refutation of the latest root-cause hypothesis before accepting "the model is wrong" |
| 5 | `.claude/commands/orchestrate.md` | Phase 8 Stage 2 | Note that `/audit-code` now returns a ledger: act on confirmed/overstated, drop refuted, treat a no-op pass as not-verified |

## 5. Verification

Markdown-prose edits to command files; the acceptance check is **read-back of each diff** (no build/smoke applies). The primitive is *installed*; it's exercised the next time `/audit-*` or `/debug` (3 strikes) runs. Per the thread-3 discipline shipped in `c48f93d`: installed ≠ proven-in-a-live-run.
