#!/usr/bin/env node
// PreToolUse hook for Bash. Blocks the few commands that are never wanted,
// wherever the flag sits in the command. Permission deny rules are prefix
// matches, so `git push origin main --force` slips past them; this does not.
//
// Exit 2 blocks the call and shows stderr to the agent. Anything else allows.

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  let cmd = '';
  try { cmd = String(JSON.parse(raw)?.tool_input?.command ?? ''); } catch { process.exit(0); }
  const problem = inspect(cmd);
  if (problem) {
    process.stderr.write('Blocked by .claude/hooks/guard-bash.mjs: ' + problem + '\n');
    process.exit(2);
  }
  process.exit(0);
});

export function inspect(cmd) {
  // Look at each simple command separately so a flag in one does not
  // implicate another.
  for (const part of cmd.split(/&&|\|\||;|\n|\|/)) {
    const words = part.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;
    const gitAt = words.indexOf('git');
    if (gitAt !== -1) {
      // The subcommand is the first word after `git` that is not a global
      // option, so a commit message that mentions "push -f" is left alone.
      let i = gitAt + 1;
      while (i < words.length && words[i].startsWith('-')) {
        i += (words[i] === '-C' || words[i] === '-c') ? 2 : 1;
      }
      if (words[i] === 'push') {
        const rest = words.slice(i + 1);
        const forced = rest.some((w) => w === '--force' || /^-[a-zA-Z]*f[a-zA-Z]*$/.test(w));
        const leased = rest.some((w) => w.startsWith('--force-with-lease'));
        if (forced && !leased) {
          return 'force push. Use --force-with-lease on your own branch, or ask the user.';
        }
        if (rest.some((w) => /^["']?\+/.test(w))) {
          return 'force push via a +refspec. Use --force-with-lease on your own branch, or ask the user.';
        }
      }
    }
    if (words[0] === 'rm' || (words[0] === 'sudo' && words[1] === 'rm')) {
      const flags = words.filter((w) => /^-/.test(w)).join('');
      const recursive = /r|R/.test(flags);
      const targets = words.slice(1).filter((w) => !/^-/.test(w) && w !== 'rm');
      const dangerous = targets.find((t) => /^(\/|~|~\/|\$HOME|\$HOME\/|\/\*|~\/\*|\.\.?\/?|\*)$/.test(t.replace(/^["']|["']$/g, '')));
      if (recursive && dangerous) {
        return 'recursive delete of ' + dangerous + '. Name the specific directory to remove.';
      }
    }
  }
  return null;
}
