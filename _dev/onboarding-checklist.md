# Onboarding checklist — OpenClaw agent project

Use this when standing up a new OpenClaw agent project (or a new operator picking up an existing one).

## 1. Local clone

- [ ] `git clone <canonical-repo>`
- [ ] `cd <repo>`
- [ ] Confirm `workspace/`, `deploy/`, `_dev/`, `docs/`, `.claude/` are present
- [ ] Confirm `.framework-version` exists at the repo root

## 2. Framework slash commands

- [ ] `/preflight` — captures agent + OS into CLAUDE.md
- [ ] `/adopt` (existing repo) OR `/kickoff` (greenfield) — populates project KBs
- [ ] Skim `docs/OpenClaw KBs/OC_KB_00_Index.md` to understand the stack-reference KB structure

## 3. Install OpenClaw CLI on the runtime host

- [ ] Install `openclaw` per the OpenClaw distribution
- [ ] Confirm `command -v openclaw` returns a path
- [ ] Confirm `openclaw doctor` runs without error (or addresses any drift it surfaces)

## 4. Configure the runtime host

- [ ] Decide the runtime host (Mac mini, dedicated Linux box, etc.)
- [ ] Install Node.js (v18+ recommended) for in-repo MCP servers and webhook receiver
- [ ] Clone the canonical repo on the runtime host (the rsync source)
- [ ] Create `~/.openclaw/workspace/` (the rsync target)
- [ ] Create `~/.openclaw/openclaw.json` with runtime config (model routing, cache, bootstrap cap, paths)

## 5. Plist + EnvironmentVariables

- [ ] Copy `deploy/com.example.openclaw-deploy.plist.template` to `~/Library/LaunchAgents/com.<your-domain>.openclaw-deploy.plist`
- [ ] Replace TODO markers with real values (paths + EnvironmentVariables)
- [ ] Confirm every `${ENV_VAR}` reference in `workspace/config/mcporter.json` has a corresponding entry in plist `EnvironmentVariables`
- [ ] `launchctl bootstrap gui/$(id -u) <path-to-plist>` to load the unit
- [ ] `launchctl list | grep openclaw` to confirm it's running

## 6. Webhook + deploy

- [ ] Generate webhook secret (`openssl rand -hex 32`)
- [ ] Set `WEBHOOK_SECRET` in plist `EnvironmentVariables`
- [ ] Configure GitHub webhook on canonical repo (URL via tunnel; secret matching plist)
- [ ] Test with a no-op commit; tail `~/Library/Logs/openclaw-deploy.out.log` for confirmation

## 7. First gateway start

- [ ] On the runtime host: confirm `~/.openclaw/workspace/` is populated (after first rsync)
- [ ] `openclaw gateway restart` to pick up the deployed config
- [ ] `openclaw doctor` to surface any drift
- [ ] Run a test prompt: `openclaw session run "<test phrase>"` (or via the gateway's user-facing channel)

## 8. First skill validation

- [ ] If skills exist: confirm folder names match frontmatter `name`
- [ ] Confirm `user-invokable` spelled correctly in every SKILL.md (NOT `user-invocable`)
- [ ] Run `_dev/validation-checklist.md` against each skill

## 9. Cron registration (if applicable)

- [ ] On the runtime host: `openclaw cron list` to see current state
- [ ] Register intended crons via `openclaw cron create`
- [ ] Set per-cron API keys in plist `EnvironmentVariables` (e.g., `ANTHROPIC_API_KEY_NIGHTLY_SUMMARY`)
- [ ] Update `workspace/HEARTBEAT.md` to document the registered crons

## 10. Verification

- [ ] Run `/audit-full` to surface any drift between repo and runtime expectations
- [ ] Read `docs/smoke-tests-pending.md` for outstanding manual tests; run any that apply
- [ ] Document deviations from this checklist in `docs/LESSONS.md`
