#!/usr/bin/env bash
# Point this machine's Claude Code auto memory at the repository's committed
# .claude/memory/, so memory travels with the project and every machine and
# worktree shares one set.
#
# Claude Code keeps auto memory in ~/.claude/projects/<slug>/memory/, where
# <slug> is the checkout's absolute path with each "/" replaced by "-". This
# replaces that directory with a symlink into the repository. An existing real
# directory there is moved aside, never deleted.
#
# Opt-in. Run once per machine, and once per worktree that should share it:
#   bash _dev/tools/setup-memory-symlink.sh
#
# Committed memory is visible to everyone with the repository. Do not use this
# if memory may hold anything private.
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
# In a linked worktree, share the main checkout's memory directory.
COMMON_DIR="$(cd "$REPO_ROOT" && cd "$(git rev-parse --git-common-dir)" && pwd)"
MAIN_ROOT="$(dirname "$COMMON_DIR")"
SRC="$MAIN_ROOT/.claude/memory"
SLUG="$(printf '%s' "$REPO_ROOT" | sed 's#[/.]#-#g')"
PROJ_DIR="$HOME/.claude/projects/$SLUG"
TARGET="$PROJ_DIR/memory"

echo "checkout : $REPO_ROOT"
echo "source   : $SRC"
echo "target   : $TARGET"

mkdir -p "$SRC"
[ -f "$SRC/MEMORY.md" ] || printf '# Memory index\n\nOne line per memory file: `- [Title](file.md): hook`\n' > "$SRC/MEMORY.md"
mkdir -p "$PROJ_DIR"

if [ -L "$TARGET" ]; then
  if [ "$(readlink "$TARGET")" = "$SRC" ]; then echo "Already linked."; exit 0; fi
  echo "Repointing existing symlink."
  rm "$TARGET"
elif [ -e "$TARGET" ]; then
  bak="$TARGET.local.bak.$(date +%Y%m%d-%H%M%S)"
  echo "Existing memory directory moved to $bak"
  echo "Copy anything you want to keep from there into $SRC."
  mv "$TARGET" "$bak"
fi

ln -s "$SRC" "$TARGET"
ls -ld "$TARGET"
