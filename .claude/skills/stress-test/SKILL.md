---
name: stress-test
description: Use when a spec, a change set or a pull request is large, touches canonical or high-risk surfaces, or was written by several agents, and you want independent reviewers trying to break it before it is locked or landed. For a single-reviewer look at code quality use /audit-code; for gap-finding and locking a spec use /plan-review.
argument-hint: "[spec path | PR number | blank for the working diff] [lenses]"
---

# Stress test

Convene a panel of `judge` agents, each locked to one lens, to falsify a target against its primary sources. The panel reports and you synthesise; nothing is changed until the findings have been read. The run is done when every judge has returned a verdict that names its coverage, the findings are in front of the user (or folded, for a spec under review), and any fixes have been re-verified by the same lenses.

Arguments: $ARGUMENTS holds an optional target and optional lenses. The target is a spec or document path, a pull request number, or nothing, which means the working tree's uncommitted diff plus its untracked files. Anything after the target names lenses to use or to add.

## 1. Fix the target and its sources

Work out three things and state them before dispatching:

- **The artifact**: the exact file, or the exact command that shows the change set (for example the diff against the remote default branch).
- **The specification**: what the artifact claims to implement or satisfy. For a diff this is the locked spec; for a spec it is the brainstorm and the user's recorded decisions.
- **The ground truth**: the primary sources its factual claims trace to. Usually the live code; sometimes transcripts, data or a running system.

If the diff is empty or the path does not exist, say so and stop. Do not review "the recent work" from memory.

## 2. Choose lenses

One lens per judge, and no two judges on the same lens, because overlap leaves something unexamined. Scale the panel to the cost of being wrong: one judge and one round is enough for light work.

For a spec, the default pair is the one in `docs/WORKFLOW.md`:

- **systems correctness**: data flow, sequencing, state, and whether the spec's counts and anchors hold.
- **security and data integrity**: authorisation, irreversible writes, money paths, exposure of private data.

For a change set, pick the two to four that fit from:

| Lens | Asks |
|---|---|
| spec compliance | Each item in the specification: landed as specified, a declared deviation, or silently dropped? Anything changed that the specification did not ask for? |
| regression | What did this break? Deleted behaviour, stale references after a rename, callers not updated, old behaviour next to the change. |
| security and data integrity | As above, against the code as changed. |
| evidence fidelity | Does every factual claim match the primary source? Look for evidence smoothed into a better story than the source supports. |
| consistency with existing rules | Does anything contradict `CLAUDE.md`, the knowledge bases or established patterns, so a reader could be told two different things? |
| misuse | Read as a careless future reader with none of this session's context. Can the change be misapplied or gamed, and does it fail safe? |

Add a domain lens when the work calls for one, and write its question as plainly as these.

## 3. Run the panel

Dispatch every judge in one message so they run in parallel and cannot see each other's findings, then wait for all of them. Each brief contains only what is specific to this run, since the role's standing rules live in `.claude/agents/judge.md`:

- the artifact, or the command that shows it, and the paths of the specification and the ground truth;
- the one lens and its question;
- any builder or author reports, labelled as claims to be checked and not as facts;
- which verdict scale applies: pass or fail for a spec or document, go, go-with-nits or no-go for a change set.

Do not include your own opinion of the artifact. A judge given a conclusion tends to return it.

A judge that fails to return, or returns without naming what it examined, has not passed anything. Re-dispatch it once; if it fails again, report that lens as not reviewed. A panel of three with one silent judge is a panel of two, and the summary must say so.

## 4. Synthesise

Before reporting, open the cited `file:line` for every blocker and major yourself. A finding is a claim until you have read the lines; drop one only when the source plainly contradicts it, and say that you did. For a security-class finding, dispatch a `refuter` on it and act on what survives.

Then report:

- each lens and its verdict, without averaging them. Any standing blocker or major means the target has not passed;
- blockers in full, majors briefly, minors as a list;
- a defect two judges reached from different lenses, marked as corroborated. Do not merge it away as a duplicate;
- any disagreement between judges on the same point, with both positions quoted, for the user to decide. Two judges agreeing is not independent confirmation if they started from the same assumption, so agreement adds no weight; a split is the useful signal;
- what no judge examined.

A clean result is legitimate when every judge named its coverage. Report it as clean and list that coverage.

When the target is a spec under `docs/plans/<slug>/`, write the round to `docs/plans/<slug>/judge-round-N-findings.md`.

## 5. Fix

For a spec going through lock, fold every finding into the spec yourself, including minors from a judge that passed, and go on to re-verify. That is the panel protocol and needs no prompt.

For a change set, stop here and let the user choose which findings to fix, unless you are running inside an autonomous build where the go already covers it. Decisions the panel surfaced (a naming collision, a scope call) belong to the user and not to a fixer. When fixing with more than one agent, give every file exactly one owner, hand each fixer its findings verbatim with the judge's evidence, and state the user's decisions as settled.

## 6. Re-verify with the same lenses

Dispatch the same lenses again. Each judge gets its own earlier findings verbatim and is asked to:

1. grade each one fixed, partially fixed, not fixed or regressed, against the current text and not against the fixer's account;
2. scan the current state afresh through its lens, including for damage the fixes introduced. Renames and rewordings are where that happens.

The target passes when no blocker or major stands and no earlier finding is not fixed or regressed without the user's explicit decision to accept it. A nit that is not fixed is parked with a pointer, never dropped.

Three rounds at most. If the third still fails, stop and bring the user the standing findings and the options. Folding until something goes green is how a real problem gets laundered into a pass.

Finish by stating the rounds run, the final verdict per lens, what was fixed, what was accepted and by whom, and which model produced each judge's report if they differed.
