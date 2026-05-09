# Skills directory

Place each skill in its own folder: `workspace/skills/<name>/SKILL.md`.

**Critical conventions:**

- The folder name MUST equal the SKILL.md frontmatter `name` field. Mismatch → router never sees the skill.
- The `user-invokable` field in frontmatter is spelled with a `k` (NOT `user-invocable`). The typo silently un-callable.
- Each SKILL.md follows the 5-section convention (Header, Triggers, Systems, Workflows, Important Rules) — see `docs/OpenClaw KBs/OC_KB_02_Skills.md`.

**Scaffolding:** use `/gen-skill <name>` to create a new skill with valid frontmatter and the 5-section skeleton. Or copy `_dev/skill-template.md` manually.

**Optional `references/`:** if a skill needs detailed reference material that doesn't fit in SKILL.md (against the per-file character cap), put it under `workspace/skills/<name>/references/<topic>.md` and have the SKILL.md instruct the LLM to load it on demand.
