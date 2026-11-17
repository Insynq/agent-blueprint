# Contributing to agent-blueprint

## Layout of this repository

| Path | What it is | Ships to projects |
|---|---|---|
| `CLAUDE.md`, `.claude/`, `docs/`, `_dev/`, `.github/` | The core, exactly as a project receives it | Yes |
| `packs/<name>/` | Optional packs: `pack.json`, a `files/` tree rooted at the project root, and `CLAUDE.section.md` | When selected |
| `bin/`, `lib/` | The installer (`init.js`), new-project scaffolder (`create.js`) and pack tool (`pack.js`) | No |
| `framework-dev/` | Specs, investigations and retired 0.x documents | No |
| `.framework-manifest.json` | Who owns each shipped path, and what happens on conflict | Yes |

`CLAUDE.md` at the root is the template a project receives, so it is full of `[TODO]` markers. That is intended.

## Rules for changes

- Read `docs/AUTHORING_SKILLS.md` before editing anything under `.claude/` or a pack. It is the contract for skills, agents, rules and hook checks.
- Core stays stack-neutral. Anything that names a specific runtime, database, host or vendor belongs in a pack.
- A rule that must hold every time is a hook check, not a sentence.
- Give the reason with every constraint. If the reason is an incident, say what happened in one line.
- Every shipped file must be classified: core files in `.framework-manifest.json`, pack files in that pack's `pack.json`.
- Shorter is better. If a skill passes 150 lines, move reference material to a sibling file.

## Before opening a pull request

```bash
node bin/pack.js check                                   # packs valid, every file classified
node .claude/hooks/check-edit.mjs .claude/skills/*/SKILL.md .claude/agents/*.md
for f in bin/*.js lib/*.js; do node --check "$f"; done

# a new project builds and its skills pass the check
node bin/create.js /tmp/bp-test --packs app,claude-agent,devdash
(cd /tmp/bp-test && node .claude/hooks/check-edit.mjs .claude/skills/*/SKILL.md)
```

To test the installer against unreleased changes, build a tarball with one top-level directory and run `node bin/init.js --tarball <file> --packs <names> --dry-run` inside a scratch git repository.

A change to a skill is unproven until it has been seen to change behaviour in a real session. Say in the pull request whether it has.

## Releasing

Bump `version` in `package.json` and `.framework-manifest.json` together, add an entry to `FRAMEWORK_CHANGELOG.md`, tag `vX.Y.Z`, publish the GitHub release, then `npm publish`. The installer fetches the tag that matches its own version, so the tag must exist before the package is published.
