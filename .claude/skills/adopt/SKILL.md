---
name: adopt
description: Use when the framework has just been installed into a repository that already has working code, or already has its own CLAUDE.md and docs, and they need to be reconciled with the framework's. For a new project with no code, use /kickoff. To pull a newer framework version, use /update-framework.
argument-hint: "[minimal]"
disable-model-invocation: true
---

# Adopt

Fit the framework to a codebase that existed before it. You are done when the project docs describe the code as it is, with each statement traceable to something you read; the project's existing docs have been checked for staleness and each has a recorded decision; `CLAUDE.md` follows the framework's structure and still holds everything the project had written in it; and no `.framework` sibling file is left unresolved.

If $ARGUMENTS contains `minimal`, do only the `CLAUDE.md` merge and the sibling sweep. That is the least a project needs for the other skills to work, since they read commands and references from `CLAUDE.md`.

Adopt is safe to run again. It fills what is still unfilled, re-audits, and never repeats a decision recorded in an earlier `docs/adopt-audit-*.md` without asking.

## Check the starting state

Nothing is written in this part.

- **Not installed.** No `.framework-version` means the installer has not run. Give the user the command, `npx @insynq/agent-blueprint init --packs <names>`, and stop.
- **A 0.x layout.** If `.framework-version` is below 1.0.0, or the project still has the framework's old command files in `.claude/commands/` or `docs/MULTI_AGENT_WORKFLOW.md`, the project is already on an older framework and needs migrating, not adopting. Read `.claude/skills/update-framework/migrating-from-0.x.md` and follow it with the user's agreement. It replaces the old files and restructures `CLAUDE.md`. Afterwards, continue here with the doc audit only, treating the project docs as already populated.
- **Uncommitted changes.** Run `git status --porcelain`. If the tree is dirty, say that adopt's edits will be mixed into those changes and ask whether to continue. Committing first makes the whole adoption one reviewable diff.
- **More than one project in the repository.** If there are several independent roots, ask which one this run covers. The framework expects one repository to hold every surface of one product, and it will describe a monorepo of unrelated projects badly.

## Observe

Read the code before asking the user anything it can answer. Start from the files that state facts outright: dependency manifests and lockfiles, build and task files, CI workflows, deployment configuration, schema and migration directories, the top-level directory tree, the README, the existing `CLAUDE.md` and everything under `docs/`. Read environment variable names from example files only. Never open a real `.env` file or print a value.

In a large repository, dispatch read-only subagents in one message, one per area, each told which directories to read and to return findings as `claim, file:line`. Their reports are claims: open the cited line yourself for anything you are about to write into a doc.

Every statement that goes into a doc belongs to one of three classes, and the doc must show which:

- **Observed.** You read it. Cite the file, for example "PostgreSQL 16 (`docker-compose.yml`)".
- **Inferred.** The code suggests it and nothing states it. Write it with the marker `(inferred from <what>)` so a later reader knows to check before relying on it.
- **Unknown.** Not in the repository. Ask the user, or leave `[TODO: <what is needed>]`. Do not fill it with something plausible.

A negative is a claim too. "No tests", "no CI" or "not deployed anywhere" goes in only with what you searched, because a wrong negative is inherited by every later session.

**Commands.** Take install, build, test, typecheck, lint and run commands from the manifests, then run the ones that are safe to run and record what happened: verified (ran, passed), failing (ran, failed, with the first error, since that is the baseline later work is measured against), or not run and why. Never run a release, deploy or migration command to see whether it works.

**Shape and packs.** Work out the project's shape from the code: a web or mobile product with a database fits `app`, an agent that is Claude Code driving scripts fits `claude-agent`, and `devdash` fits any project whose owner wants a local page for decisions and manual tests. Compare with `.framework-packs.json`. A missing pack is added with `node <blueprint clone>/bin/pack.js add <name> --target <absolute project path>` if a local clone is reachable; otherwise give the user that command, or have them add the name to `.framework-packs.json` and run `/update-framework`. Then read every file in `docs/kickoff/`: each pack's file lists what it needs to know. Answer those from the code where you can and collect the rest for the user.

**What the code cannot tell you.** The problem, who it is for, what the current version is meant to include and what is deliberately excluded are not derivable from source. Ask for them in one message, using rounds 1 and 2 of `.claude/skills/kickoff/questions.md` cut down to what the README and docs have not already answered, together with any pack questions still open. If the user would rather not answer now, those sections keep their markers.

## Show the plan and wait

Before changing anything, give the user:

- the shape and packs you found, and any pack to add;
- a draft of what will go into each project doc, with the observed, inferred and unknown items distinguishable;
- the commands and their status;
- the list of existing docs you propose to audit;
- how `CLAUDE.md` will be handled: filled in place, merged section by section, or restructured from a 0.x layout;
- every `.framework` sibling found.

Wait for their corrections and their go. This is the main stop. After it, the only further stops are the doc decisions and the `CLAUDE.md` approval described below.

## Write

Back up before the first write: copy every file you are about to change to `.framework-backup/<path>@pre-adopt`, adding a timestamp if that name is taken. Then:

1. **Project docs.** Fill `docs/KB_1_Architecture.md` and `docs/KB_8_Current_State.md`, and `docs/APP_CONCEPT.md` and `docs/SCOPE.md` if the user answered, by replacing `[TODO]` markers in the files on disk. Do not write a file out whole or rebuild it from a remembered layout, because the template on disk is the current one. If the project already had a file of the same name with its own content, that content stays; offer to add the template's missing headings to it and nothing more.
2. **Existing docs.** Follow `auditing-docs.md` in this folder. It ends with one decision per doc from the user.
3. **`CLAUDE.md`.** Follow `merging-claude-md.md` in this folder. It ends with the user approving the merged file and a check that no line of the original was lost unaccounted.
4. **Sibling sweep.** Where the installer found a project file in its way it wrote the framework's version beside it as `<name>.framework`. List every such file. For each, merge what is useful into the project's file, or confirm the project's file needs nothing from it, then remove the sibling. For `.claude/settings.json.framework`, the project needs the framework's hooks and deny rules added to its own settings; keep every permission the project already had.
5. **Record.** Write `docs/adopt-audit-YYYY-MM-DD.md` in the format given in `auditing-docs.md`.

## Report

Tell the user what was written and where the backups are, the count of observed, inferred and unknown statements with the unknowns listed, each command and its status, the doc decisions, anything from the original `CLAUDE.md` that was moved and where to, and any sibling left unresolved. If a pack was added, they need to restart the session so its hooks load. If the Environment block is still a marker, they need `/preflight`.

If the audit found no project docs, or no statement had to be marked inferred, say so and name the directories and files you inspected, so that an empty result is distinguishable from a skipped step.
