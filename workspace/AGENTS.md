# Agents

<!-- TODO: Model routing. Singular `model` for routing primary/fallback.
     Recommended default: Sonnet 4.6 primary, Haiku 4.5 fallback. Opus 4.7 for hard reasoning. -->

## Model routing

- Primary: [TODO — e.g., claude-sonnet-4-6]
- Fallback: [TODO — e.g., claude-haiku-4-5-20251001]
- Reasoning escalation: [TODO — optional, e.g., claude-opus-4-7]

<!-- TODO: Cache config. NOTE: PLURAL `models` (NOT singular `model`).
     Singular `model` parses without error and silently disables caching. -->

## Cache

- Bootstrap content + tools schema cache: `cacheRetention: long`
  (configured under `agents.defaults.models["<id>"].params.cacheRetention` — PLURAL `models`)

<!-- TODO: Skills index. List each skill with a one-line purpose.
     The full SKILL.md files live under workspace/skills/<name>/SKILL.md.
     The router scans frontmatter `description` from each SKILL.md, but this index
     keeps a human-readable + LLM-readable table of contents. -->

## Skills index

- `[TODO skill-name-here]` — [TODO one-line purpose]
- `[TODO skill-name-here-2]` — [TODO one-line purpose]
