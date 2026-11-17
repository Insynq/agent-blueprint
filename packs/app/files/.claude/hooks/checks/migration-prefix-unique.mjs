// Blocks a migration file whose version prefix is already used by another
// file in the same migrations directory. Migration tools key applied
// migrations on the prefix, so of two files that share one, the second can be
// recorded as applied and silently skipped.
//
// This sees one working tree. Two branches built in parallel can still each
// mint the same prefix; that is caught where they merge (the CI job), not here.
//
// Matches numbered .sql files in any directory named `migrations`
// (supabase/migrations/20260101120000_add_orders.sql, db/migrations/0007_x.sql).
// For a tool with another layout, change MIGRATION.

import fs from 'node:fs';
import path from 'node:path';

export const name = 'migration-prefix-unique';

const MIGRATION = /(?:^|\/)migrations\/(\d{4,})_[^/]*\.sql$/;

export function match(rel) {
  return MIGRATION.test(rel);
}

export function check(rel, _content, ctx) {
  const root = (ctx && ctx.root) || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const prefix = MIGRATION.exec(rel)[1];
  const dir = path.dirname(path.join(root, rel));
  const self = path.basename(rel);
  let names = [];
  try { names = fs.readdirSync(dir); } catch { return []; }
  const twins = names
    .filter((n) => n !== self && n.endsWith('.sql') && n.split('_')[0] === prefix)
    .sort();
  if (twins.length === 0) return [];
  return [
    'version prefix ' + prefix + ' is already used by ' + twins.join(', ') + '. ' +
    'Applied migrations are tracked by this prefix, so one of the two can be skipped as already applied. ' +
    'Rename this file to a prefix no other file uses and that sorts after the newest existing migration ' +
    '(if this one is already applied anywhere, rename the other instead).',
  ];
}
