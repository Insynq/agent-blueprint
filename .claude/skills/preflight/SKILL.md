---
name: preflight
description: Use in the first session on a fresh clone or a new machine, before /kickoff or /adopt, and again whenever skills or hooks seem not to be loading. It records the environment and checks that this checkout's skills, hooks and packs are the ones actually in effect.
disable-model-invocation: true
---

# Preflight

Per-machine setup. You are done when the Environment block in `CLAUDE.md` describes this machine and the user has a short report saying whether the project's skills, hooks and packs are in place, with anything that needs their action named.

Preflight changes one thing: the Environment block. Everything else is a check you report on. Do not repair a broken install here, because a missing skill or hook script means the clone or the install is incomplete, and recreating files by hand hides that.

## Environment block

Find `## Environment` in `CLAUDE.md` and replace its body in place with four lines: `- Agent:`, `- OS:`, `- Shell:`, `- Captured: YYYY-MM-DD`. Get the OS and shell by running a command (`uname -s`, `echo $SHELL`), not from memory. If the block already holds values from another machine, overwrite them. If the heading is missing, which happens in an adopted project whose `CLAUDE.md` has not been merged yet, add the section directly under the title block. Touch nothing else in the file.

If you are not Claude Code, record what you are and tell the user that skills, rules and hooks under `.claude/` will not load on their own in this agent: skills must be read and followed by path, and the hook checks will not run.

## Skills

List `.claude/skills/*/SKILL.md`. Every skill named in the Skills table of `CLAUDE.md`, and in any pack section between the `packs:start` and `packs:end` markers, should be on disk. Report any that are missing and stop short of recreating them.

Then look for anything that shares a name with a project skill:

- `~/.claude/skills/<name>/`
- `~/.claude/commands/<name>.md`
- `.claude/commands/<name>.md` in this project, which is left over from a 0.x install

Report each collision by path. Say plainly that nothing guarantees which body runs when two share a name, so the project version cannot be assumed to win. The user either renames or removes the other copy, or confirms which one loads by invoking the skill and comparing what it does with the project file. Leftover project commands mean the project still carries the 0.x layout: point to `/update-framework`, which migrates it.

## Hooks

Read the `hooks` section of `.claude/settings.json`. For each registered command, check that the script it names exists and that `node` is on the path. Then probe the scripts directly, which proves they work without proving they are registered:

```bash
echo '{"tool_input":{"command":"git push --force"}}' | node .claude/hooks/guard-bash.mjs; echo "exit $?"
node .claude/hooks/check-edit.mjs CLAUDE.md; echo "exit $?"
```

The first should exit 2 with a blocked message and the second should exit 0.

Hooks are discovered when a session starts. A session that was open before the hooks were installed will not have them. You cannot see the registered list yourself, so ask the user to open `/hooks` and confirm that the Bash guard and the edit check are both listed, and to restart the session and look again if they are not. Report the scripts as verified and the registration as whatever the user tells you, or as unconfirmed.

## Packs and version

Read `.framework-packs.json` and `.framework-version`. Report the framework version and the installed packs by name. No record file, or an empty list, means core only; say that, and that `/kickoff` or `/adopt` will work out which packs fit. If `.framework-version` is missing the framework was copied in rather than installed, and `/update-framework` will not work until that is fixed.

## Optional: memory that travels with the repository

Claude Code keeps its auto memory in a per-machine directory under `~/.claude/projects/`, so what one machine learns never reaches another. Offer, once, to link that directory to the committed `.claude/memory/` folder so memory is versioned with the code. Mention the cost: anything written to memory becomes visible to everyone with access to the repository.

If the user says yes, run `_dev/tools/setup-memory-symlink.sh` and report what it printed. If the script is not there, say so and leave it. If they say no or do not answer, move on.

## Report

Close with a short summary and then stop. Starting discovery is the user's call.

```
Preflight
- Environment: <agent>, <OS>, <shell> (written to CLAUDE.md)
- Skills: <N> on disk; missing: <names | none>; name collisions: <paths | none>
- Hooks: scripts <verified | problem>; registration <confirmed by user | unconfirmed, check /hooks>
- Framework: v<version>; packs: <names | core only>
- Memory link: <linked | declined | script not present>
Next: /kickoff for a new project, /adopt for existing code.
```
