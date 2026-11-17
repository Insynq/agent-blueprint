---
name: brainstorm
description: Use when the approach to a feature, problem or architectural decision is not obvious and you need options grounded in the codebase, a recommendation, and the questions the user must answer before a spec is written. For how existing code works, use /investigate. For answers that live on the web, use /research.
argument-hint: "<feature, problem or decision>"
---

# Brainstorm

Topic: $ARGUMENTS

Produce two or three real ways to do this, grounded in the code as it is, with one recommended, and the full list of questions the user has to answer before a spec can be written. This is phase 2 of `docs/WORKFLOW.md`, and the question list is its most important output: every question asked here is one that does not interrupt the build three hours in.

Done means the user can read the recommendation in under a minute, each option cites real files, and no question is left that would later stop the work.

This skill designs. It does not write code or a spec.

## Ground it first

Do the research before you form options. Options written first get defended by the research instead of tested by it.

- **Anchor on the artifact.** If the topic names something specific (a failing output, a transcript, a data row, an earlier decision, something the user said), open it and quote the relevant lines before anything else. Work from what it says, not from the topic's paraphrase of it. If there is no such artifact, say the brainstorm is exploratory.
- **Read what already frames the topic**: `CLAUDE.md` (stack, patterns, live invariants, the Do not list), `docs/SCOPE.md`, `docs/KB_1_Architecture.md`, `docs/LESSONS.md`, and any existing plan under `docs/plans/` that touches it.
- **Read `docs/PARKING_LOT.md`.** A parked item often already frames, constrains or half-answers the topic. Name any overlap in the output instead of rediscovering it.
- **Explore the code.** Find what already exists in this area, the closest analogous feature and how it was built, the contracts other code depends on (interfaces, schemas, stored data, anything with callers), the access and permission rules that apply, and anything unfinished that the topic depends on.
- **If the project keeps `docs/BRAINSTORM_CHECKLIST.md`**, run the recommended option against it. It lists the project's known interaction areas, and each hit becomes scope or a question.

If the thing is already built, say so at once and stop there.

For a wide sweep, dispatch the `explorer` agent. Brief it with the topic, the directories to cover, and the report you want back: related code with `file:line`, patterns in use, constraints, the closest analogue, and blockers. Its report is a claim. Before an option rests on "builds on existing X", open X yourself and confirm it behaves the way the option needs. "I found no evidence it is broken" is not "I confirmed it works"; an option on a foundation you could not check says so.

## Shape the options

- **Different in kind.** Two options that differ only in naming or file layout are one option. If there is honestly only one good approach, say so and give the runner-up with the reason it loses.
- **Scoped.** Name the files each option creates and changes. When an option changes a contract, find every consumer of that contract and count them in its scope, because the consumers are where the real cost is.
- **Honest.** Each option states its hardest part. Carry hedges through unchanged: "appears to handle X" in your notes stays "appears to" in the option. Mark what you read yourself as `[verified: how]` and what a subagent or document told you as `[relayed: source]`.
- **Decide the architecture yourself.** The recommendation makes the technical call and gives the reason. A fork you cannot resolve usually means the framing is wrong, so re-examine that before passing the fork to the user.

## The questions

Collect every decision that belongs to the user: scope edges, product behaviour, wording, anything touching money or legal exposure, what done means, landing order, and which environments. `docs/WORKFLOW.md` (Autonomy) explains why these are asked in one go.

- Ask only what the code and docs cannot answer. If you can look it up, look it up.
- Give each question the default you will take if the user has no preference, and what changes if they choose otherwise. A question without a default makes the user do your thinking.
- Order them by how much of the design each one moves.
- Technical choices are not questions. State them as decisions in the recommendation, where the user can overrule them.

## Output

Lead with the recommendation. Keep each option to a short paragraph plus the fixed lines, so the whole thing can be scanned.

```markdown
# Brainstorm: <topic>

## Recommendation: <option name>
<Two or three sentences: why this one, resting on evidence from the code.>

## Questions for you
1. <question> Default: <what I will do>. Changes: <what a different answer alters>.

## Context
<What exists today, with file:line. Parking-lot overlap. Only the constraints that bear on the choice.>

## Option A: <name> (recommended)
<One paragraph: what it does and how.>
Builds on: <files, each tagged verified or relayed>
Creates: <files>  Changes: <files>  Consumers to update: <files>
Effect for the user: <what they will notice>
Hardest part: <one sentence>

## Option B: <name>
<Same shape.>

## Pick differently if
- B: <the specific circumstance in which B wins>

## Not checked
<Foundations you could not confirm, areas you did not explore.>
```

When run inside a phase (a `docs/plans/<slug>/` folder exists for this work, or `/orchestrate` gave you a slug), write this to `docs/plans/<slug>/brainstorm.md` and show the recommendation and the questions in the conversation. Run on its own, give the whole output in the conversation.

Then stop and wait for the answers. Record them in `brainstorm.md` when there is one, so `/plan` can carry them into the spec. Answers settle the design; they are not a go to build.
