// CLAUDE.md loads into every session, so its size is paid on every turn, and
// a file that has become a history log stops being read closely. The rule
// "keep it short" did not hold in practice (one project's reached 338 KB), so
// this makes it mechanical. Nested CLAUDE.md files are held to the same cap.

export const name = 'claude-md-size';

const CAP = Number(process.env.CLAUDE_MD_MAX_CHARS || 40000);

export function match(rel) {
  return rel === 'CLAUDE.md' || rel.endsWith('/CLAUDE.md');
}

export function check(rel, content) {
  if (content.length <= CAP) return [];
  const longest = content.split(/\r?\n/).reduce((m, l, i) => (l.length > m.len ? { len: l.length, at: i + 1 } : m), { len: 0, at: 0 });
  return [
    content.length + ' characters, over the cap of ' + CAP + '. This file is loaded into every session. ' +
    'Move history to docs/CHANGELOG.md, phase detail to docs/KB_8_Current_State.md, and stack reference to docs/ ' +
    'or a path-scoped rule in .claude/rules/, leaving a one-line pointer. ' +
    'The longest line is line ' + longest.at + ' (' + longest.len + ' characters). ' +
    'Set CLAUDE_MD_MAX_CHARS to change the cap.',
  ];
}
