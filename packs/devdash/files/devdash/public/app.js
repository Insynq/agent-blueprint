// Dev dash front end. Plain JavaScript, no build step, no external assets.
// Every page is rendered from what /api/* returns; nothing here holds state
// that is not on the server, so a reload never loses anything.
'use strict';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// `code`, **bold** and [text](https://link) inside otherwise plain text.
const inline = (t) => esc(t)
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
  .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
// Paragraphs, bullet lists, numbered lists and ### headings.
function prose(t) {
  return String(t || '').replace(/\r/g, '').split(/\n{2,}/).map((par) => {
    const ls = par.split('\n').filter((l) => l.trim() !== '');
    if (!ls.length) return '';
    const h = /^(#{1,3}) +(.*)$/.exec(ls[0]);
    if (h && ls.length === 1) return '<h3>' + inline(h[2]) + '</h3>';
    if (ls.every((l) => /^\s*[-*] /.test(l))) return '<ul>' + ls.map((l) => '<li>' + inline(l.replace(/^\s*[-*] /, '')) + '</li>').join('') + '</ul>';
    if (ls.every((l) => /^\s*\d+[.)] /.test(l))) return '<ol>' + ls.map((l) => '<li>' + inline(l.replace(/^\s*\d+[.)] /, '')) + '</li>').join('') + '</ol>';
    return '<p>' + ls.map(inline).join('<br>') + '</p>';
  }).join('');
}
const list = (v) => (Array.isArray(v) ? v : typeof v === 'string' ? v.split(/\n+/) : []).map((x) => String(x).trim()).filter(Boolean);
const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many || one + 's');
const clock = (s) => { s = Math.max(0, Math.floor(s || 0)); const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s % 60).padStart(2, '0'); };
const hhmm = (iso) => (iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');
const dayTime = (iso) => (iso ? new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
const weekday = (day) => new Date(day + 'T12:00:00').toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
const COLORS = ['#38bdf8', '#c084fc', '#f0b429', '#2ecc8f', '#f472b6', '#fb923c'];

let toastTimer;
function toast(msg, bad) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast show' + (bad ? ' err' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, bad ? 5000 : 1400);
}
const saved = () => toast('Saved ' + hhmm(new Date().toISOString()));

async function api(path, body, raw) {
  const opts = body === undefined ? {} : raw
    ? { method: 'POST', headers: { 'Content-Type': raw }, body }
    : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
  let res;
  try { res = await fetch(path, opts); } catch { throw new Error('The dash server is not answering. Is it still running?'); }
  if (res.status === 401 && !document.body.classList.contains('login-page')) { location.href = '/login'; throw new Error('Sign in first.'); }
  let data = null;
  try { data = await res.json(); } catch { /* not JSON */ }
  if (!res.ok) throw new Error((data && data.error) || 'Request failed (' + res.status + ').');
  return data;
}

// ---- theme -----------------------------------------------------------------

function theme(set) {
  let t = null;
  try { if (set) localStorage.setItem('devdash-theme', set); t = localStorage.getItem('devdash-theme'); } catch { t = set || null; }
  if (t) document.documentElement.dataset.theme = t;
  const dark = t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const b = $('#theme');
  if (b) b.textContent = dark ? 'Light' : 'Dark';
  return dark;
}

// ---- sign-in page ----------------------------------------------------------

async function loginPage() {
  theme();
  const go = async (token) => {
    try { await api('/login', { token }); location.replace('/'); } catch (err) { $('#login-err').textContent = err.message; }
  };
  $('#login').addEventListener('submit', (e) => { e.preventDefault(); go($('#token').value); });
  // A sign-in link carries the token after the #, which is never sent to a server log.
  const frag = location.hash.slice(1);
  if (frag) { history.replaceState(null, '', '/login'); go(frag); }
}

// ---- shell -----------------------------------------------------------------

let META = { nav: {}, pages: [] };
const NAV = [
  ['', [['today', 'Today']]],
  ['Waiting on you', [['questions', 'Questions'], ['sittings', 'Sittings']]],
  ['Project', [['smokes', 'Smoke tests'], ['log', 'Daily log'], ['work', 'Specs and branches'], ['parking', 'Parking lot'], ['metrics', 'Metrics']]],
];
const route = () => { const [name, arg] = location.hash.replace(/^#\/?/, '').split('/'); return { name: name || 'today', arg: arg || '' }; };

function renderNav() {
  const cur = route().name;
  let h = '';
  for (const [title, items] of NAV) {
    if (title) h += '<div class="grp">' + title + '</div>';
    for (const [key, label] of items) {
      const n = META.nav[key];
      h += '<a href="#/' + key + '" class="' + (key === cur ? 'on' : '') + '">' + label + (n === undefined ? '' : '<span class="n' + (n ? '' : ' zero') + '">' + n + '</span>') + '</a>';
    }
  }
  if (META.pages.length) {
    h += '<div class="grp">Project pages</div>';
    for (const p of META.pages) h += '<a href="#/page/' + esc(p.file.replace(/\.html$/, '')) + '" class="' + (cur === 'page' && route().arg + '.html' === p.file ? 'on' : '') + '">' + esc(p.title) + '</a>';
  }
  $('#nav').innerHTML = h;
  $('#project').textContent = META.project || 'Dev dash';
  document.title = (META.project ? META.project + ': ' : '') + 'dev dash';
  const f = META.fetched || {};
  $('#reading').innerHTML = 'Reading ' + esc(META.reading || '') + (f.at ? '<br>fetched ' + hhmm(f.at) + (f.ok === false ? ' <span class="pill bad">fetch failed</span>' : '') : '');
}

async function loadMeta() { META = await api('/api/meta'); renderNav(); }

const PAGES = {};
let leave = null; // cleanup for the page being left (timers)

async function show() {
  if (leave) { leave(); leave = null; }
  const r = route();
  renderNav();
  const main = $('#main');
  try {
    const page = PAGES[r.name] || PAGES.today;
    main.innerHTML = await page(r.arg);
    if (page.after) page.after(main);
  } catch (err) {
    main.innerHTML = '<div class="card bad"><b>This page could not load.</b><div>' + esc(err.message) + '</div></div>';
  }
  window.scrollTo(0, 0);
}

const pill = (text, cls) => '<span class="pill ' + (cls || '') + '">' + esc(text) + '</span>';
const exampleTag = (x) => (x ? ' ' + pill('example', 'info') : '');
const table = (head, rows) => '<div class="tablewrap"><table><tr>' + head.map((h) => '<th>' + h + '</th>').join('') + '</tr>' + rows.join('') + '</table></div>';

// ---- Today -----------------------------------------------------------------

PAGES.today = async () => {
  const d = await api('/api/home');
  const c = d.counts;
  let h = '<h1>Today</h1><p class="lede">Where the project is, what is waiting on you, and what happened lately. Everything here is read from the repository; nothing is typed in.</p>';
  h += '<div class="kpis">'
    + '<a class="kpi" href="#/questions"><b>' + c.waiting + '</b><span>Waiting on you</span></a>'
    + '<a class="kpi" href="#/smokes"><b>' + c.smokesOpen + '</b><span>Smokes still open</span></a>'
    + '<a class="kpi" href="#/smokes"><b>' + c.smokesDeferred + '</b><span>Smokes deferred</span></a>'
    + '<a class="kpi" href="#/work"><b>' + (c.pulls === null ? 'n/a' : c.pulls) + '</b><span>Open pull requests</span></a></div>';

  h += '<h2>Waiting on you</h2>';
  if (!d.waiting.length && !d.debt.length && !d.failed.length) h += '<div class="empty">Nothing is waiting on you.</div>';
  for (const w of d.waiting) {
    h += '<a class="card link' + (w.flag ? ' warn' : '') + (w.example ? ' example' : '') + '" href="#/' + w.kind + '/' + esc(w.id) + '"><div class="row"><div class="grow"><b>' + esc(w.title) + '</b>' + exampleTag(w.example)
      + '<div class="muted">' + esc(w.detail) + '</div></div>' + pill(w.kind === 'questions' ? 'Questions' : 'Sitting', 'info') + '</div></a>';
  }
  if (d.failed.length) h += '<a class="card link bad" href="#/smokes"><b>' + plural(d.failed.length, 'smoke test') + ' failed</b><div class="muted">' + d.failed.map((f) => esc(f.id)).join(', ') + '</div></a>';
  if (d.debt.length) {
    h += '<h3>Deferred smoke tests, by due date</h3>' + table(['ID', 'Test', 'Owner', 'Due'], d.debt.map((x) => '<tr><td class="mono">' + esc(x.id) + '</td><td>' + inline(x.title) + '</td><td>' + esc(x.owner) + '</td><td>' + (x.due ? esc(x.due) : '<span class="muted">no date</span>') + (x.overdue ? ' ' + pill('overdue', 'bad') : '') + '</td></tr>'));
  }
  if (d.agentOwes.length) {
    h += '<h2>Waiting on the agent</h2><div class="card">' + d.agentOwes.map((a) => '<div>' + (a.href ? '<a href="' + a.href + '">' + esc(a.text) + '</a>' : esc(a.text)) + '</div>').join('') + '<div class="muted" style="margin-top:6px">It picks these up by itself at the start of its next session. You do not need to ask.</div></div>';
  }

  h += '<h2>Where the project is</h2>';
  const st = d.state;
  if (st.phase || st.summary) {
    h += '<div class="card doc">' + (st.phase ? '<div class="qlabel" style="margin-top:0">Active phase</div>' + prose(st.phase) : '') + (st.summary ? '<div class="qlabel">In short</div>' + prose(st.summary) : '')
      + (st.notes ? '<div class="qlabel">Blockers and notes</div>' + prose(st.notes) : '') + '</div>';
  } else h += '<div class="empty">No current phase written yet. It appears here once <code>docs/KB_8_Current_State.md</code> is filled in.</div>';
  if (d.lag) h += '<p class="muted">The main checkout has ' + [d.lag.ahead ? plural(d.lag.ahead, 'commit') + ' not on ' + esc(META.reading) : '', d.lag.dirty ? plural(d.lag.dirty, 'uncommitted file') : ''].filter(Boolean).join(' and ') + '. Project pages show ' + esc(META.reading) + '.</p>';

  h += '<h2>Lately</h2>';
  if (!d.recentLog.length) h += '<div class="empty">Nothing recorded in the last month.</div>';
  for (const e of d.recentLog) h += dayCard(e);
  if (d.recentLog.length) h += '<p><a href="#/log">The whole daily log</a></p>';
  if (d.commits.length) {
    h += '<h3>Latest commits on ' + esc(META.reading) + '</h3>' + table(['Commit', 'Date', 'Subject'], d.commits.map((x) => '<tr><td class="mono">' + esc(x.hash) + '</td><td class="mono muted">' + esc(x.date) + '</td><td>' + esc(x.subject) + '</td></tr>'));
  }
  return h;
};

// ---- Daily log -------------------------------------------------------------

function factsHtml(f) {
  if (!f) return '';
  const sec = (title, items, fmt) => (items.length ? '<h3>' + title + '</h3><ul>' + items.map((x) => '<li>' + fmt(x) + '</li>').join('') + '</ul>' : '');
  const work = f.commits.filter((c) => !c.logOnly);
  const body = sec('Merged pull requests', f.merged, (m) => '#' + m.number + ' ' + esc(m.subject))
    + sec('Shipped', f.shipped, inline)
    + sec('Specs locked', f.specsLocked, (s) => esc(s.title))
    + sec('Smoke tests passed', f.smokesPassed, (s) => '<span class="mono">' + esc(s.id) + '</span> ' + inline(s.title))
    + sec('Smoke tests failed', f.smokesFailed, (s) => '<span class="mono">' + esc(s.id) + '</span> ' + inline(s.title))
    + sec('You answered', f.answered, (a) => '<a href="#/questions/' + esc(a.run) + '">' + esc(a.run) + '</a> (' + a.answered + ' of ' + a.total + ')')
    + sec('You tested', f.sittings, (s) => '<a href="#/sittings/' + esc(s.sitting) + '">' + esc(s.sitting) + '</a>: ' + s.pass + ' pass, ' + s.fail + ' fail, ' + s.skip + ' skip, ' + clock(s.seconds))
    + sec('Commits', work, (c) => '<span class="mono">' + esc(c.hash) + '</span> ' + esc(c.subject) + (c.onDefault ? '' : ' <span class="muted">(branch)</span>'));
  if (!body) return '';
  const bits = [work.length ? plural(work.length, 'commit') : '', f.merged.length ? plural(f.merged.length, 'pull request') + ' merged' : '', f.smokesPassed.length ? plural(f.smokesPassed.length, 'smoke') + ' passed' : ''].filter(Boolean).join(', ');
  return '<details class="facts"><summary>The facts' + (bits ? ': ' + bits : '') + '</summary>' + body + '</details>';
}

function dayCard(e) {
  return '<div class="card day"><div class="when">' + esc(e.day) + '</div><h2>' + (e.title ? esc(e.title) : esc(weekday(e.day))) + '</h2>'
    + (e.title ? '<div class="muted" style="margin-bottom:8px">' + esc(weekday(e.day)) + '</div>' : '')
    + (e.body ? '<div class="doc">' + prose(e.body) + '</div>' : '<div class="muted">No summary written yet. The facts below are read straight from the repository.</div>')
    + factsHtml(e.facts) + '</div>';
}

PAGES.log = async () => {
  const d = await api('/api/log');
  let h = '<h1>Daily log</h1><p class="lede">One entry per working day, newest first. The agent writes the summary; the facts under it are read from git, the smoke list and what you did here.</p>';
  if (!d.entries.length) h += '<div class="empty">No days recorded yet.</div>';
  for (const e of d.entries) h += dayCard(e);
  return h;
};

// ---- Questions -------------------------------------------------------------

let RUN = null;
const answerOf = (qid) => (RUN.answers && RUN.answers.answers[qid]) || { pick: '', own: '', note: '' };
const answered = (qid) => { const a = answerOf(qid); return !!((a.pick && a.pick !== 'own') || (a.own || '').trim() || (a.note || '').trim()); };

PAGES.questions = async (id) => {
  const runs = await api('/api/questions');
  const good = runs.filter((r) => !r.problems.length);
  const live = good.filter((r) => r.status === 'active');
  const past = good.filter((r) => r.status !== 'active');
  const pickId = id || (live.find((r) => !r.submittedAt) || live[0] || past[0] || {}).id;
  let h = '';
  const broken = runs.filter((r) => r.problems.length);
  if (broken.length) h += '<div class="card bad"><b>The agent wrote a question run that cannot be shown.</b>' + broken.map((b) => '<div class="mono">' + esc(b.id) + ': ' + esc(b.problems.join(' ')) + '</div>').join('') + '</div>';
  if (!pickId) return '<h1>Questions</h1><p class="lede">When the agent has three or more decisions for you, they arrive here as a run you answer by clicking.</p>' + h + '<div class="empty">No question runs yet.</div>';
  const d = await api('/api/questions/' + pickId);
  RUN = { id: pickId, run: d.run, answers: d.answers || { answers: {}, general: '', submittedAt: '' }, meta: d, locked: d.status !== 'active' };
  const R = RUN.run;
  const tab = (r) => '<a class="btn' + (r.id === pickId ? ' on' : '') + '" href="#/questions/' + esc(r.id) + '">' + esc(r.title) + ' <span class="muted">' + r.answered + '/' + r.total + '</span></a>';
  h += '<h1>' + esc(R.title) + exampleTag(R.example) + (RUN.locked ? ' ' + pill('archived') : '') + '</h1><p class="lede">' + inline(R.intro || '') + '</p>';
  if (live.length > 1 || (live.length === 1 && live[0].id !== pickId)) h += '<div class="toolbar">' + live.map(tab).join('') + '</div>';
  if (RUN.locked && R.outcome) h += '<div class="card"><b>Outcome</b><div>' + inline(R.outcome) + '</div></div>';
  if (past.length) {
    h += '<details' + (RUN.locked ? ' open' : '') + '><summary>Past runs (' + past.length + ')</summary>' + table(['Date', 'Run', 'Answered'], past.map((r) => '<tr><td class="mono">' + esc(r.date) + '</td><td><a href="#/questions/' + esc(r.id) + '">' + esc(r.title) + '</a><div class="muted">' + inline(r.outcome) + '</div></td><td class="mono">' + r.answered + '/' + r.total + '</td></tr>')) + '</details>';
  }
  const groups = R.groups && R.groups.length ? R.groups : [{ key: '', title: 'Questions for you' }];
  const inGroup = (g) => R.questions.filter((q) => (g.key ? q.group === g.key : !q.group || !groups.some((x) => x.key === q.group)));
  h += '<div class="qtop"><div class="prog" id="qprog"></div><div class="qjump">' + groups.map((g, i) => '<a href="#" data-act="jump" data-to="qs-' + esc(g.key) + '" style="--tc:' + COLORS[i % COLORS.length] + '"><i></i>' + esc(g.title) + ' <span class="mono muted" id="qt-' + esc(g.key) + '"></span></a>').join('') + '</div></div>';
  groups.forEach((g, i) => {
    const color = COLORS[i % COLORS.length];
    h += '<div class="qsec" id="qs-' + esc(g.key) + '" style="--tc:' + color + '"><h2><i></i>' + esc(g.title) + '</h2>' + (g.intro ? '<div class="muted">' + inline(g.intro) + '</div>' : '') + '</div>';
    for (const q of inGroup(g)) h += questionCard(q, color);
  });
  h += '<div class="card"><b>Anything else</b><textarea id="general" data-in="general" placeholder="A note about the whole run"' + (RUN.locked ? ' disabled' : '') + '>' + esc(RUN.answers.general || '') + '</textarea></div>';
  h += '<div class="submitbar"><button class="primary" data-act="submit-run"' + (RUN.locked ? ' disabled' : '') + '>Submit answers</button><div class="grow muted" id="substate"></div></div>';
  return h;
};
PAGES.questions.after = () => refreshRun();

function questionCard(q, color) {
  const a = answerOf(q.id);
  const dis = RUN.locked ? ' disabled' : '';
  let h = '<div class="qcard' + (answered(q.id) ? ' ans' : '') + '" id="q-' + esc(q.id) + '" style="--tc:' + color + '">'
    + '<div class="qhead"><span class="qid">' + esc(q.id) + '</span><span class="qtitle">' + inline(q.question) + '</span><span class="qok">answered</span></div>';
  if (q.context) h += '<div class="qlabel">Background</div><div class="qctx">' + prose(q.context) + '</div>';
  h += '<div class="qlabel">Options <small>· click one</small></div><div class="opts">';
  for (const o of q.options) {
    h += '<button type="button" class="opt k' + esc(o.key) + (a.pick === o.key ? ' picked' : '') + '" data-act="pick" data-q="' + esc(q.id) + '" data-k="' + esc(o.key) + '" aria-pressed="' + (a.pick === o.key) + '"' + dis + '><span class="ok">' + esc(o.key) + '</span><span><b>' + inline(o.label) + '</b>'
      + (q.recommend === o.key ? ' <span class="rtag">Recommended</span>' : '') + (o.detail ? '<div class="od">' + inline(o.detail) + '</div>' : '') + '</span></button>';
  }
  h += '<button type="button" class="opt kown' + (a.pick === 'own' ? ' picked' : '') + '" data-act="pick" data-q="' + esc(q.id) + '" data-k="own" aria-pressed="' + (a.pick === 'own') + '"' + dis + '><span class="ok">+</span><span><b>Something else</b><div class="od">Write your own answer.</div></span></button></div>';
  h += '<div class="own"' + (a.pick === 'own' || (a.own || '').trim() ? '' : ' hidden') + '><div class="qlabel">Your own answer</div><textarea data-in="own" data-q="' + esc(q.id) + '" placeholder="What should happen instead"' + dis + '>' + esc(a.own || '') + '</textarea></div>';
  if (q.recommend) h += '<div class="qrec"><div class="qlabel">Recommendation: ' + esc(q.recommend) + '</div>' + prose(q.reason) + '</div>';
  h += '<div class="qlabel">Note <small>· optional</small></div><textarea data-in="note" data-q="' + esc(q.id) + '" placeholder="Anything to add: a condition, a worry, not yet"' + dis + '>' + esc(a.note || '') + '</textarea></div>';
  return h;
}

function refreshRun() {
  if (!RUN || !$('#qprog')) return;
  const qs = RUN.run.questions;
  const n = qs.filter((q) => answered(q.id)).length;
  $('#qprog').innerHTML = '<b>' + n + ' / ' + qs.length + '</b><div class="bar"><i style="width:' + (100 * n / qs.length) + '%"></i></div><span class="muted">answered</span>';
  for (const q of qs) { const c = document.getElementById('q-' + q.id); if (c) c.classList.toggle('ans', answered(q.id)); }
  const groups = RUN.run.groups && RUN.run.groups.length ? RUN.run.groups : [{ key: '' }];
  for (const g of groups) {
    const el = document.getElementById('qt-' + g.key);
    const mine = qs.filter((q) => (g.key ? q.group === g.key : true));
    if (el) el.textContent = mine.filter((q) => answered(q.id)).length + '/' + mine.length;
  }
  const a = RUN.answers;
  const sub = $('#substate');
  if (RUN.locked) sub.textContent = 'This run is archived. The answers are final.';
  else if (a.submittedAt && a.changedSinceSubmit) sub.innerHTML = '<b>Changed since you submitted.</b> Submit again so the agent sees the change.';
  else if (a.submittedAt) sub.innerHTML = '<b>Submitted ' + esc(dayTime(a.submittedAt)) + '.</b> The agent reads your answers at the start of its next session. You do not need to tell it. You can still change an answer and submit again.';
  else sub.textContent = 'Answers save as you go. Submit when you are done; unanswered questions are fine.';
}

const noteTimers = {};
function debounce(key, fn, ms = 500) { clearTimeout(noteTimers[key]); noteTimers[key] = setTimeout(fn, ms); }

async function saveAnswer(patch) {
  try { RUN.answers = (await api('/api/questions/' + RUN.id + '/answer', patch)).answers; saved(); refreshRun(); loadMeta(); } catch (err) { toast(err.message, true); }
}

// ---- Sittings --------------------------------------------------------------

let SIT = null;

PAGES.sittings = async (id) => {
  if (id) return sittingPage(id);
  const all = await api('/api/sittings');
  let h = '<h1>Sittings</h1><p class="lede">A sitting is one guided pass through something only a person can check. Press Start, follow the steps, mark each one Pass, Fail or Skip. The agent reads the result and updates the smoke list.</p>';
  const broken = all.filter((s) => s.problems.length);
  if (broken.length) h += '<div class="card bad"><b>The agent wrote a sitting that cannot be shown.</b>' + broken.map((b) => '<div class="mono">' + esc(b.id) + ': ' + esc(b.problems.join(' ')) + '</div>').join('') + '</div>';
  const good = all.filter((s) => !s.problems.length);
  const open = good.filter((s) => s.status === 'active' && s.state !== 'finished');
  const done = good.filter((s) => s.status === 'active' && s.state === 'finished');
  const closed = good.filter((s) => s.status !== 'active');
  const card = (s) => {
    const c = s.counts;
    const state = s.state === 'ready' ? 'Not started' : s.state === 'finished' ? 'Finished ' + dayTime(s.finishedAt) : 'In progress';
    return '<a class="card link' + (s.idle ? ' warn' : '') + (s.example ? ' example' : '') + '" href="#/sittings/' + esc(s.id) + '"><div class="row"><div class="grow"><b>' + esc(s.title) + '</b>' + exampleTag(s.example)
      + '<div class="muted">' + esc(state) + ' · ' + plural(s.steps, 'step') + (s.environment ? ' · ' + esc(s.environment.name) : '') + (s.seconds ? ' · ' + clock(s.seconds) : '')
      + (s.state !== 'ready' ? ' · ' + c.pass + ' pass, ' + c.fail + ' fail, ' + c.skip + ' skip' : '') + (s.idle ? ' · untouched for a while' : '') + '</div>'
      + (s.smokes.length ? '<div style="margin-top:4px">' + s.smokes.map((x) => '<span class="sm">' + esc(x) + '</span>').join(' ') + '</div>' : '') + '</div>'
      + '<span class="btn' + (s.state === 'finished' ? '' : ' primary') + '">' + (s.state === 'ready' ? 'Open' : s.state === 'finished' ? 'View' : 'Resume') + '</span></div></a>';
  };
  h += '<h2>To run</h2>' + (open.length ? open.map(card).join('') : '<div class="empty">No sittings are waiting.</div>');
  if (done.length) h += '<h2>Finished, waiting for the agent to record</h2>' + done.map(card).join('');
  if (closed.length) h += '<details><summary>Closed sittings (' + closed.length + ')</summary>' + closed.map((s) => '<a class="card link" href="#/sittings/' + esc(s.id) + '"><b>' + esc(s.title) + '</b><div class="muted">' + esc(s.date) + ' · ' + inline(s.outcome) + '</div></a>').join('') + '</details>';
  return h;
};

async function sittingPage(id) {
  const d = await api('/api/sittings/' + id);
  if (!d.sitting) return '<a class="back" href="#/sittings">All sittings</a><div class="card bad"><b>This sitting cannot be shown.</b><div>' + esc(d.problems.join(' ')) + '</div></div>';
  const r = d.results;
  SIT = { id, def: d.sitting, res: r, linked: d.linked, closed: d.status !== 'active', open: 0, base: 0, syncAt: Date.now(), lastInput: Date.now() };
  sync(r);
  const firstOpen = d.sitting.steps.find((s) => !r || !(r.steps[s.n] || {}).result);
  SIT.open = r && r.state !== 'finished' ? (r.currentStep && d.sitting.steps.some((s) => s.n === r.currentStep) && !(r.steps[r.currentStep] || {}).result ? r.currentStep : firstOpen ? firstOpen.n : 0) : firstOpen && !r ? firstOpen.n : 0;
  return '<a class="back" href="#/sittings">All sittings</a><div id="sit"></div>';
}
PAGES.sittings.after = () => {
  if (!SIT || !$('#sit')) return;
  drawSitting();
  const timer = setInterval(() => { drawClock(); idleCheck(); }, 1000);
  const beat = setInterval(() => { if (running()) act('tick', { step: SIT.open || 0 }, true); }, 20000);
  leave = () => { clearInterval(timer); clearInterval(beat); if (running()) beacon(); SIT = null; };
};

const running = () => !!(SIT && SIT.res && SIT.res.state === 'running');
const started = () => !!(SIT && SIT.res);
const editable = () => started() && SIT.res.state !== 'finished' && !SIT.closed;
function sync(res) { if (!SIT) return; SIT.res = res; SIT.base = res ? res.activeSeconds : 0; SIT.syncAt = Date.now(); }
const elapsed = () => SIT.base + (running() ? (Date.now() - SIT.syncAt) / 1000 : 0);
const stepRes = (n) => (SIT.res && SIT.res.steps[n]) || { result: '', checks: [], note: '', shots: [], seconds: 0 };
function beacon() { try { navigator.sendBeacon('/api/sittings/' + SIT.id + '/tick', new Blob([JSON.stringify({ step: SIT.open || 0 })], { type: 'application/json' })); } catch { /* best effort */ } }

async function act(action, body, silent) {
  if (!SIT) return;
  try {
    const out = await api('/api/sittings/' + SIT.id + '/' + action, body || {});
    if (!SIT) return;
    sync(out.results);
    if (!silent) { saved(); drawBar(); }
  } catch (err) { if (!silent) toast(err.message, true); }
}

function idleCheck() {
  if (running() && Date.now() - SIT.lastInput > 20 * 60 * 1000) {
    act('pause', { step: SIT.open || 0 }).then(() => toast('Paused: nothing was clicked here for 20 minutes. Press Resume to carry on.', true));
    SIT.lastInput = Date.now();
  }
}

function drawClock() {
  const el = $('#clock');
  if (!el || !SIT) return;
  el.textContent = clock(elapsed());
  el.classList.toggle('paused', started() && SIT.res.state === 'paused');
  if (running() && SIT.open) {
    const t = document.querySelector('.step[data-n="' + SIT.open + '"] .time');
    if (t) t.textContent = clock((stepRes(SIT.open).seconds || 0) + (Date.now() - SIT.syncAt) / 1000);
  }
}

function drawBar() {
  const el = $('#runbar');
  if (!el || !SIT) return;
  const total = SIT.def.steps.length;
  const done = SIT.def.steps.filter((s) => stepRes(s.n).result).length;
  const st = SIT.res ? SIT.res.state : 'ready';
  const label = { ready: 'Not started', running: 'Timing', paused: 'Paused', finished: 'Finished ' + dayTime(SIT.res && SIT.res.finishedAt) }[st];
  let btns = '';
  if (SIT.closed) btns = '';
  else if (st === 'ready') btns = '<button class="primary" data-act="sit-start">Start</button>';
  else if (st === 'running') btns = '<button class="btn" data-act="sit-pause">Pause</button><button class="btn" data-act="sit-finish">Finish</button>';
  else if (st === 'paused') btns = '<button class="primary" data-act="sit-resume">Resume</button><button class="btn" data-act="sit-finish">Finish</button>';
  else btns = '<button class="btn" data-act="sit-reopen">Reopen</button>';
  el.innerHTML = '<div class="top"><div class="clock" id="clock">' + clock(elapsed()) + '</div><div class="runstate">' + esc(label) + (SIT.res && SIT.res.savedAt ? ' · saved ' + hhmm(SIT.res.savedAt) : '') + '</div>' + btns + '</div>'
    + '<div class="prog"><b>' + done + ' / ' + total + '</b><div class="bar"><i style="width:' + (100 * done / total) + '%"></i></div><span class="muted">steps</span></div>';
  drawClock();
}

function chip(text) { return '<button type="button" class="login" data-act="copy" data-text="' + esc(text) + '" title="Click to copy">' + esc(text) + '</button>'; }
function whereLink(where) {
  const env = SIT.def.environment || {};
  const url = /^https?:\/\//.test(where) ? where : (env.url && where.startsWith('/') ? env.url.replace(/\/$/, '') + where : '');
  return url ? '<a class="path" href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(where) + '</a>' : '<span class="path">' + esc(where) + '</span>';
}
const signInOf = (v) => (typeof v === 'string' ? { as: v, note: '' } : v || null);

function stepHtml(st) {
  const r = stepRes(st.n);
  const open = SIT.open === st.n;
  const can = editable();
  const dos = list(st.do);
  const title = st.title || dos[0];
  const exp = list(st.expect);
  const met = exp.filter((_, i) => (r.checks || [])[i]).length;
  let h = '<div class="step' + (r.result ? ' r-' + r.result : '') + (open ? ' open' : '') + '" data-n="' + st.n + '" id="st-' + st.n + '">'
    + '<span class="num">' + st.n + '</span><button type="button" class="hd" data-act="step-toggle" aria-expanded="' + open + '"><b>' + inline(title) + '</b>'
    + (st.smokes || []).map((x) => '<span class="sm">' + esc(x) + '</span>').join('')
    + (r.result ? ' ' + pill({ pass: 'Pass', fail: 'Fail', skip: 'Skip' }[r.result], { pass: 'ok', fail: 'bad', skip: 'warn' }[r.result]) : '')
    + '<span class="time">' + (r.seconds ? clock(r.seconds) : '') + '</span></button>';
  if (!open) {
    const bits = [r.note ? r.note.slice(0, 140) : '', (r.shots || []).length ? plural(r.shots.length, 'screenshot') : ''].filter(Boolean).join(' · ');
    return h + (bits ? '<div class="brief">' + esc(bits) + '</div>' : '') + '</div>';
  }
  const who = signInOf(st.signIn);
  if (who || st.where) h += '<div class="who">' + (who ? 'Sign in as ' + chip(who.as) : '') + (st.where ? (who ? ' then go to ' : 'Go to ') + whereLink(st.where) : '') + '</div>';
  if (st.title || dos.length > 1) h += '<ol class="do">' + dos.map((x) => '<li>' + inline(x) + '</li>').join('') + '</ol>';
  h += '<div class="expect"><span class="l">Expect' + (exp.length > 1 ? '<span class="met">' + met + ' of ' + exp.length + ' seen</span>' : '') + '</span><ul class="ticks">'
    + exp.map((x, i) => '<li><label><input type="checkbox" data-in="check" data-i="' + i + '"' + ((r.checks || [])[i] ? ' checked' : '') + (can ? '' : ' disabled') + '><span>' + inline(x) + '</span></label></li>').join('') + '</ul></div>';
  if ((st.shots || []).length) h += '<div class="refs">' + st.shots.map((s) => '<div class="ref"><img src="/ref/' + esc(SIT.id) + '/' + esc(s.file) + '" data-act="zoom" alt="Reference screenshot" loading="lazy"><div class="cap"><b>What right looks like</b>' + (s.caption ? ' · ' + inline(s.caption) : '') + '</div></div>').join('') + '</div>';
  const vb = (k, label, key) => '<button type="button" class="vbtn ' + k + (r.result === k ? ' on' : '') + '" data-act="result" data-r="' + k + '" aria-pressed="' + (r.result === k) + '"' + (can ? '' : ' disabled') + '>' + label + '<kbd>' + key + '</kbd></button>';
  h += '<div class="vbtns">' + vb('pass', 'Pass', 'P') + vb('fail', 'Fail', 'F') + vb('skip', 'Skip', 'S') + '</div>';
  h += '<textarea class="nt" data-in="step-note" placeholder="Notes: what you saw, what differed, questions"' + (can ? '' : ' disabled') + '>' + esc(r.note || '') + '</textarea>';
  if ((r.shots || []).length) h += '<div class="mine">' + r.shots.map((s) => '<div class="ref"><img src="/shots/' + esc(SIT.id) + '/' + esc(s.file) + '" data-act="zoom" alt="Your screenshot" loading="lazy"><input type="text" data-in="caption" data-file="' + esc(s.file) + '" placeholder="Caption" value="' + esc(s.caption || '') + '"' + (can ? '' : ' disabled') + '>' + (can ? '<button type="button" class="x" data-act="shot-remove" data-file="' + esc(s.file) + '">remove</button>' : '') + '</div>').join('') + '</div>';
  if (can) h += '<div class="addrow"><label class="btn">Add screenshots<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple data-in="files"></label><span>or drop images on this step, or paste one</span></div>';
  else if (!started() && !SIT.closed) h += '<div class="muted">Press Start to begin.</div>';
  return h + '</div>';
}

function drawStep(n) {
  const st = SIT.def.steps.find((s) => s.n === n);
  const old = document.getElementById('st-' + n);
  if (st && old) old.outerHTML = stepHtml(st);
}

function drawSitting() {
  const S = SIT.def;
  const env = S.environment || {};
  const who = signInOf(S.signIn);
  const r = SIT.res;
  let h = '<h1>' + esc(S.title) + exampleTag(S.example) + (SIT.closed ? ' ' + pill('closed') : '') + '</h1>' + (S.intro ? '<p class="lede">' + inline(S.intro) + '</p>' : '');
  if (SIT.closed && S.outcome) h += '<div class="card"><b>Outcome</b><div>' + inline(S.outcome) + '</div></div>';
  h += '<div class="card"><dl class="info">'
    + '<dt>Where</dt><dd>' + esc(env.name || '') + (env.url ? ' · <a href="' + esc(env.url) + '" target="_blank" rel="noopener">' + esc(env.url) + '</a>' : '') + '</dd>'
    + (who ? '<dt>Sign in as</dt><dd>' + chip(who.as) + (who.note ? ' <span class="muted">' + inline(who.note) + '</span>' : '') + '</dd>' : '')
    + (list(S.prerequisites).length ? '<dt>Before you start</dt><dd>' + list(S.prerequisites).map(inline).join('<br>') + '</dd>' : '')
    + (SIT.linked.length ? '<dt>Covers</dt><dd>' + SIT.linked.map((l) => '<span class="sm" title="' + esc(l.missing ? 'Not in the smoke list being read yet' : l.title) + '">' + esc(l.id) + '</span>' + (l.missing ? ' <span class="muted">(not merged yet)</span>' : '')).join(' ') + '</dd>' : '')
    + '</dl></div>';
  h += '<div class="runbar" id="runbar"></div>';
  if (r && r.state === 'finished') {
    const c = { pass: 0, fail: 0, skip: 0, none: 0 };
    for (const st of S.steps) c[stepRes(st.n).result || 'none'] += 1;
    h += '<div class="card"><b>Finished in ' + clock(r.activeSeconds) + '.</b> ' + c.pass + ' pass, ' + c.fail + ' fail, ' + c.skip + ' skip' + (c.none ? ', ' + c.none + ' not run' : '') + '.<div class="muted">The agent reads this at the start of its next session and updates the smoke list from the steps you passed. You do not need to tell it.</div></div>';
  }
  h += '<div id="steps">' + S.steps.map(stepHtml).join('') + '</div>';
  h += '<div class="card"><b>Overall note</b><textarea id="sit-note" data-in="sit-note" placeholder="Anything about the sitting as a whole"' + (editable() ? '' : ' disabled') + '>' + esc((r && r.note) || '') + '</textarea>'
    + (editable() ? '<div style="margin-top:10px"><button class="primary" data-act="sit-finish">Finish sitting</button></div>' : '') + '</div>';
  if (editable()) h += '<p class="muted">Keys: P pass, F fail, S skip, J next step, K previous step.</p>';
  $('#sit').innerHTML = h;
  drawBar();
}

function openStep(n, scroll) {
  const prev = SIT.open;
  SIT.open = n;
  if (prev && prev !== n) drawStep(prev);
  if (n) drawStep(n);
  if (running()) act('tick', { step: n || prev || 0 }, true);
  if (n && scroll) { const el = document.getElementById('st-' + n); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
}

async function setResult(n, result) {
  if (!editable()) return;
  const cur = stepRes(n).result;
  const next = cur === result ? '' : result;
  try {
    // Send the note with the result, so text typed a moment ago is not lost to the redraw.
    const typed = document.querySelector('#st-' + n + ' textarea.nt');
    sync((await api('/api/sittings/' + SIT.id + '/step/' + n, typed ? { result: next, note: typed.value } : { result: next })).results);
    saved();
    drawBar();
    if (next === 'fail' || next === '') {
      drawStep(n);
      const ta = document.querySelector('#st-' + n + ' textarea.nt');
      if (ta && next === 'fail' && !ta.value) ta.focus();
      return;
    }
    const after = SIT.def.steps.find((s) => s.n > n && !stepRes(s.n).result) || SIT.def.steps.find((s) => !stepRes(s.n).result);
    openStep(after ? after.n : 0, true);
    if (!after) { drawStep(n); const b = $('#sit-note'); if (b) b.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  } catch (err) { toast(err.message, true); }
}

async function addShots(n, files) {
  if (!editable() || !n) return;
  const imgs = [...files].filter((f) => f && f.type.startsWith('image/'));
  if (!imgs.length) { toast('Images only: PNG, JPEG, WebP or GIF.', true); return; }
  for (const f of imgs) {
    try { sync((await api('/api/sittings/' + SIT.id + '/step/' + n + '/shot', f, f.type)).results); saved(); } catch (err) { toast(err.message, true); }
  }
  drawStep(n);
  const cap = $$('#st-' + n + ' .mine input').pop();
  if (cap) cap.focus();
}

// ---- Smoke tests -----------------------------------------------------------

PAGES.smokes = async (arg) => {
  const d = await api('/api/smokes');
  const f = arg || 'open';
  const c = d.counts;
  let h = '<h1>Smoke tests</h1><p class="lede">Read from <code>docs/smoke-tests-pending.md</code>. The agent keeps that file; a row closes only on evidence that matches its lane, and a visual row only when you pass it in a sitting.</p>';
  h += '<div class="toolbar">' + [['open', 'Open (' + c.open + ')'], ['deferred', 'Deferred (' + c.deferred + ')'], ['failed', 'Failed (' + c.failed + ')'], ['passed', 'Passed (' + c.passed + ')'], ['all', 'All']].map(([k, l]) => '<a class="btn' + (k === f ? ' on' : '') + '" href="#/smokes/' + k + '">' + l + '</a>').join('') + '</div>';
  if (d.unknown.length) h += '<div class="card">Sittings cover ' + d.unknown.map((x) => '<span class="sm">' + esc(x) + '</span>').join(' ') + ', which ' + (d.unknown.length === 1 ? 'is' : 'are') + ' not in the smoke list on ' + esc(META.reading) + ' yet (usually work that is not merged).</div>';
  const rows = d.rows.filter((r) => f === 'all' || r.bucket === f);
  if (!rows.length) return h + '<div class="empty">' + (d.rows.length ? 'Nothing in this view.' : 'The smoke list has no rows yet.') + '</div>';
  if (f === 'deferred') {
    h += '<h2>The debt, by due date</h2>' + table(['ID', 'Test', 'Owner', 'Deferred', 'Due'], [...rows].sort((a, b) => ((a.deferral || {}).due || '9999').localeCompare((b.deferral || {}).due || '9999')).map((r) => '<tr><td class="mono">' + esc(r.id) + '</td><td>' + inline(r.title) + '</td><td>' + esc((r.deferral || {}).owner || '') + '</td><td class="mono">' + esc((r.deferral || {}).deferred || '') + '</td><td class="mono">' + esc((r.deferral || {}).due || 'no date') + (r.overdue ? ' ' + pill('overdue', 'bad') : '') + '</td></tr>'));
  }
  const lanes = {};
  for (const r of rows) (lanes[r.laneName] = lanes[r.laneName] || []).push(r);
  const closedBy = { data: 'closed by a check against the data store', wiring: 'closed by running or tracing the code path', visual: 'closed only by a person looking', integration: 'closed by an end-to-end run' };
  for (const lane of Object.keys(lanes).sort()) {
    h += '<h2>' + esc(lane[0].toUpperCase() + lane.slice(1)) + ' <span class="muted" style="font-weight:400">· ' + (closedBy[lane] || 'no lane given') + '</span></h2>';
    h += table(['ID', 'Test', 'Status', 'Sitting'], lanes[lane].map((r) => {
      const cover = r.sittings.map((s) => '<div><a href="#/sittings/' + esc(s.sitting) + '">' + esc(s.title) + '</a> ' + pill({ pass: 'you passed it', fail: 'you failed it', skip: 'skipped', partial: 'part done', 'not run': 'not run yet', 'no step': 'no step' }[s.verdict], { pass: 'ok', fail: 'bad', skip: 'warn' }[s.verdict] || '') + '</div>').join('');
      const none = r.needsPerson && r.bucket !== 'passed' ? pill('no sitting yet', 'warn') : '<span class="muted">not needed</span>';
      return '<tr><td class="mono">' + esc(r.id) + '</td><td>' + inline(r.title) + (r.liveRequired ? ' ' + pill('live-required', 'bad') : '') + '<div class="muted">' + esc(r.section) + '</div></td><td>' + pill(r.bucket === 'open' ? 'open' : r.bucket, { passed: 'ok', failed: 'bad', deferred: 'warn' }[r.bucket] || 'info') + '<div class="muted">' + inline(r.status) + (r.trace ? ' · trace-verified ' + esc(r.trace) : '') + '</div></td><td>' + (cover || none) + '</td></tr>';
    }));
  }
  return h;
};

// ---- Specs and branches, parking lot, metrics, project pages --------------

PAGES.work = async () => {
  const d = await api('/api/work');
  let h = '<h1>Specs and branches</h1><p class="lede">What is planned and what is in flight, read from <code>docs/plans/</code>, git and the pull request list.</p>';
  h += '<h2>Specs</h2>' + (d.plans.length ? table(['Spec', 'Status', 'Record'], d.plans.map((p) => '<tr><td><b>' + esc(p.title) + '</b><div class="mono muted">docs/plans/' + esc(p.slug) + '</div></td><td>' + (p.status === 'locked' ? pill('locked ' + p.lockedOn, 'ok') : p.status === 'draft' ? pill('draft', 'warn') : pill('no spec yet')) + (p.statusLine ? '<div class="muted">' + esc(p.statusLine) + '</div>' : '') + '</td><td class="muted">' + [p.hasBrainstorm ? 'brainstorm' : '', p.rounds ? plural(p.rounds, 'review round') : '', p.gates ? plural(p.gates, 'gate result') : ''].filter(Boolean).join(', ') + '</td></tr>')) : '<div class="empty">No specs yet.</div>');
  h += '<h2>Open pull requests</h2>';
  if (!d.pulls.available) h += '<div class="empty">Not shown: ' + esc(d.pulls.why) + '.</div>';
  else h += d.pulls.list.length ? table(['', 'Title', 'Branch', 'Updated'], d.pulls.list.map((p) => '<tr><td class="mono"><a href="' + esc(p.url) + '" target="_blank" rel="noopener">#' + p.number + '</a></td><td>' + esc(p.title) + (p.isDraft ? ' ' + pill('draft') : '') + (p.reviewDecision === 'APPROVED' ? ' ' + pill('approved', 'ok') : '') + '</td><td class="mono muted">' + esc(p.headRefName) + ' into ' + esc(p.baseRefName) + '</td><td class="mono muted">' + esc(String(p.updatedAt).slice(0, 10)) + '</td></tr>')) : '<div class="empty">No open pull requests.</div>';
  h += '<h2>Checkouts</h2>' + (d.worktrees.length ? table(['Branch', 'State', 'Last commit'], d.worktrees.map((w) => '<tr><td class="mono">' + esc(w.branch) + (w.main ? ' ' + pill('main checkout', 'info') : '') + '<div class="muted">' + esc(w.path) + '</div></td><td>' + (w.ahead ? pill(plural(w.ahead, 'commit') + ' not merged', 'info') : pill('nothing unmerged', 'ok')) + (w.dirty ? ' ' + pill(w.dirty + ' uncommitted', 'warn') : '') + (w.behind ? ' <span class="muted mono">' + w.behind + ' behind</span>' : '') + '</td><td><span class="mono muted">' + esc(w.last.hash) + ' ' + esc(w.last.date) + '</span><div>' + esc(w.last.subject) + '</div></td></tr>')) : '<div class="empty">Not a git repository.</div>');
  if (d.branches.length) h += '<h2>Other local branches</h2>' + table(['Branch', 'State', 'Last commit'], d.branches.map((b) => '<tr><td class="mono">' + esc(b.name) + '</td><td>' + (b.ahead ? pill(plural(b.ahead, 'commit') + ' not merged', 'info') : pill('merged', 'ok')) + '</td><td><span class="mono muted">' + esc(b.date) + '</span> ' + esc(b.subject) + '</td></tr>'));
  return h;
};

PAGES.parking = async () => {
  const d = await api('/api/parking');
  const item = (p) => '<div class="card">' + (p.date ? '<span class="mono muted">' + esc(p.date) + '</span> ' : '') + '<span class="prose">' + inline(p.text) + '</span></div>';
  let h = '<h1>Parking lot</h1><p class="lede">Ideas and defects noticed along the way, read from <code>docs/PARKING_LOT.md</code>. Candidates for the next phase, not committed work.</p>';
  h += d.open.length ? d.open.map(item).join('') : '<div class="empty">Nothing parked.</div>';
  if (d.adopted.length) h += '<details><summary>Adopted into scope (' + d.adopted.length + ')</summary>' + d.adopted.map(item).join('') + '</details>';
  if (d.resolved.length) h += '<details><summary>Resolved or dropped (' + d.resolved.length + ')</summary>' + d.resolved.map(item).join('') + '</details>';
  return h;
};

function spark(series) {
  const vals = series.map((v) => (v === null ? 0 : v));
  const max = Math.max(...vals, 1);
  const min = Math.min(...vals, 0);
  const pts = vals.map((v, i) => (i * 100 / Math.max(1, vals.length - 1)).toFixed(1) + ',' + (34 - 32 * (v - min) / (max - min || 1)).toFixed(1)).join(' ');
  return '<svg viewBox="0 0 100 36" preserveAspectRatio="none" role="img" aria-label="Last 14 days"><polyline points="' + pts + '" vector-effect="non-scaling-stroke"></polyline></svg>';
}

PAGES.metrics = async () => {
  const d = await api('/api/metrics');
  let h = '<h1>Metrics</h1><p class="lede">Numbers the project sends here: counters, gauges and events. Nothing is typed in; if nothing sends a number, it is not measured.</p>';
  if (!d.metrics.length) h += '<div class="empty">Nothing has been sent yet.</div>';
  else {
    h += '<div class="tiles">' + d.metrics.map((m) => '<div class="card tile"><span class="muted mono">' + esc(m.name) + '</span><b>' + (m.kind === 'gauge' ? m.last : m.kind === 'event' ? m.count : m.total) + '</b><span class="muted">' + (m.kind === 'gauge' ? 'latest value' : m.kind === 'event' ? 'events in all' : 'total') + ' · last ' + esc(dayTime(m.lastAt)) + '</span>' + spark(m.series) + '</div>').join('') + '</div>';
    h += '<h2>Latest</h2>' + table(['When', 'Name', 'Kind', 'Value', 'Note'], d.recent.map((p) => '<tr><td class="mono muted">' + esc(dayTime(p.at)) + '</td><td class="mono">' + esc(p.name) + '</td><td>' + esc(p.kind) + '</td><td class="mono">' + esc(p.value) + '</td><td>' + esc(p.note || '') + '</td></tr>'));
  }
  h += '<h2>Sending a number</h2><pre>curl -s -X POST http://localhost:' + esc(location.port || '4317') + '/api/metrics \\\n  -H "Authorization: Bearer $(cat devdash/.data/metrics-token)" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"name":"signups","kind":"counter","value":1}\'</pre><p class="muted">kind is counter (added up), gauge (latest value wins) or event (counted, with a note). See <code>devdash/README.md</code>.</p>';
  return h;
};

PAGES.page = async (name) => {
  const p = META.pages.find((x) => x.file === name + '.html');
  if (!p) return '<div class="empty">No such project page.</div>';
  return '<h1>' + esc(p.title) + '</h1><p class="lede">A project page from <code>devdash/pages/' + esc(p.file) + '</code>. <a href="/pages/' + esc(p.file) + '" target="_blank" rel="noopener">Open on its own</a></p><iframe class="page" src="/pages/' + esc(p.file) + '" title="' + esc(p.title) + '"></iframe>';
};

// ---- events ----------------------------------------------------------------

const stepOf = (el) => { const s = el.closest('.step'); return s ? Number(s.dataset.n) : 0; };

const ACTIONS = {
  refresh: async () => { await api('/api/refresh'); await loadMeta(); await show(); toast('Read again'); },
  theme: () => theme(theme() ? 'light' : 'dark'),
  'lightbox-close': () => $('#lightbox').classList.remove('show'),
  zoom: (el) => { $('#lightbox-img').src = el.src; $('#lightbox').classList.add('show'); },
  copy: (el) => { const t = el.dataset.text; if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => toast('Copied ' + t), () => toast('Could not copy', true)); },
  jump: (el, e) => { e.preventDefault(); const t = document.getElementById(el.dataset.to); if (t) t.scrollIntoView({ behavior: 'smooth' }); },
  pick: (el) => {
    const q = el.dataset.q;
    const k = answerOf(q).pick === el.dataset.k ? '' : el.dataset.k;
    const card = document.getElementById('q-' + q);
    $$('.opt', card).forEach((o) => { const on = o.dataset.k === k; o.classList.toggle('picked', on); o.setAttribute('aria-pressed', on); });
    $('.own', card).hidden = !(k === 'own' || $('.own textarea', card).value.trim());
    if (k === 'own') $('.own textarea', card).focus();
    saveAnswer({ question: q, pick: k });
  },
  'submit-run': async () => {
    try {
      RUN.answers = (await api('/api/questions/' + RUN.id + '/submit', { general: $('#general').value })).answers;
      toast('Submitted'); refreshRun(); loadMeta();
    } catch (err) { toast(err.message, true); }
  },
  'sit-start': async () => { await act('start'); if (started()) { drawSitting(); openStep(SIT.def.steps[0].n, true); } },
  'sit-pause': () => act('pause', { step: SIT.open || 0 }),
  'sit-resume': () => { SIT.lastInput = Date.now(); return act('resume', { step: SIT.open || 0 }); },
  'sit-reopen': async () => { await act('reopen'); drawSitting(); },
  'sit-finish': async () => {
    const left = SIT.def.steps.filter((s) => !stepRes(s.n).result).length;
    if (left && !confirm(plural(left, 'step has', 'steps have') + ' no result. Finish anyway? They are recorded as not run and close nothing.')) return;
    await act('finish', { step: SIT.open || 0, note: $('#sit-note').value });
    if (SIT.res.state === 'finished') { SIT.open = 0; drawSitting(); window.scrollTo(0, 0); loadMeta(); }
  },
  'step-toggle': (el) => { const n = stepOf(el); openStep(SIT.open === n ? 0 : n); },
  result: (el) => setResult(stepOf(el), el.dataset.r),
  'shot-remove': async (el) => {
    const n = stepOf(el);
    if (!confirm('Remove this screenshot from the step? The file is kept in the trash folder.')) return;
    try { sync((await api('/api/sittings/' + SIT.id + '/step/' + n + '/shot/remove', { file: el.dataset.file })).results); drawStep(n); saved(); } catch (err) { toast(err.message, true); }
  },
};

const INPUTS = {
  own: (el) => { refreshLocal(el.dataset.q, { own: el.value }); debounce('own' + el.dataset.q, () => saveAnswer({ question: el.dataset.q, own: el.value })); },
  note: (el) => { refreshLocal(el.dataset.q, { note: el.value }); debounce('note' + el.dataset.q, () => saveAnswer({ question: el.dataset.q, note: el.value })); },
  general: (el) => debounce('general', async () => { try { RUN.answers = (await api('/api/questions/' + RUN.id + '/general', { general: el.value })).answers; saved(); refreshRun(); } catch (err) { toast(err.message, true); } }),
  'step-note': (el) => { const n = stepOf(el); debounce('sn' + n, async () => { try { sync((await api('/api/sittings/' + SIT.id + '/step/' + n, { note: el.value })).results); saved(); drawBar(); } catch (err) { toast(err.message, true); } }); },
  caption: (el) => { const n = stepOf(el); debounce('cap' + el.dataset.file, async () => { try { sync((await api('/api/sittings/' + SIT.id + '/step/' + n, { captions: { [el.dataset.file]: el.value } })).results); saved(); } catch (err) { toast(err.message, true); } }); },
  'sit-note': (el) => debounce('sitnote', () => act('note', { note: el.value, step: SIT.open || 0 })),
};
function refreshLocal(q, patch) { if (!RUN.answers.answers[q]) RUN.answers.answers[q] = { pick: '', own: '', note: '' }; Object.assign(RUN.answers.answers[q], patch); refreshRun(); }

const CHANGES = {
  check: async (el) => {
    const n = stepOf(el);
    const checks = $$('#st-' + n + ' input[data-in=check]').map((c) => c.checked);
    try {
      sync((await api('/api/sittings/' + SIT.id + '/step/' + n, { checks })).results);
      const met = $('#st-' + n + ' .met');
      if (met) met.textContent = checks.filter(Boolean).length + ' of ' + checks.length + ' seen';
      saved();
    } catch (err) { toast(err.message, true); }
  },
  files: (el) => { addShots(stepOf(el), el.files); el.value = ''; },
};

function wire() {
  document.addEventListener('click', (e) => {
    if (SIT) SIT.lastInput = Date.now();
    const el = e.target.closest('[data-act]');
    if (el && ACTIONS[el.dataset.act]) ACTIONS[el.dataset.act](el, e);
  });
  document.addEventListener('input', (e) => { if (SIT) SIT.lastInput = Date.now(); const k = e.target.dataset && e.target.dataset.in; if (k && INPUTS[k]) INPUTS[k](e.target); });
  document.addEventListener('change', (e) => { const k = e.target.dataset && e.target.dataset.in; if (k && CHANGES[k]) CHANGES[k](e.target); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') $('#lightbox').classList.remove('show');
    if (!SIT || !editable() || e.metaKey || e.ctrlKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    SIT.lastInput = Date.now();
    const k = e.key.toLowerCase();
    const steps = SIT.def.steps;
    const i = steps.findIndex((s) => s.n === SIT.open);
    if (k === 'j' && i < steps.length - 1) openStep(steps[i + 1].n, true);
    else if (k === 'k' && i > 0) openStep(steps[i - 1].n, true);
    else if (SIT.open && { p: 'pass', f: 'fail', s: 'skip' }[k]) setResult(SIT.open, { p: 'pass', f: 'fail', s: 'skip' }[k]);
  });
  // Screenshots: drop on a step, or paste while a step is open.
  document.addEventListener('dragover', (e) => { const s = e.target.closest && e.target.closest('.step'); if (s && SIT && editable()) { e.preventDefault(); s.classList.add('over'); } });
  document.addEventListener('dragleave', (e) => { const s = e.target.closest && e.target.closest('.step'); if (s && !s.contains(e.relatedTarget)) s.classList.remove('over'); });
  document.addEventListener('drop', (e) => {
    const s = e.target.closest && e.target.closest('.step');
    if (!s || !SIT) return;
    e.preventDefault();
    s.classList.remove('over');
    const n = Number(s.dataset.n);
    if (SIT.open !== n) openStep(n);
    addShots(n, e.dataTransfer.files);
  });
  document.addEventListener('paste', (e) => {
    if (!SIT || !editable() || !SIT.open) return;
    const files = [...((e.clipboardData && e.clipboardData.items) || [])].filter((i) => i.kind === 'file' && i.type.startsWith('image/')).map((i) => i.getAsFile());
    if (files.length) { e.preventDefault(); addShots(SIT.open, files); }
  });
  window.addEventListener('pagehide', () => { if (running()) beacon(); });
  window.addEventListener('hashchange', show);
}

async function boot() {
  theme();
  wire();
  try { await loadMeta(); } catch (err) { $('#main').innerHTML = '<div class="card bad">' + esc(err.message) + '</div>'; return; }
  await show();
  setInterval(() => { loadMeta().catch(() => {}); }, 60000);
}

if (document.body.classList.contains('login-page')) loginPage(); else boot();
