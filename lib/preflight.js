'use strict';

// Pre-flight gates run before any download or write. Each gate either:
//   - passes (returns void, possibly with a `notice` payload added to ctx),
//   - prompts to remediate (and returns void on success),
//   - throws PreflightError with an exit code (caller exits cleanly).

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const log = require('./log');
const prompt = require('./prompt');

class PreflightError extends Error {
  constructor(message, exitCode = 1) {
    super(message);
    this.name = 'PreflightError';
    this.exitCode = exitCode;
  }
}

// Framework skill names, used to report user-global commands or skills that
// share a name with one. Keep in step with .claude/skills/ and the packs.
const FRAMEWORK_SKILL_NAMES = [
  'adopt', 'audit-code', 'audit-full', 'brainstorm', 'debug', 'gen-test',
  'implement', 'investigate', 'kickoff', 'orchestrate', 'plan', 'plan-review',
  'preflight', 'research', 'ship', 'stress-test', 'triage', 'unify',
  'update-framework', 'update-kb',
  // packs
  'audit-rls', 'db-push', 'deploy', 'gen-component', 'gen-migration',
  'dash', 'dash-questions', 'dash-sitting',
];

function runGitSync(args, cwd) {
  try {
    const out = execFileSync('git', args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
    });
    return { ok: true, stdout: out };
  } catch (err) {
    return {
      ok: false,
      stderr: (err.stderr && err.stderr.toString()) || err.message,
      status: err.status,
    };
  }
}

// Gate 1: not running as root (unless --allow-root). Common npx footgun.
async function gateNotRoot(ctx) {
  if (typeof process.getuid !== 'function') return; // Windows
  if (process.getuid() !== 0) return;
  if (ctx.flags.allowRoot) {
    log.warn('Running as root; --allow-root specified. Files may be owned by root.');
    return;
  }
  throw new PreflightError(
    'Refusing to run as root. Framework files would be owned by root and ' +
    'break for the dev user. Re-run as your normal user. ' +
    '(Override with --allow-root if you really mean it.)'
  );
}

// Gate 2: must be a git repo. Offer git init if not.
async function gateGitRepo(ctx) {
  const r = runGitSync(['rev-parse', '--is-inside-work-tree'], ctx.repoRoot);
  if (r.ok && r.stdout.trim() === 'true') {
    // Verify we're at the worktree root (not a subdirectory). The installer
    // expects to write at the repo root.
    const top = runGitSync(['rev-parse', '--show-toplevel'], ctx.repoRoot);
    if (top.ok) {
      const topPath = path.resolve(top.stdout.trim());
      if (topPath !== path.resolve(ctx.repoRoot)) {
        throw new PreflightError(
          'Run install from the git repo root, not a subdirectory.\n' +
          '  current dir: ' + ctx.repoRoot + '\n' +
          '  repo root:   ' + topPath + '\n' +
          'cd to ' + topPath + ' and re-run.'
        );
      }
    }
    return;
  }

  if (ctx.flags.autoYes) {
    throw new PreflightError(
      'Not a git repo. Re-run after `git init` or run interactively to be ' +
      'prompted to initialize one.'
    );
  }

  const proceed = await prompt.confirm(
    'Not a git repo. Initialize one before install?',
    { defaultYes: true }
  );
  if (!proceed) {
    throw new PreflightError(
      'Install requires a git repo so changes are reviewable. ' +
      'Re-run after `git init`.'
    );
  }
  try {
    execFileSync('git', ['init'], { cwd: ctx.repoRoot, stdio: 'ignore' });
    log.info('  Initialized empty git repo at ' + ctx.repoRoot);
  } catch (err) {
    throw new PreflightError('git init failed: ' + err.message);
  }
}

// Gate 3: working tree clean. Honor --force-dirty.
async function gateCleanTree(ctx) {
  const r = runGitSync(['status', '--porcelain'], ctx.repoRoot);
  if (!r.ok) {
    throw new PreflightError('git status failed: ' + (r.stderr || 'unknown error'));
  }
  if (r.stdout.trim() === '') return;

  if (ctx.flags.forceDirty) {
    log.warn(
      'Working tree is dirty; --force-dirty specified. ' +
      'Recovery via `git diff` will conflate your changes with the install.'
    );
    return;
  }
  throw new PreflightError(
    'Working tree is dirty. The installer requires a clean tree so the ' +
    'install diff is reviewable.\n' +
    '  Either commit/stash your changes, or re-run with --force-dirty.\n' +
    '  Recovery from a bad install relies on `git diff`.'
  );
}

// Gate 4: repo writable from current directory. Test-write a probe file.
async function gateRepoWritable(ctx) {
  const probeDir = path.join(ctx.repoRoot, '.framework-install-staging');
  let createdProbeDir = false;
  try {
    if (!fs.existsSync(probeDir)) {
      await fsp.mkdir(probeDir, { recursive: true });
      createdProbeDir = true;
    }
    const probeFile = path.join(probeDir, '.write-test');
    await fsp.writeFile(probeFile, 'ok');
    await fsp.unlink(probeFile);
  } catch (err) {
    throw new PreflightError(
      'Repo not writable from ' + ctx.repoRoot + ': ' + err.message + '\n' +
      'Check directory permissions and re-run.'
    );
  } finally {
    if (createdProbeDir) {
      try { await fsp.rmdir(probeDir); } catch { /* leave if non-empty */ }
    }
  }
}

// Gate 5: refuse if .framework-version already exists. V1 idempotency hint.
async function gateNotAlreadyInstalled(ctx) {
  const fvPath = path.join(ctx.repoRoot, '.framework-version');
  if (!fs.existsSync(fvPath)) return;
  let parsed = null;
  try {
    parsed = JSON.parse(await fsp.readFile(fvPath, 'utf8'));
  } catch { /* ignore */ }
  const version = (parsed && parsed.version) || '<unknown>';
  const installedAt = (parsed && parsed.installed_at) || '<unknown>';
  throw new PreflightError(
    'Framework already installed (version ' + version + ', installed ' + installedAt + ').\n' +
    '  Run `/update-framework` to update, or delete .framework-version to force re-install.'
  );
}

// Gate 6 (informational): apps/ or packages/ at the root. The framework is
// installed once, at the repository root, and covers every surface in it.
async function gateNotMonorepo(ctx) {
  const apps = fs.existsSync(path.join(ctx.repoRoot, 'apps'));
  const packages = fs.existsSync(path.join(ctx.repoRoot, 'packages'));
  if (!apps && !packages) return;
  log.info('  Multi-package repository detected. Installing once at the root, which is the intended layout.');
}

// Gate 7 (informational): user-global commands or skills that share a name
// with a framework skill. Nothing enforces which body runs, so report them
// and leave the decision to the user.
async function gateUserGlobalShadows(ctx) {
  const home = os.homedir();
  if (!home) return;
  const found = [];
  const commandsDir = path.join(home, '.claude', 'commands');
  const skillsDir = path.join(home, '.claude', 'skills');
  for (const n of FRAMEWORK_SKILL_NAMES) {
    if (fs.existsSync(path.join(commandsDir, n + '.md'))) found.push('~/.claude/commands/' + n + '.md');
    if (fs.existsSync(path.join(skillsDir, n))) found.push('~/.claude/skills/' + n + '/');
  }
  if (!found.length) return;
  log.info('');
  log.info('User-global commands or skills share a name with framework skills:');
  for (const f of found) log.info('  ' + f);
  log.info('Check which body runs after install, or rename them.');
  ctx.deferredShadows = found;
}

// Gate 8 (informational): existing .claude/commands/ files. The framework no
// longer ships commands, so these are the project's own and are left alone.
async function gateUserAuthoredCommandsNotice(ctx) {
  const localDir = path.join(ctx.repoRoot, '.claude', 'commands');
  if (!fs.existsSync(localDir)) return;
  let entries;
  try { entries = await fsp.readdir(localDir); } catch { return; }
  const userAuthored = entries.filter((f) => f.endsWith('.md'));
  if (userAuthored.length) ctx.userAuthoredCommands = userAuthored;
}

async function runAll(ctx) {
  log.info('Pre-flight gates:');
  await gateNotRoot(ctx);          log.debug('  [pass] not-root');
  await gateGitRepo(ctx);          log.debug('  [pass] git-repo');
  await gateCleanTree(ctx);        log.debug('  [pass] clean-tree');
  await gateRepoWritable(ctx);     log.debug('  [pass] repo-writable');
  await gateNotAlreadyInstalled(ctx); log.debug('  [pass] not-already-installed');
  await gateNotMonorepo(ctx);      log.debug('  [pass] not-monorepo');
  await gateUserGlobalShadows(ctx); log.debug('  [pass] user-global-shadows');
  await gateUserAuthoredCommandsNotice(ctx); log.debug('  [pass] user-authored-commands');
  log.info('  All pre-flight gates passed.');
  log.info('');
}

module.exports = {
  PreflightError,
  runAll,
  FRAMEWORK_SKILL_NAMES,
};
