# Index

<!-- TODO: File map for humans + LLM.

     This file is the table of contents for the workspace/. It helps the LLM navigate
     during exploratory tasks and helps human readers find things quickly.

     Update this file whenever the workspace structure changes (new skill, new MCP server,
     new bootstrap-file convention, new script).
-->

## Bootstrap files (workspace/ root)

- `SOUL.md` — identity, tone, refusals, source-of-truth
- `AGENTS.md` — model routing, cache config, skills index
- `TOOLS.md` — LLM-facing tool reference (mirrors mcporter.json registry)
- `SCHEMA.md` — data model reference
- `MEMORY.md` — long-lived facts and preferences
- `HEARTBEAT.md` — proactive / scheduled behavior intent
- `NOTIFICATIONS.md` — routing rules for outgoing notifications
- `TASK-QUEUE.md` — runtime-mutable working state (excluded from rsync --delete)
- `INDEX.md` — this file

## Skills

[TODO — populated as skills are added under workspace/skills/<name>/]

- `workspace/skills/<name>/SKILL.md` — [TODO one-line purpose]

## MCP servers

- `workspace/config/mcporter.json` — registry; top-level key MUST be `mcpServers`

[TODO — list in-repo servers under workspace/mcp-servers/]

## Scripts

[TODO — list deterministic Node CLIs under workspace/scripts/]

## Stack-reference KBs

- `docs/OpenClaw KBs/OC_KB_00_Index.md` — start here for runtime patterns
