# Agent Patterns

How to build an operational agent whose runtime is Claude Code driving scripts. An operator runs it interactively; a scheduler runs it headlessly with `claude -p`. No long-running agent process sits in between: the repository is the agent. `docs/AGENT_HOSTING.md` covers the machine it lives on, and `docs/OPERATOR_HANDOFF.md` covers handing it to someone else to run.

These patterns come from a production agent that ran a small business's back office for most of a year and was then handed to an operator on a hosted machine. Each pattern is here because its absence caused a specific failure. The incidents are real and anonymised.

Two observations sit under all of it:

- **A model carrying out a mechanical step will sometimes skip it, alter it or miscount, and will report that it went fine.** This is a property of the tool, not a defect of one model version, so the design has to assume it.
- **Documentation drifts toward what was intended.** Anything written down about the state of a system is a claim with a date on it, and the system itself is the only current source.

## The shape

```
agent/runbooks/<job>/RUNBOOK.md     the procedure for one job: judgment, and calls to scripts
.claude/skills/<job>/SKILL.md       a thin wrapper: "execute that runbook", plus posture
agent/scripts/                      the mechanics: readers, guarded writers, the scheduler entry
agent/schedule/                     what points cron or launchd at scheduled-run.sh
agent/vm/                           hosting: sync the checkout, onboard an operator, check the machine
agent/logs/, agent/data/            runtime state, gitignored
```

An operator types `/<job>`. The scheduler runs `claude -p "/<job>"`. Both reach the same runbook.

## 1. Judgment in the runbook, mechanics in a script

A runbook step is one of two things. It is a judgment only a model can make: what does this document say, which existing record does this match, is this item stale. Or it is a call to a script that does something mechanical: the write, a count, a total, a key match, de-duplication, date arithmetic.

Mechanical logic written as prose in a runbook has three costs. It is skippable, because the model executes it at its own discretion, so a write that has to happen may not. It is untestable, because prose has no dry run and no fixture, so a regression shows up as wrong data. And it is loaded into context on every run, crowding out the judgment the runbook is there for.

The split runs inside a step, not between whole workflows. The decision stays in the runbook; the execution moves to the script. A typical step reads: the model extracts the fields and builds a payload, calls the script in dry-run, reviews what the script says it would do, then runs it for real. A query shown in a runbook to illustrate what to look up is fine. Extract the execution, not the illustration.

Counting belongs to scripts in particular. A model asked how many rows met a condition will give a number, and it will be close. Have the script print the count and have the runbook say to use it as given.

Expect the first live run of a new script to ignore it. When a script first replaced hand-written writes in the source project, the model fell back to composing its own statements and produced hollow results. The fix is to make the script the only route (the runbook names it, the permission rules allow it and not the raw path) and to check the first real run.

> Incident: a class of incoming records was left to the model to file. Over ten days it deferred each one with a plausible note, and a five-figure sum of quoted work sat uncaptured until a script took over the write.

## 2. One runbook, one thin wrapper

The runbook is the only description of the job. The slash skill that starts it is a few lines: execute this runbook exactly, plus one paragraph of posture (what may be written, what is confirm-first, what to do when nobody is there to ask). The wrapper carries `disable-model-invocation: true`, because a job with side effects is started on purpose.

The wrapper does not restate the steps. Two copies of a procedure drift, and the model follows whichever it read last. Keeping the runbook outside `.claude/skills/` also lets other runbooks and people reference it as a plain document.

## 3. Dry run by default, a flag to write, read back, distinct exit codes

Every script that can change something follows the same contract.

- **It dry-runs unless told otherwise.** The common mistake, running it once to see what happens, is then harmless.
- **A dry run reads real state.** Only the write is skipped. A script that skips its queries in dry-run mode reports on a store that does not exist. Treat a dry-run count of chained writes (where a later write depends on reading back an earlier one) as indicative, and confirm the real figure after the write.
- **Writing needs two things: an explicit flag on the command, and an environment variable set by whoever authorised the run.** The command flag is within the model's reach; the environment variable is not, as long as it is set only in the shell or scheduler that starts the session. This is the backstop that holds when the runbook text is wrong. Never put the variable in settings, a committed env file or a script.
- **After writing, it reads the rows back** and compares. A success response proves the call returned.
- **Exit codes are distinct**: done, refused by a guard, not authorised, written but unverified, failed. A caller, human or script, must be able to tell "nothing happened" from "something happened and I cannot vouch for it".

> Incident: a reconciliation script skipped its database read in dry-run. Every incoming row looked new, its integrity check compared the input to itself and passed, and the real run would have left a set of duplicates the dry run never saw.

In the runbook, the same control appears as an **authorisation gate**: a section near the top saying whether write steps are open or closed, who opens them, and what to do meanwhile (dry-run and report). A new write step starts closed. The edit hook rejects a runbook that mentions a write flag with no gate section.

## 4. Guarded write helpers in place of permission prompts

Asking a person to approve each write feels safe and is not. The prompts arrive in volume, each looks like the last, and approving becomes a reflex. Meanwhile the prompt protects nothing a headless run does, since nobody is there.

Put the protection in the write path instead. `agent/scripts/guarded-write.mjs` refuses an update or delete with no row filter, refuses one that matches more rows than a cap, logs the prior contents of every matched row before changing anything, and dry-runs unless confirmed and authorised. Allow that helper in the permission rules and do not allow the raw route to the store. The model then writes without interrupting anyone, and the worst case is a bounded, logged, reversible change.

Give reads the same treatment: a reader that can only read, pinned to one store, is safe to allow outright. Make it loud about truncation. A reader that silently returns the first thousand rows of two thousand produces confident wrong analysis.

Most remaining prompts are self-inflicted: compound shell commands and redirects that fall outside an allow rule which the plain form of the same command would have matched. Fix the command shape or the helper, not the allow list.

> Incident: the pre-image log is what made the incident in section 7 a ten-minute repair. Nine rows changed by an unauthorised run were restored from it exactly.

> Incident: an ad hoc reader hit the store's silent row cap, read about half of a table, and a cost analysis reported a five-figure discrepancy that was entirely missing rows. The true figure was zero.

## 5. Write-then-validate inside, confirm-first outside

Sort every action by one question: can we take it back?

**Internal capture is written immediately.** When the agent learns or infers something that belongs in a store the project owns, it writes the record. If the record is inferred, anticipated, or changes a field other things depend on, it is written with a validation mark, and a person clears the mark afterwards. Holding the record as a proposal until someone approves it is how detail is lost: the approval never comes, and the conversation that held the detail ends. The person makes the same decision either way, after the fact instead of as a blocking question.

**Outward and irreversible actions are confirmed first, every time.** Sending a message, issuing an invoice, moving money, signing, writing to a system someone else owns, deleting. Show exactly what will go out, then wait. Approval of one instance is not approval of the next.

Before the first real write through any new outward system, make one deliberate probe on a record with no stakes and look at the side effects. What a system is supposed to do on create and what it does are learned separately.

> Incident: creating an invoice and sending it were assumed to be two steps. An automation on the vendor's side emailed each invoice at creation, and the first one went to a customer at a pre-discount total. A probe on an internal record would have shown it.

## 6. No model in the execution path of outward writes

For outward actions, the model prepares and proposes, a person approves, and a fixed script executes. The script re-validates the request against live state, performs the action, reads back the result and marks the request done or failed. It is on a short allow list, and it holds the outward credential; the interactive surface does not. Offer the action only when its data is complete, and otherwise show what is missing and who owns it.

The reason is that an outward action must do exactly what was approved. A model between the approval and the action can reinterpret it.

For the same reason, **an incoming event never wakes a model.** A webhook, a message or a button press is recorded as a row. A deterministic script handles it, or the next scheduled run reads it as input. If an event starts a model session directly, then whoever can cause the event can start an agent holding your credentials, with content they wrote as its input, at a rate and cost they control.

Prefer pulling to being pushed. A sender that retries and then gives up makes a broken receiver look identical to a quiet day, so audit in reverse: does every activity in the source system have a matching record here?

> Incident: a webhook receiver rejected every delivery for weeks. The sender retried three times and stopped each time, nothing errored on either side, and the gap was found only by comparing against the source.

## 7. The working tree is the runtime

A scheduled run executes `claude -p` in a checkout. It reads runbooks, skills and scripts from that working tree as they are on disk. There is no build, no review and no deploy between saving a file and production executing it. If the scheduler points at the checkout you develop in, every saved edit is a release.

> Incident: during a build, a write step was added to a runbook in the working tree, approved for dry-run only. The scheduled run fired fifteen minutes later, read the edited file, and executed the step against nine production records. The same run's housekeeping then pushed half-finished notes from that tree to the main branch.

What to do about it, in order of strength:

1. **Run the schedule from its own checkout**, updated only by a deliberate pull or pinned to a reviewed ref. `scheduled-run.sh` refuses to run from a tree with uncommitted changes, or one that is not at `AGENT_RUN_REF` when that is set.
2. **Gate in code.** Write paths refuse without the authorising environment variable, so a text lapse alone cannot execute one.
3. **Gate in the runbook.** New write steps land closed.
4. **Know the schedule.** Before saving an edit that could change what a run does, check when the next run fires.

Whatever a scheduled run commits or pushes should be only the files that run produced. A blanket add sweeps up someone else's unfinished work.

## 8. Verify with evidence that could not have been guessed

"I ran it and it works" is a claim. A check counts as verification when its result is something the model could not have produced without doing the work: a value that was not in the prompt, a row count from a query run separately, a record that can be looked up in the source system.

Prefer specific, finite, separately checkable answers to summaries, since they are harder to fabricate. Record what the check was and when it ran. Scripts should fail loudly with the literal error, so that the model has less room to narrate. For anything consequential, check against the system that was written to, not the script's own success line.

> Incident: asked to test a database connection, the agent returned eleven columns for a table when the prompt had named five. The six it could not have known were what proved the query was real. In the same period it reported a row as "written" alongside a conflict status code that meant the row had been rejected.

## 9. Memory and docs hold rules and query paths, not facts

Anything that can be queried is queried, at the time it is needed. Before a write, read the target's real shape and one existing row. Do not write a reference document that restates a schema, a list of current values or a status: it is a second copy, it goes stale without any signal, and a stale copy gets defended against the live system by whoever reads it next.

What belongs in memory and docs is what the system cannot tell you: why something is done a certain way, which component owns which data, how a tool behaves, and where to look.

Read the governing runbook or reference before the first write, too. A tool that accepts a payload has confirmed the payload is well formed, not that it is a correct record by this project's conventions.

> Incident: a guessed column name cost a run of failed queries, and the proposed fix was a document listing the columns. The names were already in memory. The failure was not querying, and the fix was the habit of querying.

## 10. An empty result that matters is checked a second way

"Nothing found" is the least reliable thing a query returns, because a wrong key, a failed variable expansion and a truncated read all look exactly like absence. When an empty result would lead to an action or a recorded conclusion (not billed, not received, no such record), check again with an independent key or filter, or in the source system, and print the key that was actually used. Report absence when both agree.

A recorded negative is held to a higher standard than a positive. Cursors move past it, later runs inherit it, and it becomes the only surviving account. Before writing one down, open the source and cite what was checked in the record itself.

> Incident: a query for whether a charge had been recovered came back empty, because the id fed into the filter had arrived empty through a shell pipeline. "Never recovered" went into a report, and a second recovery was about to be drafted when a different filter found all three rows.

> Incident: a run concluded a document "probably arrived by another channel" without opening the three messages that contained it. The cursor advanced, the note stood for a week, and the next run trusted the note over the mailbox.

## 11. Design sign-off is not a deploy grant

Answering a plan's open questions makes the design agreed. It does not authorise building it into production. Before the first action that changes production (a schema change, a write to a live store, a push to the branch the schedule runs from, opening a gate), ask one explicit question and wait for the answer. Saying "proceeding to build" is not asking. If the wording that implied permission came from your own question, the user repeating it is not permission.

Section 7 is why this needs stating for this kind of agent: the scheduler will turn a saved file into a deploy with nobody deciding to.

## 12. Extend the canonical surface

Every kind of thing has one home: one runbook per job, one write helper, one queue of things awaiting a person, one place the operator looks. When a new need is close to something that exists, extend that. A parallel document, dashboard or script splits attention, and the older one goes stale while still looking authoritative.

> Incident: the owner, on finding a third overlapping process map: "I want to stop creating new things. I'll forget."

## 13. Leave the capability out

The strongest guard on a destructive operation is not having it. Before wrapping an irreversible action in dry runs and confirmations, ask whether the agent needs it at all. If the need is rare, leave the tool out and let a person do those few cases in the system's own interface, even when someone asks for it to be added. A capability the agent does not hold cannot be triggered by a confident mistake or by text someone else wrote into its input. The same reasoning keeps credentials out of the model's reach: keys live in the processes that scripts and tool servers run in, and the model calls a tool by name.

Give standing autonomy in proportion to containment, not to trust in the model. A long unattended run is reasonable when what it can reach cannot touch production, when a mechanical check stands before each irreversible step, and when the allowed actions were listed in advance. Without all three, stay turn by turn.

## 14. Stop on a missing input; fail loud or closed

Sort every unverified assumption by one test: would inventing it change something that is stored or cannot be undone? If not, proceed under a stated default and say so. If so, the job is blocked: record exactly which input is missing, stop, and ask. A model told to produce a complete record will fill a gap to satisfy the format, and a guessed required field looks the same as a real one afterwards.

The error path needs the same care as the write path. When a write can fail, its handler either counts the failure in the run's own summary or aborts the operation the write was protecting. It never logs a warning and carries on. Catch the one condition you expect and let everything else surface. The test is that a run's report cannot claim a success the write did not achieve. Read-back covers the side rows too: the audit or log record a write is meant to produce, not only the main row.

"Unavailable" is a claim held to the same standard as "done". Before reporting or recording that a route is blocked, try the smallest real call on every candidate your own search turned up, and quote the commands and their errors.

> Incident: an audit row was written inside a catch that logged a warning and continued. A column it needed had never been created, so the row failed on every run for a week while each run's summary read as clean.

> Incident: a sign-in banner on one tool was read as "mail is unavailable". The run recorded the lane as blocked and skipped the steps that depended on it. Its own search had already listed a working command-line route, which it never opened.

## 15. Say how each thing is known, and which source wins

Every value the agent passes on is one of three things: read from the source in this run, inferred, or not checkable. Carry that with the value, in the record and in the report. "Verified" means a fresh read now; something verified last week is inferred today.

When sources disagree, the order of authority is written down per field, in advance, and the agent applies it. The system of record outranks memory, and it outranks what a person recalls in conversation: when someone states a figure that differs from the store, show both and ask before changing the store. Record the value that lost alongside the one that won.

> Incident: the owner quoted rates from memory, and the agent rewrote the rate table to match. The table had been right. "We have a table for this. I probably told you the wrong amounts. Put it back."

## 16. Every write has a named way back, and is safe to run twice

For each kind of write, name its inverse before shipping it: an exact undo, or a compensating entry where the original cannot be removed. Include the half-finished case. An action with no stated inverse is irreversible, and belongs on the confirm-first list.

A scheduler fires twice, a run is retried, a person asks again. A write keyed on something stable (the source record's id, not a timestamp) turns the repeat into a no-op.

Defaults on money and attribution fields are inert: empty, zero or "unknown", never a business rule. That applies to a column default and equally to a fallback in a view or report, which are two places asserting the same rule and are fixed together.

> Incident: a percentage column defaulted to a common value, and a view fell back to the same number. Every record whose writer omitted the field was silently given it, with a five-figure sum credited on that basis before anyone looked.

## 17. Find the failing step before fixing anything

An agent's turn has five steps: it takes input in, extracts fields, decides, acts, and keeps state for next time. When something goes wrong, walk them in that order and fix the first one where what happened differs from what should have. Did the input arrive, whole? What did the agent extract from it? Given that, was the decision right? Did the action land, checked by reading it back? Did state carry over?

Most "the agent does not know about X" reports are an input that never arrived or was truncated, and no rewording of a runbook fixes that. Mechanical failures get mechanical fixes: a check in a script, not an instruction to be more careful.

## 18. Learning is recorded automatically and applied by a person

When someone corrects the agent, record the kind of mistake and not only the instance, and only when it teaches something the agent does not already do. Corrections and suggestions go to one queue a person reviews, and a change in behaviour arrives as a reviewed commit to a runbook, script or rule. An agent that adjusts its own rules drifts with nobody having decided anything. A queue nobody reads is the same failure, slower, so the review has a day and an owner.

Count outcomes as well as activity. Runs completed and items processed say what the agent did. Pair each with something that says whether the work was right: corrections per week, items a person had to redo.

## Running unattended

- **One lock for all scheduled runs.** Runs that share a rotating credential or an advancing cursor must not interleave. A held lock is a skip, not a failure.
- **Selftest in the scheduler's environment.** A launchd or cron job has a different PATH, and credentials that depend on a logged-in person are absent or expire. Test prerequisites there, without starting a model.
- **Notify on failure only, and only the operator.** A report sent after every healthy run is ignored within a week. A zero exit with empty output counts as a failure.
- **A health check with no model in it, scheduled separately.** A run that never starts never fails, so something independent has to notice that runs stopped. It reports system health, not business state.
- **The permission mode is a decision.** Nobody can answer a prompt, so the mode decides what happens to a call that would have asked. Default to denying what was not allowed in advance, and keep the write guards in scripts where no mode can skip them.
- **Timestamps come from the clock.** Audit and status times are set by the store or the script, never typed by the model.
- **Know what each job costs.** Give each scheduled job its own spending cap, and decide beforehand what happens when a threshold is crossed. A limit with no response attached is a number nobody acts on. Put a plain script in front of every recurring input and send a model only what the script could not settle.
- **A rollback names every step.** Reverting the commit is half of it. Write down the rest per job: moving the ref the schedule tracks, reinstalling a changed schedule, restoring rows from the pre-image log.
- **Where a store is read one call at a time, the call is the cost.** Keep the fields every run reads on the row it already fetches, as a named copy of one canonical source written in the same step. Save the ids of things created at setup, so later runs do not search by name and create a second one.

> Incident: a scheduled runner's sign-in expired over a weekend. Each run failed and mailed its failure to the whole distribution list of the routine report, four times.

## Operators and developers

When people other than the developer run the agent, separate using it from changing it. The enforceable boundary is credentials: the operator's environment has no schema access and a read-only source token, and its checkout is reset to a named ref. A settings deny list on runbooks, scripts and memory is the courteous layer that makes the agent decline cleanly. Add `ask` rules for each outward command, so those always stop for the person even in a session that otherwise runs without prompts. Operators' facts go to the store; their suggestions for rule changes go to a queue the developer reviews.

Say of every safety rule whether something enforces it or the agent merely keeps it. Both bind equally. The difference is what stands behind the rule when it is broken, and a kept promise described as a wall misleads whoever relies on it. `docs/OPERATOR_HANDOFF.md` sets out the tiers, the settings layer and what the arrangement does not protect; `docs/AGENT_HOSTING.md` covers the machine and its credentials.

## Where each pattern lives in this pack

| Pattern | Enforced or shown by |
|---|---|
| Runbook form, gate | `agent/runbooks/README.md`, `example-daily-check/`, `.claude/hooks/checks/runbook.mjs` |
| Thin wrapper | `.claude/skills/run-example/SKILL.md` |
| Guarded writes, dry run, flag, read-back, exit codes | `agent/scripts/guarded-write.mjs` |
| Reader that counts and names its source | `agent/scripts/example-list-overdue.mjs` |
| Clean tree or pinned ref, lock, selftest, notify on failure | `agent/scripts/scheduled-run.sh`, `agent/schedule/` |
| Model-free health check | `agent/scripts/health-check.mjs` |
| Day-to-day rules | `.claude/rules/agent.md` |
| Checkout held at a named ref, local changes saved then discarded | `agent/vm/sync-checkout.sh` |
| Operator tier: settings layer, schedule install, machine checklist | `.claude/settings.operator.json`, `agent/vm/onboard-operator.sh`, `agent/vm/vm-check.sh` |
| Hosting and handoff | `docs/AGENT_HOSTING.md`, `docs/OPERATOR_HANDOFF.md` |
