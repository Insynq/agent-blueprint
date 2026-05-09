# OC KB 4 — Bootstrap Files: the 9 markdown documents loaded at gateway start

## Pattern

The OpenClaw gateway loads **9 bootstrap markdown files** from `workspace/` at startup. Each file is loaded into context with a per-file character cap (default ~20K, configurable as `bootstrapMaxChars` in `~/.openclaw/openclaw.json`). The contents become available to every conversation the agent has, every cron firing, every skill activation.

These files are the agent's identity, memory, schema, and operating manual all at once. They're the closest thing OpenClaw has to a system prompt — except they're file-based, version-controlled, and per-file capped.

## When to use which file

| File | Purpose | Typical content |
|---|---|---|
| `SOUL.md` | Identity, role, domain, tone | "I am <name>. I help <user-type> with <domain>. I speak <tone>. I refuse to <constraint>." |
| `AGENTS.md` | Model config, routing, skills index | Routing primary/fallback (singular `model`); cache config (PLURAL `models`); list of skills with one-line purpose each |
| `TOOLS.md` | LLM-facing tool reference | One section per MCP tool: name, when to use, when not to use, example invocation |
| `SCHEMA.md` | Data model reference | Entity definitions, relationships, source-of-truth statements ("the canonical email is in <system>") |
| `MEMORY.md` | Long-lived facts and preferences | Stable facts about the user/operator, recurring patterns, learned preferences |
| `HEARTBEAT.md` | Proactive/scheduled behavior | What cron fires when, what the agent does proactively (vs. reactive only) |
| `NOTIFICATIONS.md` | Routing rules | When to send what to which channel (Slack, email, Discord, etc.) |
| `TASK-QUEUE.md` | Runtime-mutable working state | The agent writes here at runtime; `rsync --delete` MUST exclude this |
| `INDEX.md` | File map for humans + LLM | Where everything lives in workspace/, links to skills, links to scripts |

## Per-file character cap

Default is ~20K characters. Configurable in `~/.openclaw/openclaw.json` as `bootstrapMaxChars`. Once a file exceeds the cap, the gateway **silently truncates** — no error, no warning, just a shorter context.

This is the third canonical silent-failure trap. Symptoms include:
- Agent "forgets" facts that are in MEMORY.md (because MEMORY.md grew past the cap and the relevant fact was at the bottom)
- Agent doesn't know about new skills (AGENTS.md skills index grew past the cap)
- Cron behavior changes silently (HEARTBEAT.md outgrew the cap)

**Diagnose with:** `wc -c workspace/*.md`. Anything close to or over the cap is suspect.

**Fix options:**
1. Refactor the file (collapse old entries to summaries, move detail to references/)
2. Split the file (move long content to a sibling .md file and reference it; the agent reads on-demand from skills, not from bootstrap)
3. Raise the cap in `~/.openclaw/openclaw.json` (last resort — affects all bootstrap files)

## What goes where (anti-overlap guide)

The 9 files have overlap potential. To keep them consistent:

- **Identity vs preferences:** Identity (SOUL) is what the agent IS. Preferences (MEMORY) are what the user prefers. "I am polite by default" → SOUL. "User prefers terse responses" → MEMORY.
- **Tools vs skills:** Tools (TOOLS) are the LLM-facing MCP surface — the menu of operations. Skills (under workspace/skills/, indexed in AGENTS) are the workflows that USE those tools. A skill might call 3 tools; tools don't know about skills.
- **Schema vs data:** SCHEMA describes the SHAPE of the data. The actual data lives in external systems or in TASK-QUEUE.md. SCHEMA is read-mostly; TASK-QUEUE is read-write at runtime.
- **Heartbeat vs notifications:** HEARTBEAT is when/why the agent acts on its own. NOTIFICATIONS is where the resulting messages go. A heartbeat tick fires a check; the check produces a notification; the notification routes via NOTIFICATIONS.md rules.

## Cross-reference patterns

Bootstrap files cross-reference each other and the rest of the workspace. Conventions:

- **AGENTS.md → skills index:** lists skill names + one-line descriptions. The full SKILL.md content lives in `workspace/skills/<name>/`. AGENTS.md is the table of contents.
- **TOOLS.md → mcporter.json:** TOOLS.md describes tools in LLM-facing language; `mcporter.json` is the literal config. They must agree on tool IDs and parameter names. Audit them periodically.
- **SCHEMA.md → external systems:** "The canonical X is in Y" statements. SCHEMA shouldn't try to describe internal state of an external system in detail; it's a pointer to where the truth lives.
- **HEARTBEAT.md → cron:** `openclaw cron list` is the source of truth for what crons exist. HEARTBEAT.md describes the INTENT — "every day at 9am, check Y." The actual cron registration on the runtime host might drift from HEARTBEAT.md if the operator forgets.
- **NOTIFICATIONS.md → external channels:** describes routing rules; the actual delivery happens via MCP servers (Slack MCP, email MCP, etc.).
- **INDEX.md** is the meta-file: it points at every other file. Useful both for humans navigating the repo and for the LLM during exploratory tasks.

## Anti-patterns

- **Embedding secrets in bootstrap files.** Bootstrap files load every conversation. A secret there leaks every time the agent talks to anyone. → fix: secrets live in env vars / plist / MCP server config, never in workspace/*.md.
- **Letting MEMORY.md grow without curating.** Symptoms: agent "forgets" recent facts because they pushed older important facts past the character cap, OR agent contradicts itself because two memories conflict. → fix: monthly review; collapse old entries to summaries; move detail elsewhere.
- **Putting runtime state in non-mutable bootstrap files.** Agent writes to MEMORY.md at runtime → next deploy's `rsync --delete` wipes it. → fix: only TASK-QUEUE.md (and other configured-mutable paths) are runtime-write targets; everything else is repo-write-only.
- **AGENTS.md skills-index drift.** New skill added under `workspace/skills/<new>/` but the AGENTS.md skills index isn't updated. The router still finds the skill via description scan, but human readers (and the LLM doing exploratory tasks) don't know it exists. → fix: every skill add/remove updates AGENTS.md.
- **NOTIFICATIONS.md routing without a channel handler.** Rule says "send to Slack" but no Slack MCP server is registered. Agent silently drops the notification. → fix: every notification channel referenced must have a corresponding MCP server in `mcporter.json`.
- **HEARTBEAT.md drift from `openclaw cron list`.** Repo says "daily 9am summary"; runtime host actually has hourly summary. Operator added a cron without updating HEARTBEAT.md. → fix: include HEARTBEAT updates in the same PR as cron changes; periodic audit reconciles.

## Worked example: minimal SOUL.md

```markdown
# Soul

## Identity
I am <agent-name>. I am an assistant for <user/team-type> working on <domain>.

## Tone
I am direct and concise. I prefer specific over vague. I push back when I see a mistake; I don't hedge.

## Refusals
I do not <constraint 1>. I do not <constraint 2>. If asked to do either, I explain briefly and stop.

## Source of truth
For <X>, the truth lives in <system>. I never override or pretend to know better.
```

## Worked example: minimal AGENTS.md

```markdown
# Agents

## Model routing
- Primary: claude-sonnet-4-6
- Fallback: claude-haiku-4-5-20251001
- Reasoning escalation: claude-opus-4-7  (use sparingly; expensive)

## Cache
Bootstrap content + tools schema cache: `cacheRetention: long` under PLURAL `models` config.
(Routing config — singular `model` — and cache config — plural `models` — are different keys; don't confuse.)

## Skills index
- `<skill-1>` — <one-line purpose>
- `<skill-2>` — <one-line purpose>
- ...

(Full SKILL.md files live under workspace/skills/<name>/SKILL.md.)
```

[VERIFY BEFORE SHIPPING] Default `bootstrapMaxChars` value (~20K), the canonical 9 bootstrap-file names, and the file-load order — confirm against the OpenClaw runtime version.
