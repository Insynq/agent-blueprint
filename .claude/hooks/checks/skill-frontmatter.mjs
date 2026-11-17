// Checks Claude Code skills and subagent definitions under .claude/.
// Each failure here is something that parses fine and then silently
// misbehaves: a skill the router cannot find, or template syntax that
// reaches a tool as literal text.

export const name = 'skill-frontmatter';

const SKILL = /^\.claude\/skills\/([^/]+)\/SKILL\.md$/;
const AGENT = /^\.claude\/agents\/([^/]+)\.md$/;

export function match(rel) {
  return SKILL.test(rel) || AGENT.test(rel);
}

export function frontmatter(content) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(content);
  if (!m) return null;
  const fields = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (kv) fields[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return { fields, body: content.slice(m[0].length) };
}

export function check(rel, content) {
  const problems = [];
  const skill = SKILL.exec(rel);
  const expected = skill ? skill[1] : AGENT.exec(rel)[1];
  const fm = frontmatter(content);
  if (!fm) return ['no frontmatter block. The file must start with --- and a description.'];

  if (!fm.fields.description) {
    problems.push('frontmatter has no description. It is the only thing used to select this ' + (skill ? 'skill' : 'agent') + '.');
  }
  if (fm.fields.name && fm.fields.name !== expected) {
    problems.push('name "' + fm.fields.name + '" does not match ' + (skill ? 'the folder' : 'the file') + ' name "' + expected + '".');
  }
  if (!fm.fields.name) {
    problems.push('frontmatter has no name. Add name: ' + expected + '.');
  }
  if ('user-invokable' in fm.fields) {
    problems.push('the field is spelled user-invocable.');
  }
  if (skill) {
    // Template syntax is never substituted. Lines that quote it in backticks
    // to name the anti-pattern are fine.
    fm.body.split(/\r?\n/).forEach((line, i) => {
      const bare = line.replace(/`[^`]*`/g, '');
      if (/\$ARGUMENTS\.[A-Za-z]/.test(bare)) {
        problems.push('line ' + (i + 1) + ': $ARGUMENTS.<name> is not substituted. $ARGUMENTS is one flat string; parse it in prose.');
      }
      if (/\{\{\s*[#/]?\w/.test(bare)) {
        problems.push('line ' + (i + 1) + ': {{...}} template syntax is not substituted. Write the condition in prose.');
      }
    });
  }
  return problems;
}
