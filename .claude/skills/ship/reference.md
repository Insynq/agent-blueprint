# Ship reference

Read by `/ship` when it reaches the step that needs each part.

## Commit message

```
<subject: 72 characters or fewer, imperative, what shipped, no trailing full stop>

<one to three short paragraphs: what changed and why; which checks ran and
their results, each tagged [verified: how] or [relayed: source]; any
migration or follow-up the next person must know about>

Unverified at ship: <id> (owner <name>, due <date>)
Unverified at ship: <id> (owner <name>, due <date>)

<the co-author trailer this session is configured to add>
```

Leave out instructions that were aimed at you ("make sure to", "do not forget"). Write the message to a file in your scratch directory and commit with `git commit -F <file>`, so a multi-paragraph body does not depend on shell quoting.

## Changelog line

```
- YYYY-MM-DD: <phase or area>: <what shipped, one line>. Unverified at ship: <ids, or omit>.
```

Match the format already in `docs/CHANGELOG.md` if it differs.

## Deferral record on a smoke row

```
Deferred: <date> | Owner: <name> | Due: <date> | Grant: <user's words, date> | Rode ship: <commit or version>
```

`Grant` is filled only by the user's ruling on that row. A row with no grant may ride a ship inside a phase as unverified; it may not cross a phase boundary.

## Landing commands

Direct to the default branch, or the manual merge when the user asked to land a branch without a pull request:

```
git fetch origin
git switch <default>
git pull --ff-only          # stop if this fails
git merge --no-ff <branch>  # stop on any conflict; git merge --abort, report the files
git push origin <default>
git branch -d <branch>      # -d refuses an unmerged branch; if it refuses, stop
git push origin --delete <branch>   # already gone is fine
```

Pull request: `gh pr create`, then `gh pr merge` once checks pass and the grant or the user allows it. If the branch was stacked on another unmerged branch, merging it lands the parent too; say so before merging.

## Version tag and published release

Only when the summary names a version. Tag the commit that is on the default branch after landing, so the default branch never sits behind a published release.

```
git rev-parse <version>     # if this succeeds the tag exists: stop
git tag -a <version> -F <commit message file>
git push --follow-tags
gh release create <version> --verify-tag --title <version> --notes-from-tag
```

A version containing a hyphen (`1.2.0-beta.1`) is a pre-release: add `--prerelease`. If `gh` is missing or the publish fails, report that the tag is pushed and the release is not, with the command to run by hand.

## Report

```
## Shipped: <subject>

Outcome: <landed on <branch> at <hash> | pull request <url> open | released to <environment>>
State: <done | shipped, not done: N unverified | released, not production-ready: live smokes outstanding>

### Smoke debt
Deferred in total: N (was M at the last ship). Overdue: K.
| Id | Lane | Owner | Deferred | Due | Grant |
Unverified at ship: <ids, or none>
Trace-verified, still pending: <id (trace date)>, or none
Closed this ship: <id: evidence observed>

### Checks
<command or probe>: <result> [verified: how | relayed: source]

### Docs
<file>: <what changed>

### Lessons swept
<file>: <entry, one line> | none found; reviewed <what>

### Release
<release procedure run and the effect observed | no release step | tag and release url>

### Left out of this ship
<files in the working tree not staged, and why>

### Needs you
<grants, rulings or manual steps outstanding, or nothing>
```
