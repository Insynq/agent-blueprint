# OC KB 2 — Skills: SKILL.md format and conventions

## Pattern

A **skill** is a single markdown file at `workspace/skills/<name>/SKILL.md`. The OpenClaw gateway scans every skill's frontmatter `description` on every user prompt; the matching skill's full content is loaded on demand. Skills are the unit of capability that the router dispatches to.

Skills can be **user-invokable** (callable explicitly via `/skill-name`-style invocation) or **non-invokable** (router-only — selected by description match, not user reference).

## When to use a skill vs. an MCP tool vs. a script

**Use a skill when:**
- The capability requires LLM reasoning (interpretation, synthesis, judgment)
- The capability has multi-step workflow logic that benefits from being expressed in markdown
- The capability needs context from bootstrap files (memory, schema, soul)

**Use an MCP tool (in-repo or external) when:**
- The capability is a deterministic operation on an external system (read email, query DB, post to Slack)
- You need the same operation invokable by multiple skills

**Use a deterministic script when:**
- The capability has no LLM reasoning (pure compute, transformation, pipe)
- It's invoked by cron and the LLM cost would be wasteful
- You need it callable from outside the gateway too

A skill can call MCP tools. An MCP server can be invoked by a script. Mix as needed.

## Required frontmatter

```yaml
---
name: skill-name-here              # lowercase-hyphenated; MUST equal folder name
description: Use when [trigger] — states WHEN to invoke (router-matched), not WHAT the skill does
user-invokable: true               # boolean; SPELLING — "user-invocable" is a silent-failure typo
---
```

**Three traps in the frontmatter:**

1. **Folder name = `name`.** If your folder is `workspace/skills/triage-mail/` then `name: triage-mail`. Mismatch → router never sees the skill. No error, no warning.
2. **`user-invokable` spelling.** The string `user-invocable` (without the `k`) is a common typo. Parses as valid YAML, gateway treats it as missing, skill silently un-callable.
3. **`description` quality matters.** This is what the router scans. State WHEN to invoke (the trigger condition), not WHAT the skill does (a behavior summary) — a WHAT-phrased description competes with the skill body for the model's attention. "Does stuff" matches nothing. "Use when the user asks to triage, sort, or summarize their inbox" matches a user asking about email triage; "Triages incoming email" (WHAT-phrased) is weaker.

## 5-section convention

After frontmatter, every SKILL.md follows this structure in this order:

```markdown
# <Skill Name>

## Header
[1-2 sentences: when to use this skill + domain context]

## Triggers
[Bullet list of phrases or contexts that should activate this skill]
- "phrase the user might say"
- "another phrase variant"
- After a cron tick at <time>

## Systems
[Which MCP tools / external systems this skill depends on]
- mcp__server-name__tool_id  — what it's used for
- workspace/scripts/<name>   — when invoked
- bootstrap-file references  — what it cross-checks

## Workflows
[Numbered steps. Each major workflow has its own subsection.]

### Workflow 1: <name>
1. Step
2. Step
   ...
N. **Report:** [what to output to the user / where to log / which channel to notify]

### Workflow 2: <name>
...

## Important Rules
[Confirmations required, source-of-truth statements, error handling]
- Always confirm with user before <destructive op>
- Source of truth for <X> is <Y>
- If <error condition>, do <X> and report <Y>
```

The 5 sections aren't optional. They serve specific roles:
- **Header** orients the LLM (and any human reader) to when this skill is right.
- **Triggers** seeds the router's matching ability (description does the routing; triggers reinforce).
- **Systems** is the dependency manifest. Audits cross-check this against `mcporter.json`.
- **Workflows** is the actual instruction. Each step ends with a reporting/logging convention.
- **Important Rules** captures invariants that must hold across every workflow.

## Anatomy: anonymous skill example

```markdown
---
name: skill-name-here
description: Use when the user asks to <do X with Z>  # WHEN to invoke, not WHAT it does
user-invokable: true
---

# Skill Name Here

## Header
Use this skill when the user asks about <domain>. Operates on <data sources>. Returns <output shape>.

## Triggers
- "<example user phrase>"
- "<another phrase>"
- After <cron name> tick

## Systems
- `mcp__server-id__tool_id` — used to fetch <thing>
- `workspace/MEMORY.md` — read for <context>
- `workspace/scripts/<name>.js` — called for <deterministic step>

## Workflows

### Workflow 1: <name>
1. Read <source> via <tool>.
2. <transformation>.
3. <action>.
4. **Report:** Format as `[skill-name] result: <one-line summary>`. Log to stderr if scripted; respond to user if invoked interactively.

## Important Rules
- Confirm with user before <destructive op>.
- Source of truth for <X> is <bootstrap file or external system>.
- If <error>, fall back to <Y> and report `[skill-name] error: <reason>` to NOTIFICATIONS.md routing.
```

## Optional: `references/` directory

If a skill has detailed reference material (long tables, large code blocks, historical context) that doesn't belong in the SKILL.md (which counts against context budget), put it in `workspace/skills/<name>/references/<topic>.md` and have the SKILL.md instruct the LLM to load it on demand.

```markdown
## Workflows

### Workflow 1: <name>
1. **For complex case:** Read `references/edge-cases.md` for the full decision tree.
2. <continue>
```

The references/ files are NOT loaded automatically. The skill itself decides when to load them.

## Anti-patterns

- **Folder/name drift.** You rename a folder but forget to update frontmatter. Skill silently disappears from the router. → fix: standardize one or the other; never edit just one.
- **`user-invocable` spelling.** Typo bug. → fix: copy-paste the exact string `user-invokable` from the canonical scaffold.
- **Vague description.** "Helps with stuff" matches nothing the router can act on. → fix: state WHEN to invoke (the trigger condition), not WHAT the skill does, like "Use when the user asks to triage, sort, or summarize their inbox".
- **Missing Systems section.** The skill calls `mcp__foo__bar` but doesn't declare it in Systems. Audits fail; future you can't tell what the skill depends on. → fix: enumerate every MCP tool, every cross-referenced bootstrap file, every script.
- **One giant Workflow.** Skills with a single 30-step workflow are unreadable and brittle. → fix: split into 2–4 named workflows; each one is one user-facing flow.
- **Embedding secrets in SKILL.md.** Every conversation that touches this skill loads the file into context. Secrets there leak constantly. → fix: secrets live in MCP server env vars; the skill calls the tool, never the secret.

## Validation checklist (use before committing)

- [ ] Folder name lowercase-hyphenated
- [ ] Frontmatter `name` matches folder name exactly
- [ ] `user-invokable` spelled correctly (NOT `user-invocable`)
- [ ] `description` states WHEN to invoke (trigger condition), not WHAT the skill does — and is specific (not "does stuff")
- [ ] Has all 5 sections in order: Header, Triggers, Systems, Workflows, Important Rules
- [ ] Every MCP tool used in Workflows is listed in Systems
- [ ] Each Workflow ends with a Report convention
- [ ] No embedded secrets, tokens, or API keys
- [ ] Total file size under the bootstrap character cap (default ~20K) — though skills are loaded on demand, large skills delay routing

[VERIFY BEFORE SHIPPING] Frontmatter field names — `user-invokable` and `name` and `description` are the documented OpenClaw runtime expectations. If the OpenClaw runtime adds more fields, update this KB.
