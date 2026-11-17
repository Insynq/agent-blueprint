#!/usr/bin/env node
// What the owner answered and tested, for the agent to read and act on.
//
//   node devdash/scripts/results.mjs            new since the last acknowledgement
//   node devdash/scripts/results.mjs --all      everything, read or not
//   node devdash/scripts/results.mjs --json     the same, as JSON
//   node devdash/scripts/results.mjs --ack <n>  mark journal lines up to n as dealt with
//
// Reads only. The one thing it writes is the cursor, on --ack. It never edits
// answers, results, screenshots or the journal: those are the owner's.

import path from 'node:path';
import { ROOT, DATA, config, localDay } from '../lib/root.mjs';
import * as sources from '../lib/sources.mjs';
import * as store from '../lib/store.mjs';
import { lines, sittingSmokes } from '../lib/validate.mjs';

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/') || p;
const clock = (s) => { s = Math.round(s || 0); return s >= 3600 ? Math.floor(s / 3600) + 'h ' + String(Math.floor((s % 3600) / 60)).padStart(2, '0') + 'm' : Math.floor(s / 60) + 'm ' + String(s % 60).padStart(2, '0') + 's'; };
const when = (iso) => (iso ? localDay(new Date(iso)) + ' ' + new Date(iso).toTimeString().slice(0, 5) : '');
const oneLine = (t) => String(t || '').replace(/\s+/g, ' ').trim();

if (has('--ack')) {
  const n = Number(args[args.indexOf('--ack') + 1]);
  if (!Number.isInteger(n) || n < 0) { console.error('Usage: node devdash/scripts/results.mjs --ack <n>  (n is printed at the end of the results)'); process.exit(2); }
  const seen = store.acknowledge(n);
  const left = store.unread().length;
  console.log('Acknowledged up to journal line ' + seen + '. ' + (left ? left + ' newer line(s) arrived meanwhile; run this script again.' : 'Nothing newer is waiting.'));
  process.exit(0);
}

const entries = store.journalEntries();
const cur = store.cursor();
const fresh = has('--all') ? entries : entries.filter((e) => e.n > cur.seen);
const defs = await sources.definitions();
const owner = config().owner || 'owner';

// Which items to report: with --all, everything that has owner data; otherwise
// only what the new journal lines touch.
const touched = new Set(fresh.map((e) => e.id).filter(Boolean));
const runs = defs.runs.filter((r) => r.def && store.getAnswers(r.id) && (has('--all') || touched.has(r.id)));
const sittings = defs.sittings.filter((s) => s.def && store.getResults(s.id) && (has('--all') || touched.has(s.id)));

function runReport(item) {
  const a = store.getAnswers(item.id);
  const questions = item.def.questions.map((q) => {
    const x = a.answers[q.id];
    const answered = store.isAnswered(x);
    return {
      id: q.id, question: q.question, answered,
      pick: answered ? x.pick : '', label: answered ? x.label : '', own: answered ? x.own : '', note: answered ? x.note : '',
      recommended: q.recommend || '', asRecommended: answered && !!q.recommend && x.pick === q.recommend,
      questionChanged: answered && x.asked !== q.question ? x.asked : '',
    };
  });
  return { kind: 'questions', id: item.id, title: item.def.title, file: item.file, status: item.def.status || 'active', submittedAt: a.submittedAt, changedSinceSubmit: !!a.changedSinceSubmit, owner: a.owner || owner, general: a.general, questions };
}

function sittingReport(item) {
  const r = store.getResults(item.id);
  const def = item.def;
  const steps = def.steps.map((st) => {
    const x = r.steps[st.n] || {};
    const expect = lines(st.expect);
    return {
      n: st.n, title: st.title || lines(st.do)[0], result: x.result || '', seconds: x.seconds || 0, note: x.note || '', at: x.at || '',
      smokes: st.smokes || [], unmet: expect.filter((_, i) => !(x.checks || [])[i]).length, expectLines: expect.length,
      shots: (x.shots || []).map((s) => ({ file: rel(path.join(DATA, 'sittings', item.id, 'shots', s.file)), caption: s.caption })),
    };
  });
  const finished = r.state === 'finished';
  const who = r.owner || owner;
  const ledger = sittingSmokes(def).map((id) => {
    const mine = steps.filter((s) => s.smokes.includes(id));
    if (!mine.length) return { id, close: false, why: 'no step in this sitting names it' };
    if (!finished) return { id, close: false, why: 'the sitting is not finished' };
    const bad = mine.find((s) => s.result !== 'pass');
    if (bad) return { id, close: false, why: 'step ' + bad.n + ' was ' + (bad.result === 'fail' ? 'failed' : bad.result === 'skip' ? 'skipped' : 'not run') };
    const day = localDay(new Date(mine.map((s) => s.at).sort().pop()));
    const noted = mine.filter((s) => s.note.trim());
    return { id, close: true, status: 'Passed ' + day + ' (sitting ' + item.id + ', ' + who + ')', readNotes: noted.map((s) => s.n) };
  });
  return { kind: 'sitting', id: item.id, title: def.title, file: item.file, state: r.state, startedAt: r.startedAt, finishedAt: r.finishedAt, seconds: Math.round(r.activeSeconds), owner: who, note: r.note || '', counts: store.counts(def, r), steps, ledger };
}

const report = { cursor: cur.seen, upTo: entries.length, runs: runs.map(runReport), sittings: sittings.map(sittingReport) };

if (has('--json')) { console.log(JSON.stringify(report, null, 2)); process.exit(0); }

if (!report.runs.length && !report.sittings.length) {
  console.log('Nothing ' + (has('--all') ? 'recorded by' : 'new from') + ' the owner. Inspected ' + entries.length + ' journal line(s) in ' + rel(path.join(DATA, 'journal.jsonl')) + (has('--all') ? '' : '; ' + cur.seen + ' already acknowledged') + '.');
  if (fresh.length && !has('--all')) console.log('(' + fresh.length + ' new line(s) refer to items whose definition is missing or broken. Run node devdash/scripts/check.mjs. Then: node devdash/scripts/results.mjs --ack ' + entries.length + ')');
  process.exit(0);
}

const out = [];
for (const r of report.runs) {
  out.push('QUESTIONS  ' + r.id + '  "' + r.title + '"');
  out.push('  ' + (r.submittedAt ? 'Submitted ' + when(r.submittedAt) + ' by ' + r.owner + (r.changedSinceSubmit ? '. Edited since; treat the unsubmitted edits as drafts.' : '.') : 'Not submitted yet: these are drafts. Do not act on them.'));
  for (const q of r.questions) {
    out.push('  ' + q.id + '  ' + oneLine(q.question));
    if (!q.answered) { out.push('      not answered'); continue; }
    if (q.pick && q.pick !== 'own') out.push('      Answer: ' + q.pick + '  ' + q.label + (q.recommended ? (q.asRecommended ? '   (as recommended)' : '   (you recommended ' + q.recommended + ')') : ''));
    if (q.own.trim()) out.push('      Own answer: ' + oneLine(q.own));
    if (q.note.trim()) out.push('      Note: ' + oneLine(q.note));
    if (q.questionChanged) out.push('      The question was edited after this answer. It was asked as: ' + oneLine(q.questionChanged));
  }
  if (r.general.trim()) out.push('  General note: ' + oneLine(r.general));
  if (r.submittedAt) out.push('  Then: record each ruling in the spec decision table or docs/KB_1_Architecture.md (a note overrides a pick; ask about anything ambiguous), and set "status": "archived" with a one-line "outcome" in ' + r.file + '.');
  out.push('');
}
for (const s of report.sittings) {
  const c = s.counts;
  out.push('SITTING  ' + s.id + '  "' + s.title + '"');
  out.push('  ' + (s.state === 'finished' ? 'Finished ' + when(s.finishedAt) : 'In progress (' + s.state + ')') + ' by ' + s.owner + '. Time ' + clock(s.seconds) + '. ' + c.pass + ' pass, ' + c.fail + ' fail, ' + c.skip + ' skip, ' + c.unanswered + ' not run.');
  for (const st of s.steps) {
    out.push('  ' + String(st.n).padStart(2) + '  ' + (st.result ? st.result.toUpperCase() : 'not run').padEnd(7) + ' ' + oneLine(st.title) + (st.smokes.length ? '   [' + st.smokes.join(', ') + ']' : '') + (st.seconds ? '   ' + clock(st.seconds) : ''));
    if (st.result === 'pass' && st.unmet && st.expectLines > 1) out.push('      ' + st.unmet + ' of ' + st.expectLines + ' expected results were left unticked.');
    if (st.note.trim()) out.push('      Note: ' + oneLine(st.note));
    for (const sh of st.shots) out.push('      Screenshot: ' + sh.file + (sh.caption ? '  "' + oneLine(sh.caption) + '"' : ''));
  }
  if (s.note.trim()) out.push('  Overall note: ' + oneLine(s.note));
  if (s.ledger.length) {
    out.push('  Ledger, docs/smoke-tests-pending.md (you make these edits; the dash never does):');
    for (const l of s.ledger) {
      if (l.close) out.push('    ' + l.id + '  set Status to:  ' + l.status + (l.readNotes.length ? '   (read the note on step ' + l.readNotes.join(', ') + ' first; if it describes a problem, ask the owner instead)' : ''));
      else out.push('    ' + l.id + '  leave as it is: ' + l.why + '.');
    }
  }
  if (s.state === 'finished') out.push('  Then: open a finding for each failed step, and set "status": "closed" with a one-line "outcome" in ' + s.file + '.');
  out.push('');
}
out.push('Only a step marked Pass closes a smoke row. Fail, Skip and not run never do.');
if (!has('--all')) out.push('When everything above is recorded and committed: node devdash/scripts/results.mjs --ack ' + report.upTo);
console.log(out.join('\n'));
