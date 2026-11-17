---
name: update-kb
description: Use when the project docs no longer match the code, after a phase completes or a significant change lands, and the knowledge bases and CLAUDE.md need bringing back in line. This edits docs only. To commit and release, use /ship.
argument-hint: "[phase] [architecture | current-state | all]"
disable-model-invocation: true
---

# Update the knowledge base

Arguments: $ARGUMENTS

The arguments are an optional phase that has just completed and an optional focus. With no focus, cover every doc listed in `docs/KB_INDEX.md`. With no phase, work from what has changed since the docs were last touched.

Bring the docs back in line with the code. Done means every statement you added or left standing in the docs you touched is true of the code now, finished work has been collapsed, and your report lists each file and what changed in it. This skill edits docs in place and does not commit.

## Find the drift

Drift has two sources, and the second is the one that gets missed.

- **What changed.** Read `git status`, and `git log` and `git diff` since the last commit that touched the docs. Read the changed files themselves: a diff summary tells you where, not what.
- **What the change made false.** For each thing that was renamed, moved, removed or changed in behaviour, search the docs for its old name and description. A doc that describes something no longer there is worse than a doc that is silent.

Check a statement against the code before you write it. Do not document from the spec, a commit message or a subagent's report: those say what was intended, and the docs are supposed to say what is. If you carry a claim forward without checking it, tag it `[relayed: source]` so a reader can tell.

## What belongs in a doc

Docs hold rules, decisions, and the way to look a fact up. They do not hold copies of facts that live in a system of record, because a copy starts diverging the day it is written and nothing reports the divergence.

- A count, a list of rows, a version number, a set of configured values, the current state of an external system: write the command or query that produces it and what it should show. Do not write the answer. Where you find a stale copy, replace it with the query.
- A decision goes in `docs/KB_1_Architecture.md` as a row of `Decision | Choice | Reasoning | Date`. Decisions that outlasted their phase move there from the spec.
- A negative ("there is no X", "nothing calls Y") goes into a doc only with what was checked to establish it. Later sessions inherit it and defend it.
- A verification status goes in only if you observed it. Do not mark something passing because the work is finished. Smoke rows live in `docs/smoke-tests-pending.md` and are closed only on evidence matching their lane.
- Generated docs are regenerated with their generator and never edited by hand.

## What to update

- **`docs/KB_8_Current_State.md`**: the active phase and the last few completed ones. Session notes are for live blockers and context that must cross sessions. Delete a note when it is resolved.
- **`CLAUDE.md`**: the current-phase paragraph, the commands if they changed, a pattern once it is settled project-wide, a Do not entry when a mistake has earned one, and the skills table if a skill was added or removed. It loads into every session, so add a line only when every session needs it, and put the detail in `docs/` with a pointer.
- **`docs/KB_1_Architecture.md`**: when the data model, a service boundary, an integration or a recorded decision changed.
- **Project KBs** listed in `docs/KB_INDEX.md`: when something in their area changed. Add a row to the index when a new KB appears.

Whenever you update another doc's phase status, update the paragraph in `CLAUDE.md` in the same pass, so the two never disagree.

`docs/CHANGELOG.md` and the sweep into `docs/LESSONS.md` belong to `/ship`. Leave them alone unless a line in them is now false.

## Collapse finished work

A completed phase shrinks to two or three lines: what shipped, when, and where the detail lives (the plan folder, the release tag). Changelog entries are one line each. The history is in git and `docs/plans/`, and a doc that keeps accumulating it stops being read.

Before you collapse or delete detail, confirm it is committed. "History lives in git" is true only of text that reached git. If the detail exists only in the working tree, leave it in place and say in your report that it should be committed before the next collapse.

Keep anything still open when you collapse: an unverified item, a deferred smoke with its owner and date, a follow-up. Those move to where open things live (`docs/smoke-tests-pending.md`, `docs/PARKING_LOT.md`, the active phase), not into the summary where they would read as finished.

## Report

```markdown
Updated:
- <file>: <what changed and why>
Stale statements removed: <file: what it said, what is true now>
Copied facts replaced by queries: <file: which>
Left alone: <docs checked and found current>
Could not check: <statements you could not confirm against the code>
```

If nothing has drifted, say so and list the docs you checked and the range of changes you compared them against. Then stop. Committing is `/ship`'s job.
