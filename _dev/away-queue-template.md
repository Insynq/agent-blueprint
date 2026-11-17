# Away queue: [project] unattended loop ([start date] to [date the user is back])

> Copy this file to `docs/AWAY_QUEUE.md` and fill in the brackets before the loop starts. It is the only hand-off between wakes and back to the user. Every wake reads it first and rewrites it last. See `docs/WORKFLOW.md`, "Unattended loops".
>
> Goal of record ([user, date]): "[the user's own words for what this loop is for]"

## 0. Operating procedure (read every wake)

1. Run `git status -sb` and `git log --oneline -5`. If a worktree from an earlier wake is dirty, finish or stash it before starting anything else.
2. Read section 2 from the top and take the first row marked `TODO` or `IN PROGRESS`. Skip `BLOCKED` and `USER GATE` rows.
3. Do one bounded unit on that row: ground, build, gate and open a pull request, or one sub-step of that. Do not start a second row in the same wake.
4. Rewrite the row in section 2, append one line to section 3, and commit this file alone to `[default branch]` as `docs(away): ...`.
5. Schedule the next wake ([interval while building], [interval when idle]). Never end a turn without either a scheduled wake or a `LOOP STOPPED: <reason>` line in section 3.

**Where work happens.** One worktree per item under `[worktree root]/<item>`, branched from `origin/[default branch]`. Each worktree needs [untracked setup: environment file, dependencies, its own dev-server port]. An item that depends on an unmerged item branches from that item's branch and its pull request targets it.

**Gates before any pull request.** Record the numbers in the log. Clean means zero new problems against the baseline, compared as a set of errors, not a count.

| Gate | Command | Baseline at setup |
|---|---|---|
| Tests | `[test command]` | [n passed, n skipped] |
| Typecheck | `[typecheck command]` | [n errors] |
| Lint | `[lint command]` | [n problems] |
| Build, and [any project-specific gate] | `[build command]` | green |

Every behavioural change ships at least one test that has been seen failing: revert the change, watch the test go red, restore it, and record both runs.

**A pull request must contain:**
- the contract it implements (spec section and `file:line`);
- the gate output, verbatim;
- the red-then-green record for each new test;
- the rows it added to `docs/smoke-tests-pending.md`, as Pending, each with its lane;
- an `Unverified at ship` list of anything in scope that was not run.

An item that needs a spec first gets one at `docs/plans/<slug>/spec.md`, reviewed with `/plan-review`, and marked `LOCKED (away loop, user ratification owed)` before anything is built from it.

**Blocked.** Two failed gate attempts on the same cause mark the row `BLOCKED` with the literal error text. Move to the next row.

## Never without a per-instance grant

A grant applies to one named action on one occasion and is recorded in section 3 with its date. None of these is covered by the loop itself:

- merging any pull request, or pushing to a branch that deploys;
- `[deploy command]`;
- `[schema or migration push command]`, and any write to `[production data store]`;
- `[payment provider]` live-mode writes, or anything else that spends money;
- `[commands that send email or messages, or publish anything real people will see]`;
- editing environment or secret files;
- editing the user's side of the dev dashboard (answers, notes, screenshots);
- destructive local commands: `[database reset command]`, history rewrites, deleting branches the loop did not create;
- `[other outward actions specific to this project]`.

Read-only probes of production are allowed only as `[the project's safe read procedure]`.

## 1. Ground truth at setup ([date])

- `[default branch]` is at `[sha]` ([date]). Open pull requests: [list, or none].
- Environments: [what is deployed where, and from which commit].
- Source of the items below: [launch list, locked spec, or user ruling, with path].
- Known hazards: [anything a fresh session would trip over].

## 2. Items (first TODO wins; status is `TODO`, `IN PROGRESS`, `PR OPEN`, `BLOCKED`, `USER GATE` or `DONE`)

| # | Item | Status | Branch / PR | Next action |
|---|---|---|---|---|
| 1 | [What is to be built, and the spec or ruling that authorises it] | TODO | | [first concrete step] |

**User gate (the loop does not touch these):** [decisions and actions that wait for the user, each with the item it blocks].

## 3. Log (append-only)

One line per wake: date, wake number, item, what was done, gate numbers, pull request, and the next wake's target. Never edit an earlier line; correct it with a new one.

- [date] setup. Queue written, baselines recorded, loop not started.

## 4. Kick-off prompt

```
/loop Run the unattended loop. Read [absolute path]/docs/AWAY_QUEUE.md first: section 0 is the procedure and the limits, section 2 the ordered items, section 3 the log. One bounded unit per wake on the first TODO or IN PROGRESS item. Rewrite section 2 and append to section 3 before ending each wake.
```
