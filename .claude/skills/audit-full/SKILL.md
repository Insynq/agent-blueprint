---
name: audit-full
description: Use before a release or a milestone, or when the project has not been audited in a while, and you want every audit the project has run across the whole codebase and merged into one report. For a single diff, file or plan, use /audit-code.
argument-hint: "[path to a previous audit report, to check for regressions]"
disable-model-invocation: true
---

# Full audit

Baseline: $ARGUMENTS

Run every audit skill this project has, in parallel, over the whole codebase, and merge the results into one deduplicated report with a single Refutation Ledger. Done means the report is saved, every security-class finding in it has been re-derived and put to a `refuter`, and the report names what each audit covered and what none of them covered.

The argument is optional. If it is a path to an earlier audit report, use it as the baseline in step 4. If it is empty, there is no baseline.

This skill writes one report file and changes nothing else. It is started by the user on purpose because it dispatches many agents.

## 1. Find the audits

List the folders in `.claude/skills/` whose names start with `audit-`, leaving out this one. `audit-code` is always there. Packs add their own, for example an infrastructure audit or a data-permission audit, and they are picked up here without this skill naming them. Record the list; it goes in the report, so that a reader can see which audits existed on the day.

## 2. Dispatch

Send one agent per audit skill, all in one message so they run in parallel, and wait for every one of them. Use a general-purpose agent, since each has to follow a skill file.

Brief each agent with:

- the skill to follow: "Read `.claude/skills/<name>/SKILL.md` and the files beside it, and carry out its review over the whole project";
- the scope: the source directories named under Layout in `CLAUDE.md`, not a diff. For `audit-code` that means both lenses in its checklist, done by the agent itself;
- what to leave out: "Do the review only. Do not dispatch further agents, do not run the skill's refutation step, and do not save a report." Refutation runs once, here, on the merged set, so that a finding two audits both raise is not refuted twice;
- what to return: findings in the `judge` format (grade, claim, `file:line` with the lines quoted, what would fix it), followed by Examined and Not examined lists. A finding without quoted evidence is to be labelled an opinion.

Do not tell an agent what you expect it to find.

An agent that returns nothing, or returns findings with no Examined list, has failed and has not found the project clean. Dispatch that audit again once. If it fails a second time, record the audit as not run, with the reason, and carry on; the report must not read as though that domain was covered.

## 3. Merge

Put all findings in one list. Where two audits report the same defect, keep the entry with the better evidence and note both sources. Give each finding a stable id made of a domain prefix and a number, so that the next audit can refer to it.

Keep the grades the audits gave. You may raise a grade when findings from two domains combine into something worse than either (an exposed endpoint from one audit and a missing permission check from another). Do not lower one here; only the ledger does that.

## 4. Baseline

If a baseline report was given, read it and classify each of its findings against the current code, by opening the code and not by matching titles:

- **fixed**: the defect is no longer there. Quote the line that shows it.
- **outstanding**: still there.
- **regressed**: recorded as fixed before, present again.

Everything in the merged list that the baseline does not contain is **new**. A regression is graded at least major, because whatever was meant to keep it fixed did not.

## 5. Refutation Ledger

Apply the Refutation Ledger section of `.claude/skills/audit-code/SKILL.md` to the merged list, once. Read that section now; it defines the load-bearing set, the re-derivation you do yourself against live code, the `refuter` dispatch, and the mechanical tally. Three things differ at this scale:

- The load-bearing set is drawn from every domain, and the classes a pack's audit declares security-class count alongside the ones `audit-code` lists.
- Add a Domain column to the ledger.
- The limit on classes is six here instead of four, since a whole-project audit is expected to be broader than a diff. Past six, stop and tell the user the surface is too broad to check in one pass, and propose how to split it by domain.

The ledger supersedes the verdicts the individual audits returned.

## 6. Report

Save the report to `docs/audits/YYYY-MM-DD-full-audit.md` using today's date, and tell the user the path with a five-line summary: counts by grade, the blockers by id, regressions, audits that did not run, and what needs their ruling. Do not paste the whole report into the conversation.

```
# Full audit: YYYY-MM-DD

Audits run: <skill names>
Audits not run: <name — why> | none
Baseline: <path> | none
Findings: blocker N, major N, minor N (new N, outstanding N, regressed N, fixed since baseline N)

## Must fix
| Id | Domain | Grade | Finding | Evidence (file:line, quoted) | Fix | Status vs baseline |

## Refutation Ledger
| Id | Domain | Finding | Class | Re-derivation (file:line, quoted) | Refuter result | Refuter evidence |
(or the empty-ledger sentence from audit-code)

## Minor
| Id | Domain | Finding | Evidence | Fix or park |

## Baseline
| Previous id | Finding | fixed | outstanding | regressed | Evidence |

## Coverage
<per audit: what it examined, and what it did not>
Not covered by any audit: <surfaces no audit skill looks at>

## Needs your ruling
<split findings with both positions quoted, or nothing>
```

## Empty results

If the merged list is empty, the report still gets written. It says that nothing was found, carries the full Coverage section, and carries the empty-ledger sentence from `audit-code`: no finding surfaced, which is not the same as an independent check that the project is safe. Be specific under "Not covered by any audit". With only `audit-code` installed, infrastructure, deployment configuration, dependencies and data-store permissions have not been looked at by anything, and a clean report that leaves that out will be read as covering them.

## Afterwards

This skill does not fix anything. Blockers and regressions go to the user with the report. Findings that need design work go through `/plan`; contained ones are fixed directly and checked with `/audit-code` on the diff. Anything deferred goes to `docs/PARKING_LOT.md` with its finding id, so that the next full audit can find it as outstanding instead of rediscovering it.
