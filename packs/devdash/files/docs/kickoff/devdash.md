# Kickoff questions: devdash pack

One short round, sent as one numbered message after the core rounds and any other pack's. Skip what the user has already answered. Read `devdash/README.md` first.

Before asking, start the dash (`node devdash/scripts/start.mjs`) and give the user the address, so the questions are about something they can see. Two examples ship with it: a question run that asks questions 2, 5 and 6 below, and a sitting that tests the dash itself. If the user would sooner answer on the dash, point them at the example run and read the answers with `node devdash/scripts/results.mjs` instead of asking those three here.

## Questions

1. What name should go on things you decide and verify? It is written into the smoke list when you pass a test, for example `Passed 2026-03-05 (sitting checkout-web, <name>)`.
2. Where will you open the dash: only on this machine, or also from a phone or another computer? The second needs a private network such as Tailscale; say which you use.
3. Which environments will you test against? For each: a short name, its address, and which shared test accounts exist. A sitting always names one, so "none yet" is a useful answer: it means the first phase must create one before anything can be handed to you to test.
4. Is the remote default branch the truth for this project, or do you work directly on the main checkout and push rarely? The dash reads project docs from the remote by default.
5. May the dash start by itself when an agent session starts? It only listens on this machine.
6. On days with commits, the agent is sent back at the end of a turn to bring the daily log up to date, at most every 90 minutes. Keep that, slow it down, or turn it off?
7. Is there any number you want to watch here from day one (sign-ups, test counts, error counts)? If so, where does it come from?

## Where the answers go

Edit the checked-in files in place.

- **`devdash/config.json`:** `owner` (1); `environments` as name and URL pairs (3); `readRef` set to `worktree` if they work on the main checkout and push rarely, otherwise left at `auto` (4); `autostart` (5); `logNudgeMinutes`, 0 for off (6); `project` if the folder name is not what they call it; a `port` of their own if another project on this machine already uses 4317.
- **`CLAUDE.md`, the Dev dash section** (between the `pack:devdash` markers): replace the three `[TODO]` lines with the owner's name, how they reach the dash, and the environments.
- **`docs/KB_1_Architecture.md`:** the environments and their test accounts (3), in the decisions table, with where the shared password is kept. Never the password.
- **`docs/smoke-tests-pending.md`:** nothing now. Rows come from specs.
- **`docs/PARKING_LOT.md`:** each number from question 7 that has no source yet, as an open item. Do not build a metrics feed during kickoff.
- **The example run:** if the user answered it on the dash, record the three rulings as above, then set it to `"status": "archived"` with an outcome line. If they answered in chat, archive it with the outcome "Answered in chat during kickoff". Leave the example sitting for the user to try; close it once they have.

## Follow up, do not write down

- If they will use another device (2): run `node devdash/scripts/start.mjs link` and give them the two commands from "Reaching it from another device" in `devdash/README.md`. Do not run the network command for them; publishing a port is theirs to do.
- If there is no test environment (3): say that sittings cannot be handed over until one exists, and that it belongs in the first phase's scope.
- Hooks are discovered when a session starts. Tell the user to restart the session after kickoff so the SessionStart and Stop hooks are active, and that `/hooks` will list them.
