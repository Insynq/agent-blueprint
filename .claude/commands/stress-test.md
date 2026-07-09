---
description: Multi-lens adversarial judge panel — stress-test a change set (or spec/doc) with parallel judges locked to distinct lenses, then optionally fix and re-verify
argument-hint: "[target: pending changes (default) | spec doc path | PR#] [lenses: default | +<extra-lens> | custom list]"
---

# Stress-Test Judge Panel

**Pattern:** N parallel judges, each locked to ONE named adversarial lens, each returning a verdict + severity-ranked findings grounded in evidence they checked themselves. Findings come back to the orchestrator **un-applied** — the panel reports; the PM (you + the user) decides. An optional fix pass follows, then the SAME lenses re-verify: each judge receives its own prior findings and grades them `FIXED | PARTIALLY_FIXED | NOT_FIXED | REGRESSED` against the actual text, plus a fresh scan for what the fixes newly broke.

Why a panel instead of one reviewer: diverse lenses catch failure modes redundancy can't, and no single context is both builder and judge. Judges never see each other's findings during the pass (independence); dedup happens at synthesis.

## Step 1: Scope the target

- Default target: the uncommitted working diff (`git status` + `git diff`).
- A spec/doc path or PR# argument overrides. For a spec, judges read the spec plus everything it cites.
- Identify the **specification** (the plan, spec doc, or review report the changes claim to implement) and the **ground truth** (primary sources any factual claims trace to — repos, transcripts, live systems). Every judge gets both paths. Judges verify against these directly — writer/fixer self-reports are claims, not truth, and each prompt must say so.

## Step 2: Pick lenses

Default panel (6). Drop lenses that don't apply to the target; add domain lenses when warranted.

| Lens | Mandate |
|------|---------|
| `canon-consistency` | Does any new text/code contradict existing rules (CLAUDE.md DO-NOTs, KBs, established patterns)? Can a reader following old+new ever be told two different things? |
| `evidence-fidelity` | Every factual claim must match the primary sources — re-check them directly. The classic failure: a writer smooths evidence into a better story than ground truth supports. |
| `altitude-fit` | Right file, right abstraction level, host file's voice. Nothing bloated out of proportion to its siblings; nothing project-specific in a canonical surface. |
| `regression-structure` | What did the change break? Accidental deletions, dangling cross-refs, mis-scoped headings, colliding concurrent edits, renames leaving stale references (grep repo-wide). |
| `completeness` | Walk the specification's items one by one: landed where prescribed, declared deviation, or silently dropped? Deferred items stayed deferred? |
| `downstream-redteam` | Simulate the careless future reader with none of this session's context: can the new guidance be misapplied, over-generalized, or gamed? Does it fail safe when read badly? |

Model mix: if more than one model tier is available, split the panel across tiers (e.g., half Opus, half the strongest available) — model diversity is lens diversity.

## Step 3: Run the panel

Spawn all judges in parallel (one Task/agent per lens; use a Workflow if the user has opted into multi-agent orchestration). Each judge prompt must contain:

1. The target paths + how to see the change set (`git diff`), the specification path, the ground-truth paths.
2. The builder self-reports, explicitly labeled *"claims, not truth."*
3. Its ONE lens mandate, and: *"Judge ONLY through your lens. Be adversarial — find what's wrong, don't admire. But do not manufacture findings: if the work holds under your lens, say SHIP with few or no findings."*
4. Severity definitions: **BLOCKER** = contradicts canon / factually wrong vs ground truth / would actively mislead a downstream reader. **MAJOR** = weakens the pattern or opens a gaming path. **MINOR** = polish.
5. Required return shape: `overall_verdict` (`SHIP | SHIP_WITH_FIXES | BLOCK`) + findings, each with severity, file, issue, evidence (quote the offending text AND the contradicting source), suggested fix.

## Step 4: Synthesize — do not auto-fix

Merge findings across judges (two judges flagging the same defect from different lenses is a severity upgrade, not a duplicate to discard). Report to the user: verdict spread, the blocker(s) verbatim, majors briefly, notable minors. **Nothing is applied and nothing is committed at this stage.** Decisions the panel surfaced (naming collisions, scope calls) go to the user, not a fixer.

## Step 5 (on request): Fix pass with disjoint ownership

- Group accepted findings into fixer clusters where **every file has exactly one owner** — concurrent fixers must never share a file.
- Each fixer gets its findings verbatim (including the judge's evidence), any PM decisions as settled facts ("do not re-litigate"), and a self-validation requirement: re-read own diff, grep own files for stale references, verify cross-ref targets, report deviations honestly.

## Step 6 (after a fix pass): Re-verify with the SAME lenses

Same panel, same lens texts, plus each judge's own prior findings verbatim. Each judge must:
1. Grade each prior finding `FIXED | PARTIALLY_FIXED | NOT_FIXED | REGRESSED` — against the actual current text, never the fixer's claim.
2. Fresh-scan the current state through its lens, **including damage the fixes themselves introduced** (renames and rewordings are high-risk).

Ship gate: no BLOCKER open, no prior finding `NOT_FIXED`/`REGRESSED` without an explicit user decision to accept it. Split verdicts between judges on the same finding escalate to the user with both positions quoted — unanimity earns nothing (`[PROCESS-4]`: correlated consensus is worthless), but splits are signal.

## Notes

- This is Stage-independent: it composes with `/audit-code` (single-auditor elegance review) and `/plan-review` (spec gating) rather than replacing them. Use the panel when the change set is large, canonical (framework/KB surfaces), or written by multiple agents.
- Cost scales with lenses × passes. For small diffs, 3 lenses (canon-consistency, regression-structure, downstream-redteam) is a legitimate minimal panel.
- Provenance: pattern proven in the 2026-07-09 Kai-RE graduation build (6-judge Opus+Fable panel over a 5-writer change set; caught 1 fabricated-evidence BLOCKER, 7 MAJORs including two independent hits on the same mis-scoped exception).
