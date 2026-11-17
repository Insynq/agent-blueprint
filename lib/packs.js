'use strict';

// Packs: optional file sets layered on top of the runtime-neutral core.
//
// Layout in the blueprint repo:
//   packs/<name>/pack.json     metadata, manifest fragment, settings fragment
//   packs/<name>/files/...     a tree rooted at the project root
//   packs/<name>/CLAUDE.section.md   (optional) inserted into CLAUDE.md
//
// Applying a pack to a target directory:
//   1. copies files/ into the target,
//   2. unions the pack's permissions and hooks into .claude/settings.json,
//   3. inserts CLAUDE.section.md into CLAUDE.md between pack markers,
//   4. merges the pack's manifest fragment into .framework-manifest.json,
//   5. appends any gitignore lines,
//   6. records the pack in .framework-packs.json.
//
// This module has no dependencies outside Node core on purpose: it must run
// from a freshly extracted tarball with no `npm install`.

const fs = require('fs');
const path = require('path');

const PACKS_DIR = 'packs';
const RECORD_FILE = '.framework-packs.json';
const MANIFEST_FILE = '.framework-manifest.json';
const SETTINGS_FILE = path.join('.claude', 'settings.json');
const CLAUDE_FILE = 'CLAUDE.md';
const PACKS_START = '<!-- packs:start -->';
const PACKS_END = '<!-- packs:end -->';
const CATEGORIES = ['framework-managed', 'hybrid', 'project-owned'];

class PackError extends Error {
  constructor(msg) { super(msg); this.name = 'PackError'; }
}

function readJson(fp, fallback) {
  if (!fs.existsSync(fp)) {
    if (fallback !== undefined) return fallback;
    throw new PackError('Missing file: ' + fp);
  }
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch (err) {
    throw new PackError('Invalid JSON in ' + fp + ': ' + err.message);
  }
}

function writeJson(fp, value) {
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, JSON.stringify(value, null, 2) + '\n');
}

function listPacks(sourceRoot) {
  const dir = path.join(sourceRoot, PACKS_DIR);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(dir, e.name, 'pack.json')))
    .map((e) => e.name)
    .sort();
}

function loadPack(sourceRoot, name) {
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    throw new PackError('Invalid pack name "' + name + '".');
  }
  const dir = path.join(sourceRoot, PACKS_DIR, name);
  const meta = readJson(path.join(dir, 'pack.json'), null);
  if (!meta) {
    const available = listPacks(sourceRoot);
    throw new PackError(
      'Unknown pack "' + name + '". Available: ' + (available.join(', ') || '(none)') + '.'
    );
  }
  if (meta.name !== name) {
    throw new PackError('packs/' + name + '/pack.json has name "' + meta.name + '"; it must match the folder.');
  }
  if (!meta.description) throw new PackError('packs/' + name + '/pack.json has no description.');
  for (const key of Object.keys(meta.manifest || {})) {
    if (!CATEGORIES.includes(key)) {
      throw new PackError('packs/' + name + '/pack.json manifest has unknown category "' + key + '".');
    }
  }
  return { name, dir, filesDir: path.join(dir, 'files'), meta };
}

// Expand `requires` and return names in dependency order, each once.
function resolveOrder(sourceRoot, names) {
  const out = [];
  const visiting = new Set();
  function visit(n) {
    if (out.includes(n)) return;
    if (visiting.has(n)) throw new PackError('Pack dependency cycle at "' + n + '".');
    visiting.add(n);
    const pack = loadPack(sourceRoot, n);
    for (const dep of pack.meta.requires || []) visit(dep);
    visiting.delete(n);
    out.push(n);
  }
  for (const n of names) visit(n);
  return out;
}

function walkFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  (function walk(d, rel) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      // Skip macOS metadata, including AppleDouble files some tar builds add.
      if (e.name === '.DS_Store' || e.name.startsWith('._')) continue;
      const abs = path.join(d, e.name);
      const r = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) walk(abs, r);
      else out.push(r);
    }
  })(dir, '');
  return out.sort();
}

function union(a, b) {
  const out = Array.isArray(a) ? a.slice() : [];
  for (const item of b || []) {
    const key = JSON.stringify(item);
    if (!out.some((x) => JSON.stringify(x) === key)) out.push(item);
  }
  return out;
}

function mergeSettings(target, fragment) {
  const out = JSON.parse(JSON.stringify(target || {}));
  if (!fragment) return out;
  if (fragment.permissions) {
    out.permissions = out.permissions || {};
    for (const k of Object.keys(fragment.permissions)) {
      out.permissions[k] = union(out.permissions[k], fragment.permissions[k]);
    }
  }
  if (fragment.hooks) {
    out.hooks = out.hooks || {};
    for (const event of Object.keys(fragment.hooks)) {
      const cmds = (g) => JSON.stringify([g.matcher || '', (g.hooks || []).map((h) => h.command || h.type)]);
      const kept = (out.hooks[event] || []).filter(
        (g) => !fragment.hooks[event].some((n) => cmds(n) === cmds(g))
      );
      out.hooks[event] = kept.concat(fragment.hooks[event]);
    }
  }
  if (fragment.env) out.env = Object.assign({}, fragment.env, out.env || {});
  return out;
}

function mergeManifest(manifest, pack) {
  const out = JSON.parse(JSON.stringify(manifest));
  const frag = pack.meta.manifest || {};
  out.categories = out.categories || {};
  for (const cat of Object.keys(frag)) {
    out.categories[cat] = union(out.categories[cat], frag[cat]);
  }
  if (pack.meta.conflict_actions) {
    out.default_action_on_conflict = Object.assign(
      {}, out.default_action_on_conflict || {}, pack.meta.conflict_actions
    );
  }
  return out;
}

// Every file a pack ships must be covered by the pack's own manifest
// fragment, otherwise the installer's allow-list would refuse to write it and
// /update-framework would not know who owns it.
function uncoveredFiles(pack) {
  const frag = pack.meta.manifest || {};
  const entries = [].concat(...CATEGORIES.map((c) => frag[c] || []));
  return walkFiles(pack.filesDir).filter((rel) => !entries.some(
    (e) => (e.endsWith('/') ? rel.startsWith(e) : rel === e)
  ));
}

function insertClaudeSection(content, name, section) {
  const open = '<!-- pack:' + name + ' -->';
  const close = '<!-- /pack:' + name + ' -->';
  const block = open + '\n' + section.trim() + '\n' + close;
  const existing = new RegExp(
    open.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?' +
    close.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  if (existing.test(content)) return content.replace(existing, () => block);
  const endAt = content.indexOf(PACKS_END);
  if (content.includes(PACKS_START) && endAt !== -1) {
    return content.slice(0, endAt) + block + '\n\n' + content.slice(endAt);
  }
  return content.replace(/\s*$/, '\n\n') + block + '\n';
}

// Apply one pack. Returns a report; writes nothing when dryRun is set.
function applyPack({ sourceRoot, targetRoot, name, force = false, dryRun = false }) {
  const pack = loadPack(sourceRoot, name);
  const report = { name, copied: [], kept: [], overwritten: [], notes: [] };

  const uncovered = uncoveredFiles(pack);
  if (uncovered.length) {
    throw new PackError(
      'Pack "' + name + '" ships files its manifest fragment does not cover: ' + uncovered.join(', ')
    );
  }

  for (const rel of walkFiles(pack.filesDir)) {
    const src = path.join(pack.filesDir, rel);
    const dest = path.join(targetRoot, rel);
    if (fs.existsSync(dest)) {
      if (fs.readFileSync(src).equals(fs.readFileSync(dest))) continue;
      if (!force) { report.kept.push(rel); continue; }
      report.overwritten.push(rel);
    } else {
      report.copied.push(rel);
    }
    if (!dryRun) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
      fs.chmodSync(dest, fs.statSync(src).mode);
    }
  }

  if (pack.meta.settings) {
    const fp = path.join(targetRoot, SETTINGS_FILE);
    const current = readJson(fp, {});
    const merged = mergeSettings(current, pack.meta.settings);
    if (JSON.stringify(merged) !== JSON.stringify(current)) {
      if (!dryRun) writeJson(fp, merged);
      report.notes.push('merged settings into ' + SETTINGS_FILE);
    }
  }

  const sectionPath = path.join(pack.dir, 'CLAUDE.section.md');
  if (fs.existsSync(sectionPath)) {
    const fp = path.join(targetRoot, CLAUDE_FILE);
    if (fs.existsSync(fp)) {
      const before = fs.readFileSync(fp, 'utf8');
      const next = insertClaudeSection(before, name, fs.readFileSync(sectionPath, 'utf8'));
      if (next !== before) {
        if (!dryRun) fs.writeFileSync(fp, next);
        report.notes.push('inserted pack section into ' + CLAUDE_FILE);
      }
    } else {
      report.notes.push('no ' + CLAUDE_FILE + ' in target; pack section not inserted');
    }
  }

  const manifestPath = path.join(targetRoot, MANIFEST_FILE);
  if (fs.existsSync(manifestPath)) {
    const merged = mergeManifest(readJson(manifestPath), pack);
    if (!dryRun) writeJson(manifestPath, merged);
  }

  if (Array.isArray(pack.meta.gitignore) && pack.meta.gitignore.length) {
    const fp = path.join(targetRoot, '.gitignore');
    const current = fs.existsSync(fp) ? fs.readFileSync(fp, 'utf8') : '';
    const have = new Set(current.split(/\r?\n/).map((l) => l.trim()));
    const missing = pack.meta.gitignore.filter((l) => !have.has(l.trim()));
    if (missing.length && !dryRun) {
      const head = current.trim() ? current.replace(/\s*$/, '\n\n') : '';
      fs.writeFileSync(fp, head + '# ' + name + ' pack\n' + missing.join('\n') + '\n');
    }
  }

  const recordPath = path.join(targetRoot, RECORD_FILE);
  const record = readJson(recordPath, { packs: [] });
  if (!record.packs.includes(name)) record.packs.push(name);
  if (!dryRun) writeJson(recordPath, record);

  return report;
}

function applyPacks({ sourceRoot, targetRoot, names, force = false, dryRun = false }) {
  return resolveOrder(sourceRoot, names).map(
    (name) => applyPack({ sourceRoot, targetRoot, name, force, dryRun })
  );
}

// Flatten an extracted copy of the blueprint in place: apply the named packs
// onto its own root, then drop packs/. Used by the installer on its staging
// directory and by /update-framework on a downloaded tarball, so both see one
// tree whose paths line up with the project's.
function flatten({ root, names }) {
  const reports = applyPacks({ sourceRoot: root, targetRoot: root, names, force: true });
  if (!names.length) writeJson(path.join(root, RECORD_FILE), { packs: [] });
  fs.rmSync(path.join(root, PACKS_DIR), { recursive: true, force: true });
  return reports;
}

function installedPacks(targetRoot) {
  return readJson(path.join(targetRoot, RECORD_FILE), { packs: [] }).packs || [];
}

module.exports = {
  PACKS_DIR,
  RECORD_FILE,
  PACKS_START,
  PACKS_END,
  PackError,
  listPacks,
  loadPack,
  resolveOrder,
  walkFiles,
  mergeSettings,
  mergeManifest,
  uncoveredFiles,
  insertClaudeSection,
  applyPack,
  applyPacks,
  flatten,
  installedPacks,
};
