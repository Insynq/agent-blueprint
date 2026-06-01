---
name: skill-name-here
description: Use when [trigger condition] — single sentence stating WHEN to invoke, not WHAT the skill does
user-invokable: true
---

<!--
  Skill template — copy to workspace/skills/<name>/SKILL.md and fill in.

  CRITICAL FRONTMATTER RULES:
    1. The folder name MUST equal the `name` field above. Mismatch → router never sees the skill.
    2. The `user-invokable` field is spelled with a `k` — NOT `user-invocable`.
       The typo silently un-callable.
    3. The `description` is what the router scans on every prompt. State WHEN to invoke
       (the trigger condition), not WHAT the skill does (a behavior summary) — a WHAT-phrased
       description competes with the skill body for attention. "Use when the user asks to triage,
       sort, or summarize their inbox" beats "Triages incoming email" beats "helps with mail."

  The 5 sections below are the canonical OpenClaw SKILL.md structure. Order matters.
-->

# Skill Name Here

## Header

<!-- 1-2 sentences. When does this skill activate? What domain does it cover? -->

[TODO]

## Triggers

<!-- Bullet list of phrases or contexts that should activate this skill. The router primarily
     scans the frontmatter `description`, but documenting triggers reinforces the routing
     intent and helps human readers understand the skill. -->

- "[TODO example user phrase]"
- "[TODO another phrase variant]"
- After [TODO cron name] tick (if scheduled-driven)

## Systems

<!-- Which MCP tools and external systems does this skill depend on? Enumerate every tool
     used in the Workflows section. Audits cross-check this list against mcporter.json. -->

- `mcp__server-id__tool_id_snake_case` — used to [TODO purpose]
- `workspace/MEMORY.md` — read for [TODO context]
- `workspace/scripts/<name>.js` — called for [TODO deterministic step]

## Workflows

### Workflow 1: [TODO workflow name]

1. [TODO Step]
2. [TODO Step]
3. [TODO Step]
4. **Report:** [TODO Format the output. For interactive: respond to the user with X. For
   scheduled: log to stderr with `[skill-name]` prefix; route notification per
   workspace/NOTIFICATIONS.md.]

### Workflow 2: [TODO workflow name (only if there's a meaningfully different second flow)]

[TODO]

## Important Rules

<!-- Confirmations required, source-of-truth statements, error handling. Anything that must
     hold across every workflow lives here. -->

- Always confirm with user before [TODO destructive op].
- Source of truth for [TODO X] is [TODO Y]. Do not override.
- If [TODO error condition], [TODO recovery action]. Report `[skill-name] error: <reason>`.
