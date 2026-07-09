# OC KB 1 — Architecture: OpenClaw runtime model

## Pattern

OpenClaw is a long-lived **gateway service** that exposes an AI agent over a local CLI (`openclaw`). The agent is content-and-config: a workspace tree of markdown bootstrap files + on-demand skill files + an MCP registry. The gateway loads bootstrap files at start, scans skill descriptions on every prompt, and dispatches tool calls to MCP servers registered in `mcporter.json`.

The agent project is a **content/config repo, not a JS app.** There is no root `package.json`. (Per-MCP-server packages exist under `workspace/mcp-servers/<name>/`.) The repo's primary purpose is to be deployed to a runtime host where the gateway runs.

## When to use / when to skip

**Use OpenClaw when:**
- You want a long-lived agent with personality, memory, and proactive behavior (cron-driven)
- Tool integration via MCP is desirable (vs. function-calling baked into a single SDK call)
- You're comfortable running a runtime host (Mac mini, Linux box, etc.) — OpenClaw isn't a serverless platform
- You want git-based deploy with file-level visibility into what changed

**Skip OpenClaw when:**
- The agent is a single short-lived API call (use the Anthropic SDK directly)
- You need horizontal scaling beyond a single host (OpenClaw is single-host today)
- You can't accept the operational burden of a long-lived process (gateway crashes, plist drift, rsync excludes)

## Build vs buy: anchor on the data, not the harness

When you weigh an off-the-shelf agent, reviewer, or tool against building your own, the durable value is usually the underlying **data/signal**, not the **harness** around it. A capable specialized agent is often a thin shim that loads a skill as a container and coerces the output into a structured shape (the audit commands in this framework are exactly that pattern) — cheap to own, and the harness layer tends to commoditize as open-source dev tooling matures. So anchor build-vs-buy on the data you cannot easily reproduce: buy for the data, and build the harness yourself when the *shaping* (skill + references + output coercion) is what makes the model reliable.

## Capability abstraction: route off the capability, not the vendor

_Design-validated against Kai-RE's recorded architecture decision, not runtime-proven — the routing indirection shipped but has not been exercised across a live second-vendor stack._

When an agent depends on external systems, name the **capability** (email, calendar, files, database), not the vendor. Three rules:

1. **Name the capability set.** Skills, prompts, and docs refer to "email" / "calendar" / "files" / "database" — never "Gmail" or "Google Sheets" inline.
2. **Keep user-facing language vendor-neutral.** The agent talks about "your calendar," not "your Google Calendar," so the same copy holds when the backing vendor changes.
3. **Route internal tool calls through a user-recorded capability→provider map.** A `provider_stack` key (persisted in the agent's update-safe config surface — see `OC_KB_04` and the plugin-state rule in `docs/investigations/2026-07-07-codex-and-claude-code-plugins-build-publish-gate.md`) maps each capability to whichever vendor serves it. A skill reads the map, then dispatches to that vendor's tool.

**Carve-out — vendor-neutral governs user-facing language and routing logic, not failure-signature artifacts.** Rule 1's "never inline" applies to the copy the agent speaks and the abstraction skills route through. It does **not** apply to internal diagnostic artifacts whose entire value is verbatim vendor specificity: a `references/` gotcha log's exact error strings, an observed-symptom reference, a per-connector quirk note (see `OC_KB_02` → the capability-scoped gotcha log). Those are keyed to the literal signature a specific vendor's API emits — paraphrasing them to stay vendor-neutral would destroy the match. Keep failure-signature artifacts verbatim vendor-specific by design.

**Mixed stacks are first-class, not a corner case.** A real second stack is capability-mixed, not vendor-monolithic. The market evidence forcing this: Codex's connector directory carries Outlook, SharePoint, Dropbox, and Smartsheet but has **no monolithic "Microsoft" store** and no standalone Excel connector — so the realistic alternative to (say) an all-Google stack is `email=Outlook, files=Dropbox, database=Smartsheet`, not "the Microsoft equivalent of Google." Design the map so `files=Dropbox` while `database=Sheets` is a supported configuration, not a special case.

The cost is one indirection layer (map lookup before dispatch) bought against never re-authoring skills when a user arrives on a different stack. For the one-capability-served-by-multiple-interchangeable-connectors case — which the fixed-`mcpServers` registry model does not natively express — see `OC_KB_03`'s note on capability→connector indirection.

## Workspace tree (mandated by OpenClaw)

```
workspace/
├── SOUL.md            agent identity, role, domain, tone
├── AGENTS.md          model config, routing, skills index
├── TOOLS.md           LLM-facing tool reference
├── SCHEMA.md          data model reference
├── MEMORY.md          long-lived facts/preferences
├── HEARTBEAT.md       proactive/scheduled behavior
├── NOTIFICATIONS.md   routing rules
├── TASK-QUEUE.md      runtime-mutable working state
├── INDEX.md           file map for humans + LLM
├── config/
│   └── mcporter.json  MCP registry (top-level key: mcpServers)
├── skills/
│   └── <name>/SKILL.md  one folder per skill; folder name MUST equal frontmatter `name`
├── mcp-servers/
│   └── <name>/        in-repo MCP servers (each is its own npm package)
└── scripts/           deterministic Node CLIs invoked by `openclaw cron`
```

The 9 root markdown files (SOUL through INDEX) are **bootstrap files** — read into context at gateway start with a per-file character cap. See `OC_KB_04` for what each contains.

## Boot sequence

```
1. Gateway starts (typically launchd on macOS).
2. Reads ~/.openclaw/openclaw.json for runtime config.
3. Reads ~/.openclaw/workspace/ (mirror of repo's workspace/, deployed via rsync).
4. Loads each bootstrap file at the configured character cap (default ~20K).
5. Reads workspace/config/mcporter.json — registers each entry under `mcpServers`.
6. Spawns stdio-transport MCP servers and connects to HTTP-transport ones.
7. Substitutes ${ENV_VAR} references using process.env (NOT .env files).
8. Scans workspace/skills/*/SKILL.md frontmatter — builds the skill router index.
9. Ready to accept user prompts and cron triggers.
```

## Anti-patterns

- **`mcporter.json` top-level key wrong.** `servers`, `mcp_servers`, anything other than `mcpServers` parses as valid JSON but the gateway silently registers nothing. Tools become invisible. → fix: rename top-level key to `mcpServers`.
- **`${ENV_VAR}` references with no plist entry.** Substitution reads `process.env`, populated on macOS launchd by the plist `EnvironmentVariables` dict. `.env` files are NOT read by the gateway. → fix: add the var to the runtime host's plist; reload with `launchctl bootload`.
- **Editing `~/.openclaw/workspace/` directly on the runtime host.** Changes get wiped on next deploy by `rsync --delete`. → fix: edit in the canonical repo, push, let the deploy script rsync.
- **Adding runtime-mutable files at the workspace root (alongside SOUL.md, etc.).** They'll be overwritten by deploy. → fix: write them under a path that's in the rsync excludes (typically `TASK-QUEUE.md`, `deliverables/`, `private/`).

## CLI surface

Common commands the operator runs on the runtime host:

```
openclaw gateway restart        # after mcporter.json or bootstrap-file changes
openclaw doctor --repair        # check + fix common drift (skills, mcp config, env)
openclaw session cleanup        # reset session state
openclaw cron list              # source of truth for scheduled jobs (NOT the in-repo docs)
openclaw cron create / edit / delete
openclaw models auth paste-token --provider <p> --profile-id <id>
openclaw message send --channel <c> --target <id> --message "…"
```

In-repo cron documentation can drift from runtime state. **`openclaw cron list` is authoritative.**

## Critical files for an adopter

```
workspace/                       (REQUIRED — bootstrap files + skills + MCP servers + scripts)
workspace/config/mcporter.json   (REQUIRED — MCP registry; `mcpServers` key)
.env.example                     (local-dev MCP servers; runtime secrets in plist NOT here)
deploy/deploy.sh                 (GitOps deploy: git pull + rsync --delete workspace/)
deploy/webhook-receiver.js       (HMAC-verified entry point on the runtime host)
deploy/<name>.plist.template     (launchd unit template; EnvironmentVariables filled by operator)
```

## Architecture decisions (this framework's defaults)

These defaults are baked into the agent-blueprint scaffold; adopters can override but the framework assumes them:

| Decision | Default | Why |
|---|---|---|
| Deploy model | GitOps webhook → HMAC verify → git pull → rsync --delete workspace/ | File-level diffs in git history; no opaque deploy artifact |
| Runtime host | macOS Mac mini under launchd | OpenClaw's primary target; well-tested |
| MCP transport mix | stdio for in-repo + most external; HTTP for some hosted | Stdio is the lowest-overhead default |
| Cron strategy | Per-cron API key for cost attribution | Anthropic Console attributes cost per-key |
| Cache strategy | `cacheRetention: short` (5 min) by default; `long` (1 hr) for stable system prompts | Long requires `extended-cache-ttl-2025-04-11` beta — framework injects automatically |
| Mutable runtime paths | `TASK-QUEUE.md`, `deliverables/`, `private/` excluded from rsync | Gateway writes to these; deploy must not wipe |

## Open questions for adopter projects

- Is the runtime host shared with other workloads, or dedicated to this agent?
- Is the canonical git repo public or private? (Affects webhook auth and GitHub API rate-limits during deploy.)
- Will the agent ever need to write to a database the operator wants to back up? (If yes, plan for either an MCP server fronting it OR a deterministic backup script in `workspace/scripts/`.)
- What's the budget per month? Drives whether to use Opus 4.7 routinely or only for hardest skills.

[VERIFY BEFORE SHIPPING] Default `bootstrapMaxChars`, OpenClaw CLI subcommand surface, and rsync-exclude path defaults — confirm against the OpenClaw version actually deployed.
