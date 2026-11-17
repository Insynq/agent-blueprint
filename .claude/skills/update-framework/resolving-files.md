# Resolving files

Reference for `/update-framework`: how files are compared, what the user can choose for each, how the two merged files are handled, and what gets written to `.framework-version`.

## Comparing

Three copies of each path: local (the project), base (the installed version, flattened), target (the new version, flattened). Before comparing, strip a leading byte-order mark, convert CRLF to LF, drop trailing whitespace on each line and collapse trailing blank lines. A checkout with line-ending conversion turned on would otherwise make every file look changed.

For the comparison with the base only, also remove local blocks from the local copy (see below). Then:

1. Local absent, target present: **new**.
2. Local equals target: **current**.
3. Local equals base: **unmodified**.
4. Anything else: **customised**. If there is no base, every file that differs from the target lands here. That is deliberate: without a base, the project's changes cannot be told from the framework's, and asking is the safe side.
5. Present in base, absent from target, present locally: **retired**. Unmodified if local equals base, customised otherwise.

A new file that the base also had was probably deleted by the project on purpose. Mark it in the plan as "shipped by the installed version, absent here" so the user can decline it.

## Which action is the default

For a customised file, look up the action in the target manifest's `default_action_on_conflict`: an exact path first, then the longest matching directory entry, then the category default in `_meta.category_defaults`.

| Action | Effect |
|---|---|
| `overwrite-with-backup` | Back up the local copy, write the target's. The default for framework-managed files. |
| `sibling` | Leave the local copy. Write the target's beside it as `<name>.framework` for the user to reconcile. The default for hybrid files. |
| `skip` | Leave the local copy and write nothing. |

Before any write, check the path against the project's own manifest as well as the target's. If either lists it as project-owned, do not write it, whatever the other says, and show the disagreement in the plan.

## What the user can choose

For any customised or retired file the user may override the default with one of:

- **keep**: leave the local copy. It will show as customised again at the next update.
- **take**: back up and replace with the target's copy. For a retired file, back up and remove.
- **merge**: three-way merge, described next.
- **sibling**: write the target's copy as `<name>.framework`.
- **wrap**: for a framework-managed file where the project's change is small and deliberate, take the target's copy and re-add the change inside `<!-- local: reason -->` markers, so the next update carries it automatically. Suggest this whenever it fits; it is how a customisation stops needing a decision.

Show the diff of local against target, or local against base, when asked.

## Three-way merge

Work on a copy under the temporary directory, never on the project file:

```bash
cp <local> <tmp>/merge/<path>
git merge-file <tmp>/merge/<path> <tmp>/base/<path> <tmp>/target/<path>
```

Exit 0 is a clean merge. A positive exit code is the number of conflicts, left in the file as markers. Resolve each conflict by reading both sides: keep the project's intent and the framework's new text where they do not contradict, and where they do, show the user both sides and let them choose. Show the merged result as a diff against the local copy and get approval before it goes into the plan. A file that still contains conflict markers is never applied.

Without a base there is no three-way merge. Offer keep, take, sibling or wrap.

## Local blocks

A block opens with `<!-- local: <reason> -->` and closes with `<!-- /local -->`, each on its own line. In a non-Markdown file the same text sits inside that file's comment syntax.

For each block in the local copy, record the nearest non-blank line above it and the nearest below it. In the new version:

1. If the line above occurs exactly once, insert the block after it.
2. Otherwise, if the line below occurs exactly once, insert the block before it.
3. Otherwise the block is unplaced.

Placement by a line that occurs more than once, or by a nearby heading, is a guess, and a block dropped into the wrong step of a skill is worse than one reported as unplaced. An unplaced block moves its file to the customised group. Show the block, show the section of the new version where its neighbours used to be, and ask where it goes or whether it is dropped. A dropped block stays recoverable in the backup; name the backup path in the report.

An opening marker with no closing marker, or blocks nested inside each other, cannot be parsed reliably. Treat the file as customised and say why.

## CLAUDE.md

Never replaced. Build a merged version and show it as a diff:

- **Pack sections.** Replace each `<!-- pack:<name> -->` block between the `packs:start` and `packs:end` markers with the target's block for that pack, add blocks for packs being added, and add the marker pair if the file lacks it.
- **Framework text.** For the parts the framework writes (the Skills table, the reference list, the evidence table and autonomy rule, the starting entries under Patterns and Do not), find what changed between base and target and apply those changes. Rows and entries the project added stay.
- **Project content.** Overview, Stack, Layout, Commands, Current phase, Live invariants, preferences and any section of the project's own are not touched.

If the user declines the merge, fall back to the manifest's action, which writes `CLAUDE.md.framework`.

## .claude/settings.json

Never replaced. Merge structurally: start from the project's file and add what the flattened target has that it lacks.

- `permissions.allow`, `permissions.deny` and each hook event list are unions. An entry the project has stays, including ones the target does not have.
- An entry present in the base, absent from the target and still present locally was removed by the framework. Propose removing it and say why; do not remove it silently.
- Keys the framework does not manage are left as they are.

Show the result as a diff. Hooks changed this way take effect only after a session restart.

## .framework-manifest.json

Replaced by the flattened target's manifest, with a backup. If the local manifest differs from the flattened base, the project edited it: carry those entries over, typically paths the project added to `project-owned`, and show them in the plan.

## .framework-version

Written last. Read the existing file, keep `installed_at`, `installed_method`, `canonical_url` and `installed_from` as they are, and set:

```json
{
  "version": "<target version>",
  "tarball_sha256": "<SHA-256 of the target tarball, or null for a local clone>",
  "previous_version": "<the version that was installed>",
  "last_updated_at": "<ISO 8601 UTC>",
  "update_method": "skill",
  "packs": ["<installed pack names>"],
  "update_log": [
    { "path": "<path>", "action": "added | replaced | merged | kept | sibling | removed", "note": "<one line>" }
  ]
}
```

`update_log` holds this update only; earlier history is in git. Write to a temporary name and rename, so an interruption cannot leave half a file.

If `tarball_sha256` was recorded at install and the base tarball you downloaded has a different hash, say so in the plan. It means the release tag moved or the install came from somewhere else, and the base comparison deserves less trust.
