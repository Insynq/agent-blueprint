---
name: gen-test
description: Use when code lacks tests or has just been written or changed, and you want tests in the project's existing style that have each been seen to fail. For a failing test or a bug, use /debug.
argument-hint: "<source file or behaviour> [unit | integration | component]"
---

# Generate tests

Target: $ARGUMENTS

Parse the target as a source file or a described behaviour, followed by an optional test type. If no type is given, choose the one the project already uses for this kind of code.

Write tests for the target in the style the project already has, and prove that each one can fail. Done means the tests pass against the real code, each was seen red against a deliberately broken version, the code is back exactly as it was, and the report says which tests were proven and how.

A green run of tests you wrote yourself is a self-report. A test that has never been observed failing is an assumption that it tests something.

## Match the project

Read the test command and any testing conventions from `CLAUDE.md`, then read two or three existing tests of the same kind as the one you are about to write. Take the file location, naming, imports, setup, helpers and mocking approach from them. Do not bring in a new library, helper or pattern: a test file that looks unlike its neighbours gets maintained by nobody.

If the project has no tests yet, find the configured test runner in the project manifest and use its plainest form, next to the source or wherever the runner looks by default. If no runner is configured, stop and say so. Choosing one is the user's decision.

## What to test

Read the target and its callers, and test behaviour that a caller depends on:

- the main path;
- the failure paths: bad input, a dependency that errors, a permission that is refused;
- boundaries: empty, null, zero, one, many, the limit and one past it;
- for anything with states, each state and the transitions a caller can trigger.

Leave out things that cannot meaningfully break (constants, pass-through getters) and internal details that a refactor would change without changing behaviour.

Three kinds of test pass while checking nothing. Avoid writing them, and look for them when you review your own work:

- **The mirror.** The expected value is computed by the same logic as the code under test. Write expected values as literals you worked out independently.
- **The mock echo.** The assertion checks a value the test's own mock returned. Assert on what the code did with it.
- **The fixture-only contract test.** When one piece of code produces data and another consumes it, a test that feeds the consumer a hand-written fixture proves the consumer handles that fixture. It says nothing about whether the producer emits that shape. To test that the two agree, generate the consumer's input by running the real producer, or check both sides against one shared schema or type.

## Prove each test can fail

For every new test, in order:

1. Run it against the unchanged code and see it pass.
2. Break the behaviour it covers, in the source and not in the test: invert the condition, return the wrong value, remove the call. Make the smallest change that a real bug could plausibly be.
3. Run the test and read the output. It must fail, and fail on the assertion you expected. A failure from a syntax error or a missing import proves nothing.
4. Restore the source. Make each break as a single edit you can reverse exactly, and do not use `git checkout` or `git stash` to restore, because those also discard other uncommitted work in the file.

If a test stays green when the behaviour is broken, it is not testing that behaviour. Fix the test or delete it. Do not keep it for the coverage number.

One break can prove several tests when they cover the same behaviour. Say which break proved which tests.

When every test is proven, run `git diff` on the source files you touched and confirm that nothing outside the new tests has changed. Then run the project's full test command once, to confirm the new tests have not disturbed the existing ones.

If a test cannot be made to fail without elaborate setup (it needs a live service, for instance), report it as written and not proven. Do not describe it as proven.

## Report

```markdown
Tests added: <file>
| Test | Covers | Seen failing |
| <name> | <behaviour> | yes: <the break, and the failure message> / no: <why> |

Source restored: <git diff on the touched source files shows no change>
Full suite: <command> — <result as observed>
Not covered: <what was left out and why>
Needs something else: <behaviour only an integration run, a live service or a person can check>
```

If there is nothing worth testing in the target (it is all pass-through, or it is already covered), say so and name the files and existing tests you looked at.

These tests add to the project's other checks. They do not close a smoke row by themselves: `docs/smoke-tests-pending.md` and the lanes in `docs/WORKFLOW.md` decide that.
