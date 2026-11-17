# Demo scripts

The reusable parts of a demo environment: a guard that refuses anything that is not demo, a reset that puts demo back to a known state, and the workflow that runs it nightly. Why and when to use them is in `docs/DEMO_ENVIRONMENT.md`. This file is how.

| File | What it is | Who edits it |
|---|---|---|
| `guard.mjs` | Refuses unless the target is positively demo and not production. No dependencies. | Nobody. It reads `environments.json`. |
| `reset.mjs` | Guard, pre-check, wipe, migrate, seed, post-check, in that order. | Nobody. It reads `reset.config.json`. |
| `environments.json` | The demo value and the production value. Identifiers, not secrets. Committed. | You, once. |
| `reset.config.json` | The project's commands for each step. Does not exist until you write it. | You. |
| `examples/supabase/` | An example config, an example wipe and the marker setup for a Supabase project. | Copy, then edit the copy. |
| `seed/` | The project's seed files. Does not exist until you write them. | You. |
| `.github/workflows/demo-reset.yml` | Nightly schedule and manual runs. | You: the env block and the Tools step. |

## Set up

1. **Say what demo and production are.** In `environments.json`, replace the two placeholders with the demo and production project references (or host names). List the environment variables that hold connection strings under `connectionEnv` and those that hold keys under `secretEnv`. The guard refuses to run until both values are real.
2. **Prove the guard.**
   ```
   node scripts/demo/guard.mjs --selftest
   DEMO_CONFIRM=1 node scripts/demo/guard.mjs --target <production reference>    # must refuse, exit 3
   DEMO_CONFIRM=1 node scripts/demo/guard.mjs --target <demo reference>          # must pass
   ```
3. **Create the marker** in the demo database, by hand, once (`examples/supabase/demo-ops-setup.sql` for Supabase). Never in a migration: migrations run in production.
4. **Write the config.** Copy `examples/supabase/reset.config.json` to `scripts/demo/reset.config.json`, edit every command, replace each `EDIT-ME`, and delete the `"example": true` line. Copy `examples/supabase/wipe.sql` somewhere of your own and edit its keep list. Refer to secrets as `"$NAME"`; never write one into the config.
5. **Rehearse.**
   ```
   export DEMO_CONFIRM=1 DEMO_TARGET=<demo reference> DEMO_DB_URL=… DEMO_LOGIN_PASSWORD=…
   node scripts/demo/reset.mjs --dry-run     # prints the guard verdict and every command; runs nothing
   node scripts/demo/reset.mjs --check       # guard and pre-check against the real database; writes nothing
   node scripts/demo/reset.mjs               # the real thing
   ```
   To rehearse against a local stack, set `DEMO_TARGET` to its URL and `DEMO_ALLOW_LOCAL=1`.

Any script of your own that writes to demo starts the same way:

```js
import { guardOrExit } from './guard.mjs';
guardOrExit();   // exits unless the target is demo
```

or, from a shell script, `node scripts/demo/guard.mjs --quiet || exit $?`.

## Arm the nightly reset

In the repository's settings, under secrets and variables for Actions:

| Name | Kind | Value |
|---|---|---|
| `DEMO_TARGET` | Variable | The demo reference, the same value as `demo` in `environments.json`. |
| `DEMO_RESET_REF` | Variable, optional | The branch demo is deployed from, when that is not the default branch. The reset runs that branch's seed. |
| `DEMO_RESET_ARMED` | Variable | `true` to arm. Anything else, or absent, and scheduled runs and manual resets do nothing. |
| `DEMO_DB_URL` | Secret | Demo's database connection string. |
| `DEMO_API_URL` | Secret, optional | Demo's API URL, if the seed calls it. |
| `DEMO_SERVICE_KEY` | Secret, optional | Demo's server-side key, if the seed calls the API. |
| `DEMO_LOGIN_PASSWORD` | Secret | The shared password the seed gives every demo account. |

Rename or add to match your config; keep the `env` blocks of the workflow's Guard and Reset steps identical, and list each new name in `environments.json` so the guard checks it.

Then, in order: run the workflow by hand with mode `check`; run it with mode `dry-run` and read the commands; set `DEMO_RESET_ARMED` to `true`; run it with mode `reset` and read the log; leave it armed. Set the cron line to an hour inside the `window` in `reset.config.json`, remembering that the cron is UTC and the window is in your time zone.

To disarm, set `DEMO_RESET_ARMED` to anything else. Do it before a demo that must not be disturbed.

Scheduled runs call `reset.mjs --auto`, which resets only inside the window and, when a `marker` is configured, only once a night. With a marker you can add an hourly cron line across the window so a late or missed tick is caught by the next. Without one, keep a single cron line.

## Exit codes

| Code | From | Meaning |
|---|---|---|
| 0 | both | Passed, or `--auto` found nothing to do. |
| 1 | both | The script itself failed. |
| 2 | guard | Refused: a required value is missing or still a placeholder. |
| 3 | guard | Refused: production. Stop and find out why before trying again. |
| 4 | guard | Refused: the target is not positively demo. |
| 10 | reset | The config is missing, invalid or still the example. |
| 11 | reset | Pre-check failed. Nothing was changed. |
| 12 | reset | A wipe, migrate or seed command failed. Demo may be half built. |
| 13 | reset | Post-check failed. The commands succeeded but demo is not in the expected state. |
| 14 | reset | The reset passed but the marker could not be written. |

## Add a seed account

1. Add the account to the seed, named for its role or situation (`member-overdue@demo.test`), at a domain that cannot receive mail. The hook check `demo-seed-real-email` refuses a real-looking domain in anything under `scripts/demo/seed/` or named `demo-seed`. If the project uses a demo subdomain of its own with no mail delivery, list it under `seedEmailDomains` in `environments.json`.
2. Give it the shared password from `$DEMO_LOGIN_PASSWORD`. Never a literal.
3. Seed the rows that put it in the situation its name promises.
4. Add a row to `docs/demo-logins.md`, and to the smoke map there if a smoke uses it.
5. If the post-check counts accounts, raise the number in `reset.config.json`.
6. Run the reset locally (`DEMO_ALLOW_LOCAL=1`), then on demo. Sign in as the new account.

On Supabase, accounts are created through the auth admin API with the server-side key (create the user with the email already confirmed), or by inserting into the auth tables from the seed SQL. The two projects this comes from used one each. Prefer the API: it keeps working when the auth schema changes.

## What has and has not been tested

`guard.mjs` and `reset.mjs` are tested by the framework: the guard's self-test, and the reset run end to end with stand-in commands, including a failing step, a failing pre-check and a failing post-check. The workflow file is checked to parse as YAML; it has not been run on GitHub by the framework, so its first manual `check` run is its test. The SQL under `examples/supabase/` has not been run against a database by the framework. Read it, run it on a local stack first, and treat the first `--check` on demo as its test.
