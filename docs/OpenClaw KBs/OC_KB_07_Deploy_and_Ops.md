# OC KB 7 — Deploy and Ops: GitOps webhook, rsync, plist, runtime CLI

## Pattern

The canonical deploy model for OpenClaw agents is **GitOps via webhook + rsync**:

1. Author commits to canonical repo and `git push`s.
2. GitHub fires a webhook to a long-lived **webhook receiver** running on the runtime host.
3. Receiver verifies the HMAC signature using a shared secret.
4. Receiver invokes `deploy.sh`, which does:
   - `git fetch origin && git checkout origin/main` in a known repo location on the host
   - `rsync --delete workspace/ ~/.openclaw/workspace/`
   - Optionally `openclaw gateway restart` if `mcporter.json` or bootstrap files changed
5. Gateway picks up the new content on next prompt (or after restart, if forced).

Critical config files on the runtime host (`~/.openclaw/openclaw.json`, the launchd plist) are **NEVER** in git — they live only on the runtime host.

## Why GitOps

- Every deploy is a git push. The git history IS the deploy log.
- File-level diffs in PR review.
- Rollback = `git revert` + push.
- No opaque artifact, no separate deploy tool, no CI/CD platform vendor lock-in.

## deploy.sh skeleton

```bash
#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${HOME}/agent-blueprint-canonical"   # adopter fills in
WORKSPACE_TARGET="${HOME}/.openclaw/workspace"
LOG="${HOME}/Library/Logs/agent-deploy.log"

echo "[deploy] $(date) starting" >> "$LOG"

cd "$REPO_DIR"
git fetch origin
git reset --hard origin/main
echo "[deploy] checked out $(git rev-parse --short HEAD)" >> "$LOG"

rsync -a --delete \
  --exclude 'TASK-QUEUE.md' \
  --exclude 'deliverables/' \
  --exclude 'private/' \
  workspace/ "$WORKSPACE_TARGET/"
echo "[deploy] rsync complete" >> "$LOG"

# Optional: restart gateway if mcporter or bootstrap changed
if git diff --name-only HEAD@{1} HEAD | grep -qE '(mcporter\.json|workspace/[A-Z]+\.md)'; then
  echo "[deploy] mcporter or bootstrap changed; restarting gateway" >> "$LOG"
  openclaw gateway restart >> "$LOG" 2>&1
fi

echo "[deploy] $(date) done" >> "$LOG"
```

The framework ships `deploy/deploy.sh` as a template with `[TODO]` markers for `REPO_DIR`, `WORKSPACE_TARGET`, and the rsync-exclude list. Adopters fill in.

## webhook-receiver.js skeleton

```javascript
#!/usr/bin/env node
// HMAC-verified GitHub webhook receiver.
// Run under launchd as a long-lived process.

const http = require('http');
const crypto = require('crypto');
const { execFile } = require('child_process');

const PORT = 9100;
const SECRET = process.env.WEBHOOK_SECRET;
if (!SECRET) {
  console.error('WEBHOOK_SECRET not set; refusing to start');
  process.exit(1);
}

const DEPLOY_SCRIPT = `${process.env.HOME}/path/to/deploy.sh`;  // adopter fills in

const server = http.createServer((req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405).end();
    return;
  }
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    const sig = req.headers['x-hub-signature-256'];
    const expected = 'sha256=' + crypto.createHmac('sha256', SECRET).update(body).digest('hex');

    // Constant-time compare
    let valid = false;
    try {
      valid = crypto.timingSafeEqual(Buffer.from(sig || ''), Buffer.from(expected));
    } catch {
      valid = false;
    }

    if (!valid) {
      console.error('[webhook] invalid signature');
      res.writeHead(401).end();
      return;
    }

    console.log('[webhook] verified; running deploy');
    execFile(DEPLOY_SCRIPT, [], (err, stdout, stderr) => {
      if (err) {
        console.error(`[webhook] deploy failed: ${err.message}`);
      } else {
        console.log('[webhook] deploy complete');
      }
    });
    res.writeHead(202).end();
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[webhook] listening on 127.0.0.1:${PORT}`);
});
```

Note: bind to `127.0.0.1`, not `0.0.0.0`. Expose to GitHub via a tunnel (Cloudflare Tunnel, ngrok, Tailscale Funnel) — never directly on the public internet. The HMAC verification is the auth layer; the network surface is minimized as defense in depth.

## launchd plist template

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.example.openclaw-deploy</string>

  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>/Users/<USER>/path/to/webhook-receiver.js</string>
  </array>

  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>

  <key>StandardOutPath</key>
  <string>/Users/<USER>/Library/Logs/openclaw-deploy.out.log</string>
  <key>StandardErrorPath</key>
  <string>/Users/<USER>/Library/Logs/openclaw-deploy.err.log</string>

  <key>EnvironmentVariables</key>
  <dict>
    <key>WEBHOOK_SECRET</key>
    <string>REPLACE_WITH_REAL_SECRET</string>
    <key>ANTHROPIC_API_KEY</key>
    <string>REPLACE_WITH_REAL_KEY</string>
    <!-- Add per-cron keys, MCP server tokens, etc. -->
  </dict>
</dict>
</plist>
```

The `EnvironmentVariables` dict is the source of truth for `process.env` for any process the launchd unit spawns — including `mcporter.json` `${ENV_VAR}` resolution. Real secrets live here; never in git.

## rsync excludes — the critical correctness requirement

`rsync --delete workspace/ ~/.openclaw/workspace/` deletes anything in the destination that isn't in the source. **This is correct behavior for content the agent author owns; catastrophic for runtime-mutable state.**

Always-excluded paths:
- `TASK-QUEUE.md` — agent writes to this at runtime
- `deliverables/` — agent writes outputs here
- `private/` — operator-only data not in git

**Adding a new runtime-mutable path requires updating the rsync excludes BEFORE shipping.** Otherwise the next deploy wipes the path. This is the fifth canonical OpenClaw silent-failure trap.

The framework's `deploy.sh` template lists the excludes explicitly. When you add a new runtime-mutable path:
1. Add it to the rsync `--exclude` list in `deploy.sh`
2. Test the deploy locally first (`rsync --dry-run`)
3. Then ship

**Plugin-distribution analogue.** This exclude mechanism only works because *you* control the deploy. When the agent is shipped as a **plugin** (Claude Code / Codex), the author re-pushes updates the user can't schedule, and an update replaces the shipped package files — there is no author-side exclude list to protect user state. The equivalent rule there is to push *all* runtime-writable state **off the package** into user-owned storage (one designated update-safe surface) so an update can never overwrite it. See `docs/investigations/2026-07-07-codex-and-claude-code-plugins-build-publish-gate.md` → "User state across plugin updates (the read-only-package rule)".

## Operations CLI

Common runtime-host operations:

```bash
# After deploy, when mcporter.json or bootstrap changed:
openclaw gateway restart

# Drift / repair check:
openclaw doctor --repair

# Reset session state (after major changes or stuck conversations):
openclaw session cleanup

# Models / auth:
openclaw models auth paste-token --provider anthropic --profile-id default

# Cron management (source of truth):
openclaw cron list
openclaw cron edit <name>

# Send a one-off message via a routing channel:
openclaw message send --channel slack --target <id> --message "…"
```

When in doubt about runtime state, `openclaw doctor` is the first tool to reach for. It surfaces config drift, missing env vars, broken MCP server connections, etc.

## Anti-patterns

- **Editing `~/.openclaw/workspace/` directly on the runtime host.** Wiped by next rsync. → fix: edit in canonical repo, push.
- **Storing secrets in `.env` checked into git.** They leak to the repo's history. → fix: plist EnvironmentVariables; `.env` is for local-dev MCP only.
- **HMAC verification with `===` comparison.** Timing-attackable. → fix: `crypto.timingSafeEqual` always.
- **Exposing webhook receiver on `0.0.0.0`.** Public internet attack surface. → fix: bind `127.0.0.1`, tunnel via Cloudflare/ngrok/Tailscale.
- **Adding a runtime-mutable path without updating rsync excludes.** Path wiped on next deploy. → fix: same-PR change to `deploy/deploy.sh`.
- **Force-pushing to canonical.** Webhook fires; deploy resets to whatever the new HEAD is. Operator may not notice until something breaks. → fix: protect main branch in GitHub settings.
- **Running deploy.sh as root.** Permissions on `~/.openclaw/` get clobbered. → fix: deploy runs as the user who owns the gateway process.

## Diagnosing "I pushed but nothing changed on the runtime host"

In order:

1. Check GitHub's webhook deliveries page — was the delivery sent successfully (HTTP 2xx response)?
2. Check `~/Library/Logs/openclaw-deploy.out.log` for the deploy run.
3. Check `~/Library/Logs/openclaw-deploy.err.log` for HMAC verification failures or git errors.
4. Confirm the launchd unit is loaded: `launchctl list | grep openclaw`.
5. Confirm `WEBHOOK_SECRET` in the plist matches the secret configured in the GitHub webhook.
6. If deploy ran but the agent doesn't reflect the change: did `mcporter.json` or a bootstrap file change? If yes, the gateway needs a restart — check whether `deploy.sh` ran `openclaw gateway restart`. If not, run it manually.

[VERIFY BEFORE SHIPPING] launchd plist key names and structure (especially `EnvironmentVariables`, `ProgramArguments`, `KeepAlive` semantics), and `openclaw` CLI subcommands — confirm against the macOS / OpenClaw versions actually deployed.
