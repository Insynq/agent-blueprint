# Framework Changelog

All notable changes to the **agent-blueprint** framework.

Format: based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), structured for parsing by `/update-framework`.
Versioning: [Semantic Versioning](https://semver.org/).

## Parsing contract for `/update-framework`

The `/update-framework` command parses this file to surface migration notes and detect command renames during update operations. Maintainers of this framework MUST keep this format intact:

### Required structure

- Each version entry starts with: `## [X.Y.Z] - YYYY-MM-DD`
- The unreleased section uses: `## [Unreleased]`
- Within a version, subsections use H3 headers: `### Added`, `### Changed`, `### Removed`, `### Renamed`, `### Migration Notes`
- All five subsections are optional within a version; omit if empty (or include with content `N/A` or empty bullets — parser tolerates both)
- Order of subsections within a version: Added, Changed, Removed, Renamed, Migration Notes (parser is order-insensitive but consistency aids readability)
- Versions appear in **descending chronological order** (newest first), with `[Unreleased]` at the top

### `### Renamed` format (parser-critical)

One bullet per rename. Used by `/update-framework` to auto-create deprecation shims:

```
### Renamed
- `/old-command` → `/new-command` (slash command rename — auto-shim created)
- `docs/Old Path/` → `docs/New Path/` (directory rename — auto-detected during diff)
```

Format rules:
- Backticks around old and new names
- Single arrow `→` (Unicode) separating old and new — parser keys on this character
- Optional parenthetical explanation after the arrow
- Slash commands include the leading `/`

### `### Migration Notes` format

Free-form prose, displayed verbatim to users when they encounter the corresponding deprecated files during update. Group by what's changing:

```
### Migration Notes
- **`/old-command` → `/new-command`:** behavior is identical for V1; new name is more accurate. The auto-created shim will redirect for one version, then be removed in vX.Y.
- **`docs/Old Path/` → `docs/New Path/`:** Windows compatibility — colons in paths break `tar` extraction.
```

The parser surfaces these notes when:
- A user has the old file (rename detected via local file matching the canonical@install-version's old name)
- A `### Removed` entry mentions a file the user has locally

### Adopter projects do not have this file

Only the canonical repo (this repo) maintains `FRAMEWORK_CHANGELOG.md`. Adopter projects have their own `docs/CHANGELOG.md` for their project's state. Don't confuse the two.

---

## [Unreleased]

[Changes pending release land here.]

---

## [0.1.0] - 2026-05-08

Initial release of `@insynq/agent-blueprint`. Forked from `@insynq/app-blueprint` v0.1.3, reframed for OpenClaw agent dev. The two frameworks share the multi-agent workflow methodology and the slash-command structure but diverge in stack assumptions: this framework is opinionated for OpenClaw + Anthropic Claude + MCP via mcporter + GitOps deploy.

### Added

- **OpenClaw KB collection** at `docs/OpenClaw KBs/` — fourteen stack-reference KBs split into a runtime-stack half and a capability-primitives half:
  - **Runtime stack (`OC_KB_01–09`):**
    - `OC_KB_00_Index.md` — routing layer with by-task table + Always/Never rules + dependency tree
    - `OC_KB_01_Architecture.md` — runtime model, gateway, bootstrap loading, workspace tree
    - `OC_KB_02_Skills.md` — SKILL.md format, frontmatter, 5-section convention, name=folder rule
    - `OC_KB_03_MCP_Tools.md` — mcporter.json schema, ${ENV_VAR} resolution, in-repo MCP server skeleton
    - `OC_KB_04_Bootstrap_Files.md` — purpose of the 9 bootstrap docs + per-file character cap
    - `OC_KB_05_Models_and_Prompts.md` — routing (singular `model`) vs cache (PLURAL `models`) gotcha, per-cron API keys, **plus a new "Static-context optimization (system-prompt diet)" section** with bootstrap-budget discipline (~5K–15K char per-file targets, "if it changes per-conversation it doesn't belong in bootstrap" rule, references/ pattern for long-form domain knowledge)
    - `OC_KB_06_Cron_and_Scripts.md` — `openclaw cron` ops + deterministic-script JSON-stdout convention
    - `OC_KB_07_Deploy_and_Ops.md` — GitOps webhook+rsync, plist EnvironmentVariables, rsync-excludes correctness
    - `OC_KB_08_Observability.md` — log locations, session transcript replay, Anthropic Console cost
    - `OC_KB_09_Evals.md` — **aspirational** golden-trace replay pattern (framework gap; recommended shape)
  - **Capability primitives (`OC_KB_10–14`):**
    - `OC_KB_10_Capability_Layers.md` — five-layer diagnostic taxonomy (Perception / Extraction / Reasoning / Action / Data) for organizing skills and localizing failures; framing layer for OC_KB_11–14
    - `OC_KB_11_Safety_Primitives.md` — defensive write patterns: dry-run, sanity gate, round-trip verify, confidence scoring, pre-write assumption surfacing, soft-delete + time-delayed commits, undo primitive, capability self-assessment
    - `OC_KB_12_Trust_and_Provenance.md` — decision log, rationale storage, provenance flags (verified | inferred | unverifiable), reconciliation hierarchy, audit trail conventions
    - `OC_KB_13_Self_Improvement_Loops.md` — **aspirational** — correction pattern memory, skill effectiveness telemetry, edge-case library, weekly self-retro, deviation self-reporting, template evolution
    - `OC_KB_14_Operational_Excellence.md` — SLOs per skill (with `on_breach` responses), canary testing of skill changes, cost visibility (per-cron API keys, cross-ref `OC_KB_05`/`OC_KB_06`), dashboards (cross-ref `OC_KB_08`), skill-change rollback paths
- **`workspace/` template** with the 9 bootstrap files as empty scaffolds (SOUL, AGENTS, TOOLS, SCHEMA, MEMORY, HEARTBEAT, NOTIFICATIONS, TASK-QUEUE, INDEX) plus `config/mcporter.json` (`{ "mcpServers": {} }`) and READMEs for `skills/`, `mcp-servers/`, `scripts/`.
- **`deploy/` template** with `deploy.sh` (git-pull + rsync skeleton with TODO markers), `webhook-receiver.js` (HMAC-verified entry point), `com.example.openclaw-deploy.plist.template` (launchd unit), and `README.md`.
- **`_dev/` template** with `onboarding-checklist.md`, `skill-template.md`, `validation-checklist.md`, and **`agent-improvement-spec-template.md`** — an 11-section structural skeleton for non-trivial agent-improvement initiatives (Section 5 organized by `OC_KB_10` capability layers; Section 6 organized by `OC_KB_11–14` enhancement axes).
- **`/gen-skill` command** at `.claude/commands/gen-skill.md` — scaffolds a new `workspace/skills/<name>/SKILL.md` with valid frontmatter (name=folder, user-invokable spelling) and the 5-section skeleton.
- **CLAUDE.md DO NOT section pre-filled** with the canonical OpenClaw silent-failure traps (mcpServers key, ${ENV_VAR} source, user-invokable spelling, folder=name, bootstrap char cap, cache plural-models, rsync excludes).
- **Permissions allowlist** in `.claude/settings.json` — three-tier (`allow` / `ask` / `deny`) policy that defines an autonomy contract: edit/write/build/install/stage are allowed without prompting; commit/push/destructive-git/cron-mutation/`rm -rf`/`npm publish` ask first; force-push, `rm -rf /`, `rm -rf ~`, and `sudo` are denied. Documented in README.md under "Autonomy contract."

### Changed

- **Package identity:** `@insynq/app-blueprint` → `@insynq/agent-blueprint`. New canonical repo at `Insynq/agent-blueprint`. Bin command renamed to `agent-blueprint`. Version reset to `0.1.0`.
- **`/audit-full` bundle:** reduced from `audit-code + audit-rls + audit-infra` to `audit-code + audit-infra`. Future candidates for inclusion: `/audit-skills`, `/audit-mcporter`.
- **Web-stack-flavored commands genericized to OpenClaw equivalents** per the framework's mapping rules:
  - `/audit-infra` rewritten around mcporter.json shape, plist env-var resolution, deploy-script HMAC + rsync-excludes, MCP server deps
  - `/implement` rewritten around skill / MCP server / mcporter.json / bootstrap-file batching (no DB migrations, no edge functions)
  - `/debug` rewritten around 6 OpenClaw layers (skill routing, bootstrap loading, MCP/tool, model/prompt, cron/script, deploy/runtime)
  - `/audit-code`, `/brainstorm`, `/preflight`, `/research`, `/ship`, `/visualize`, `/orchestrate`, `/update-framework`, `/kickoff`, `/adopt` had stack-specific examples replaced with OpenClaw equivalents (gateway, mcporter, plist, rsync, cron)
- **`.env.example`** rewritten — comments clarify that real secrets live in launchd plist `EnvironmentVariables`, not `.env`. `.env` is for local-dev MCP servers only.
- **CLAUDE.md template:** Tech Stack pre-fills OpenClaw runtime; Build Commands pre-fills `openclaw gateway restart`/`doctor`/`session cleanup`/`git push origin main`; Reference Documents points at `docs/OpenClaw KBs/`; Custom Commands table reflects 22 commands (was 25); Roles relabeled as "agent capabilities and personas".

### Removed

- All web-stack KB folders: `docs/Supabase Structure KBs/`, `docs/UI-UX KBs/`, `docs/Auth KBs/`, `docs/Bill KBs/`, `docs/Form KBs/`, `docs/AI KBs/`, `docs/Test KBs/`, `docs/Job KBs/`, `docs/Obs KBs/`.
- `docs/KB_7_UI_Patterns.md` and `docs/KB_9_Screen_Catalog.md` (UI-shaped templates).
- Web-stack-only commands: `/db-push`, `/gen-migration`, `/audit-rls`, `/gen-component`.
- `docs/AUDIT_FINDINGS.md` (one-off audit output not template content).
- `docs/plans/framework-distribution/` (app-blueprint's own development plans).

### Renamed

- N/A (initial release of new package; no renames within `agent-blueprint` itself yet)

### Migration Notes

- **For users coming from `@insynq/app-blueprint`:** this is a sibling framework, not an upgrade path. There is no migration tool. If you have an OpenClaw agent project that was scaffolded with `app-blueprint`, you'll need to fresh-install `agent-blueprint` and use `/adopt` to merge in your existing project state.
- **Future commands under consideration:** `/gen-mcp-server` (scaffold an in-repo MCP server with @modelcontextprotocol/sdk + zod boilerplate), `/audit-skills` (validate folder=name and frontmatter spelling across all skills), `/audit-mcporter` (validate `mcpServers` key + ${ENV_VAR} resolution against deploy plist template). These are framework gaps tracked here for adopters who want them sooner. The `/audit-full` bundle would expand to include them when they ship.
- **For adopters of the capability-primitives KBs (`OC_KB_10–14`):** these are framework conventions, not runtime-enforced. Adopt incrementally — most projects start with the decision log from `OC_KB_12` (prerequisite for the self-improvement loops in `OC_KB_13`) and the per-cron API keys from `OC_KB_05`+`OC_KB_06` (prerequisite for the cost visibility in `OC_KB_14`). Document the chosen subset in `KB_1_Architecture.md` so future maintainers know what's wired up vs aspirational.
- **Autonomy contract in `.claude/settings.json`:** the merged-in permissions allowlist enables set-and-forget autonomy on local file/code work and preserves prompts only for irreversible / shared-state operations. Adopters can override locally in `.claude/settings.local.json` if their workflow needs a different boundary.
