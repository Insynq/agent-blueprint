# Authoring Skills

How to write or edit a skill, subagent, rule or hook in this framework. Read this before touching anything under `.claude/`.

## Where things go

| You have | Put it in | Why |
|---|---|---|
| A procedure someone invokes (`/ship`, `/debug`) | `.claude/skills/<name>/SKILL.md` | Loaded only when used. |
| A recurring subagent role (judge, verifier) | `.claude/agents/<name>.md` | One definition, referenced by name from every skill that needs it. |
| A convention that applies to some files | `.claude/rules/<topic>.md` with `paths:` | Loaded only when matching files are touched. |
| A check that must hold every time | `.claude/hooks/checks/<name>.mjs` | Runs mechanically. Instructions get skipped; hooks do not. |
| A fact every session needs | `CLAUDE.md` | Always loaded, so keep it short. |

If you find yourself adding emphasis to an instruction because the model keeps missing it, the instruction belongs in a hook.

## Skill frontmatter

```yaml
---
name: ship
description: Use when work is built and reviewed and you are landing it. For a change that still needs review, use /audit-code first.
argument-hint: "[version]"
disable-model-invocation: true
---
```

- `name` is required and must equal the folder name.
- `description` says **when to reach for the skill**, in terms of the situation and its symptoms. It does not summarise the procedure. A description that summarises the steps gets followed in place of the body.
- Add negative routing when two skills are easy to confuse: "For a bug, use /debug."
- `disable-model-invocation: true` goes on every skill with side effects the user should start on purpose: anything that commits, pushes, deploys, dispatches a build, or rewrites project files. Read-only skills leave it off.
- `argument-hint` is shown in the slash menu. Omit it for skills that take no arguments.

A skill with `disable-model-invocation: true` cannot be invoked by another skill. When one skill runs another as a step (`/orchestrate` reaching the build phase), it reads that skill's `SKILL.md` and follows it, and says so. The user's go for the outer skill is the deliberate start the flag exists to protect.

## Arguments

`$ARGUMENTS` is one flat string holding everything typed after the skill name. Handle it in prose:

- One argument: `Target: $ARGUMENTS`.
- Optional: "If $ARGUMENTS names a focus area, scope to it. Otherwise cover everything."
- Several: state the shape, then tell the reader to parse it. "Arguments: `[version] [dry-run]`, space separated, both optional."

Never write `$ARGUMENTS.name`, `{{#if}}` or any other template syntax. It is not substituted and reaches tools as literal text. Never pass raw `$ARGUMENTS` to a command; work out the concrete value first. The skill check hook rejects both forms.

## Body

Write to an intelligent reader who has no context, in the second person.

- **Say what the skill is for and what done looks like** in the first few lines. A reader who knows the goal handles the cases the steps did not foresee.
- **Give the reason with each constraint.** "Never merge from inside a batch, because the landing order across batches is the PM's call" generalises. A bare "NEVER merge" does not.
- **Spend words on the judgment calls**, not on things any capable engineer does unprompted. Do not tell the reader to read files before editing them.
- **No shouting.** No capitals for emphasis, no "CRITICAL", no rule repeated in three places. State it once, calmly, where it applies.
- **No rationalisation tables.** One discipline skill (`/debug`) keeps a short version because it earned it. Everywhere else, state the rule and its reason.
- **Steps only where order matters.** Use numbered steps for a real sequence and prose for everything else.
- **Mark the stops.** Say exactly where the skill waits for the user, and what it needs from them. Everything else runs without asking.
- **Keep it under about 150 lines.** Long reference material (report templates, rubrics, checklists) goes in a sibling file in the skill folder, named in the body and read when needed.

## Dispatching subagents

- Name the agent: "Dispatch the `judge` agent with…". Its standing instructions live in `.claude/agents/`, so the skill supplies only what is specific to this run: the target, the lens, the paths, what to return. For read-only searching and gathering use `explorer`. When no defined role fits, brief a general-purpose subagent in full.
- A brief is the whole of the subagent's knowledge. Give it the goal, what is already known or ruled out, the exact files, and the shape of the report you want back.
- Hand a reviewer the artifact, never your conclusion about it.
- Say that independent dispatches go out in one message so they run in parallel, and that the skill waits for all of them.
- A subagent's report is a claim. Any skill that acts on one must say what the caller checks firsthand before acting.

## Conventions every skill follows

- **Empty-result contract.** A skill that can legitimately find nothing says so and names exactly what it inspected. A thin or silent result reads as a failed run and gets re-run.
- **No snapshots of canonical files.** A skill that fills in `CLAUDE.md` or a KB edits the checked-in file in place. An embedded copy drifts from the real file and then overwrites it.
- **No `@` file links.** `@path` loads the whole file every time the skill loads. Name the path as text.
- **Evidence words mean what `CLAUDE.md` says they mean.** Use done, clean, verified, trace-verified, eyeballed and live-required as the glossary defines them.
- **Paths are stack-neutral in core skills.** A core skill refers to "the project's test command" and reads the actual command from `CLAUDE.md`. Stack-specific procedure belongs in a pack.

## Subagent definitions

```yaml
---
name: trace-verifier
description: Traces a code path end to end and reports file:line evidence. Use for wiring-lane smokes.
tools: Read, Grep, Glob, Bash
model: sonnet
---
```

The body is the role's standing contract: what it is for, what it must return, what it must refuse. Use `model: sonnet` for gathering, grounding and tracing, and leave `model` out for judgment and implementation so the role inherits the session's model.

## Rules

A rule file starts with a `paths:` list of globs and holds conventions for those files only. Keep each rule file to one topic. A rule with no `paths:` loads every session and should have gone in `CLAUDE.md`.

## Hook checks

`.claude/hooks/check-edit.mjs` runs after every file edit and loads each module in `.claude/hooks/checks/`. A check module exports:

```js
export const name = 'short-name';
export function match(relPath) { return relPath.endsWith('.json'); }
export function check(relPath, content) { return []; } // array of problem strings
```

Any returned problem blocks with the message shown to the agent, so a message must say what is wrong and what the correct form is. Checks must be fast, must not touch the network, and must only fail on something that is definitely wrong.

## After editing

A pack that wants its own questions asked during `/kickoff` ships `docs/kickoff/<pack>.md` and lists it in its manifest fragment. A pack that needs a check applied when a spec is locked ships a rule whose `paths` cover `docs/plans/`.

Framework skills are framework-managed: `/update-framework` overwrites them, with a backup. To keep a local change through updates, wrap it in `<!-- local: reason -->` and `<!-- /local -->` so it can be found and re-applied. Project skills you add yourself are never touched.

When you add or remove a skill, update the table in `CLAUDE.md`. When you change a framework skill in the blueprint repo itself, add a line to `FRAMEWORK_CHANGELOG.md`.
