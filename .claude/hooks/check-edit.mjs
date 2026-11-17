#!/usr/bin/env node
// PostToolUse hook for Edit and Write. Runs every check module in
// .claude/hooks/checks/ whose match() accepts the edited file. A check returns
// an array of problem strings; any problem exits 2 so the agent sees it and
// fixes the file. See docs/AUTHORING_SKILLS.md for the module contract.
//
// Can also be run by hand:  node .claude/hooks/check-edit.mjs <file> [<file>...]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = process.env.CLAUDE_PROJECT_DIR || path.resolve(here, '..', '..');

async function loadChecks() {
  const dir = path.join(here, 'checks');
  if (!fs.existsSync(dir)) return [];
  const mods = [];
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.mjs')).sort()) {
    try {
      mods.push(await import(pathToFileURL(path.join(dir, f)).href));
    } catch (err) {
      process.stderr.write('check-edit: could not load ' + f + ': ' + err.message + '\n');
    }
  }
  return mods;
}

async function run(files) {
  const checks = await loadChecks();
  const problems = [];
  for (const file of files) {
    const abs = path.resolve(root, file);
    const rel = path.relative(root, abs).split(path.sep).join('/');
    if (rel.startsWith('..') || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) continue;
    let content = null;
    for (const c of checks) {
      let hit = false;
      try { hit = c.match(rel); } catch { hit = false; }
      if (!hit) continue;
      if (content === null) content = fs.readFileSync(abs, 'utf8');
      let found = [];
      try { found = c.check(rel, content, { root }) || []; } catch (err) {
        process.stderr.write('check-edit: ' + (c.name || 'check') + ' threw on ' + rel + ': ' + err.message + '\n');
      }
      for (const p of found) problems.push(rel + ' [' + (c.name || 'check') + ']: ' + p);
    }
  }
  if (problems.length) {
    process.stderr.write(problems.join('\n') + '\n');
    process.exit(2);
  }
  process.exit(0);
}

if (process.argv.length > 2) {
  run(process.argv.slice(2));
} else {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (c) => { raw += c; });
  process.stdin.on('end', () => {
    let file = '';
    try { file = String(JSON.parse(raw)?.tool_input?.file_path ?? ''); } catch { process.exit(0); }
    if (!file) process.exit(0);
    run([file]);
  });
}
