---
name: debug
description: Use when something is broken, throwing, failing a test, flaky or producing wrong output, and the cause is not yet proven. Reach for it before changing any code, including when the fix looks obvious. To learn how working code behaves, use /investigate.
argument-hint: "<the bug: error text, failing test, or what went wrong>"
---

# Debug

Issue: $ARGUMENTS

Find the root cause, prove it with a diagnostic, then make the smallest change that removes it. Done means: the cause is stated in one sentence with the evidence that confirmed it, the fix is in, a regression test has been seen failing without the fix, and the original symptom has been re-run and is gone.

The one rule: no edit aimed at the symptom until a diagnostic has confirmed why it happens. A fix made on an untested hypothesis can make the symptom disappear for the wrong reason (a masked error, a warm cache, a race that happened to lose), and then nobody knows what was fixed or whether the cause is still live.

Work in this session. You do not stop to ask the user to approve a hypothesis: the diagnostic result is the confirmation. The stops are the three-strikes rule and a fix that outgrows a bug fix, both below.

## 1. Anchor on the primary artifact

Before forming any theory, get the literal artifact in front of you and quote it verbatim: the error text with its stack frame, the failing test's name and assertion output, the log line, the response status and body, the query and what it returned. Reproduce the failure yourself if you can, and quote your own run in preference to one pasted to you.

Take your entry point from what the artifact shows, not from what the issue description implies. A description is someone's theory of the bug, already interpreted; it has sent many debugging sessions through three wrong fixes while the real error line sat unread in the output.

If there is no artifact (no reproduction, nothing captured), say so, and treat getting one as the first task: add logging, write a failing test, ask the user for the exact text. Until you have it, every claim downstream is unverified and must be labelled that way. Do not substitute a plausible reconstruction.

## 2. Characterise

Write down, from the artifact:

- the exact observable behaviour, and what was expected instead;
- when it happens: always, sometimes, after a specific action, only in one environment;
- what changed recently: check `git log` for the files in the stack frame, and whether the failing environment is running the code you are reading;
- which layer the artifact points at. The layer where a symptom appears is often not the layer that caused it, so name both if they differ.

Read `docs/LESSONS.md` for entries matching this symptom, and the Live invariants and Do not sections of `CLAUDE.md`. Several of those describe failures that produce no error at all.

## 3. Trace the path

Follow the code from the artifact's entry point to the failure, reading each hop. Trace it yourself when it stays within a few files. When it crosses subsystems, dispatch an Explore agent with the quoted artifact, the entry point and the question "list every code path that can produce this output, with `file:line`", and then open the lines it cites before relying on them, because its report is a claim.

Things worth checking because they hide well:

- every path that can produce this state, not only the obvious one;
- a failure reported as success: an empty result, a swallowed exception, a write rejected without an error;
- a caller using a lower layer that skips the validation or side effects of the proper one;
- a value defined in two places that have drifted;
- an assumption about a name, a schema or a config value that you have not read at its source. Read the definition; do not infer it from usage.

## 4. One hypothesis, one diagnostic

State exactly one hypothesis: "The cause is X, because of <evidence at file:line>." If there are several candidates, pick the most likely and note the rest.

Then name the smallest observation that would prove it wrong, and make it, without changing behaviour: a log at one call site, a direct query, a single invocation with a controlled input, a unit test that isolates the suspect. A diagnostic that could only ever agree with you is not one. Check it can tell the difference by running it somewhere the bug does not occur.

If the diagnostic contradicts the hypothesis, the hypothesis is dead. Go back to the artifact, not to a variation of the same idea.

## 5. Fix, then verify

Make the change that removes the cause and nothing else: no refactoring nearby, no handling for unrelated cases. If the same defect exists at sibling sites, list them and fix them only if they are the same bug.

Then, in this order:

1. Write a regression test and see it fail without the fix and pass with it. `/gen-test` has the procedure.
2. Re-run the reproduction from step 1 and quote the new output. This is what makes the fix verified; a passing typecheck does not.
3. Run the project's test, typecheck and lint commands from `CLAUDE.md` and confirm the result is clean against the baseline.

If you could not reproduce the original failure, say the fix is unverified and say what observation would verify it.

## Thoughts that mean stop

| The thought | What is actually true |
|---|---|
| "It is obvious, I will just fix it." | Obvious causes are wrong often enough that one diagnostic is cheap. Run it. |
| "The fix will double as the test." | A fix can pass for the wrong reason. You will not know what you fixed. |
| "There are a few possible causes, I will fix all of them." | Then you cannot tell which change mattered, and you have added untested code. |
| "The user is in a hurry." | A wrong fix costs them the rest of the day. |
| "That worked first time, and it was easy." | A fix much bigger or much cheaper than the bug deserved, or one that relies on something you did not expect to exist, means your model of the code is off. Read that thing at its source. |

## Three strikes

Count fix attempts. After the third one fails, do not try a fourth. Three misses means the model of the problem is wrong (wrong layer, wrong abstraction, a false belief about how the system works), not that the next variation will land.

You are now the least reliable judge of why, since the same model produced all three misses. Dispatch a `refuter` agent with only: the primary artifact verbatim, and the three hypotheses with what each one assumed. Ask it to name the assumption all three share that the artifact contradicts, quoting the evidence, and not to propose a fix. Open the lines it cites.

Then stop and tell the user: what you tried, what each attempt assumed, the shared false premise, and whether this is still a bug or a design problem. The usual next step is `/investigate` on the wider subsystem or `/brainstorm` on the design.

The same signal fires on a single fix that is out of proportion to the bug: many files, several layers. Stop there too; that is a change that needs a spec (`/plan`), not a patch.

## Report

```
Symptom: <the artifact, quoted>
Root cause: <one sentence> at <file:line>
Confirmed by: <the diagnostic and what it showed>
Fix: <what changed and why that removes the cause>
Regression test: <name> — seen failing: yes (how) | no (why)
Verified: <reproduction re-run and its output> | unverified — <what would verify it>
Files changed: <list>
Ruled out: <hypotheses the diagnostics killed>
Lesson: <a proposed docs/LESSONS.md entry, if what made this hard would catch someone else> | none
```

If a lesson is proposed, add it to `docs/LESSONS.md` in that file's format before the fix ships, with this incident as its reason.
