#!/usr/bin/env node
// SessionStart hook. Fast, offline, no model.
//
// 1. Starts the dash server if it is not running (devdash/config.json
//    "autostart": false turns this off; it never starts in CI).
// 2. If the owner has answered or tested since the agent last acknowledged, or
//    the dash is owed something, prints a short digest as session context so
//    the session opens knowing. Prints nothing when there is nothing to say.

import { spawn } from 'node:child_process';
import path from 'node:path';
import { DASH_DIR, config } from '../lib/root.mjs';
import { owed, hookState, saveHookState, describeResults } from '../lib/owed.mjs';

const deadline = setTimeout(() => process.exit(0), 6000);

try {
  if (config().autostart && !process.env.CI && !process.env.DEVDASH_NO_AUTOSTART) {
    const child = spawn(process.execPath, [path.join(DASH_DIR, 'scripts', 'start.mjs'), 'start', '--quiet'], { detached: true, stdio: 'ignore' });
    child.unref();
  }
} catch { /* the digest matters more than the server */ }

try {
  const o = await owed();
  const out = [];
  if (o.results.length) {
    out.push('The owner used the dev dash since you last acknowledged it: ' + describeResults(o.results).join('; ') + '.');
    out.push('Before anything else, run `node devdash/scripts/results.mjs`, record what it shows (rulings into the spec or KB_1, passed steps into docs/smoke-tests-pending.md exactly as printed), commit, then run the --ack command it prints. Tell the owner in one or two lines what you recorded. Do not ask them to repeat anything.');
  } else if (o.unread.length) {
    out.push('The owner has a sitting or answers in progress on the dev dash (' + o.unread.length + ' action(s), nothing submitted or finished yet). `node devdash/scripts/results.mjs` shows them; nothing to record until they finish.');
  }
  if (o.uncovered.length) out.push('Smoke rows only a person can close have no sitting: ' + o.uncovered.join(', ') + '. Author one (see .claude/skills/dash-sitting/SKILL.md) before telling the owner the work is ready for them.');
  if (o.logMissing.length) out.push('The daily log has no entry for ' + o.logMissing.join(', ') + ', which had commits. Write each from `node devdash/scripts/daily-facts.mjs <date>` and commit it.');
  if (o.broken.length) out.push('Broken dash definitions (not shown to the owner): ' + o.broken.map((b) => b.file).join(', ') + '. Run `node devdash/scripts/check.mjs`.');
  if (out.length) {
    const s = hookState();
    s.notified = Math.max(s.notified, ...o.results.map((e) => e.n), 0);
    s.uncoveredTold = o.uncovered;
    saveHookState(s);
    out.push('You have standing authorisation for all of this (.claude/rules/devdash.md): do it without asking.');
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: 'Dev dash: ' + out.join('\n') } }));
  }
} catch { /* silent: a hook must never block a session from starting */ }

clearTimeout(deadline);
