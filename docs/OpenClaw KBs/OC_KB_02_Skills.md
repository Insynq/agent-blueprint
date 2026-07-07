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

**Boundary note (beyond capability shape):** prefer an MCP server when an external integration needs an enforceable auth/network boundary. MCP bakes authentication into the protocol — a per-server `${ENV_VAR}` credential that is scoped and swappable — and gives one place to insert a security boundary. Reaching the same system by shelling out to a vendor CLI tends toward a single shared static credential reused by every caller, which you cannot scope or rotate per-use. (For how MCP auth is wired, see `OC_KB_03`'s `${ENV_VAR}` / `headers` handling.)

**Use a deterministic script when:**
- The capability has no LLM reasoning (pure compute, transformation, pipe)
- It's invoked by cron and the LLM cost would be wasteful
- You need it callable from outside the gateway too

A skill can call MCP tools. An MCP server can be invoked by a script. Mix as needed.

### The mixed case: split judgment from mechanics

Real workflows rarely fit the clean either/or above — most **interleave** model judgment with deterministic operations. An intake skill *judges* which template applies (reasoning), then *writes* the rows (deterministic). When a workflow step is deterministic — an exact SQL write, CSV/PDF parsing, reconciliation math, hashing, a fixed API payload — **do not write it as prose inside the skill.** Extract it to a `workspace/scripts/<name>.js` script and call it via the **dry-run handoff**:

1. The **skill** gathers inputs and makes the judgment calls (which records, which template, is-this-eligible).
2. It builds a **JSON payload** and invokes the script with `--dry-run`.
3. It **reviews** the preview (and surfaces it to the user if the write is irreversible).
4. It invokes the script **for real**.

The skill *orchestrates and judges*; the script *computes and writes*. The split matters because embedded deterministic prose carries three costs the script layer avoids:

- **Skippable.** A workflow step is model-executed — the model decides whether and exactly how to run each block. A write you need *guaranteed* isn't guaranteed when it lives in prose.
- **Context bloat.** The skill loads into context every time it fires; embedded SQL/parsing is paid for on every invocation (and pushes against the character cap).
- **Untestable.** You can unit-test a `.js` script; you cannot test a paragraph of instructions.

**When to reach for the split:** any time a step must be *exact* and *guaranteed* — especially money-touching or irreversible writes (payments, settlements, invoices). The trigger: if you catch yourself writing a *second* exact-SQL/parse/compute block into a skill workflow, extract it.

Keep in the skill the *decision* (judgment, ambiguity resolution, edge-case handling) and the orchestration. A query *template* shown as part of a judgment step is fine inline — extract the deterministic *execution*, not the illustration.

### Delegation skills — wrapping an external agent CLI or capability

A skill may teach the agent to shell out to a **peer agent CLI** to (a) fill a capability gap (computer use, browser/simulator automation) or (b) offload token-heavy work (log spelunking, large-document reading, bulk screenshot analysis). Three canonical shapes: external-review (independent second-pass on a diff/branch/commit), external-implementation (bounded change on a throwaway worktree), external-verification.

**Boundary reconciliation.** The Boundary note above prefers an MCP server when reaching a *credentialed system of record* — a vendor CLI erodes the auth boundary into one shared static credential. Delegation-for-capability is a different case: it borrows a *peer's compute*, with no per-user data-access boundary at stake. That difference is why it is permitted where CLI-to-system-of-record is discouraged — but the containment still applies. Default to read-only / worktree-scoped delegate invocations (`OC_KB_11` Primitive 0), and verify the delegate's important claims against primary source before relaying them upward: a delegate's summary is `relayed`, not verified, until checked (`[PROCESS-4]`). If the delegate is a non-Claude model, note how to prompt it — prompting conventions differ across model families.

**Exact commands are the highest-value content** — not because the model usually errs, but because the rare miss is disproportionately costly. Capture the corrected invocation the moment a miss happens. Per `[SKILL-1]`, these command invocations are judgment-side pattern memory (query-template class, so they stay on the safe side of the skill/script boundary) — *illustrations*, not guaranteed mechanics; mark them a staleness / verify-before-relying surface, and graduate anything that must fire *exactly* to a `workspace/scripts/` wrapper.

**Timeouts.** Delegated long tasks can time out; state the recovery (re-scope narrower, or re-dispatch per `orchestrate.md`'s dispatch-mode table) so a timeout doesn't read as a hard failure.

**Lifecycle.** Grow these skills by field-failure accretion — get ~80% working fast, then on each live failure ask for a prevention, cut the suggested fix roughly in half (models over-correct and the character cap is real), and append. Capability-bridge skills are disposable: delete them when the base model closes the gap.

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

**Empty-result contract (required for any skill that delegates or reviews).** A workflow that can legitimately return *nothing found* MUST say so explicitly and name the exact target it inspected — e.g., `[skill-name] no findings — inspected <diff/branch/target>`. A bare silent return reads to the caller as an incomplete run and triggers wasteful re-invocation. This is the delegation-scale twin of the Refutation Pass's blind-spot-honesty rule (`audit-code.md`) and the log-the-drop discipline (`[PROCESS-3]`).

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

Beyond saving context budget, a `references/` pack is also a deliberate **accuracy lever.** A base model can only apply knowledge you actually give it, so synthesizing your prior art — worked examples, decision rules, known-good patterns, per-domain or per-class write-ups — into a reference the skill loads at the matching judgment step tends to raise its hit-rate on that task. Author references proactively for accuracy, not only reactively to evict overflow. The cost is honest: it is tedious authoring work, and a large pack earns its keep only because it loads on demand, not every fire. Reference packs are model-interpreted prose and examples — judgment-side content — so they stay on the right side of the skill/script boundary (see `[SKILL-1]` and "The mixed case").

## Anti-patterns

- **Folder/name drift.** You rename a folder but forget to update frontmatter. Skill silently disappears from the router. → fix: standardize one or the other; never edit just one.
- **`user-invocable` spelling.** Typo bug. → fix: copy-paste the exact string `user-invokable` from the canonical scaffold.
- **Vague description.** "Helps with stuff" matches nothing the router can act on. → fix: state WHEN to invoke (the trigger condition), not WHAT the skill does, like "Use when the user asks to triage, sort, or summarize their inbox".
- **Missing Systems section.** The skill calls `mcp__foo__bar` but doesn't declare it in Systems. Audits fail; future you can't tell what the skill depends on. → fix: enumerate every MCP tool, every cross-referenced bootstrap file, every script.
- **One giant Workflow.** Skills with a single 30-step workflow are unreadable and brittle. → fix: split into 2–4 named workflows; each one is one user-facing flow.
- **Deterministic logic embedded in skill prose.** Exact SQL writes, parsing, reconciliation math, or hashing written as workflow steps instead of a script. The step *looks* deterministic but is model-executed (skippable), loads into context every fire (bloat), and can't be unit-tested. A skill that is mostly embedded command-blocks has the boundary in the wrong place. → fix: extract to `workspace/scripts/<name>.js` and call it via the dry-run handoff (see "The mixed case" above). Highest priority for guaranteed/irreversible writes.
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
- [ ] No deterministic block (exact SQL write, parsing, reconciliation math) embedded as workflow prose that should be a script — extract guaranteed/irreversible writes to `workspace/scripts/` and call via the dry-run handoff (see "The mixed case")
- [ ] If the skill can return an empty result, it states that explicitly and names the inspected target (no silent empty return)

[VERIFY BEFORE SHIPPING] Frontmatter field names — `user-invokable` and `name` and `description` are the documented OpenClaw runtime expectations. If the OpenClaw runtime adds more fields, update this KB.
