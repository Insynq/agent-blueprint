# Validation checklist — pre-commit hygiene for OpenClaw agent projects

Run through this before committing changes that touch `workspace/`, `mcporter.json`, deploy scripts, or bootstrap files. The framework's silent-failure traps are listed first because they're the most expensive to miss.

## Skill validation

For every `workspace/skills/<name>/SKILL.md` you've added or modified:

- [ ] Folder name matches frontmatter `name` field exactly (lowercase-hyphenated, both)
- [ ] Frontmatter `user-invokable` spelled with a `k` (NOT `user-invocable`)
- [ ] Frontmatter `description` is specific (verb + domain noun, not "does stuff")
- [ ] All 5 sections present in order: Header, Triggers, Systems, Workflows, Important Rules
- [ ] Every MCP tool used in Workflows is enumerated in Systems
- [ ] Each Workflow ends with a Report convention (where output goes)
- [ ] No embedded secrets, tokens, or API keys

## mcporter.json validation

For every change to `workspace/config/mcporter.json`:

- [ ] Top-level key is `mcpServers` (NOT `servers`, `mcp_servers`, etc.)
  ```bash
  python3 -c "import json,sys; d=json.load(open('workspace/config/mcporter.json')); sys.exit(0 if 'mcpServers' in d else 1)" \
    && echo OK || echo WRONG_KEY
  ```
- [ ] Every entry has either `transport: "stdio"` + `command` + `args`, OR `baseUrl`
- [ ] Every `${ENV_VAR}` reference has a corresponding entry in:
  - `.env.example` (so local-dev users know what to set)
  - `deploy/*.plist.template` `EnvironmentVariables` (so the runtime host has it)
- [ ] No real API tokens or secrets committed (all secrets via `${ENV_VAR}`)

```bash
# List required env vars:
grep -oE '\$\{[A-Z_][A-Z0-9_]*\}' workspace/config/mcporter.json | sort -u
```

## Bootstrap file validation

For every change to `workspace/*.md` (bootstrap files at workspace root):

- [ ] No file exceeds the bootstrap character cap (default ~20K)
  ```bash
  wc -c workspace/*.md | awk '$1 > 20000'   # any output = files over default cap
  ```
- [ ] No embedded secrets (these files load every conversation)
- [ ] AGENTS.md skills index reflects what's actually in `workspace/skills/`
- [ ] TOOLS.md tool descriptions match mcporter.json entries
- [ ] HEARTBEAT.md scheduled-behavior intent matches `openclaw cron list` on the runtime host

## In-repo MCP server validation

For each `workspace/mcp-servers/<name>/`:

- [ ] `package.json` has `@modelcontextprotocol/sdk` and `zod` as dependencies
- [ ] Every tool has a zod input schema
- [ ] Every tool returns a single `text` content block of stringified JSON
- [ ] Server ID (folder name + mcporter.json key) is kebab-case
- [ ] Tool IDs are snake_case
- [ ] Tool param names are camelCase
- [ ] `npm run build` succeeds
- [ ] No `npm audit --audit-level=high` findings (or knowingly accepted)

## Deterministic script validation

For each `workspace/scripts/<name>.{js,ts,sh}`:

- [ ] Stdout emits JSON only (no human messages mixed in)
- [ ] Stderr lines are tagged with `[script-name] message` format
- [ ] Exit code is 0 on success, non-zero on failure
- [ ] Script can be invoked manually for testing (no required args that come only from cron context)

## Deploy script validation

For every change to `deploy/deploy.sh`:

- [ ] All runtime-mutable paths are in the rsync `--exclude` list
- [ ] Logs to a defined `LOG` path (not stdout in the cron context)
- [ ] Restarts gateway only on `mcporter.json` or bootstrap-file changes (not every commit)

For `deploy/webhook-receiver.js`:

- [ ] HMAC verification uses `crypto.timingSafeEqual` (NOT `===`)
- [ ] Server binds to `127.0.0.1` (NOT `0.0.0.0`)
- [ ] `WEBHOOK_SECRET` read from `process.env`, not hardcoded

## Plist template validation

For `deploy/com.example.openclaw-deploy.plist.template`:

- [ ] No real secrets in `EnvironmentVariables` (all are `REPLACE_WITH_REAL_*` placeholders)
- [ ] Every `${ENV_VAR}` reference in `mcporter.json` has a corresponding `<key>` here

## Cross-cutting

- [ ] No web-stack contamination introduced (Supabase, Next.js, Vercel, RLS, etc.)
- [ ] If a new runtime-mutable path was added, `deploy/deploy.sh` rsync excludes are updated in the same commit
- [ ] `docs/LESSONS.md` updated if a non-obvious gotcha was learned
- [ ] `docs/CHANGELOG.md` updated via `/ship` if behavior changed

## Ready-to-deploy gate

If every check above passes:

```bash
git status
git diff --stat
# Spot-check: nothing surprising staged?

git push origin main
# Webhook fires; deploy runs; tail logs to confirm:
tail -f ~/Library/Logs/openclaw-deploy.out.log
```

After deploy, on the runtime host:

```bash
openclaw doctor --repair    # surface any post-deploy drift
openclaw gateway restart    # if mcporter or bootstrap changed and deploy.sh didn't already restart
```
