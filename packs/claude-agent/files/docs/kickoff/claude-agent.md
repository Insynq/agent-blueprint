# Kickoff questions: claude-agent pack

Discovery questions for a project whose agent is Claude Code driving scripts, run by an operator and on a schedule. `/kickoff` asks these after its core questions, all in one go, and records the answers where each section says. Skip a question the conversation has already answered. `docs/AGENT_PATTERNS.md` explains why each one matters; `docs/AGENT_HOSTING.md` and `docs/OPERATOR_HANDOFF.md` cover sections 5 to 7.

Ask about the work in the user's own terms. Do not ask them to choose between patterns; work out which pattern applies from what they describe.

## 1. What the agent does and for whom

- What jobs should the agent do? For each: what starts it, and what does a good result look like to the person receiving it?
- Who reads its output, and what do they do with it?
- What is it explicitly not to do, even if asked?
- Which of these jobs exist today as a manual routine? Ask to see one done or described end to end before designing anything.

Record in: `CLAUDE.md` overview; one line per job in `docs/KB_1_Architecture.md` as a candidate runbook.

## 2. Systems of record

For each system the agent will touch (database, accounting system, inbox, scheduler, files, a vendor API):

- What is it the source of truth for?
- How will the agent read it: CLI, API, MCP server, export file? Is there a read-only credential?
- Will the agent write to it? Through what, and can a write be undone? Is there a record of what a row held before?
- Are there limits that fail silently: row caps on a query, pagination, rate limits, tokens that rotate?
- Does the project own this system, or does someone else (a vendor, a customer, another team)?

Record in: a table in `docs/KB_1_Architecture.md` with columns System | Truth for | Read path | Write path | Reversible | Owner. This table decides where `guarded-write.mjs` adapters are needed and which writes are outward.

## 3. Outward and irreversible actions

- Which actions reach a person or an outside system: sending email or messages, creating or sending invoices, moving money, posting to a customer-facing system, signing, publishing?
- Which cannot be undone, including deletes in systems the project owns?
- Does any system act on its own when the agent writes to it (for example, emailing a customer the moment a record is created)? If nobody knows, note it as something to probe on a no-stakes record before the first real write.
- For each outward action: who approves it, and what do they need to see to approve it?
- Is there any outward action the owner wants to stand authorised without a per-instance approval (for example, a failure alert to the operator's own address)? List each one exactly.

Record in: `CLAUDE.md` Do not section (the confirm-first list) and Live invariants; `ask` rules in `.claude/settings.json` for each outward command.

## 4. Internal capture

- When the agent infers something (a match, an amount, an owner), should it write the record and mark it for review, or hold it until someone approves? The pack's default is write and mark. Ask whether any class of record is an exception.
- Where does a person see what is waiting for validation, and who clears it?

Record in: `CLAUDE.md` working agreements.

## 5. Operators and tiers

- Who operates the agent day to day? Is it the person who develops it, or will it be handed to someone else, now or later?
- Whose Claude subscription does each person use? One subscription is one person: no shared login. Whose sign-in do scheduled model runs use, and is that person content for those runs to draw on their allowance?
- If someone other than the developer operates it: may they change runbooks, scripts, schema or memory, or only use them? Which business decisions are theirs to make without asking the owner?
- For a use-only tier: which credentials will that tier have? The hard boundary is what the credentials cannot do (no schema access, a read-only source token); a settings deny list is the polite layer on top.
- The operator will be able to read the code and use the operating secrets directly. Is that acceptable for this person, and is there an agreement that covers it?
- Where does an operator's suggestion for a rule change go, if they cannot edit the rules? Who reviews it, and on which day?
- How will access be removed when the operator leaves?

Record in: `CLAUDE.md` Roles (owner, operator, what the operator decides); `.claude/settings.operator.json` (a `deny` for each schema command, an `ask` for each outward command); the suggestion queue's location in `docs/KB_1_Architecture.md`.

## 6. Where it is hosted and what runs on a schedule

- Where will the agent live: a virtual machine (the default this pack scaffolds), an always-on Mac, or the developer's own computer for now? Which provider and region, and who pays for it?
- Who has admin access to that machine, and from which computers? Does it take snapshots?
- Which jobs run unattended, and when? What time zone? Which of them need a model at all, and which are plain scripts?
- Under which account on that machine do they run?
- What is the manual fallback for each job when the machine is unavailable?
- May a scheduled run write, or only report? If it may write, which writes?
- Can two runs overlap safely? Do any share a credential that rotates or a cursor that advances?
- Which ref does the hosted checkout track: a release branch, the main branch, or a tag? Who moves it?

Record in: `agent/schedule/crontab` (one line per job, copied from `crontab.template`), or one plist per job on a Mac; the host, the tracked ref and the release step in `CLAUDE.md` Build commands and `docs/KB_1_Architecture.md`.

## 7. Secrets

- Which secrets manager holds the project's secrets? If the answer is environment files or a keychain, plan the move before hosting: a hosted machine gets its secrets from a manager, through a token in a root-owned file.
- Can that manager hold two separate configs, one for development and one holding only what the agent needs to operate? Which secrets belong in the operating one? Which must never be on the hosted machine (schema, admin, deploy, source-control write)?
- Does any credential rotate on use? If so, which single machine holds it?
- How will a headless run get its secrets with nobody logged in at a keyboard?
- How does `claude -p` itself authenticate on the scheduled machine, and what happens when that sign-in expires?
- Which variable names must be present for the agent to work? (Names only.)

Record in: `AGENT_REQUIRED_ENV` in the scheduler's environment; the secrets manager, the two config names and the variable names in `docs/KB_1_Architecture.md`. Never record a value.

## 8. Failures and health

- When a scheduled run fails, who needs to know, how fast, and by what channel?
- Who must never receive a failure message?
- What does "the agent has silently stopped" look like here, and how long could it go unnoticed today?
- Is there a routine report people expect even when nothing is wrong, or is silence the sign of health?

Record in: `agent/schedule/notify.sh`; thresholds in `agent/scripts/health-check.mjs`.

## After the answers

Propose, and confirm with the user before writing any of it:

1. The first runbook to build, chosen for low stakes: read-heavy, internal writes only, gate closed.
2. The adapter `guarded-write.mjs` needs for the project's main store.
3. The confirm-first list from section 3, word for word.
4. What is scheduled first, and that it starts as a dry run.
5. Where it will be hosted, which ref the machine tracks, who the owner and operator are, and whose subscription each session uses.
