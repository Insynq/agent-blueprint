#!/usr/bin/env node
// Demo environment guard. Every script that wipes, seeds, resets or bulk-writes
// the demo environment calls this before it opens a connection. It answers one
// question: is the thing I am about to write to positively the demo
// environment, and provably not production?
//
// It has no dependencies and makes no network or database call. It compares
// strings: what you are about to target against what the project says demo and
// production are. A check inside the database (a marker row that exists only
// on demo) is the second lock; reset.mjs runs that as its pre-check.
//
// As a CLI:
//   node scripts/demo/guard.mjs                  target from $DEMO_TARGET
//   node scripts/demo/guard.mjs --target <ref-or-url>
//   node scripts/demo/guard.mjs --config <path>  (default: environments.json beside this file)
//   node scripts/demo/guard.mjs --quiet          print nothing on a pass
//   node scripts/demo/guard.mjs --selftest       prove the guard refuses what it should
//
// As a module:
//   import { guardOrExit } from './guard.mjs';
//   guardOrExit();            // exits the process unless the target is demo
//   import { assertDemoTarget } from './guard.mjs';
//   const verdict = assertDemoTarget({ env: process.env });   // { ok, code, reason, ... }
//
// Where the values come from:
//   demo (allow)        environments.json "demo", or $DEMO_ALLOW_TARGET.
//                       If both are set they must agree.
//   production (deny)   environments.json "production" (string or list), plus
//                       $DEMO_DENY_TARGETS (comma separated). The lists are joined.
//   target              --target, or $DEMO_TARGET.
//   confirmation        $DEMO_CONFIRM must be exactly 1.
//   connectionEnv       environments.json list of environment variable NAMES that
//                       hold connection strings (database URL, API URL). Each one
//                       that is set must identify demo and must not mention production.
//   secretEnv           list of variable NAMES that hold keys. Each one that is set
//                       is searched for the production value, including inside a
//                       token payload. Values are never printed.
//
// Prefer the committed file for demo and production. A value read from the
// same environment the guard is checking can be wrong in the same way the
// target is wrong; a value in a reviewed file cannot.
//
// A local target (localhost, 127.0.0.1) is refused unless $DEMO_ALLOW_LOCAL=1.
//
// Exit codes:
//   0  the target is the demo environment
//   1  the guard itself failed (unreadable config, failed self-test)
//   2  refused: a required value is missing or still a placeholder
//      (target, demo value, production value, or DEMO_CONFIRM=1)
//   3  refused: production. The target, a connection string, a key or the
//      configuration itself matches a production value
//   4  refused: not positively demo. The target or a connection string does
//      not identify the demo value (a typo is also "not production")
//
// It never prints a secret. A URL is shown as scheme and host only; any other
// value that is not the configured demo reference is described by its length.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const EXIT = { OK: 0, ERROR: 1, MISSING: 2, PRODUCTION: 3, NOT_DEMO: 4 };

const here = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_CONFIG = path.join(here, 'environments.json');

const MIN_LENGTH = 4;

function norm(v) {
  return String(v ?? '').trim().toLowerCase().replace(/\/+$/, '');
}

function isPlaceholder(v) {
  const s = String(v ?? '').trim();
  return s === '' || /[<>]/.test(s) || /\btodo\b/i.test(s) || /edit-me/i.test(s);
}

function list(v) {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === 'string') return v.split(',');
  return [];
}

function parseUrl(v) {
  const s = String(v ?? '').trim();
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) return null;
  try { return new URL(s); } catch { return null; }
}

// What a value may be shown as. Never the value itself unless it is a URL,
// and then only the scheme and host.
function describe(v) {
  const u = parseUrl(v);
  if (u) return u.protocol + '//' + u.host;
  return 'a value of ' + String(v ?? '').trim().length + ' characters';
}

function isLocal(v) {
  const u = parseUrl(v);
  const host = u ? u.hostname.replace(/^\[|\]$/g, '') : norm(v).split(':')[0];
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

// Every string a value could be hiding a production reference in.
function forms(v) {
  const out = [norm(v)];
  try { out.push(norm(decodeURIComponent(String(v)))); } catch { /* not encoded */ }
  const parts = String(v ?? '').trim().split('.');
  if (parts.length === 3 && parts[1]) {
    try { out.push(norm(Buffer.from(parts[1], 'base64url').toString('utf8'))); } catch { /* not a token */ }
  }
  return out;
}

function mentions(v, denied) {
  return forms(v).some((f) => denied.some((d) => f.includes(d)));
}

// The `ref` claim of a token-shaped key, if it has one.
function tokenRef(v) {
  const parts = String(v ?? '').trim().split('.');
  if (parts.length !== 3) return null;
  try {
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return typeof claims?.ref === 'string' ? norm(claims.ref) : null;
  } catch { return null; }
}

// Positive identification. A bare value must equal the demo value. A URL
// must carry it as a whole host, a whole host label or a whole piece of the
// user name (postgres.<ref>). A substring is not enough: "abc" does not
// identify "abcd.example".
function identifies(v, allow) {
  const value = norm(v);
  if (value === allow) return true;
  const u = parseUrl(v);
  if (!u) return false;
  const allowUrl = parseUrl(allow);
  if (allowUrl) return u.host.toLowerCase() === allowUrl.host.toLowerCase();
  const host = u.hostname.toLowerCase();
  const user = decodeURIComponent(u.username || '').toLowerCase();
  const candidates = new Set([host, u.host.toLowerCase(), user, ...host.split('.'), ...user.split('.')]);
  return candidates.has(allow);
}

export function loadConfig(file = DEFAULT_CONFIG) {
  if (!fs.existsSync(file)) return {};
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(path.basename(file) + ' must hold a JSON object');
  }
  return parsed;
}

// Resolve the demo and production values from the file and the environment.
// Returns { allow, denied, connectionEnv, secretEnv, problem }.
export function resolveSettings({ env = process.env, config = {} } = {}) {
  const fromFile = isPlaceholder(config.demo) ? '' : norm(config.demo);
  const fromEnv = isPlaceholder(env.DEMO_ALLOW_TARGET) ? '' : norm(env.DEMO_ALLOW_TARGET);
  const denied = [...list(config.production), ...list(env.DEMO_DENY_TARGETS)]
    .filter((d) => !isPlaceholder(d)).map(norm);
  const out = {
    allow: fromFile || fromEnv,
    denied: [...new Set(denied)],
    connectionEnv: list(config.connectionEnv).map((s) => s.trim()).filter(Boolean),
    secretEnv: list(config.secretEnv).map((s) => s.trim()).filter(Boolean),
    problem: null,
  };
  if (fromFile && fromEnv && fromFile !== fromEnv) {
    out.problem = 'the demo value in the config file and DEMO_ALLOW_TARGET disagree; remove one';
  } else if (!out.allow) {
    out.problem = 'no demo value: set "demo" in scripts/demo/environments.json (or DEMO_ALLOW_TARGET)';
  } else if (!out.denied.length) {
    out.problem = 'no production value: set "production" in scripts/demo/environments.json (or DEMO_DENY_TARGETS). ' +
      'The guard will not run without knowing what it must never touch';
  } else if (out.allow.length < MIN_LENGTH || out.denied.some((d) => d.length < MIN_LENGTH)) {
    out.problem = 'the demo and production values must each be at least ' + MIN_LENGTH + ' characters to identify anything';
  }
  return out;
}

export function assertDemoTarget({ env = process.env, config = {}, target } = {}) {
  const refuse = (code, reason) => ({ ok: false, code, reason });
  const settings = resolveSettings({ env, config });
  const rawTarget = String(target ?? env.DEMO_TARGET ?? '').trim();

  // 1. Everything the decision needs must be present.
  if (settings.problem) return refuse(EXIT.MISSING, settings.problem);
  if (isPlaceholder(rawTarget)) return refuse(EXIT.MISSING, 'no target: pass --target or set DEMO_TARGET');
  if (env.DEMO_CONFIRM !== '1') return refuse(EXIT.MISSING, 'DEMO_CONFIRM=1 is required');

  const { allow, denied } = settings;

  // 2. Production, anywhere.
  if (denied.some((d) => allow.includes(d) || d.includes(allow))) {
    return refuse(EXIT.PRODUCTION, 'the configured demo value matches a production value; fix scripts/demo/environments.json');
  }
  if (mentions(rawTarget, denied)) return refuse(EXIT.PRODUCTION, 'the target matches a production value');
  for (const name of [...settings.connectionEnv, ...settings.secretEnv]) {
    if (env[name] && mentions(env[name], denied)) {
      return refuse(EXIT.PRODUCTION, 'environment variable ' + name + ' holds a production value');
    }
  }

  // 3. Positively demo.
  const local = isLocal(rawTarget);
  if (local) {
    if (env.DEMO_ALLOW_LOCAL !== '1') return refuse(EXIT.NOT_DEMO, 'the target is local; set DEMO_ALLOW_LOCAL=1 to rehearse against a local stack');
  } else if (!identifies(rawTarget, allow)) {
    return refuse(EXIT.NOT_DEMO, 'the target (' + describe(rawTarget) + ') is not the demo value "' + allow + '"');
  }
  for (const name of settings.connectionEnv) {
    if (!env[name]) continue;
    const ok = local ? isLocal(env[name]) : identifies(env[name], allow);
    if (!ok) {
      return refuse(EXIT.NOT_DEMO, 'environment variable ' + name + ' (' + describe(env[name]) + ') does not point at ' +
        (local ? 'the local stack' : 'the demo value "' + allow + '"'));
    }
  }
  if (!local) {
    for (const name of settings.secretEnv) {
      const ref = env[name] ? tokenRef(env[name]) : null;
      if (ref && ref !== allow) return refuse(EXIT.NOT_DEMO, 'the key in ' + name + ' belongs to a different project than the demo value');
    }
  }

  return {
    ok: true,
    code: EXIT.OK,
    reason: local ? 'local target, allowed by DEMO_ALLOW_LOCAL=1' : 'target is the demo value "' + allow + '"',
    target: local ? 'local' : allow,
    checked: [...settings.connectionEnv, ...settings.secretEnv].filter((n) => env[n]),
  };
}

// For scripts: exits the process on a refusal, returns the verdict on a pass.
export function guardOrExit({ env = process.env, configFile = process.env.DEMO_ENVIRONMENTS_FILE || DEFAULT_CONFIG, target, quiet = false } = {}) {
  let config;
  try { config = loadConfig(configFile); } catch (err) {
    process.stderr.write('demo-guard: could not read ' + configFile + ': ' + err.message + '\n');
    process.exit(EXIT.ERROR);
  }
  const verdict = assertDemoTarget({ env, config, target });
  if (!verdict.ok) {
    process.stderr.write('demo-guard: REFUSED (exit ' + verdict.code + '): ' + verdict.reason + '\n');
    process.exit(verdict.code);
  }
  if (!quiet) {
    process.stdout.write('demo-guard: PASS: ' + verdict.reason +
      (verdict.checked.length ? '; also checked ' + verdict.checked.join(', ') : '') + '\n');
  }
  return verdict;
}

// ---------------------------------------------------------------------------
// Self-test. Uses invented values only; reads neither the real environment
// nor the real config file.

export function selftest(write = (s) => process.stdout.write(s)) {
  const DEMO = 'demoref0000000000001';
  const PROD = 'prodref0000000000009';
  const SECRET = 'S3cretPassw0rd-do-not-print';
  const config = { demo: DEMO, production: [PROD], connectionEnv: ['DB_URL', 'API_URL'], secretEnv: ['SERVICE_KEY'] };
  const good = { DEMO_CONFIRM: '1', DEMO_TARGET: DEMO };
  const token = (claims) => 'h.' + Buffer.from(JSON.stringify(claims)).toString('base64url') + '.s';
  const dbUrl = (ref) => 'postgresql://postgres.' + ref + ':' + SECRET + '@pooler.example.test:5432/postgres';

  const cases = [
    ['passes on the demo reference', EXIT.OK, { env: good, config }],
    ['passes on a URL whose host label is the demo reference', EXIT.OK, { env: { ...good, DEMO_TARGET: 'https://' + DEMO + '.example.test/' }, config }],
    ['passes with demo connection strings and a demo key', EXIT.OK, { env: { ...good, DB_URL: dbUrl(DEMO), API_URL: 'https://' + DEMO + '.example.test', SERVICE_KEY: token({ ref: DEMO }) }, config }],
    ['passes with values from the environment only', EXIT.OK, { env: { ...good, DEMO_ALLOW_TARGET: DEMO, DEMO_DENY_TARGETS: PROD }, config: {} }],
    ['refuses with no confirmation', EXIT.MISSING, { env: { DEMO_TARGET: DEMO }, config }],
    ['refuses with no target', EXIT.MISSING, { env: { DEMO_CONFIRM: '1' }, config }],
    ['refuses with no demo value', EXIT.MISSING, { env: good, config: { production: [PROD] } }],
    ['refuses with no production value', EXIT.MISSING, { env: good, config: { demo: DEMO } }],
    ['refuses a placeholder demo value', EXIT.MISSING, { env: good, config: { demo: '<demo project reference>', production: [PROD] } }],
    ['refuses a placeholder production value', EXIT.MISSING, { env: good, config: { demo: DEMO, production: ['<production project reference>'] } }],
    ['refuses when the file and the environment disagree on demo', EXIT.MISSING, { env: { ...good, DEMO_ALLOW_TARGET: 'otherref000000000002' }, config }],
    ['refuses a target equal to production', EXIT.PRODUCTION, { env: { ...good, DEMO_TARGET: PROD }, config }],
    ['refuses a URL containing production', EXIT.PRODUCTION, { env: { ...good, DEMO_TARGET: 'https://' + PROD + '.example.test' }, config }],
    ['refuses production in upper case', EXIT.PRODUCTION, { env: { ...good, DEMO_TARGET: PROD.toUpperCase() }, config }],
    ['refuses a production database URL beside a demo target', EXIT.PRODUCTION, { env: { ...good, DB_URL: dbUrl(PROD) }, config }],
    ['refuses a key whose payload names production', EXIT.PRODUCTION, { env: { ...good, SERVICE_KEY: token({ ref: PROD }) }, config }],
    ['refuses a production value added through the environment', EXIT.PRODUCTION, { env: { ...good, DEMO_TARGET: 'secondprod0000000007', DEMO_DENY_TARGETS: 'secondprod0000000007' }, config }],
    ['refuses a config whose demo value is production', EXIT.PRODUCTION, { env: { ...good, DEMO_TARGET: PROD }, config: { demo: PROD, production: [PROD] } }],
    ['refuses an unlisted target', EXIT.NOT_DEMO, { env: { ...good, DEMO_TARGET: 'someotherref00000003' }, config }],
    ['refuses a target that only contains the demo reference', EXIT.NOT_DEMO, { env: { ...good, DEMO_TARGET: 'https://' + DEMO + 'x.example.test' }, config }],
    ['refuses a database URL for another project', EXIT.NOT_DEMO, { env: { ...good, DB_URL: dbUrl('someotherref00000003') }, config }],
    ['refuses a key for another project', EXIT.NOT_DEMO, { env: { ...good, SERVICE_KEY: token({ ref: 'someotherref00000003' }) }, config }],
    ['refuses a local target without DEMO_ALLOW_LOCAL', EXIT.NOT_DEMO, { env: { ...good, DEMO_TARGET: 'http://127.0.0.1:54321' }, config }],
    ['passes a local target with DEMO_ALLOW_LOCAL=1', EXIT.OK, { env: { ...good, DEMO_TARGET: 'http://127.0.0.1:54321', DEMO_ALLOW_LOCAL: '1', DB_URL: 'postgresql://postgres:' + SECRET + '@127.0.0.1:54322/postgres' }, config }],
    ['refuses a local target with a hosted database URL', EXIT.NOT_DEMO, { env: { ...good, DEMO_TARGET: 'http://localhost:54321', DEMO_ALLOW_LOCAL: '1', DB_URL: dbUrl(DEMO) }, config }],
  ];

  let failed = 0;
  for (const [label, want, input] of cases) {
    const verdict = assertDemoTarget(input);
    const leaked = JSON.stringify(verdict).includes(SECRET);
    const ok = verdict.code === want && !leaked;
    if (!ok) failed++;
    write((ok ? 'ok   ' : 'FAIL ') + label + ' (exit ' + verdict.code + (ok ? '' : ', wanted ' + want) + (leaked ? ', printed a secret' : '') + ')\n');
  }
  write(failed ? failed + ' of ' + cases.length + ' self-test cases failed\n' : 'demo-guard self-test: ' + cases.length + ' cases passed\n');
  return failed === 0;
}

// ---------------------------------------------------------------------------

function main(argv) {
  const opts = { quiet: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--selftest') process.exit(selftest() ? EXIT.OK : EXIT.ERROR);
    else if (a === '--target') opts.target = argv[++i];
    else if (a === '--config') opts.configFile = argv[++i];
    else if (a === '--quiet') opts.quiet = true;
    else if (a === '-h' || a === '--help') {
      const text = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n');
      const end = text.findIndex((l, n) => n > 0 && !l.startsWith('//'));
      process.stdout.write(text.slice(1, end).map((l) => l.replace(/^\/\/ ?/, '')).join('\n') + '\n');
      process.exit(EXIT.OK);
    } else {
      process.stderr.write('demo-guard: unknown argument ' + a + '\n');
      process.exit(EXIT.ERROR);
    }
  }
  guardOrExit(opts);
  process.exit(EXIT.OK);
}

// Run as a CLI only when this file is the entry point. Compare real paths, so
// a symlinked directory (macOS /tmp) does not make the CLI silently do nothing.
function isEntryPoint() {
  if (!process.argv[1]) return false;
  try {
    return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
  } catch { return false; }
}

if (isEntryPoint()) main(process.argv.slice(2));
