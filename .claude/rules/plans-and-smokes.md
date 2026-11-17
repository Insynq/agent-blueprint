---
paths:
  - "docs/plans/**"
  - "docs/smoke-tests-pending.md"
---

# Specs and the smoke ledger

- A spec is implementable only with a `> **Status: LOCKED YYYY-MM-DD**` header. Do not add that header by hand; `/plan-review` writes it. If a locked spec needs correcting, remove the header and send it back through `/plan-review`.
- Never implement from a struck-through or superseded line. After lock the spec is regenerated clean and the history moves to `panel-history.md`.
- A smoke row moves to passed only on evidence you observed in this session, matching its lane. A trace annotates a row; it does not close it.
- A smoke that was not run is recorded as not run. Open and deferred rows are closed in place, never deleted. A section whose rows have all passed may be collapsed to one line that keeps the IDs and the date; the detail stays in git.
- Deferring a smoke past a phase boundary needs the user's grant for that row, recorded with owner and due date.
