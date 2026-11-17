## Agent runtime (claude-agent pack)

This project's agent is Claude Code driving scripts: an operator runs jobs interactively, and cron runs the same jobs headlessly with `claude -p` on the machine the agent lives on. Read `docs/AGENT_PATTERNS.md` before designing or changing a job.

- Jobs: `agent/runbooks/<job>/RUNBOOK.md`, each started by a thin skill at `.claude/skills/<job>/`. `/run-example` is the template. Form: `agent/runbooks/README.md`.
- Internal writes: `node agent/scripts/guarded-write.mjs insert|update|delete <target> ...`. Dry run unless `--confirm` and `AGENT_WRITE_AUTHORIZED=true`.
- Scheduled runs: `agent/scripts/scheduled-run.sh <skill>`; prerequisites: `agent/scripts/scheduled-run.sh --selftest <skill>`; setup: `agent/schedule/README.md`.
- Health: `node agent/scripts/health-check.mjs` (no model; non-zero exit when unhealthy).
- Hosting: `docs/AGENT_HOSTING.md`. The hosted checkout is held at a named ref by `agent/vm/sync-checkout.sh`; check the machine with `agent/vm/vm-check.sh`.
- Operators: `docs/OPERATOR_HANDOFF.md`. `agent/vm/onboard-operator.sh` applies `.claude/settings.operator.json` and installs the schedule.
- Runtime state lives in `agent/logs/` and `agent/data/`, both gitignored.

Hard constraints:

- Scheduled runs execute the working tree they point at, so a saved edit there is live. Schedule from a dedicated checkout, and land every new write step behind a closed authorisation gate.
- Never set `AGENT_WRITE_AUTHORIZED` (or any write-authorising variable) yourself, and never store it in settings or a committed file. The person authorising the run sets it.
- Outward or irreversible actions (sending, paying, writing to someone else's system, deleting) are confirmed with a person first, every time, and executed by a fixed script. Internal records are written straight away and marked for validation when inferred.
- An incoming event is recorded and handled by a script or the next scheduled run. It never starts a model session.
- When a script exists for a step, use it. Take counts from script output, not your own tally.
- Before reporting that something that matters is absent, check a second way and state the key you queried.
- Agreement on a design is not permission to deploy it or to open a gate. Ask.
- In an operator session, do not edit runbooks, scripts, skills, rules, memory or this file, and do not commit. Record facts in the store and rule changes as suggestions for the owner.
- Credentials stay in the secrets manager and in root-owned files outside the checkout. Never print one or copy one into the repository.

[TODO: /kickoff lists the project's confirm-first actions, scheduled jobs, host, owner and operator here, from `docs/kickoff/claude-agent.md`.]
