#!/usr/bin/env node
// Dev dashboard server. No dependencies, no build step.
//
//   node devdash/server.mjs            (port from devdash/config.json, default 4317)
//
// Pages are computed from the repository on request: nothing on a dash page is
// typed in by hand. The only things this server writes are the owner's answers,
// sitting results, screenshots, the journal and received metrics, all under the
// data directory. It never writes to the project's tracked files.
//
// Bound to 127.0.0.1. Off loopback (for example behind `tailscale serve`) every
// request needs the token. See devdash/README.md.

import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, DASH_DIR, DATA, IS_REPO, IS_LINKED_WORKTREE, config, git, localDay, nowIso, atomicWrite } from './lib/root.mjs';
import * as sources from './lib/sources.mjs';
import * as store from './lib/store.mjs';
import { Refused } from './lib/store.mjs';
import { REF_SHOT, sittingSmokes } from './lib/validate.mjs';

const cfg = config();
const PORT = cfg.port;
const BIND = process.env.DEVDASH_BIND || '127.0.0.1';
const MAX_JSON = 512 * 1024;
const MAX_UPLOAD = Number(process.env.DEVDASH_MAX_UPLOAD) || 10 * 1024 * 1024;
const PUBLIC = path.join(DASH_DIR, 'public');
const PAGES = path.join(ROOT, 'devdash', 'pages');
const STATIC = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/app.css': ['app.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/login': ['login.html', 'text/html; charset=utf-8'],
};
const IMAGE_TYPES = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };
const lastFetch = { at: '', ok: null };
// The dash loads nothing from anywhere else, and says so to the browser.
const CSP = "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-src 'self'; base-uri 'none'; form-action 'self'";
let projectRoutes = {};

// ---- who is asking ---------------------------------------------------------

// A request counts as local only when it comes straight from this machine to a
// loopback name. Anything a proxy forwarded (tailscale serve adds
// X-Forwarded-For) or addressed to another host name is remote and needs the
// token, which also shuts out DNS-rebinding pages.
function isLocal(req) {
  const a = req.socket.remoteAddress || '';
  if (!(a === '127.0.0.1' || a === '::1' || a === '::ffff:127.0.0.1')) return false;
  const h = req.headers;
  if (h['x-forwarded-for'] || h['x-forwarded-host'] || h.forwarded || h['tailscale-user-login']) return false;
  const host = String(h.host || '').replace(/:\d+$/, '').toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
}

const fails = new Map(); // address -> recent failed token attempts
function clientKey(req) { return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim(); }
function limited(req) {
  const recent = (fails.get(clientKey(req)) || []).filter((t) => t > Date.now() - 60000);
  fails.set(clientKey(req), recent);
  return recent.length >= 10;
}

function same(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}

function presented(req) {
  const auth = String(req.headers.authorization || '');
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === 'devdash_token') return part.slice(i + 1).trim();
  }
  return '';
}

function hasToken(req, name = 'token') {
  const got = presented(req);
  if (!got) return false;
  if (same(got, store.token(name))) return true;
  fails.get(clientKey(req))?.push(Date.now()) || fails.set(clientKey(req), [Date.now()]);
  return false;
}

// A page on another site must not be able to post here through the owner's browser.
function crossSite(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  try { return new URL(origin).host.toLowerCase() !== String(req.headers.host || '').toLowerCase(); } catch { return true; }
}

// ---- plumbing --------------------------------------------------------------

function send(res, status, body, type = 'application/json; charset=utf-8', extra = {}) {
  const data = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
  res.writeHead(status, {
    'Content-Type': type,
    'Content-Length': data.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'SAMEORIGIN',
    ...extra,
  });
  res.end(data);
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers['content-length'] || 0);
    if (declared > limit) { req.resume(); reject(new Refused(413, 'Too large. The limit is ' + Math.round(limit / 1024) + ' KB.')); return; }
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      // Over the limit with no declared length: answer now, keep nothing, and
      // let the rest drain so the refusal reaches the sender.
      if (size > limit) { chunks.length = 0; reject(new Refused(413, 'Too large. The limit is ' + Math.round(limit / 1024) + ' KB.')); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', () => reject(new Refused(400, 'Upload interrupted.')));
  });
}

async function readJsonBody(req) {
  if (!/^application\/json\b/i.test(String(req.headers['content-type'] || ''))) throw new Refused(415, 'Send JSON with Content-Type: application/json.');
  const buf = await readBody(req, MAX_JSON);
  if (!buf.length) return {};
  try { const v = JSON.parse(buf.toString('utf8')); if (v && typeof v === 'object') return v; } catch { /* below */ }
  throw new Refused(400, 'The body is not valid JSON.');
}

// A file inside `dir`, by a name already checked against a strict pattern.
function inside(dir, name) {
  const fp = path.resolve(dir, name);
  return fp.startsWith(path.resolve(dir) + path.sep) ? fp : null;
}

// ---- derived views ---------------------------------------------------------

const DAY_MS = 86400000;

function runView(item) {
  const a = store.getAnswers(item.id);
  const total = item.def ? item.def.questions.length : 0;
  const answered = item.def ? item.def.questions.filter((q) => store.isAnswered(a && a.answers[q.id])).length : 0;
  return {
    id: item.id, title: item.title || item.id, from: item.from, problems: item.problems,
    date: (item.def && item.def.date) || '', status: (item.def && item.def.status) || 'active', outcome: (item.def && item.def.outcome) || '',
    example: !!(item.def && item.def.example), total, answered,
    submittedAt: (a && a.submittedAt) || '', changedSinceSubmit: !!(a && a.changedSinceSubmit),
  };
}

function sittingView(item) {
  const r = store.getResults(item.id);
  const def = item.def;
  const idleDays = config().idleDays;
  return {
    id: item.id, title: item.title || item.id, from: item.from, problems: item.problems,
    date: (def && def.date) || '', status: (def && def.status) || 'active', outcome: (def && def.outcome) || '',
    example: !!(def && def.example), environment: (def && def.environment) || null,
    steps: def ? def.steps.length : 0, smokes: def ? sittingSmokes(def) : [],
    state: r ? r.state : 'ready', counts: def ? store.counts(def, r) : null,
    seconds: r ? Math.round(r.activeSeconds) : 0, startedAt: (r && r.startedAt) || '', finishedAt: (r && r.finishedAt) || '',
    idle: !!r && r.state !== 'finished' && Date.now() - Date.parse(r.savedAt || r.startedAt) > idleDays * DAY_MS,
  };
}

async function smokesView() {
  const [rows, defs] = await Promise.all([sources.ledger(), sources.definitions()]);
  const cover = sources.coverage(defs.sittings, store.getResults);
  const known = new Set(rows.map((r) => r.id));
  const out = rows.map((r) => ({ ...r, sittings: cover.get(r.id) || [] }));
  const counts = { open: 0, deferred: 0, failed: 0, passed: 0 };
  for (const r of out) counts[r.bucket] += 1;
  // Rows a person must look at that no open sitting covers yet.
  const unscheduled = out.filter((r) => r.needsPerson && (r.bucket === 'open' || r.bucket === 'deferred') && !r.sittings.some((s) => s.status === 'active'));
  // IDs a sitting links that the ledger being read does not have (typically not merged yet).
  const unknown = [...cover.keys()].filter((id) => !known.has(id));
  return { rows: out, counts, unscheduled: unscheduled.map((r) => r.id), unknown };
}

async function logView() {
  const [defs, facts] = await Promise.all([sources.definitions(), sources.facts(30)]);
  const days = new Map();
  for (const f of facts) days.set(f.day, { day: f.day, title: '', body: '', from: '', facts: f });
  for (const e of defs.log) {
    const d = days.get(e.day) || { day: e.day, facts: null };
    days.set(e.day, { ...d, title: e.title, body: e.body, from: e.from });
  }
  const list = [...days.values()].sort((a, b) => b.day.localeCompare(a.day));
  const worked = (f) => f && f.commits.some((c) => !c.logOnly);
  return { entries: list, missing: list.filter((d) => !d.body && worked(d.facts) && d.day !== localDay()).map((d) => d.day) };
}

async function homeView() {
  const [state, defs, smokes, pulls, commits, log, trees] = await Promise.all([
    sources.state(), sources.definitions(), smokesView(), sources.pulls(), sources.commits(8), logView(), sources.worktrees(),
  ]);
  const runs = defs.runs.map(runView);
  const sittings = defs.sittings.map(sittingView);
  const unread = store.unread();
  const unreadIds = new Set(unread.filter((e) => e.kind === 'answers.submitted' || e.kind === 'sitting.finished').map((e) => e.id));
  const waiting = [];
  for (const r of runs) {
    if (r.status !== 'active' || r.problems.length) continue;
    if (!r.submittedAt || r.changedSinceSubmit) waiting.push({ kind: 'questions', id: r.id, title: r.title, example: r.example, detail: r.submittedAt ? 'Changed since you submitted. Submit again.' : r.answered + ' of ' + r.total + ' answered, not submitted' });
  }
  for (const s of sittings) {
    if (s.status !== 'active' || s.problems.length || s.state === 'finished') continue;
    waiting.push({ kind: 'sittings', id: s.id, title: s.title, example: s.example, flag: s.idle ? 'idle' : '', detail: s.state === 'ready' ? s.steps + ' steps, ready to run' : 'In progress: ' + (s.steps - s.counts.unanswered) + ' of ' + s.steps + ' steps' + (s.idle ? '. Untouched for over ' + config().idleDays + ' days.' : '') });
  }
  const debt = smokes.rows.filter((r) => r.bucket === 'deferred').map((r) => ({ id: r.id, title: r.title, due: r.deferral ? r.deferral.due : '', owner: r.deferral ? r.deferral.owner : '', overdue: r.overdue }))
    .sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));
  const agentOwes = [];
  for (const id of unreadIds) agentOwes.push({ text: 'Has not yet read your ' + (runs.some((r) => r.id === id) ? 'answers to' : 'results for') + ' "' + (([...runs, ...sittings].find((x) => x.id === id) || {}).title || id) + '"' });
  if (smokes.unscheduled.length) agentOwes.push({ text: 'No sitting yet for ' + smokes.unscheduled.length + ' smoke row' + (smokes.unscheduled.length === 1 ? '' : 's') + ' only a person can close: ' + smokes.unscheduled.join(', '), href: '#/smokes' });
  if (log.missing.length) agentOwes.push({ text: 'No daily log summary for ' + log.missing.slice(0, 5).join(', '), href: '#/log' });
  for (const d of [...defs.runs, ...defs.sittings]) if (d.problems.length) agentOwes.push({ text: 'A definition is broken and is not shown: ' + d.file });
  const main = trees.find((t) => t.main);
  return {
    state, waiting, debt, agentOwes,
    failed: smokes.rows.filter((r) => r.bucket === 'failed').map((r) => ({ id: r.id, title: r.title })),
    counts: { smokesOpen: smokes.counts.open, smokesDeferred: smokes.counts.deferred, pulls: pulls.available ? pulls.list.length : null, waiting: waiting.length },
    recentLog: log.entries.slice(0, 3),
    commits,
    lag: main && (main.dirty || main.ahead) ? { dirty: main.dirty, ahead: main.ahead } : null,
  };
}

async function metaView(req) {
  const [b, defs, smokes] = await Promise.all([sources.base(), sources.definitions(), smokesView()]);
  const runs = defs.runs.map(runView);
  const sittings = defs.sittings.map(sittingView);
  let pages = [];
  try {
    pages = fs.readdirSync(PAGES).filter((n) => /^[a-z0-9][a-z0-9-]*\.html$/.test(n)).sort().map((n) => {
      const t = /<title>([^<]*)<\/title>/i.exec(fs.readFileSync(path.join(PAGES, n), 'utf8').slice(0, 4000));
      return { file: n, title: (t && t[1].trim()) || n.replace(/\.html$/, '') };
    });
  } catch { /* no project pages */ }
  const c = config();
  return {
    project: c.project, owner: c.owner, environments: c.environments,
    reading: b.label, fetched: lastFetch, local: isLocal(req), repo: IS_REPO, root: ROOT,
    nav: {
      questions: runs.filter((r) => r.status === 'active' && (!r.submittedAt || r.changedSinceSubmit) && !r.problems.length).length,
      sittings: sittings.filter((s) => s.status === 'active' && s.state !== 'finished' && !s.problems.length).length,
      smokes: smokes.counts.open + smokes.counts.deferred + smokes.counts.failed,
    },
    pages, projectRoutes: Object.keys(projectRoutes),
  };
}

// ---- routes ----------------------------------------------------------------

async function handleGet(req, res, url) {
  const p = url.pathname;
  if (STATIC[p]) return send(res, 200, fs.readFileSync(path.join(PUBLIC, STATIC[p][0])), STATIC[p][1], STATIC[p][1].startsWith('text/html') ? { 'Content-Security-Policy': CSP } : {});
  let m;

  if (p === '/api/meta') return send(res, 200, await metaView(req));
  if (p === '/api/home') return send(res, 200, await homeView());
  if (p === '/api/log') return send(res, 200, await logView());
  if (p === '/api/smokes') return send(res, 200, await smokesView());
  if (p === '/api/parking') return send(res, 200, await sources.parking());
  if (p === '/api/changelog') return send(res, 200, await sources.changelog());
  if (p === '/api/metrics') return send(res, 200, store.metricsSummary());
  if (p === '/api/refresh') { sources.clearCache(); return send(res, 200, { ok: true }); }
  if (p === '/api/work') {
    const [plans, worktrees, branches, pulls] = await Promise.all([sources.plans(), sources.worktrees(), sources.branches(), sources.pulls()]);
    return send(res, 200, { plans, worktrees, branches, pulls });
  }
  if (p === '/api/questions') return send(res, 200, (await sources.definitions()).runs.map(runView));
  if ((m = /^\/api\/questions\/([^/]+)$/.exec(p))) {
    const item = await sources.findDef('runs', m[1]);
    if (!item) return send(res, 404, { error: 'No such question run.' });
    return send(res, 200, { ...runView(item), run: item.def, answers: store.getAnswers(item.id) });
  }
  if (p === '/api/sittings') return send(res, 200, (await sources.definitions()).sittings.map(sittingView));
  if ((m = /^\/api\/sittings\/([^/]+)$/.exec(p))) {
    const item = await sources.findDef('sittings', m[1]);
    if (!item) return send(res, 404, { error: 'No such sitting.' });
    const ledger = await sources.ledger();
    const linked = item.def ? sittingSmokes(item.def).map((id) => { const r = ledger.find((x) => x.id === id); return r ? { id, title: r.title, lane: r.lane, status: r.status } : { id, missing: true }; }) : [];
    return send(res, 200, { ...sittingView(item), sitting: item.def, results: store.getResults(item.id), linked });
  }
  if ((m = /^\/shots\/([^/]+)\/([^/]+)$/.exec(p))) {
    const fp = store.shotPath(m[1], m[2]);
    if (!fp) return send(res, 404, { error: 'Not found.' });
    return send(res, 200, fs.readFileSync(fp), IMAGE_TYPES[fp.split('.').pop()]);
  }
  if ((m = /^\/ref\/([^/]+)\/([^/]+)$/.exec(p))) {
    const item = REF_SHOT.test(m[2]) ? await sources.findDef('sittings', m[1]) : null;
    const listed = item && item.def && item.def.steps.some((st) => (st.shots || []).some((s) => s.file === m[2]));
    const buf = listed ? await sources.refShot(item, m[2]) : null;
    if (!buf) return send(res, 404, { error: 'Not found.' });
    return send(res, 200, buf, IMAGE_TYPES[m[2].split('.').pop().toLowerCase()]);
  }
  if ((m = /^\/pages\/([a-z0-9][a-z0-9-]*\.html)$/.exec(p))) {
    const fp = inside(PAGES, m[1]);
    if (!fp || !fs.existsSync(fp)) return send(res, 404, { error: 'Not found.' });
    return send(res, 200, fs.readFileSync(fp), 'text/html; charset=utf-8');
  }
  if (projectRoutes[p]) return send(res, 200, await projectRoutes[p]({ url, sources, store, config: config() }));
  return send(res, 404, { error: 'Not found.' });
}

async function handlePost(req, res, url) {
  const p = url.pathname;
  let m;

  if (p === '/login') {
    if (limited(req)) return send(res, 429, { error: 'Too many attempts. Wait a minute.' });
    const body = await readJsonBody(req);
    if (!same(String(body.token || '').trim(), store.token())) {
      fails.get(clientKey(req))?.push(Date.now()) || fails.set(clientKey(req), [Date.now()]);
      return send(res, 401, { error: 'That is not the token.' });
    }
    const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
    return send(res, 200, { ok: true }, undefined, { 'Set-Cookie': 'devdash_token=' + store.token() + '; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000' + secure });
  }

  // Metrics come from programs, not from the owner's browser: always a token,
  // and a separate one, so an app that can send numbers cannot answer questions.
  if (p === '/api/metrics') {
    if (limited(req)) return send(res, 429, { error: 'Too many attempts. Wait a minute.' });
    if (!hasToken(req, 'metrics-token') && !hasToken(req)) return send(res, 401, { error: 'Send the metrics token as Authorization: Bearer <token>.' });
    return send(res, 200, { ok: true, stored: store.ingestMetrics(await readJsonBody(req)) });
  }

  if ((m = /^\/api\/questions\/([^/]+)\/(answer|submit|general)$/.exec(p))) {
    const item = await sources.findDef('runs', m[1]);
    if (!item || !item.def) return send(res, 404, { error: 'No such question run.' });
    const body = await readJsonBody(req);
    const a = m[2] === 'answer' ? store.saveAnswer(item.def, body) : m[2] === 'submit' ? store.submitAnswers(item.def, body) : store.saveGeneral(item.def, body.general);
    return send(res, 200, { ok: true, answers: a });
  }

  if ((m = /^\/api\/sittings\/([^/]+)\/step\/(\d{1,2})\/shot$/.exec(p))) {
    const item = await sources.findDef('sittings', m[1]);
    if (!item || !item.def) return send(res, 404, { error: 'No such sitting.' });
    if (!/^image\//i.test(String(req.headers['content-type'] || ''))) return send(res, 415, { error: 'Images only: PNG, JPEG, WebP or GIF.' });
    const buf = await readBody(req, MAX_UPLOAD);
    if (!buf.length) return send(res, 400, { error: 'The upload was empty.' });
    return send(res, 200, { ok: true, ...store.addShot(item.def, Number(m[2]), buf) });
  }
  if ((m = /^\/api\/sittings\/([^/]+)\/step\/(\d{1,2})(\/shot\/remove)?$/.exec(p))) {
    const item = await sources.findDef('sittings', m[1]);
    if (!item || !item.def) return send(res, 404, { error: 'No such sitting.' });
    const body = await readJsonBody(req);
    const r = m[3] ? store.removeShot(item.def, Number(m[2]), body.file) : store.saveStep(item.def, Number(m[2]), body);
    return send(res, 200, { ok: true, results: r });
  }
  if ((m = /^\/api\/sittings\/([^/]+)\/(start|pause|resume|tick|note|finish|reopen)$/.exec(p))) {
    const item = await sources.findDef('sittings', m[1]);
    if (!item || !item.def) return send(res, 404, { error: 'No such sitting.' });
    const body = await readJsonBody(req);
    return send(res, 200, { ok: true, results: store.sittingAction(item.def, m[2], body) });
  }
  return send(res, 404, { error: 'Not found.' });
}

async function handle(req, res) {
  // Reject anything that tries to climb out of a directory, before the URL
  // parser has a chance to tidy it away. No route here needs an encoded path.
  const rawPath = String(req.url || '').split('?')[0];
  if (/\.\.|%|\\|\0|\/\//.test(rawPath) || !rawPath.startsWith('/')) return send(res, 400, { error: 'Bad path.' });
  let url;
  try { url = new URL(req.url, 'http://x'); } catch { return send(res, 400, { error: 'Bad request.' }); }

  const local = isLocal(req);
  const isLogin = url.pathname === '/login';
  const isMetricsPost = req.method === 'POST' && url.pathname === '/api/metrics';
  if (req.method === 'GET' || req.method === 'HEAD') {
    if (!local && !isLogin && !hasToken(req)) {
      if (limited(req)) return send(res, 429, { error: 'Too many attempts. Wait a minute.' });
      if (url.pathname === '/' || url.pathname === '/index.html') { res.writeHead(302, { Location: '/login' }); return res.end(); }
      return send(res, 401, { error: 'Token required.' });
    }
    return handleGet(req, res, url);
  }
  if (req.method === 'POST') {
    if (crossSite(req)) return send(res, 403, { error: 'Cross-site requests are refused.' });
    if (!local && !isLogin && !isMetricsPost) {
      if (limited(req)) return send(res, 429, { error: 'Too many attempts. Wait a minute.' });
      if (!hasToken(req)) return send(res, 401, { error: 'Token required.' });
    }
    return handlePost(req, res, url);
  }
  return send(res, 405, { error: 'Method not allowed.' });
}

// ---- start -----------------------------------------------------------------

async function fetchLoop() {
  if (!IS_REPO || process.env.DEVDASH_NO_FETCH) return;
  const run = async () => {
    const b = await sources.base();
    if (b.mode !== 'ref') return;
    const ok = (await git(['fetch', '--quiet', '--prune', 'origin'], ROOT, 60000)) !== null;
    lastFetch.at = nowIso();
    lastFetch.ok = ok;
    if (ok) sources.clearCache();
  };
  setTimeout(run, 3000).unref();
  setInterval(run, 10 * 60 * 1000).unref();
}

async function loadProject() {
  const fp = path.join(ROOT, 'devdash', 'project.mjs');
  if (!fs.existsSync(fp)) return;
  try {
    const mod = await import(pathToFileURL(fp).href);
    for (const [route, fn] of Object.entries(mod.routes || {})) {
      if (/^\/api\/project\/[a-z0-9/-]+$/.test(route) && typeof fn === 'function') projectRoutes[route] = fn;
      else console.error('devdash: project route ignored (must be under /api/project/): ' + route);
    }
  } catch (err) { console.error('devdash: could not load devdash/project.mjs: ' + err.message); }
}

if (['0.0.0.0', '::', ''].includes(BIND) && !process.env.DEVDASH_ALLOW_ALL_INTERFACES) {
  console.error('devdash: refusing to listen on every interface. Keep 127.0.0.1 and publish it through your private network (see devdash/README.md).');
  process.exit(1);
}

store.ensureData();
await loadProject();

const server = http.createServer((req, res) => {
  handle(req, res).catch((err) => {
    if (res.headersSent) { res.destroy(); return; }
    if (err instanceof Refused) return send(res, err.status, { error: err.message });
    console.error(nowIso() + ' ' + req.method + ' ' + req.url + ' failed: ' + (err.stack || err));
    send(res, 500, { error: 'The dash hit an error. See the server log.' });
  });
});
server.requestTimeout = 60000;
server.on('error', (err) => {
  console.error(err.code === 'EADDRINUSE' ? 'devdash: port ' + PORT + ' is in use. Is the dash already running? Set "port" in devdash/config.json to move it.' : 'devdash: ' + err.message);
  process.exit(1);
});
const pidFile = path.join(DATA, 'server.json');
server.listen(PORT, BIND, () => {
  atomicWrite(pidFile, { pid: process.pid, port: PORT, bind: BIND, root: ROOT, startedAt: nowIso() });
  console.log('devdash: http://' + (BIND === '127.0.0.1' ? 'localhost' : BIND) + ':' + PORT + '/  (project ' + ROOT + (IS_LINKED_WORKTREE ? ', started from a worktree' : '') + ')');
  console.log('devdash: data in ' + DATA);
  fetchLoop();
});
const stop = () => { try { if (JSON.parse(fs.readFileSync(pidFile, 'utf8')).pid === process.pid) fs.unlinkSync(pidFile); } catch { /* gone */ } process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
