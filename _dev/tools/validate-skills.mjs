#!/usr/bin/env node
// validate-skills.mjs — deterministic checker for the OpenClaw skill + bootstrap
// silent-failure traps from CLAUDE.md's "## DO NOT" (folder==name, user-invokable
// spelling, bootstrap char-cap). This is the deterministic verification leg [PROCESS-2]
// asks for: a script, not eyeballed prose. No dependencies; Node >= 18.
//
// Usage:  node _dev/tools/validate-skills.mjs [workspaceDir]   (default: workspace)
// Exit 1 on any hard violation (folder!=name, `user-invocable` typo, missing
// name/description, malformed frontmatter). Bootstrap char-cap overruns are warnings.
//
// Lives in _dev/tools/ (a dev/CI tool), NOT workspace/scripts/ (which is rsync-deployed
// to the runtime host and reserved for `openclaw cron` CLIs).

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.argv[2] || 'workspace';
const CAP = Number(process.env.BOOTSTRAP_MAX_CHARS || 20000);

const errors = [];
const warnings = [];

function frontmatter(text) {
  if (!text.startsWith('---')) return null;
  const end = text.indexOf('\n---', 3);
  if (end === -1) return null;
  return text.slice(3, end);
}

// --- Skills: workspace/skills/<name>/SKILL.md ---
const skillsDir = join(ROOT, 'skills');
let skillCount = 0;
if (existsSync(skillsDir)) {
  for (const entry of readdirSync(skillsDir)) {
    const dir = join(skillsDir, entry);
    if (!statSync(dir).isDirectory()) continue;
    const skillFile = join(dir, 'SKILL.md');
    if (!existsSync(skillFile)) continue; // not a skill folder
    skillCount++;
    const fm = frontmatter(readFileSync(skillFile, 'utf8'));
    if (fm === null) {
      errors.push(`${entry}/SKILL.md: missing or malformed YAML frontmatter (--- ... ---)`);
      continue;
    }
    if (/user-invocable/.test(fm)) {
      errors.push(`${entry}/SKILL.md: frontmatter uses 'user-invocable' — must be 'user-invokable' (typo → silently un-callable)`);
    }
    const nameMatch = fm.match(/^name:\s*(.+?)\s*$/m);
    if (!nameMatch) {
      errors.push(`${entry}/SKILL.md: frontmatter missing 'name:'`);
    } else if (nameMatch[1] !== entry) {
      errors.push(`${entry}/SKILL.md: frontmatter name '${nameMatch[1]}' != folder '${entry}' (router never sees the skill)`);
    }
    if (!/^description:\s*\S/m.test(fm)) {
      errors.push(`${entry}/SKILL.md: frontmatter missing 'description:'`);
    }
  }
}

// --- Bootstrap char-cap: root workspace/*.md ---
if (existsSync(ROOT)) {
  for (const entry of readdirSync(ROOT)) {
    if (!entry.endsWith('.md')) continue;
    const f = join(ROOT, entry);
    if (!statSync(f).isFile()) continue;
    const chars = readFileSync(f, 'utf8').length;
    if (chars > CAP) {
      warnings.push(`${entry}: ${chars} chars > cap ${CAP} — gateway will silently truncate`);
    }
  }
}

// --- Report ---
console.log(`validate-skills: scanned ${skillCount} skill(s) under ${skillsDir}`);
for (const w of warnings) console.log(`  WARN  ${w}`);
for (const e of errors) console.log(`  ERROR ${e}`);
if (errors.length) {
  console.log(`FAIL: ${errors.length} error(s), ${warnings.length} warning(s)`);
  process.exit(1);
}
console.log(`OK: 0 errors, ${warnings.length} warning(s)`);
