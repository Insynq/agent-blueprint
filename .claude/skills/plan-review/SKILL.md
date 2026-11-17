---
name: plan-review
description: Use when a spec or plan draft exists and you need its gaps, unresolved decisions and risks found before anyone builds from it, and the spec locked once it holds up. To write the spec in the first place, use /plan. To run only the adversarial panel over a spec or a diff, use /stress-test.
argument-hint: "<path to spec>"
---

# Plan review

Find what the spec gets wrong or leaves undecided while fixing it still costs an edit, then lock it. The review is done in one of two states: the spec carries `> **Status: LOCKED YYYY-MM-DD**` because every check below passed, or it does not and you have listed exactly what is still open. There is no partial lock.

Spec: $ARGUMENTS. If no path is given, use the most recent `docs/plans/*/spec.md` without a LOCKED header and say which one you picked.

This skill edits the spec and nothing else. It does not implement, and a lock is not permission to build: that is the user's go, a separate step in `docs/WORKFLOW.md`.

## 1. Ground the spec

Dispatch the `grounder` agent with the spec path and ask it to check every load-bearing claim: each `file:line` anchor, each count, each named value, and the site list of any sweep. While it runs, read the spec yourself and walk any state machine it touches.

When the report comes back, open every anchor it marks false or moved before you change the spec, and correct the spec to what the source says. A grounder that reports no problems must have listed what it checked; if the list is thin against the spec's claims, send it back with the claims it skipped.

## 2. Find the gaps

Read the code the spec touches. For a spec that spans several areas, dispatch read-only subagents in one message, one per area, each asked to report what exists with `file:line` and quoted lines, and wait for all of them. Decide the areas from the spec, not from a fixed list of layers.

Look for these, which are the gaps that have got through before:

- **Assumed scope-outs.** Each "out of scope", "existing behaviour preserved" or "verify later" is either earned (confirmed, with a citation) or assumed. Verify the assumed ones now or list them as gaps. "I could not find it" describes your search; ask what that search would miss before treating it as absence. If the user has said something worked before, treat it as broken until you have shown otherwise.
- **Half-read models.** Where the spec writes to an existing data model for a new purpose, read the whole definition: every constraint, permission rule, uniqueness rule and trigger on it. Checking the one constraint the spec mentions and missing its neighbour is the usual failure.
- **Side effects with one caller.** For each notification, webhook, audit entry or other effect tied to a state change, find every place that writes that state. An effect wired to the manual path and not to the automated one never fires for half the cases, and the happy-path test does not notice.
- **Consumers not updated.** A changed shape, name or contract with a reader the spec does not mention. Where one piece of code names something another piece owns (a column, a payload key, an event), check the name against the owner's definition.
- **Unprobed third parties.** A design that depends on an external API behaving a certain way, supported only by documentation or by stubs. Recommend a probe against the real service before lock.
- **Behaviour with no smoke row.** A run-time claim, a user-facing surface, or a one-off precondition (backfill, seed, configuration change) that no planned smoke row covers.
- **Edges and order.** Empty and boundary data, concurrent writers, interruption mid-flow, steps that cannot be undone once landed, and batches whose declared order does not match their dependencies.
- **Open decisions.** Anywhere the spec leaves a choice to the implementer or picks one of several valid approaches without a reason.

## 3. Resolve

Fix what is yours to fix directly in the spec: wrong anchors, missing steps, missing smoke rows, missing consumers. Record each change so the user can see what moved.

Collect what needs the user into one grouped list, each item with the options and your recommendation: scope, product, money and legal decisions, and any risk you think they should knowingly accept. This is the one place the skill waits. Write the answers into the spec's decisions table; decisions that will outlast the phase also go to `docs/KB_1_Architecture.md`.

If you found nothing, say so and name what you inspected: which files, which models, which state writers.

## 4. Panel

A spec locks only after the judge panel in `docs/WORKFLOW.md` passes it as it now stands. If `docs/plans/<slug>/` has no passing round for the current text, run `/stress-test` on the spec. Use the full two-judge panel for work that touches data, money, authorisation or several subsystems, and one judge for one round on lighter work; say which you chose and why. If round three fails or the judges split, stop and take it to the user with both positions quoted. Do not lock.

## 5. Lockdown checks

Run every check and report each as pass or fail with the lines that decided it.

**No unresolved fork.** Search the spec for markers of an open choice: `TODO`, `TBD`, "decide", "revisit", "open question", "unresolved", an "or" between two approaches, lettered or numbered alternatives with no pick. Each hit needs a recorded decision next to it or in the decisions table. Ignore hits inside code fences and inline code, in text that describes these checks, and in a section of deliberate post-release revisit triggers.

Two kinds of open item are legitimate. A runtime fork passes when its trigger is observable, both routes are fully designed in the spec, and the trigger can be evaluated without making the choice first. A deferred item passes when it sits in the out-of-scope section with a reason nothing in this phase depends on it. The reverse also holds: a fork that would force rework if decided late is unresolved wherever it is filed, because a "decide early" label is not a decision.

**No unverified environment claim.** A spec may mark a claim about the host or a live service as `[VERIFY: what]`. Each must have been resolved in place as `[RESOLVED: checked <what> on <where>]` or `[RESOLVED, corrected: …]`. A bare `[RESOLVED]`, or a tag that was deleted without a note, counts as unresolved because it asserts a check without showing one.

**Decisions are recorded and grounded.** Every fork found in step 2 and every decision the user made in step 3 has a row with all four columns filled. The reasoning cites what grounds it: a brainstorm section, an investigation finding, a `file:line`, a probe result. A purely technical choice may be grounded by its own stated reasoning; flag missing reasoning, not a missing citation.

**Batches are buildable.** Every step belongs to a batch, each batch lists the files it owns, and batches that share files or build on each other state a landing order.

**Pack and project checks.** Read every file in `.claude/rules/` whose `paths` frontmatter matches `docs/plans/`. Apply each lock check those files state, exactly as written, and report the result under the rule file's name. A failure there blocks the lock like any other. Name the rule files you read, including when none add a check, so a missing pack check is visible instead of silent.

## 6. Lock or report

If any check failed, do not write the header. List the open items, each tagged with the check it failed, and say what would close it.

If all passed:

1. Regenerate the spec clean, with every fold applied in place and no struck-through or superseded text, because an implementer works from the spec literally.
2. Move the round-by-round history to `docs/plans/<slug>/panel-history.md`.
3. Write `> **Status: LOCKED YYYY-MM-DD**` with today's date directly under the title.

Then tell the user the spec is locked, which panel passed it, the result of each lockdown check, and that building still needs their go. The locked spec must be committed to the default branch before any batch starts.
