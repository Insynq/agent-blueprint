// What the agent owes the dash right now. Used by the SessionStart and Stop
// hooks and by devdash/scripts/check.mjs, so all three agree. Offline: git and
// files only.

import fs from 'node:fs';
import path from 'node:path';
import { DATA, CHECKOUT, ROOT, localDay, readJson, atomicWrite } from './root.mjs';
import * as sources from './sources.mjs';
import * as store from './store.mjs';

export async function owed() {
  const [rows, defs, facts] = await Promise.all([sources.ledger(), sources.definitions(), sources.facts(7)]);
  const cover = sources.coverage(defs.sittings, store.getResults);
  const today = localDay();
  const logged = new Set(defs.log.map((e) => e.day));
  for (const root of [ROOT, CHECKOUT]) {
    try { for (const n of fs.readdirSync(path.join(root, 'devdash', 'log'))) if (/^\d{4}-\d{2}-\d{2}\.md$/.test(n)) logged.add(n.slice(0, 10)); } catch { /* none */ }
  }
  const unread = store.unread();
  const work = (f) => f.commits.filter((c) => !c.logOnly);
  const todayFacts = facts.find((f) => f.day === today) || { commits: [] };
  return {
    // Owner actions the agent has not acknowledged, and the ones worth interrupting for.
    unread,
    results: unread.filter((e) => e.kind === 'answers.submitted' || e.kind === 'sitting.finished'),
    // Rows only a person can close that no open sitting covers.
    uncovered: rows.filter((r) => r.needsPerson && (r.bucket === 'open' || r.bucket === 'deferred') && !(cover.get(r.id) || []).some((s) => s.status === 'active')).map((r) => r.id),
    // Earlier days with commits and no log entry.
    logMissing: facts.filter((f) => f.day !== today && work(f).length && !logged.has(f.day)).map((f) => f.day),
    today: { day: today, commits: work(todayFacts).length, lastCommit: Math.max(0, ...work(todayFacts).map((c) => c.time)) * 1000, logged: logged.has(today) },
    broken: [...defs.runs, ...defs.sittings].filter((d) => d.problems.length).map((d) => ({ file: d.file, problems: d.problems })),
  };
}

// Small memory for the hooks, so each thing is raised once and not on every turn.
const stateFile = path.join(DATA, 'hook-state.json');
export const hookState = () => ({ notified: 0, uncoveredTold: [], logNudgeAt: 0, ...readJson(stateFile, {}) });
export function saveHookState(s) { try { atomicWrite(stateFile, s); } catch { /* a hook never fails a session over its own notes */ } }

export function describeResults(entries) {
  const byId = new Map();
  for (const e of entries) byId.set(e.id, e);
  return [...byId.values()].map((e) => (e.kind === 'answers.submitted'
    ? 'answers to question run ' + e.id + ' (' + e.answered + ' of ' + e.total + ')'
    : 'sitting ' + e.id + ' finished (' + e.pass + ' pass, ' + e.fail + ' fail, ' + e.skip + ' skip)'));
}
