// Blocks the two unmistakable kinds of fixture in a migration file:
//
//   1. an INSERT into auth.users or auth.identities (a login account created
//      by a migration exists in production with whatever password the file
//      gave it);
//   2. an INSERT statement carrying an email address at a domain reserved for
//      testing (example.com, example.org, example.net, *.test, *.example,
//      *.invalid, localhost).
//
// Migrations run in production; fixtures belong in the seed file or the demo
// loader. Reference rows that production needs are not flagged: this check
// deliberately misses anything it cannot be sure about. It ignores comments
// and the bodies of dollar-quoted functions, so a function that inserts into
// auth.users at run time is left alone.
//
// Escape hatch for the rare legitimate case: a comment in the file of the form
//   -- allow-fixture: <reason>

export const name = 'migration-no-fixtures';

const MIGRATION = /(?:^|\/)migrations\/\d{4,}_[^/]*\.sql$/;
const ALLOW = /--\s*allow-fixture:\s*\S/;
const AUTH_TABLE = /^insert\s+into\s+(?:only\s+)?"?auth"?\s*\.\s*"?(users|identities)"?(?![\w"])/i;
const TEST_EMAIL = /[\w.+-]+@(?:example\.(?:com|org|net)|(?:[\w-]+\.)*(?:test|example|invalid)|localhost)(?![\w.-])/i;

export function match(rel) {
  return MIGRATION.test(rel);
}

// Replace a matched span with spaces, keeping newlines, so that line numbers
// in what is left still point at the original file.
function blank(s) {
  return s.replace(/[^\n]/g, ' ');
}

export function check(_rel, content) {
  if (ALLOW.test(content)) return [];
  const sql = content
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(\$[A-Za-z_]*\$)[\s\S]*?\1/g, blank)
    .replace(/--[^\n]*/g, blank);

  const problems = [];
  let offset = 0;
  for (const piece of sql.split(';')) {
    const lead = piece.length - piece.trimStart().length;
    const stmt = piece.trim();
    const line = sql.slice(0, offset + lead).split('\n').length;
    offset += piece.length + 1;
    if (!/^insert\s+into\b/i.test(stmt)) continue;

    const auth = AUTH_TABLE.exec(stmt);
    if (auth) {
      problems.push(
        'line ' + line + ': INSERT into auth.' + auth[1].toLowerCase() + '. A migration runs in production, so this creates a real login account there. ' +
        'Create test and demo users in the seed file or the demo loader. If production does need this row, add a comment "-- allow-fixture: <reason>".'
      );
      continue;
    }
    const email = TEST_EMAIL.exec(stmt);
    if (email) {
      problems.push(
        'line ' + line + ': INSERT with the test address ' + email[0] + '. That is fixture data, and a migration runs in production. ' +
        'Move the row to the seed file or the demo loader. If production does need this row, add a comment "-- allow-fixture: <reason>".'
      );
    }
  }
  return problems;
}
