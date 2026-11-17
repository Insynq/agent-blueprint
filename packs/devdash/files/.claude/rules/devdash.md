---
paths:
  - "devdash/**"
  - "docs/smoke-tests-pending.md"
  - "docs/plans/**"
  - "docs/CHANGELOG.md"
  - "docs/KB_8_Current_State.md"
---

# Keeping the dev dash current

The dash is the owner's window onto the work and their channel for decisions and manual tests. It is only worth opening if it is right every time, and it is only right if nobody has to remember to update it. So upkeep is part of the work, it is yours, and you do not ask first.

## Standing authorisation

You may, at any time and without a go, create and edit these and commit them by path (`git commit --only -- <paths>`):

- `devdash/questions/*.json`: question runs.
- `devdash/sittings/<id>/`: sittings and their reference screenshots.
- `devdash/log/<date>.md`: daily log entries.
- `devdash/pages/*.html`: project pages and mockups.
- The docs the dash reads, when you are recording something you observed or the owner ruled: `docs/smoke-tests-pending.md`, the decision table in a spec or `docs/KB_1_Architecture.md`, `docs/KB_8_Current_State.md`, `docs/CHANGELOG.md`, `docs/PARKING_LOT.md`.

The reason this needs no go: none of it changes what the product does, and asking "may I update the dash?" is the interruption the dash exists to remove. Product code, releases and anything destructive keep their own rules in `docs/WORKFLOW.md`.

Land these the way the project lands docs. Project docs are read from the remote default branch, so a ledger edit shows once it is there. Definitions are different: the dash finds question runs, sittings and log entries in every checkout, so a sitting committed on a feature branch is runnable at once. Never hold one back waiting for a merge.

## What is the owner's

Everything under `devdash/.data/` (or wherever `DEVDASH_DATA` points): answers, sitting results, screenshots, the trash folder, the journal. You read them. You never edit, rename, tidy or delete them, including screenshots of a bug you have since fixed: the owner reuses them. A settings rule denies the Edit tool there; do not work round it with a shell command. The single thing you change is your own cursor, with `node devdash/scripts/results.mjs --ack <n>`.

You never answer a question for the owner, and never mark a step for them.

## Triggers

| When | You |
|---|---|
| A session starts with a "Dev dash:" digest, or a Stop hook says the owner just used the dash | Run `node devdash/scripts/results.mjs` and process it before anything else (below). |
| You have three or more decisions only the owner can make, or you reach the questions step of `/brainstorm` or `/orchestrate` | Write a question run with `/dash-questions` and give the owner the link. One or two questions stay in chat. |
| A `visual` row is added to the ledger, or any row that only a person can run (a phone in hand, a real inbox) | Write a sitting with `/dash-sitting` that covers it, before telling the owner the work is ready. |
| Work ships (`/ship`), and before you end a working session that made commits | Write or update `devdash/log/<today>.md` from `node devdash/scripts/daily-facts.mjs`. |
| You are about to say "ready for you", "please test" or "done" | Run `node devdash/scripts/check.mjs` and clear what it lists. |
| The phase or a blocker changes | Update `docs/KB_8_Current_State.md`; the Today page reads it. |

Three of these are also enforced mechanically, because a rule that must always hold belongs in a hook. `devdash/scripts/hook-session-start.mjs` prints the digest. `devdash/scripts/hook-stop.mjs` sends you back once when the owner has just submitted or finished something, once for each newly uncovered `visual` row, and at most every `logNudgeMinutes` when today has commits and the log entry is missing or behind. Treat a hook message as an instruction to do the upkeep now, not as something to report to the owner. The question-run trigger has no hook, because counting open decisions in prose cannot be done reliably; it rests on you.

## Processing results

`results.mjs` prints the owner's answers and results, and for each sitting the exact ledger edits to make.

1. **Answers.** Record each ruling where it belongs: the `Decision | Choice | Reasoning | Date` table of the live spec, or `docs/KB_1_Architecture.md` if it outlasts the phase. Say in the reasoning whether the owner took your recommendation. A note overrides a pick where they conflict; ask about anything ambiguous, and only about that. Then set the run to `"status": "archived"` with a one-line `"outcome"`.
2. **Sittings.** For each smoke ID the script says to close, set that row's Status to exactly the printed text, `Passed <date> (sitting <id>, <owner>)`. Nothing else closes a row:

   | The owner marked | The linked row |
   |---|---|
   | Pass on every step that names it, in a finished sitting | `Passed <date> (sitting <id>, <owner>)` |
   | Fail on any step | Stays as it is. Open a finding with the owner's note and screenshot paths; fix, then write a new sitting for the re-test. |
   | Skip, or no result | Stays as it is. At release it ships as `Unverified at ship`. |

   A pass whose note describes a problem is the owner's to resolve: ask, do not close. Your own reference screenshot, a "looks good" in chat and a positive-sounding note are not passes. Then set the sitting to `"status": "closed"` with an `"outcome"`.
3. Commit, run the `--ack` command the script printed, and tell the owner in a line or two what you recorded and where.

The ledger is the committed record, which is why you copy outcomes into it: results under `devdash/.data/` are local and gitignored, and a verification record must never live only there.

## Writing for the owner

Question runs, sittings and log entries are read by a project manager, often on a phone. Plain words, no file paths or hashes in the text, one idea per sentence. Mark anything that is a sample with `"example": true`.

A broken definition is not shown to the owner at all. The edit hook checks the schema when you save; if it reports a problem, fix it then.

Do not add a page by hand or type a number into one. A new kind of page needs a source: a file with a schema, or a route in `devdash/project.mjs` that reads one.
