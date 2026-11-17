# Smoke tests pending

The single list of what still needs verifying. Do not restate these tests in commits, pull requests or chat; refer to them by ID. `/implement` adds rows, `/ship` reconciles them, and `docs/WORKFLOW.md` explains the model.

> **Open: 0. Deferred: 0.** `/ship` updates this line.

## Lanes

The lane says what evidence closes a row.

| Lane | Closed by |
|---|---|
| `data` | A check against the data store: a query, a database test, a permission round-trip. |
| `wiring` | Exercising or tracing a code path: a unit or component test, or a direct invocation. |
| `visual` | A person looking at the real interface. Nothing else closes it. |
| `integration` | An end-to-end run across systems. |

`live-required` on any row means only a run against the live service closes it. Use it for anything crossing a service boundary: sign-in, outbound email or messages, webhooks, payments, third-party APIs.

## Status values

- `Pending`: not run.
- `Passed YYYY-MM-DD (how, who)`: observed. The evidence matches the lane.
- `Failed YYYY-MM-DD`: link the issue or the fix; do not expand the failure here.
- `Trace-verified YYYY-MM-DD`: an annotation beside `Pending`, never a replacement for it. Stale after a month.
- `Unverified at ship`: shipped without being run. Carries a deferral record.

A deferral record sits on the row: `Deferred: <date> | Owner: <name> | Due: <date> | Grant: <the user's words, date> | Rode ship: <commit or version>`. A row may cross a phase boundary only with a grant.

## Deferred across a phase boundary

`/ship` reports this table every time. It is the debt.

| ID | Owner | Deferred | Due | Grant | Rode ship |
|---|---|---|---|---|---|

## Rules for rows

- IDs are `<SECTION>-<N>`, short and permanent. An ID is never reused.
- A row can be run from its own text: setup, steps, and at least one observable expected result. "Should work" is not an expected result.
- A row is not needed for behaviour an automated check already covers.
- Every stated precondition for landing gets its own row. A precondition that lives only in a spec ships the feature inert.
- Open and deferred rows are closed in place, never deleted. When every row in a section has passed, collapse the section to one line that keeps the IDs and the date.
- Group rows that need the same fixture, account or instrument, so one sitting closes them together.

## Template

```markdown
## <Feature or phase>

Source: `docs/plans/<slug>/spec.md`, <commit or pull request>.

### <ID>-<N>: <one-line title>

| | |
|---|---|
| Lane | wiring (live-required) |
| Status | Pending |
| Starts at | <file, for wiring rows> |

Setup: <the state needed, specifically>

Steps:
1. <action>

Expected:
- <observable result>
```

<!-- rows below -->
