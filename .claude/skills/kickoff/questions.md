# Kickoff questions

Three core rounds. Send each round as one numbered message. Skip what the user has already told you and reword the rest around what you know. Pack questions come afterwards, from `docs/kickoff/*.md`.

Each round notes where its answers end up, so you can tell whether a marker in the docs is covered. The headings in the files on disk are the authority; if they differ from the names here, follow the files.

## Round 1: the problem and the shape

1. What problem are you solving? Describe it the way someone who has it would, not as a solution.
2. Who has it? Their role, and what they are doing when they hit it.
3. What do they do about it today, and where does that fall short?
4. In one sentence, what will you build to address it?
5. What is it: a web or mobile product, an agent, a product with an agent inside it, or something else (library, CLI, pipeline)?
6. If there is an agent: does it run on a hosted gateway that stays up, or as Claude Code running scripts, on demand or on a schedule?
7. Is it just you, or a team? If a team, who else and how experienced are they with this kind of project?
8. Why now?

Feeds: the problem, solution, users and timing sections of `docs/APP_CONCEPT.md`; Overview in `CLAUDE.md`; the pack decision.

## Round 2: the first version

1. Walk through the one path that matters most, start to finish. For a product, what a user does. For an agent, what triggers it, what it does, and what lands at the end. For a library or CLI, the main call and its result.
2. Are there different kinds of users or consumers who use it differently? Who, and what does each do?
3. What is the single thing it must do well to be worth building?
4. What does done look like for the first version? What would have to be true for you to put it in front of real use?
5. What is deliberately not in the first version? A list of things you have decided to defer, each with a word on why.
6. What do you not know yet that could change the plan?
7. Is there a deadline or outside pressure?

Feeds: users and success criteria in `docs/APP_CONCEPT.md`; all of `docs/SCOPE.md`; Current phase in `CLAUDE.md` and the active phase in `docs/KB_8_Current_State.md`.

## Round 3: foundation and working style

Technical. Say "suggest" for any of these and you will get a recommendation with its trade-off.

1. What is the stack: language and runtime, framework, data store, and any model or AI provider?
2. Where will it run, and how does a change get from a merged branch to live? In particular, does pushing to the default branch deploy by itself? If it does, behaviour changes will land by pull request so that you choose when they go live.
3. Which outside services does it depend on from day one?
4. Which secrets and configuration values will it need? Names only, never values.
5. Is there anything where a mistake would cost money, lose data or break someone's trust? Payments, deletions, messages to real people, shared credentials.
6. Does any code or tooling exist already? If so, what are the commands to install, build, test and run it?

Working style.

7. How do you want to be spoken to: brief and direct, or with the reasoning laid out?
8. The default here is that questions are asked up front and then the work runs without interruption until it is finished. Do you want more check-ins than that, or fewer?
9. What must always be asked before it is done, if anything?
10. When speed and quality pull apart, which way should the work lean?
11. Any approaches, libraries or habits you want avoided?

Feeds: Stack, Layout, Commands, Live invariants and the preferences paragraph in `CLAUDE.md`; the stack, deployment and decisions sections of `docs/KB_1_Architecture.md`.

## What a pack's kickoff file should contain

For pack authors. A file at `docs/kickoff/<pack>.md` holds one round of questions specific to that pack, and for each answer the file and heading where it is recorded. It should not repeat the core rounds, and it should name any pack-owned file that kickoff is expected to fill.
