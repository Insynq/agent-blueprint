# Demo environment

A demo environment is a hosted copy of the app, on its own hosting project and its own database, filled with invented data and put back to a known state every night. It is optional. This document says when it is worth having, what makes it safe, how the nightly reset works, and how it fits the release flow and the smoke lanes. The scripts it refers to are in `scripts/demo/`, with their own `README.md`.

The first seven sections hold for any stack. Supabase and hosting specifics are in two marked sections near the end. The practices here come from two projects that each ran a demo environment for months; where they did it differently, the difference and the recommendation are stated.

## When it is worth it

What it buys is a short path from "built" to "the owner has seen it work". The owner opens a link on any computer or a phone, signs in with a role-named account and clicks through, with no local stack, no VPN and no fear of touching a real customer. Reviews that waited for a session at a desk happen the same day.

Set one up when most of these are true:

- the product has an interface a person must look at, and that person is not always at the development machine;
- there is more than one role, so testing means signing in as several people;
- the product moves money or sends messages, so clicking around production is not an option;
- work should be seen before it is merged to the branch that deploys production.

Skip it when the project is a library, a CLI or a single-user tool; when there is no production yet (the hosted environment you have is the demo, so treat it as one and add production later); or when nobody will look at it weekly. An unused demo still costs the upkeep below, and a stale one is worse than none because a pass on it means nothing.

What it costs to keep, from the two projects: a day or two to set up (one went from decision to live in two days); a second hosting project (no fixed cost recorded on either) and a second database project (free tier on one project, roughly ten dollars a month of compute on the other); an extra step on every migration; and attention whenever the nightly reset goes red. The free-tier database was undersized for the reset's burst of writes and timed out for about two weeks before the cause was found, and free projects pause when idle unless something touches them daily. Budget for the smallest paid size if the reset drives real application code.

## The shape

```
local        developer machine, disposable stack                     anyone, any time
demo         own hosting project + own database project, invented    the default target
             data, third parties in test mode, reset nightly
production   real users, real money, real messages                   only on a go that names it
```

Demo has its own of everything that holds state or identity: hosting project, database project, API keys, storage, payment account, webhook endpoints, sign-in redirect list, domain. Nothing is shared with production except the code.

**Which branch deploys to demo.** Two workable choices:

| | Deployed from the default branch | Deployed from a long-lived `demo` branch |
|---|---|---|
| How work gets there | Merging. Demo and production build from the same commit. | Merging the work's branch into `demo`. The default branch is untouched. |
| Good for | Sales demos and training on what is already live. No drift. | Reviewing work before it is merged, which is the point for most projects here. |
| Cost | Cannot show unmerged work. The demo database lags unless someone pushes migrations to it after each merge. | `demo` drifts from the default branch. Migrations applied to demo in review order may need renumbering before production. The eventual merge is large. |

Both projects ended on a long-lived branch, one after starting on the default branch. Recommended: a long-lived `demo` branch when merging to the default branch deploys production (so that "show me first" is possible), and the default branch otherwise. Keep the drift small: `demo` is the default branch plus the branches under review and nothing else, nobody commits to it directly, and it is rebuilt from the default branch after each production release.

Whichever you choose, **the reset runs the seed from the tree demo is built from.** A scheduled workflow runs from the default branch, so the workflow checks out the demo branch (the repository variable `DEMO_RESET_REF`) before it runs anything. One project first required seed changes to land on the default branch and reversed that: a seed for a feature under review needs that feature's schema, so it has to travel with the feature. The failure this prevents runs both ways. A seed edit that existed only in a local checkout was silently undone every night until someone noticed.

## What must be true for it to be safe

Demo is safe when it cannot reach production data, real money or a real person, by construction and not by care. Each line is something to verify, not assume:

- **Separate credentials everywhere.** No production key, password or token exists in demo's hosting settings, function secrets, CI secrets or stored configuration. Demo keys live under their own names (`DEMO_*`) in the secret manager.
- **Nothing in the code falls back to production.** Search for the production host name, project reference and domain. Both projects found one: a database function with the production URL hard-coded, and stored configuration that migrations seeded with the production URL. On demo these would have called production with demo's key. Make the value come from configuration, and make the reset re-assert it.
- **Payments in test mode, on an account that is only demo's.** Use the provider's sandbox or a separate test account, not test mode of the live account shared with local development: one project started there and moved, because local test traffic mixed into demo data. Point the provider's webhooks for that account at demo. If the code can assert the mode it expects (a test-mode key prefix), make it assert.
- **Outbound email and messages are captured, not sent.** The switch sits at the send call, not in the interface, because a demo user can type any real address into a form. With capture on, the sender stores the full message (recipient, subject, body) where a person can read it, and returns the same success the caller expects. Demo is also given no provider key, so a sender that missed the switch fails instead of delivering. Do the same for text and push; one project found its push sender had no switch.
- **No real contact details in seed data.** Invented names, numbers from a range reserved for fiction, and addresses at a domain that cannot receive mail. The hook check `demo-seed-real-email` blocks a real-looking address in a seed file. This includes less obvious fields: reply-to, cc and bcc defaults, and support inboxes. One project's captured demo mail carried real people's addresses in cc until those were moved into configuration.
- **Seeding does not send.** Loading data fires the same triggers as real use. Hold the queue's dispatcher off while the seed runs and mark what it queued as handled, or the first scheduled worker after the reset sends a burst.
- **Analytics and error reporting do not report as production.** Leave tracking pixels and the production error-reporting key off demo, or tag the environment.
- **It says it is demo.** A fixed banner and a title prefix, driven by one build variable that production never sets. People act on what they believe they are looking at.
- **Previews are not demo.** A preview deploy inherits whatever its host gives it. One project's previews pointed at the production database and live payments, which is why `docs/prod-action-safety-map.md` exists. Turn previews off, or give them an empty environment.

`docs/prod-action-safety-map.md` has a row for what each environment can reach. Fill in demo's row from probes when demo is set up, and again after any change to secrets.

## The daily reset

**What it is for.** Testing changes data. Without a reset, every sitting starts from whatever the last one left, steps like "sign in as the new user who has done nothing yet" stop being possible, and a shared password someone changed stays changed.

**Mechanism.** Three options:

| Option | What it does | Verdict |
|---|---|---|
| Drop and re-migrate | The platform's reset: drop everything, replay every migration, seed. | Not on a hosted project. It also drops the marker, stored secrets and anything set by hand, and it only works if the whole migration chain replays from empty, which one project found it did not. Good locally, where it is the test of exactly that. |
| Restore a snapshot | Record every table's contents once, straight after migrations and before any account exists. Each night truncate and refill from the snapshot, then seed. | What one project did. Covers a new table without anyone remembering to, and refuses to run when a migration has landed since the snapshot. The price is a re-snapshot step in every migration push to demo. |
| Truncate and reseed | Truncate every app table except a short keep list of reference tables, delete sign-in accounts, then seed. | What the other project did. Least machinery. The keep list must be maintained, and deleting accounts with cascade emptied kept tables that referenced them until those were saved and restored around the wipe. |

Recommended: **truncate and reseed in one transaction**, with a keep list, when migrations create only a handful of reference rows (this pack's rule is that migrations carry nothing else). Move to the snapshot when the reference data is large or changes often. In both, the wipe is one transaction, so the database is either fully wiped or untouched, and the reset never applies migrations on its own.

`scripts/demo/reset.mjs` runs the sequence. The project supplies the commands in `scripts/demo/reset.config.json`:

1. **Guard** (`scripts/demo/guard.mjs`). Compares the target, each connection string and each key against the demo value and the production value recorded in `scripts/demo/environments.json`. It refuses if either value is missing, if anything matches production, or if the target is not positively demo. "Not production" is not enough, because a typo is also not production.
2. **Pre-check.** A query that only the demo database can answer: a marker row, created once by a person, in a schema the wipe never touches. Production has no such table, so a wrong connection string fails here even when every variable agrees with every other.
3. **Wipe, migrate, seed.** In that order, stopping at the first failure. Read every input and check it before the first destructive command; one project's first version emptied file storage and then refused to continue.
4. **Post-check.** A count of something only a finished seed produces. The reset has worked when this matches, not when the commands exited 0.
5. **Marker.** The time the reset finished, written only after the post-check passes.

A guard is unproven until you have watched it refuse. `node scripts/demo/guard.mjs --selftest` runs its refusal cases; also run it once by hand against the production reference and keep the refusal.

**Arming.** The workflow `.github/workflows/demo-reset.yml` does nothing on its schedule until the repository variable `DEMO_RESET_ARMED` is `true`, and a manual run in `reset` mode needs it too; only the `check` and `dry-run` modes, which write nothing, run unarmed. Arm it only after a full reset from your own machine and a `check` run of the workflow have both been read. Disarm it before a demo that must not be disturbed, and when tearing demo down. One project armed by variable; the other's workflow went live the moment it was merged, so the merge had to be held back until demo was ready. Use the variable.

**A predictable time.** People sit in front of demo. A reset in the middle of a sitting signs them out, discards their progress and replays the seed under them. So the reset has a fixed local hour that everyone knows, in the small hours, and it must not run at any other time on its own. The scheduler cannot be trusted with this: one project's scheduled runs started three to nine hours late, a window keyed to the clock time missed ten nights of thirteen, and a run mis-labelled by the scheduler wiped demo during a live session. So the script decides, not the cron line: with `--auto` it resets only inside the configured night window and only once per night, using the marker. Several ticks a night then cost nothing, and a late one does nothing. Tell the owner the reset hour, record it in `CLAUDE.md`, and warn before any manual reset.

**What survives and what does not.**

| Gone after a reset | Still there |
|---|---|
| Everything anyone did on demo: records, uploads, edits to content | The schema and whatever migrations created |
| Sign-in sessions (accounts are recreated, so everyone is signed out) | Reference tables on the keep list, including feature flags stored there |
| Changed passwords (back to the shared one) | Stored secrets, function configuration, sign-in settings |
| Captured email older than the retention you choose (one project kept three days) | Objects in the payment sandbox, the provider's own history, platform logs |

Anything a person configured by hand in a wiped table is gone the next morning. If it should persist, it belongs in the seed or on the keep list.

## Seed data

- **Deterministic.** The same rows with the same identifiers every night, so a link saved in a sitting still works tomorrow. Dates are relative to the reset ("three days ago"), so that "overdue" stays overdue.
- **Role-named accounts.** One account per role and per situation worth testing, named for what it is: `owner@`, `member@`, `new-user@`, `member-overdue@`. Both projects settled on this, one after starting with invented personal names that did not say what they tested. The owner picks the right login at a glance, and a step in a sitting can say which one to use. Accounts with enforced multi-factor sign-in cannot be shared logins; leave those roles out or exempt demo.
- **One shared password**, held in the secret manager, passed to the seed as a variable and never written in a file. It is low value by design: it opens only invented data, and the reset restores it nightly. It must never be reused anywhere real. `docs/demo-logins.md` lists the accounts and where the password is kept, and is safe to commit.
- **Built for the smokes you run.** Each seeded situation exists because a smoke or a sitting step needs it: the empty state, the full list, the record half way through, the one that is overdue. Keep a table mapping smokes to logins in `docs/demo-logins.md`. Where the app derives a value (a progress figure, a balance), seed through the same code path the app uses so the number on screen is the number the seed intended. One project drove its seed through the real server functions for this reason.
- **Third-party objects are created once.** Sandbox payment accounts and customers are made by a setup script, their identifiers are committed, and the seed refers to them. The reset checks that the file names the sandbox account before it wipes anything.
- **In step with migrations.** A migration that adds a required column breaks the seed the next night. The seed is part of the change: update it in the same branch, and run the reset locally before the migration goes to demo.
- **Kept out of the automated test database.** Tests that pin row counts fail on a stack carrying demo data. Run the suite on a freshly reset local stack.

## Release flow

```
local  →  demo  →  production
```

| Stage | What happens | What counts as a go |
|---|---|---|
| local | Build, full test suite on a clean local stack, typecheck, lint. | None needed. This is the agent's own gate. |
| demo | Migrations pushed (`/db-push`), functions deployed, the work's branch on the demo branch (`/deploy`), then smokes and a sitting. Fixes go round again. | Demo is the default target. A go to build, or an autonomy grant that names demo, covers it. |
| production | Merge to the default branch, production migrations, production deploy, then the `live-required` smokes on production. | A go from the user that names production. Nothing else. |

**A pass on demo is evidence. It is not a go for production.** "It works on demo" answers whether the change is ready to be offered for release. Whether and when it is released is the user's decision, and they may be holding it for reasons that have nothing to do with the change. Do not merge because a sitting passed, do not describe an open pull request as blocking demo work, and do not raise production unprompted.

**Migrations reach demo by a deliberate push, before the code that needs them.** The hosting project rebuilds demo when the branch moves; the database does not follow. One project's demo interface showed a feature whose table did not exist yet. After anything lands on production, compare demo's latest applied migration with production's. When demo applies migrations in review order, a migration can end up applied on demo under a version that will sort differently on the default branch; settle the numbering before the production push, and never reach for an apply-out-of-order flag to get past it.

A production bug fix may go to production first on the user's say-so. It still lands on demo afterwards, so that demo never lacks something production has.

## How it plugs into testing

`docs/WORKFLOW.md` defines the smoke lanes. With a demo environment:

| Lane | Closed by a run on demo? |
|---|---|
| `data` | Yes for logic: permissions, constraints, a query's result on seeded rows. No for anything that depends on production's own data (a backfill, a count). |
| `wiring` | Yes. |
| `visual` | Yes, when the build on demo is the build that will be released. This is where demo pays for itself: the row is closed from a sitting. |
| `integration` | Yes across your own systems. Across a third party, see below. |
| any lane marked `live-required` | **No.** Demo talks to the provider's sandbox with demo's keys, endpoints and domain. Production's keys, webhook registration, domain verification and limits are a different configuration, and those are what fail. Record the demo run on the row as `Rehearsed on demo <date>` and leave the row open until it has run on production. |

Captured email proves that the right message would go to the right recipient with the right content. It does not prove delivery. A row about content closes on demo; a row about delivery is `live-required`.

**Sittings point at demo.** A sitting names the environment and the account, so the owner can run it from a phone with nothing installed. If the project has the devdash pack: list demo once in `devdash/config.json` under `environments` (`{ "name": "demo", "url": "https://…" }`); each `sitting.json` then carries `"environment": { "name": "demo", "url": "https://…" }`, to which a step's `where` path is joined, and `"signIn": { "as": "member@demo.test" }`, which renders as a chip that copies the login. A step that needs a different account carries its own `signIn`. The password never goes in a sitting; the owner has it from the secret manager. Write sittings so they survive the reset: start from seeded state, and do not span the reset hour.

## Setup checklist

1. Decide the branch model and the reset hour. Record both in the App pack section of `CLAUDE.md`.
2. Create the demo database project and the demo hosting project. Note the demo reference.
3. Fill in `scripts/demo/environments.json` with the demo and production values. Run `node scripts/demo/guard.mjs --selftest`, then run the guard against the production reference and watch it refuse.
4. Search the code and migrations for the production host, reference and domain. Move each into configuration.
5. Add the capture switch at the email send call and at every other outbound sender. Set it on demo. Give demo no provider key.
6. Create the payment sandbox account, its webhook endpoints and any objects the seed needs. Commit the identifiers, not the keys.
7. Apply migrations to demo. Create the marker by hand in the demo database.
8. Write the seed and `docs/demo-logins.md`. Put the shared password in the secret manager.
9. Write `scripts/demo/reset.config.json`. Run `reset.mjs --dry-run`, then `--check`, then a full reset, locally.
10. Probe what demo can reach and fill in demo's row in `docs/prod-action-safety-map.md`.
11. Add the repository secrets and variables, run the workflow by hand in `check` mode and read the log, arm it, then run it once in `reset` mode.
12. Turn off preview deploys or empty their environment. Add the demo banner.
13. Add `Rehearsed on demo` to the smoke rows demo can exercise, and write the first sitting against demo.

## Supabase specifics

- **Never link the main checkout to demo.** The CLI's link is invisible state, and the next `db push` goes wherever it points. Pass the project explicitly on every command (`--project-ref`, or `--db-url` for a push), as one project did throughout, or do all demo work in a dedicated worktree with its own link, as the other did. Check `supabase/.temp/project-ref` before any push either way.
- **Never `supabase db reset` a hosted project.** This pack's settings deny it in its linked and `--db-url` forms. Wipe with a transaction over a direct database connection: the REST interface cannot truncate or delete accounts atomically.
- **Use the session pooler connection string** for the reset. CI runners are IPv4, and the direct host may not be.
- **Storage objects are emptied through the storage API.** Deleting rows from the storage tables is blocked on hosted projects.
- **Deleting accounts cascades.** Rows in kept tables that reference an account go with it or block it. Check the keep list against foreign keys to the auth tables.
- **Stored configuration that holds a URL** (a secret in the database that scheduled jobs and functions read) must hold demo's URL, and the reset should assert it before the seed can dispatch anything.
- **Database scheduled jobs run on demo too.** They will see the fresh seed and queue reminders and digests. That is a useful rehearsal with capture on, and a real send without it.
- **Auth settings are per project.** Set demo's site URL and redirect allow-list to the demo domain; check captcha and sign-up settings instead of assuming they match production.
- **Function deploys** take `--project-ref`. A function with no configuration entry can deploy with a different token-verification setting than production's; compare after deploying.
- Example commands for all of this are in `scripts/demo/examples/supabase/`. They are examples to edit.

## Hosting specifics

- **A second project on the same repository**, with its own environment variables and domain. On hosts that allow it, set that project's production branch to `demo` and add an ignore command so it builds only that branch. Never add demo's domain or variables to the production project.
- **Anything the host reads from a committed config file applies to both projects.** One project had a redirect to a production URL in that file, which a second site cannot override; it became a build step that derives the target from the environment.
- **Build-time flags belong in the host's environment settings.** A flag passed only on a manual build command disappears on the next automatic rebuild, and a sitting then opens on the wrong interface.
- **If you deploy by hand, lock the deploy** so an automatic build does not replace it, and write down which commit is live.
- **CORS and redirect allow-lists name the demo domain only.** The host's default subdomain is then refused, which is correct; test on the real demo domain.

## What went wrong, in one list

Each of these happened on one of the two projects:

- A seed change that lived only in a local checkout was undone by every nightly reset.
- A scheduled reset ran during a live session because the scheduler mis-labelled which cron line fired. A fix keyed to the clock then missed most nights because runs started hours late.
- A blanket retry re-ran a reset that had finished and wiped a complete demo. Retry a broken run, never a finished one.
- The first reset emptied file storage, then refused to continue on a missing input.
- Deleting accounts with cascade emptied reference tables the reset meant to keep.
- Migrations created sign-in accounts with real people's addresses and a known password on every fresh database. (The hook check `migration-no-fixtures` now blocks this.)
- A migration hard-coded the production function URL; stored configuration was seeded with the production URL.
- Real addresses appeared in captured mail through cc and reply-to defaults.
- Demo's database fell behind demo's interface after merges, because nothing pushes migrations automatically.
- A migration asserted values that had been hand-edited in production, so it failed on a fresh database.
- The free-tier database was too small for the reset; runs timed out for about two weeks before the cause was found.
- CI stopped running for a billing reason and the reset silently stopped with it. Alert on a reset older than two days, not only on a failed one.
- A changed shared password took effect only at the next reset, and that reset signed out the person who asked for the change.
- A service key was printed into a session transcript and had to be rotated.
