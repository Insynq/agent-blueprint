---
paths:
  - "agent/**"
---

# Working on the agent

The reasoning and the incidents behind these are in `docs/AGENT_PATTERNS.md`.

- **This checkout may be the scheduled runtime.** Scheduled runs read runbooks and scripts from a working tree, so if this is the tree they run from, a saved edit is live at the next fire without a commit or a review. Before saving an edit that adds or un-gates a write, check when the next scheduled run fires, and land the step behind a closed authorisation gate.
- **Judgment goes in the runbook, mechanics go in a script.** Anything that must happen the same way every time (the write, counting, totals, key matching) is a script the runbook calls, because a prose step is executed at the model's discretion and can be skipped or miscounted.
- **When a script exists for a step, use it.** Do not reproduce it with ad hoc commands or edit a store by hand, because that bypasses its validation, its log and its guards.
- **Scripts dry-run by default.** A write needs the explicit flag and the authorising environment variable. A dry run still reads real state; only the write is skipped. Use distinct exit codes so a caller can tell refused from failed from done.
- **Never set a write-authorising variable yourself**, and never put one in `.claude/settings.json`, a committed env file or a script. It is set by the person authorising the run, in the shell or scheduler that starts it. Set anywhere permanent, it stops being a gate.
- **Internal writes go through `agent/scripts/guarded-write.mjs`** or a helper with the same guards (filter required, row cap, pre-image logged first). Its protections are what make it safe to run without asking each time.
- **Capture first, confirm first: know which applies.** A record in a store the project owns is written straight away, marked for validation when it is inferred, and a person clears the mark afterwards. An outward or irreversible action (sending, paying, posting to someone else's system, deleting) is confirmed with a person before it runs, every time.
- **No model in the execution path of an outward write.** A person approves a recorded request; a fixed script re-validates it, acts, and reads back. The model may prepare and propose. An incoming event is recorded and handled by a script or the next scheduled run; it never starts a model session.
- **Read back after writing, and report what the read-back showed.** A script's own "ok" proves the call returned, not that the store holds the value.
- **An empty result on a question that matters is checked a second way** (a different key, a different filter, the source system) before absence is reported or recorded. Print the key that was actually queried.
- **Query live state; do not trust a copy.** Before a write, read the target's real shape and one existing row. Keep rules and query paths in docs and memory, not copies of the data.
- **Read the governing runbook or reference before the first write.** A tool accepting a payload says the payload is well formed, not that it is correct here.
- **Extend what exists.** A new need close to an existing runbook, script or report goes into that one. A parallel surface needs a stated reason.
- **Failures notify the operator only, and only failures notify.** A healthy scheduled run is silent; the health check covers the case where runs stop happening.
- **A missing required input stops the job.** If inventing a value would change something stored or irreversible, record exactly what is missing and ask. Proceed on a stated default only where a wrong guess costs nothing lasting.
- **A failed write is counted or fatal, never a warning.** Catch the one error you expect; let the rest reach the run's summary or stop the run. Before reporting a route as unavailable, try the smallest real call and quote its error.
- **On the hosted machine the checkout is a deploy target.** It is held at a named ref by `agent/vm/sync-checkout.sh`, cannot push, and loses any local edit at the next sync. Make changes where development happens and release them by moving the ref (`docs/AGENT_HOSTING.md`).
- **In an operator session, use the agent and do not change it.** Do not edit runbooks, scripts, skills, rules, memory or `CLAUDE.md`, and do not commit. Facts go to the store. A request to change how the agent behaves becomes a row in the suggestion queue for the owner, and you say so (`docs/OPERATOR_HANDOFF.md`).
- **Never read out, print or copy a credential**, and never move one into the checkout. Check that a variable is present by name only.
