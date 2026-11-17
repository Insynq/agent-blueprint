---
name: dash-sitting
description: Use when smoke rows need a person to look - any row in the visual lane, or one only a human can run - and before telling the owner that work is ready for them to test. For rows you can close yourself with a query, a test or a trace, close them and do not write a sitting.
argument-hint: "[smoke IDs or the feature, optional]"
---

# Dash sitting

Rows: $ARGUMENTS

Write a guided sitting: one timed pass through one feature in one environment, laid out so the owner never has to work out what to do next. Done means the sitting is saved and passes the edit check, every `visual` row in scope is covered by a step, it is committed, and the owner has the link.

You do this without asking; `.claude/rules/devdash.md` is the authorisation. A list of smoke IDs is not something a person can run, and "looks good" in reply to one is not evidence that any test ran.

## Choose the rows

If the arguments name rows or a feature, start there. Otherwise run `node devdash/scripts/check.mjs`; it lists the rows only a person can close that no open sitting covers. Read each row in `docs/smoke-tests-pending.md`.

Put in a sitting: rows in the `visual` lane, and rows that need a person for another reason (a phone in hand, a real inbox, a payment with a real card). Leave out `data` and `wiring` rows; those are yours to close with your own evidence.

Group rows that share an environment and a sign-in into one sitting, and split at about forty steps or when the environment changes. Web and phone are separate sittings.

## Make sure it can be run

A sitting the owner cannot start wastes their time more than no sitting. Before writing it, confirm against the real environment, not from memory: the change is deployed where the sitting points; the account exists and can sign in; the data each step needs is there. If you can drive a browser, walk the steps yourself first and save a screenshot of each expected state into the sitting folder as a reference. Your walk-through is preparation. It closes nothing.

## Write it

Create `devdash/sittings/<feature>-<yyyy-mm-dd>-<web|phone>/sitting.json`. The schema and a full example are in `devdash/README.md` under "Sittings"; `devdash/sittings/example-try-the-dash/sitting.json` is a working file. The parts that matter:

- **`environment`**: the name and base URL from `devdash/config.json`. A step's `where` is a path under it.
- **`signIn`**: who to be, for the whole sitting or per step. Only shared test accounts for a test environment. Never a real person's login, never a password in the file; say where the password is kept.
- **`prerequisites`**: what must be true before Start, each one checkable.
- **Steps**, numbered from 1. Each has:
  - `title`: three or four words.
  - `do`: the actions, one per line, naming the exact control ("Press **Check out**").
  - `expect`: what the owner should see, one checkable statement per line, with the real labels and numbers. Each line gets its own tick box. "It works" is not an expectation.
  - `smokes`: the ledger IDs this step proves. A row closes only if every step naming it is passed, so name a row on the steps that really show it and nowhere else.
  - `shots`: reference screenshots from your walk-through, with a caption.

Order the steps so sign-ins change as little as possible, and so a failure early does not make every later step unrunnable. Write for a project manager on a phone.

The edit hook validates the file as you save it. Fix anything it reports; a broken sitting is not shown to the owner.

## Hand it over

Commit the folder by path; it does not need to be merged, because the dash finds sittings in every checkout. Run `node devdash/scripts/check.mjs` and confirm the rows no longer appear as uncovered. Make sure the dash is up, then give the owner the link (`http://localhost:<port>/#/sittings/<id>`, or their private address), the number of steps and a rough time.

A hook tells you when they finish. Then `/dash` reads the results and makes the ledger edits it prints: a step marked Pass closes its row as `Passed <date> (sitting <id>, <owner>)`; Fail and Skip close nothing. After fixing a failure, write a new sitting for the re-test instead of editing this one, so the record of what was run stays true.
