---
name: unify
description: Use when several pieces of code or configuration do the same job with small variations (near-duplicate modules, components, scripts, handlers, types or config blocks) and you want one replacement designed before anything is touched. For reviewing a single change for simpler alternatives, use /audit-code.
argument-hint: "<what is duplicated>"
---

# Unify

Problem: $ARGUMENTS

Find every copy of the thing, work out what they share and where they really differ, and design the single replacement. Done means a draft spec that names every copy and every consumer, defines one shape for the data, lists each behaviour that must survive, and orders the migration so the system works after every step.

This skill designs. It writes no implementation code, and the spec it produces is a draft until `/plan-review` locks it.

## Find all of them

The number of copies in the request is a guess. Derive the real set: search by what the code does as well as by what it is called, because copies drift apart in name long before they drift in behaviour. Check `docs/LESSONS.md` and `docs/KB_1_Architecture.md` for a reason the copies were kept apart on purpose.

For each one record where it lives, what invokes it, the shape of the data it takes and returns, what it does (including effects on other systems), and the branches inside it.

Then find every consumer of every copy. The consumers decide how expensive the migration is, and one you miss is one that breaks.

For a large area, dispatch the `explorer` agent and have it return each candidate with `file:line` and the quoted signature. Read each candidate yourself before it goes into the inventory. A sweep returns things that look alike, and looking alike is the question, not the answer.

## Separate real difference from drift

Lay the copies side by side and sort every difference into one of three kinds:

- **Essential.** A requirement differs: this role sees less, this state allows another action, this source lacks a field. The replacement has to express it.
- **Accidental.** The copies drifted. One got a fix, a guard or a renamed field and the others did not. Choose the behaviour that wins and record the others as behaviour changes the migration will cause, because unifying will change what some callers get.
- **Unknown.** You cannot tell which it is from the code. That is a question for the user. Do not settle it by picking the majority.

Classify each copy as well. Some will be context-bound: the same code that means something different where it sits, or that changes for different reasons and on a different schedule. Those stay out. If most of the copies are context-bound, the right result is "do not unify", with the reason. Report that instead of forcing a design.

## Design the replacement

- **One shape for the data.** Choose the most complete existing shape as the canonical one and keep its field names. Change the sources to produce it. Do not keep two types and a translator between them: the translator is a third thing to maintain, and it is where the two sides drift apart unnoticed. Where a source cannot change (an external interface, stored data), convert once at the point where the data enters, and name that point in the spec.
- **Variation as data.** Express the essential differences as a parameter and a table of what applies to which role, state or source. A flag that selects between two bodies of code is the duplication again, inside one file.
- **Effects are called, not rewritten.** For every notification, audit entry, external call or write that a copy performs, name the existing function and its file. The replacement calls it. A reimplemented effect is the usual way a consolidation quietly drops behaviour.
- **Say what stays out.** Name the context-bound copies and the neighbouring code that is deliberately not touched.

## Order the migration

Start with the consumer where a mistake costs least. Each step moves a named set of consumers to the replacement and leaves the system working. A copy is retired only after its consumers have moved and that step has been verified, never in the step that introduces the replacement. If the copies hold stored data or serve an external contract, say how what already exists is handled.

## Write the spec

Write the draft to `docs/plans/<slug>/spec.md`, using the sections in `spec-sections.md` in this skill's folder. Those sections are what a consolidation needs on top of an ordinary spec; the standards in `/plan` (anchors you opened, earned scope-outs, smoke rows for behaviour claims) apply to this one too. Do not add a `Status: LOCKED` header. Record the design choices in the `Decision | Choice | Reasoning | Date` table.

Then report in the conversation:

```markdown
Copies found: <N> (<N> in scope, <N> context-bound and left out)
Consumers: <N>
Replacement: <one sentence>
Behaviour that will change: <the accidental differences resolved, and for whom>
Questions for you: <the unknown differences, each with the default you would take>
Spec: <path> (draft)
Not checked: <areas not searched, copies not read in full>
```

Stop here for the answers to the questions. With those folded in, the next step is `/plan-review` on the spec.

If the search finds no real duplication, say so and list what you searched and each candidate you rejected with the reason. Do not write a spec.
