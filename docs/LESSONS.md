# Lessons Log

A running log of gotchas, hard-won lessons, and non-obvious behaviors discovered during development. Add entries here as they accumulate — this becomes more valuable the longer the agent runs.

**Format:** Each entry has a short ID for cross-referencing (e.g., `[MCP-1]`), the rule itself, a **Why** (the real incident), and a **How to apply** line (when to use it).

Commands that reference this file: `/debug`, `/implement`, `/audit-code`.

> **Status: starter template.** The framework ships with this file empty so that lessons accumulate from your own incidents rather than carrying app-specific lessons from another project. Add entries as gotchas surface during development.

---

## Suggested categories

For OpenClaw agent projects, the natural categories are:

- `MCP` — mcporter.json, MCP server lifecycle, tool unavailability bugs, env-var resolution
- `SKILL` — skill routing, frontmatter spelling, folder/name mismatches, character-cap truncation
- `MODEL` — model routing, cache hit rate, per-cron API key cost attribution
- `CRON` — scheduled job behavior, deterministic-script convention, runtime-host vs repo drift
- `DEPLOY` — webhook + rsync, plist EnvironmentVariables, rsync excludes correctness
- `ARCH` — design decisions specific to this agent, scope-out vs scope-creep judgment calls
- `PROCESS` — planning, verification, scoping discipline

Add new categories as they emerge — there's no hard rule against `[OBS-1]` if observability becomes a recurring theme.

---

## How to Add a New Entry

Copy this template and append to the relevant section (or create a new section if the category is new):

```markdown
### [CATEGORY-N] Short title

**Rule:** The specific, actionable rule.

**Why:** The real incident that caused this lesson. Be specific — which symptom, what failed, what the actual root cause was. The narrative is what makes a lesson sticky.

**How to apply:** When exactly does this apply? What's the trigger that should remind you of this lesson?
```

When you add an entry, also consider:

- Does this lesson belong in `CLAUDE.md`'s `## DO NOT` section as a hard constraint? (For lessons that should affect every future change.)
- Does this lesson reveal a framework gap? (Surface it to `agent-blueprint` upstream if the OpenClaw runtime makes it easy to repeat.)
