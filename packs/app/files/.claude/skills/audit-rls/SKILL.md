---
name: audit-rls
description: Use when database access control needs checking - after writing a migration or policy, before pushing schema, or when you need to know whether one user or tenant can reach another's rows. For application code review use /audit-code; for every audit at once use /audit-full.
argument-hint: "[table or tables] [focus: gaps | antipatterns | functions | grants]"
---

# Audit row-level security

Scope: $ARGUMENTS

The arguments are optional table names and an optional focus, space separated. With no tables, audit every table. With no focus, cover everything below.

Answer one question: can anyone read or write a row they should not? Done means a coverage matrix that accounts for every table in scope, graded findings with the policy text quoted, a Refutation Ledger over the security-class findings, and a verdict that follows from the ledger. This skill is read-only. It reports; it does not write the fix.

**Stack.** Written for Postgres row-level security as Supabase uses it: policies in `supabase/migrations/`, the `anon` and `authenticated` roles, `auth.uid()`. For another backend, replace sections 1 and 2 with the place your authorisation lives (middleware, resolvers, another database's policy system) and keep sections 3 and 4 as they are: re-deriving against live source and the refuter are what make the result trustworthy.

When `/audit-full` runs this skill inside an agent, that agent does sections 1 and 2 only and returns findings. Refutation runs once, in the caller.

## 1. Establish what is in force

A policy quoted from a migration can have been replaced by a later one. Build the picture from the current state:

- **From the catalog, when a local stack is running** and built from the full chain: read `pg_policies`, `pg_class.relrowsecurity` and `relforcerowsecurity`, function definitions and their security mode, and the grants on tables and functions. This is the most reliable source, because it is the result of every migration in order.
- **From the migrations, otherwise**: read them in version order and track each table's state through every `CREATE`, `ALTER` and `DROP` of a table, policy, function or grant. Say in the report that the picture was derived by reading and not from a catalog.

Never query a hosted database for this without the user's go. If you do, use a read-only transaction and confirm a write is refused first.

Learn the project's model before judging it: which helper functions policies call for role and tenant checks, how ownership is expressed, which roles are meant to have blanket access. Read the helpers' bodies. A policy is only as sound as the function it calls.

Then write the coverage matrix: every table in scope, whether row-level security is enabled, and which policy covers each of select, insert, update and delete. Count the tables independently (from the catalog or from every `CREATE TABLE`) and check the matrix has that many rows. A table missing from the matrix is a gap nothing later in this skill can find.

## 2. Review

For a single table, do the review yourself. For a full sweep, dispatch one `judge` with the lens "access control: can any role reach a row it should not", giving it the matrix, the migration directory, the helper functions you identified and the list below. Do not tell it which tables you suspect.

| Check | Security class | Typical grade |
|---|---|---|
| A table with row-level security off, or on with no policy for an operation the app performs | access bypass | blocker |
| A policy that is always true, or true for any signed-in user, on data that belongs to someone | access bypass | blocker |
| A policy that checks membership of some tenant but not the row's own tenant | cross-tenant | blocker |
| An update policy with a `USING` clause and no `WITH CHECK`, so a row can be moved to another owner | access bypass | blocker |
| A policy subquery on another table that is not itself scoped to the caller | cross-tenant | major |
| Update or delete allowed on an audit, log or history table | integrity of records | blocker |
| A function running with its owner's rights with no fixed `search_path`, no caller check, or doing more than it needs | privilege escalation | blocker or major |
| Execute left granted to `anon` or public on a function that changes data | privilege escalation | blocker |
| Grants to `anon` on a table, or broad grants where the policy is the only guard | exposure | major |
| A view that bypasses the policies of the tables beneath it | exposure | major |
| A role read directly from a user-editable column | privilege escalation | blocker |
| A policy that ignores the project's helper and re-implements the check by hand | consistency | minor |
| A policy predicate on an unindexed column | performance | minor |

The five security classes named in the table are this audit's load-bearing classes, for the ledger here and for `/audit-full`.

Each finding names the table and policy, quotes the clause, says which role can do what it should not, and says what would fix it. A finding without the quoted clause is an opinion and is labelled as one.

## 3. Refutation Ledger

A reviewer's verdict is a self-report, and access findings are the ones most often wrong in the detail that matters: a citation that a later migration made stale, a helper that does enforce the tenant after all. So nothing security-class is reported until it has been checked twice more.

**The load-bearing set** is every blocker, and every finding in one of the five classes whatever its grade.

**Re-derive each one yourself, this run.** Open the policy or function as it is in force now and quote the `USING` and `WITH CHECK` text. Do the same for an all-clear on any table that holds money, credentials or another person's private data: read its policies yourself before calling it clean. A finding or an all-clear you have not opened is `[relayed]`, not verified.

**Dispatch the `refuter`.** Group the load-bearing findings by class and send one `refuter` per class, all in one message, and wait for all of them. Give each only the claims and where the policy lives, never the reviewer's reasoning or yours. Ask it to try to kill each claim from the policy text in force, and for any it cannot kill, to state what text would have falsified it. If the set spans more than four classes, do not fan out: tell the user the access surface is too broad to check in one pass and propose a split by schema area.

Record the ledger:

| Id | Table / policy | Finding | Class | Your re-derivation (quoted) | Refuter result | Refuter evidence |
|---|---|---|---|---|---|---|

Open the lines a refuter cites before accepting a kill. A finding leaves the must-fix list only when it is killed with contradicting text you have read. A finding the refuter changed is re-graded as what it is. Anything the refuter found wider than the original joins the list and goes through this section too.

## 4. Verdict and report

The verdict is **needs changes** if any blocker or major stands after the ledger, and **no findings standing** otherwise. Report:

- the model you found (roles, helpers, how ownership is expressed) and the source of truth you used;
- the coverage matrix, with the independent table count beside it;
- the ledger, then the remaining findings by grade;
- what was examined and what was not.

A clean result has to show it ran. When the load-bearing set is empty, write: "Refutation Ledger: empty. No security-class finding surfaced. That means the review found none, not that an independent skeptic verified the policies are sound." Refutation tests the findings that exist. It cannot surface a table the review never looked at, which is why the matrix count matters.

Reading policies shows what they say. Whether they hold is a `data` lane smoke: sign in as the wrong user and watch the read or write be refused. For each blocker fixed, and for each table holding money or private data, name that smoke so it can be added to `docs/smoke-tests-pending.md`.
