---
name: audit-code
description: Use when a diff, a file or a draft plan needs a second opinion before it is committed or built from - you want defects, security gaps, missed reuse and simpler alternatives found. For a spec that needs locking, use /plan-review; for every audit the project has at once, use /audit-full.
argument-hint: "[file, plan path or 'changes' (default)] [focus: defects | security | reuse | all (default)]"
---

# Audit code

Arguments: $ARGUMENTS

Review code or a plan and answer one question: knowing this codebase, is this the right solution, and is it safe? Done means a graded list of findings with evidence, a Refutation Ledger covering every security-class finding, a verdict that follows mechanically from the ledger, and a statement of what was examined.

The arguments are a target and a focus, space separated, both optional. With no target, audit the pending changes: the diff against the remote default branch plus anything uncommitted. With no focus, cover everything. Work out the concrete file list before dispatching anyone. If the target is empty (no diff, no such file), say so and stop.

This skill is read-only. It reports; it does not fix.

A locked spec does not exempt the code built from it. The judge panel in `docs/WORKFLOW.md` falsifies the design before the build; this falsifies what was actually written.

## 1. Review

Dispatch two `judge` agents in one message so they run in parallel, and wait for both. A reviewer who wrote the code, or watched it being written, sees what was intended and not what is there, which is why this is not done in the session that produced the change.

- **Lens A, defects and security:** wrong results, unhandled failure at a system boundary, races on shared state, and every security check that applies to this target.
- **Lens B, reuse and simplicity:** something in the codebase that already does this, departures from the project's established patterns, and anything built for a need that does not exist.

When the focus argument names one area, dispatch only the lens that covers it.

Give each judge: the artifact (the diff, or the file or plan path), the exact file list, its lens, and the path `.claude/skills/audit-code/checklist.md` with the section for its lens named. Tell it to read `CLAUDE.md` for the project's patterns, Live invariants and Do not list, and to open the source of any reuse candidate it names instead of inferring from the file name. Do not tell it what you think of the change.

## 2. Refutation Ledger

A judge's findings are one reader's claims from one pass, and its verdict is a self-report. Security findings are the ones acted on fastest and the ones most often wrong in a detail that matters, so none is reported until it has been checked twice more: by you against the code, and by a skeptic who never saw the review.

**The load-bearing set.** A finding is in it if it is graded blocker, or if it falls in one of these classes whatever grade the judge gave it. The list is fixed so that a reviewer cannot shrink it by grading something minor:

- authorisation or access bypass, including one user reaching another's data;
- exposure of a secret or of private data;
- a destructive or irreversible write, including a data migration;
- an inbound event handled without verifying its origin or without idempotency;
- anything on a money path;
- anything touching a Live invariant or Do not entry in `CLAUDE.md`.

Majors and minors outside those classes are reported as the judge gave them.

**Re-derive each one yourself, this run.** Open the handler, the policy, the migration or the query the finding cites and quote the lines that confirm or contradict it. Do not rely on the judge's summary or its `file:line`: citations go stale, and a summary can drop the qualifier that reverses the conclusion. A finding you have not opened is `[relayed: judge]`, not verified. Do the same for a security all-clear: if the change touches one of the classes above and Lens A reported nothing there, read that surface yourself before you call it clean.

**Hand each one to a `refuter`.** Group the load-bearing findings by class and dispatch one `refuter` per class, all in one message. Give each only the finding claims and their `file:line`, never the judge's reasoning or your own re-derivation, so it starts from the code. Ask it to state, for any finding it cannot kill, what observation would have falsified it.

If the load-bearing set spans more than four classes, do not fan out refuters. Stop and tell the user the change has too broad a security surface to check cheaply and needs splitting or a scoped re-audit. That is itself the finding.

**Record the ledger.** It replaces any approve-or-reject checkbox:

| Id | Finding | Class | Your re-derivation (`file:line`, quoted) | Refuter result | Refuter evidence |
|---|---|---|---|---|---|

Refuter results are the agent's own: stands, killed, or changed. Open the lines a refuter cites before accepting a kill.

**Tally it mechanically.**

- A finding leaves the must-fix list only when it is killed with quoted contradicting evidence that you have read.
- A finding that changed is re-graded as what it actually is, and stays if that is still a blocker or a major.
- Anything the refuter found that is wider than the original finding joins the list as a new finding, and goes through this section too.
- If your re-derivation and the refuter disagree, or two reviewers split on the same finding, take both positions to the user, quoted. Do not average them. Agreement proves less than it seems to: two reviewers who share a wrong assumption about the schema will agree with each other.

## 3. Verdict

For a diff or a file: **go**, **go-with-nits** or **no-go**. For a plan: **pass** or **fail**. Any standing blocker or major means no-go or fail. Go-with-nits means every nit is listed to be fixed or parked with a pointer, as the glossary in `CLAUDE.md` defines it.

## Empty results

A clean audit is a legitimate result and has to prove it ran. When nothing was found, say so and list what each judge examined and did not examine. When the load-bearing set was empty, write this in the report: "Refutation Ledger: empty. No security-class finding surfaced. That means the review found none, not that an independent skeptic verified the code is safe." The ledger tests findings that exist; it cannot surface one the review missed.

A judge that returns nothing at all, or a report with no Examined list, is a failed run and not a clean one. Dispatch it again.

## Report

```
## Audit: <target>

Verdict: <go | go-with-nits | no-go | pass | fail>
Examined: <files, and for each lens what was covered>
Not examined: <what and why>

### Must fix
- [blocker|major] <finding> — <file:line, quoted> — <what would fix it> [verified: re-derived | relayed: judge]

### Refutation Ledger
<the table, or the empty-ledger sentence>

### Reuse and simpler alternatives
- <proposed code> — <existing alternative at file:line> — <what to do>

### Nits
- <finding> — <file:line> — fix | park at <pointer>

### Needs your ruling
<split findings with both positions quoted, or nothing>
```

After a no-go, fix the must-fix list and run this again on the result. If the confirmed findings point at the approach and not the code, the next step is `/plan`, not a patch.
