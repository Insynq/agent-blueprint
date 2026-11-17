'use strict';

// Post-install message. Plain text — no banners, no TUI.
// Conditionally surfaces deferred user-global shadow remediation.

const log = require('./log');

function print({
  manifest,
  appliedSummary,    // { created, skipped, sibling, overwritten }
  deferredShadows,   // [string] basenames of shadowing commands, may be empty/null
}) {
  log.blank();
  log.info('Install complete — @insynq/' + manifest.name + ' v' + manifest.version);
  log.blank();

  log.info(
    'Files written: ' + appliedSummary.created +
    ' (' + appliedSummary.overwritten + ' overwritten with backup, ' +
    appliedSummary.sibling + ' as .framework siblings)'
  );
  log.info('Files preserved (skip on conflict): ' + appliedSummary.skipped);
  log.blank();

  log.info('Next steps:');
  log.info('  1. Run /preflight             # records your agent + OS in CLAUDE.md');
  log.info('  2. Run /adopt                 # discovery for an existing project');
  log.info('                                #  (or /kickoff if this is a fresh project)');
  log.info('  3. Commit:  git add . && git commit -m "Add @insynq/agent-blueprint v' +
           manifest.version + '"');
  log.blank();

  log.info('Framework ownership:');
  log.info('  Framework owns:  .claude/skills, agents, rules and hooks; docs/WORKFLOW.md');
  log.info('  You own:         your code, docs/plans/, LESSONS, the smoke ledger, project skills you add');
  log.info('  Shared:          CLAUDE.md and .claude/settings.json (merged during /adopt; see *.framework siblings)');
  log.info('  Packs:           recorded in .framework-packs.json');
  log.blank();

  log.info('Updates:');
  log.info('  Run /update-framework to pull the latest version when canonical releases.');
  log.info('  See ' + manifest.canonical_url + ' for changelog.');

  if (deferredShadows && deferredShadows.length) {
    log.blank();
    log.info('!! Action required (deferred from pre-flight):');
    log.info('   ' + deferredShadows.length +
             ' user-global command(s) or skill(s) share a name with a framework skill:');
    for (const f of deferredShadows) log.info('     ' + f);
    log.blank();
    log.info('   Rename or remove them under ~/.claude/commands/ and ~/.claude/skills/,');
    log.info('   then check which body runs. /preflight reports this too.');
  }
  log.blank();
}

module.exports = { print };
