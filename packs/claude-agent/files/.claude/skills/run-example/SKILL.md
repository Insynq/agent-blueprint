---
name: run-example
description: Use when the operator or the scheduler wants the example daily check run - overdue items reviewed and stale ones flagged for a person. This is the template wrapper; copy it for each real runbook.
argument-hint: "[as-of date, YYYY-MM-DD]"
disable-model-invocation: true
---

# Run: example daily check

Execute the runbook at `agent/runbooks/example-daily-check/RUNBOOK.md`. Follow it exactly and in order. It is the only description of this job; nothing here overrides it.

If $ARGUMENTS holds a date in YYYY-MM-DD form, use that as the as-of date. Otherwise use today's date. Ignore anything else in it.

**Posture.** Reads and counts come from the scripts the runbook names, never from your own tally. Internal flags are written through `agent/scripts/guarded-write.mjs` and only when the runbook's authorisation gate is open; while it is closed, dry-run and report what would change. Nothing in this run contacts anyone or touches an outside system. Do not set `AGENT_WRITE_AUTHORIZED` and do not edit the runbook's gate.

This skill may be running headlessly with nobody to answer a question. Where the runbook leaves a choice open, take the cautious option it describes, say so in the report, and finish. End with the report in the shape the runbook's "What to report" section gives, and nothing after it: for a scheduled run that report is the whole output.
