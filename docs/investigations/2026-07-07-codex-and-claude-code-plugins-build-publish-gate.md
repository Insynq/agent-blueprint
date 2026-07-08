# Building, Publishing & Maintaining Plugins: Claude Code vs. OpenAI Codex CLI

_Date: 2026-07-07_

_Researched and adversarially fact-checked against primary vendor docs (as of the source dates below — this is a fast-moving area, so re-verify anything mission-critical before you rely on it). Codex's plugin system is young; Claude Code's is more mature but still versioned rapidly._

## The big picture (read this first)

Both ecosystems use the **same fundamental model**: a plugin is a directory with a small JSON manifest, and distribution happens through a **git-backed "marketplace" file** — not a central app-store upload. You publish by pushing to a git repo; users add your marketplace and install from it.

| | **Claude Code** | **OpenAI Codex CLI** |
|---|---|---|
| Manifest | `.claude-plugin/plugin.json` | `.codex-plugin/plugin.json` |
| Only required field | `name` (kebab-case) | `name`, `version`, `description`, skills path |
| Components | commands/, agents/, skills/, hooks/, MCP, themes… | Skills, Apps, MCP servers |
| Local test | `claude --plugin-dir ./my-plugin` | local `.agents/plugins/marketplace.json` → restart |
| Distribute | `.claude-plugin/marketplace.json` in a git repo | `marketplace.json` (repo-scoped or personal) + git |
| Central directory | Live (official + third-party marketplaces) | **"Coming soon"** — not yet available |
| Maturity | More mature | Early / in flux |

---

## Part 1 — Claude Code Plugins

### Architecture & file structure
- The manifest is **`.claude-plugin/plugin.json`**. When the manifest exists, **`name` (kebab-case, no spaces) is the only required field**.
- **Everything else lives at the plugin root, NOT inside `.claude-plugin/`.** Only `plugin.json` belongs in that folder. Component directories: `commands/`, `agents/`, `skills/`, `hooks/`, `output-styles/`, `themes/`, `monitors/`, plus `.mcp.json`. _(This is the #1 mistake — people bury `skills/` inside `.claude-plugin/` and it silently doesn't load.)_

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json          ← ONLY this file goes here
├── commands/
├── agents/
├── skills/
├── hooks/
└── .mcp.json
```

### Develop & test locally
- Load your plugin directory directly: **`claude --plugin-dir ./my-plugin`**
- Load several at once with repeated flags: `claude --plugin-dir ./a --plugin-dir ./b`. It's additive, session-scoped, and a local copy overrides an installed same-name plugin — so you can iterate against a published plugin safely.

### Publish & distribute
1. Create **`.claude-plugin/marketplace.json`** at your repo root. Required top-level fields: `name`, `owner`, and a `plugins` array. Each plugin entry needs at minimum a `name` and a `source` (optional: description, author {name/email/url}, category, homepage).
2. `source` can be several formats: a **`github`** object (`owner/repo`), a **git-subdir** object (`url`, `path`, `ref`, `sha`), a **url/git** object (`url`, `sha`), or a plain **`./`-relative local path**.
3. Push to any git host (GitHub/GitLab/Bitbucket/etc. — "any git hosting service works").
4. Users run **`/plugin marketplace add owner/repo`**, then **`claude plugin install <plugin>@<marketplace>`**.

Install **scopes**: `user` (default, `~/.claude/settings.json`), `project` (`.claude/settings.json`, committable), `local` (`.claude/settings.local.json`, gitignored), `managed` (admin-controlled, read-only).

### Versioning & how the owner pushes updates
Version resolves in this order: **`version` in plugin.json → `version` in the marketplace entry → the git commit SHA** (then "unknown").

- **Set and bump `version` on every release** → users only get updates when you bump the string. This is how you _control_ rollout.
- **Omit `version`** → every new commit is treated as a new version (continuous). `plugin.json` wins over the marketplace entry if both are set.
- **To ship an update:** just push to the marketplace repo. Users refresh with **`/plugin marketplace update`** (or `claude plugin marketplace update [name]`) and update the plugin with **`claude plugin update <plugin>`**.

---

## Part 2 — OpenAI Codex CLI Plugins

### Architecture & file structure
- Manifest is **`.codex-plugin/plugin.json`** (the only required file). Minimal manifest: `{ name, version (semver), description, skills: "./skills/" }`.
- Same rule as Claude: **only `plugin.json` goes in `.codex-plugin/`**; keep `skills/` (each `my-skill/SKILL.md`), `hooks/` (`hooks.json`), `.mcp.json`, `.app.json`, and `assets/` at the plugin root.
- A Codex plugin bundles three component types: **Skills** (reusable instructions), **Apps** (connections to GitHub/Slack/Google Drive, etc.), and **MCP servers**.
- Bundled MCP servers are namespaced under `plugins.<plugin>.mcp_servers.<server>` (distinct from top-level `mcp_servers`). Users can enable/disable and set tool-approval policy without editing your manifest, but the launch command itself is fixed by the plugin.

### Config context
Codex config is TOML at **`~/.codex/config.toml`** (user-level), with optional project overrides in `.codex/config.toml` **loaded only when the project is trusted**. MCP servers added via `codex mcp add <name> -- <cmd>` or by editing the TOML.

### Develop & test locally
- Create a **marketplace file** — repo-scoped at `$REPO_ROOT/.agents/plugins/marketplace.json` (use `./`-relative `source.path` values kept inside the marketplace root; plugins stored under `$REPO_ROOT/plugins/`) or personal at `~/.agents/plugins/marketplace.json` (cached under `~/.codex/plugins/cache/...`).
- One marketplace file can list one plugin or many. **Restart Codex** to pick up changes.

### Publish, distribute & version
- Add marketplaces via `codex plugin marketplace add` (accepts `owner/repo`, Git/SSH URLs, or local paths). Remote git uses the **`git-subdir`** source type with `ref`/`sha` pinning.
- Each marketplace entry carries `policy.installation` (`AVAILABLE` / `INSTALLED_BY_DEFAULT` / `NOT_AVAILABLE`) and `policy.authentication` (e.g. `ON_INSTALL`), plus `category`.
- ⚠️ **The official Codex "Plugin Directory" and self-serve publishing/management are explicitly "coming soon"** and not available yet. Today, your only real distribution channels are **marketplace files + git-backed sources**. Expect this workflow to change once the directory launches.

---

## Part 3 — Access control & "can it be password-protected?"

**Short answer: No — neither platform has a native password or embedded-license lock on a plugin or marketplace.** Both delegate access control to the infrastructure around the plugin: git-host permissions, workspace/org membership, and (paid tiers) enterprise policy. Here are all the real options:

### For a solo owner who wants to gate access
1. **Private git repo (the main native option).** Put the plugin/marketplace in a private repo; access = who has repo access.
   - **Claude Code:** manual install/update uses your existing git credentials (SSH keys, `gh auth login`, macOS Keychain, `git-credential-store`). For **background auto-updates**, it reads provider tokens from env vars — `GITHUB_TOKEN`/`GH_TOKEN`, `GITLAB_TOKEN`/`GL_TOKEN`, `BITBUCKET_TOKEN` (interactive prompts can't run at startup).
     - ⚠️ **Known reliability gap:** through **Jan 2026**, Claude Code's internal git library **ignored standard credential helpers** (`~/.gitconfig` helper, `gh auth git-credential`, macOS Keychain), so private-repo marketplace installs often failed with `could not read Username` even with valid `gh auth`. Proposed fixes (git-based auth reuse; `VENDOR_TOKEN` HTTP basic-auth) were **user feature requests, not confirmed shipped**. Verify current state before depending on it.
   - **Codex:** supports SSH URLs and an `ON_INSTALL` authentication policy for private-repo distribution.
2. **Workspace/org boundary (Codex native).** Codex groups plugins into _Curated by OpenAI_ (everyone), _Shared with you_ (workspace members only), _Created by you_ (personal). "Shared with you" plugins **stay inside your ChatGPT workspace/org — accounts not signed into that workspace can't access them.** (Open question: this likely can't reach buyers _outside_ your org.)

### For teams / enterprises (requires paid plans)
- **Claude Code (Team/Enterprise):** Owners/Primary Owners manage **org-specific private marketplaces** (manual ZIP upload, or private-GitHub sync — the latter in private beta) in _Organization settings → Plugins_, with per-user provisioning and auto-install. Four install states: **Installed by default / Available / Not available (hidden) / Required (force-installed, can't remove)**. Admins lock down which marketplaces users may add via **`strictKnownMarketplaces`** in non-overridable managed settings (`[]` = total lockdown; a list = exact allowlist).
- **Codex (ChatGPT Business/Enterprise):** cloud-managed **`requirements.toml`** policies distributed per user **Group**, with workspace **RBAC + SCIM** group sync. Source allowlist **`restrict_to_allowed_sources = true`** rejects unapproved marketplace adds/installs; **MCP allowlists** gate servers by name+identity. Unauthorized users get `403 – Unauthorized. Contact your ChatGPT administrator.`

### License keys / API-key gating / paid licensing
- **Not a native feature in either ecosystem.** There is no documented built-in for embedding a license key or requiring an API key to unlock a plugin.
- **Workaround:** build it into your plugin's own code — e.g., the plugin (or its bundled MCP server) calls an external licensing/entitlement service on activation (tools like **Keygen** exist for offline/online license validation), or gates functionality behind an API key the user must supply. This is custom work, not platform-provided, and a determined user with the plugin source can bypass client-side checks — real enforcement has to live server-side (in an API/MCP server you control).

---

## Part 4 — Guaranteeing always-on instructions (hooks & AGENTS.md)

A plugin that ships an agent identity or safety rules hits a real problem: in *project* mode a `CLAUDE.md`/`AGENTS.md` at the working directory is read automatically, but in *plugin* mode there is **no automatic "read this file first" step**. Verified findings on how to force it:

### Claude Code — `SessionStart` hook (silent, automatic)
- Plugin hooks live at **`hooks/hooks.json`** at the plugin root (auto-discovered when the plugin is enabled; no manifest reference required).
- Schema: `hooks` → `SessionStart` → array of matcher groups → each with a `matcher` and a `hooks` array of `{type: "command", command}`.
- **Matchers are session sources:** `startup`, `resume`, `clear`, `compact`. Use all four to also survive context compaction in long sessions.
- **stdout is automatically injected into context** (plain text, no JSON required). So `cat ${CLAUDE_PLUGIN_ROOT}/AGENTS.md` at session start loads the file every time.
- `${CLAUDE_PLUGIN_ROOT}` is available inside the hook command.
- Source: https://code.claude.com/docs/en/hooks

### Codex — same hook, but trust-gated (not silent)
- Codex supports the **same `hooks/hooks.json` at the plugin root, same schema, same `SessionStart` event and matchers** (`startup`/`resume`/`clear`/`compact`), and SessionStart stdout / `hookSpecificOutput.additionalContext` is likewise **added as developer context**. Full event list: `SessionStart`, `SubagentStart`, `PreToolUse`, `PermissionRequest`, `PostToolUse`, `PreCompact`, `PostCompact`, `UserPromptSubmit`, `SubagentStop`, `Stop`.
- Codex exposes `PLUGIN_ROOT`/`PLUGIN_DATA` **and** legacy `CLAUDE_PLUGIN_ROOT`/`CLAUDE_PLUGIN_DATA` to hook commands — so a single command `cat "${CLAUDE_PLUGIN_ROOT:-$PLUGIN_ROOT}/AGENTS.md"` works under **both** runtimes. One `hooks/hooks.json` can serve both ecosystems.
- ⚠️ **The key difference:** plugin-bundled hooks in Codex are **non-managed / trust-gated** — Codex skips them until the user reviews and *trusts* the hook definition (and re-trusts if it changes). So on Codex the safety-spine load is a one-time user approval, **not** guaranteed silently on install.
- `.codex-plugin/plugin.json` can point `"hooks"` at a custom path; default is `hooks/hooks.json`.
- Source: https://developers.openai.com/codex/hooks and https://developers.openai.com/codex/plugins/build

### Codex `AGENTS.md` discovery (the hard-guarantee fallback)
- A plugin's own bundled `AGENTS.md` is **NOT** auto-loaded just by installing the plugin — `AGENTS.md` is not a recognized plugin component.
- Codex auto-loads `AGENTS.md` only from: **global** (`~/.codex/AGENTS.override.md` → `~/.codex/AGENTS.md`) and the **project tree** (project root walked down to cwd, `AGENTS.override.md` → `AGENTS.md` → `project_doc_fallback_filenames`), concatenated root-first with closer files overriding, capped at `project_doc_max_bytes` (32 KiB default).
- So the only *guaranteed, no-trust-needed* way to force always-on instructions on Codex is to have the user place the file at **`~/.codex/AGENTS.md`**.
- Source: https://developers.openai.com/codex/guides/agents-md

### Recommended layering for a safety-critical plugin (both ecosystems)
1. Ship a `SessionStart` hook (`hooks/hooks.json`) that cats the spine — silent on Claude Code, one-time-trust on Codex.
2. Point every `SKILL.md` at the spine ("read the safety rules first") as defense-in-depth (skills only load when invoked).
3. For a Codex hard guarantee, document copying the spine to `~/.codex/AGENTS.md`.

There is **no** documented declarative "always-on instructions" manifest field in either ecosystem (Codex's config `instructions` key is explicitly "reserved for future use").

## Best practices for smooth, reliable publishing (both ecosystems)

1. **Get the folder layout exactly right** — only the manifest in `.claude-plugin/` / `.codex-plugin/`; everything else at the plugin root. This is the most common silent failure.
2. **Always set and bump `version` (semver)** on releases. It's your rollout control valve; without it, every commit ships to everyone immediately.
3. **Pin git sources with `ref`/`sha`** when you want reproducible installs; use tags/releases as stable pointers.
4. **Test with the local-load path first** (`--plugin-dir` for Claude; local marketplace file + restart for Codex) before pushing.
5. **Validate your JSON** before publishing — official JSON schemas exist for Claude's `plugin.json`/`marketplace.json`; lint in CI to catch typos that break the whole marketplace.
6. **For private/paid distribution, decide the enforcement layer up front:** repo-permission gating is easy but coarse (anyone with the repo has everything); real per-customer entitlement needs a server-side check you build.
7. **Codex specifically:** treat today's git/marketplace-file distribution as temporary — the official directory and self-serve publishing are coming, and will likely change the recommended path. Don't over-invest in tooling around the current model.

---

## Caveats & open questions
- **Time-sensitivity is the biggest risk.** Codex's directory/self-serve publishing is unreleased; Claude's private-GitHub org sourcing was in private beta; Claude's private-repo auth was actively buggy through Jan 2026. Re-verify before relying on any of these.
- **Neither platform confirmed a native license-key/API-key entitlement feature** — assume you build that yourself if you want to sell gated functionality.
- **All enterprise controls require paid plans** (Claude Team/Enterprise; Codex Business/Enterprise) — none are available to a solo/free owner.

---

## Primary sources

**Claude Code**
- https://code.claude.com/docs/en/plugins-reference
- https://code.claude.com/docs/en/plugin-marketplaces
- https://code.claude.com/docs/en/hooks
- https://support.claude.com/en/articles/13837433-manage-plugins-for-your-organization
- https://claude.com/blog/cowork-plugins-across-enterprise
- https://github.com/anthropics/claude-plugins-official
- https://github.com/anthropics/claude-code/issues/9756
- https://github.com/anthropics/claude-code/issues/17201

**OpenAI Codex CLI**
- https://developers.openai.com/codex/plugins
- https://developers.openai.com/codex/plugins/build
- https://developers.openai.com/codex/mcp
- https://developers.openai.com/codex/config-reference
- https://developers.openai.com/codex/enterprise/managed-configuration
- https://developers.openai.com/codex/enterprise/admin-setup
- https://developers.openai.com/codex/hooks
- https://developers.openai.com/codex/guides/agents-md
