// The owner's data: answers, sitting results, screenshots, the journal, the
// tokens and received metrics. Only the dash server writes these, with one
// exception: devdash/scripts/results.mjs moves the agent's cursor.
//
// Layout under DATA (devdash/.data in the main checkout unless DEVDASH_DATA):
//   answers/<run>.json                 the owner's answers to a question run
//   sittings/<id>/results.json         the owner's results for a sitting
//   sittings/<id>/shots/<file>         screenshots the owner added
//   trash/                             screenshots the owner removed (kept)
//   journal.jsonl                      append-only: one line per owner action
//   agent-cursor.json                  how far the agent has read the journal
//   metrics.jsonl                      received metric points
//   token, metrics-token               write token, ingest token

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DATA, atomicWrite, readJson, nowIso, config } from './root.mjs';
import { ID, lines } from './validate.mjs';

export class Refused extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const file = (...parts) => path.join(DATA, ...parts);
const cap = (v, n) => String(v ?? '').slice(0, n);

export function ensureData() {
  fs.mkdirSync(DATA, { recursive: true });
  for (const name of ['token', 'metrics-token']) {
    const fp = file(name);
    if (!fs.existsSync(fp)) fs.writeFileSync(fp, crypto.randomBytes(24).toString('hex') + '\n', { mode: 0o600 });
  }
}
export const token = (name = 'token') => { try { return fs.readFileSync(file(name), 'utf8').trim(); } catch { return ''; } };

// ---- journal and the agent's cursor ---------------------------------------

export function journal(entry) {
  fs.mkdirSync(DATA, { recursive: true });
  fs.appendFileSync(file('journal.jsonl'), JSON.stringify({ at: nowIso(), ...entry }) + '\n');
}

export function journalEntries() {
  let text = '';
  try { text = fs.readFileSync(file('journal.jsonl'), 'utf8'); } catch { return []; }
  return text.split('\n').filter(Boolean).map((l, i) => { try { return { n: i + 1, ...JSON.parse(l) }; } catch { return { n: i + 1, kind: 'unreadable' }; } });
}

export const cursor = () => readJson(file('agent-cursor.json'), { seen: 0, at: '' });
export function unread() { const c = cursor(); return journalEntries().filter((e) => e.n > c.seen); }
export function acknowledge(upTo) {
  const total = journalEntries().length;
  const seen = Math.max(cursor().seen, Math.min(total, upTo));
  atomicWrite(file('agent-cursor.json'), { seen, at: nowIso() });
  return seen;
}

// ---- answers to question runs ---------------------------------------------

export const getAnswers = (id) => readJson(file('answers', id + '.json'), null);

function blankAnswers(run) { return { id: run.id, owner: config().owner || '', answers: {}, general: '', submittedAt: '', savedAt: '' }; }

export function saveAnswer(run, body) {
  if ((run.status || 'active') !== 'active') throw new Refused(409, 'This run is archived. Its answers are final.');
  const q = run.questions.find((x) => x.id === body.question);
  if (!q) throw new Refused(400, 'No such question in this run.');
  const a = getAnswers(run.id) || blankAnswers(run);
  const cur = a.answers[q.id] || { pick: '', label: '', own: '', note: '' };
  if (body.pick !== undefined) {
    const opt = q.options.find((o) => o.key === body.pick);
    if (body.pick !== '' && body.pick !== 'own' && !opt) throw new Refused(400, 'No such option.');
    cur.pick = body.pick;
    cur.label = opt ? opt.label : '';
  }
  if (body.own !== undefined) cur.own = cap(body.own, 8000);
  if (body.note !== undefined) cur.note = cap(body.note, 8000);
  // Keep what was asked beside the answer, so a later edit to the question
  // cannot change what the owner appears to have agreed to.
  cur.asked = q.question;
  cur.recommended = q.recommend || '';
  cur.at = nowIso();
  a.answers[q.id] = cur;
  a.savedAt = cur.at;
  if (a.submittedAt) a.changedSinceSubmit = true;
  atomicWrite(file('answers', run.id + '.json'), a);
  return a;
}

export const isAnswered = (x) => !!x && ((x.pick && x.pick !== 'own') || (x.pick === 'own' && (x.own || '').trim()) || (x.note || '').trim() !== '' || (x.own || '').trim() !== '');

export function submitAnswers(run, body) {
  if ((run.status || 'active') !== 'active') throw new Refused(409, 'This run is archived. Its answers are final.');
  const a = getAnswers(run.id) || blankAnswers(run);
  if (body.general !== undefined) a.general = cap(body.general, 8000);
  const answered = run.questions.filter((q) => isAnswered(a.answers[q.id])).length;
  if (!answered && !a.general.trim()) throw new Refused(400, 'Nothing has been answered yet.');
  a.submittedAt = nowIso();
  a.savedAt = a.submittedAt;
  a.changedSinceSubmit = false;
  a.owner = config().owner || a.owner || '';
  atomicWrite(file('answers', run.id + '.json'), a);
  journal({ kind: 'answers.submitted', id: run.id, answered, total: run.questions.length });
  return a;
}

export function saveGeneral(run, text) {
  if ((run.status || 'active') !== 'active') throw new Refused(409, 'This run is archived. Its answers are final.');
  const a = getAnswers(run.id) || blankAnswers(run);
  a.general = cap(text, 8000);
  a.savedAt = nowIso();
  if (a.submittedAt) a.changedSinceSubmit = true;
  atomicWrite(file('answers', run.id + '.json'), a);
  return a;
}

// ---- sittings --------------------------------------------------------------

const resultsFile = (id) => file('sittings', id, 'results.json');
export const getResults = (id) => (ID.test(String(id)) ? readJson(resultsFile(id), null) : null);

const IDLE_GAP = 90;      // seconds without a heartbeat before time stops counting
const IDLE_CREDIT = 30;   // what a longer gap is worth

// Add the time since the last heartbeat to the sitting and to the step that
// was on screen. The clock lives here, on the server, so it survives a reload,
// a closed tab and a restart.
function credit(res, step) {
  const now = Date.now();
  if (res.state === 'running' && res.lastTick) {
    let gap = (now - Date.parse(res.lastTick)) / 1000;
    if (!(gap >= 0)) gap = 0;
    if (gap > IDLE_GAP) gap = IDLE_CREDIT;
    res.activeSeconds = Math.round((res.activeSeconds + gap) * 10) / 10;
    const k = String(res.currentStep || '');
    if (k && res.steps[k]) res.steps[k].seconds = Math.round(((res.steps[k].seconds || 0) + gap) * 10) / 10;
  }
  res.lastTick = new Date(now).toISOString();
  if (step) res.currentStep = step;
}

function blankStep() { return { result: '', checks: [], note: '', shots: [], seconds: 0, at: '' }; }

function load(sit, needRunning = true) {
  const res = getResults(sit.id);
  if (!res) throw new Refused(409, 'Press Start first.');
  if (needRunning && res.state === 'finished') throw new Refused(409, 'This sitting is finished. Reopen it to change anything.');
  return res;
}

function save(res) {
  res.rev = (res.rev || 0) + 1;
  res.savedAt = nowIso();
  atomicWrite(resultsFile(res.id), res);
  return res;
}

export function counts(sit, res) {
  const c = { pass: 0, fail: 0, skip: 0, unanswered: 0 };
  for (const st of sit.steps) { const r = (res && res.steps[st.n] && res.steps[st.n].result) || ''; c[r || 'unanswered'] += 1; }
  return c;
}

export function sittingAction(sit, action, body = {}) {
  if ((sit.status || 'active') !== 'active') throw new Refused(409, 'This sitting is closed.');
  if (action === 'start') {
    let res = getResults(sit.id);
    if (res) throw new Refused(409, 'This sitting has already been started.');
    res = { id: sit.id, title: sit.title, owner: config().owner || '', state: 'running', startedAt: nowIso(), finishedAt: '', activeSeconds: 0, currentStep: 1, lastTick: nowIso(), note: '', steps: {} };
    for (const st of sit.steps) res.steps[st.n] = blankStep();
    journal({ kind: 'sitting.started', id: sit.id });
    return save(res);
  }
  if (action === 'reopen') {
    const res = load(sit, false);
    if (res.state !== 'finished') throw new Refused(409, 'This sitting is not finished.');
    res.state = 'paused';
    res.finishedAt = '';
    journal({ kind: 'sitting.reopened', id: sit.id });
    return save(res);
  }
  const res = load(sit);
  const step = Number.isInteger(body.step) && sit.steps.some((s) => s.n === body.step) ? body.step : 0;
  if (action === 'tick') { credit(res, step); return save(res); }
  if (action === 'pause') { credit(res, step); res.state = 'paused'; return save(res); }
  if (action === 'resume') { res.state = 'running'; res.lastTick = nowIso(); if (step) res.currentStep = step; return save(res); }
  if (action === 'note') { credit(res, step); res.note = cap(body.note, 8000); return save(res); }
  if (action === 'finish') {
    credit(res, step);
    if (body.note !== undefined) res.note = cap(body.note, 8000);
    res.state = 'finished';
    res.finishedAt = nowIso();
    const c = counts(sit, res);
    journal({ kind: 'sitting.finished', id: sit.id, ...c, seconds: Math.round(res.activeSeconds) });
    return save(res);
  }
  throw new Refused(404, 'Unknown action.');
}

export function saveStep(sit, n, body) {
  const st = sit.steps.find((s) => s.n === n);
  if (!st) throw new Refused(404, 'No such step.');
  const res = load(sit);
  credit(res, n);
  const cur = res.steps[n] || (res.steps[n] = blankStep());
  if (body.result !== undefined) {
    if (!['pass', 'fail', 'skip', ''].includes(body.result)) throw new Refused(400, 'Result must be pass, fail or skip.');
    if (cur.result !== body.result) journal({ kind: 'sitting.step', id: sit.id, step: n, result: body.result || 'cleared', smokes: st.smokes || [] });
    cur.result = body.result;
    cur.at = body.result ? nowIso() : '';
    // What the owner was shown when they answered.
    cur.asked = { do: lines(st.do), expect: lines(st.expect) };
  }
  if (body.checks !== undefined) {
    if (!Array.isArray(body.checks) || body.checks.length > 40 || body.checks.some((x) => typeof x !== 'boolean')) throw new Refused(400, 'Bad checklist.');
    cur.checks = body.checks;
  }
  if (body.note !== undefined) cur.note = cap(body.note, 8000);
  if (body.captions && typeof body.captions === 'object') {
    for (const s of cur.shots) if (typeof body.captions[s.file] === 'string') s.caption = cap(body.captions[s.file], 500);
  }
  return save(res);
}

const MAGIC = [
  [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'png'],
  [Buffer.from([0xff, 0xd8, 0xff]), 'jpg'],
  [Buffer.from('GIF87a'), 'gif'],
  [Buffer.from('GIF89a'), 'gif'],
];
// The type is decided by the bytes, never by what the browser claims.
export function imageType(buf) {
  for (const [sig, ext] of MAGIC) if (buf.length > sig.length && buf.subarray(0, sig.length).equals(sig)) return ext;
  if (buf.length > 12 && buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}

export const SHOT_NAME = /^s\d{1,2}-\d{8}-\d{6}-[0-9a-f]{6}\.(?:png|jpg|gif|webp)$/;

export function addShot(sit, n, buf) {
  if (!sit.steps.some((s) => s.n === n)) throw new Refused(404, 'No such step.');
  const ext = imageType(buf);
  if (!ext) throw new Refused(415, 'Images only: PNG, JPEG, WebP or GIF.');
  const res = load(sit);
  credit(res, n);
  const cur = res.steps[n] || (res.steps[n] = blankStep());
  if (cur.shots.length >= 30) throw new Refused(400, 'This step already has 30 screenshots.');
  const d = new Date();
  const p = (x) => String(x).padStart(2, '0');
  // The server names the file. The browser never supplies a path.
  const name = 's' + n + '-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()) + '-' + crypto.randomBytes(3).toString('hex') + '.' + ext;
  const dir = file('sittings', sit.id, 'shots');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), buf);
  cur.shots.push({ file: name, caption: '', at: nowIso() });
  journal({ kind: 'sitting.shot', id: sit.id, step: n, file: name });
  return { file: name, results: save(res) };
}

export function removeShot(sit, n, name) {
  if (!SHOT_NAME.test(String(name))) throw new Refused(400, 'Bad file name.');
  const res = load(sit);
  const cur = res.steps[n];
  if (!cur || !cur.shots.some((s) => s.file === name)) throw new Refused(404, 'No such screenshot on this step.');
  const from = file('sittings', sit.id, 'shots', name);
  if (fs.existsSync(from)) {
    fs.mkdirSync(file('trash'), { recursive: true });
    fs.renameSync(from, file('trash', sit.id + '--' + name)); // kept, never deleted
  }
  cur.shots = cur.shots.filter((s) => s.file !== name);
  journal({ kind: 'sitting.shot-removed', id: sit.id, step: n, file: name });
  return save(res);
}

export function shotPath(id, name) {
  if (!ID.test(String(id)) || !SHOT_NAME.test(String(name))) return null;
  const fp = file('sittings', id, 'shots', name);
  return fp.startsWith(path.join(DATA, 'sittings') + path.sep) && fs.existsSync(fp) ? fp : null;
}

// ---- metrics ---------------------------------------------------------------

const METRIC_NAME = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const METRIC_KINDS = ['counter', 'gauge', 'event'];
const MAX_METRICS_FILE = 5 * 1024 * 1024;

export function ingestMetrics(body) {
  const points = Array.isArray(body) ? body : [body];
  if (!points.length || points.length > 100) throw new Refused(400, 'Send one point or a list of up to 100.');
  const out = [];
  for (const p of points) {
    if (!p || typeof p !== 'object' || !METRIC_NAME.test(String(p.name || ''))) throw new Refused(400, 'Each point needs a name: lowercase letters, digits, dot, dash or underscore.');
    const kind = p.kind === undefined ? 'counter' : p.kind;
    if (!METRIC_KINDS.includes(kind)) throw new Refused(400, 'kind must be counter, gauge or event.');
    const value = p.value === undefined ? 1 : p.value;
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new Refused(400, 'value must be a number.');
    let at = nowIso();
    if (p.at !== undefined) { const t = Date.parse(p.at); if (Number.isNaN(t)) throw new Refused(400, 'at must be an ISO time.'); at = new Date(t).toISOString(); }
    out.push({ at, name: p.name, kind, value, note: cap(p.note, 300) });
  }
  fs.mkdirSync(DATA, { recursive: true });
  const fp = file('metrics.jsonl');
  try { if (fs.statSync(fp).size > MAX_METRICS_FILE) fs.renameSync(fp, file('metrics-' + Date.now() + '.jsonl')); } catch { /* no file yet */ }
  fs.appendFileSync(fp, out.map((x) => JSON.stringify(x)).join('\n') + '\n');
  return out.length;
}

export function metricsSummary(days = 14) {
  let text = '';
  try { text = fs.readFileSync(file('metrics.jsonl'), 'utf8'); } catch { /* none */ }
  const points = text.split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const dayOf = (iso) => { const d = new Date(iso); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const labels = [];
  for (let i = days - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); labels.push(dayOf(d.toISOString())); }
  const byName = new Map();
  for (const p of points) {
    if (!byName.has(p.name)) byName.set(p.name, { name: p.name, kind: p.kind, last: null, lastAt: '', total: 0, count: 0, days: {} });
    const m = byName.get(p.name);
    m.kind = p.kind; m.count += 1; m.total += p.value;
    if (p.at >= m.lastAt) { m.last = p.value; m.lastAt = p.at; m.lastNote = p.note || ''; }
    const d = dayOf(p.at);
    if (p.kind === 'gauge') m.days[d] = p.value; else m.days[d] = (m.days[d] || 0) + (p.kind === 'event' ? 1 : p.value);
  }
  const metrics = [...byName.values()].map((m) => ({
    name: m.name, kind: m.kind, last: m.last, lastAt: m.lastAt, lastNote: m.lastNote, count: m.count,
    total: Math.round(m.total * 1000) / 1000,
    series: labels.map((d) => (m.days[d] === undefined ? null : m.days[d])),
  })).sort((a, b) => a.name.localeCompare(b.name));
  return { days: labels, metrics, recent: points.slice(-40).reverse() };
}
