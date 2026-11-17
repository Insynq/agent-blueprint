---
paths:
  - "supabase/**"
  - "**/migrations/**"
  - "**/*.sql"
  - "db/**"
  - "prisma/**"
  - "drizzle/**"
  - "shared/**/database*.ts"
  - "scripts/demo/**"
---

# Database changes

These hold for any SQL backend. The Supabase commands are examples; the project's real commands are in `CLAUDE.md`.

**Schema changes go through migration files, and only through them.** Never change a hosted database's schema from a dashboard, a console or an ad hoc statement. A change that is not in a migration exists in one environment, is missing from the next one created, and makes every later migration behave differently depending on where it runs.

**A migration that has been applied anywhere shared is never edited.** Write a new one. Editing an applied migration changes nothing where it already ran and something where it has not.

**No fixtures in migrations.** Migrations run in production. Test users, sample records and demo content go in the seed file or the demo loader. Reference data the product cannot run without (a lookup table's fixed rows, a storage bucket) may be created by a migration. The test is whether production needs the row. A hook check blocks the obvious cases: inserts into the auth tables, and inserts carrying a reserved test email domain.

**Demo fixtures live under `scripts/demo/seed/`, and the seed changes with the schema.** A migration that adds a required column, renames something or changes a constraint on a seeded table breaks the next nightly reset unless the seed is updated in the same branch. Seed accounts use a domain that cannot receive mail (`example.com`, anything under `.test`); a hook check refuses a real-looking address in a seed file. Anything that wipes or bulk-writes a hosted database calls `scripts/demo/guard.mjs` first, and a hosted database is never reset with the platform's drop-and-recreate command. See `docs/DEMO_ENVIRONMENT.md`.

**Version prefixes are unique at the merge point.** Two branches built in parallel worktrees can each mint a migration with the same timestamp, and neither review sees the other's file. The migration tool keys applied migrations on that prefix, so the second one can be recorded as already applied and silently skipped. Before merging parallel branches, and again before any push, list the prefixes and confirm there are no duplicates (`ls supabase/migrations | cut -d_ -f1 | sort | uniq -d` prints nothing). A hook check catches a duplicate within one working tree; only a check on the merged result, such as the CI job, catches it across branches. A migration that sorts before one already applied on the target is the same class of problem: stop and decide the order before pushing.

**A dry run inside a transaction is not safe for everything.** Wrapping a migration in begin and rollback and running it against a real database is only a dry run if nothing inside it commits. These do, or act outside the transaction:

- the migration's own `BEGIN`, `COMMIT` or `ROLLBACK`. There are no nested transactions, so an inner commit ends the wrapper, the trailing rollback has nothing to undo, and the "dry run" has been applied;
- a procedure that commits internally;
- statements the database refuses to run in a transaction, such as building an index concurrently;
- on databases where schema statements commit implicitly (MySQL is one), every schema change;
- side effects that are not transactional: sequence values consumed, HTTP requests queued or sent, notifications delivered by an extension.

So check the file for these first. If any is present, do not run the transactional dry run against a shared database. Apply the migration to a disposable database instead (the local stack, rebuilt from the full migration chain), and if the migration depends on the shape of existing data, test it against a restored copy, not the live database. Remove hand-written transaction control from migrations when the migration tool already wraps each file.

**Additive first, destructive later.** A mobile build stays installed after the backend moves on. Dropping, renaming or retyping something a client reads is two changes: add the new form and move the clients, then remove the old form once the builds that used it are gone. The removal waits on a row in `docs/PARITY_LEDGER.md`. Changing a function's parameters creates a second signature beside the first; decide on purpose whether old callers keep the old one or whether it is dropped in the same migration.

**After every schema change, regenerate the types and typecheck every client.** The generated types file is the contract between the database and the clients, and there is one copy of it. Regenerate it with the project's command, never edit it by hand (a regeneration discards the edit), and run each client's own typecheck from that client's directory. A change is not finished while any client is red.

**Read the source before you reference it.** Before using a column in a view, trigger, policy or query, read the statement that created it. Names in application types can differ from the database. Before "adding" a column, confirm it does not already exist.

**Every new table gets its access rules in the same migration.** With row-level security: enable it and write the policies alongside the table. A table created now with policies promised later is readable or writable by everyone in the meantime. `/audit-rls` checks this.

**Read-only means proven read-only.** If you open a session against a shared database intending only to read, open a read-only transaction and confirm that a harmless write is refused before trusting it. A setting that reports success has not shown that it holds.
