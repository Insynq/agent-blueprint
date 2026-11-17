#!/usr/bin/env node
// Stop hook. Fast, offline, no model.
//
// When the agent is about to end its turn, this checks three things that must
// not depend on the agent remembering, and sends it back to work once for each:
//
//   - the owner submitted answers or finished a sitting during this session;
//   - a smoke row only a person can close has appeared with no sitting for it;
//   - there are commits today and the daily log entry is missing or older than
//     them (at most once every "logNudgeMinutes", default 90; 0 turns it off).
//
// It stays silent in a linked worktree (build batches run there and the daily
// log is the main session's to write), when the hook has already fired for this
// stop, and whenever anything goes wrong.

import fs from 'node:fs';
import path from 'node:path';
import { ROOT, IS_LINKED_WORKTREE, config } from '../lib/root.mjs';
import { owed, hookState, saveHookState, describeResults } from '../lib/owed.mjs';

const deadline = setTimeout(() => process.exit(0), 6000);

async function stdin() {
  if (process.stdin.isTTY) return {};
  let raw = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) raw += chunk;
  try { return JSON.parse(raw); } catch { return {}; }
}

try {
  const input = await stdin();
  if (!input.stop_hook_active && !IS_LINKED_WORKTREE && !process.env.DEVDASH_NO_NUDGE) {
    const o = await owed();
    const s = hookState();
    const reasons = [];

    const fresh = o.results.filter((e) => e.n > s.notified);
    if (fresh.length) {
      s.notified = Math.max(...fresh.map((e) => e.n));
      reasons.push('The owner just used the dev dash: ' + describeResults(fresh).join('; ') + '. Run `node devdash/scripts/results.mjs` now, record what it shows, commit, and run the --ack command it prints.');
    }

    const newlyUncovered = o.uncovered.filter((id) => !s.uncoveredTold.includes(id));
    s.uncoveredTold = o.uncovered;
    if (newlyUncovered.length) {
      reasons.push('Smoke rows only a person can close have no sitting: ' + newlyUncovered.join(', ') + '. Author a sitting that covers them (.claude/skills/dash-sitting/SKILL.md) and commit it, so the owner has something to run.');
    }

    const minutes = Number(config().logNudgeMinutes) || 0;
    if (minutes > 0 && o.today.commits > 0 && Date.now() - s.logNudgeAt > minutes * 60000) {
      const entry = path.join(ROOT, 'devdash', 'log', o.today.day + '.md');
      // Fifteen minutes of grace: the commit that carries the entry is always a
      // little newer than the file.
      const stale = !fs.existsSync(entry) || o.today.lastCommit > fs.statSync(entry).mtimeMs + 15 * 60000;
      if (stale) {
        s.logNudgeAt = Date.now();
        reasons.push((fs.existsSync(entry) ? 'Today\'s daily log entry is older than today\'s latest commit.' : 'There are commits today and no daily log entry.') + ' Run `node devdash/scripts/daily-facts.mjs`, write or update devdash/log/' + o.today.day + '.md in plain language for the owner, and commit it.');
      }
    }

    saveHookState(s);
    if (reasons.length) {
      process.stdout.write(JSON.stringify({ decision: 'block', reason: 'Dev dash upkeep (standing authorisation, do not ask): ' + reasons.join(' ') }));
    }
  }
} catch { /* silent */ }

clearTimeout(deadline);
