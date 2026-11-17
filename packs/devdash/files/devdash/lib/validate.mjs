// Schema checks for the files the agent writes: question runs, sittings and
// daily log entries. Used by the server (a broken file shows its errors on the
// page instead of rendering a half-empty card), by devdash/scripts/check.mjs
// and by the edit hook. Each function returns an array of problem strings.

export const ID = /^[a-z0-9][a-z0-9-]{0,79}$/;
export const QUESTION_ID = /^[A-Za-z0-9][A-Za-z0-9.-]{0,23}$/;
export const SMOKE_ID = /^[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)+$/;
export const REF_SHOT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}\.(?:png|jpe?g|webp|gif)$/;
export const DAY = /^\d{4}-\d{2}-\d{2}$/;

const isStr = (v) => typeof v === 'string';
const filled = (v) => isStr(v) && v.trim() !== '';
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
export const lines = (v) => (Array.isArray(v) ? v : isStr(v) ? v.split(/\n+/) : []).map((x) => String(x).trim()).filter(Boolean);

function common(d, id, statuses, p) {
  if (!isObj(d)) { p.push('the file must hold one JSON object.'); return false; }
  if (!ID.test(String(d.id || ''))) p.push('id must be lowercase letters, digits and hyphens.');
  else if (id && d.id !== id) p.push('id "' + d.id + '" must equal the file or folder name "' + id + '".');
  if (!filled(d.title)) p.push('title is missing.');
  if (d.date !== undefined && !DAY.test(String(d.date))) p.push('date must be YYYY-MM-DD.');
  const status = d.status === undefined ? 'active' : d.status;
  if (!statuses.includes(status)) p.push('status must be one of: ' + statuses.join(', ') + '.');
  else if (status !== 'active' && !filled(d.outcome)) p.push('a ' + status + ' item needs a one-line outcome saying what was recorded and where.');
  return true;
}

export function validateRun(run, id) {
  const p = [];
  if (!common(run, id, ['active', 'archived'], p)) return p;
  if (run.groups !== undefined) {
    if (!Array.isArray(run.groups) || run.groups.some((g) => !isObj(g) || !filled(g.key) || !filled(g.title))) {
      p.push('groups must be a list of {key, title}.');
    }
  }
  const groups = new Set((Array.isArray(run.groups) ? run.groups : []).map((g) => g && g.key));
  const qs = run.questions;
  if (!Array.isArray(qs) || !qs.length) { p.push('questions must be a non-empty list.'); return p; }
  if (qs.length > 60) p.push('at most 60 questions in a run; split it.');
  const seen = new Set();
  qs.forEach((q, i) => {
    const at = 'question ' + (isObj(q) && q.id ? q.id : i + 1) + ': ';
    if (!isObj(q)) { p.push(at + 'must be an object.'); return; }
    if (!QUESTION_ID.test(String(q.id || ''))) p.push(at + 'id must be short letters, digits, dots or hyphens.');
    else if (seen.has(q.id)) p.push(at + 'id is used twice.');
    seen.add(q.id);
    if (!filled(q.question)) p.push(at + 'question text is missing.');
    if (q.context !== undefined && !isStr(q.context)) p.push(at + 'context must be text.');
    if (q.group !== undefined && groups.size && !groups.has(q.group)) p.push(at + 'group "' + q.group + '" is not in groups.');
    const opts = q.options;
    if (!Array.isArray(opts) || opts.length < 2 || opts.length > 6) { p.push(at + 'needs two to six options.'); return; }
    const keys = new Set();
    opts.forEach((o, j) => {
      if (!isObj(o)) { p.push(at + 'option ' + (j + 1) + ' must be {key, label, detail}, not bare text.'); return; }
      if (!/^[A-Z]$/.test(String(o.key || ''))) p.push(at + 'option ' + (j + 1) + ' key must be one capital letter.');
      else if (keys.has(o.key)) p.push(at + 'option key ' + o.key + ' is used twice.');
      keys.add(o.key);
      if (!filled(o.label)) p.push(at + 'option ' + (o.key || j + 1) + ' has no label.');
      if (o.detail !== undefined && !isStr(o.detail)) p.push(at + 'option ' + (o.key || j + 1) + ' detail must be text.');
    });
    if (q.recommend !== undefined && q.recommend !== '') {
      if (!keys.has(q.recommend)) p.push(at + 'recommend "' + q.recommend + '" is not one of the option keys.');
      if (!filled(q.reason)) p.push(at + 'a recommendation needs a reason.');
    } else if (filled(q.reason)) {
      p.push(at + 'has a reason but no recommend key.');
    }
  });
  return p;
}

export function validateSitting(s, id) {
  const p = [];
  if (!common(s, id, ['active', 'closed'], p)) return p;
  if (s.environment !== undefined && !(isObj(s.environment) && filled(s.environment.name))) {
    p.push('environment must be {name, url}.');
  } else if (s.environment === undefined) {
    p.push('environment is missing: say which environment this is run against.');
  }
  if (s.signIn !== undefined && !filled(s.signIn) && !(isObj(s.signIn) && filled(s.signIn.as))) {
    p.push('signIn must be text or {as, note}.');
  }
  if (s.prerequisites !== undefined && !Array.isArray(s.prerequisites)) p.push('prerequisites must be a list.');
  const steps = s.steps;
  if (!Array.isArray(steps) || !steps.length) { p.push('steps must be a non-empty list.'); return p; }
  if (steps.length > 40) p.push('at most 40 steps in a sitting; split it.');
  steps.forEach((st, i) => {
    const at = 'step ' + (i + 1) + ': ';
    if (!isObj(st)) { p.push(at + 'must be an object.'); return; }
    if (st.n !== i + 1) p.push(at + 'n must be ' + (i + 1) + ' (steps are numbered 1..N in order).');
    if (!lines(st.do).length) p.push(at + 'do is missing: the action to take, naming the exact control.');
    if (!lines(st.expect).length) p.push(at + 'expect is missing: what the owner should see, one checkable statement per line.');
    if (st.title !== undefined && !isStr(st.title)) p.push(at + 'title must be text.');
    if (st.where !== undefined && !isStr(st.where)) p.push(at + 'where must be text.');
    if (st.signIn !== undefined && !filled(st.signIn)) p.push(at + 'signIn must be text.');
    if (st.smokes !== undefined && (!Array.isArray(st.smokes) || st.smokes.some((x) => !SMOKE_ID.test(String(x))))) {
      p.push(at + 'smokes must be a list of ledger IDs such as CHK-3.');
    }
    if (st.shots !== undefined) {
      if (!Array.isArray(st.shots) || st.shots.some((x) => !isObj(x) || !REF_SHOT.test(String(x.file || '')))) {
        p.push(at + 'shots must be a list of {file, caption}; file is an image name in the sitting folder.');
      }
    }
  });
  if (s.smokes !== undefined && (!Array.isArray(s.smokes) || s.smokes.some((x) => !SMOKE_ID.test(String(x))))) {
    p.push('smokes must be a list of ledger IDs.');
  }
  return p;
}

// Every smoke ID a sitting covers: the union of its steps' lists and its own.
export function sittingSmokes(s) {
  const out = new Set(Array.isArray(s.smokes) ? s.smokes : []);
  for (const st of s.steps || []) for (const id of st.smokes || []) out.add(id);
  return [...out];
}

// A daily log entry: devdash/log/YYYY-MM-DD.md with a small front matter block.
export function parseLogEntry(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text || '');
  const meta = {};
  if (m) {
    for (const line of m[1].split(/\r?\n/)) {
      const kv = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
      if (kv) meta[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
    }
  }
  return { meta, body: (m ? text.slice(m[0].length) : text || '').trim() };
}

export function validateLogEntry(day, text) {
  const p = [];
  if (!DAY.test(day)) p.push('the file name must be YYYY-MM-DD.md.');
  const { meta, body } = parseLogEntry(text);
  if (!meta.date) p.push('front matter needs date: ' + day + '.');
  else if (meta.date !== day) p.push('front matter date ' + meta.date + ' does not match the file name ' + day + '.');
  if (!meta.title) p.push('front matter needs title: one plain line saying what the day was about.');
  if (body.length < 40) p.push('the summary is missing: two to six plain sentences for the owner.');
  return p;
}
