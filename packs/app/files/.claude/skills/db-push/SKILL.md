---
name: db-push
description: Use when one or more migration files are written and reviewed and it is time to apply them to a hosted database, with the types regenerated and every client typechecked afterwards. To write the migration, use /gen-migration. To release server functions or clients, use /deploy.
argument-hint: "[migration file] [skip-audit]"
disable-model-invocation: true
---

# Push database migrations

Arguments: $ARGUMENTS

The arguments are an optional migration file and the optional word `skip-audit`, space separated. Whatever file is named, the unit of work is the whole pending set, because the tool applies every unapplied migration and not only the one you were thinking of.

Apply the pending migrations to one named environment, safely. Done means: the target's applied list matches the repository, the generated types file is regenerated from the result, every client has been typechecked against it, and the report says what was observed at each step.

Run this in the main session and not in a subagent. It has stops that need the user, and a subagent cannot ask.

**Stack.** This skill is written for Supabase (Postgres, the `supabase` CLI, `supabase/migrations/`). For another backend, keep the eight steps and replace four commands: list pending migrations, apply them, generate types, and the permission audit in step 5. The rules behind the steps are in `.claude/rules/database.md` and do not depend on the stack.

## Target

Read the App pack section of `CLAUDE.md` for the environments and their project references. Find out which project the CLI is linked to (`supabase/.temp/project-ref`, or `supabase projects list`) and name the environment it corresponds to. A new worktree is not linked at all; link it before going on.

Where the project has a demo environment, it is the default target and the pending set goes there first. Run `node scripts/demo/guard.mjs` before the push, and name the target on the command (`supabase db push --db-url "$DEMO_DB_URL"`) or work in a worktree linked only to demo, so the main checkout's link never points at demo. A migration that changes a seeded table changes the seed in the same branch: after the push, run `node scripts/demo/reset.mjs` and read its post-check, or tonight's reset fails on the new schema. If the reset restores from a snapshot, empty demo first (`reset.mjs --skip-seed`) and retake the snapshot after the push.

Before a production push, compare the pending set with what demo has applied. A migration going to production that demo has never run has not been tried against hosted data; say so and ask whether to push it to demo first. If demo applied its migrations in a different order than they sort on this branch, settle the numbering now. A clean push to demo is evidence, not a go.

Pushing to production needs a go from the user that names production. If the linked project is production and you do not have that, stop and ask. If the linked project matches no environment in `CLAUDE.md`, stop: you do not know what you are about to change.

## Steps

**1. Find the pending set.** Run `supabase migration list` and take the rows that exist locally and not on the remote. If there are none, say so, name the target and the head version you saw, and stop. Then check two things about ordering:

- No duplicate version prefixes: `ls supabase/migrations | cut -d_ -f1 | sort | uniq -d` prints nothing. Parallel branches can each mint the same timestamp, and the second file may be recorded as applied and skipped.
- No pending migration sorts before the newest one already applied. If one does, stop and ask whether to renumber it or apply it out of order. Do not reach for the include-all flag on your own.

**2. Check for readers of anything destructive.** This is read-only and comes before anything is applied, because a mobile build already installed keeps calling the old schema after the push. For each pending migration, ignoring comments, list the identifiers it drops, renames, retypes or revokes: tables, views, columns, functions, types, and grants. Search every client directory named in `CLAUDE.md` for each identifier, and run one control search for an identifier you know the clients use, so that an empty result means something.

- No identifier has a reader: print "N destructive identifiers, 0 client readers" and continue without asking. A question asked every time gets answered without reading.
- Any identifier has a reader: stop and ask once, listing every such identifier with the client and the number of files. The choices are to push anyway, or to make the change additive and record the removal in `docs/PARITY_LEDGER.md`. Continue only on an explicit "push".

A search for a name is a floor. It misses names built from strings and columns named only inside a query string, so say what was searched.

**3. Apply to a disposable database first.** Rebuild the local stack from the full migration chain (`supabase db reset --local`). This proves the pending files run in order from a clean state. If it fails, stop and report the error verbatim.

**4. Dry run against the target, when that is safe.** A dry run against the real database catches what a clean local one cannot: a constraint that existing rows violate, a trigger that rejects real data. It is only a dry run if nothing in the migration commits. Before running it, read each pending file for its own `BEGIN`, `COMMIT` or `ROLLBACK`, a call to a procedure that commits, a statement that cannot run in a transaction (such as a concurrent index build), and non-transactional side effects such as queued HTTP requests.

- If any is present, do not run the transactional dry run. An inner commit ends the wrapping transaction and the migration is applied for real. Say that the dry run was skipped and why. If the migration depends on existing data, tell the user it should be tried against a restored copy, and wait for their decision.
- Otherwise, with a connection string for the target, run each pending file inside `BEGIN; … ROLLBACK;` with `psql` and `\set ON_ERROR_STOP on`. Without that setting `psql` prints the error and exits 0. If the project has its own validate script in `CLAUDE.md`, use that.
- With no connection string and no script, say the dry run did not run. Do not describe step 3 as if it were this step.

A failure here stops the skill. Report the error and what it points to.

**5. Audit permissions on what changed.** Skip this when the arguments include `skip-audit`, or when the pending files only change data, and say which. Otherwise list the tables, policies, functions and grants the pending set touches and carry out the review in `.claude/skills/audit-rls/SKILL.md` scoped to them, including its refutation step. A surviving blocker stops the push. Fix the migration and start again.

**6. Push.** `supabase db push --linked`. The explicit flag keeps the target unambiguous. If it fails, report the error and stop; do not retry or repair migration history on your own, since both change what the remote believes was applied. Then verify the effect and not the exit code: run `supabase migration list` again and confirm every pending version now shows on the remote. A notice that something "does not exist, skipping" is harmless only if the catalog afterwards is what you intended, so look.

**7. Regenerate the types.** Generate into the one types file named in `CLAUDE.md` (`supabase gen types typescript --project-id <ref>` redirected to it), then check the file is non-empty and read `git diff --stat` for it. A diff that does not reflect the migration means you generated from the wrong project. Do not hand-edit the result.

**8. Typecheck every client.** For each client, run its typecheck command from `CLAUDE.md`, from inside its own directory, after confirming its own dependencies are installed. A compiler resolved from the wrong directory, or a root config that lists no files, reports zero errors on anything. Compare against the recorded baseline as a set of errors.

A red typecheck does not undo the push and must not be folded into "complete". Report it as an incident: the schema is live, this client's source no longer matches it, and installed builds of that client may already be failing. Name the errors, and open a ledger row or a fix straight away.

## Report

```
Target: <environment> (<project ref>)
Demo: applied there <date>, reset passed | not applied on demo (<reason>) | no demo environment
Pending: <versions>             Duplicate prefixes: none | <list>
Destructive identifiers: N, client readers: N (<searched directories>; control: <identifier> found)
Local apply: passed | failed
Dry run on target: passed | skipped (<reason>) | failed
Permission audit: passed | skipped (<reason>) | <findings>
Push: remote head now <version> (read back)
Types: <file>, <diff stat>
Typecheck: <client> — clean against baseline | N new errors (listed)
Not verified: <anything above that did not run>
```

The types file and any fixes are uncommitted when this skill ends. Say so. If the migration changed behaviour that no automated check sees, add a `data` lane row to `docs/smoke-tests-pending.md`.
