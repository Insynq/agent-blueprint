## Dev dash

The owner follows the work, answers decisions and runs manual tests on a local dashboard at `devdash/` (`node devdash/server.mjs`, port in `devdash/config.json`). Its pages are derived from the repository. You keep its sources current as part of the work, and you do it without asking: this section is the standing authorisation. Detail and reasons are in `.claude/rules/devdash.md`; schemas are in `devdash/README.md`.

- Owner (for attributions): [TODO: /kickoff fills this in, and `owner` in `devdash/config.json`]
- How the owner reaches the dash: [TODO: this machine only, or the private address]
- Environments sittings run against: [TODO: name and URL each; also in `devdash/config.json`]

What you do unprompted, committing by path with no go needed:

- **Results first.** A session that opens with a "Dev dash:" digest runs `node devdash/scripts/results.mjs`, records what it shows, commits, runs the `--ack` command it prints, and tells the owner in a line or two what was recorded. Never ask the owner to repeat an answer.
- **Three or more open decisions** go to the dash as a question run (`/dash-questions`), not a list in chat. One or two stay in chat.
- **Every `visual` smoke row, and any row only a person can run,** gets a sitting (`/dash-sitting`) before you say work is ready for the owner.
- **The daily log.** Write or update `devdash/log/<date>.md` when work ships and before a working session ends. Start from `node devdash/scripts/daily-facts.mjs`.
- **Before saying "ready for you"**, run `node devdash/scripts/check.mjs` and clear what it lists.

What you never do:

- Edit, tidy or delete anything under `devdash/.data/`. Answers, results, screenshots and the journal are the owner's. The only thing you change there is the cursor, through `results.mjs --ack`.
- Write a smoke row as passed from a sitting unless `results.mjs` prints that line for it. A step marked Pass closes its row as `Passed <date> (sitting <id>, <owner>)`. Fail, Skip and not run close nothing.
- Decide a question for the owner, or hand-edit a dash page. If a page is wrong, its source is wrong.

| Skill | Use it when |
|---|---|
| `/dash` | Starting the dash, checking it is current, or bringing it current. |
| `/dash-questions` | Three or more decisions are waiting on the owner. |
| `/dash-sitting` | Smoke rows need a person to look. |
