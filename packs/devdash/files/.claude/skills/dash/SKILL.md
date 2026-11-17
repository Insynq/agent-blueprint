---
name: dash
description: Use when the owner asks for the dev dash or its link, when you are unsure it is running or current, when a hook says the dash is owed something, or before telling the owner work is ready for them. To write a new question run use /dash-questions; to write a sitting use /dash-sitting.
argument-hint: "[start | check | link | stop]"
---

# Dash

Request: $ARGUMENTS

Make the dev dash available and right. Done means the server is answering, the owner's unread results are recorded, nothing the dash needs from you is outstanding, and you have told the owner the address and, in a line or two, what you brought up to date.

This skill may be run without asking, by you or by another skill. Everything it does is covered by the standing authorisation in `.claude/rules/devdash.md`: it starts a server bound to this machine and commits documentation. It never touches product code.

If the request is `stop`, run `node devdash/scripts/start.mjs stop` and say so. If it is `link`, run `node devdash/scripts/start.mjs link` and pass on what it prints, with the warning that the link is a password. Otherwise do all of the following; `start` and `check` differ only in what the owner is waiting to hear.

## 1. Start it

Run `node devdash/scripts/start.mjs`. It starts the server from the main checkout if it is down and prints the address and what is waiting. If it reports that the port serves another project, set a free `port` in `devdash/config.json` and run it again. If it fails, read `devdash/.data/server.log` and fix the cause; do not leave the owner with a dead link.

## 2. Read what the owner did

Run `node devdash/scripts/results.mjs`. If it prints answers or results, process them now as the rule file describes: rulings into the spec or `docs/KB_1_Architecture.md`, passed steps into `docs/smoke-tests-pending.md` with exactly the status text printed, a finding for each failed step, the run archived or the sitting closed with an outcome, then commit and run the `--ack` command it printed. Close nothing the script did not print a line for.

## 3. Clear what is owed

Run `node devdash/scripts/check.mjs` and deal with each line:

- A broken definition: fix the file it names. The owner cannot see a broken one.
- A `visual` row with no sitting: follow `.claude/skills/dash-sitting/SKILL.md`.
- A day with commits and no log entry: run `node devdash/scripts/daily-facts.mjs <date>` and write `devdash/log/<date>.md` in the format it prints. Use only those facts and what you observed in this session; a day you did not witness gets a summary of the facts, said as such.

Commit what you wrote, by path. Run the check again and confirm it reports nothing owed.

## 4. Tell the owner

Give the address, then what is waiting on them (question runs, sittings, overdue deferred smokes) with a link to each, then one or two lines on what you just recorded. If nothing needed doing, say so and name what you checked: the server, the journal, the definitions, the ledger and the log.

## Looking at it

A syntax check does not show a blank page. After changing anything under `devdash/public/` or adding a project page, load the page in a browser tool if you have one and look at it; if you cannot, say that plainly instead of calling it verified.
