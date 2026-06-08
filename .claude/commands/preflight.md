---
description: One-time setup — detect agent + OS, verify commands are project-local, write environment context into CLAUDE.md
---

# Preflight — Run Once Per Project

Run this on a freshly cloned `agent-blueprint` project, **before** `/kickoff`.

It captures three things into `CLAUDE.md` so future sessions don't have to re-figure them out:
1. **Which AI agent** is being used (Claude Code, Codex, Cursor, Aider, etc.)
2. **Which operating system** the user is on (macOS, Windows, Linux)
3. **Confirmation** that `.claude/commands/` is at the project root, not installed globally

Should take well under a minute.

## Why This Matters

- **Cross-agent portability.** Codex, Cursor, and other agents don't auto-load `.claude/commands/` the way Claude Code does. Recording the agent name lets future commands adapt their guidance.
- **OS-aware shell commands.** Build commands, paths, and shell syntax differ on Windows vs. macOS/Linux. Capturing the OS once means future sessions don't have to ask or guess.
- **Project-level commands, not global.** Some agents try to install commands into a global directory. The framework only works if the `.md` files live at `<project-root>/.claude/commands/`. Preflight verifies this.

## Instructions for the Agent

Work through the steps in order. Don't skip steps even if they seem trivial — the point is to leave a clean, written record in `CLAUDE.md`.

### Step 1 — Identify yourself (the agent)

State which AI coding agent you are. Common possibilities:
- **Claude Code** (Anthropic's CLI / VS Code extension / web app)
- **Codex** (OpenAI's CLI / VS Code extension)
- **Cursor** (built-in agent)
- **Aider**, **Continue**, **Cline**, or another tool

If you genuinely don't know, ask the user. Don't guess.

### Step 2 — Detect the operating system

Run a single shell command to detect the OS. Try in this order until one succeeds:
- `uname -s` → outputs `Darwin` (macOS) or `Linux`
- If `uname` fails, you're likely on Windows. Try `ver` (cmd) or `$PSVersionTable.OS` (PowerShell)

Also note the shell name (`zsh`, `bash`, `PowerShell`, `cmd`) — useful when building commands later.

### Step 3 — Verify commands are at the project root

Check that `.claude/commands/` exists at the project root and list the `.md` files inside.

The expected 22 commands:

```
adopt, audit-code, audit-full, audit-infra, brainstorm, changelog,
debug, gen-skill, gen-test, implement, investigate, kickoff,
orchestrate, plan, plan-review, preflight, research, ship, unify,
update-framework, update-kb, visualize
```

If any are missing, list which ones and STOP — do not attempt to recreate them. Tell the user the clone is incomplete and they should re-fetch the repo.

If the directory is missing entirely, the project files weren't extracted correctly.

**Important note for non-Claude-Code agents (Codex, Cursor, Aider, etc.):**
These `.md` files are **not** commands you need to install, register, or copy somewhere global. They are **instruction documents** that live with the project. When the user types `/<name>` or asks you to "run X," read the corresponding `.claude/commands/<name>.md` file and follow its instructions inline. Do not duplicate them into a user-global directory.

### Step 4 — Write environment to CLAUDE.md

Insert (or update) an `## Environment` section in `CLAUDE.md`. Place it directly after the `# Project: ...` heading and the introductory blockquote, **above** `## Overview`.

Use this exact structure:

```markdown
## Environment
- **Agent:** [Claude Code | Codex | Cursor | Aider | Other: <name>]
- **OS:** [macOS | Windows | Linux]
- **Shell:** [zsh | bash | PowerShell | cmd]
- **Captured:** YYYY-MM-DD
```

If an `## Environment` section already exists (preflight has been run before), update the values in place. Don't duplicate the section.

Use today's actual date for `Captured`.

### Step 5 — Verify OpenClaw runtime config sanity (best-effort)

These checks are non-blocking — they help the user catch silent-failure traps early. Skip individual sub-checks gracefully if files don't exist yet (greenfield projects start without them).

**5a. `mcporter.json` shape** — if `workspace/config/mcporter.json` exists:

```bash
python3 -c "import json,sys; d=json.load(open('workspace/config/mcporter.json')); sys.exit(0 if 'mcpServers' in d else 1)" \
  && echo "mcporter.json OK" \
  || echo "mcporter.json MISSING_KEY (top-level key must be mcpServers, not servers)"
```

If the file has the wrong top-level key (`servers` or anything other than `mcpServers`), report it loudly. This is one of the canonical silent-failure traps in OpenClaw.

**5b. `${ENV_VAR}` references** — if `mcporter.json` exists, grep for `${...}` references and list the env vars that must be set in the launchd plist `EnvironmentVariables` on the runtime host (not in `.env`):

```bash
grep -oE '\$\{[A-Z_][A-Z0-9_]*\}' workspace/config/mcporter.json 2>/dev/null | sort -u || true
```

Report the list to the user as: *"These env vars must be set in the launchd plist on the runtime host (not in .env). Confirm before first deploy."*

**5c. `openclaw` CLI on PATH** — `command -v openclaw`. If absent, warn (not fatal — the user may be developing the workspace before the runtime is available):

```
openclaw CLI not found on PATH. If you're developing on the runtime host,
install the OpenClaw gateway and re-run preflight. If you're authoring
workspace content on a separate dev machine, you can ignore this.
```

Don't auto-run anything that mutates state — preflight is read-only.

**5d. GitHub branch-cleanup hygiene (advisory)** — if `origin` is a GitHub remote and `gh` is authenticated, check whether merged PR head branches are auto-deleted:

```bash
gh repo view --json deleteBranchOnMerge -q .deleteBranchOnMerge 2>/dev/null || echo "n/a"
```

If it returns `false`, **recommend** (don't auto-enable — preflight is read-only) that the user turn it on so merged PR branches clean up automatically:

```
gh repo edit --delete-branch-on-merge
```

This pairs with `/ship`'s gated merge-to-main step (which cleans up the in-session-merge path): the GitHub setting covers the PR-merge path. If `origin` isn't GitHub or `gh` is unavailable, skip silently.

### Step 6 — Confirm and hand off

Print a single short summary:

```
Preflight complete.
- Agent: <name>
- OS: <name>
- Shell: <name>
- Commands: <N> found at .claude/commands/
- mcporter.json: <OK | MISSING_KEY | not present yet>
- Required env vars: <list from 5b, or "none referenced">
- openclaw CLI: <found vN.N.N | not on PATH (warn-only)>
- Auto-delete merged branches: <on | recommend enabling | n/a>

Next:
- Claude Code → run /kickoff
- Other agents → "read and follow .claude/commands/kickoff.md"
```

Then stop. Don't proceed into kickoff automatically — that's a separate, longer conversation the user starts when ready.
