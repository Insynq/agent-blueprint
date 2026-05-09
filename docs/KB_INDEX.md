# KB Index — task-routing for an OpenClaw agent project

This index sits on top of the project's two KB families: **project-state KBs** (owned by your project, evolve as you ship) and **stack-reference KBs** (vetted patterns for OpenClaw, read-mostly).

It exists to answer one question: *"I'm about to do X. Which file do I read first, and in what order?"*

---

## Project-state KBs (this project owns these)

These files describe what *this specific* agent project is — its problem, scope, architecture, current state, and accumulated lessons. They evolve as you ship.

| File | Purpose | Maintained by |
|---|---|---|
| `APP_CONCEPT.md` | Problem statement, users, use cases, success criteria | `/kickoff`, manual edits |
| `SCOPE.md` | V1 scope, out-of-scope, known unknowns | `/kickoff`, manual edits |
| `KB_1_Architecture.md` | Architecture decisions: skills, MCP integrations, model routing, deploy target | `/kickoff`, `/adopt`, `/update-kb` |
| `KB_8_Current_State.md` | Active phase, session notes, changelog | `/orchestrate`, `/ship`, `/update-kb` |
| `CHANGELOG.md` | Running log of what shipped when | `/ship`, `/changelog` |
| `LESSONS.md` | Running log of gotchas and hard-won lessons | manual edits during `/debug` and `/audit-*` workflows |
| `smoke-tests-pending.md` | Single source of truth for outstanding manual smoke tests with stable IDs | `/ship`, `/implement` |
| `MULTI_AGENT_WORKFLOW.md` | Optional methodology — PM + worker context-window pattern | framework-managed; reference only |

KB numbering: `KB_1` and `KB_8` are template-provided. Numbers `2`–`7` and `9` are reserved for project-specific knowledge bases added during kickoff (skill catalog, MCP server catalog, custom integrations, etc.).

## Stack-reference KBs (read-mostly, vetted patterns)

These describe how OpenClaw works — runtime model, skills, MCP, bootstrap files, models & prompts, cron & scripts, deploy & ops, observability, evals. They don't change per project. Read them when you're about to do something in their domain.

| File | Topic |
|---|---|
| `docs/OpenClaw KBs/OC_KB_00_Index.md` | Routing layer — by-task table + Always/Never rules. **Start here.** |
| `docs/OpenClaw KBs/OC_KB_01_Architecture.md` | Runtime model, gateway, bootstrap loading, workspace tree |
| `docs/OpenClaw KBs/OC_KB_02_Skills.md` | SKILL.md format, frontmatter, 5-section convention, name=folder rule |
| `docs/OpenClaw KBs/OC_KB_03_MCP_Tools.md` | mcporter.json schema, ${ENV_VAR} resolution, in-repo MCP server skeleton |
| `docs/OpenClaw KBs/OC_KB_04_Bootstrap_Files.md` | Purpose of the 9 bootstrap docs, character cap, cross-references |
| `docs/OpenClaw KBs/OC_KB_05_Models_and_Prompts.md` | Routing (singular `model`) vs cache (PLURAL `models`), per-cron API keys |
| `docs/OpenClaw KBs/OC_KB_06_Cron_and_Scripts.md` | `openclaw cron` ops, deterministic-script JSON-stdout convention |
| `docs/OpenClaw KBs/OC_KB_07_Deploy_and_Ops.md` | GitOps webhook+rsync, plist EnvironmentVariables, rsync-excludes correctness |
| `docs/OpenClaw KBs/OC_KB_08_Observability.md` | Log locations, session transcript replay, Anthropic Console cost |
| `docs/OpenClaw KBs/OC_KB_09_Evals.md` | **Aspirational** golden-trace replay pattern (framework gap) |
| `docs/OpenClaw KBs/OC_KB_10_Capability_Layers.md` | Five-layer diagnostic taxonomy (Perception, Extraction, Reasoning, Action, Data) for organizing skills and localizing failures |
| `docs/OpenClaw KBs/OC_KB_11_Safety_Primitives.md` | Defensive write patterns: dry-run, sanity gate, round-trip verify, confidence scoring, undo, capability self-assessment |
| `docs/OpenClaw KBs/OC_KB_12_Trust_and_Provenance.md` | Decision log, rationale storage, provenance flags, reconciliation hierarchy, audit trail conventions |
| `docs/OpenClaw KBs/OC_KB_13_Self_Improvement_Loops.md` | **Aspirational** — correction memory, telemetry, edge-case library, self-retro, deviation reporting, template evolution |
| `docs/OpenClaw KBs/OC_KB_14_Operational_Excellence.md` | SLOs per skill, canary, cost visibility, dashboards, rollback paths |

`OC_KB_05` was augmented in v0.1.0 with a "Static-context optimization (system-prompt diet)" section — bootstrap budget discipline that pairs with the `bootstrapMaxChars` ceiling from `OC_KB_04`.

For per-task routing across the OC_KB family, open `docs/OpenClaw KBs/OC_KB_00_Index.md` — it has a "by task" table that's more granular than this index.

---

## When to update this file

- A new project-state KB is added (e.g., `KB_3_Skill_Catalog.md`) → add a row in the project-state table.
- A new OC_KB is added to the framework → add a row in the stack-reference table.
- A new task class spans multiple KBs in a non-obvious way → consider adding routing guidance, or update `OC_KB_00_Index.md`'s by-task table directly.

Do **not** mirror per-OC_KB rules into this file. The OC_KB family's own index is the canonical home for OpenClaw-specific rules; this index only links.
