> ⚠️ **This file is unpopulated until you run `/preflight` then `/kickoff`.** Do not edit manually — `/preflight` writes the `## Environment` block, then `/kickoff` discovery fills in the rest. If you see `[TODO]` markers, you haven't completed onboarding yet.

# Project: [TODO — run /kickoff to populate this]

> **This file is the project foundation.** Every Claude session reads it at the start.
> Onboarding sequence: `/preflight` (records agent + OS) → `/kickoff` (discovery session populates the project sections).

## Environment
[TODO — run /preflight to populate this. Captures which AI agent, OS, and shell are being used.]

## Overview
[TODO — what this agent does and for whom]

## Tech Stack
- Runtime: OpenClaw gateway (CLI: `openclaw`)
- Agent format: markdown skills + bootstrap files
- Tools: MCP via mcporter (`workspace/config/mcporter.json`)
- LLM: Anthropic Claude
- [TODO — model routing primary/fallback, populated during `/kickoff`]
- [TODO — MCP integrations, populated during `/kickoff`]
- [TODO — deploy story, populated during `/kickoff`]

## Build Commands
- Gateway restart (after mcporter.json or bootstrap-file changes): `openclaw gateway restart`
- Doctor / repair: `openclaw doctor --repair`
- Session cleanup: `openclaw session cleanup`
- Cron list (source of truth, NOT in-repo HEARTBEAT.md): `openclaw cron list`
- Deploy (push to canonical; webhook fires on the runtime host): `git push origin main`
- [TODO — per-MCP-server build commands, e.g., `cd workspace/mcp-servers/<name> && npm run build`]

## Roles
[TODO — agent capabilities and personas. Populated during /kickoff. Skip if single capability.]

## Core Entities
[TODO — main domain concepts the agent manages, not table names]

## Reference Documents

**Primary workflow** — `docs/MULTI_AGENT_WORKFLOW.md` is the canonical pattern for shipping any non-trivial chunk of work in this project. PM context drives a phase loop (pivot review → brainstorm → plan + audit → worker dispatch → reconciliation → implementation → verification → smoke → ship), workers execute focused slices in their own sessions. Entry point: `/orchestrate`. Read the workflow doc before starting a phase.

**Project state** (populated during development) — see `/docs` folder:
- `APP_CONCEPT.md`: Problem statement, users, use cases, success criteria
- `SCOPE.md`: V1 scope, out-of-scope, known unknowns
- `KB_1_Architecture.md`: Architecture decisions — skills, MCP integrations, model routing, deploy target
- `KB_8_Current_State.md`: Current phase and active tracking
- `CHANGELOG.md`: Running log of what was shipped and when — maintained by `/ship`
- `LESSONS.md`: Running log of gotchas and hard-won lessons — read before debugging or implementing in unfamiliar areas
- `smoke-tests-pending.md`: **Single source of truth** for outstanding manual smoke tests with stable IDs. When asked about ship-readiness or "what's left to verify," point here — do not re-list tests in commits, PRs, or chat. Add new tests when shipping behavior automated coverage misses; collapse passed sections to one-liners after each release.

**OpenClaw stack-reference KBs** (vetted patterns — consult the index, then read only the relevant OC_KB):
- `docs/OpenClaw KBs/OC_KB_00_Index.md` — start here. Routing layer over the OC_KB collection. Two halves:
  - **Runtime stack** (`OC_KB_01–09`): architecture, skills, MCP tools, bootstrap files, models & prompts, cron & scripts, deploy & ops, observability, evals.
  - **Capability primitives** (`OC_KB_10–14`): capability layers (diagnostic taxonomy), safety primitives, trust & provenance, self-improvement loops, operational excellence.

> **Note on KB numbering:** KB_1 and KB_8 are template-provided. Numbers 2–7 and 9 are reserved for project-specific knowledge bases added during kickoff (skill catalog, MCP server catalog, custom integrations, etc.). The `OC_KB_*` files in `docs/OpenClaw KBs/` are stack-reference patterns and are separate from the project-state KBs.

## Current Phase
[TODO — Phase 1: Not Started]

## Patterns
[Empty — patterns emerge during development. Add here when established so all future sessions inherit them.]
- Spec docs: Live in `/docs/` with `*-spec.md` naming (e.g., `docs/feature-name-spec.md`). Created by `/brainstorm` or `/unify` output, consumed by `/plan-review` and `/implement`.
- Agent-improvement spec template: `_dev/agent-improvement-spec-template.md` is the structural skeleton for non-trivial agent-improvement initiatives. Section 5 (Capability Fixes) is organized by the `OC_KB_10` capability layers; Section 6 (Capability Enhancements) is organized by the `OC_KB_11–14` enhancement axes.
- PM owns architectural decisions before worker dispatch (Phases 1–3 of `/orchestrate`). Workers receive locked plans, not forks. See `docs/MULTI_AGENT_WORKFLOW.md` → PM Pre-Dispatch Responsibilities.
- Spec docs become implementable once `/plan-review` writes a `Status: LOCKED YYYY-MM-DD` header. Drafts without the header are exploratory only — `/orchestrate` Phase 6 and `/implement` use the header to decide whether to dispatch workers. LOCKED certifies design completeness / dispatch-readiness, NOT user authorization to deploy — deploy stays gated at the Phase 9/10 checkpoints.
- Spec docs and `KB_1_Architecture.md` record architectural decisions in `Decision | Choice | Reasoning | Date` table format (per `_dev/agent-improvement-spec-template.md` §1).
- Scope graduation is separate authorization from design sign-off. A brief that declares design-only scope ("build nothing yet") is NOT upgraded to build+deploy authority by the user answering the design's open decisions — even build-scope ones. Before the first prod-mutating action (migration, prod write, push to a deploying branch), ask one explicit line ("Design ratified — proceed to build + deploy now?") and wait; announcing "proceeding to build" is not asking. Beware ratifying your own presupposition: if the phrase implying a built artifact originated in your question, the user's echo is not deploy authorization.

## Preferences
[TODO — populate during /kickoff with working style and communication preferences]

## Custom Commands
All commands live in `.claude/commands/`. On a fresh clone, run `/preflight` then `/kickoff` (greenfield) or `/adopt` (existing repo) before anything else.

### Orchestrators
| Command | Purpose |
|---------|---------|
| `/preflight` | One-time setup — records agent + OS in CLAUDE.md, verifies commands are project-local, sanity-checks mcporter.json. Run on every fresh clone. |
| `/kickoff` | Discovery session for **greenfield** agent projects — run after `/preflight` on a new repo |
| `/adopt` | Discovery session for **existing** agent projects — populate KBs from observation, audit existing user KBs, merge CLAUDE.md. Run after installer + `/preflight`. |
| `/update-framework` | Pull canonical framework updates with per-file review and assisted merge for customizations |
| `/orchestrate` | PM phase loop — pivot → brainstorm → plan + audit → workers → reconcile → implement → smoke → ship. See `docs/MULTI_AGENT_WORKFLOW.md`. |
| `/audit-full` | Full audit (code + infrastructure) in parallel |

### Planning & Review
| Command | Purpose |
|---------|---------|
| `/brainstorm` | Deep codebase research before committing to an approach |
| `/research` | Deep web research with synthesized report saved to `.research/` |
| `/investigate` | Deep exploration — trace data flow, find all usages |
| `/plan` | Create an implementation plan from investigation findings |
| `/plan-review` | Gap analysis on a spec doc before implementing |

### Implementation
| Command | Purpose |
|---------|---------|
| `/implement` | Execute a validated plan (parallel agents + post-batch validation) |
| `/debug` | Diagnose and fix a bug — root-cause investigation before code changes |
| `/unify` | Find duplicate/similar skills or scripts and design a unified replacement |
| `/ship` | Update KBs, write changelog entry, commit, push (deploy fires via webhook on push) |
| `/changelog` | Generate or update CHANGELOG.md from git history |

### Auditing
| Command | Purpose |
|---------|---------|
| `/audit-code` | Review code/plans for elegance, reuse, anti-patterns |
| `/audit-infra` | Audit infrastructure — mcporter config, env vars, deploy script, MCP server deps |

### Generators
| Command | Purpose |
|---------|---------|
| `/gen-skill` | Scaffold a new SKILL.md at `workspace/skills/<name>/` with valid frontmatter and 5-section skeleton |
| `/gen-test` | Generate tests following project patterns |
| `/visualize` | Generate ASCII diagrams |
| `/update-kb` | Update knowledge base documents |

## KB Maintenance
- Completed phases: collapse to 2–3 line summaries. Full history lives in git.
- KB_8 session notes: only for active blockers or cross-session context. Clear after resolution.
- Changelog: one-liner entries only.
- Always update CLAUDE.md phase status when updating other KBs.

## DO NOT
The following are canonical OpenClaw silent-failure traps. Each one parses as valid input and produces no error — the symptom only surfaces later as broken agent behavior. Treat these as hard constraints on every change.

- `mcporter.json` top-level key is `mcpServers`, NOT `servers`. Wrong key → tools silently absent.
- `${ENV_VAR}` substitution reads `process.env`, NOT `.env` files. On macOS runtime hosts, set in launchd plist `EnvironmentVariables`.
- Skill frontmatter spelling: `user-invokable`, NOT `user-invocable`. Typo → skill silently un-callable.
- Skill folder name MUST match frontmatter `name`. Mismatch → router never sees the skill.
- Bootstrap files have a per-file character cap (default ~20K, `bootstrapMaxChars` in `~/.openclaw/openclaw.json`). Long-running content silently truncates when it outgrows the cap.
- Prompt cache config goes under PLURAL `models`, NOT singular `model`. Singular `model` is the routing config; cache misplaced there silently disables caching.
- Adding a new runtime-mutable path (where the agent writes at runtime) requires updating the rsync excludes in `deploy/deploy.sh` BEFORE next deploy. Otherwise `rsync --delete` wipes the path.
- Memory/bootstrap files hold durable rules and query paths, NOT copies of system-of-record facts. A duplicated fact parses fine, then silently diverges from the source — the agent then defends the stale copy against the live system. Store the rule and the query path; fetch the facts fresh.

[TODO — add additional project-specific hard constraints during development]
