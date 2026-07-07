# OpenClaw KBs — Index

This index sits on top of fourteen **stack-reference** KB files for building, editing, and improving AI agents that run on **OpenClaw**. It exists to answer one question: *"I'm about to build X. Which OC_KB do I read first, and in what order?"*

Two kinds of KB live in this repo:

- **Project-state KBs** (`KB_1_Architecture.md`, `KB_8_Current_State.md`, `LESSONS.md`, `CHANGELOG.md`, `APP_CONCEPT.md`, `SCOPE.md`) — owned by *this* project, evolve as the agent ships, populated by `/kickoff` and maintained by `/ship` and `/update-kb`.
- **Stack-reference KBs** (the fourteen files below) — vetted patterns for OpenClaw + Anthropic Claude + MCP via mcporter. They do not change per project; they are read-mostly. This index is the routing layer.

The collection splits into two halves: `OC_KB_01–09` cover the **runtime stack** (architecture, skills, tools, models, cron, deploy, observability, evals). `OC_KB_10–14` cover **capability primitives** that sit on top of the runtime — diagnostic taxonomy, safety, trust, self-improvement, operational excellence. Most adopters read the runtime half first; the capability half pays back as the agent matures.

For per-file detail, open the OC_KB. This file does **not** repeat each KB's contents.

---

## File index

| File | Topic | Portability |
|---|---|---|
| `OC_KB_01_Architecture.md` | Runtime model — gateway, bootstrap loading, workspace tree, CLI | Runtime-required |
| `OC_KB_02_Skills.md` | SKILL.md format, frontmatter, 5-section convention, name=folder rule | Runtime-required |
| `OC_KB_03_MCP_Tools.md` | mcporter.json schema, stdio + HTTP entries, ${ENV_VAR} resolution, in-repo MCP server skeleton | Runtime-required |
| `OC_KB_04_Bootstrap_Files.md` | Purpose of the 9 bootstrap docs, character cap, cross-reference patterns | Runtime-required |
| `OC_KB_05_Models_and_Prompts.md` | Routing config (singular `model`), cache config (PLURAL `models`), per-cron keys, tier-role executor briefs | Runtime-required |
| `OC_KB_06_Cron_and_Scripts.md` | `openclaw cron` ops, deterministic vs LLM-driven crons, JSON-stdout convention | Runtime-required |
| `OC_KB_07_Deploy_and_Ops.md` | GitOps webhook+rsync, plist EnvironmentVariables, gateway restart / doctor / session cleanup | Runtime-required |
| `OC_KB_08_Observability.md` | Log locations, JSON-stdout convention, session transcript replay, cost via Anthropic Console | Runtime-required |
| `OC_KB_09_Evals.md` | **Aspirational** — golden-trace replay + diff-based regression. Framework gap; recommended pattern. | Aspirational |
| `OC_KB_10_Capability_Layers.md` | Five-layer diagnostic taxonomy (Perception, Extraction, Reasoning, Action, Data) for organizing skills and localizing failures | Convention |
| `OC_KB_11_Safety_Primitives.md` | Defensive write patterns: dry-run, sanity gate, round-trip verify, confidence scoring, undo, capability self-assessment, BLOCKED-never-invent gate | Convention |
| `OC_KB_12_Trust_and_Provenance.md` | Decision log, rationale storage, provenance flags, reconciliation hierarchy, audit trail conventions | Convention |
| `OC_KB_13_Self_Improvement_Loops.md` | **Aspirational** — correction memory, telemetry, edge-case library, self-retro, deviation reporting, template evolution | Aspirational |
| `OC_KB_14_Operational_Excellence.md` | SLOs per skill, canary, cost visibility, dashboards, rollback paths | Convention |

---

## By task

The OC_KB to read **first** is listed first; subsequent files add depth. Always also skim the relevant Always/Never list below before starting.

| Task | Read in order |
|---|---|
| **Set up a new OpenClaw agent project from scratch** | `OC_KB_01` → `OC_KB_04` → `OC_KB_02` → `OC_KB_03` → `OC_KB_07` |
| **Add a new skill** | `OC_KB_02` → `OC_KB_03` (if it uses new tools) → `OC_KB_05` (if it routes models differently) |
| **Register a new MCP server** | `OC_KB_03` → `OC_KB_07` (env vars on runtime host) |
| **Build an in-repo MCP server** | `OC_KB_03` → `OC_KB_07` (deploy+excludes) |
| **Add a scheduled cron job** | `OC_KB_06` → `OC_KB_05` (per-cron API keys) → `OC_KB_07` (where cron config lives) |
| **Configure model routing or prompt caching** | `OC_KB_05` → `OC_KB_04` (bootstrap-file character cap) |
| **Diagnose a "skill never activates" bug** | `OC_KB_02` (folder=name, user-invokable spelling) → `OC_KB_04` (cap truncation) |
| **Diagnose a "tool unavailable" bug** | `OC_KB_03` (mcpServers key, ${ENV_VAR} resolution) → `OC_KB_07` (plist) |
| **Diagnose a "deploy wiped my runtime state" bug** | `OC_KB_07` (rsync excludes) |
| **Add observability for cost or errors** | `OC_KB_08` → `OC_KB_05` (per-cron keys) → `OC_KB_14` (SLO + dashboard layer) |
| **Stand up a regression-detection eval** | `OC_KB_09` (aspirational pattern; adopter implements) |
| **Diagnose "the agent did the wrong thing" (Action-layer failure)** | `OC_KB_10` (which layer failed) → `OC_KB_11` (which safety primitive caught or missed) → `OC_KB_12` (decision log evidence) |
| **Add safety to a write-taking skill** | `OC_KB_11` → `OC_KB_03` (enforce gates at MCP-tool boundary) |
| **Add an audit trail / explain "why did the agent do X"** | `OC_KB_12` → `OC_KB_07` (rsync excludes for runtime-mutable log paths) → `OC_KB_06` (cron for log rotation/indexing) |
| **Tag skills by primary capability layer** | `OC_KB_10` → update `KB_1_Architecture.md` skill catalog |
| **Wire up self-improvement / learning from corrections** | `OC_KB_13` → `OC_KB_12` (decision log is the prerequisite) |
| **Define SLOs and rollback paths for production agents** | `OC_KB_14` → `OC_KB_05`+`OC_KB_06` (cost attribution) → `OC_KB_08` (data sources) |
| **Scope an agent-improvement initiative spec** | `_dev/agent-improvement-spec-template.md` → `OC_KB_10` (Section 5 spine) → `OC_KB_11–14` (Section 6 spine) |

---

## Always / Never (cross-cutting rules)

Each rule has a single canonical source — that's where the *why* lives. The point of listing them here is to surface the rules that show up in more than one KB so they don't get forgotten when you're heads-down in one file.

- **`mcporter.json` top-level key MUST be `mcpServers`.** Any other key (`servers`, `mcp_servers`, etc.) parses without error and silently fails. Source: `OC_KB_03`.
- **`${ENV_VAR}` substitution reads `process.env`, not `.env` files.** On macOS runtime hosts, the source is the launchd plist `EnvironmentVariables` dict. Source: `OC_KB_03` + `OC_KB_07`.
- **Skill folder name MUST equal frontmatter `name`.** Mismatch → router never sees the skill. Source: `OC_KB_02`.
- **Skill frontmatter spelling: `user-invokable`, NOT `user-invocable`.** Common typo silently un-callable. Source: `OC_KB_02`.
- **Bootstrap files have a per-file character cap.** Default ~20K (configurable as `bootstrapMaxChars` in `~/.openclaw/openclaw.json`). Long-running content silently truncates when it outgrows the cap. Source: `OC_KB_04`.
- **Prompt cache config goes under PLURAL `models`, NOT singular `model`.** Singular `model` is the routing config (primary/fallback). Plural `models[<id>].params.cacheRetention` is the cache config. Cross-pollination silently disables caching. Source: `OC_KB_05`.
- **Per-cron API keys, always.** Anthropic Console attributes cost per-key — the only practical way to see which cron is burning the budget. Source: `OC_KB_05` + `OC_KB_06`.
- **Deterministic scripts emit JSON to stdout, tagged messages to stderr.** `[script-name] msg` format on stderr. Mixed-format output breaks downstream parsing. Source: `OC_KB_06`.
- **`rsync --delete` excludes are load-bearing.** Adding a new runtime-mutable path (TASK-QUEUE.md, deliverables/, private/, etc.) without updating excludes wipes it on next deploy. Source: `OC_KB_07`.
- **Webhook receiver MUST verify HMAC with constant-time compare.** Standard `===` comparison is timing-attackable. Source: `OC_KB_07`.
- **Bootstrap files are loaded into context every conversation.** Never embed secrets there — they leak constantly. Source: `OC_KB_04`.
- **Bootstrap budget discipline.** The per-file cap is a ceiling, not a target. Aim for ~5K–15K chars per file; per-conversation content belongs in skills, not bootstrap. Source: `OC_KB_05` §Static-context optimization.
- **Action-layer side effects log to a decision log.** Without `inputs → rationale → outputs` records, "why did the agent do X six weeks ago?" is unanswerable. Source: `OC_KB_12`.
- **Provenance flags travel with extracted records.** Every value is `verified | inferred | unverifiable`. The flag drives the autonomous-vs-ask path in safety primitives. Source: `OC_KB_12`.
- **Learned patterns require human review before applying.** Self-improvement loops propose; humans approve. Auto-applied silent learning is how agent behavior drifts undetected. Source: `OC_KB_13`.
- **SLO breaches must have a defined response.** A tracked metric with no `on_breach` action is performance art. Source: `OC_KB_14`.

---

## Dependencies between OC_KBs

```
OC_KB_01 (architecture, runtime model)
   ↑
   ├── OC_KB_02 (skills) ←─ OC_KB_04 (bootstrap files reference skills via AGENTS.md)
   ├── OC_KB_03 (MCP tools)
   ├── OC_KB_04 (bootstrap files)
   ├── OC_KB_05 (models + prompts) ←─ depends on OC_KB_04 (prompts assembled from bootstrap)
   ├── OC_KB_06 (cron + scripts) ←─ depends on OC_KB_05 (per-cron keys)
   └── OC_KB_07 (deploy + ops) ←─ depends on OC_KB_03 (env vars), OC_KB_06 (cron config lives here)
       │
       └── OC_KB_08 (observability) ←─ depends on OC_KB_07 (where logs live)
       └── OC_KB_09 (evals — aspirational)

Capability primitives layer (sits on top of the runtime layer above):

OC_KB_10 (capability layers — diagnostic taxonomy, frames OC_KB_11–14)
   │
   ├── OC_KB_11 (safety primitives) ←─ targets Extraction + Action layers from OC_KB_10
   ├── OC_KB_12 (trust & provenance) ←─ targets Data + Extraction; runtime-mutable log paths require OC_KB_07 rsync excludes
   ├── OC_KB_13 (self-improvement — aspirational) ←─ depends on OC_KB_12 (decision log) + OC_KB_06 (cron)
   └── OC_KB_14 (operational excellence) ←─ depends on OC_KB_05 + OC_KB_06 (cost), OC_KB_08 (observability), OC_KB_12 (decision log)
```

---

## When to update these files

- The OpenClaw runtime ships a new feature that affects one of these areas → update the corresponding OC_KB and bump the version notes.
- A new silent-failure trap is discovered in production → add it to the canonical-source OC_KB AND the **Always / Never** list above.
- A new file is added or removed from `workspace/` → update `OC_KB_04` AND the deploy-script rsync-excludes guidance in `OC_KB_07`.
- A new model is added to Anthropic's lineup → add it to the routing-config example in `OC_KB_05` and update the cache-threshold table.
- A new safety primitive proves out in production → add it to `OC_KB_11` with the same anti-patterns + diagnosing structure.
- A new capability layer is needed (e.g., the runtime adds a multimodal sensor) → extend the `OC_KB_10` taxonomy and update `_dev/agent-improvement-spec-template.md` Section 5 spine.

---

## What these files do NOT cover

- **Specific MCP server integrations** — Gmail, Calendar, Slack, etc. Each adopter project documents these in `KB_1_Architecture.md`. The OC_KB family covers MCP **patterns** (mcporter.json shape, ${ENV_VAR} resolution), not catalogs of which servers exist.
- **Specific skill content** — what the skill does is project-content; how to write a SKILL.md is in `OC_KB_02`.
- **Anthropic API features beyond what OpenClaw exposes** — direct SDK use, batch API, files API. If you need those, build them into an in-repo MCP server and consult Anthropic's own docs.
- **Multi-agent orchestration across multiple OpenClaw instances** — V1 single-agent shape only.

---

## VERIFY BEFORE SHIPPING

These claims in this KB family rely on OpenClaw runtime defaults that may evolve. Verify against the running version before relying on:

- Default `bootstrapMaxChars` value (currently documented as ~20K) — confirm via `~/.openclaw/openclaw.json` on the runtime host.
- `extended-cache-ttl-2025-04-11` beta header for `cacheRetention: long` — confirm the OpenClaw gateway version still injects this automatically.
- `mcporter.json` schema (`mcpServers` key, stdio/HTTP entry shape) — confirm against the latest mcporter docs if behavior is unexpected.
- `openclaw cron` CLI surface (subcommands, flags) — confirm via `openclaw cron --help`; documented commands may have evolved.
- Per-MCP-server runtime stdout/stderr capture — confirm via `openclaw doctor` whether logs are landing where this KB family expects.
- The capability-primitives KBs (`OC_KB_10–14`) are framework conventions, not runtime-enforced. The taxonomy, primitive set, and document shapes are recommendations — the runtime does not validate them. Document the project's chosen subsets in `KB_1_Architecture.md` so future maintainers know what's wired up vs aspirational.
