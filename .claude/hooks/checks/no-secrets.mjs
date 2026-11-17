// Rejects an edit that puts a recognisable credential into a file that is
// not an ignored env file. Only formats that are unambiguous are matched, so
// a hit is a real key and not a false alarm. See docs/SECRETS.md.

export const name = 'no-secrets';

const PATTERNS = [
  ['Anthropic API key', /\bsk-ant-[A-Za-z0-9_-]{20,}/],
  ['OpenAI API key', /\bsk-(?:proj-)?[A-Za-z0-9]{32,}\b/],
  ['Stripe live key', /\b[sr]k_live_[A-Za-z0-9]{16,}/],
  ['Stripe webhook secret', /\bwhsec_[A-Za-z0-9]{24,}/],
  ['GitHub token', /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b/],
  ['GitHub fine-grained token', /\bgithub_pat_[A-Za-z0-9_]{40,}/],
  ['AWS access key id', /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/],
  ['Slack token', /\bxox[abprs]-[A-Za-z0-9-]{20,}/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['private key block', /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/],
  ['signed service-role or secret JWT', /\beyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{40,}\.[A-Za-z0-9_-]{20,}/],
];

export function match(rel) {
  const base = rel.split('/').pop();
  // Real env files are ignored by git and are where values belong.
  if (/^\.env(\..+)?$/.test(base) && !/\.(example|sample|template)$/.test(base)) return false;
  if (/\.(png|jpg|jpeg|gif|webp|pdf|ico|woff2?|zip|gz|lock)$/i.test(base)) return false;
  return true;
}

export function check(rel, content) {
  const problems = [];
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (/allow-secret:/.test(lines[i])) continue; // e.g. a documented fake in a test, with the reason after the colon
    for (const [label, re] of PATTERNS) {
      if (re.test(lines[i])) {
        problems.push('line ' + (i + 1) + ' contains what looks like a credential (' + label + '). Secrets do not go in the repository: ' +
          'put the name in .env.example and the value in the secrets manager or an ignored .env file. ' +
          'If this value was real, it is now compromised and must be rotated. ' +
          'For a deliberate fake, add "allow-secret: <reason>" on the line.');
        break;
      }
    }
  }
  return problems;
}
