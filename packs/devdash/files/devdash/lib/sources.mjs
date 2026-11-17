// Everything the dash shows that it does not own: read from the repository at
// request time, behind a short cache. Nothing here writes.
//
// Project docs (the smoke ledger, specs, parking lot, changelog, current
// state) are read from the remote default branch when there is one, because a
// checkout lags and may be on any branch. Definitions the owner acts on
// (question runs, sittings, daily log entries) are also collected from every
// worktree, so a sitting written on a feature branch can be run before merge.

import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, IS_REPO, DATA, git, config, localDay, addDays } from './root.mjs';
import { validateRun, validateSitting, parseLogEntry, sittingSmokes, ID, DAY } from './validate.mjs';

const cache = new Map();
export function clearCache() { cache.clear(); }
async function cached(key, ttlMs, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value;
  const value = fn();
  cache.set(key, { at: Date.now(), value });
  try { return await value; } catch (err) { cache.delete(key); throw err; }
}

const DEFS_TTL = 10 * 1000;
const DOCS_TTL = 20 * 1000;
const GH_TTL = 120 * 1000;

// ---- which version of the project to read ---------------------------------

export function base() {
  return cached('base', 30000, async () => {
    const cfg = config();
    if (!IS_REPO) return { mode: 'files', ref: null, label: 'project files (not a git repository)' };
    if (cfg.readRef === 'worktree') return { mode: 'files', ref: null, label: 'the main checkout' };
    const ok = async (r) => (await git(['rev-parse', '--verify', '--quiet', r + '^{commit}'])) !== null;
    let ref = null;
    if (cfg.readRef && cfg.readRef !== 'auto') {
      if (await ok(cfg.readRef)) ref = cfg.readRef;
    } else {
      const head = await git(['symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD']);
      for (const c of [head && head.trim(), 'origin/main', 'origin/master'].filter(Boolean)) {
        if (await ok(c)) { ref = c; break; }
      }
    }
    if (ref) return { mode: 'ref', ref, label: ref };
    return { mode: 'files', ref: null, label: 'the main checkout (no remote default branch)' };
  });
}

// The branch other checkouts are compared with.
async function compareRef() {
  const b = await base();
  if (b.ref) return b.ref;
  if (!IS_REPO) return null;
  for (const c of ['main', 'master']) {
    if ((await git(['rev-parse', '--verify', '--quiet', c + '^{commit}'])) !== null) return c;
  }
  return 'HEAD';
}

export async function readDoc(rel) {
  const b = await base();
  if (b.mode === 'ref') return (await git(['show', b.ref + ':' + rel])) || '';
  try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch { return ''; }
}

function section(md, heading) {
  const out = [];
  let on = false;
  const want = heading.toLowerCase();
  for (const line of md.split(/\r?\n/)) {
    const h = /^## +(.+?)\s*$/.exec(line);
    if (h) { on = h[1].toLowerCase() === want; continue; }
    if (on) out.push(line);
  }
  return out.join('\n').trim();
}

// ---- current state ---------------------------------------------------------

export function state() {
  return cached('state', DOCS_TTL, async () => {
    const [kb, claude] = await Promise.all([readDoc('docs/KB_8_Current_State.md'), readDoc('CLAUDE.md')]);
    // A template placeholder is not a state. Drop it and anything that is only boilerplate around it.
    const pick = (t) => (/\[TODO\b/.test(t) ? '' : t);
    return {
      phase: pick(section(kb, 'Active phase')),
      summary: pick(section(claude, 'Current phase')),
      notes: pick(section(kb, 'Session notes')),
    };
  });
}

// ---- smoke ledger ----------------------------------------------------------

const ROW_HEAD = /^### +`?([A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)+)`?\s*(?::|—|–| - )\s*(.+?)\s*$/;

export function parseLedger(md) {
  const rows = [];
  let sec = '';
  let cur = null;
  let fence = false;
  for (const line of md.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) { fence = !fence; continue; }
    if (fence) continue;
    const h2 = /^## +(.+?)\s*$/.exec(line);
    if (h2) { sec = h2[1]; cur = null; continue; }
    const h3 = ROW_HEAD.exec(line);
    if (h3) {
      cur = { id: h3[1], title: h3[2], section: sec, lane: '', liveRequired: false, status: 'Pending', deferral: null, trace: '', body: [] };
      rows.push(cur);
      continue;
    }
    if (!cur) continue;
    const cell = /^\|\s*(Lane|Status)\s*\|\s*(.*?)\s*\|\s*$/i.exec(line) || /^[-*]\s*\*\*(Lane|Status):?\*\*:?\s*(.+?)\s*$/i.exec(line);
    if (cell && cell[1].toLowerCase() === 'lane') cur.lane = cell[2];
    else if (cell) cur.status = cell[2];
    else if (!/^\|\s*(\||-)/.test(line)) cur.body.push(line);
    if (/live-required/i.test(line)) cur.liveRequired = true;
    const d = /Deferred:\s*(\d{4}-\d{2}-\d{2})\s*\|\s*Owner:\s*([^|]*?)\s*\|\s*Due:\s*(\d{4}-\d{2}-\d{2})(?:\s*\|\s*Grant:\s*([^|]*))?/i.exec(line);
    if (d) cur.deferral = { deferred: d[1], owner: d[2], due: d[3], grant: (d[4] || '').trim() };
    const t = /Trace-verified\s+(\d{4}-\d{2}-\d{2})/i.exec(line);
    if (t) cur.trace = t[1];
  }
  const today = localDay();
  for (const r of rows) {
    const s = r.status.toLowerCase();
    r.laneName = (/[a-z]+/.exec(r.lane.toLowerCase()) || ['unlabelled'])[0];
    r.bucket = s.startsWith('passed') ? 'passed'
      : s.startsWith('failed') ? 'failed'
        : (r.deferral || s.startsWith('unverified at ship') || s.startsWith('deferred')) ? 'deferred' : 'open';
    r.date = (/\d{4}-\d{2}-\d{2}/.exec(r.status) || [''])[0];
    r.overdue = r.bucket === 'deferred' && !!r.deferral && r.deferral.due < today;
    // Only a person can close a visual row. Other lanes are the agent's to close.
    r.needsPerson = r.laneName === 'visual';
    r.body = r.body.join('\n').trim();
  }
  return rows;
}

export function ledger() {
  return cached('ledger', DOCS_TTL, async () => parseLedger(await readDoc('docs/smoke-tests-pending.md')));
}

// ---- specs, parking lot, changelog ----------------------------------------

async function listUnder(prefix) {
  const b = await base();
  if (b.mode === 'ref') {
    const out = await git(['ls-tree', '-r', '--name-only', b.ref, '--', prefix]);
    return out ? out.split('\n').filter(Boolean) : [];
  }
  const found = [];
  (function walk(rel) {
    let entries = [];
    try { entries = fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name.startsWith('.')) continue;
      if (e.isDirectory()) walk(rel + '/' + e.name); else found.push(rel + '/' + e.name);
    }
  })(prefix.replace(/\/$/, ''));
  return found.sort();
}

export function plans() {
  return cached('plans', DOCS_TTL, async () => {
    const files = await listUnder('docs/plans');
    const bySlug = new Map();
    for (const f of files) {
      const m = /^docs\/plans\/([^/]+)\/(.+)$/.exec(f);
      if (m) { if (!bySlug.has(m[1])) bySlug.set(m[1], []); bySlug.get(m[1]).push(m[2]); }
    }
    const out = [];
    for (const [slug, names] of bySlug) {
      const spec = names.includes('spec.md') ? await readDoc('docs/plans/' + slug + '/spec.md') : '';
      const locked = /^>\s*\*\*Status:\s*LOCKED\s+(\d{4}-\d{2}-\d{2})\*\*/m.exec(spec);
      const other = /^>?\s*\*{0,2}Status:\*{0,2}\s*(.+?)\*{0,2}\s*$/mi.exec(spec);
      out.push({
        slug,
        title: (/^# +(.+)$/m.exec(spec) || [null, slug])[1],
        hasSpec: names.includes('spec.md'),
        status: locked ? 'locked' : names.includes('spec.md') ? 'draft' : 'no spec',
        lockedOn: locked ? locked[1] : '',
        statusLine: locked ? '' : other ? other[1].replace(/\*+/g, '').trim() : '',
        rounds: names.filter((n) => /^judge-round-\d+-findings\.md$/.test(n)).length,
        gates: names.filter((n) => /^gate-.+\.md$/.test(n)).length,
        hasBrainstorm: names.includes('brainstorm.md'),
      });
    }
    return out.sort((a, b) => (b.lockedOn || '').localeCompare(a.lockedOn || '') || a.slug.localeCompare(b.slug));
  });
}

export function parking() {
  return cached('parking', DOCS_TTL, async () => {
    const md = await readDoc('docs/PARKING_LOT.md');
    const out = { open: [], adopted: [], resolved: [] };
    let bucket = null;
    let cur = null;
    for (const line of md.split(/\r?\n/)) {
      const h = /^## +(.+?)\s*$/.exec(line);
      if (h) {
        const t = h[1].toLowerCase();
        bucket = t.startsWith('open') ? 'open' : t.startsWith('adopted') ? 'adopted' : /resolved|dropped/.test(t) ? 'resolved' : null;
        cur = null;
        continue;
      }
      if (!bucket) continue;
      const item = /^[-*] +(?:(\d{4}-\d{2}-\d{2})\s*[:—-]\s*)?(.+)$/.exec(line) || /^### +(?:(\d{4}-\d{2}-\d{2})\s*[:—-]\s*)?(.+)$/.exec(line);
      if (item) { cur = { date: item[1] || '', text: item[2] }; out[bucket].push(cur); } else if (cur && line.trim()) cur.text += '\n' + line.trim();
    }
    return out;
  });
}

export function changelog() {
  return cached('changelog', DOCS_TTL, async () => {
    const md = await readDoc('docs/CHANGELOG.md');
    const out = [];
    for (const line of md.split(/\r?\n/)) {
      const m = /^[-*] +(\d{4}-\d{2}-\d{2})\s*[:—-]\s*(.+)$/.exec(line);
      if (m && !/</.test(m[1])) out.push({ date: m[1], text: m[2] });
    }
    return out;
  });
}

// ---- git: commits, checkouts, branches, pull requests ---------------------

export function commits(n = 15) {
  return cached('commits' + n, DOCS_TTL, async () => {
    const ref = await compareRef();
    if (!ref) return [];
    const out = await git(['log', '--first-parent', '-' + n, '--date=format-local:%Y-%m-%d', '--format=%h%x09%cd%x09%s', ref]);
    return (out || '').split('\n').filter(Boolean).map((l) => {
      const [hash, date, ...rest] = l.split('\t');
      return { hash, date, subject: rest.join('\t') };
    });
  });
}

export function checkouts() {
  return cached('checkouts', DEFS_TTL, async () => {
    if (!IS_REPO) return [{ path: ROOT, branch: '', main: true }];
    const out = (await git(['worktree', 'list', '--porcelain'])) || '';
    const list = [];
    for (const block of out.trim().split(/\n\n+/)) {
      const d = {};
      for (const line of block.split('\n')) { const i = line.indexOf(' '); d[i < 0 ? line : line.slice(0, i)] = i < 0 ? '' : line.slice(i + 1); }
      if (!d.worktree || !fs.existsSync(d.worktree)) continue;
      let real = d.worktree;
      try { real = fs.realpathSync(d.worktree); } catch { /* keep */ }
      list.push({ path: real, branch: (d.branch || '').replace('refs/heads/', '') || '(detached)', main: real === ROOT });
    }
    if (!list.some((c) => c.main)) list.unshift({ path: ROOT, branch: '', main: true });
    return list.sort((a, b) => Number(b.main) - Number(a.main));
  });
}

export function worktrees() {
  return cached('worktrees', DOCS_TTL, async () => {
    if (!IS_REPO) return [];
    const ref = await compareRef();
    const home = process.env.HOME || '';
    return Promise.all((await checkouts()).map(async (c) => {
      const [status, counts, last] = await Promise.all([
        git(['status', '--porcelain'], c.path),
        git(['rev-list', '--left-right', '--count', ref + '...HEAD'], c.path),
        git(['log', '-1', '--date=format-local:%Y-%m-%d', '--format=%h%x09%cd%x09%s'], c.path),
      ]);
      const [behind, ahead] = (counts || '0\t0').trim().split(/\s+/).map(Number);
      const l = ((last || '').trim().split('\t').concat(['', '', ''])).slice(0, 3);
      return {
        path: home && c.path.startsWith(home) ? '~' + c.path.slice(home.length) : c.path,
        branch: c.branch, main: c.main,
        dirty: (status || '').split('\n').filter(Boolean).length,
        ahead: ahead || 0, behind: behind || 0,
        last: { hash: l[0], date: l[1], subject: l[2] },
      };
    }));
  });
}

export function branches() {
  return cached('branches', DOCS_TTL, async () => {
    if (!IS_REPO) return [];
    const ref = await compareRef();
    const out = (await git(['for-each-ref', '--format=%(refname:short)%09%(committerdate:short)%09%(subject)', 'refs/heads'])) || '';
    const inTrees = new Set((await checkouts()).map((c) => c.branch));
    const list = [];
    for (const line of out.split('\n').filter(Boolean)) {
      const [name, date, ...rest] = line.split('\t');
      if (inTrees.has(name)) continue;
      const counts = await git(['rev-list', '--left-right', '--count', ref + '...' + name]);
      const [behind, ahead] = (counts || '0\t0').trim().split(/\s+/).map(Number);
      list.push({ name, date, subject: rest.join('\t'), ahead: ahead || 0, behind: behind || 0 });
    }
    return list.sort((a, b) => b.date.localeCompare(a.date));
  });
}

function gh(args, timeout = 8000) {
  return new Promise((resolve) => {
    execFile('gh', args, { cwd: ROOT, timeout, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }, (err, out) => {
      if (err) resolve({ ok: false, missing: err.code === 'ENOENT' });
      else resolve({ ok: true, out });
    });
  });
}

// Open pull requests through the GitHub CLI. Quietly absent when gh is not
// installed, not signed in, offline, or the project has no remote.
export function pulls() {
  return cached('pulls', GH_TTL, async () => {
    if (!IS_REPO || !(await git(['remote']))?.trim()) return { available: false, why: 'no remote', list: [] };
    const r = await gh(['pr', 'list', '--state', 'open', '--limit', '50', '--json', 'number,title,headRefName,baseRefName,isDraft,updatedAt,url,reviewDecision']);
    if (!r.ok) return { available: false, why: r.missing ? 'the GitHub CLI (gh) is not installed' : 'gh could not list pull requests', list: [] };
    try { return { available: true, why: '', list: JSON.parse(r.out) }; } catch { return { available: false, why: 'gh returned something unreadable', list: [] }; }
  });
}

// ---- definitions: question runs, sittings, daily log entries --------------

const KINDS = {
  runs: { dir: 'devdash/questions', match: /^devdash\/questions\/([^/]+)\.json$/ },
  sittings: { dir: 'devdash/sittings', match: /^devdash\/sittings\/([^/]+)\/sitting\.json$/ },
  log: { dir: 'devdash/log', match: /^devdash\/log\/(\d{4}-\d{2}-\d{2})\.md$/ },
};

function localDefs(checkout) {
  const found = [];
  const add = (kind, id, file) => {
    try { found.push({ kind, id, file, mtime: fs.statSync(file).mtimeMs, text: () => fs.readFileSync(file, 'utf8'), dir: path.dirname(file), from: checkout.main ? 'main checkout' : 'worktree ' + checkout.branch }); } catch { /* gone */ }
  };
  const ls = (rel) => { try { return fs.readdirSync(path.join(checkout.path, rel), { withFileTypes: true }); } catch { return []; } };
  for (const e of ls(KINDS.runs.dir)) if (e.isFile() && e.name.endsWith('.json')) add('runs', e.name.slice(0, -5), path.join(checkout.path, KINDS.runs.dir, e.name));
  for (const e of ls(KINDS.sittings.dir)) if (e.isDirectory()) add('sittings', e.name, path.join(checkout.path, KINDS.sittings.dir, e.name, 'sitting.json'));
  for (const e of ls(KINDS.log.dir)) if (e.isFile() && /^\d{4}-\d{2}-\d{2}\.md$/.test(e.name)) add('log', e.name.slice(0, -3), path.join(checkout.path, KINDS.log.dir, e.name));
  return found;
}

const blobs = new Map(); // git blob contents never change, so keep them
async function remoteDefs(ref) {
  const out = await git(['ls-tree', '-r', ref, '--', KINDS.runs.dir, KINDS.sittings.dir, KINDS.log.dir]);
  const found = [];
  for (const line of (out || '').split('\n').filter(Boolean)) {
    const m = /^\d+ blob ([0-9a-f]+)\t(.+)$/.exec(line);
    if (!m) continue;
    for (const kind of Object.keys(KINDS)) {
      const hit = KINDS[kind].match.exec(m[2]);
      if (!hit) continue;
      const sha = m[1];
      found.push({
        kind, id: hit[1], file: m[2], mtime: 0, from: ref, gitDir: ref + ':' + path.posix.dirname(m[2]),
        text: async () => { if (!blobs.has(sha)) blobs.set(sha, (await git(['cat-file', 'blob', sha])) || ''); return blobs.get(sha); },
      });
    }
  }
  return found;
}

// Which copy wins when the main checkout and the remote default branch both
// have a definition: the local one if it has uncommitted or unpushed changes,
// the remote one if the checkout is merely behind. Other worktrees only add
// definitions neither of those has (work that is not merged yet).
export function definitions() {
  return cached('definitions', DEFS_TTL, async () => {
    const b = await base();
    const all = await checkouts();
    const main = localDefs(all[0]);
    const remote = b.mode === 'ref' ? await remoteDefs(b.ref) : [];
    let behindOnly = false;
    let dirty = new Set();
    if (b.mode === 'ref') {
      const [anc, st] = await Promise.all([
        git(['merge-base', '--is-ancestor', 'HEAD', b.ref]),
        git(['status', '--porcelain', '--', 'devdash/questions', 'devdash/sittings', 'devdash/log']),
      ]);
      behindOnly = anc !== null;
      dirty = new Set((st || '').split('\n').filter(Boolean).map((l) => l.slice(3).replace(/^"|"$/g, '')));
    }
    const others = all.slice(1).flatMap(localDefs).sort((x, y) => y.mtime - x.mtime);
    const chosen = { runs: new Map(), sittings: new Map(), log: new Map() };
    const rel = (c) => path.relative(ROOT, c.file).split(path.sep).join('/');
    const isDirty = (c) => [...dirty].some((d) => rel(c) === d || rel(c).startsWith(d));
    const remoteIds = new Set(remote.map((c) => c.kind + ':' + c.id));
    for (const c of main) {
      if (remoteIds.has(c.kind + ':' + c.id) && behindOnly && !isDirty(c)) continue; // remote copy is newer
      chosen[c.kind].set(c.id, c);
    }
    for (const c of remote) if (!chosen[c.kind].has(c.id)) chosen[c.kind].set(c.id, c);
    for (const c of others) if (!chosen[c.kind].has(c.id)) chosen[c.kind].set(c.id, c);

    const out = { runs: [], sittings: [], log: [] };
    for (const kind of ['runs', 'sittings']) {
      for (const c of chosen[kind].values()) {
        const item = { id: c.id, from: c.from, file: c.mtime ? rel(c) : c.file, dir: c.dir || null, gitDir: c.gitDir || null, def: null, problems: [] };
        if (!ID.test(c.id)) item.problems.push('the name must be lowercase letters, digits and hyphens.');
        try {
          const def = JSON.parse(await c.text());
          item.problems.push(...(kind === 'runs' ? validateRun(def, c.id) : validateSitting(def, c.id)));
          if (!item.problems.length) item.def = def;
          item.title = def && def.title;
        } catch (err) { item.problems.push('not valid JSON: ' + err.message); }
        out[kind].push(item);
      }
      out[kind].sort((x, y) => String((y.def && y.def.date) || '').localeCompare(String((x.def && x.def.date) || '')) || x.id.localeCompare(y.id));
    }
    for (const c of chosen.log.values()) {
      const text = await c.text();
      const { meta, body } = parseLogEntry(text);
      out.log.push({ day: c.id, title: meta.title || '', body, from: c.from });
    }
    out.log.sort((x, y) => y.day.localeCompare(x.day));
    return out;
  });
}

export async function findDef(kind, id) {
  if (!ID.test(String(id))) return null;
  return (await definitions())[kind].find((d) => d.id === id) || null;
}

// A reference screenshot that sits beside a sitting definition.
export async function refShot(item, file) {
  if (item.dir) { try { return fs.readFileSync(path.join(item.dir, file)); } catch { return null; } }
  if (item.gitDir) return git(['show', item.gitDir + '/' + file], ROOT, 8000, 'buffer');
  return null;
}

// Which sittings cover a smoke row, and what the owner has marked so far.
export function coverage(sittings, resultsOf) {
  const map = new Map();
  for (const s of sittings) {
    if (!s.def) continue;
    const res = resultsOf(s.id);
    for (const id of sittingSmokes(s.def)) {
      const steps = s.def.steps.filter((st) => (st.smokes || []).includes(id));
      const marks = steps.map((st) => ((res && res.steps[st.n]) || {}).result || '');
      const verdict = !steps.length ? 'no step' : marks.some((m) => m === 'fail') ? 'fail'
        : marks.every((m) => m === 'pass') ? 'pass' : marks.some((m) => m === 'skip') ? 'skip' : marks.some(Boolean) ? 'partial' : 'not run';
      if (!map.has(id)) map.set(id, []);
      map.get(id).push({ sitting: s.id, title: s.def.title, status: s.def.status || 'active', state: res ? res.state : 'ready', verdict });
    }
  }
  return map;
}

// ---- the day's facts -------------------------------------------------------

function journalLines() {
  try { return fs.readFileSync(path.join(DATA, 'journal.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); } catch { return []; }
}

// Facts per local day for the last `days` days, newest first. Offline: git and
// files only. Merged pull requests are read off commit subjects.
export function facts(days = 30) {
  return cached('facts' + days, DOCS_TTL, async () => {
    const today = localDay();
    const since = addDays(today, -(days - 1));
    const byDay = new Map();
    const day = (d) => { if (!byDay.has(d)) byDay.set(d, { day: d, commits: [], merged: [], smokesPassed: [], smokesFailed: [], specsLocked: [], shipped: [], answered: [], sittings: [] }); return byDay.get(d); };
    if (IS_REPO) {
      const ref = await compareRef();
      const fmt = ['--date=format-local:%Y-%m-%d', '--format=%h%x09%cd%x09%ct%x09%s', '--since=' + since + 'T00:00:00'];
      const [allOut, mainOut, namesOut] = await Promise.all([
        git(['log', '--all', ...fmt]), git(['log', ...fmt, ref]),
        git(['log', '--all', '--name-only', '--format=%x01%h', '--since=' + since + 'T00:00:00']),
      ]);
      const onMain = new Set((mainOut || '').split('\n').filter(Boolean).map((l) => l.split('\t')[0]));
      // A commit that only writes daily log entries is upkeep, not work: it must
      // not make the next day look like it needs an entry of its own.
      const logOnly = new Set();
      for (const block of (namesOut || '').split('\x01').filter(Boolean)) {
        const [hash, ...names] = block.split('\n').map((x) => x.trim()).filter(Boolean);
        if (names.length && names.every((n) => n.startsWith('devdash/log/'))) logOnly.add(hash);
      }
      const seen = new Set();
      for (const l of (allOut || '').split('\n').filter(Boolean)) {
        const [hash, date, time, ...rest] = l.split('\t');
        const subject = rest.join('\t');
        if (seen.has(hash) || date < since) continue;
        seen.add(hash);
        const f = day(date);
        f.commits.push({ hash, subject, onDefault: onMain.has(hash), time: Number(time), logOnly: logOnly.has(hash) });
        const pr = /\(#(\d+)\)\s*$/.exec(subject) || /^Merge pull request #(\d+)/.exec(subject);
        if (pr && onMain.has(hash)) f.merged.push({ number: Number(pr[1]), subject });
      }
    }
    for (const r of await ledger()) {
      if (r.date >= since && r.bucket === 'passed') day(r.date).smokesPassed.push({ id: r.id, title: r.title });
      if (r.date >= since && r.bucket === 'failed') day(r.date).smokesFailed.push({ id: r.id, title: r.title });
    }
    for (const p of await plans()) if (p.lockedOn >= since) day(p.lockedOn).specsLocked.push({ slug: p.slug, title: p.title });
    for (const c of await changelog()) if (c.date >= since) day(c.date).shipped.push(c.text);
    for (const e of journalLines()) {
      const d = localDay(new Date(e.at));
      if (d < since) continue;
      if (e.kind === 'answers.submitted') day(d).answered.push({ run: e.id, answered: e.answered, total: e.total });
      if (e.kind === 'sitting.finished') day(d).sittings.push({ sitting: e.id, pass: e.pass, fail: e.fail, skip: e.skip, seconds: e.seconds });
    }
    return [...byDay.values()].sort((a, b) => b.day.localeCompare(a.day));
  });
}

export function factsMarkdown(f) {
  const out = ['# Facts for ' + f.day, ''];
  const sec = (title, items, fmt) => { out.push('## ' + title); out.push(...(items.length ? items.map(fmt) : ['- none'])); out.push(''); };
  sec('Merged pull requests', f.merged, (m) => '- #' + m.number + ' ' + m.subject);
  sec('Shipped (changelog)', f.shipped, (s) => '- ' + s);
  sec('Specs locked', f.specsLocked, (s) => '- ' + s.slug + ': ' + s.title);
  sec('Smokes passed', f.smokesPassed, (s) => '- ' + s.id + ': ' + s.title);
  sec('Smokes failed', f.smokesFailed, (s) => '- ' + s.id + ': ' + s.title);
  sec('Owner: questions answered', f.answered, (a) => '- ' + a.run + ' (' + a.answered + ' of ' + a.total + ')');
  sec('Owner: sittings finished', f.sittings, (s) => '- ' + s.sitting + ': ' + s.pass + ' pass, ' + s.fail + ' fail, ' + s.skip + ' skip');
  sec('Commits', f.commits.filter((c) => !c.logOnly), (c) => '- ' + c.hash + ' ' + c.subject + (c.onDefault ? '' : ' (not on the default branch)'));
  return out.join('\n');
}

export { DAY };
