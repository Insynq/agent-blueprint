---
description: Guided discovery session — defines your agent's identity, capabilities, MCP integrations, and deploy story before any code is written
---

# Kickoff — Agent Discovery & Foundation Setup

**This is a conversation command.** No code gets written until we've worked through the discovery together. The files produced at the end become the indexed foundation every future Claude session reads.

**Prerequisite:** `/preflight` should have been run first — it captures which agent and OS the project is being worked on with. Before starting, check whether `CLAUDE.md` has a populated `## Environment` section (real values, not `[TODO]`). If not, tell the user: "Run `/preflight` first, then come back to `/kickoff`." Don't proceed until preflight has run.

**If you want to skip a phase or already have answers ready**, say "skip" or paste your answers directly. Kickoff adapts to what you already know.

**If the idea isn't fully formed yet**, that's okay. We can do a shorter "concept sketch" session: just describe the problem you're trying to solve and the type of person experiencing it. Everything else can come later.

## What Kickoff Produces

| File | Purpose |
|------|---------|
| `docs/APP_CONCEPT.md` | Problem statement, users, use cases, success criteria |
| `docs/SCOPE.md` | V1 boundaries, explicit out-of-scope, known unknowns |
| `CLAUDE.md` | Runtime, agent identity, capabilities, deploy story — populated for this project |
| `docs/KB_1_Architecture.md` | Architecture decisions: skills inventory, MCP integrations, model routing, deploy target |
| `docs/KB_8_Current_State.md` | Phase tracker (starts at Phase 1: not started) |
| `.claude/memory/project_concept.md` | Project concept seed for future sessions |
| `.claude/memory/project_preferences.md` | Working style seed for future sessions |

The template also ships `docs/smoke-tests-pending.md` (empty catalog for tracking outstanding manual smoke tests with stable IDs) and `.github/pull_request_template.md`. You don't need to edit these during kickoff — the catalog is filled in as you ship features that need manual verification.

The `workspace/`, `deploy/`, and `_dev/` scaffolds are also pre-populated as empty templates by the framework. You'll fill the bootstrap files (SOUL/AGENTS/TOOLS/etc.) and the first SKILL.md as you build the agent — kickoff doesn't write those.

## Why Discovery Before Code

The most expensive mistakes happen when you build the wrong agent with confidence. This session is designed to:
1. Force clarity on what the agent does and for whom, before code
2. Establish capability boundaries (which skills, which MCP integrations) before getting into details
3. Define V1 scope explicitly (what's IN and what's explicitly OUT)
4. Lock in deploy target so deploy script and plist template aren't a surprise later
5. Create a foundation that every future Claude session reads without needing re-explanation

## Instructions for Claude

Work through the 5 phases below **in order**. Follow these rules:

1. **Ask one question at a time.** Wait for the answer before continuing.
2. **Build on what you've learned.** Don't ask something the user already answered. Reference their earlier answers in follow-ups.
3. **At the end of each phase**, briefly summarize what you've learned. Give the user a chance to correct anything before moving on.
4. **Be a thinking partner, not a form.** Push back gently if answers are vague, solution-focused instead of problem-focused, or if V1 scope seems too large.
5. **Problem-first framing.** The first question is about the problem, not the agent design. Redirect if the user jumps to features.
6. **Push back on lazy or evasive answers.** If the user says variants of "I don't care, just do it," "surprise me," "you decide," "whatever you think is best," "just make something cool," or otherwise tries to outsource the thinking — STOP and push back. Don't steamroll past it. Sample script:

   > "I'm happy to make recommendations once we have something to work with, but I need a real signal from you on the problem and the user. Those are choices only you can make. If I just spin up something random, I'll burn through your time and tokens producing work that probably won't fit what you actually want. Even a rough sketch is enough — what's pulling you toward this agent? What pain were you noticing when the idea showed up?"

   Don't be apologetic about asking. The whole point of this session is to extract real intent — every downstream command produces lower-quality work without it. Hold the line firmly but warmly: this is care, not gatekeeping.

After all 6 rules and 5 phases, present a synthesis for approval, then write the files.

---

## Step 0 — Deliver the Welcome

Before asking any discovery questions, deliver this welcome to the user. Reproduce it largely verbatim — light tone-matching is fine, but don't paraphrase away the structure. End with the "Ready?" prompt and **wait** for confirmation before starting Phase 1.

```
Welcome to agent-blueprint — a project template for building, editing, and improving AI agents that run on OpenClaw. It's by Insynq (https://github.com/Insynq/agent-blueprint), designed to help you ship production agents systematically with AI coding agents.

**The philosophy:** clarity before code. The most expensive agent mistakes happen when you build the wrong skill, register the wrong MCP server, or wire the wrong cron — with confidence. Every command in this template enforces a discovery-first workflow: kickoff → brainstorm → plan-review → implement → ship — plus support commands for debugging, audits, and skill scaffolding.

**Opinionated for OpenClaw.** This framework assumes:
- Long-lived `openclaw` gateway loading bootstrap files from `workspace/`
- Skills as `workspace/skills/<name>/SKILL.md`, loaded on demand by description match
- Tools exclusively via MCP, registered in `workspace/config/mcporter.json`
- Anthropic Claude as the LLM (with prompt caching configured under PLURAL `models`)
- GitOps deploy: webhook → HMAC verify → `git pull` → `rsync --delete workspace/`

If your stack diverges from any of those, this is the wrong framework — consider Insynq's general application framework for non-OpenClaw projects.

**What's already on disk:**
- 22 commands in `.claude/commands/` — kickoff, adopt, brainstorm, plan, implement, ship, debug, audits, generators, update-framework
- OpenClaw stack-reference KBs in `docs/OpenClaw KBs/` covering runtime, skills, MCP, bootstrap files, models & prompts, cron & scripts, deploy & ops, observability, and an aspirational evals shape
- Empty `workspace/`, `deploy/`, and `_dev/` scaffolds you'll fill as you build
- A persistent memory directory at `.claude/memory/` so context carries across sessions

**What kickoff does next:** a 5-phase guided discovery (~10–15 minutes) capturing the problem the agent solves, the user it serves, V1 scope, agent shape (skills + MCP + cron + deploy), and working style. I'll write seven foundation files at the end that every future session reads.

**Tip — voice input:** if typing feels slow, click the microphone icon in the VS Code chat panel and just talk. The transcription is surprisingly accurate, you can edit it before sending, and it dramatically speeds up discovery sessions like this one. Especially helpful for the open-ended "describe the problem" questions where typing a paragraph feels like a chore.

One question at a time. If you have answers ready, paste them and we'll skip ahead. Push back if anything feels off — this is a conversation, not a form. And if you find yourself tempted to say "just pick something for me," resist — I'd rather take an extra minute now to get your real input than spin up the wrong thing fast.

Ready? Phase 1 starts with the problem you're trying to solve.
```

After the user confirms (any affirmative — "yes", "go", "ready", or just answering the first Phase 1 question directly), proceed to Phase 1.

---

## Phase 1 — The Problem

**Goal:** Understand what problem this agent solves and why it matters.

Ask in sequence (one at a time, wait for each answer):

1. "What problem are you trying to solve? Describe it the way someone experiencing it would — not the solution, just the pain or gap."

2. "Who specifically has this problem? Describe the person or team in concrete terms — their role, their day-to-day, what they're doing when they hit this friction."

3. "How do they currently deal with it? Other tools, manual workarounds, or nothing at all?"

4. "Why does the current approach fall short?"

5. "Why is now the right time to build this?"

6. "Is this a solo project or a team? (This affects deploy hygiene, per-cron API key strategy, and whether you need a multi-agent orchestrator.)"

**Phase 1 close:** Summarize the problem and user in 2–3 sentences. Confirm with the user before moving on. If the description is vague or still solution-focused, ask one more clarifying question before moving on.

---

## Phase 2 — The Agent

**Goal:** Understand what the agent does at a high level — without diving into the skill catalog yet.

Ask in sequence:

1. "What kind of agent is this? Pick the closest match — I'll adapt the rest of kickoff to fit:
   - **Assistant agent** — responds to user requests, conversational, mostly user-invokable skills
   - **Background-worker agent** — proactive, cron-driven, mostly invisible to a single user
   - **Monitoring / status-reporting agent** — heartbeat-driven, alerts when thresholds cross
   - **Router agent** — dispatches work to other agents or external systems
   - **Operator's agent** — used by the agent's author for runtime ops (deploy, audit, restart)
   - **Other** — describe in your own words"

   Use the answer to inform follow-up phrasing. (E.g., a background-worker agent's "happy path" is a cron firing, not a user typing.)

2. "What does your agent do to address that problem? Give me the one-sentence elevator pitch."

3. "Walk me through one canonical interaction end-to-end. For an assistant, that's a user request → activated skill → tools used → response. For a background worker, that's a cron firing → script + LLM run → external side-effect. For a monitor, that's a heartbeat tick → check → notification routing."

4. "Are there multiple personas or capability clusters this agent operates as? (E.g., 'reads emails as a triage assistant AND fires nightly summaries as a monitor'.) If so, name them."

5. "What's the single most important thing this agent must do to be worth building?"

**Phase 2 close:** Summarize the agent and its primary user. Confirm before moving on.

---

## Phase 3 — V1 Scope

**Goal:** Establish clear, explicit boundaries for the first version. This is the most important phase for preventing scope creep later.

Ask in sequence:

1. "What does 'done' look like for V1? What would make you confident enough to put this agent in front of real usage (yourself, your team, or end users)?"

2. "What's explicitly NOT in V1? I want a deliberate list — not 'maybe later,' but things you've consciously decided to defer. Common deferrals for agents: extra MCP integrations, multi-agent dispatch, finer-grained skills, advanced observability, evals."

3. "What are the biggest unknowns right now? Things you haven't figured out yet — model choice, MCP availability, deploy target, whether a particular skill is feasible."

4. "Is there a deadline or external pressure driving V1?"

**Coaching note:** Push back if V1 contains more than 2–3 distinct capabilities. A red flag example: "I want triage, scheduling, summarization, an admin dashboard, and a Slack bot" as V1. Ask: "Which ONE capability is the core value — the one where, if it worked perfectly, you'd consider V1 a success?" Everything else is V2.

**Phase 3 close:** Summarize what's in scope and what's out. Confirm before moving on.

---

## Phase 4 — Technical Foundation

**Goal:** Lock in model routing, MCP integrations, cron strategy, and deploy target — the OpenClaw-specific decisions that drive everything downstream.

Ask in sequence:

1. **Model routing.** "What models do you want to use? Recommended default: Sonnet 4.6 primary, Haiku 4.5 fallback. Use Opus 4.7 only for genuinely-hard reasoning skills (it's much more expensive). For cache-heavy long-system-prompt agents, plan for `cacheRetention: 'long'` (1 hour, requires the extended-cache beta header — the framework injects it). Any preference?"

2. **Skills inventory (V1).** "What skills do you need at launch? Each skill is a single SKILL.md with frontmatter + 5 sections. Be concrete — name them and describe what each does. (Don't worry about implementing them now — we just need the inventory.) Aim for 1–5 skills in V1; you can always add more."

3. **MCP integrations.** "Which external systems will this agent interact with via MCP? Examples: Gmail, Calendar, Slack, GitHub, custom internal APIs, in-repo MCP servers you'll build. For each, will you use a published mcporter package, write your own server in `workspace/mcp-servers/`, or use a community/third-party server?"

4. **Cron / proactive behavior.** "Will this agent run on a schedule? If yes, describe the cron jobs — what fires, how often, what they output. Two flavors: deterministic Node scripts (cheap, fast, no LLM) and LLM-driven crons (each gets a per-cron API key for cost attribution)."

5. **Notification routing.** "Where should the agent send notifications, alerts, or status reports? Slack, email, Discord, GitHub issues, a personal dashboard, all of the above? This populates `workspace/NOTIFICATIONS.md`."

6. **Deploy target.** "Where will the OpenClaw gateway run? Recommended: GitOps-style with a Mac mini (or Linux box) running launchd. Webhook on push → HMAC verify → `git pull` → `rsync --delete workspace/`. Alternatives: dev-only (local laptop), manual deploy, hosted Linux. The framework's `deploy/` scaffold assumes the GitOps pattern — pick something different and we'll adapt."

7. **Required env vars.** "What env vars / secrets does the agent need at launch? At minimum: `ANTHROPIC_API_KEY` and `WEBHOOK_SECRET`. Plus per-MCP-server auth tokens. List them now if you know them."

8. **Working alongside others.** "Will anyone else be working on this agent? If so, what's their experience level with OpenClaw / agent dev?"

**Phase 4 close:** Summarize the model routing, skills inventory, MCP integrations, cron strategy, and deploy target. Confirm before moving on.

---

## Local-Dev Tooling Recommendations

**Goal:** Surface CLI tools and local-dev dependencies that measurably speed up agent dev.

Present this between Phase 4 and Phase 5. Frame it as: "Before we get to working style, here are some tools that will measurably speed up dev for an OpenClaw agent. These are recommendations, not mandates — install what fits, skip what doesn't."

### Always-recommend (Tier 1 — broadly applicable)

Filter by what the user said in Phase 4 — only present items relevant to their setup.

- **`openclaw` CLI** — REQUIRED on the runtime host. Optional on a separate dev machine, but most workflows assume it's present. Provides `gateway restart`, `doctor --repair`, `cron list/edit/create`, `session cleanup`, `models auth paste-token`, `message send`. Install per the OpenClaw distribution.
- **GitHub CLI (`gh`)** — Used by `/ship`, but worth installing for `gh run watch`, `gh pr checks`, `gh release create`. Lets agents act on PRs and releases end-to-end.
- **`jq`** — Read and slice JSON output from deterministic scripts, mcporter.json, and gateway logs. Cheaper than spinning up a script for one-off inspections.
- **`shasum` (macOS) / `sha256sum` (Linux)** — Verify webhook payloads or release tarballs by hand when something looks off.

### Conditionally-recommend (Tier 2 — only if Phase 4 indicated relevance)

- **`launchctl` familiarity** *(if deploying to a Mac mini runtime host)* — `launchctl bootstrap`, `launchctl print`, `launchctl unload`. Knowing the basics saves you from "why doesn't my plist EnvironmentVariables update reflect" head-scratchers.
- **`rsync`** *(if using the GitOps deploy pattern)* — Already on macOS/Linux. Worth reading the man page for `--exclude`, `--delete`, `--dry-run`. Misconfigured excludes are the canonical "deploy wiped my runtime state" trap.
- **In-repo MCP server tooling** *(if you'll build your own MCP servers)* — `pnpm` or `bun` for fast installs, `tsx` for direct TypeScript execution, `@modelcontextprotocol/sdk@1.x` + `zod` as the canonical dependencies.
- **Anthropic Console access** *(always)* — per-key cost attribution lives there; create one API key per cron for visibility.

### KB-specific tools (Tier 3)

If the agent grows into the territory of any specific OpenClaw KB (deploy, observability, evals), additional CLIs may be surfaced in those KBs' index files. No need to set them up at kickoff time.

### How to present this

After listing the tier 1 items relevant to their stack and any tier 2 items that match their answers, ask: **"Want a one-line install script for the tier 1 tools? Or are you good to install as you go?"**

If yes, generate a platform-specific install command — `brew install` for macOS (the OS comes from `/preflight`'s populated `## Environment` block in `CLAUDE.md`), `apt`/`dnf` equivalents for Linux. Show the script for the user to run; do not execute it for them.

If "good to go" or "skip", just move to Phase 5.

---

## Phase 5 — Working Style

**Goal:** Seed project memory so future Claude sessions don't need to re-establish how to work with this person.

Ask in sequence:

1. "How do you like to work with Claude? Terse and direct? Verbose with context? As a senior engineer? As a product thinking partner?"

2. "Any strong opinions about code, architecture, or approaches you want to avoid?"

3. "How much autonomy should Claude take vs. checking with you? Decide independently when obvious? Always confirm before changes? Something in between? ('Decide and tell me' vs. 'always show options' vs. a mix.)"

4. "When speed and quality conflict, which wins? For example: 'ship fast, refactor later' vs. 'get it right the first time.'"

5. "What should Claude always ask you before doing? For example: 'ask before adding a new MCP server', 'ask before changing model routing', 'ask before adding a new cron'. Or nothing — full autonomy is fine too."

**Phase 5 close:** Summarize preferences. Confirm before writing files.

---

## Synthesis & File Writing

### Step 1: Present a synthesis

Write a 3–4 paragraph summary covering: the problem and user, what the agent does (including primary value driver and first target user), V1 scope, model + MCP + cron + deploy decisions, and working style preferences.

Ask: **"Before I write the files — does this accurately capture what you want to build?"**

Wait for confirmation. Revise if needed before proceeding.

---

### Step 2: Write all files

After confirmation, write every file below.

---

#### `docs/APP_CONCEPT.md`

```markdown
# Agent Concept: [Agent Name]

## The Problem
[1–2 paragraphs: what the problem is, who experiences it, why current approaches fall short]

## The Solution
[What this agent does — elevator pitch + canonical interaction walkthrough]

## Users / Operators

### [User / Operator Type 1]
[Role, goals, key interactions with the agent]

### [User / Operator Type 2 — if applicable]
[Role, goals, key interactions]

## Primary Value Driver
[The one thing that makes this worth building — the core insight, not a skill list]

## First Target User
[Which user/operator type V1 is optimized for, and why]

## Success Criteria
[What does a successful V1 look like? One measurable outcome that would validate the concept, plus any additional criteria]

## Why Now
[The timing rationale]
```

---

#### `docs/SCOPE.md`

```markdown
# V1 Scope

## In Scope
- [Skill / capability]
- [MCP integration]
- [Cron job]

## Explicitly Out of Scope (V1)
- [Item — with brief reason why it's deferred]
- [Item]

## Known Unknowns
- [Thing that isn't decided yet — model choice, MCP feasibility, deploy target detail, etc.]
- [Risk or open question]

## Definition of Done
[The specific criteria that signal V1 is ready for real usage]

## Deadline / External Driver
[If applicable, otherwise: None identified]
```

---

#### `CLAUDE.md`

**Before writing:** Read the existing `CLAUDE.md`. If it contains an `## Environment` section with real values (populated by `/preflight`), copy those exact lines and place them in the new file directly under `# Project: [Agent Name]`, above `## Overview`. Do not overwrite or regenerate the Environment block — it belongs to preflight, not kickoff.

Populate the rest of this structure with the project's specifics from the discovery session:

```markdown
# Project: [Agent Name]

[Preserved `## Environment` block from preflight goes here, if present]

## Overview
[1–2 sentences: what this agent does and for whom]

## Tech Stack
- Runtime: OpenClaw gateway (CLI: `openclaw`)
- Agent format: markdown skills + bootstrap files
- Tools: MCP via mcporter (`workspace/config/mcporter.json`)
- LLM: Anthropic Claude — primary [model id], fallback [model id]
- [Any in-repo MCP servers you'll build]
- [External MCP integrations you'll use]
- Deploy: [GitOps webhook+rsync to <runtime host> / manual / dev-only]

## Build Commands
- Gateway restart: `openclaw gateway restart`
- Doctor / repair: `openclaw doctor --repair`
- Session cleanup: `openclaw session cleanup`
- Deploy (push to canonical): `git push origin main`
- [Per-MCP-server build, if applicable: `cd workspace/mcp-servers/<name> && npm run build`]

## Roles
[Agent capabilities and personas — populated from Phase 2's persona answer. Skip if single capability.]

## Core Entities
[Main domain concepts the agent manages — not table names, just concepts]
Examples:
- **Tasks** — items in TASK-QUEUE.md the agent processes
- **Threads** — conversation contexts the agent maintains

## Reference Documents

**Primary workflow** — `docs/MULTI_AGENT_WORKFLOW.md` is the canonical pattern for shipping any non-trivial chunk of work. PM context drives a phase loop; workers execute focused slices in their own sessions. Entry point: `/orchestrate`.

**Project state** (populated during development) — see `/docs` folder:
- `APP_CONCEPT.md`: Problem statement, users, use cases, success criteria
- `SCOPE.md`: V1 scope, out-of-scope, known unknowns
- `KB_1_Architecture.md`: Architecture decisions: skills, MCP integrations, model routing, deploy target
- `KB_8_Current_State.md`: Current phase and active tracking
- `CHANGELOG.md`: Running log of what was shipped and when — maintained by `/ship`
- `LESSONS.md`: Running log of gotchas and hard-won lessons
- `smoke-tests-pending.md`: **Single source of truth** for outstanding manual smoke tests with stable IDs.

**OpenClaw stack-reference KBs** (vetted patterns — consult the index, then read only the relevant KB):
- `docs/OpenClaw KBs/OC_KB_00_Index.md` — start here. Routes you to the right OC_KB for the task.

## Current Phase
Phase 1 — [Name TBD] (Not Started)

## Patterns
[Leave empty — patterns emerge during development and get documented here]

## Preferences
[Populate from Phase 5: response style, autonomy level, things to avoid, escalation rules]

## Custom Commands
All commands live in `.claude/commands/`.

| Command | Purpose |
|---------|---------|
| `/preflight` | One-time per clone — captures agent + OS into CLAUDE.md |
| `/kickoff` | Discovery session — greenfield agent projects |
| `/adopt` | Discovery session — existing agent repos |
| `/update-framework` | Pull canonical framework updates with per-file review |
| `/orchestrate` | PM phase loop (see `docs/MULTI_AGENT_WORKFLOW.md`) |
| `/audit-full` | Code + infrastructure audit in parallel |
| `/brainstorm` | Deep research before committing to an approach |
| `/plan` | Create implementation plan from investigation |
| `/implement` | Execute a validated plan |
| `/ship` | Update KBs, commit, push (deploy fires via webhook) |
| `/audit-code` | Review code/plans for elegance and reuse |
| `/audit-infra` | Infrastructure review — mcporter, env vars, deploy script |
| `/gen-skill` | Scaffold a new SKILL.md with correct frontmatter and 5-section skeleton |
| `/gen-test` | Generate tests following project patterns |
| `/visualize` | Generate ASCII diagrams |

## DO NOT
- `mcporter.json` top-level key is `mcpServers`, not `servers` (silent failure)
- `${ENV_VAR}` substitution reads `process.env`, not `.env` files (set in launchd plist)
- Skill frontmatter: `user-invokable` not `user-invocable` (silent un-callable)
- Skill folder name MUST match frontmatter `name` (silent invisibility to router)
- Bootstrap files have a per-file character cap (default ~20K); long-running content silently truncates
- Prompt cache config goes under PLURAL `models`, not singular `model` (silent cache disable)
- Adding a new runtime-mutable path requires updating rsync excludes in `deploy/deploy.sh` (otherwise next deploy wipes it)

---
*Built with [Insynq's Framework](https://github.com/Insynq/agent-blueprint) — a methodology-first project template for building OpenClaw agents with AI coding agents. Learn more at [insynqk.com](https://insynqk.com).*
```

---

#### `docs/KB_1_Architecture.md`

```markdown
# KB 1 — Architecture

## Overview
[Brief description of the agent's overall shape]

## Tech Stack
- Runtime: OpenClaw gateway
- Models: primary `[id]`, fallback `[id]`, optional escalation `[id]`
- LLM provider: Anthropic Claude
- Cache strategy: `cacheRetention: [short | long]` under PLURAL `models` config
- [Other versions where known]

## Skills (V1)
[List from Phase 4 question 2 — name + one-line purpose for each]
- `[skill-name]` — [purpose]
- ...

## MCP Integrations (V1)
[List from Phase 4 question 3 — server name + transport + source]
- `[server-name]` — stdio | HTTP — [package | in-repo | community]
- ...

## Cron / Proactive Behavior (V1)
[List from Phase 4 question 4]
- `[cron-name]` — [schedule] — [deterministic script | LLM-driven] — [purpose]
- ...

## Notification Routing
[From Phase 4 question 5 — channels + when each fires]

## Deploy & Infrastructure
- Runtime host: [Mac mini / Linux box / dev-only / other]
- Deploy: [GitOps webhook+rsync / manual / other]
- Required env vars (set in launchd plist `EnvironmentVariables`, NOT .env):
  - `ANTHROPIC_API_KEY` (or per-cron equivalents)
  - `WEBHOOK_SECRET` (deploy webhook HMAC)
  - [other MCP server tokens]

## Architecture Decisions
[Any decisions made during kickoff — leave empty if none yet]

## Open Questions
[Unresolved architecture questions to return to]
```

---

#### `docs/KB_8_Current_State.md`

```markdown
# KB 8 — Current State

## Active Phase
Phase 1 — [Name TBD] — NOT STARTED

## Session Notes
[Empty — populated during development for cross-session context. Clear after resolution.]

## Changelog
[Empty — one-liner entries added as phases complete]
```

---

#### `.claude/memory/project_concept.md`

```markdown
---
name: Project Concept
description: Core problem, users, and what this agent does — seed for all future sessions
type: project
---

**[Agent Name]:** [One-sentence elevator pitch]

**Problem:** [One sentence]
**Primary user / operator:** [One sentence]
**Primary value driver:** [The one thing that makes this worth building — the core insight, not a skill list]
**First target user:** [Which user type to optimize V1 for, and why]
**V1 goal:** [One sentence defining done]
**Success metric for V1:** [One measurable outcome that would validate the concept]
**Why now:** [One sentence on timing]
```

---

#### `.claude/memory/project_preferences.md`

```markdown
---
name: Project Preferences
description: How the user prefers to work and communicate with Claude on this project
type: user
---

[Populate from Phase 5 answers]

**Communication style:** [Terse/verbose, engineer/partner, etc.]
**Autonomy level:** [Independent when obvious / always confirm / mixed]
**Trade-off preference:** [When speed and quality conflict, which wins?]
**Escalation threshold:** [What Claude must always ask before doing — e.g., "ask before adding a new MCP server", "ask before changing model routing", "ask before adding a new cron"]
**Code opinions:** [Any strong preferences about style or approach]
**Things to avoid:** [Specific patterns or behaviors the user doesn't want]
```

---

#### `.claude/memory/MEMORY.md`

Create this file (or append if it exists):

```markdown
# [Agent Name] — Session Memory

## Project
- [project_concept.md](project_concept.md) — [Agent Name]: problem, users, V1 goal
- [project_preferences.md](project_preferences.md) — Working style and communication preferences
```

---

### Step 3: Final message to user

After all files are written, send:

```
## Kickoff Complete

Your agent project foundation is set up:

- `docs/APP_CONCEPT.md` — problem, users, success criteria
- `docs/SCOPE.md` — V1 boundaries and known unknowns
- `CLAUDE.md` — project context for all future sessions (DO NOT section pre-filled with OpenClaw silent-failure traps)
- `docs/KB_1_Architecture.md` — skills, MCP integrations, cron, deploy target
- `docs/KB_8_Current_State.md` — phase tracker
- `.claude/memory/` — project and preference seeds

Every future Claude session in this project reads these files. Keep them updated as the agent evolves — especially `KB_8_Current_State.md` (for active work) and `CLAUDE.md` (when patterns and constraints are discovered).

**Recommended next steps:**
1. Review the files — correct anything that doesn't feel right
2. Start filling `workspace/` bootstrap files (SOUL.md, AGENTS.md, TOOLS.md, etc.) — see `docs/OpenClaw KBs/OC_KB_04_Bootstrap_Files.md` for what each contains
3. `/gen-skill <skill-name>` to scaffold your first skill, or `/brainstorm "what should Phase 1 focus on?"` to explore implementation approach
4. Or go straight to `/plan "Phase 1: [feature]"` if you already know what to build first
```
