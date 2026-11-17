// Checks runbooks under agent/runbooks/.
//
// Scheduled runs read a runbook straight from the working tree, so a write
// step saved without an authorisation gate is live at the next scheduled run,
// before anyone has approved it. This check fails a runbook that mentions a
// write flag and has no gate section. It checks nothing else: whether a gate
// is worded well is a judgment, and this hook only blocks what is definitely
// wrong.

export const name = 'runbook';

const RUNBOOK = /^agent\/runbooks\/[^/]+\/RUNBOOK\.md$/;

// A heading at any level: "Authorisation gate" or "Authorization gate".
const GATE_HEADING = /^#{1,6}\s+.*\bauthori[sz]ation gate\b/im;

// Things that only appear when a step can change something.
const WRITE_FLAGS = [
  { re: /(^|[^\w-])--confirm\b/, label: '--confirm' },
  { re: /(^|[^\w-])--write\b/, label: '--write' },
  { re: /(^|[^\w-])--commit\b/, label: '--commit' },
  { re: /(^|[^\w-])--apply\b/, label: '--apply' },
  { re: /\b[A-Z][A-Z0-9_]*_WRITE_AUTHORIZED\b/, label: 'a *_WRITE_AUTHORIZED variable' },
];

export function match(rel) {
  return RUNBOOK.test(rel);
}

export function check(rel, content) {
  if (GATE_HEADING.test(content)) return [];
  const lines = content.split(/\r?\n/);
  for (const flag of WRITE_FLAGS) {
    const at = lines.findIndex((l) => flag.re.test(l));
    if (at !== -1) {
      return [
        'line ' + (at + 1) + ' mentions ' + flag.label + ' but the runbook has no "## Authorisation gate" section. ' +
        'Scheduled runs read this file from the working tree, so an ungated write step runs at the next scheduled fire. ' +
        'Add a "## Authorisation gate" section near the top saying whether the gate is open or closed (a new write step starts closed), ' +
        'who opens it, and that the runbook dry-runs while it is closed. See agent/runbooks/README.md.',
      ];
    }
  }
  return [];
}
