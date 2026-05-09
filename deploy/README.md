# Deploy

GitOps deploy scaffold for OpenClaw agent projects.

## Pattern

```
git push origin main
       │
       ▼
GitHub webhook fires
       │
       ▼
webhook-receiver.js (running under launchd on runtime host)
       │
       ▼ HMAC verify (constant-time compare)
       │
       ▼ on valid signature
       │
deploy.sh
       │
       ▼ git fetch + git reset --hard origin/main
       │
       ▼ rsync --delete workspace/ ~/.openclaw/workspace/
       │
       ▼ if mcporter.json or bootstrap files changed:
       │   openclaw gateway restart
       │
       ▼
agent picks up new content on next prompt
```

## Files

| File | Purpose |
|---|---|
| `deploy.sh` | Git-pull + rsync skeleton. Fill in TODOs for paths and excludes. |
| `webhook-receiver.js` | Node HTTP server with HMAC verification. Fill in TODO for deploy.sh path. |
| `com.example.openclaw-deploy.plist.template` | launchd unit. Fill in TODOs for paths and EnvironmentVariables. |

## Runtime-host vs repo split

This directory ships **templates with TODO markers**. The actual deployed files live only on the runtime host:

- `~/Library/LaunchAgents/com.<your-domain>.openclaw-deploy.plist` (the real plist with secrets)
- `~/.openclaw/openclaw.json` (gateway runtime config)
- `~/.openclaw/workspace/` (the rsync target — populated by `deploy.sh`)

**Never commit** real secrets, real plist values, or runtime-only config to git.

## Critical correctness requirements

1. **HMAC verification uses `crypto.timingSafeEqual`.** The skeleton already does this — don't change it to `===`.
2. **Webhook listens on `127.0.0.1`.** Expose to GitHub via a tunnel (Cloudflare, ngrok, Tailscale). The HMAC is auth; the tunnel is defense in depth.
3. **rsync excludes are load-bearing.** Adding a runtime-mutable path (where the agent writes at runtime) requires adding it to `--exclude` in `deploy.sh`. Otherwise `--delete` wipes it on next deploy. Default excludes: `TASK-QUEUE.md`, `deliverables/`, `private/`.
4. **Gateway restart only on relevant changes.** The deploy script restarts only when `mcporter.json` or a bootstrap file changed; otherwise the gateway picks up changes on the next prompt without a restart.

## Setup checklist

1. [ ] Fill in TODOs in `deploy.sh`, `webhook-receiver.js`, `*.plist.template`
2. [ ] Generate a webhook secret (`openssl rand -hex 32`); set in plist `EnvironmentVariables.WEBHOOK_SECRET`
3. [ ] Configure GitHub webhook on the canonical repo with the same secret + URL pointing at the tunnel
4. [ ] Test with a no-op commit: push and verify deploy ran (`tail ~/Library/Logs/openclaw-deploy.out.log`)
5. [ ] Make the launchd unit `KeepAlive` so it restarts if it crashes

See `docs/OpenClaw KBs/OC_KB_07_Deploy_and_Ops.md` for the full pattern + diagnostic guide.
