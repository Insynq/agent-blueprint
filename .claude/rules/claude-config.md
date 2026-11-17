---
paths:
  - ".claude/**"
---

# Editing skills, agents, rules and hooks

Read `docs/AUTHORING_SKILLS.md` before changing anything here. The short version:

- A skill's `description` says when to use it, not what it does.
- `name` must equal the folder (skills) or file (agents) name.
- `$ARGUMENTS` is one flat string. No `$ARGUMENTS.name`, no `{{ }}`.
- Give the reason with each constraint, and state it once.
- Framework skills are overwritten by `/update-framework`. Wrap a local change in `<!-- local: reason -->` … `<!-- /local -->`.
- Hooks are discovered at session start. After adding or changing one, restart the session and confirm it under `/hooks`.
