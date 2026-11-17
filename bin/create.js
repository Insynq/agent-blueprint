#!/usr/bin/env node

'use strict';

// Start a new project from a local clone of the blueprint.
//
//   node bin/create.js <target-dir> [--packs a,b] [--no-git]
//
// Copies the core (everything the manifest classifies as framework-managed,
// hybrid or project-owned), applies the named packs, stamps
// .framework-version, and runs `git init`. Framework-development files
// (bin/, lib/, packs/, framework-dev/) are left behind, so the new project
// contains only what it will use.
//
// For an existing repository, use `npx @insynq/agent-blueprint init` instead.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const packs = require('../lib/packs');
const paths = require('../lib/paths');

const BLUEPRINT_ROOT = path.resolve(__dirname, '..');
// Shipped to a brand-new project even though an adopter of an existing repo
// keeps their own.
// (see lib/paths.js categoryOf for the same rule used by the installer)
const NEW_PROJECT_EXTRAS = ['.gitignore', '.vscode/extensions.json'];

function fail(msg) {
  console.error('Error: ' + msg);
  process.exit(1);
}

function categoryOf(manifest, rel) {
  let best = null;
  let bestLen = -1;
  for (const cat of Object.keys(manifest.categories)) {
    for (const entry of manifest.categories[cat]) {
      const hit = entry.endsWith('/') ? rel.startsWith(entry) : rel === entry;
      const len = entry.endsWith('/') ? entry.length : entry.length + 1;
      if (hit && len > bestLen) { best = cat; bestLen = len; }
    }
  }
  return best;
}

function main() {
  const argv = process.argv.slice(2);
  let target = null;
  let names = [];
  let git = true;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--packs') names = (argv[++i] || '').split(',').filter(Boolean);
    else if (a === '--no-git') git = false;
    else if (a === '-h' || a === '--help') {
      console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(4, 16).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
      return;
    } else if (a.startsWith('--')) fail('Unknown flag ' + a);
    else if (!target) target = path.resolve(a);
    else fail('Unexpected argument ' + a);
  }
  if (!target) fail('Give a target directory: node bin/create.js <target-dir> [--packs a,b]');
  if (target === BLUEPRINT_ROOT || target.startsWith(BLUEPRINT_ROOT + path.sep)) {
    fail('Target must be outside the blueprint repo.');
  }
  if (fs.existsSync(target) && fs.readdirSync(target).filter((n) => n !== '.git' && n !== '.DS_Store').length) {
    fail('Target is not empty: ' + target + '\n  For an existing repository use `npx @insynq/agent-blueprint init`.');
  }

  const manifest = JSON.parse(fs.readFileSync(path.join(BLUEPRINT_ROOT, '.framework-manifest.json'), 'utf8'));
  const order = packs.resolveOrder(BLUEPRINT_ROOT, names); // validates names before anything is written

  let files;
  try {
    files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: BLUEPRINT_ROOT, encoding: 'utf8' })
      .split('\n').filter(Boolean).filter((f) => fs.existsSync(path.join(BLUEPRINT_ROOT, f)));
  } catch {
    files = packs.walkFiles(BLUEPRINT_ROOT).filter((f) => !f.startsWith('.git/') && !f.startsWith('node_modules/'));
  }

  fs.mkdirSync(target, { recursive: true });
  let copied = 0;
  for (const rel of files) {
    if (rel.startsWith('packs/')) continue;
    const cat = categoryOf(manifest, rel);
    const ship = ['framework-managed', 'hybrid', 'project-owned'].includes(cat) || NEW_PROJECT_EXTRAS.includes(rel);
    if (!ship) continue;
    paths.normalizeRel(target, path.join(target, rel)); // throws on traversal
    const dest = path.join(target, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(BLUEPRINT_ROOT, rel), dest);
    fs.chmodSync(dest, fs.statSync(path.join(BLUEPRINT_ROOT, rel)).mode);
    copied += 1;
  }
  console.log('Copied ' + copied + ' core file(s) to ' + target);

  for (const r of packs.applyPacks({ sourceRoot: BLUEPRINT_ROOT, targetRoot: target, names: order })) {
    console.log('Applied pack ' + r.name + ': ' + r.copied.length + ' file(s)' + (r.kept.length ? ', ' + r.kept.length + ' kept' : ''));
  }
  if (!order.length) {
    fs.writeFileSync(path.join(target, packs.RECORD_FILE), JSON.stringify({ packs: [] }, null, 2) + '\n');
  }

  const name = path.basename(target);
  if (!fs.existsSync(path.join(target, 'README.md'))) {
    fs.writeFileSync(path.join(target, 'README.md'), '# ' + name + '\n\nRun `/preflight`, then `/kickoff`, in Claude Code to set this project up.\n');
  }

  let commit = null;
  try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: BLUEPRINT_ROOT, encoding: 'utf8' }).trim(); } catch { /* ignore */ }
  fs.writeFileSync(path.join(target, '.framework-version'), JSON.stringify({
    version: manifest.version,
    installed_at: new Date().toISOString(),
    tarball_sha256: null,
    installed_method: 'local-create',
    canonical_url: manifest.canonical_url,
    installed_from: commit ? 'local clone at ' + commit : 'local clone',
    blueprint_path: BLUEPRINT_ROOT,
    blueprint_commit: commit,
    packs: order,
  }, null, 2) + '\n');

  if (git && !fs.existsSync(path.join(target, '.git'))) {
    try {
      execFileSync('git', ['init', '-q'], { cwd: target, stdio: 'ignore' });
      console.log('Initialised a git repository.');
    } catch (err) {
      console.log('git init failed (' + err.message + '); initialise it yourself.');
    }
  }

  console.log('\nNext:\n  cd ' + target + '\n  open Claude Code and run /preflight, then /kickoff');
  if (!order.length) {
    console.log('\nNo packs were applied. Available: ' + packs.listPacks(BLUEPRINT_ROOT).join(', ') +
      '\n  Add one later with: node ' + path.join(BLUEPRINT_ROOT, 'bin', 'pack.js') + ' add <name> --target ' + target);
  }
}

try {
  main();
} catch (err) {
  fail((err && err.name === 'PackError') ? err.message : (err && err.stack) || String(err));
}
