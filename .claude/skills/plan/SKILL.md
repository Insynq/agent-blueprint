---
name: plan
description: Use when investigation or brainstorming is finished and the findings need to become a spec someone can build from. To find the gaps in a spec that already exists, use /plan-review. For a bug fix or a one-file change, skip the spec and make the change.
argument-hint: "<task or phase slug> [findings, or a path to them]"
---

# Plan

Turn findings into `docs/plans/<slug>/spec.md`: a document precise enough that an implementer with no other context builds the right thing, and a judge can check every claim in it against the code. You are done when the draft is written, every anchor in it has been opened, and every decision is either made or listed as a question for the user.

Arguments: $ARGUMENTS names the task or an existing phase slug, optionally followed by findings or a path to them. If no findings are given, use `docs/plans/<slug>/brainstorm.md` and the recent conversation. If there are none at all, say so and suggest `/investigate` or `/brainstorm` first, because a spec written without findings is a guess with headings.

Write the spec in this session. You hold the brainstorm and the user's answers, and a subagent would have to be told all of it. Dispatch read-only subagents only to read areas of the codebase you have not yet seen, and open any anchor they report before you put it in the spec.

The skeleton is in `spec-template.md` in this folder. Read it when you start writing. Drop sections that do not apply, and leave the status line as draft: only `/plan-review` writes the LOCKED header.

If `docs/plans/<slug>/spec.md` already carries a LOCKED header, do not edit it in place. A change to a locked design removes the header and goes back through `/plan-review`, so say that and confirm with the user before touching it.

## What makes the spec good

**Anchors are real.** Every file, function, field and named value the spec leans on is cited as `file:line` that you opened in this session. A number is written next to the command that produced it, so the grounder can re-run it. A count of sites to change is a hypothesis: list the sites, and mark any that look the same but mean something different in context, because sweeping those does damage at a site that was correct before.

**Scope-outs are earned.** For every "out of scope", "existing behaviour preserved" or "can be verified later", say which kind it is. Earned means you confirmed it and can cite how. Assumed means you could not confirm it and are building on it anyway. An assumed one becomes a named dependency with a step that verifies it. If a question keeps being rephrased into something softer because the hard form resists an answer, that resistance is the finding; widen the investigation instead of shrinking the question.

**Prior work is named.** If this replaces or builds on a pull request, a branch or code already in the repo, link each one and say where the current implementation lives before describing the replacement. A rewrite designed without reading what it replaces loses the edge cases that code already handles.

**The smallest change that solves it.** Reuse what is there. One normalised type beats two types and a translator between them. Do not design for requirements nobody has stated.

**The whole of each touched thing is read.** When the spec writes to an existing data model, read every constraint, permission rule and trigger on it, not only the fields the feature mentions. When a state change should cause a side effect (a notification, a webhook, an audit entry), find every place that writes that state. The automated path that writes the same status as the manual one is the one that gets missed.

**Decisions are closed.** Record each fork in the `Decision | Choice | Reasoning | Date` table with the evidence that grounds it. Make the ones that are yours to make. Scope, product, money and legal questions go to the user, collected in one list. A fork that shapes later work is decided now: a "decide early" label is not a decision, and deferred forks ship as whatever the default happened to be.

**Batches are declared.** Say which batch owns which files, what each depends on, and the landing order for any that share files or build on each other. `/implement` reads the batches from the spec and does not invent them. Keep anything timestamped or sequentially numbered in one batch where you can, since parallel worktrees mint colliding values.

## Steps, observations and runtime forks

Write each step with its file, the change and the reason. For any step with a failure mode that is not obvious, add:

- **Expected observation**: what you can point at if the step worked (an output, a row, a rendered state). The edit applying is not the observation.
- **Most likely failure**: the one probable way it goes wrong, what that looks like, and the counter-move.

A spec may keep a fork open for build time only when three things hold: the trigger is something observable, both routes are fully designed in the spec, and the trigger can be evaluated without first making the choice. That defers which route runs and never the design of a route. "Use A or B, whichever fits" fails the test and is an open decision.

For work of any size, list the abort conditions in two groups: blocked (continuing would invent a required input, change the wrong target, or do something irreversible; stop and report) and friction (retries, noisy output, transient errors; push through). Naming the second group stops an implementer from halting on noise.

## Behaviour claims need smoke rows

A step whose success depends on something happening at run time (a job firing, a message sending, a write landing, a screen showing the right thing) cannot be closed by the diff landing. Give each such claim a planned row for `docs/smoke-tests-pending.md` with a stable id and a lane from `docs/WORKFLOW.md`, and mark it `live-required` when it crosses a service boundary. Also give a row to:

- every one-off operation the feature's first live proof depends on (a backfill, a seed, a configuration change, a secret), with a note on ordering. A precondition named only in prose is how a phase ships green and does nothing.
- anything a user sees, as a `visual` row. No gate in the pipeline can see a screen.

A spec for behaviour-changing work with no smoke rows needs one line saying why nothing in it requires live validation.

## Before you hand it over

Check your own draft mechanically, because these are the errors that otherwise cost a judge round: re-run the command behind every number, re-open every `file:line`, and walk any state machine the spec touches from each state it can be in.

Then report the path of the spec, the decisions you made and why, the questions that need the user (if any, this is the one place the skill waits), and every assumed scope-out. The next step is `/plan-review`, which locks the spec. A draft is not implementable and `/implement` will refuse it.
