# Agent Blueprint

A starting point for building software with Claude Code as the engineer and you as the project manager. It gives a project a working process (plan, review, build, verify, ship), the skills that run it, and mechanical checks for the mistakes that do not produce errors.

It is one runtime-neutral core plus optional packs:

| Pack | For |
|---|---|
| `app` | A product with web, mobile and database in one repository |
| `claude-agent` | An operational agent that runs as Claude Code driving deterministic scripts, interactively and on a schedule |
| `devdash` | A local dashboard: your window onto the project, with decision runs, timed test sittings and a daily log |

Packs combine. An app with an agent inside it takes `app` and `claude-agent`, and `devdash` goes with anything.

## Start a project

New project, from a local clone of this repository:

```bash
node bin/create.js ../my-project --packs app,claude-agent,devdash
```

That copies the core and the packs into a new directory, without the framework's own development files, and initialises git.

Existing repository:

```bash
cd my-existing-repo
npx @insynq/agent-blueprint init --packs app
```

Then open Claude Code in the project and run `/preflight`, followed by `/kickoff` for a new project or `/adopt` for existing code.

Add a pack later, from a local clone:

```bash
node /path/to/agent-blueprint/bin/pack.js add devdash --target .
node /path/to/agent-blueprint/bin/pack.js list
```

## What a project gets

```
CLAUDE.md                 short; what every session needs
.claude/
  skills/                 the procedures: /orchestrate, /implement, /ship, ...
  agents/                 subagent roles: explorer, grounder, implementer, judge, refuter, trace-verifier
  rules/                  conventions loaded only when matching files are touched
  hooks/                  mechanical checks that run on every command and edit
  settings.json           permissions and hook wiring
docs/
  WORKFLOW.md             how non-trivial work ships
  AUTHORING_SKILLS.md     how to write skills, agents, rules and checks
  smoke-tests-pending.md  the one list of what still needs verifying
  LESSONS.md, PARKING_LOT.md, KB_*.md, plans/
```

## How work ships

`docs/WORKFLOW.md` is the full account. In short:

1. **Grill, then run.** The agent asks every open question up front and records the answers. After you say go, it works through the agreed scope without stopping to ask.
2. **A spec is locked before anything is built.** Two judges with different lenses try to falsify it against the real code. Both must pass.
3. **Each batch goes through a fixed pipeline:** ground the spec against live code, implement in one worktree, pass a mechanical gate (tests seen failing, zero new type errors against a baseline), adversarial review, then a pull request. Nothing merges from inside a batch.
4. **A report is a claim.** Nothing is recorded as verified unless it was observed. A test that was not run ships as `Unverified at ship`, with an owner and a date.

Small changes skip all of this. The loop is for work that crosses subsystems or needs decisions from you.

## Skills

| Skill | Use it when |
|---|---|
| `/preflight`, `/kickoff`, `/adopt` | Setting a project up |
| `/orchestrate` | Running a phase of work end to end |
| `/brainstorm`, `/research`, `/investigate` | Deciding what to do |
| `/plan`, `/plan-review`, `/stress-test` | Writing a spec and trying to break it |
| `/implement`, `/debug`, `/gen-test` | Building |
| `/audit-code`, `/audit-full`, `/unify`, `/triage` | Reviewing and tidying |
| `/ship`, `/update-kb` | Landing work and keeping docs honest |
| `/update-framework` | Pulling a newer version of this framework |

Packs add their own: `app` adds `/db-push`, `/gen-migration`, `/audit-rls`, `/gen-component` and `/deploy`; `devdash` adds `/dash`, `/dash-questions` and `/dash-sitting`; `claude-agent` adds a runbook wrapper to copy.

## Permissions

The shipped `.claude/settings.json` allows tools broadly, has no ask list, and denies a short list of destructive commands. A hook blocks force pushes and recursive deletes of the home or root directory wherever the flag sits in the command. This is deliberate: approval prompts every few minutes break long runs, and the questions worth asking are asked once, before the run. Tighten it in your project if your situation differs.

## Updating

Run `/update-framework` in the project. It downloads the release, shows a plan, backs up anything it replaces to `.framework-backup/`, and never writes over files the project owns. Local changes to framework files survive when wrapped in `<!-- local: reason -->` … `<!-- /local -->`.

Projects on a 0.x version have slash commands in `.claude/commands/` and need a one-time migration. From a clone of this repository run `node bin/pack.js seed-update --target <project>`, then `/update-framework` in the project. The steps are in `.claude/skills/update-framework/migrating-from-0.x.md`.

## Installer safety

The `npx` installer fetches the release tarball for its own version from GitHub, prints its SHA-256, stages it, and writes only to paths the manifest lists. It refuses a dirty working tree, never overwrites a file without a backup or a `.framework` sibling, and never touches `package.json`, lockfiles or `.git/`. `--dry-run` prints the plan and exits. `--tarball <file>` installs from a local archive.

What you are trusting: the `@insynq` npm scope and the public GitHub repository at install time. Packages are not signed, so compare the printed SHA-256 with the release if that matters to you. Windows needs WSL.

## Working on the framework itself

See `CONTRIBUTING.md`. `framework-dev/` holds the specs, investigations and 0.x documents behind the current design. `FRAMEWORK_CHANGELOG.md` records each release.

## License

MIT
