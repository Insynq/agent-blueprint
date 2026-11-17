#!/usr/bin/env node
// Worktree housekeeping. Lists every git worktree of this repository with
// what state its branch is in, and removes the ones that are finished.
//
//   node _dev/tools/worktrees.mjs              report
//   node _dev/tools/worktrees.mjs --prune      remove finished worktrees and their branches
//   node _dev/tools/worktrees.mjs --prune --dry-run
//   node _dev/tools/worktrees.mjs --hook       one line for a session-start hook; silent when tidy
//   node _dev/tools/worktrees.mjs --stale-days 14
//
// A worktree is FINISHED when its branch has landed and it holds nothing
// else: no uncommitted or untracked files, no unpushed commits. Landed means
// one of: the branch is an ancestor of the default branch; its pull request
// is merged (asked of `gh` when available, which is what catches squash
// merges); or its remote branch has been deleted and its tree adds nothing to
// the default branch. Only finished worktrees are ever removed. Everything
// else is reported and left alone.
//
// Never touched: the main checkout, the worktree you are standing in, a
// locked worktree, and anything with local changes.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const PRUNE = flag('--prune');
const DRY = flag('--dry-run');
const HOOK = flag('--hook');
const STALE_DAYS = Number(args[args.indexOf('--stale-days') + 1]) || 14;

function git(a, cwd, quiet = true) {
  try {
    return execFileSync('git', a, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', quiet ? 'ignore' : 'pipe'] }).trim();
  } catch { return null; }
}

const here = git(['rev-parse', '--show-toplevel'], process.cwd());
if (!here) { if (!HOOK) console.error('Not inside a git repository.'); process.exit(HOOK ? 0 : 1); }

function defaultRef() {
  const head = git(['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], here);
  if (head) return head;
  for (const r of ['origin/main', 'origin/master', 'main', 'master']) {
    if (git(['rev-parse', '--verify', '--quiet', r], here)) return r;
  }
  return null;
}

function parseWorktrees() {
  const out = git(['worktree', 'list', '--porcelain'], here) || '';
  return out.split('\n\n').filter(Boolean).map((block) => {
    const w = { locked: false, prunable: false, detached: false };
    for (const line of block.split('\n')) {
      const [k, ...rest] = line.split(' ');
      const v = rest.join(' ');
      if (k === 'worktree') w.path = v;
      else if (k === 'HEAD') w.head = v;
      else if (k === 'branch') w.branch = v.replace('refs/heads/', '');
      else if (k === 'locked') w.locked = true;
      else if (k === 'prunable') w.prunable = true;
      else if (k === 'detached') w.detached = true;
    }
    return w;
  });
}

let ghChecked = null;
function prMerged(branch) {
  if (ghChecked === false || HOOK) return null; // the hook stays offline and fast
  try {
    const out = execFileSync('gh', ['pr', 'list', '--state', 'merged', '--head', branch, '--json', 'number', '--limit', '1'],
      { cwd: here, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 15000 });
    ghChecked = true;
    const prs = JSON.parse(out);
    return prs.length ? prs[0].number : 0;
  } catch { ghChecked = false; return null; }
}

function classify(w, base, isMain) {
  const r = { ...w, state: 'active', why: '', dirty: 0, unpushed: 0, ageDays: null };
  if (isMain) { r.state = 'main'; return r; }
  if (w.prunable || !fs.existsSync(w.path)) { r.state = 'missing'; r.why = 'directory is gone'; return r; }
  if (path.resolve(w.path) === path.resolve(here)) { r.state = 'current'; r.why = 'you are in it'; }

  const status = git(['status', '--porcelain'], w.path);
  r.dirty = status ? status.split('\n').filter(Boolean).length : 0;
  const ts = Number(git(['log', '-1', '--format=%ct'], w.path));
  if (ts) r.ageDays = Math.floor((Date.now() / 1000 - ts) / 86400);

  let landed = null;
  if (w.branch && base) {
    if (git(['merge-base', '--is-ancestor', w.branch, base], here) !== null) {
      // An untouched new branch is also an ancestor. It has landed only if it ever diverged.
      const ahead = git(['rev-list', '--count', base + '..' + w.branch], here);
      const created = git(['reflog', 'show', '--format=%H', w.branch], here);
      const moved = created ? new Set(created.split('\n')).size > 1 : false;
      if (ahead === '0' && moved) landed = 'merged into ' + base;
    }
    const upstream = git(['rev-parse', '--abbrev-ref', w.branch + '@{upstream}'], here);
    const track = git(['for-each-ref', '--format=%(upstream:track)', 'refs/heads/' + w.branch], here) || '';
    const gone = track.includes('gone');
    if (upstream && !gone) {
      const n = git(['rev-list', '--count', upstream + '..' + w.branch], here);
      r.unpushed = Number(n) || 0;
    } else if (!upstream) {
      r.unpushed = Number(git(['rev-list', '--count', base + '..' + w.branch], here)) || 0;
    }
    if (!landed) {
      const pr = prMerged(w.branch);
      if (pr) { landed = 'pull request #' + pr + ' merged'; r.unpushed = 0; r.squashed = true; }
    }
    if (!landed && gone) {
      // Remote branch deleted. Landed only if merging it into the default branch would change nothing.
      const mb = git(['merge-base', base, w.branch], here);
      const merged = mb && git(['merge-tree', '--write-tree', base, w.branch], here);
      const baseTree = git(['rev-parse', base + '^{tree}'], here);
      if (merged && merged.split('\n')[0] === baseTree) { landed = 'remote branch deleted and nothing left to merge'; r.unpushed = 0; r.squashed = true; }
      else r.why = 'remote branch deleted but it still differs from ' + base;
    }
  }

  if (r.state === 'current') return r;
  if (w.locked) { r.state = 'locked'; r.why = 'locked'; return r; }
  if (landed && r.dirty === 0 && r.unpushed === 0) { r.state = 'finished'; r.why = landed; return r; }
  if (landed) { r.state = 'landed-with-leftovers'; r.why = landed + '; ' + [r.dirty && r.dirty + ' uncommitted or untracked', r.unpushed && r.unpushed + ' unpushed'].filter(Boolean).join(', '); return r; }
  if (r.ageDays !== null && r.ageDays >= STALE_DAYS) { r.state = 'stale'; r.why = (r.why ? r.why + '; ' : '') + 'no commit for ' + r.ageDays + ' days'; return r; }
  if (w.detached) r.why = 'detached HEAD';
  return r;
}

const base = defaultRef();
const all = parseWorktrees();
const rows = all.map((w, i) => classify(w, base, i === 0));
const by = (s) => rows.filter((r) => r.state === s);
const finished = by('finished');
const missing = by('missing');
const leftovers = by('landed-with-leftovers');
const stale = by('stale');

if (HOOK) {
  const bits = [];
  if (finished.length + missing.length) bits.push((finished.length + missing.length) + ' finished');
  if (leftovers.length) bits.push(leftovers.length + ' landed but holding uncommitted work');
  if (stale.length) bits.push(stale.length + ' untouched for ' + STALE_DAYS + '+ days');
  if (bits.length) {
    const todo = [];
    if (finished.length + missing.length) todo.push('remove the finished ones now with `node _dev/tools/worktrees.mjs --prune` (no need to ask)');
    if (leftovers.length || stale.length) todo.push('run `node _dev/tools/worktrees.mjs` and tell the user about the rest');
    console.log('Worktrees: ' + bits.join(', ') + '. ' + todo.join('; ') + '.');
  }
  process.exit(0);
}

const rel = (p) => path.relative(path.dirname(all[0].path), p) || p;
console.log('Default branch: ' + (base || '(not found; nothing can be judged landed)') +
  (ghChecked === false ? '   (gh not available: squash merges are detected only once the remote branch is deleted)' : ''));
for (const r of rows) {
  console.log('  ' + r.state.padEnd(22) + (r.branch || '(detached)').padEnd(34) + rel(r.path) + (r.why ? '\n' + ' '.repeat(24) + r.why : ''));
}

if (!PRUNE) {
  if (finished.length + missing.length) console.log('\n' + (finished.length + missing.length) + ' can be removed with --prune.');
  process.exit(0);
}

let removed = 0;
if (missing.length) {
  console.log((DRY ? '[dry run] ' : '') + 'git worktree prune  (' + missing.length + ' missing)');
  if (!DRY) git(['worktree', 'prune'], here);
  removed += missing.length;
}
for (const r of finished) {
  console.log((DRY ? '[dry run] ' : '') + 'remove ' + rel(r.path) + ' and branch ' + r.branch + '  (' + r.why + ')');
  if (DRY) { removed += 1; continue; }
  // No --force: git itself refuses if anything appeared since we looked.
  if (git(['worktree', 'remove', r.path], here) === null) { console.log('  left in place: git refused (changed since it was checked)'); continue; }
  // -d refuses an unmerged branch. A squash-merged branch needs -D, used only when the landing was confirmed above.
  if (git(['branch', r.squashed ? '-D' : '-d', r.branch], here) === null) console.log('  worktree removed; branch ' + r.branch + ' kept (git would not delete it)');
  removed += 1;
}
console.log(removed ? (DRY ? 'Would remove ' : 'Removed ') + removed + '.' : 'Nothing to remove.');
if (leftovers.length || stale.length) console.log('Left alone: ' + leftovers.length + ' with leftovers, ' + stale.length + ' stale. Decide those by hand.');
