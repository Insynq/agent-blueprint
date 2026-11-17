#!/usr/bin/env node
// Demo environment reset. Puts the demo environment back to a known state:
// guard, pre-check, wipe, migrate, seed, post-check. The project supplies the
// commands in a small config file; this script supplies the order, the guard
// and the rule that a reset has only worked when the post-check says so.
//
//   node scripts/demo/reset.mjs                 full reset
//   node scripts/demo/reset.mjs --dry-run       run the guard, print every command, run nothing
//   node scripts/demo/reset.mjs --check         guard and pre-check only; writes nothing
//   node scripts/demo/reset.mjs --skip-seed     wipe and migrate, leave the database empty
//                                               (use before pushing migrations to demo)
//   node scripts/demo/reset.mjs --auto          for a schedule: reset only inside the configured
//                                               night window, and only once per night
//   node scripts/demo/reset.mjs --config <path> (default: reset.config.json beside this file)
//
// Config (JSON; keys starting with "_" are notes and are ignored):
//   {
//     "timezone": "America/Denver",               IANA zone the window is read in (default UTC)
//     "window": { "startHour": 1, "endHour": 6 }, --auto resets only when startHour <= hour < endHour
//     "timeoutSeconds": 900,                      per command
//     "preCheck":  { "command": "...", "expect": "..." },     optional, recommended: a check inside
//                                                 the database that only demo can pass (a marker row)
//     "steps": { "wipe": ["..."], "migrate": ["..."], "seed": ["..."] },
//     "postCheck": { "command": "...", "expect": "..." },     required: proves the reset took effect
//     "marker": { "read": "...", "write": "..." } optional: when the last full reset finished.
//                                                 read prints an ISO time; write receives $DEMO_RESET_AT
//   }
//   A check passes only when its command exits 0 and its trimmed output equals
//   "expect" (or matches the regular expression in "expectPattern"). An exit
//   code alone never passes a check.
//
// Commands run through the shell from the repository root with the caller's
// environment. Refer to secrets as "$NAME"; never write one into the config.
// --dry-run prints commands exactly as written, so a "$NAME" stays a name.
//
// Exit codes:
//   0        reset finished and the post-check passed; or --auto decided there
//            was nothing to do; or --check / --dry-run found nothing wrong
//   1        unexpected error
//   2, 3, 4  the guard refused (see guard.mjs): missing value, production, not demo
//   10       the config is missing, invalid, or still the shipped example
//   11       the pre-check failed; nothing was changed
//   12       a wipe, migrate or seed command failed; the demo may be half built
//   13       the post-check failed; the reset ran but did not produce the expected state
//   14       the reset worked but the marker could not be written

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assertDemoTarget, loadConfig, resolveSettings, DEFAULT_CONFIG, EXIT as GUARD_EXIT } from './guard.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const EXIT = { OK: 0, ERROR: 1, CONFIG: 10, PRE_CHECK: 11, STEP: 12, POST_CHECK: 13, MARKER: 14 };
const STEPS = ['wipe', 'migrate', 'seed'];

const say = (m) => process.stdout.write('demo-reset: ' + m + '\n');
const fail = (code, m) => {
  process.stderr.write('demo-reset: FAILED (exit ' + code + '): ' + m + '\n');
  process.exit(code);
};

function parseArgs(argv) {
  const o = { dryRun: false, check: false, skipSeed: false, auto: false, config: path.join(here, 'reset.config.json') };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') o.dryRun = true;
    else if (a === '--check') o.check = true;
    else if (a === '--skip-seed') o.skipSeed = true;
    else if (a === '--auto') o.auto = true;
    else if (a === '--config') o.config = path.resolve(argv[++i] || '');
    else if (a === '-h' || a === '--help') {
      const text = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n');
      const end = text.findIndex((l, n) => n > 0 && !l.startsWith('//'));
      process.stdout.write(text.slice(1, end).map((l) => l.replace(/^\/\/ ?/, '')).join('\n') + '\n');
      process.exit(EXIT.OK);
    } else fail(EXIT.CONFIG, 'unknown argument ' + a);
  }
  return o;
}

function readConfig(file) {
  if (!fs.existsSync(file)) {
    fail(EXIT.CONFIG, 'no config at ' + path.relative(root, file) + '. Copy an example from scripts/demo/examples/, edit it, and save it there.');
  }
  let c;
  try { c = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (err) {
    fail(EXIT.CONFIG, path.relative(root, file) + ' is not valid JSON: ' + err.message);
  }
  const problems = [];
  const isCmd = (s) => typeof s === 'string' && s.trim() !== '';
  if (c.example === true) problems.push('this is the shipped example ("example": true). Edit every command for this project, then remove that line');
  c.steps = c.steps || {};
  for (const name of STEPS) {
    const v = c.steps[name] === undefined ? [] : c.steps[name];
    if (!Array.isArray(v) || !v.every(isCmd)) problems.push('steps.' + name + ' must be a list of commands');
    else c.steps[name] = v;
  }
  for (const name of Object.keys(c.steps)) {
    if (!STEPS.includes(name) && !name.startsWith('_')) problems.push('steps.' + name + ' is not a step (use wipe, migrate, seed)');
  }
  if (!problems.length && !c.steps.wipe.length) problems.push('steps.wipe is empty: a reset that wipes nothing is not a reset');
  const check = (key, required) => {
    const k = c[key];
    if (k === undefined) { if (required) problems.push(key + ' is required: without it a reset can only report an exit code'); return; }
    if (!k || !isCmd(k.command)) { problems.push(key + '.command must be a command'); return; }
    const has = [typeof k.expect === 'string', typeof k.expectPattern === 'string'];
    if (has[0] === has[1]) problems.push(key + ' needs exactly one of "expect" or "expectPattern"');
    if (has[1]) { try { new RegExp(k.expectPattern); } catch { problems.push(key + '.expectPattern is not a valid regular expression'); } }
  };
  check('preCheck', false);
  check('postCheck', true);
  if (c.marker !== undefined && !(c.marker && isCmd(c.marker.read) && isCmd(c.marker.write))) {
    problems.push('marker needs both "read" and "write" commands');
  }
  if (c.window !== undefined) {
    const w = c.window;
    const hour = (h) => Number.isInteger(h) && h >= 0 && h <= 24;
    if (!w || !hour(w.startHour) || !hour(w.endHour) || w.startHour === w.endHour) problems.push('window needs integer startHour and endHour (0 to 24) that differ');
  }
  if (c.timezone !== undefined) {
    try { new Intl.DateTimeFormat('en-US', { timeZone: c.timezone }); } catch { problems.push('timezone "' + c.timezone + '" is not an IANA time zone'); }
  }
  const all = allCommands(c);
  for (const cmd of all) if (/edit-me/i.test(cmd)) problems.push('a command still contains EDIT-ME: ' + cmd.slice(0, 80));
  for (const key of ['preCheck', 'postCheck']) {
    if (c[key] && /edit-me/i.test(String(c[key].expect ?? '') + String(c[key].expectPattern ?? ''))) problems.push(key + ' still expects an EDIT-ME value');
  }
  if (problems.length) fail(EXIT.CONFIG, path.relative(root, file) + ':\n  - ' + problems.join('\n  - '));
  return c;
}

function allCommands(c) {
  const out = [];
  if (c.preCheck?.command) out.push(c.preCheck.command);
  for (const name of STEPS) out.push(...(Array.isArray(c.steps?.[name]) ? c.steps[name] : []));
  if (c.postCheck?.command) out.push(c.postCheck.command);
  if (c.marker?.read) out.push(c.marker.read);
  if (c.marker?.write) out.push(c.marker.write);
  return out.filter((s) => typeof s === 'string');
}

function run(cmd, { capture = false, timeoutSeconds = 900, extraEnv = {} } = {}) {
  const r = spawnSync(cmd, {
    shell: true,
    cwd: root,
    env: { ...process.env, ...extraEnv },
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    encoding: 'utf8',
    timeout: timeoutSeconds * 1000,
  });
  const timedOut = r.error && r.error.code === 'ETIMEDOUT';
  return { status: timedOut ? 'timed out after ' + timeoutSeconds + ' s' : (r.status ?? ('signal ' + r.signal)), ok: r.status === 0, out: (r.stdout || '').trim() };
}

// A check passes on exit 0 AND the expected output. Returns { ok, why, seen }.
function runCheck(check, timeoutSeconds) {
  const r = run(check.command, { capture: true, timeoutSeconds });
  const seen = r.out.length > 200 ? r.out.slice(0, 200) + '…' : r.out;
  if (!r.ok) return { ok: false, seen, why: 'its command exited ' + r.status };
  if (typeof check.expect === 'string') {
    return r.out === check.expect.trim()
      ? { ok: true, seen }
      : { ok: false, seen, why: 'expected "' + check.expect.trim() + '", observed "' + seen + '"' };
  }
  return new RegExp(check.expectPattern).test(r.out)
    ? { ok: true, seen }
    : { ok: false, seen, why: 'expected output matching /' + check.expectPattern + '/, observed "' + seen + '"' };
}

function localNow(timezone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date()).map((p) => [p.type, p.value]));
  return { date: parts.year + '-' + parts.month + '-' + parts.day, hour: Number(parts.hour), minute: Number(parts.minute) };
}

function localDateOf(iso, timezone) {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

// --auto: is a reset due right now? Returns { due, why }.
function autoDecision(c, timeoutSeconds) {
  const tz = c.timezone || 'UTC';
  const now = localNow(tz);
  if (c.window) {
    const { startHour: s, endHour: e } = c.window;
    const inside = s < e ? (now.hour >= s && now.hour < e) : (now.hour >= s || now.hour < e);
    if (!inside) return { due: false, why: 'it is ' + String(now.hour).padStart(2, '0') + ':xx in ' + tz + ', outside the reset window ' + s + ':00 to ' + e + ':00. A late schedule tick must not wipe a sitting in progress' };
  }
  if (c.marker) {
    const r = run(c.marker.read, { capture: true, timeoutSeconds });
    if (!r.ok) say('warning: marker.read exited ' + r.status + '; treating the last reset as unknown');
    const lastAt = r.ok && r.out ? new Date(r.out).getTime() : NaN;
    const known = Number.isFinite(lastAt);
    // "Tonight" is this occurrence of the window when there is one (so a
    // window that crosses midnight still resets once), else the local date.
    const done = !known ? false : c.window
      ? Date.now() - lastAt <= (((now.hour - c.window.startHour + 24) % 24) * 60 + now.minute) * 60000
      : localDateOf(r.out, tz) === now.date;
    const when = c.window ? 'this window' : now.date + ' (' + tz + ')';
    if (done) return { due: false, why: 'a full reset is already recorded for ' + when + ', at ' + new Date(lastAt).toISOString() };
    return { due: true, why: 'no full reset recorded for ' + when + '; last was ' + (known ? new Date(lastAt).toISOString() : 'never') };
  }
  return { due: true, why: 'inside the window and no marker is configured (every tick inside the window resets)' };
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const c = readConfig(opts.config);
  const timeoutSeconds = Number.isFinite(c.timeoutSeconds) && c.timeoutSeconds > 0 ? c.timeoutSeconds : 900;

  // 1. The guard, before anything else, in every mode.
  let guardConfig;
  try { guardConfig = loadConfig(process.env.DEMO_ENVIRONMENTS_FILE || DEFAULT_CONFIG); } catch (err) {
    fail(EXIT.ERROR, 'could not read the guard config: ' + err.message);
  }
  let verdict = assertDemoTarget({ env: process.env, config: guardConfig });
  if (verdict.ok) {
    // The commands themselves must not name production either.
    const { denied } = resolveSettings({ env: process.env, config: guardConfig });
    const bad = allCommands(c).find((cmd) => denied.some((d) => cmd.toLowerCase().includes(d)));
    if (bad) verdict = { ok: false, code: GUARD_EXIT.PRODUCTION, reason: 'a command in the reset config names a production value' };
  }
  const guardLine = verdict.ok ? 'guard PASS: ' + verdict.reason : 'guard REFUSED (exit ' + verdict.code + '): ' + verdict.reason;

  const plan = STEPS.filter((s) => !(opts.skipSeed && s === 'seed'));

  if (opts.dryRun) {
    say('dry run. Nothing below is executed.');
    say(guardLine);
    if (c.preCheck) say('pre-check:  ' + c.preCheck.command + '   → expect ' + (c.preCheck.expect ?? '/' + c.preCheck.expectPattern + '/'));
    for (const step of plan) {
      if (!c.steps[step].length) say(step.padEnd(10) + ' (no commands)');
      for (const cmd of c.steps[step]) say((step + ':').padEnd(11) + ' ' + cmd);
    }
    if (opts.skipSeed) say('seed:       skipped (--skip-seed); post-check skipped with it');
    else say('post-check: ' + c.postCheck.command + '   → expect ' + (c.postCheck.expect ?? '/' + c.postCheck.expectPattern + '/'));
    if (c.marker && !opts.skipSeed) say('marker:     ' + c.marker.write);
    if (!verdict.ok) say('a real run would stop at the guard.');
    process.exit(verdict.ok ? EXIT.OK : verdict.code);
  }

  if (!verdict.ok) {
    process.stderr.write('demo-reset: ' + guardLine + '\n');
    process.exit(verdict.code);
  }
  say(guardLine);

  // 2. Scheduled runs decide whether tonight's reset is still owed.
  if (opts.auto && !opts.check) {
    const d = autoDecision(c, timeoutSeconds);
    say('auto: ' + (d.due ? 'resetting: ' : 'not resetting: ') + d.why);
    if (!d.due) process.exit(EXIT.OK);
  }

  // 3. Pre-check: the lock inside the database.
  if (c.preCheck) {
    const r = runCheck(c.preCheck, timeoutSeconds);
    if (!r.ok) fail(EXIT.PRE_CHECK, 'pre-check: ' + r.why + '. Nothing was changed.');
    say('pre-check passed (observed "' + r.seen + '")');
  } else {
    say('no pre-check configured: the guard compared names only. Add one that reads a marker row from the demo database.');
  }
  if (opts.check) {
    say('check only: guard' + (c.preCheck ? ' and pre-check' : '') + ' passed. Nothing was changed.');
    process.exit(EXIT.OK);
  }

  // 4. The steps, in order, stopping at the first failure.
  const started = Date.now();
  for (const step of plan) {
    for (const cmd of c.steps[step]) {
      say(step + ': ' + cmd);
      const r = run(cmd, { timeoutSeconds });
      if (!r.ok) {
        fail(EXIT.STEP, step + ' command exited ' + r.status + ': ' + cmd +
          '\n  The demo environment may be half built. Fix the cause and run the reset again; do not use demo until it passes.');
      }
    }
  }

  // 5. Verify the effect, not the exit codes.
  if (opts.skipSeed) {
    say('wiped and migrated; seed and post-check skipped (--skip-seed). The demo is empty until the next full reset.');
    process.exit(EXIT.OK);
  }
  const post = runCheck(c.postCheck, timeoutSeconds);
  if (!post.ok) {
    fail(EXIT.POST_CHECK, 'post-check: ' + post.why + '.\n  Every command exited 0, but the demo is not in the expected state. Treat it as broken.');
  }
  say('post-check passed (observed "' + post.seen + '")');

  // 6. Record it, only now.
  if (c.marker) {
    const at = new Date().toISOString();
    const r = run(c.marker.write, { timeoutSeconds, extraEnv: { DEMO_RESET_AT: at } });
    if (!r.ok) fail(EXIT.MARKER, 'the reset passed its post-check but marker.write exited ' + r.status + '; a scheduled run will reset again');
    say('marker written: ' + at);
  }
  say('done in ' + Math.round((Date.now() - started) / 1000) + ' s.');
  process.exit(EXIT.OK);
}

try { main(); } catch (err) {
  process.stderr.write('demo-reset: FAILED (exit 1): ' + ((err && err.stack) || String(err)) + '\n');
  process.exit(EXIT.ERROR);
}
