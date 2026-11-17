#!/usr/bin/env node
// example-list-overdue.mjs: the read half of the example runbook.
//
// Lists open items whose due date has passed. It is here to show the shape of
// a reader: it cannot write, it does the counting so the model does not have
// to, and it says exactly what it looked at so an empty answer can be checked.
// Replace it with readers for the project's real systems of record.
//
//   node agent/scripts/example-list-overdue.mjs [--store <dir>] [--as-of YYYY-MM-DD]
//
// Exit codes: 0 listed (including "none overdue"), 2 bad usage,
//             3 the store is missing or unreadable (not the same as "none").

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const dir = path.resolve(root, opt('--store') || process.env.GUARDED_WRITE_STORE || 'agent/data');
const file = path.join(dir, 'items.json');
const asOf = opt('--as-of') || new Date().toISOString().slice(0, 10);

if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
  console.error('example-list-overdue: --as-of must be YYYY-MM-DD (got "' + asOf + '").');
  process.exit(2);
}

let items;
try {
  items = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(items)) throw new Error('not a JSON array');
} catch (err) {
  console.error('example-list-overdue: cannot read ' + file + ': ' + err.message);
  console.error('To try the example: mkdir -p agent/data && cp agent/runbooks/example-daily-check/sample-items.json agent/data/items.json');
  process.exit(3);
}

const open = items.filter((i) => i.status === 'open');
const overdue = open.filter((i) => typeof i.due === 'string' && i.due < asOf);

console.log(JSON.stringify({
  source: file,
  as_of: asOf,
  total_items: items.length,
  open_items: open.length,
  overdue_count: overdue.length,
  already_flagged: overdue.filter((i) => i.validation_status === 'needs_validation').length,
  overdue,
}, null, 2));
