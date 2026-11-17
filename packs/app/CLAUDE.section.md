## App pack

Every client and the backend live in this repository. Read `docs/APP_MONOREPO.md` before changing layout, tooling, hosting or environments.

- Client surfaces: [TODO: /kickoff lists them by short name, e.g. web, mobile]
- Client directories: [TODO: e.g. `web/`, `mobile/`; each has its own package file, lockfile and `CLAUDE.md`]
- Backend: [TODO: directory, and where migrations live]
- Generated database types: [TODO: the one file every client imports]
- Environments: [TODO: local and production, each with its project reference and URL]. Production needs a go that names it.
- Demo environment: [TODO: none; or its URL, database reference, the branch it deploys from, reset hour and time zone, reset armed or not]. Where one exists it is the default target, and a pass on it is never a go for production. See `docs/DEMO_ENVIRONMENT.md`; logins are in `docs/demo-logins.md`.
- Marketing site: [TODO: separate repository and where, or none]

Rules that are easy to get wrong:

- No root workspace and no shared lockfile. Run each client's commands from its own directory.
- Schema changes only through migration files, with no fixtures in them. After any schema change, regenerate the types and typecheck every client.
- One repository is not one deploy. Every backend change must keep the oldest installed mobile build working, and merging deploys only what the host builds.
- Every spec has a `## Clients` section with one verdict per client surface. Owed work gets a row in `docs/PARITY_LEDGER.md`.
- Anything that wipes, seeds or resets calls `scripts/demo/guard.mjs` first. Demo data never holds a real person's contact details.

| Skill | Use it when |
|---|---|
| `/gen-migration` | The schema, policies or database functions need to change. |
| `/db-push` | Migrations are ready to apply to a hosted database. |
| `/audit-rls` | Database access control needs checking. |
| `/deploy` | A change has to go live beyond the web host's automatic build. |
| `/gen-component` | A client needs a new interface component. |

Also: `docs/prod-action-safety-map.md` (which clicks spend money or contact people), `.claude/rules/database.md`, `.claude/rules/app-spec-checks.md`.
