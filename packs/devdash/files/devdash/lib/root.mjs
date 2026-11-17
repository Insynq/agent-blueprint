// Where things are. Every script and the server import this, so they agree on
// which checkout is the project, where the owner's data lives and what the
// settings are.
//
// The dash serves from the MAIN checkout even when a copy of it is run from a
// linked worktree, and the owner's data lives in one place that every worktree
// shares. See devdash/README.md, "Where data lives".

import { execFile, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const DASH_DIR = path.resolve(here, '..');
// The checkout this copy of the dash sits in (may be a linked worktree).
export const CHECKOUT = path.resolve(DASH_DIR, '..');

export function gitSync(args, cwd = CHECKOUT, timeout = 5000) {
  try {
    return execFileSync('git', args, {
      cwd, encoding: 'utf8', timeout, stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 32 * 1024 * 1024,
    });
  } catch { return null; }
}

export function git(args, cwd = ROOT, timeout = 8000, encoding = 'utf8') {
  return new Promise((resolve) => {
    execFile('git', args, { cwd, timeout, encoding, maxBuffer: 32 * 1024 * 1024 }, (err, out) => resolve(err ? null : out));
  });
}

function real(p) { try { return fs.realpathSync(p); } catch { return path.resolve(p); } }

function findRoot() {
  const top = gitSync(['rev-parse', '--show-toplevel']);
  // Not a repository, or nested inside someone else's: no git features.
  if (!top || real(top.trim()) !== real(CHECKOUT)) return { root: CHECKOUT, repo: false };
  const common = gitSync(['rev-parse', '--path-format=absolute', '--git-common-dir']);
  if (common) {
    const main = path.dirname(common.trim());
    if (path.basename(common.trim()) === '.git' && fs.existsSync(path.join(main, 'devdash'))) {
      return { root: real(main), repo: true };
    }
  }
  return { root: real(CHECKOUT), repo: true };
}

const found = findRoot();
// The main checkout. Docs, definitions and data are resolved against this.
export const ROOT = found.root;
export const IS_REPO = found.repo;
export const IS_LINKED_WORKTREE = real(CHECKOUT) !== ROOT;
// The owner's answers, results, screenshots, journal and tokens. Local only.
export const DATA = path.resolve(process.env.DEVDASH_DATA || path.join(ROOT, 'devdash', '.data'));

const DEFAULTS = {
  project: '',
  owner: '',
  port: 4317,
  environments: [],
  readRef: 'auto',          // auto | worktree | a git ref such as origin/main
  autostart: true,          // SessionStart starts the server if it is not running
  logNudgeMinutes: 90,      // Stop-hook reminder to write the daily log; 0 turns it off
  idleDays: 3,              // an untouched sitting is flagged after this many days
};

export function config() {
  let file = {};
  try { file = JSON.parse(fs.readFileSync(path.join(ROOT, 'devdash', 'config.json'), 'utf8')); } catch { /* defaults */ }
  const c = { ...DEFAULTS, ...file };
  if (process.env.DEVDASH_PORT) c.port = Number(process.env.DEVDASH_PORT);
  if (process.env.DEVDASH_REF) c.readRef = process.env.DEVDASH_REF;
  if (!c.project) c.project = path.basename(ROOT);
  if (!Number.isInteger(c.port) || c.port < 1 || c.port > 65535) c.port = DEFAULTS.port;
  if (!Array.isArray(c.environments)) c.environments = [];
  return c;
}

const pad = (n) => String(n).padStart(2, '0');
// Local calendar day. The daily log and "passed on" dates are the owner's days, not UTC days.
export function localDay(d = new Date()) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}
export function addDays(day, n) {
  const d = new Date(day + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return localDay(d);
}
export const nowIso = () => new Date().toISOString();

export function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

// Write through a temporary file so a crash never leaves half a file behind.
export function atomicWrite(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp-' + process.pid;
  fs.writeFileSync(tmp, typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n');
  fs.renameSync(tmp, file);
}
