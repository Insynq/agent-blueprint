#!/usr/bin/env bash
#
# OpenClaw GitOps deploy script.
#
# Invoked by deploy/webhook-receiver.js after HMAC verification.
# Pulls the latest canonical and rsyncs workspace/ to the gateway's runtime path.
#
# Adopter MUST fill in TODO markers before first deploy.

set -euo pipefail

# TODO: path to the canonical repo clone on the runtime host
REPO_DIR="${HOME}/path/to/canonical/repo"

# TODO: path the openclaw gateway reads workspace from
WORKSPACE_TARGET="${HOME}/.openclaw/workspace"

# TODO: log path
LOG="${HOME}/Library/Logs/agent-deploy.log"

echo "[deploy] $(date) starting" >> "$LOG"

cd "$REPO_DIR"
git fetch origin
git reset --hard origin/main
echo "[deploy] checked out $(git rev-parse --short HEAD)" >> "$LOG"

# rsync excludes — CRITICAL.
# Adding a new runtime-mutable path (where the agent writes at runtime) requires
# adding it here. Otherwise `--delete` wipes it on next deploy.
#
# Default excludes:
#   TASK-QUEUE.md   — agent runtime state
#   deliverables/   — agent outputs
#   private/        — operator-only data not in git
#
# TODO: add additional --exclude lines as adopter introduces mutable paths.
rsync -a --delete \
  --exclude 'TASK-QUEUE.md' \
  --exclude 'deliverables/' \
  --exclude 'private/' \
  workspace/ "$WORKSPACE_TARGET/"
echo "[deploy] rsync complete" >> "$LOG"

# Restart gateway if mcporter.json or any bootstrap-file changed.
# (Diff between previous and current commit; if any of those paths are in the diff, restart.)
if git diff --name-only HEAD@{1} HEAD 2>/dev/null | grep -qE '(mcporter\.json|workspace/[A-Z]+\.md)'; then
  echo "[deploy] mcporter or bootstrap changed; restarting gateway" >> "$LOG"
  openclaw gateway restart >> "$LOG" 2>&1 || echo "[deploy] gateway restart failed" >> "$LOG"
fi

echo "[deploy] $(date) done" >> "$LOG"
