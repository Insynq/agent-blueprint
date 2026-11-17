# Unified <name>

<No status header. /plan-review adds it when the spec locks.>

## Problem

| Copy | Location | Invoked from | Data shape in and out | What it does |
|---|---|---|---|---|

<One or two sentences on what the duplication costs today: the bug fixed in one copy and not the others, the inconsistency a user can see.>

## Left out

| Copy | Location | Why it is context-bound |
|---|---|---|

## Goal

<One paragraph: what the single replacement is and what it becomes the one home for.>

## Differences

| Difference | Copies affected | Kind (essential, accidental) | Resolution |
|---|---|---|---|

Behaviour that changes for existing callers:

- <consumer, file:line> — today: <behaviour>. After: <behaviour>.

## Data shape

Canonical shape: `<name>`, taken from <the existing shape it is based on, file:line>.

| Field | Type | Required | Source today | Notes |
|---|---|---|---|---|

Sources changed to produce it: <list>.
Converted at entry, because the source cannot change: <source> at <the single point of conversion> — <why it cannot change>.

## Variation

| Section or behaviour | <role or source A> | <role or source B> | <role or source C> |
|---|---|---|---|

| Section or behaviour | <state 1> | <state 2> | <state 3> |
|---|---|---|---|

<Omit a table that does not apply.>

## Effects preserved

| Effect | Existing function | File | Called when |
|---|---|---|---|

## Consumers

| Consumer | file:line | Uses which copy | Moves in step |
|---|---|---|---|

## Migration

### Step 1: <the lowest-risk consumer>

- Create: <files>
- Change: <files>
- Verify: <the check that shows this step works, and its smoke lane>
- Retire after verification: <copies>

### Step 2: <next>

<Same shape.>

Existing data or external contracts: <how what is already stored or published is handled, or "none">.

## Decisions

| Decision | Choice | Reasoning | Date |
|---|---|---|---|

## Open questions

- <question> — default: <what will be done if the user has no preference>

## Not changed

<What is deliberately out of scope and stays as it is.>
