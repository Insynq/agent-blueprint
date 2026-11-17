---
name: triage
description: Use when stale work has piled up (open pull requests, abandoned branches, half-finished items) and you need to know what to do with each one before planning anything new. It sorts and does not plan; anything that graduates to real work goes to /plan.
argument-hint: "[list of items, or a source such as 'open PRs']"
---

# Triage

Give every item in a backlog a verdict with evidence and an independent attempt to overturn it, and prove that no item was lost on the way. The output is a table with one row per item, a suggested order for acting on it, and a count line that reconciles what went in against what came out. The buckets are judgment; the count is mechanical and is the part that must be exact.

Backlog: $ARGUMENTS. If it is a list, use it as given. If it names a source, discover the items with `git` and `gh`. If it is empty, look at open pull requests and unmerged branches on the remote and confirm the set with the user before fanning out.

This skill is read-only. It does not merge, close or delete anything; it recommends.

## 1. Enumerate and freeze N

Write out the full list of items, one per line, each with the most concrete identifier it has: a pull request number, a branch name, an issue id. An item too vague to pin down is still an item and stays on the list. Show the list and its count, N.

N is now fixed. Everything after this is checked against it. Enumeration can also come up short, so when you discovered the items yourself, say what you queried and try a second way (for example, branches with no pull request) before freezing.

If there are no items, say so, name what you queried, and stop.

## 2. Choose the buckets

Start from these and rename or replace them when the backlog is of a different kind, such as documents or research threads:

| Bucket | Means |
|---|---|
| ready | Sound as it stands. Land or adopt it. |
| needs touch-up | Right direction, bounded fixes needed first. |
| superseded | Other work, merged or in flight, has replaced it. Close it. |
| rewrite | Worth doing, but redo it; do not salvage the existing implementation. |

State the buckets before dispatching so every investigator uses the same ones. Do not turn them into a decision tree: an investigator argues a bucket from what the item actually contains.

## 3. Investigate, one agent per item

Dispatch one read-only subagent per item, all in one message for a small backlog and in waves of about ten for a large one. Wait for every wave. Each brief gives the item's identifier, how to see it (the diff against the remote default branch, the pull request, the branch log), the bucket definitions, and the shape of the report:

```
Item: <id>
Bucket: <bucket>
Evidence: <file:line, commit or pull request reference, quoted>
Could not check: <what and why>
```

A bucket with no evidence is not a verdict. An investigator that found none must say so.

## 4. Try to overturn each verdict

An investigator's verdict is a self-report. For each item, dispatch a `refuter` agent with the item's identifier, the bucket and the investigator's evidence, and nothing of the investigator's reasoning. Ask it to show the bucket is wrong: the item belongs elsewhere, the evidence is stale, or something has superseded it since. Dispatch these in parallel the same way.

It returns stands, killed or changed, with quoted evidence. That result, and not the investigator's bucket, is what goes in the table. Before recording a killed or changed verdict, open the lines the refuter cites.

## 5. Resolve only what is contested

Where the refuter killed or changed a verdict and the evidence on both sides is real, do not pick one and do not average two buckets into a third. Put the item in front of the user with both positions quoted. A split is the most useful thing this process produces.

Where investigator and refuter agree, record the verdict as uncontested. Do not call it verified. Two agents that share a wrong starting assumption agree with each other for that reason, so their agreement adds no confidence.

## 6. Coverage tally

Count the rows that have a verdict and compare with N.

- Any item whose investigator or refuter died, timed out, or came back empty gets its own row with the verdict `UNVERIFIED` and the reason. Re-dispatch it once if you like; if it fails again the row stays. It is never left out.
- If the rows do not add up to N, the run has failed. Say so at the top of the output and name the missing items. Do not present a table that covers fewer items than went in as though it were complete.

This is the one step that cannot be skipped, even when every item looks obvious, because a dropped agent leaves no trace except a shorter table.

## 7. Output

```
| Item | Bucket | Challenge | Evidence |
|---|---|---|---|
| PR 123 | ready | stands | src/foo.ts:44, matches the current convention |
| branch/x | rewrite | changed to needs touch-up | api/y.ts:12, smaller fix than claimed |
| PR 130 | UNVERIFIED | none | investigator returned nothing twice |
```

Then:

- contested items, each with both positions quoted, for the user to decide;
- a suggested order of operations, as advice: usually land what is ready to shrink the surface, close what is superseded, schedule the touch-ups, then plan the rewrites;
- the count line, always present and always last: `N in / N verdicts / K unverified`, with the real numbers. If the first two differ, this line is where the failure is declared.

## Handing items on

An item that goes to `/plan` carries its history with it: the plan links every pull request and branch that inspired it and says where the existing implementation lives before it proposes a replacement. Pass those references along with the item.
