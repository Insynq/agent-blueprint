---
name: kickoff
description: Use when starting a new project that has little or no code yet and its CLAUDE.md and docs still hold [TODO] markers. For a repository that already has working code, use /adopt.
disable-model-invocation: true
---

# Kickoff

A discovery conversation that turns an idea into the project's foundation. You are done when the user has confirmed your summary of what is being built, the right packs are installed, and the `[TODO]` markers in `CLAUDE.md`, `docs/APP_CONCEPT.md`, `docs/SCOPE.md`, `docs/KB_1_Architecture.md` and `docs/KB_8_Current_State.md` have been replaced in place with what was learned, or deliberately left with a note saying what is still unknown.

Kickoff writes documents only. It does not scaffold code, install dependencies or create the first feature, because every one of those depends on answers that are not settled until the summary is confirmed.

## Before the first question

Read `CLAUDE.md`, the four docs above, `.framework-packs.json` and every file in `docs/kickoff/`. Then check three things:

- **There is already real code here.** If the repository holds a working codebase beyond the framework's own files, say that `/adopt` is the fit, since it reads the code instead of asking, and continue only if the user wants kickoff anyway.
- **Kickoff has run before.** If the title in `CLAUDE.md` is no longer a `[TODO]`, treat this as a top-up: ask only about what is still marked `[TODO]`, and ask before changing anything already filled in.
- **The Environment block is still a `[TODO]`.** That block belongs to `/preflight`. Leave it alone and tell the user to run `/preflight` afterwards.

Open by telling the user, in two or three sentences, what is about to happen: a few rounds of questions, a summary for them to correct, then the files get filled in. If they arrive with a written brief, read it first and ask only about what it leaves open.

## How to ask

The questions are in `questions.md` in this folder. Ask them in rounds: one message per round, numbered, so the user can answer the lot in one reply. Asking one question at a time made the old kickoff slow and made users disengage before the questions that mattered.

- Drop any question the user has already answered, and reword the rest in terms of what they have told you.
- After each round, restate what you understood in a few lines and carry on. Ask a follow-up only where an answer was vague enough to change what gets built.
- The problem, who has it, and what the first version must do are the user's to decide. If they hand those back ("you decide", "whatever is best"), do not fill the gap with an invention: say that these are the answers every later skill builds on, and ask for a rough version. A rough answer is enough.
- Technical choices are different. When the user is unsure about stack, hosting or tooling, recommend one option with its trade-off and let them accept it.
- If the first version contains more than two or three distinct workflows, ask which single one would make it a success if it worked perfectly, and move the rest to out of scope.
- If the idea is not formed enough to answer round two, stop after round one, fill in what is known, and leave the rest marked.

## Shape and packs

Round one establishes the shape of the project, because the shape decides which packs it needs and which later questions apply:

| Shape | Pack |
|---|---|
| A web or mobile product with a database | `app` |
| An agent that is Claude Code driving deterministic scripts, including headless scheduled runs | `claude-agent` |
| A product with an agent inside it | `app` plus the agent pack that matches how the agent runs |
| Any shape, where the owner wants a local page for decisions and manual tests | add `devdash` |
| A library, CLI or anything else | none; the core is enough |

Compare what fits with what `.framework-packs.json` records. If a needed pack is missing, add it before going further, since the pack brings its own kickoff questions:

1. Find a local clone of the blueprint: a path the user gives, or a sibling directory that contains `bin/pack.js` and `packs/`. Ask once if you cannot find one.
2. With a clone, run `node <clone>/bin/pack.js add <name> --target <absolute path of this project>`. Show the user its output. Files it reports as kept differ from the pack's version and were left alone; mention them.
3. Without a clone, give the user that exact command to run later, and the alternative that needs no clone: add the name to the `packs` array in `.framework-packs.json` and run `/update-framework`. Carry on with core discovery and note that the pack's questions are still owed.

Adding a pack rewrites `.claude/settings.json` and may add hooks, which are only discovered at session start. Tell the user to restart the session once kickoff is finished. Do not remove a pack that is installed but does not fit; say so and let the user decide.

## Pack questions

After the core rounds, re-list `docs/kickoff/` and work through every file there, one round per file. Each pack ships its own, such as `docs/kickoff/app.md`, holding its questions and where the answers go. Follow the file: the pack knows its stack and this skill does not. If a pack is installed and has no file there, say so in the final report so the gap is visible.

## Confirm before writing

Stop here. Give the user a summary of four or five short paragraphs: the problem and who has it, what is being built and its shape, what the first version includes and excludes, the technical foundation, and how they want to work. Ask whether it is right. Write nothing until they say it is; fold in corrections and show the changed part again.

## Filling the files

Edit the checked-in files. Never write one of them out whole, and never rebuild one from a remembered layout: the files on disk are the current template, they change between framework versions, and a rewrite from memory silently deletes whatever was added since. Work marker by marker.

- Replace each `[TODO …]` marker with content under the heading it sits beneath. The marker's own text says what belongs there. Keep the headings, their order and any text around the marker.
- Remove the "unpopulated" notice at the top of a file once the file is filled.
- Where the answer is "nothing", write that ("None identified", "Single user type"). Where it is unknown, leave a marker that names the gap and who closes it, `[TODO: hosting, decided after the spike]`, and list it under the known unknowns in `docs/SCOPE.md`.
- Record every decision made during discovery in the decisions table in `docs/KB_1_Architecture.md`, with its reasoning and today's date.
- Set the active phase in `docs/KB_8_Current_State.md` to the first phase, not started.

`CLAUDE.md` loads into every session, so it gets the least text:

- **Title, Overview, Stack, Layout, Current phase.** One to three lines per marker. Anything longer goes in `docs/KB_1_Architecture.md` and `CLAUDE.md` keeps the pointer it already has. For Layout in an empty repository, give the planned top-level directories and say they are planned.
- **Commands.** Other skills read these and run them, so each line must be a command that works in this checkout today. Try each one before writing it down. Where nothing exists yet, write `none yet` and, if the stack makes it predictable, the expected command in brackets. An invented command that fails is worse than an honest gap, because `/implement` and `/ship` will run it and report the failure as the project's.
- **Working agreements.** Replace the trailing preferences marker with a short paragraph: how the user wants to be spoken to, what must always be asked first, which way to lean when speed and quality pull apart, and approaches to avoid. If they want more or less autonomy than the paragraph above it grants, state their rule here as an explicit override. If they use one of the evidence terms differently from the table, tell them the table is what the skills follow and record their word under a different name.
- **Live invariants and Do not.** Add an entry only if discovery surfaced something where a mistake costs money, data or trust. Otherwise leave the marker.
- **Everything else stays as it is.** Environment, Patterns, Reference documents, the Skills table and anything between the pack markers belong to the framework, to `/preflight` or to a pack. A pack section with its own markers is filled the way that pack's kickoff file says.

Preferences live in `CLAUDE.md` and the concept lives in `docs/APP_CONCEPT.md`. Do not also copy them into `.claude/memory/`, where the copy would drift from the file that gets maintained.

## Check and report

Search the five files for `[TODO`. Every remaining marker should be one you left on purpose. Re-read `CLAUDE.md` and confirm that the sections you were not meant to touch are unchanged and that the file has not grown beyond the markers you filled.

Then tell the user: which files were filled, which markers remain and why, which packs are installed and whether any was added in this session, any pack questions still owed, and whether a restart or `/preflight` is needed. Suggest `/brainstorm` or `/orchestrate` for the first phase, and stop.
