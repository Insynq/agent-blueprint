# Parity ledger

The one list of work that a spec delivered on one client surface and still owes on another, plus the destructive backend steps that wait on a client release. A spec's `## Clients` section points here with `owed <ID>`. The rules for that section are in `.claude/rules/app-spec-checks.md`.

**Rules**

- Add a row in the same change as the spec that owes it.
- Close a row in the change that ships the owed work. Rows are closed, never deleted, and an ID is never reused.
- A cell must not contain a bare pipe. Write `\|`.

**Vocabulary**

- **Client:** the surface that lacks the work, as named in `CLAUDE.md`.
- **Size:** `S`, `M` or `L`. A guess, to help ordering.
- **Delivery:** how the fix reaches users: `deploy` (host build), `ota` (over-the-air update), `store-build` (new binary through review).
- **State:** `open`, `blocked(<what it waits on>)`, `gates(<destructive backend step that waits on this row>)`, `closed`. Record the first unmet dependency as the state and the rest of the sequence in Evidence.
- **Evidence:** how you know the client lacks it, in a form someone can re-run: a search and its result, a file and line. For a `gates` row, also what will count as adoption (for example, the share of sessions on a build that has the change).
- **Closed by:** pull request and release identifier.

| ID | Source | Client | What it lacks | Size | Delivery | State | Evidence | Closed by |
|---|---|---|---|---|---|---|---|---|
