#!/usr/bin/env node

'use strict';

// Pack management for a local clone of the blueprint.
//
//   node bin/pack.js list
//   node bin/pack.js add <name...> [--target <dir>] [--force] [--dry-run]
//   node bin/pack.js flatten <name...> [--root <dir>]
//   node bin/pack.js check
//   node bin/pack.js seed-update --target <dir>
//
// `add` applies packs from this clone to a project (default: the current
// directory). `flatten` applies packs onto a copy of the blueprint itself and
// removes its packs/ directory; the installer and /update-framework use it.
// `check` validates every pack and the core manifest, for framework authors.
// `seed-update` copies the /update-framework skill into a 0.x project.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const packs = require('../lib/packs');

const BLUEPRINT_ROOT = path.resolve(__dirname, '..');

function parse(argv) {
  const opts = { names: [], target: process.cwd(), root: null, force: false, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--target') opts.target = path.resolve(argv[++i] || '');
    else if (a === '--root') opts.root = path.resolve(argv[++i] || '');
    else if (a === '--force') opts.force = true;
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a.startsWith('--')) throw new packs.PackError('Unknown flag ' + a);
    else opts.names.push(...a.split(',').filter(Boolean));
  }
  return opts;
}

function printReports(reports, dryRun) {
  for (const r of reports) {
    console.log((dryRun ? '[dry run] ' : '') + 'pack ' + r.name + ':');
    console.log('  ' + r.copied.length + ' file(s) added');
    if (r.overwritten.length) console.log('  ' + r.overwritten.length + ' overwritten: ' + r.overwritten.join(', '));
    if (r.kept.length) {
      console.log('  ' + r.kept.length + ' existing file(s) differ and were kept (use --force to replace):');
      for (const k of r.kept) console.log('    ' + k);
    }
    for (const n of r.notes) console.log('  ' + n);
  }
}

// Framework self-check: every pack is well formed, and every tracked file in
// the blueprint is either classified by the core manifest or lives in a
// directory that never ships.
function check() {
  const problems = [];
  const manifest = JSON.parse(fs.readFileSync(path.join(BLUEPRINT_ROOT, '.framework-manifest.json'), 'utf8'));
  const names = packs.listPacks(BLUEPRINT_ROOT);
  for (const n of names) {
    try {
      const pack = packs.loadPack(BLUEPRINT_ROOT, n);
      for (const dep of pack.meta.requires || []) packs.loadPack(BLUEPRINT_ROOT, dep);
      for (const f of packs.uncoveredFiles(pack)) problems.push('pack ' + n + ': ' + f + ' is not covered by the pack manifest');
      const core = [].concat(...Object.values(manifest.categories));
      for (const f of packs.walkFiles(pack.filesDir)) {
        if (fs.existsSync(path.join(BLUEPRINT_ROOT, f))) problems.push('pack ' + n + ': ' + f + ' also exists in core');
        const claimed = core.find((e) => (e.endsWith('/') ? f.startsWith(e) : f === e) && !['bin/', 'lib/', 'packs/'].includes(e));
        const shared = ['.claude/', '.github/', '_dev/', 'docs/'].some((d) => claimed && claimed.startsWith(d) && claimed.endsWith('/'));
        if (claimed && !shared) problems.push('pack ' + n + ': ' + f + ' is claimed by the core manifest entry ' + claimed);
      }
    } catch (err) {
      problems.push(err.message);
    }
  }
  const declared = manifest.packs || [];
  for (const n of names) if (!declared.includes(n)) problems.push('manifest.packs is missing "' + n + '"');
  for (const n of declared) if (!names.includes(n)) problems.push('manifest.packs lists "' + n + '" but packs/' + n + ' does not exist');

  let tracked = [];
  try {
    tracked = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: BLUEPRINT_ROOT, encoding: 'utf8' })
      .split('\n').filter(Boolean).filter((f) => fs.existsSync(path.join(BLUEPRINT_ROOT, f)));
  } catch { /* not a git checkout; skip */ }
  const entries = [].concat(...Object.values(manifest.categories));
  for (const f of tracked) {
    if (f.startsWith('packs/')) continue;
    if (!entries.some((e) => (e.endsWith('/') ? f.startsWith(e) : f === e))) {
      problems.push('core: ' + f + ' is not classified in .framework-manifest.json');
    }
  }
  if (problems.length) {
    console.error(problems.join('\n'));
    console.error('\n' + problems.length + ' problem(s).');
    return 1;
  }
  console.log('OK: ' + names.length + ' pack(s), ' + tracked.length + ' tracked file(s) classified.');
  return 0;
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === '-h' || cmd === '--help') {
    console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(4, 18).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
    return 0;
  }
  if (cmd === 'list') {
    const names = packs.listPacks(BLUEPRINT_ROOT);
    if (!names.length) { console.log('No packs found in ' + BLUEPRINT_ROOT); return 0; }
    for (const n of names) {
      const p = packs.loadPack(BLUEPRINT_ROOT, n);
      const req = (p.meta.requires || []).length ? '  (requires: ' + p.meta.requires.join(', ') + ')' : '';
      console.log(n.padEnd(14) + p.meta.description + req);
    }
    return 0;
  }
  if (cmd === 'check') return check();

  const opts = parse(rest);
  if (cmd === 'seed-update') {
    // Give a 0.x project the v1 /update-framework skill so it can migrate itself.
    if (!fs.existsSync(opts.target)) throw new packs.PackError('Target does not exist: ' + opts.target);
    const rel = path.join('.claude', 'skills', 'update-framework');
    fs.cpSync(path.join(BLUEPRINT_ROOT, rel), path.join(opts.target, rel), { recursive: true });
    console.log('Copied ' + rel + ' into ' + opts.target + '.\nOpen Claude Code there and run /update-framework from ' + BLUEPRINT_ROOT);
    return 0;
  }
  if (!opts.names.length && cmd !== 'flatten') throw new packs.PackError('Name at least one pack. Run `node bin/pack.js list` to see them.');

  if (cmd === 'add') {
    if (path.resolve(opts.target) === BLUEPRINT_ROOT) {
      throw new packs.PackError(
        'Refusing to apply a pack onto the blueprint repo itself. Run this from your project, ' +
        'or pass --target <project dir>. To start a new project use `node bin/create.js <dir>`.'
      );
    }
    if (!fs.existsSync(opts.target)) throw new packs.PackError('Target does not exist: ' + opts.target);
    const reports = packs.applyPacks({
      sourceRoot: BLUEPRINT_ROOT, targetRoot: opts.target, names: opts.names,
      force: opts.force, dryRun: opts.dryRun,
    });
    printReports(reports, opts.dryRun);
    return 0;
  }
  if (cmd === 'flatten') {
    const root = opts.root || process.cwd();
    if (path.resolve(root) === BLUEPRINT_ROOT && fs.existsSync(path.join(root, '.git'))) {
      throw new packs.PackError('Refusing to flatten a git checkout of the blueprint. Flatten an extracted copy.');
    }
    printReports(packs.flatten({ root, names: opts.names }), false);
    return 0;
  }
  throw new packs.PackError('Unknown command "' + cmd + '". Use list, add, flatten or check.');
}

try {
  process.exit(main());
} catch (err) {
  console.error((err && err.name === 'PackError') ? 'Error: ' + err.message : (err && err.stack) || String(err));
  process.exit(1);
}
