# <Phase or feature name>

> **Status: draft**

## Summary

Two or three sentences: what this delivers and for whom.

## Scope

- In scope: …
- Out of scope: … (earned: how it was confirmed | assumed: verified by step N)

## Prior work

Pull requests, branches or existing code this replaces or builds on, each with where the current implementation lives. Omit if there is none.

## Decisions

| Decision | Choice | Reasoning | Date |
|---|---|---|---|
| | | Include the evidence: a `file:line`, a brainstorm section, a probe result, or the engineering reasoning itself. | |

Record the user's answers from the grilling here too, including what a go authorises: environments, merging, spend.

## Named values

Every value the code will refer to by name (a status, a column, a payload key, an event name) and where it is defined.

| Value | Defined at | Opened this session |
|---|---|---|
| | `file:line` | yes |

## Batches

| Batch | Owns (files) | Depends on | Lands |
|---|---|---|---|
| 1 | | none | first |
| 2 | | 1 | after 1 |

## Steps

### Batch 1

#### Step 1.1: <what>

- **File:** `path/to/file`
- **Change:** …
- **Why:** …
- **Expected observation:** … (for steps with a failure mode that is not obvious)
- **Most likely failure:** … and the counter-move

#### Step 1.2: …

## Runtime forks

Only forks that pass all three tests: observable trigger, both routes designed here, trigger can be evaluated without making the choice.

- If <observation>, take route B: <designed route>. Otherwise route A: <designed route>.

## Abort conditions

- **Blocked (stop and report):** …
- **Friction (push through):** …

## Tests

The behaviours that get a test, including error paths, empty and boundary data, each role that is affected, and the old behaviour next to the change. Each new test must be seen failing.

## Smoke rows

Added to `docs/smoke-tests-pending.md` when the batch is packaged.

| Id | Lane | Live-required | What is checked | Starting point (wiring rows) | Must happen before |
|---|---|---|---|---|---|
| | data / wiring / visual / integration | yes / no | | `file` | |

## Rollback

How to undo each batch, and what cannot be undone once it lands.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| | | |
