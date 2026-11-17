---
name: update-framework
description: Use when a newer version of the framework has been released and this project should pick it up, when a pack needs adding to a project that is already installed, or when the project still carries the 0.x layout (.claude/commands/, docs/MULTI_AGENT_WORKFLOW.md) and needs migrating. For a first install into existing code, use /adopt.
argument-hint: "[version] [dry-run] [from <path to a local blueprint clone>]"
disable-model-invocation: true
---

# Update framework

Bring this project's copy of the framework up to a newer version, file by file, without losing anything the project changed. You are done when every framework file is at the target version or has a recorded reason for staying as it is, `.framework-version` carries the new version, and the user has a report of what changed and where the backups are.

Three properties hold on every path through this skill. If you cannot keep one, stop and say so.

- **The user sees the whole plan before anything in the project changes.** Everything up to the plan happens in a temporary directory outside the project.
- **Nothing is overwritten or removed without a backup** in `.framework-backup/`, and the backup is confirmed to exist before the write.
- **Project-owned files are never written.** A file is project-owned if either the project's manifest or the new one says so.

Arguments: `$ARGUMENTS` is free text holding up to three optional parts. A version such as `1.2.0` or `v1.2.0` is the target; without one, the target is the latest release. The word `dry-run` means stop after showing the plan. `from` followed by a path means take the new version from that local clone instead of downloading it.

## Check the starting state

- `node`, `git`, `tar` and `curl` are on the path.
- `.framework-version` and `.framework-manifest.json` exist and parse. Without them the framework was never installed here, or was copied in by hand; point to `npx @insynq/agent-blueprint init` and stop.
- Read the installed version, the repository owner and name from the manifest, and the installed packs from `.framework-packs.json`. A missing record file means no packs.
- **If the installed version is below 1.0.0**, or the project still has the framework's old command files in `.claude/commands/` or `docs/MULTI_AGENT_WORKFLOW.md`, read `migrating-from-0.x.md` in this folder now. It changes how the base is prepared, adds steps to the plan, and decides the packs. The three properties above still hold.
- Run `git status --porcelain`. If the tree is dirty, say the update will be mixed into those changes and ask whether to continue. A clean tree makes the update one reviewable diff, and makes `git checkout` a second way back.
- A target older than the installed version is refused unless the user asked for that version by number and confirms they mean a downgrade.

A target equal to the installed version is not a reason to stop. That is how a pack is added to an installed project: the user adds its name to the `packs` array in `.framework-packs.json` and runs this skill, and the pack's files show up as new. The same run restores framework files that have gone missing.

## Fetch and flatten

Create a temporary directory outside the project, with `target/` and `base/` inside it. Treat what you download as untrusted until it is unpacked and checked.

1. **Target.** Find the latest release tag from `https://api.github.com/repos/<owner>/<repo>/releases/latest` unless a version was given. Download `https://github.com/<owner>/<repo>/archive/refs/tags/v<version>.tar.gz` and unpack it into `target/` with `tar -xzf <file> --strip-components=1 -C <tmp>/target`. Record the tarball's SHA-256.
2. **Base.** Do the same for the installed version into `base/`. The base is what tells a file you changed apart from a file the framework changed. If its tarball cannot be had, continue without it and treat every file that differs from the target as changed by the project.
3. **Check both trees.** No symbolic link may point outside its tree. If one does, stop: the archive is not what it claims to be.
4. **Flatten both.** The released tree keeps packs under `packs/`, while the project has them overlaid at its root. Run `node <tmp>/target/bin/pack.js flatten <pack names> --root <tmp>/target` with the installed pack names, space separated. It overlays those packs, merges their settings, manifest entries and `CLAUDE.md` sections into the tree, and removes `packs/`, so every path lines up with the project's. It needs no `npm install`.
   - Before flattening, read the `gitignore` list from each installed pack's `pack.json`. Flattening removes `packs/`, and `.gitignore` is not a file this skill compares, so those lines are otherwise lost.
   - With no packs installed, `flatten` has nothing to be given and refuses. Remove `<tmp>/target/packs` yourself.
   - A recorded pack that the target does not contain is a stop: it was renamed or retired, and the target's `FRAMEWORK_CHANGELOG.md` should say which.
   - After flattening, the tree's own `.framework-packs.json` lists the packs with their dependencies. A dependency the project's record lacks is added to the plan.
   - Flatten `base/` the same way with the packs that were installed when that version was applied: the `packs` list in `.framework-version` if it has one, otherwise the recorded packs that have at least one file in the project. A pack that is being added in this run is left out of the base, so its files read as new.

With `from <path>`, export the clone instead of downloading: `git -C <path> archive HEAD | tar -x -C <tmp>/target`. For the base, use the commit recorded in `installed_from` in `.framework-version` if there is one. Never flatten the clone itself.

Read the entries in the target's `FRAMEWORK_CHANGELOG.md` between the installed and target versions, for the removed, renamed and migration notes that go into the plan.

## Classify

Nothing in the project is written in this step. The flattened target's manifest decides what the framework owns. For a path, the most specific entry wins: a file entry beats a directory entry, and a longer directory beats a shorter one.

Walk every file in the target that its manifest lists as framework-managed or hybrid, and every such file in the base that the target no longer has. Compare the local, base and target copies after normalising line endings and trailing whitespace, and sort each file into one group. The full rules, including how local blocks affect the comparison, are in `resolving-files.md` in this folder.

| Group | Condition | What is proposed |
|---|---|---|
| Current | local equals target | nothing |
| New | absent locally, present in target | add |
| Unmodified | local equals base | replace, with backup |
| Customised | framework-managed, local differs from both | the manifest's conflict action as the default; the user decides |
| Customised hybrid | hybrid, local differs from both | the manifest's action: `skip` leaves it alone, `sibling` writes the new version beside it. For `CLAUDE.md` and `.claude/settings.json` a prepared merge is offered in place of the sibling. Never replaced by default |
| Retired | in base, gone from target, present locally | remove with backup if unmodified; the user decides if customised |
| Yours | inside a framework directory but in neither base nor target | never touched; listed so the user can see they were recognised |
| Project-owned | either manifest says so | never written. A starter file that is absent locally is offered, and created only if the user picks it |

## Local blocks

A project keeps a change to a framework-managed file by wrapping it in `<!-- local: reason -->` and `<!-- /local -->`. Before proposing to replace any file, look for such blocks in the local copy. A file whose only differences from the base are local blocks counts as unmodified. For each block, find where it goes in the new version by the line directly above it, or failing that the line directly below it, and place it only if that line occurs exactly once in the new version. A block that cannot be placed this way is not guessed at: the file moves to the customised group, and the plan shows the block and asks where it should go. Details are in `resolving-files.md`.

## Show the plan and wait

Present one plan: installed and target versions, packs before and after, the changelog's migration notes, and each group with its files and what will happen to them. For customised files give the size of the project's change and of the framework's change, and your suggested action. Show each prepared merge as a diff. List every local block and where it will be re-applied, and separately every one that could not be placed.

With `dry-run`, stop here and remove the temporary directory.

Otherwise wait for the user. They may accept the plan as shown or change the action for any file; the choices and what each does are in `resolving-files.md`. Ask about the customised and retired files in one message, not one prompt per file. Do not start applying until they have said go to the final plan.

If there is nothing to do, say so and name what was compared: the versions, the packs, and the number of files in each group.

## Apply

1. **Back up.** Copy every file that will be replaced, merged or removed to `.framework-backup/<path>@v<installed version>`, adding a UTC timestamp if that name exists. Confirm each copy matches its source. If any backup fails, stop; nothing has changed yet.
2. **Manifest.** Write the new `.framework-manifest.json`, carrying over entries the project added to its own.
3. **Files.** Copy new and replaced files from the flattened target, re-applying local blocks as planned. Apply the merges and the per-file decisions. Remove retired files that were approved for removal.
4. **Pack leftovers.** Append any missing pack `gitignore` lines to `.gitignore`, and add newly required packs to `.framework-packs.json`.
5. **Stamp.** Write `.framework-version` last, in the shape given in `resolving-files.md`. An interrupted run leaves the old version in place, and running the skill again picks up where it stopped: files already at the target classify as current.
6. **Check.** Run `node .claude/hooks/check-edit.mjs` over every skill and agent file that was written, and fix anything a re-applied local block broke.

## Report

Tell the user the versions, counts per group, every file kept at the project's version and why, every local block re-applied and every one that was not, where the backups are (they are never removed automatically), and the changelog's migration notes. If hooks or settings changed, they need to restart the session and check `/hooks`. Do not commit; suggest they review `git diff` and commit the update on its own.
