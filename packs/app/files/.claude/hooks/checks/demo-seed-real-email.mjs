// Blocks a demo seed file that carries an email address at a domain which
// could deliver mail to a real person.
//
// Demo data is loaded into an environment people sign in to and click around
// in. Loading it fires the same triggers as real use, and an address at a real
// domain is one mis-set variable away from receiving a message. So every
// address in a seed file must be at a domain that cannot receive mail:
//
//   - reserved for testing: example.com, example.org, example.net, and
//     anything under .test, .example, .invalid or .localhost;
//   - or a domain the project owns and has listed in
//     scripts/demo/environments.json under "seedEmailDomains" (a demo
//     subdomain with no MX record is the usual choice). Subdomains of a listed
//     domain are accepted too.
//
// Which files: anything under scripts/demo/seed/, and any file or directory
// named demo-seed (demo-seed.sql, supabase/demo-seed/users.json). Text data
// and code only; documentation is left alone.
//
// What it deliberately misses: an address assembled at run time
// (`${handle}@${domain}`), and anything inside a URL's credentials. It only
// fails on a literal address it can read.
//
// Escape hatch, per line: put `allow-seed-email: <reason>` in a comment on
// the same line. For a format with no comments (JSON, CSV), list the domain
// in environments.json instead.

import fs from 'node:fs';
import path from 'node:path';

export const name = 'demo-seed-real-email';

const SEED_PATH = /(?:^|\/)scripts\/demo\/seed\/|(?:^|\/)demo-seed(?:\.[^/]+$|\/)/;
const TEXT = /\.(sql|ts|tsx|js|mjs|cjs|json|csv|tsv|ya?ml|py|rb|sh|txt)$/i;
const EMAIL = /(?<![\w.+-])([\w.+-]*\w)@((?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,24})(?![\w-])/gi;
const RESERVED = /^(?:(?:.+\.)?example\.(?:com|org|net)|(?:.+\.)?(?:test|example|invalid|localhost))$/i;
// "logo@2x.png" and friends are file names, not addresses.
const FILE_SUFFIX = /\.(?:png|jpe?g|gif|webp|svg|avif|ico|css|js|ts|json|map)$/i;
const ALLOW_LINE = /allow-seed-email:\s*\S/;

export function match(rel) {
  return SEED_PATH.test(rel) && TEXT.test(rel);
}

function allowedDomains(root) {
  if (!root) return [];
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'demo', 'environments.json'), 'utf8'));
    return (Array.isArray(cfg.seedEmailDomains) ? cfg.seedEmailDomains : [])
      .map((d) => String(d).trim().toLowerCase().replace(/^@/, ''))
      .filter((d) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d));
  } catch { return []; }
}

export function check(_rel, content, ctx = {}) {
  const allowed = allowedDomains(ctx.root);
  const ok = (domain) => RESERVED.test(domain) || allowed.some((a) => domain === a || domain.endsWith('.' + a));
  const problems = [];
  const seen = new Set();
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (ALLOW_LINE.test(line)) continue;
    EMAIL.lastIndex = 0;
    let m;
    while ((m = EMAIL.exec(line)) !== null) {
      const domain = m[2].toLowerCase();
      if (ok(domain) || FILE_SUFFIX.test(domain)) continue;
      // user:password@host inside a URL is a connection string, not an address.
      if (/[a-z][a-z0-9+.-]*:\/\/\S*$/i.test(line.slice(0, m.index))) continue;
      if (seen.has(domain)) continue;
      seen.add(domain);
      problems.push(
        'line ' + (i + 1) + ': an address at ' + domain + ', which can deliver mail to a real person. ' +
        'Seed accounts use a domain that cannot receive mail: example.com, example.org, or anything under .test or .invalid ' +
        '(for instance owner@demo.test). If ' + domain + ' is a domain this project owns with no mail delivery, add it to ' +
        '"seedEmailDomains" in scripts/demo/environments.json. For one deliberate exception, add a comment on the same line: ' +
        'allow-seed-email: <reason>.'
      );
    }
  }
  return problems;
}
