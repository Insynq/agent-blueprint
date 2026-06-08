---
description: Audit infrastructure security - mcporter config, env vars, deploy script, runtime host, MCP server deps
argument-hint: "[focus — optional: mcporter | env | deploy | deps | all (default)]"
---

# Infrastructure Security Audit Subagent

**IMPORTANT: This skill spawns a subagent to protect main context.**

## Action Required

Spawn a Task with `subagent_type: Explore` using the prompt below. The subagent will scan OpenClaw infrastructure configuration and return a security report.

---

## Subagent Prompt

```
# Infrastructure Security Auditor

Focus: **$ARGUMENTS** (one of: mcporter | env | deploy | deps; default to "all" if empty)

## Core Question

> "Does this OpenClaw agent's runtime configuration follow security best practices and avoid the canonical silent-failure traps?"

## Step 0: Detect Project Infrastructure

Before auditing, identify what's actually present.

**Workspace shape** — check for these files/dirs:
- `workspace/config/mcporter.json` → MCP registry (REQUIRED for any agent that uses tools)
- `workspace/skills/` → on-demand skills directory
- `workspace/mcp-servers/` → in-repo MCP server packages (each has its own `package.json`)
- `workspace/scripts/` → deterministic Node CLIs invoked by `openclaw cron`
- Bootstrap files at `workspace/` root (SOUL.md, AGENTS.md, TOOLS.md, SCHEMA.md, MEMORY.md, HEARTBEAT.md, NOTIFICATIONS.md, TASK-QUEUE.md, INDEX.md)

**Deploy story** — check for:
- `deploy/deploy.sh` → GitOps deploy script (rsync to runtime host)
- `deploy/webhook-receiver.js` → HMAC-verified webhook entry point
- `deploy/com.example.openclaw-deploy.plist.template` → launchd unit template
- `.github/workflows/` → if any workflow runs on push or affects deploy, audit it

**Local-dev** — check for:
- `.env.example` → required env vars (local-dev MCP servers only; runtime secrets live in plist)
- `.gitignore` → must ignore `.env`, `.env.local`, etc.

Document what you find. Skip sections below that don't apply.

**IMPORTANT: Actually read the configuration files — don't just check whether they exist.**

## Audit Sections

### 1. mcporter.json Shape and Resolution

This is the highest-leverage check. The canonical silent-failure trap.

**1a. Top-level key**
```bash
python3 -c "import json,sys; d=json.load(open('workspace/config/mcporter.json')); print('OK' if 'mcpServers' in d else 'WRONG_KEY: ' + ','.join(d.keys()))"
```
- `mcpServers` → OK
- Anything else (`servers`, `mcp_servers`, etc.) → **CRITICAL**. Tools silently unavailable.

**1b. Per-server entries**
For each entry under `mcpServers`:
- stdio entry: must have `command` + `args` (object) + optional `env`, `description`, `enabled`
- HTTP entry: must have `baseUrl` + optional `headers`
- Mixed shape (both `command` and `baseUrl`) → **High** — ambiguous; mcporter behavior undefined.

**1c. `${ENV_VAR}` references**
Grep for `${...}` patterns in `mcporter.json`:
```bash
grep -oE '\$\{[A-Z_][A-Z0-9_]*\}' workspace/config/mcporter.json | sort -u
```
For each reference:
- Substitution reads `process.env`, **not** `.env` files. On macOS runtime hosts, the source is the launchd plist `EnvironmentVariables` dict.
- Confirm the var is documented in `.env.example` (so local-dev users know what to set)
- Confirm the var is in the plist template (`deploy/*.plist.template`) so the runtime host has it.
- Any reference with no documented source → **High**. Silent failure on the runtime side.

**1d. Disabled / orphan entries**
- Entries with `"enabled": false` — flag for review (intentional vs. drift?).
- Tools referenced in skills (`Systems` section) but missing from `mcporter.json` → **High**. Skill expects a tool that doesn't exist.

### 2. Environment Variable Audit

**2a. Plist vs .env split**
- Real secrets must live in the runtime host's launchd plist `EnvironmentVariables` dict, NEVER in `.env` checked into git.
- `.env` is for local-dev MCP servers only.

**2b. .env.example documentation**
- Does `.env.example` exist?
- Does it document required vars without real values?
- Are all `${ENV_VAR}` references in `mcporter.json` listed?

**2c. Git exposure**
```bash
git log --all --oneline -- "*.env" ".env*" 2>&1 | head -10
```
Check that no `.env` file with real values was ever committed.

**2d. Per-cron API keys**
- Does the runtime host use distinct Anthropic API keys per cron? (Cost attribution lives in Anthropic Console per-key.)
- A single shared key across all crons → **Medium**. You lose per-cron cost visibility.

**2e. Plist template hygiene**
- Read `deploy/com.example.openclaw-deploy.plist.template` (or whatever `.plist.template` exists).
- Are `EnvironmentVariables` entries TODO markers (good) or do they contain real values committed to git (**Critical**)?

### 3. Deploy Script Audit

**3a. HMAC verification**
- Read `deploy/webhook-receiver.js`. Does it verify the GitHub webhook HMAC signature using a constant-time comparison?
- Source of secret: must come from an env var (typically `WEBHOOK_SECRET`), not hardcoded.
- Missing or non-constant-time comparison → **Critical**.

**3b. rsync excludes**
- Read `deploy/deploy.sh`. Find the rsync command (typically `rsync --delete workspace/ ~/.openclaw/workspace/`).
- Confirm runtime-mutable paths are in `--exclude`: `TASK-QUEUE.md`, `deliverables/`, `private/`, plus anything else the agent writes at runtime.
- A runtime-mutable path NOT excluded from `--delete` → **High**. Next deploy wipes runtime state.

**3c. Path traversal in webhook handler**
- Does the webhook handler shell out with shell-interpolation of any user-supplied data (branch name, commit SHA)? Should use `execFile` with explicit args, not `exec`.

**3d. Privilege**
- Does `deploy.sh` run as the user who owns `~/.openclaw/`, not root?

### 4. MCP Server Package Dependencies

**4a. Per-server package.json hygiene**
For each `workspace/mcp-servers/*/package.json`:
- Are security-critical packages on recent versions? (`@modelcontextprotocol/sdk`, `zod`)
- Is a lockfile (`package-lock.json` or equivalent) present and checked into git?
- Run if available:
  ```bash
  for d in workspace/mcp-servers/*/; do (cd "$d" && npm audit --audit-level=high 2>&1 | head -20); done
  ```

Flag packages with known CVEs as **High** severity. Unpinned critical deps as **Medium**.

**4b. Tool input validation**
Read each MCP server's tool definitions. Each tool MUST validate inputs with a zod schema before acting. A tool with no input schema → **High** (typed-by-vibes, easy injection).

**4c. Tool output shape**
Each tool returns a single text content block of stringified JSON. Mixed-shape returns or unstructured strings → **Medium** (downstream parsing breaks silently).

### 5. Bootstrap-File Hygiene

**5a. Character cap**
```bash
wc -c workspace/*.md
```
Default cap is ~20K per file (configurable as `bootstrapMaxChars` in `~/.openclaw/openclaw.json`). Files over the cap silently truncate.
- File at 18K-20K → **Low** (warn — close to cap, will hit it as it grows)
- File over 20K with default cap → **High** (already truncating)

**5b. Cross-reference integrity**
- INDEX.md should reference every file in workspace/.
- AGENTS.md `skills` references should match folders that exist under `workspace/skills/`.
- Mismatches → **Medium**.

**5c. Secrets in bootstrap files**
- Grep bootstrap files for patterns that look like secrets:
  ```bash
  grep -rE 'sk_(live|test)|api[_-]?key|secret_key|password|bearer\s+[A-Za-z0-9]' workspace/*.md 2>/dev/null
  ```
- Any hit → **Critical**. Bootstrap files load into the LLM's context every conversation; secrets there leak constantly.

### 6. Skill Hygiene (cross-cutting check)

For each `workspace/skills/<name>/SKILL.md`:
- Folder name must equal frontmatter `name` (otherwise router never sees the skill) → **High** if mismatched.
- `user-invokable` must be spelled correctly (NOT `user-invocable`) → **High** if typo'd. Skill silently un-callable.
- Skills marked `user-invokable: true` that touch destructive operations should declare confirmation requirements in `Important Rules`.

## OUTPUT FORMAT (Required)

```markdown
## Infrastructure Security Audit Report

### Project Shape Detected
- mcporter.json: [present | missing | wrong-key]
- In-repo MCP servers: [N — list names]
- Skills: [N — list names]
- Deterministic scripts: [N]
- Deploy story: [GitOps webhook+rsync | manual | not configured]
- Plist template: [present | missing]
- .env.example: [present | missing]

### Summary
- [ ] mcporter.json shape and env-var resolution are clean
- [ ] No secrets in `.env` (real secrets in plist)
- [ ] Deploy script verifies HMAC and excludes runtime-mutable paths from rsync --delete
- [ ] MCP server dependencies free of known CVEs
- [ ] Bootstrap files within character cap, no embedded secrets
- [ ] Skill folder names match frontmatter `name`; `user-invokable` spelled correctly

### mcporter.json Issues
| Issue | Location | Severity |
|-------|----------|----------|

### Env Var Issues
| Issue | Location | Severity |
|-------|----------|----------|

### Deploy Script Issues
| Issue | Location | Severity |
|-------|----------|----------|

### MCP Server Dependency Issues
| Server | Package | Issue | Severity |
|--------|---------|-------|----------|

### Bootstrap-File Issues
| File | Issue | Severity |
|------|-------|----------|

### Skill Hygiene Issues
| Skill | Issue | Severity |
|-------|-------|----------|

### Recommendations
1. [Specific fix with file and line]
2. [Specific fix with file and line]

### Verdict
[ ] PASSED - Infrastructure is secure
[ ] NEEDS CHANGES - See recommendations above
```
```

---

## After Subagent Returns

1. **If Critical issues** → fix immediately (especially: secrets in bootstrap, secrets in `.env` in git, missing HMAC verify, mcporter.json wrong key)
2. **If High issues** → schedule for next deploy window
3. **If Medium / Low** → backlog
4. **If all clear** → note audit complete in project docs
