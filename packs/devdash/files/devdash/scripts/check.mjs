#!/usr/bin/env node
// Is the dash current and are its definitions sound?
//
//   node devdash/scripts/check.mjs            report; exit 1 if a definition is broken
//   node devdash/scripts/check.mjs --strict   also exit 1 if anything is owed
//
// Run it before telling the owner work is ready for them, and from /ship.
// Offline: git and files only.

import { owed, describeResults } from '../lib/owed.mjs';
import * as sources from '../lib/sources.mjs';
import { validateLogEntry } from '../lib/validate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, CHECKOUT } from '../lib/root.mjs';

const strict = process.argv.includes('--strict');
const [o, defs, b] = await Promise.all([owed(), sources.definitions(), sources.base()]);
const problems = [];
const owing = [];

for (const d of o.broken) for (const p of d.problems) problems.push(d.file + ': ' + p);
for (const root of new Set([ROOT, CHECKOUT])) {
  let names = [];
  try { names = fs.readdirSync(path.join(root, 'devdash', 'log')); } catch { /* none */ }
  for (const n of names.filter((x) => x.endsWith('.md') && x !== 'README.md')) {
    for (const p of validateLogEntry(n.slice(0, -3), fs.readFileSync(path.join(root, 'devdash', 'log', n), 'utf8'))) problems.push('devdash/log/' + n + ': ' + p);
  }
}

if (o.results.length) owing.push('Owner results not yet recorded: ' + describeResults(o.results).join('; ') + '. Run node devdash/scripts/results.mjs.');
if (o.uncovered.length) owing.push('Smoke rows only a person can close with no open sitting: ' + o.uncovered.join(', ') + '.');
if (o.logMissing.length) owing.push('Days with commits and no daily log entry: ' + o.logMissing.join(', ') + '.');
if (o.today.commits && !o.today.logged) owing.push('Today (' + o.today.day + ') has ' + o.today.commits + ' commit(s) and no daily log entry yet.');

const active = (list) => list.filter((d) => d.def && (d.def.status || 'active') === 'active').length;
console.log('Dash check. Reading ' + b.label + '. Inspected ' + defs.runs.length + ' question run(s) (' + active(defs.runs) + ' active), ' + defs.sittings.length + ' sitting(s) (' + active(defs.sittings) + ' active), ' + defs.log.length + ' daily log entr' + (defs.log.length === 1 ? 'y' : 'ies') + ', the smoke ledger and the journal.');
if (problems.length) console.log('\nBroken (fix these; the owner cannot see a broken definition):\n' + problems.map((p) => '  - ' + p).join('\n'));
if (owing.length) console.log('\nOwed:\n' + owing.map((p) => '  - ' + p).join('\n'));
if (!problems.length && !owing.length) console.log('Nothing is broken and nothing is owed.');
process.exit(problems.length || (strict && owing.length) ? 1 : 0);
