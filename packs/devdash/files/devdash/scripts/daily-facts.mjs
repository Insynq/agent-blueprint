#!/usr/bin/env node
// The raw material for a daily log entry, so the summary starts from facts.
//
//   node devdash/scripts/daily-facts.mjs [YYYY-MM-DD] [--json] [--offline]
//
// Prints what happened on that local day (default today): commits, merged pull
// requests, changelog lines, specs locked, smokes closed, and what the owner
// answered and tested. It writes nothing. Unless --offline, it also asks the
// GitHub CLI for pull requests merged that day, and carries on without them if
// gh is missing or offline.

import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, IS_REPO, localDay, addDays } from '../lib/root.mjs';
import * as sources from '../lib/sources.mjs';
import { DAY } from '../lib/validate.mjs';

const args = process.argv.slice(2);
const day = args.find((a) => DAY.test(a)) || localDay();
const bad = args.find((a) => !a.startsWith('--') && !DAY.test(a));
if (bad) { console.error('Not a date: ' + bad + '. Use YYYY-MM-DD.'); process.exit(2); }

const span = Math.max(1, Math.round((Date.parse(localDay() + 'T12:00:00') - Date.parse(day + 'T12:00:00')) / 86400000) + 1);
const all = await sources.facts(span);
const f = all.find((x) => x.day === day) || { day, commits: [], merged: [], smokesPassed: [], smokesFailed: [], specsLocked: [], shipped: [], answered: [], sittings: [] };

if (!args.includes('--offline') && IS_REPO) {
  const prs = await new Promise((resolve) => {
    execFile('gh', ['pr', 'list', '--state', 'merged', '--limit', '100', '--search', 'merged:' + day + '..' + addDays(day, 1), '--json', 'number,title,mergedAt'],
      { cwd: ROOT, timeout: 8000, encoding: 'utf8' }, (err, out) => { try { resolve(err ? null : JSON.parse(out)); } catch { resolve(null); } });
  });
  if (prs) {
    const have = new Set(f.merged.map((m) => m.number));
    for (const p of prs) if (localDay(new Date(p.mergedAt)) === day && !have.has(p.number)) f.merged.push({ number: p.number, subject: p.title });
  }
}

if (args.includes('--json')) { console.log(JSON.stringify(f, null, 2)); process.exit(0); }

const entry = path.join('devdash', 'log', day + '.md');
console.log(sources.factsMarkdown(f));
console.log('---');
console.log(fs.existsSync(path.join(ROOT, entry)) ? entry + ' exists. Update it if the facts above have moved on.' : 'No entry yet. Write ' + entry + ':');
console.log(`
---
date: ${day}
title: <one plain line: what the day was about>
---

<Two to six sentences for the owner, in plain language: what now works that
did not, what was decided, what was tested and how it went, what is blocked and
what comes next. Use only the facts above and what you observed. No file
names, no commit hashes; the dash shows those under the summary.>
`);
