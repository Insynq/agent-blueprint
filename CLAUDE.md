# Project: [TODO: name]

> Unpopulated until you run `/preflight` and then `/kickoff` (new project) or `/adopt` (existing code). Those skills fill the `[TODO]` markers in place.
>
> Keep this file short (a hook rejects it past 40,000 characters). It loads into every session, so it holds only what every session needs: what the project is, how to run it, the rules that are easy to get wrong, and where everything else lives. History, phase detail and stack reference go in `docs/`.

## Environment
[TODO: written by /preflight. Agent, OS, shell.]

## Overview
[TODO: what this is, who it is for, in two or three sentences.]

## Stack
[TODO: runtime, language, data store, hosting, model routing. One line each.]

## Layout
[TODO: the top-level directories and what each holds. Name the one place each kind of thing lives.]

One repository holds every surface of the product: clients, backend, data definitions, and any agent. Split something out only when it deploys on a wholly separate schedule to a separate audience, such as a marketing site.

## Commands
[TODO: the exact commands. Skills read them from here.]
- Install:
- Build:
- Test:
- Typecheck:
- Lint:
- Run locally:
- Release:
- Landing: [TODO: pull request, or direct to the default branch]
- Push to the default branch deploys: [TODO: yes or no. If yes, anything that changes behaviour lands by pull request, whatever the line above says.]

## Current phase
[TODO: one paragraph. Detail lives in `docs/KB_8_Current_State.md`.]

## Live invariants
Facts that must be re-checked before touching the thing they guard. One line each, with a pointer to where the full explanation lives.

[TODO: none yet. Add an entry when a mistake here would cost money, data or trust.]

## Working agreements

**Autonomy: grill first, then run.** Before a long run, ask every open question in one go and record the answers in the spec. After the user says go, work through the agreed scope without asking again: commit, push branches, open and merge pull requests in order, and release to the environments that were named. Stop only for a decision the grilling did not cover, a spec premise that turns out false in a way that changes what gets built, an action that spends money or contacts real people outside the agreed scope, or something destructive beyond normal landing. Otherwise choose the sensible default, note it, and continue. Answering design questions is not a go.

**Evidence.** Never record a result you did not observe. These words have fixed meanings here:

| Term | Means |
|---|---|
| done | Built, reviewed, and its smokes run or deferred with an owner and a date. Not "code written". |
| clean | No new problems against the recorded baseline. Not zero problems. |
| verified | Observed by running it or probing it. Never inferred from reading code. |
| trace-verified | The code path was read end to end but not run. Weaker than verified; never closes a smoke. |
| eyeballed | A person looked at the real interface. |
| live-required | Only a run against the live service closes it. |
| production-ready | Released and live-smoked at its service boundaries. Not merely merged. |
| go-with-nits | Approved. Every nit is fixed or parked with a pointer, never dropped. |

A claim carried forward from somewhere else is tagged `[verified: how]` if you checked it yourself, or `[relayed: source]` if you did not.

**Secrets.** Never print a secret to check it, and never paste one into chat. Pipe it between tools. Names go in `.env.example`, values in [TODO: the secrets manager, or a local `.env`], one set per environment. `docs/SECRETS.md` has the rest.

**Working tree.** One writer per checkout. Use a separate worktree for each parallel line of work, under `.claude/worktrees/`, and ground on the remote default branch, not the local one. Remove a worktree when its branch lands, without asking: `node _dev/tools/worktrees.mjs --prune`.

[TODO: /kickoff adds the user's communication preferences here.]

## Patterns
Conventions that have been established in this project. Add one when it is settled, so later sessions inherit it.

- A spec records what was decided and why; a pull request is how a change lands. Docs go straight in. See `docs/WORKFLOW.md`, "Spec or pull request".
- Specs live in `docs/plans/<slug>/spec.md` and are implementable only with a `Status: LOCKED` header.
- Decisions are recorded as `Decision | Choice | Reasoning | Date`.
- Tangents go to `docs/PARKING_LOT.md`.

## Reference documents
Read the one you need, when you need it.

- `docs/WORKFLOW.md`: how non-trivial work ships. Entry point `/orchestrate`.
- `docs/KB_INDEX.md`: index of every knowledge base in the project.
- `docs/APP_CONCEPT.md`, `docs/SCOPE.md`: what is being built and what is out of scope.
- `docs/KB_1_Architecture.md`: architecture and the decisions behind it.
- `docs/KB_8_Current_State.md`: the active phase.
- `docs/smoke-tests-pending.md`: the only list of what still needs verifying. Point to it; do not restate it.
- `docs/LESSONS.md`: what was learned the hard way. Read before debugging or working in an unfamiliar area.
- `docs/PARKING_LOT.md`: deferred ideas and tangents.
- `docs/SECRETS.md`: where secrets live and what to do when one leaks.
- `docs/AUTHORING_SKILLS.md`: how to write skills, agents, rules and hook checks.

## Skills
Skills live in `.claude/skills/`, subagent roles in `.claude/agents/`, path-scoped rules in `.claude/rules/`, and mechanical checks in `.claude/hooks/`.

| Skill | Use it when |
|---|---|
| `/preflight` | First session on a new machine or clone. |
| `/kickoff` | Starting a new project. |
| `/adopt` | Bringing the framework into existing code. |
| `/orchestrate` | Running a phase of work end to end. |
| `/brainstorm` | You need options and a recommendation grounded in the codebase. |
| `/research` | The answer is on the web, not in the repo. |
| `/investigate` | You need to know how something works or where it is used. |
| `/plan` | Turning findings into a spec. |
| `/plan-review` | A spec draft needs its gaps found, then locking. |
| `/stress-test` | A spec or change set needs an adversarial panel. |
| `/implement` | Building from a locked spec. |
| `/debug` | Something is broken and you need the root cause. |
| `/gen-test` | Adding tests that are proven able to fail. |
| `/audit-code` | Reviewing code or a plan for defects and simpler alternatives. |
| `/audit-full` | Running every audit the project has. |
| `/unify` | Several things do the same job and should be one. |
| `/triage` | A backlog of stale branches, pull requests or items needs sorting. |
| `/ship` | Work is built and you are landing it. |
| `/update-kb` | Docs have drifted from the code. |
| `/update-framework` | Pulling a newer version of the framework. |

<!-- packs:start -->
<!-- packs:end -->

## Do not
Hard constraints. Each of these has caused real damage and none produces an error when broken.

- Do not record a negative ("no match", "not present") in durable state without exhausting the source of truth and citing what was checked. Every later run inherits it and defends it.
- Do not copy facts from a system of record into memory or docs. Store the rule and how to query it. Copies diverge silently.
- Do not embed a copy of a canonical file inside a skill. Edit the real file.
- Do not keep a verification ledger in a gitignored file. It will not travel with the work.

[TODO: project-specific constraints accumulate here.]
