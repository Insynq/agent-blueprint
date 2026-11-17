# Runbooks

A runbook is the procedure for one job the agent does: a daily check, an intake, a reconciliation. It lives at `agent/runbooks/<name>/RUNBOOK.md` and is the single place that job is described. An operator starts it with a slash skill; the scheduler starts it with the same skill. Both read the same file.

`example-daily-check/` is a working example. `docs/AGENT_PATTERNS.md` explains why runbooks take this form.

## What goes in a runbook

- **What the job is for and what done looks like**, in the first few lines.
- **An authorisation gate**, if any step can write. See below.
- **The steps**, numbered where order matters. Each step is either a judgment the model makes (which record does this match, is this stale, what does this document say) or a call to a script that does the mechanical part.
- **What to report**: the shape of the output, with the numbers taken from script output.
- **What to do when something is off**, so that a surprise ends in a report and not in an improvised repair.

## What does not go in a runbook

Anything that must happen exactly the same way every time: the write itself, counting, totals, matching on keys, de-duplication, date arithmetic. Put that in a script under `agent/scripts/` and have the runbook call it. A step written as prose is carried out at the model's discretion and can be skipped or altered; a script cannot. A query shown to illustrate what to look up is fine. The test is whether a wrong or skipped execution would matter.

Facts copied from a system of record do not belong here either. Name the query that returns them.

## The authorisation gate

Any runbook that mentions a write flag (`--confirm`, `--write`, a `*_WRITE_AUTHORIZED` variable) must have a section headed `## Authorisation gate` that says, near the top:

- whether the gate is open or closed (a new write step starts closed);
- who opens it and how;
- what the runbook does while it is closed (run the dry run, report what would change).

The gate matters because scheduled runs read the runbook from the working tree. A write step saved without a gate is live at the next scheduled run, before anyone has reviewed or approved it. The edit hook (`.claude/hooks/checks/runbook.mjs`) rejects a runbook that mentions a write flag and has no gate section.

The gate in the text is backed by one in code: scripts refuse to write unless the authorising environment variable is set. Keep both. The text tells the model what to do; the variable holds when the text is wrong.

## Adding a runbook

1. Copy `example-daily-check/` to `agent/runbooks/<name>/` and rewrite `RUNBOOK.md`.
2. Write or reuse the scripts it calls. Each should dry-run by default and exit with distinct codes.
3. Add a wrapper skill at `.claude/skills/<name>/SKILL.md`, copied from `.claude/skills/run-example/`. The wrapper names the runbook and states the posture. It does not restate the steps, because a second copy of the steps drifts from the first.
4. Run it by hand with the gate closed and read the report.
5. Only then schedule it (`agent/schedule/README.md`).

One job, one runbook. When a new need is close to an existing runbook, extend that runbook.
