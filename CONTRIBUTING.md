# Contributing to agent-blueprint

## What this repo is

A starter template for building, editing, and improving AI agents that run on **OpenClaw**. It ships opinionated commands, OpenClaw stack-reference KBs, workspace/deploy/_dev scaffolds, and workflow patterns — not application code.

This is the sister framework to [`@insynq/app-blueprint`](https://github.com/Insynq/app-blueprint), reframed for OpenClaw agent dev.

## How to contribute

**Found a gap in a command?** Open an issue describing:
- Which command (`/kickoff`, `/implement`, etc.)
- What the command does that's wrong or missing
- What it should do instead

**Found a missing OpenClaw silent-failure trap?** Open an issue or PR with the entry. Add it to:
- The relevant `OC_KB_*.md` (canonical source — full explanation)
- `docs/OpenClaw KBs/OC_KB_00_Index.md` Always/Never list (one-line cross-reference)
- `CLAUDE.md` `## DO NOT` section (one-line, pre-filled in the template so adopters inherit it)

**Found a missing anti-pattern or lesson?** Open an issue or PR with the entry formatted as `[CATEGORY-N]` following the pattern in `docs/LESSONS.md`.

**Want to add a new command?** Open an issue first to discuss scope. New commands should:
- Follow the existing file format (frontmatter description + arguments)
- Be added to the command table in `CLAUDE.md`
- Be added to the `framework-managed` category in `.framework-manifest.json`
- Not duplicate functionality of an existing command
- Not introduce stack assumptions outside OpenClaw + Anthropic

## Reporting issues

Use GitHub Issues at this repository. Include:
1. Which command, KB file, or scaffold the issue is in
2. What you expected it to do
3. What it actually did (or didn't do)

## Style guidelines

- Commands are written as instructions to Claude, not to users
- **No specific skill content, MCP integrations, or business-domain examples** in framework files. Anonymous placeholders only:
  - Skill names: `skill-name-here`, not `triage-mail` (unless it's clearly an example in a docstring marked as such)
  - MCP servers: `server-id`, not `gmail-mcp`
  - Use cases: `Does X for Y users`, not `Triage incoming email for solo founders`
- **TODO markers for adopter content.** Use `[TODO — adopter fills in]` (or contextually-clearer `[TODO ...]`) in templates and scaffolds. The framework provides structure; the adopter provides content.
- **No assumptions outside OpenClaw + Anthropic.** No web-stack examples (Supabase, Next.js, Vercel, RLS, Tailwind, Stripe). If you need to make a generic "deploy platform" reference, frame it abstractly and let the adopter fill in their specifics.
- **Opinionated for OpenClaw.** This framework is opinionated, not stack-agnostic. It's correct to assume gateway + bootstrap files + on-demand skill loading + MCP via mcporter + GitOps deploy. If your contribution requires a different runtime, it probably belongs in a different framework.
- Anti-patterns table rows: `| Pattern | Severity | Why It's Bad |`
- LESSONS.md entries: rule + **WHY:** + **HOW TO APPLY:**
- KB files (`OC_KB_*.md`) follow the canonical structure: Pattern → When to use / skip → Anti-patterns → subject-specific sections with code fences → `[VERIFY BEFORE SHIPPING]` markers for unconfirmed claims

## Verification before submitting a PR

Run:

```bash
# No web-stack contamination introduced
grep -ri "supabase\|next\.?js\|vercel\|\bRLS\b\|tailwind\|shadcn\|pgvector\|voyage\|stripe" \
  --include="*.md" --include="*.json" --include="*.js" --include="*.yml" --include="*.yaml" \
  --exclude-dir=node_modules --exclude-dir=.git .

# mcporter.json template still parses with the right top-level key
python3 -c "import json,sys; d=json.load(open('workspace/config/mcporter.json')); sys.exit(0 if 'mcpServers' in d else 1)"

# Installer still works
node ./bin/init.js --version
```

All three should pass cleanly. The grep should return zero hits in framework files (excluding `node_modules/` and `.git/`).
