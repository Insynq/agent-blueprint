---
paths:
  - "docs/plans/**"
  - "docs/PARITY_LEDGER.md"
---

# Client verdicts in specs

A spec is not ready to lock until it says what happens on every client surface. `/plan-review` and the judge panel apply this check before writing `Status: LOCKED`, and a spec that fails it does not get the header. The reason is that a change built on one client and forgotten on the other is invisible until a user finds it, and a backend change that breaks an installed mobile build cannot be recalled.

## The section

Every spec has a `## Clients` section with exactly one verdict line for each client surface listed in `CLAUDE.md` (App pack, "Client surfaces"). A line has this form:

```markdown
## Clients
- **web:** built — order list gains the status filter.
- **mobile:** owed PL-12 — same filter on the orders tab.
- **admin:** n/a — staff console has no order list, by the 2026-03 scope ruling.
```

The three verdicts:

| Verdict | Means | Requires |
|---|---|---|
| `built` | This change delivers it on that surface. | The spec's steps actually include the work. |
| `owed <ID>` | It is needed there and this change does not deliver it. | A row with that ID in `docs/PARITY_LEDGER.md`, added in the same change as the spec. |
| `n/a — <reason>` | That surface will never need it. | A reason that would still be true in a year. |

"Not yet", "later" and "out of scope for now" are `owed`, not `n/a`. Acceptable reasons for `n/a` are of these kinds: the surface does not have the feature by a recorded ruling; the change is server-side with no client-visible contract change; the change is tooling or documentation.

## One client only

If the project has a single client surface, the section is one line and the check passes on it:

```markdown
## Clients
- **all:** n/a — single client.
```

Keep the section anyway. It costs one line, and the day a second client is added every existing spec already says what it assumed.

## Backend changes and installed builds

When the spec drops, renames, retypes or revokes anything a client reads (a table, column, function signature, server function response, permission), `n/a` is not available for any client that has builds installed on users' devices. That client's line is `built` or `owed`, and the spec states how the oldest installed build keeps working until it is replaced: usually an additive first step, with the destructive step recorded as waiting on a ledger row.

## The check at lock

1. The spec has exactly one `## Clients` heading.
2. Under it, one line for each surface in `CLAUDE.md`, or the single `all` line when there is one surface. No surface missing, none twice.
3. Each line carries exactly one of the three verdicts.
4. Each `owed` ID exists in `docs/PARITY_LEDGER.md`, names this spec as its source, and is not `closed`.
5. Each `n/a` has a reason of an acceptable kind, and the installed-builds rule above is met.

Report the result in words either way: "Clients check: pass, 3 surfaces, 1 owed (PL-12)" or the list of what failed. A silent pass reads as a check that did not run.

A spec locked before this pack was installed gets a `## Clients` section added as an addendum the next time it is touched. It does not lose its lock.

## The ledger

- Add the row when the spec says `owed`, in the same change. A debt recorded later is a debt recorded never.
- When the owed work ships, set the row's state to `closed` in the change that ships it and fill in `Closed by`.
- Rows are closed and never deleted, so an ID always resolves and is never reused.
- A row whose state is `gates(...)` means a destructive backend step is waiting on it. Do not take that step until the row is closed and the adoption evidence named in the row exists.
