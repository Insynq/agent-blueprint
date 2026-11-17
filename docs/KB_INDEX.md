# Knowledge base index

Every knowledge base in the project, and when to read each. Read the one you need; do not load them all.

## Project state (this project owns these)

| File | Holds | Kept current by |
|---|---|---|
| `docs/APP_CONCEPT.md` | The problem, the users, what success looks like | `/kickoff` |
| `docs/SCOPE.md` | What is in the first version and what is deliberately out | `/kickoff`, `/orchestrate` |
| `docs/KB_1_Architecture.md` | How it is built, the service boundaries, the decisions | `/update-kb` |
| `docs/KB_8_Current_State.md` | The active phase and the last few | `/ship` |
| `docs/CHANGELOG.md` | One line per shipped change | `/ship` |
| `docs/LESSONS.md` | What was learned the hard way | `/ship` |
| `docs/smoke-tests-pending.md` | What still needs verifying | `/implement`, `/ship` |
| `docs/PARKING_LOT.md` | Deferred ideas and tangents | anyone |
| `docs/plans/<slug>/` | Spec, brainstorm, judge findings and gate records for each phase | `/plan`, `/plan-review`, `/implement` |

Numbers 2 to 7 and 9 onward are free for project knowledge bases, for example `KB_2_Data_Model.md`. Add a row here when you create one.

## Framework reference (the framework owns these)

| File | Holds |
|---|---|
| `docs/WORKFLOW.md` | How non-trivial work ships: the loop, the judge panel, the build pipeline, verification, autonomy |
| `docs/AUTHORING_SKILLS.md` | How to write skills, agents, rules and hook checks |
| `docs/SECRETS.md` | Where secrets live, how they are handled, what to do when one leaks |

## Pack reference

Each installed pack adds its own reference documents and lists them in its section of `CLAUDE.md`. Installed packs are recorded in `.framework-packs.json`.

## Keeping documents honest

- A knowledge base holds rules and how to look facts up. It does not hold a copy of facts that live in a system of record, because the copy goes stale and then gets defended.
- A completed phase collapses to two or three lines. The detail is in git.
- A generated document is regenerated, never edited by hand.
