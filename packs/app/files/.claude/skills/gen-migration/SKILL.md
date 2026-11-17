---
name: gen-migration
description: Use when the schema, access policies, database functions or required reference data need to change and a migration file has to be written for it. It writes the file and applies nothing. To apply migrations, use /db-push.
argument-hint: "<what the migration does>"
---

# Write a migration

Change: $ARGUMENTS

Write one migration file that makes the described change in this project's conventions, safe to run in production and safe for clients that are already installed. Done means the file exists under a unique version prefix, it has been applied to the local stack, and you have told the user what it changes, who can reach the new objects, and what has to follow. This skill never touches a hosted database.

**Stack.** Written for Supabase: Postgres, row-level security, `supabase/migrations/`, files named `<UTC timestamp>_<description>.sql`. For another backend, replace the file location and naming, the command that creates and locally applies a migration, and the access-rule section below with wherever your authorisation lives. The compatibility and fixture rules are in `.claude/rules/database.md` and apply to any stack.

If the change is not described well enough to write (which table, which roles may read or write, what happens to existing rows), ask for all of it in one message before writing anything.

## Before writing

Read `.claude/rules/database.md`, and the database entries in `docs/LESSONS.md`.

Read two or three recent migrations of similar scope and copy what they do: how tables, indexes, constraints and policies are named, which helper functions the policies call, how timestamps and ownership columns are declared. The project's own migrations are the style guide.

For every existing object the new migration refers to, read the statement that created it and any later migration that altered it. Take column names and types from there and not from application types, which can differ. Confirm that what you are about to add does not already exist.

## Compatibility with installed clients

A mobile build stays on a phone after this migration is applied, and the web client may be serving an older bundle for a few minutes. So decide which kind of change this is:

- **Additive** (a new table, a nullable or defaulted column, a new function, a wider policy): one migration.
- **Destructive** (drop, rename, retype, tighten a constraint, narrow a policy, revoke): search every client directory for readers of the thing first. If there are none, say what you searched and proceed. If there are, write only the additive half now: the new column beside the old, the new function under a new name. The removal is a later migration, recorded as a row in `docs/PARITY_LEDGER.md` with state `gates(...)`, written once the builds that read the old form are gone.

Changing a function's parameter list is a special case. Replacing a function with a different parameter list leaves the old signature in place beside the new one, and a caller that matches both gets an ambiguity error from the API layer. Dropping the old signature fixes that and breaks every installed build that calls it. When installed builds call the function, give the new behaviour a new name.

## Writing it

Create the file with the tool (`supabase migration new <description>`) so the prefix is the current UTC time, then check the prefix is unused: `ls supabase/migrations | cut -d_ -f1 | sort | uniq -d` prints nothing. That only sees this working tree. If other branches are in flight, say in your summary that uniqueness must be checked again where they merge.

In the file:

- **No transaction control.** The tool wraps each file. A `BEGIN` or `COMMIT` of your own breaks the dry run in `/db-push`.
- **No fixtures.** No test users, sample rows or demo content: those go in the seed file or the demo loader, because this file runs in production. Reference rows that production needs are fine.
- **Access rules in the same file as the table.** Enable row-level security on every new table and write its policies here, using the project's existing helper functions. Write only the operations the table needs: an audit or log table gets insert and select, never update or delete.
- **Grant narrowly.** Name the privileges and the roles. Revoke default execute on functions that should not be public, and check what the platform grants by default to anonymous and signed-in roles.
- **Functions that run with their owner's rights** set a fixed `search_path`, check the caller's identity at the top, and do no more than the bypass was needed for.
- **Policies that look at another protected table** go through a helper function, or they recurse or leak.
- **Time comes from the database.** Columns that order events (`occurred_at`, `approved_at`) default to `now()` or are set by trigger. A literal or a client-supplied time silently reorders events across time zones.
- **No business-meaning defaults on money or attribution columns.** An omitted split, owner or price must be visibly missing, not quietly filled with a rule. The same goes for a fallback in a view that reads the column.
- **Index what policies filter on.** A policy predicate on an unindexed column turns every read into a scan.
- **Comment the non-obvious**: why a policy has the shape it has, why a constraint exists.

Do not add columns, tables or policies beyond what was asked. If the request implies something it did not state, say so in the summary instead of building it.

## Check it

Apply the full chain to the local stack (`supabase db reset --local`) and read the output. A file that has not been applied locally is a draft. If the project has database tests, run them, and add a test for a new policy that shows the wrong user being refused; a policy test that only shows the right user succeeding passes with no policy at all.

If the local stack is not available, say the migration is unapplied and unverified.

## Tell the user

- the file path, and what it creates or changes;
- for each new or changed object, who can read and write it, in plain words;
- whether it is additive or destructive, the reader search you ran, and any ledger row it needs;
- what follows: `/db-push` to apply it, which regenerates the types and typechecks every client; any client code that needs to change; any smoke row to add.
