# One repository for the whole app

How a product with a web client, an optional mobile client and a database-backed backend is laid out in this project, and the rules that make one repository work. Each rule carries its reason, because a rule without one gets dropped the first time it is inconvenient.

The first two parts hold for any backend. Anything tied to a particular stack is in the last part, so a different stack replaces that part and nothing else.

## Why one repository

Splitting web, mobile and backend into separate repositories looks tidy and costs more than it saves. One project that ran the split for three months measured it before merging:

- database types were copied by hand from the web repository into the mobile one, and drifted: more than fifteen live breaks, one of which shipped a blank onboarding step to production;
- 36 handoff documents existed only to carry a change request across the repository boundary;
- eight pure libraries were implemented twice, each with a comment asking the next person to change the other copy too;
- one money bug: the mobile client silently destroyed billing settings on drafts the web client had created, and it was found weeks later by accident.

None of these is a tooling problem. They are what happens when a change to a shared contract cannot be made, reviewed and checked in one place. So the default here is one repository for every surface of the product.

## Layout

```
web/            web client: its own package file, lockfile and build config
mobile/         mobile client: its own package file, lockfile and build config
supabase/       backend: migrations, server functions, database tests, seed
shared/         generated database types, plus pure code every client can compile
scripts/        release helpers; scripts/demo/ holds the demo guard, reset and seed
docs/           specs, ledgers, knowledge bases
```

Rename freely (`backend/` or `db/` for another backend, the repository root as the web client when adopting an existing web app). What matters is that each kind of thing has exactly one home and `CLAUDE.md` names it.

## The rules

**1. No workspace hoisting when clients pin different framework versions.** Each client keeps its own package file and its own lockfile, and the repository root has no workspace declaration that spans them. A hoisted install puts one copy of a shared dependency at the root. If web is on one major version of a UI framework and mobile on another, the result is two copies of the framework in one module graph, which is unsupported and fails in ways that look unrelated. Hoisting also changes what a mobile build fingerprints as its native dependencies, which can strand installed builds from over-the-air updates. Run every install, build and release command from inside the client's own directory.

**2. One source of generated database types, imported by every client.** The types are generated from the database into one file. Every client imports that file; none keeps a copy. A schema change then fails the typecheck of every client that reads the changed thing, in the same pull request, instead of in an installed build weeks later. A type-only import across directories is erased at compile time, so it needs no bundler configuration. A runtime import from `shared/` does need the mobile bundler told about the extra directory, and code there must compile under every client's compiler settings, so move runtime code into `shared/` one module at a time.

**3. One repository is not one deploy.** A commit is atomic; a release is not. The web client updates when its host builds. The backend updates when someone pushes a migration or deploys a function. A mobile build stays on a user's phone until they update it. So every backend change must keep working for the oldest mobile build still installed: add before you remove, keep the old function signature alive until the last build that calls it is gone, and treat a dropped or renamed column as a two-step change with the destructive step waiting on client adoption. A green typecheck on the current mobile source says nothing about the build already in someone's pocket.

**4. "Merge is deploy" is true only for what the host builds.** If the web host builds on merge, then merging deploys the web client and nothing else. A server function or migration changed in the same pull request is not live until it is deployed by its own step. Decide what a merge deploys from the list of changed paths, never from the pull request's title.

**5. Each client has its own `CLAUDE.md`.** The root `CLAUDE.md` holds what is true for the whole product. `web/CLAUDE.md` and `mobile/CLAUDE.md` hold what is true only there: commands, framework version, release procedure, client-specific traps. A nested file loads only when work happens under its directory, so mobile release detail does not tax every web session.

**6. One client's tooling excludes the others.** A linter, test runner or bundler configured with a broad glob at the root will sweep in the other client's files. One project's web linter picked up 688 mobile files and 150 new errors the day the clients were merged. Add the other clients' directories to each tool's ignore list, and confirm with a count of files checked before and after.

**7. Typecheck with the command that actually checks something.** A bare typecheck at a root whose config lists no files reports zero errors on any tree. Each client's typecheck command names that client's own config and runs from its directory with its own compiler. Prove the command once by planting a type error and watching it fail. `CLAUDE.md` records the proven command for each client.

**8. Hosting skips builds for changes that cannot affect it.** A mobile-only commit should not rebuild and republish the web client. Hosts offer an ignore command for this. Be careful with it: the commonly quoted form (`git diff --quiet <old> <new> -- mobile`) is inverted. It exits 0 when `mobile/` did not change, and on the hosts checked exit 0 means skip, so it skips every web-only commit and builds every mobile-only one. Before relying on any ignore command, look up which exit code means skip on your host, write the command so that every ambiguous case builds (no cached commit, same commit, a commit missing from the clone), and prove it with two real commits: one that must build and one that must skip. A wrongly skipped production deploy is silent.

**9. Every spec carries a verdict for every client.** A spec has a `## Clients` section with one line per client surface: built in this change, owed (with a ledger ID), or not applicable (with a reason). Owed items go in `docs/PARITY_LEDGER.md`. This is checked when the spec is locked; the check is in `.claude/rules/app-spec-checks.md`. The point is that "we will do mobile later" becomes a row someone can count instead of a sentence nobody can find.

**10. One working tree per session.** Sessions that used to run in separate repositories now share one. A checkout or reset in one session changes files under the other. Use a separate git worktree for each line of work.

**11. Uniqueness is checked where branches meet.** Two branches built in parallel can each create a migration with the same version prefix, and neither review can see the other's file. Check for duplicate prefixes on the merged result (the CI workflow does), not inside either branch.

## What one repository does not fix

- **Deploy skew.** Rule 3 is a discipline, not a property of the layout. What the single repository adds is that a contract break shows up as a failed typecheck in the same pull request.
- **Parity lag.** Features owed to the second client are a question of time and priority. The ledger makes the debt visible and cheap to coordinate. It does not build anything.
- **Shared code is smaller than it looks.** Clients differ in data fetching, navigation, styling and compiler strictness. Expect to share the generated types, constants and a handful of pure functions, and little of the feature code.
- **What a typecheck cannot see.** Behaviour, copy, the meaning of an enum value, the shape of a server function's response when the client types it at the call site, column names inside string queries, permission changes, feature flags. Contract typecheck catches renamed and removed things. The rest needs the parity verdict and smokes.

## What stays in a separate repository

A marketing site. It deploys on its own schedule, is edited by different people, shares no database contract with the app, and a mistake in it must never be able to block or trigger an app release. Keep it apart, and record in `CLAUDE.md` where it lives. The test for anything else proposed for a separate repository is the same: a wholly separate release schedule, a separate audience, and no shared contract. If it reads the database types, it belongs here.

## Environments

| Environment | What it is | Who may write to it |
|---|---|---|
| local | A disposable stack on the developer's machine. Reset freely. | Anyone, any time. |
| demo (optional) | A hosted copy on its own hosting and database projects, with invented data, third parties in test mode and a nightly reset. Work lands here first. | Any agreed run. |
| production | Real users, real money, real messages. | Only on an explicit go that names production. |

A demo environment is opt-in. `docs/DEMO_ENVIRONMENT.md` says when it is worth having, what makes it safe, how the reset works and how it fits the release flow; the guard and reset scripts are in `scripts/demo/`. Where one exists:

- **Demo is the default target.** A go that does not name an environment means demo. A pass on demo is evidence for a release, never the go for one.
- **Destructive tooling runs behind the guard.** Anything that resets, seeds, wipes or bulk-writes calls `scripts/demo/guard.mjs` before it opens a connection. The guard requires positive identification of demo, because "not production" is also true of a typo.
- **Demo data never contains a real person's contact details**, and outbound messages on demo are captured instead of sent.

Where there is no demo environment, production is the only hosted target: every release needs a go that names it, and every service-boundary smoke is run there straight after release.

**Previews are whatever their configuration says they are.** A preview deploy that inherits production settings is one click from charging a real card. If any non-production surface can reach production services, fill in `docs/prod-action-safety-map.md` and read it before clicking through a review.

**Fixtures live in seed files and loaders, never in migrations.** Migrations run in production. See `.claude/rules/database.md`.

## Stack-specific parts

Everything above is stack-neutral. These parts of the pack assume Supabase (Postgres with row-level security, server functions, a CLI that generates types), a React web client and an Expo mobile client. To use another stack, replace them and leave the rest:

| Part | Assumes | Replace with |
|---|---|---|
| `/db-push`, `/gen-migration` | Supabase CLI, `supabase/migrations/` | Your migration tool's list, apply and generate-types commands, and its directory. |
| `/audit-rls` | Postgres row-level security | The audit of wherever your authorisation lives: policies, middleware, resolvers. Keep the refutation step. |
| `/deploy` | Supabase server functions, a host that builds on merge | Your backend's deploy command and a way to read back the deployed version. |
| `/gen-component` | A component-based UI client | Usable as is for most UI stacks. |
| `.github/workflows/app-ci.yml`, database job | Supabase local stack | Your database's CI service and test runner. |
| Hook checks | Numbered `.sql` files in a `migrations/` directory | Adjust the path pattern in each check. |
| `scripts/demo/examples/supabase/` | Supabase auth and schema layout, `psql` | Your database's wipe, marker and check commands. The guard and the reset script are stack-neutral. |

Supabase and Expo notes that have each cost a day when missed:

- A function deploy can print success while uploading nothing when only shared code changed. Read the deployed version back.
- A mobile over-the-air update reaches only builds whose runtime fingerprint matches. Regenerate the fingerprint before publishing and compare it with the installed build's.
- A mobile build and a mobile update can read environment variables from different places. Check both before a release.
- On Netlify the form that builds in every ambiguous case is: `[ -n "$CACHED_COMMIT_REF" ] && [ "$CACHED_COMMIT_REF" != "$COMMIT_REF" ] && git diff --quiet "$CACHED_COMMIT_REF" "$COMMIT_REF" -- . ':(exclude)mobile'`. Prove it on your own site before trusting it.
