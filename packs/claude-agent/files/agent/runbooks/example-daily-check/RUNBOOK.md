# Example daily check

Finds open items that are past due, decides which of them have gone stale, and flags the stale ones for a person to look at. It is a stand-in that runs against a JSON file, kept small so the form is easy to see. Copy the folder, replace the store and the judgment, and delete this one.

Done means: every overdue item has been looked at, each stale one carries `validation_status: needs_validation` with a reason (or is listed as "would flag" while the gate is closed), and the report below has been produced.

## Authorisation gate

**Gate: closed. Dry run only.**

While this says closed, run every `guarded-write.mjs` command without `--confirm` and report the result as "would flag". The gate is opened by the project owner editing this line to `Gate: open`, in a commit, after seeing a dry run they are happy with. Approval of the design of this runbook does not open it.

The script enforces the same thing independently: `guarded-write.mjs --confirm` exits 3 and writes nothing unless `AGENT_WRITE_AUTHORIZED=true` is in the environment. Do not set that variable yourself. If the gate says open and the script still exits 3, the environment has not been authorised for writes: report that and stop.

## Before you start

- First time only: `mkdir -p agent/data && cp agent/runbooks/example-daily-check/sample-items.json agent/data/items.json`.
- The as-of date is today unless the caller gave one.

## Steps

1. **List what is overdue.** Run `node agent/scripts/example-list-overdue.mjs --as-of <date>`. Use its `overdue_count` and its rows as given. Do not recount, and do not read `items.json` yourself to build the list: the script is the one that gets the count right every time. Exit 3 means the store could not be read, which is a failure to report, not "nothing overdue".

2. **If nothing is overdue, check that answer a second way** before reporting it. Confirm `total_items` and `open_items` are what you would expect (a store that suddenly holds zero items is a broken read, not a quiet day) and that the `as_of` date in the output is the one you meant.

3. **Decide which overdue items are stale.** This is the judgment the runbook exists for. Read each item's `note`. An item is waiting, not stale, when the note names who it is waiting on and why. An item is stale when it is overdue with no note, or the note describes something that has clearly lapsed. If you cannot tell, treat it as stale: flagging costs a person a few seconds, and an unflagged stale item costs whatever the item was protecting. Skip items that already carry `needs_validation`.

4. **Dry-run the flag for each stale item**, one item per command:

   ```bash
   node agent/scripts/guarded-write.mjs update items --where id=<id> --set '{"validation_status":"needs_validation","flag_reason":"<one line>"}'
   ```

   Check that `rows_affected` is 1 and the row shown is the one you meant.

5. **If the gate is open, write.** Repeat each command with `--confirm`. Exit 0 with `"verified": true` means the row was written and read back. Any other exit code means stop and report it with the script's message: 2 refused, 3 not authorised, 4 written but the read-back did not match.

6. **Nothing here contacts anyone.** If an item needs a person chased, say so in the report. Sending a message is an outward action and is not part of this runbook.

## What to report

Keep it short and put the numbers first. Use the script's figures.

```
Example daily check: <as-of date>   mode: dry run | written
Items: <total> total, <open> open, <overdue> overdue (<n> already flagged)

Flagged (or: Would flag):
- <id> <title>: <reason>

Left alone:
- <id> <title>: waiting on <who>, per note

Needs a person:
- <anything that needs an outward action or a decision>

Checked: <path of the store read>, as of <date>
```

If nothing was overdue, say so in one line and say what was checked, so the reader can tell an empty result from a run that did not happen.

## When something is off

- A script exits with a code this runbook does not mention: stop and report the command, the code and the message. Do not work around it by editing the store directly.
- The store looks wrong (duplicate ids, missing fields): report it under "Needs a person". Do not repair it as part of this run.
