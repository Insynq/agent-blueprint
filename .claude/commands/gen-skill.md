---
description: Scaffold a new SKILL.md at workspace/skills/<name>/ with correct frontmatter and 5-section skeleton
arguments:
  - name: name
    description: Skill name (lowercase-hyphenated). Will be the folder name AND the frontmatter `name`.
    required: true
  - name: description
    description: One-sentence description of what the skill does. Used by the router on every prompt.
    required: false
  - name: user-invokable
    description: '"true" or "false" — whether the user can invoke this skill explicitly. Default true.'
    required: false
---

# Generate Skill — scaffold a new workspace/skills/<name>/SKILL.md

Creates a new skill at `workspace/skills/$ARGUMENTS.name/SKILL.md` with valid frontmatter and the canonical 5-section skeleton (Header, Triggers, Systems, Workflows, Important Rules).

## Action Required

Read this entire file, then perform the validation + write inline. **Do not spawn a subagent** — this is a deterministic scaffold.

## Step 1: Validate the name

The `name` argument MUST be:

- Lowercase
- Hyphenated (no underscores, no camelCase)
- Match the regex `^[a-z][a-z0-9-]*[a-z0-9]$`
- Not collide with an existing skill

Refuse with a clear error if any check fails:

```
Invalid skill name: "$ARGUMENTS.name"

Skill names MUST be lowercase-hyphenated (e.g., "triage-mail", "summarize-day").
The name will be both the folder name AND the SKILL.md frontmatter `name` field.

If you typed a name with capitals or underscores, lowercase-hyphenate and retry.
```

Check for collision via `Glob("workspace/skills/$ARGUMENTS.name/SKILL.md")`. If exists, refuse:

```
Skill "$ARGUMENTS.name" already exists at workspace/skills/$ARGUMENTS.name/SKILL.md.

Use a different name, or edit the existing file directly.
```

## Step 2: Validate description

If `$ARGUMENTS.description` is provided, sanity-check it:

- Length between 10 and 200 chars
- Does NOT contain a newline (must be a single sentence)
- Doesn't start with "does stuff" or "helps with" — the router needs a specific verb + domain noun (hard reject these vague starts)

**WHEN-not-WHAT check (advisory).** The router matches on the description, so it should answer *"when should the router pick this skill?"* — a trigger condition — not *"what does the skill do?"* — a behavior summary. A WHAT-phrased description competes with the skill body for the model's attention. Nudge the user toward WHEN-phrasing if the description reads as a behavior summary, but don't hard-reject (phrasing detection is too fuzzy for a clean regex; only the vague `"does stuff"`/`"helps with"` starts are hard-rejected).

- Good (WHEN): `"Use when the user asks to triage, sort, or summarize their inbox."`
- Weak (WHAT): `"Triages incoming email and summarizes urgent items."`
- Bad (vague): `"Helps with mail."`

If missing, prompt the user:

```
When should the router pick this skill? One sentence — phrase it as the trigger condition, not a description of what the skill does. The router scans this on every prompt to decide when to activate the skill.

Good (WHEN): "Use when the user asks to triage, sort, or summarize their inbox."
Weak (WHAT): "Triages incoming email and summarizes urgent items."
Bad (vague): "Helps with mail."
```

Don't proceed until a real description is provided.

## Step 3: Determine user-invokable value

If `$ARGUMENTS.user-invokable` is provided, check it's exactly the string `"true"` or `"false"`. Otherwise default to `true`.

**Spelling note:** the field name is `user-invokable` with a `k`. The framework refuses to write `user-invocable` even if the user typos in the argument — that's a known silent-failure trap.

## Step 4: Create the skill folder and SKILL.md

```
mkdir -p workspace/skills/$ARGUMENTS.name
```

Write `workspace/skills/$ARGUMENTS.name/SKILL.md` with this content (substituting `<name>`, `<description>`, `<user-invokable>` from the validated arguments):

```markdown
---
name: <name>
# description states WHEN to invoke (trigger condition), not WHAT the skill does (behavior).
# Good: "Use when the user asks to triage, sort, or summarize their inbox."
description: <description>
user-invokable: <user-invokable>
---

# <Title-cased name with spaces>

## Header

[TODO — 1-2 sentences. When does this skill activate? What domain does it cover?]

## Triggers

[TODO — bullet list of phrases or contexts that should activate this skill. The router primarily scans the frontmatter `description`, but documenting triggers reinforces the routing intent.]

- "[example user phrase]"
- "[another phrase variant]"

## Systems

[TODO — which MCP tools and external systems does this skill depend on? Enumerate every tool used in Workflows. Audits cross-check this list against mcporter.json.]

- `mcp__server-id__tool_id_snake_case` — used to [purpose]

## Workflows

### Workflow 1: [TODO workflow name]

1. [TODO Step]
2. [TODO Step]
3. **Report:** [TODO format the output. For interactive: respond to user with X. For scheduled: log to stderr with `[<name>]` prefix; route notification per workspace/NOTIFICATIONS.md.]

## Important Rules

[TODO — confirmations required, source-of-truth statements, error handling.]

- Always confirm with user before [destructive op].
- Source of truth for [X] is [Y]. Do not override.
- If [error condition], [recovery action]. Report `[<name>] error: <reason>`.
```

## Step 5: Confirm to the user

Print:

```
Created workspace/skills/<name>/SKILL.md

Frontmatter validated:
  ✓ name = <name> (matches folder name)
  ✓ user-invokable = <value> (correctly spelled, NOT user-invocable)
  ✓ description is specific (not "does stuff")

Next steps:
  1. Fill in the [TODO] markers in the 5 sections (Header, Triggers, Systems, Workflows, Important Rules)
  2. Update workspace/AGENTS.md skills index to reference this skill
  3. Update workspace/INDEX.md to include the skill in the file map
  4. If the skill calls new MCP tools, register them in workspace/config/mcporter.json
  5. Run /audit-code on the skill before shipping
  6. Add a manual smoke test to docs/smoke-tests-pending.md if behavior is hard to verify automatically

Before considering the skill done, name the concrete task the agent fails at *without* this skill — that failure is the skill's reason to exist and its acceptance test.
```

## Important rules for this command

1. **Don't write a SKILL.md without a real description.** The whole router relies on it; vague descriptions match nothing.
2. **Don't accept `user-invocable` (typo) as `user-invokable`.** Refuse with an explanation.
3. **Don't create a folder + SKILL.md if either already exists.** Refuse and ask the user to use a different name or edit the existing file.
4. **Don't auto-fill the 5 sections with synthetic content.** Each section gets `[TODO]` markers — the user fills them with project-specific content. (`/gen-skill` is a scaffold, not a content generator.)

## After Command Returns

The skill exists with a valid skeleton. Continue with:

- `/brainstorm` if you need to explore the workflow before writing it
- Manual editing of the SKILL.md to fill in the 5 sections
- `/audit-code` once the skill is filled in

Future framework versions are likely to add `/gen-mcp-server` (scaffold an in-repo MCP server), `/audit-skills` (validate folder=name and frontmatter spelling across all skills), and `/audit-mcporter` (validate the registry shape and env-var resolution). See `FRAMEWORK_CHANGELOG.md` for status.
