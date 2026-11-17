---
name: deploy
description: Use when merged or ready work has to be made live on a named environment and it involves more than the web host's automatic build - server functions, migrations, or a mobile release. For migrations alone use /db-push. For landing code with its docs and commit use /ship, which calls on this for the release.
argument-hint: "[environment] [functions: a,b | all] [skip-migrations]"
disable-model-invocation: true
---

# Deploy

Arguments: $ARGUMENTS

The arguments are an optional environment name, an optional list of server functions, and the optional word `skip-migrations`, space separated. With no environment, the target is the demo environment where the project has one; where it has none, there is no default and you ask. With no function list, work out what changed.

Make every part of a change live on one environment, in an order that never leaves an installed client talking to a backend it does not understand. Done means each deployable part of the change has either been deployed and read back, or is named as not deployed with the reason, and the service-boundary smokes for what changed have been run or are listed as unverified.

Run this in the main session. It has stops that need the user.

**Stack.** Written for a Supabase backend (migrations and server functions deployed with the `supabase` CLI), a web client whose host builds on merge, and a mobile client released from its own directory. For another stack, keep the sequence and replace the function deploy command, the way of reading back a deployed version, and each client's release command, which this skill reads from `CLAUDE.md` in any case.

## Target and go

Name the environment and confirm the CLI and any release tooling point at it, as `/db-push` does. Production needs a go from the user that names production. A go for demo is not one for production, and "merge it" is not a go to deploy.

Read the App pack section of `CLAUDE.md` for whether the project has a demo environment. Where it does, the order is demo first, then production:

- **Deploying to demo.** Run `node scripts/demo/guard.mjs` before any command that writes to demo's backend. If demo is built from a long-lived branch, putting work on demo means merging its branch into that branch and pushing; nothing is merged to the default branch. After the deploy, if the change touched a seeded table or the seed, run the reset (`node scripts/demo/reset.mjs`) and read its post-check, so tonight's scheduled reset does not find out for you. Warn the user first: a reset signs everyone out of demo.
- **Deploying to production.** Before asking for the go, say whether this exact change set has been on demo, and what was observed there. A pass on demo, a finished sitting or a "looks good" is evidence the change is ready to be offered. None of them is the go; only the user naming production is. If the change has not been on demo, say so and ask whether to put it there first. A production fix may skip ahead when the user says so, and then goes to demo afterwards so demo never lacks something production has.

## 1. Work out what has to be deployed

Decide this from the changed paths and not from the pull request's title. A change described as frontend-only has shipped a server function before, and the function stayed undeployed until a smoke caught the old behaviour.

Find the last deployed point for this environment (a release tag, the host's last built commit, the changelog) and list the files changed since. Sort them:

| Changed | What makes it live |
|---|---|
| Migrations | `/db-push`. Not merging. |
| A server function's own directory | Deploying that function. |
| Code shared between server functions | Deploying every function that imports it. |
| Web client | The host's build. Confirm it built; a host configured to skip some commits can skip the wrong ones. |
| Mobile client, script and assets only | An over-the-air update, where the project uses them. |
| Mobile client, native dependencies or configuration | A new build through the store. |
| The generated types file, docs, tooling | Nothing. |

If nothing in the list needs a deploy, say so, name the range you compared, and stop.

## 2. Order

Backend first, clients after, removals last:

1. additive migrations;
2. server functions;
3. web client;
4. mobile client;
5. destructive migrations, only once the clients that read the old form are gone. A row in `docs/PARITY_LEDGER.md` with state `gates(...)` marks a step that is waiting; do not take it while the row is open.

If the change set contains a destructive migration and a client release that depends on it, the two cannot go out together safely. Stop and ask how to split it.

## 3. Migrations

Unless the arguments include `skip-migrations`, and if any are pending, follow `.claude/skills/db-push/SKILL.md` in full, including its stops. Do not run a bare push from here: the dry run, the reader check and the typecheck are the point.

## 4. Server functions

List what to deploy: the functions named in the arguments, or those whose directories changed. If shared code changed, the list is every function that imports the changed file; find them by reading imports, and say so.

Before deploying, record each function's current version (`supabase functions list`). Deploy them one at a time, so a failure names its function and the others still go out. Then read the versions again.

A deploy command can print success and upload nothing. When only shared code changed, the CLI may see no change in the function's own directory, skip the upload and still report the function as deployed. So a function counts as deployed only when its version or update time moved. If it did not, make a trivial change in the function's own entry file, deploy again, and read the version again.

New secrets or environment values the functions need must be set on the target before the deploy. Set them by piping between tools; never print one to check it.

## 5. Clients

**Web.** If the host builds on merge, find the deploy for the merged commit and confirm it was built and published, not skipped. Then load the live site and confirm it serves the new bundle.

**Mobile.** Run the release from the mobile directory with the command in `mobile/CLAUDE.md`, and follow that file's release checks. Two hold for any over-the-air system: an update reaches only installed builds whose runtime matches, so compare before publishing; and publishing is not arriving, so confirm on a device that the update loaded. Releasing mobile to real users is a separate go from deploying the backend unless the user's go named it.

If migrations ran, `/db-push` has already regenerated the types and typechecked every client. If they did not, run each client's typecheck now: a red result means the live contract already differs from what that client's source expects.

## 6. Smoke the boundaries

For everything deployed that crosses a service boundary (sign-in, outbound email or messages, webhooks, payments, any third-party API), there is a `live-required` row in `docs/smoke-tests-pending.md`, or there should be. Run those rows now on the target and record what you saw. On demo, do it before anyone asks for production, and record the result on the row as `Rehearsed on demo <date>` without closing it: demo runs against the third party's sandbox with demo's keys, and a `live-required` row closes only on production. On an environment that can reach real money or real people, read `docs/prod-action-safety-map.md` first.

Also re-exercise one piece of old behaviour next to the change. A deploy that makes the new thing work and breaks the thing beside it reads as a success until someone uses the product.

## Report

```
Environment: <name>   Range: <from>..<to>
Migrations: pushed (remote head <version>) | none pending | skipped | failed
Functions: <name> — version <before> → <after> | not deployed (<reason>)
Web: built and published at <commit> (observed) | skipped by host | not checked
Mobile: <update or build id>, confirmed on device | published, not confirmed | not released
Typecheck: <client> — <result>
Smokes: <id> — passed (what was observed) | rehearsed on demo, still open | failed | Unverified at ship: <id>
Demo: this change set seen on demo <date> | not on demo (<reason>) | no demo environment
Not deployed: <anything in the change set that is still not live, and why>
```

Use the evidence words as `CLAUDE.md` defines them. A function whose version you read back is verified as deployed. A feature is production-ready only when its boundary smokes have passed on production.
