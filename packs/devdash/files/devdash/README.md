# Dev dash

A local dashboard for the person who decides and verifies while agents build. It answers three things: where the project is, what is waiting on you, and what happened lately. It is also where you do your part: answer decisions by clicking, and run manual tests as timed, guided sittings.

It is not the product. It runs on your machine, is private by default, and is kept out of every deploy.

```
node devdash/server.mjs            # http://localhost:4317
node devdash/scripts/start.mjs     # the same, in the background, with a status line
```

Node 18 or later. No install, no build step, no dependencies, no external assets.

## The four rules

1. **Pages are derived, never maintained.** Every page is computed from the repository when you open it: the smoke ledger, specs, the parking lot, the changelog, the current-state doc, git, and the pull request list. Nobody types a status or a number into the dash. If a source cannot produce a number, the page says so.
2. **The agent writes definitions; the owner writes answers.** The agent creates question runs, sittings and log entries. The owner's answers, results, notes and screenshots are the owner's: the agent reads them and never edits them.
3. **Answers come back as data, and come back by themselves.** A decision is an option key. A test result is pass, fail or skip against a step. Hooks tell the agent when there is something new; the owner never has to say "I finished".
4. **Local and private.** Bound to 127.0.0.1. From another device, everything needs a token.

## Pages

| Page | What it shows | Read from |
|---|---|---|
| Today | Where the project is, what waits on you, what the agent still owes the dash, the last few days | everything below |
| Questions | Decision runs: one card per question, options as rows, the recommendation marked | `devdash/questions/*.json` |
| Sittings | Guided manual tests with a clock, Pass / Fail / Skip, notes and screenshots | `devdash/sittings/<id>/sitting.json` |
| Smoke tests | Open, deferred (with due dates), failed and passed rows, grouped by lane, with the sitting that covers each | `docs/smoke-tests-pending.md` |
| Daily log | One entry per day: the agent's plain summary over facts read from git | `devdash/log/<date>.md`, git, the ledger, the journal |
| Specs and branches | Specs with their lock status, open pull requests, checkouts, branches | `docs/plans/*/spec.md`, git, `gh` |
| Parking lot | Open, adopted and dropped items | `docs/PARKING_LOT.md` |
| Metrics | Counters, gauges and events the project sends | the ingest endpoint |
| Project pages | Anything you add | `devdash/pages/*.html` |

Pull requests need the GitHub CLI (`gh`), signed in. Without it that one table says why it is empty and everything else works.

## Where data lives

```
devdash/
  server.mjs, lib/, public/, scripts/   the dash itself (framework-managed)
  config.json                           project settings (yours)
  questions/<id>.json                   question runs          committed
  sittings/<id>/sitting.json            sittings               committed
  sittings/<id>/<ref>.png               reference screenshots  committed
  log/<yyyy-mm-dd>.md                   daily log entries      committed
  pages/*.html, project.mjs             project pages          committed
  .data/                                the owner's data       local, gitignored
    answers/<run>.json
    sittings/<id>/results.json
    sittings/<id>/shots/                screenshots the owner added
    trash/                              screenshots the owner removed
    journal.jsonl                       one line per owner action, append-only
    agent-cursor.json                   how far the agent has read the journal
    metrics.jsonl, token, metrics-token, server.json, server.log
```

**Why definitions are committed.** They are the agent's work product, they are worth reviewing, and a new worktree or a fresh clone must have them. A definition excluded from git does not exist in the next checkout.

**Why the owner's data is not.** Screenshots are large, show test accounts and unfinished screens, and change constantly; the journal is a notification log. None of it belongs in the product's history. The cost is that `.data/` exists on one machine only, so:

**The verification record is copied into git by the agent.** A record of what was verified must never live only in a gitignored file. When the owner passes a step, the agent writes the outcome into `docs/smoke-tests-pending.md` as `Passed <date> (sitting <id>, <owner>)`. When the owner answers a question, the agent writes the ruling into the spec's decision table or `docs/KB_1_Architecture.md` and archives the run with an outcome line. After that, losing `.data/` loses screenshots and timings, not decisions or evidence.

To keep history of the owner's data as well, point `DEVDASH_DATA` at a folder in a private repository of its own.

**Worktrees.** There is one dash and one data folder per project, however many worktrees exist. Every script resolves the main checkout through git and uses its `devdash/.data/`, so a session in any worktree sees the same answers and starts the same server.

**Which version of the project is shown.** Project docs (the ledger, specs, parking lot, changelog, current state) are read from the remote default branch (`origin/main` or whatever `origin/HEAD` names), fetched every ten minutes, because a checkout lags and may be on any branch. With no remote they are read from the main checkout's files. Definitions are gathered more widely, because the owner must be able to act on them before a merge: the main checkout's copy wins when it has uncommitted or unpushed changes, the remote's copy wins when the checkout is merely behind, and any other worktree adds definitions neither has. The sidebar says what is being read. Set `"readRef": "worktree"` in `config.json` to read everything from the main checkout's files instead, or name a ref.

## Settings

`devdash/config.json`:

| Key | Default | Meaning |
|---|---|---|
| `project` | folder name | Name shown in the sidebar |
| `owner` | empty | Name written into attributions, such as `Passed … (sitting …, <owner>)` |
| `port` | 4317 | Give each project its own |
| `environments` | `[]` | `[{ "name": "demo", "url": "https://…" }]`; what sittings run against |
| `readRef` | `auto` | `auto`, `worktree`, or a git ref |
| `autostart` | `true` | Start the server when an agent session starts and it is down |
| `logNudgeMinutes` | 90 | How often the agent may be sent back to update the daily log; 0 for never |
| `idleDays` | 3 | A started sitting untouched this long is flagged on Today |

Environment: `DEVDASH_PORT`, `DEVDASH_DATA`, `DEVDASH_REF`, `DEVDASH_BIND`, `DEVDASH_MAX_UPLOAD` (bytes, default 10 MB), `DEVDASH_NO_FETCH`, `DEVDASH_NO_AUTOSTART`, `DEVDASH_NO_NUDGE`.

## Question runs

One JSON file per run, `devdash/questions/<yyyy-mm-dd>-<slug>.json`, written by the agent when three or more decisions wait on the owner.

```json
{
  "id": "2026-03-04-checkout",
  "title": "Checkout: three things the code check turned up",
  "date": "2026-03-04",
  "status": "active",
  "outcome": "",
  "intro": "What prompted these and what is already settled.",
  "groups": [{ "key": "pay", "title": "Payments" }],
  "questions": [
    {
      "id": "P1",
      "group": "pay",
      "question": "Should a zero-total order ask for a card?",
      "context": "Why it matters and what is already known. Short lines.",
      "options": [
        { "key": "A", "label": "Skip the card step", "detail": "Free orders go straight to Place order." },
        { "key": "B", "label": "Always ask", "detail": "One flow, but people abandon free orders at the card form." }
      ],
      "recommend": "A",
      "reason": "Nothing is charged, so the form only costs completions."
    }
  ]
}
```

- `id` equals the file name. `status` is `active` or `archived`; an archived run needs an `outcome` line and becomes read-only.
- Two to six options, each an object with a one-capital-letter `key`. Bare strings are refused.
- `recommend` must be one of the keys and needs a `reason`. Omit both when the agent has no view.
- `groups` and `group` are optional. At most 60 questions.
- `"example": true` marks a sample.

On the page the owner clicks an option or "Something else" and writes their own, adds a note to any question, and presses Submit. Everything saves as it is clicked. The answers file, written only by the dash:

```json
{
  "id": "2026-03-04-checkout",
  "owner": "Chris",
  "answers": {
    "P1": { "pick": "A", "label": "Skip the card step", "own": "", "note": "But not until the import is fixed.",
            "asked": "Should a zero-total order ask for a card?", "recommended": "A", "at": "2026-03-04T17:50:31.000Z" }
  },
  "general": "",
  "submittedAt": "2026-03-04T17:52:10.000Z",
  "changedSinceSubmit": false
}
```

`pick` is an option key, or `own` with the text in `own`. `asked` is the question as it stood when answered, so a later edit cannot change what the owner appears to have agreed to. Do not edit a run's questions once answering has begun.

## Sittings

One folder per sitting, `devdash/sittings/<feature>-<yyyy-mm-dd>-<web|phone>/`, holding `sitting.json` and any reference screenshots.

```json
{
  "id": "checkout-2026-03-05-web",
  "title": "Checkout with a waived fee",
  "date": "2026-03-05",
  "status": "active",
  "outcome": "",
  "environment": { "name": "demo", "url": "https://demo.example.test" },
  "signIn": { "as": "buyer@demo.example.test", "note": "Shared demo password, in the team vault." },
  "prerequisites": ["The demo data was reset this morning."],
  "steps": [
    {
      "n": 1,
      "title": "Free order skips the card",
      "smokes": ["CHK-1", "CHK-4"],
      "where": "/cart",
      "do": ["Add one free item.", "Press **Check out**."],
      "expect": ["No card form is shown.", "The button reads Place order."],
      "shots": [{ "file": "ref-cart.png", "caption": "Cart with one free item." }]
    }
  ]
}
```

- `id` equals the folder name. `status` is `active` or `closed`; a closed sitting needs an `outcome`.
- `environment` is required: a name, and a base URL that a step's `where` path is joined to.
- `signIn` at the top applies to the whole sitting; a step may carry its own as text. It renders as a chip that copies on click. Shared test accounts only, and never a password.
- Steps are numbered `n` from 1 with no gaps, at most 40. `do` and `expect` are required and may be a string or a list. Each `expect` line gets its own tick box.
- `smokes` on a step lists the ledger rows that step proves.
- `shots` are reference screenshots the agent captured, stored beside `sitting.json`. They show what right looks like. They are not results.

On the page: **Start** starts the clock. One step is open at a time; Pass or Skip moves to the next, Fail stays so a note can be written. Each step has its tick list, Pass / Fail / Skip, notes, and screenshots by drop, paste or file picker, each with a caption. Pause and Resume stop and restart the clock; Finish closes the sitting; Reopen undoes a finish. Keys: P, F, S, J, K.

The clock is kept by the server, not the page. The page sends a heartbeat every twenty seconds, and each one adds the elapsed time to the sitting and to the step on screen. So time and progress survive a reload, a closed tab and a server restart. A gap of more than ninety seconds between heartbeats (a sleeping laptop) counts as thirty. Twenty minutes with no click on the page pauses the sitting.

The results file, written only by the dash:

```json
{
  "id": "checkout-2026-03-05-web",
  "owner": "Chris",
  "state": "finished",
  "startedAt": "2026-03-05T17:10:02.000Z",
  "finishedAt": "2026-03-05T17:22:40.000Z",
  "activeSeconds": 731.4,
  "note": "Fine except step 3.",
  "steps": {
    "1": { "result": "pass", "checks": [true, true], "note": "", "seconds": 48.2, "at": "2026-03-05T17:10:50.000Z",
           "shots": [{ "file": "s1-20260305-101050-4a2a7d.png", "caption": "After checkout", "at": "…" }],
           "asked": { "do": ["…"], "expect": ["…"] } }
  }
}
```

The server names uploaded files itself. A removed screenshot is moved to `trash/`, never deleted.

## How results reach the agent

Nothing depends on the owner saying they are done.

1. Each owner action that matters is appended to `journal.jsonl`: answers submitted, sitting started, each step result, each screenshot, sitting finished.
2. `agent-cursor.json` records how many journal lines the agent has dealt with.
3. **SessionStart hook** (`scripts/hook-session-start.mjs`): if there are lines past the cursor it prints a short digest into the new session, and it starts the server if it is down. Silent otherwise.
4. **Stop hook** (`scripts/hook-stop.mjs`): if the owner submitted or finished something while a session was running, the agent is sent back once to process it. The same hook sends it back once for each `visual` smoke row that appears with no sitting, and at most every `logNudgeMinutes` when today has commits and the log entry is missing or behind. It is silent in linked worktrees, where build batches run.
5. The agent runs `node devdash/scripts/results.mjs`. It prints every new answer and result and, for each sitting, the exact ledger edits to make. The agent records them, commits, and runs the `--ack <n>` command the script prints, which moves the cursor.

Both hooks are offline, call no model, and give up silently after six seconds.

**The ledger rule.** The agent, not the dash, edits `docs/smoke-tests-pending.md`. A row closes as `Passed <date> (sitting <id>, <owner>)` only when the sitting is finished and every step naming that row was marked Pass. Fail and Skip never close anything, and neither does a step with no result. `results.mjs` prints the line for each row that qualifies and the reason for each that does not.

Other scripts:

| Script | For |
|---|---|
| `scripts/start.mjs [status\|stop\|link]` | Start in the background, report, stop, or print a sign-in link |
| `scripts/results.mjs [--all] [--json] [--ack n]` | Read and acknowledge the owner's answers and results |
| `scripts/check.mjs [--strict]` | Broken definitions, and what the dash is owed |
| `scripts/daily-facts.mjs [date] [--json] [--offline]` | The day's facts, for writing a log entry |

## The daily log

One file per day, `devdash/log/<yyyy-mm-dd>.md`, written by the agent:

```markdown
---
date: 2026-03-05
title: Free orders now skip the card form
---

Checkout for free orders is on the demo site and you passed it this afternoon.
One thing failed: the receipt shows a blank total. That is fixed in code and
waits for a second look. Tomorrow starts with refunds.
```

The summary is two to six plain sentences. It holds no commit hashes or file names, because the page shows the facts under it: commits, merged pull requests, changelog lines, specs locked, smokes closed, questions answered, sittings run. Those are read from the repository when the page opens, so a day with work on it is never blank even if no summary was written; it then says so. `daily-facts.mjs` prints the same facts for the agent to start from.

## Metrics

A project can send numbers to the dash. Every point needs the ingest token, which is separate from the owner's token so that a program able to send numbers cannot answer questions.

```sh
curl -s -X POST http://localhost:4317/api/metrics \
  -H "Authorization: Bearer $(cat devdash/.data/metrics-token)" \
  -H "Content-Type: application/json" \
  -d '{"name":"signups","kind":"counter","value":3}'
```

A point is `{ name, kind, value, note, at }`, or a list of up to 100. `name` is lowercase letters, digits, dot, dash and underscore. `kind` is `counter` (added up per day; the default), `gauge` (the latest value wins) or `event` (counted, with a `note`). `value` defaults to 1. Points are appended to `.data/metrics.jsonl`, which rolls over at 5 MB.

The dash listens on this machine, so the sender is usually a local script, a test run or a scheduled job on the same machine. For numbers from a hosted product, have a job on this machine fetch them and post them here; do not open the dash to the internet to receive them. To show something richer than a counter, add a project route (below) that reads your own source.

## Reaching it from another device

The server only listens on 127.0.0.1 and refuses to start on every interface. To use it from a phone or another computer, publish that port on a private network. With Tailscale:

```sh
tailscale serve --bg 4317          # https://<machine>.<tailnet>.ts.net, tailnet only
node devdash/scripts/start.mjs link
```

The second command prints a sign-in link ending in `#<token>`. Open it once on the other device; it stores a cookie for a year. Treat the link as a password. Never use `tailscale funnel` or any public tunnel for the dash.

How access is decided: a request is local only if it comes from this machine, to a loopback host name, with no forwarding header. Local requests need no token. Everything else, which includes anything a proxy forwarded, needs the token for reads and writes alike. Posts from another site's page are refused, ten wrong tokens in a minute lock that address out for the minute, and the metrics endpoint needs its token even locally.

To keep it running without an agent session, run `node devdash/server.mjs` under your system's service manager (launchd, systemd). Under launchd, set `PATH` so `git` and `gh` are found.

## File safety

Every identifier in a URL is matched against a strict pattern before it touches the disk, any path containing `..`, `%`, a backslash or a doubled slash is refused outright, and static files come from a fixed list. Uploads are capped at 10 MB, must be PNG, JPEG, WebP or GIF by their first bytes whatever the browser claims, and are named by the server. SVG is refused because it can carry script.

## Adding a project page

Two ways, both yours and untouched by framework updates.

**A page.** Put a self-contained HTML file in `devdash/pages/` (lowercase name, inline style and script). It appears in the sidebar under its `<title>`. Use this for mockups. The mockups that settled the most arguments had a "Signed in as" switcher at the top that redraws the screen for each role, a plain label saying it is a mockup with sample data, and a question run whose option keys match the layouts on offer.

**A data route.** Create `devdash/project.mjs`:

```js
export const routes = {
  '/api/project/orders': async ({ sources, config }) => {
    const text = await sources.readDoc('docs/orders-summary.json');
    return JSON.parse(text || '{}');
  },
};
```

Routes must sit under `/api/project/`, are read-only, and are loaded when the server starts. A page in `devdash/pages/` can fetch them. Keep to the first rule: a route reads a source. A page that needs numbers typed into it is the start of a dashboard nobody trusts.

## When to skip the dash

A library or command-line tool with nothing to look at and few product decisions, a project that will last a week, or an owner who is always in the session and asked one question at a time. One question in chat is fine.

## What went wrong in earlier versions

These are the reasons for the rules above, from three projects that each built one.

- **Hand-edited pages rot.** The first dashboard accepted one-off additions, grew to a 1.4 MB file nobody trusted, and was frozen.
- **Reading a working tree** showed whichever branch happened to be checked out.
- **Options written inline** ("A…, B…, C…" in a paragraph) were called terrible to read. Every choice is a row.
- **A "done" tick instead of Pass / Fail / Skip** produced a step marked done with the note "Unable to invite".
- **Unvalidated definitions** rendered as blank cards. A broken file now shows its errors.
- **Finished runs left active** piled up until the owner could not tell them apart. Archive with an outcome when the answers are recorded.
- **Asking permission to refresh.** The owner should never be asked whether the dash may be updated. That is what the standing authorisation in `.claude/rules/devdash.md` is for.
- **Building dash features on the owner's time.** Extend it when the owner is away.
- **Checking it with a syntax check.** That does not show a page that renders blank. Load it and look.
