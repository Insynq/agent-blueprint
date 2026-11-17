#!/usr/bin/env node
// health-check.mjs: is the agent's plumbing healthy? No model is involved.
//
// A health check that asks a model whether things are fine inherits the
// model's failure modes, and it stops working exactly when the model's
// credentials do. So this is plain code: each check is a function that returns
// nothing when healthy, or a string saying what is wrong. Schedule it
// separately from the runs it watches (see agent/schedule/README.md).
//
//   node agent/scripts/health-check.mjs                  run every check
//   node agent/scripts/health-check.mjs --json           machine-readable
//   node agent/scripts/health-check.mjs --only env,tree  run some
//   node agent/scripts/health-check.mjs --skip last-run  skip some
//
// Exit codes: 0 all healthy, 1 at least one check failed, 2 bad usage.
//
// This reports system health only: did runs happen, are credentials present,
// is the checkout in a runnable state. Business questions (what is overdue,
// what needs a decision) belong in a runbook.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = process.env.CLAUDE_PROJECT_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// ---- configuration: edit these for the project ------------------------------

// Names only. A health check never prints a value.
const REQUIRED_ENV = (process.env.AGENT_REQUIRED_ENV || '').split(',').map((s) => s.trim()).filter(Boolean);

// Written by agent/scripts/scheduled-run.sh at the end of every run.
const LAST_RUN_FILE = path.resolve(root, process.env.AGENT_LAST_RUN_FILE || 'agent/logs/scheduled/last-run.json');

// Longest acceptable gap between scheduled runs. Daily plus slack by default.
const MAX_RUN_AGE_HOURS = Number(process.env.AGENT_MAX_RUN_AGE_HOURS || 26);

// ---- checks -----------------------------------------------------------------
// A check returns undefined when healthy, or a reason string. A check that
// throws is reported as failed with the error message.

export const checks = [
  {
    name: 'env',
    what: 'required environment variables are present',
    run() {
      if (!REQUIRED_ENV.length) return 'no required variables are listed. Set AGENT_REQUIRED_ENV (comma separated names) or edit REQUIRED_ENV.';
      const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
      if (missing.length) return 'missing: ' + missing.join(', ');
    },
  },
  {
    name: 'last-run',
    what: 'the last scheduled run was recent and succeeded',
    run() {
      if (!fs.existsSync(LAST_RUN_FILE)) return 'no run has been recorded at ' + path.relative(root, LAST_RUN_FILE);
      const last = JSON.parse(fs.readFileSync(LAST_RUN_FILE, 'utf8'));
      const finished = Date.parse(last.finished);
      if (Number.isNaN(finished)) return 'last-run record has no readable finish time';
      const ageHours = (Date.now() - finished) / 3600e3;
      if (ageHours > MAX_RUN_AGE_HOURS) {
        return 'last run (' + last.skill + ') finished ' + ageHours.toFixed(1) + 'h ago; the limit is ' + MAX_RUN_AGE_HOURS + 'h';
      }
      if (last.status !== 'ok') return 'last run (' + last.skill + ') ended ' + last.status + ' with exit ' + last.exit_code + '; see ' + last.log;
    },
  },
  {
    name: 'tree',
    what: 'the working tree is clean',
    run() {
      // Scheduled runs execute whatever is in the checkout, so an uncommitted
      // edit is live code that nobody reviewed.
      const out = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trimEnd();
      if (out) {
        const lines = out.split('\n');
        return lines.length + ' uncommitted path(s): ' + lines.slice(0, 5).map((l) => l.slice(3)).join(', ') + (lines.length > 5 ? ', ...' : '');
      }
    },
  },
];

// ---- runner -----------------------------------------------------------------

function parse(argv) {
  const o = { json: false, only: null, skip: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') o.json = true;
    else if (a === '--only') o.only = (argv[++i] || '').split(',').filter(Boolean);
    else if (a === '--skip') o.skip = (argv[++i] || '').split(',').filter(Boolean);
    else { console.error('health-check: unknown argument ' + a); process.exit(2); }
  }
  const known = checks.map((c) => c.name);
  for (const n of [...(o.only || []), ...o.skip]) {
    if (!known.includes(n)) { console.error('health-check: no check named "' + n + '". Known: ' + known.join(', ')); process.exit(2); }
  }
  return o;
}

export async function runChecks(selected) {
  const results = [];
  for (const c of selected) {
    let reason;
    try { reason = await c.run(); } catch (err) { reason = 'check threw: ' + err.message; }
    results.push({ name: c.name, what: c.what, ok: !reason, reason: reason || null });
  }
  return results;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const o = parse(process.argv.slice(2));
  const selected = checks.filter((c) => (!o.only || o.only.includes(c.name)) && !o.skip.includes(c.name));
  if (!selected.length) { console.error('health-check: nothing selected to run.'); process.exit(2); }
  const results = await runChecks(selected);
  const failed = results.filter((r) => !r.ok);
  if (o.json) {
    console.log(JSON.stringify({ ok: failed.length === 0, checked: results.length, results }, null, 2));
  } else {
    for (const r of results) console.log((r.ok ? 'ok    ' : 'FAIL  ') + r.name.padEnd(10) + (r.ok ? r.what : r.reason));
    console.log(failed.length ? failed.length + ' of ' + results.length + ' check(s) failed.' : 'all ' + results.length + ' check(s) healthy.');
  }
  process.exit(failed.length ? 1 : 0);
}
