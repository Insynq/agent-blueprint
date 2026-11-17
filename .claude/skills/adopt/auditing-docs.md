# Auditing existing docs

Used by `/adopt`. A project that predates the framework usually has docs that were true when written. The audit finds which ones still describe the code, so that later sessions do not build on a description of something that has moved or gone.

## Which docs

Candidates are the project's own Markdown files: everything under `docs/` and any top-level guide that describes the system (architecture notes, runbooks, onboarding docs). Leave out:

- files the framework ships, which are the ones `.framework-manifest.json` lists as framework-managed;
- the project-state files adopt has just filled;
- `docs/plans/`, changelogs, lessons and other records of what happened, which are history and cannot go stale in this sense;
- anything under `docs/archive/`.

Show the user the list and let them trim it. If there are no candidates, record that with the directories you looked in, and skip the rest.

## Checking a doc

Pull out every statement that can be checked against the repository: file and directory paths, commands, function, type, table and route names, environment variable names, configuration keys, counts, and descriptions of how one part calls another. Note the line each sits on.

Dispatch one `grounder` agent per doc, all in one message so they run in parallel, and wait for all of them. Give each the doc's path and tell it to treat every checkable statement in the doc as a claim. Its standing instructions cover the rest: it quotes evidence, tries a second search before reporting absence, and does not edit.

A grounder's report is a claim. Before proposing to fix or archive a doc, open the evidence yourself for every statement it reported as false. A doc that is archived because a search missed a renamed directory is the audit doing damage.

## Sorting

| Result | Meaning | Suggested action |
|---|---|---|
| Current | Every checkable statement confirmed | keep |
| Partly stale | Some statements moved or false, most hold | fix |
| Mostly stale | More than half moved or false | fix or archive, user's call |
| Unverifiable | Fewer than three checkable statements | keep, with a note that it could not be checked |

Prose that makes no checkable statement is not evidence of staleness. Do not suggest archiving a doc for being unverifiable.

## Decisions

Show a summary table of all the docs first, then go through the ones that are not current. For each, list the stale statements with their line numbers and what the code shows instead, then ask the user to pick:

- **keep**: leave it exactly as it is.
- **fix**: correct the statements whose replacement is known, such as a moved path or a renamed command. A statement that is false with no clear replacement is not rewritten; it is listed in the audit record for the user to resolve.
- **archive**: move it to `docs/archive/` with `git mv`, so its history follows it. Nothing is deleted.
- **merge**: move its still-true content into one of the project KBs and archive the original. Offer this only for docs that are current or partly stale.
- **skip**: decide later. Recorded as deferred.

Batch the questions: one message covering every doc, with your suggested action against each, is better than a prompt per file.

## The audit record

Write `docs/adopt-audit-YYYY-MM-DD.md`. It is the durable account of what adopt did, and a later run reads it to avoid asking the same questions again.

```markdown
# Adopt audit: YYYY-MM-DD

Framework version: <from .framework-version>. Packs: <names | core only>.

## What was inspected
<the manifests, directories and docs that were read>

## Project docs written
| File | Result | Observed | Inferred | Unknown |
|---|---|---|---|---|

Unknowns still open: <list, each with who can answer it>

## Commands
| Command | Status | Note |
|---|---|---|
<verified | failing | not run, with the reason or the first error>

## Existing docs
| Doc | Result | Stale / checked | Decision | What was done |
|---|---|---|---|---|

Statements left for the user to resolve: <doc:line, what it says, what the code shows>

## CLAUDE.md
Mode: <filled in place | merged | restructured from 0.x>. Backup: <path>.
Moved out: <section, destination>
Dropped as superseded framework text: <list>

## Siblings
| File | Outcome |
|---|---|

## Deferred
<anything skipped, with an owner>
```
