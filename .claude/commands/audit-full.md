---
description: Full review (code + infrastructure) in parallel
argument-hint: "[baseline — optional path to a previous audit report to check for regressions]"
---

# Full Audit Orchestrator

**Spawns 2 parallel audit agents for maximum coverage.**

> **v0.1.0 bundle:** `audit-code` + `audit-infra`. Future candidates for inclusion: `/audit-skills` (frontmatter spelling, folder=name, character cap), `/audit-mcporter` (registry shape, env-var resolution, missing-from-config detection). Track in `FRAMEWORK_CHANGELOG.md`.

## Action Required

Spawn **2 parallel** Explore subagents:

### Subagent 1: Code Audit
Run `/audit-code --focus all` across the agent project's source. For an OpenClaw project this typically means: skill markdown files under `workspace/skills/`, in-repo MCP server source under `workspace/mcp-servers/`, deterministic Node scripts under `workspace/scripts/`, and any deploy scripts under `deploy/`. Read `CLAUDE.md` first to understand the agent's shape.

### Subagent 2: Infrastructure Audit
Run `/audit-infra --focus all`. Check the OpenClaw runtime config — `workspace/config/mcporter.json` shape and env-var resolution, launchd plist `EnvironmentVariables` exposure, deploy script (HMAC verify, rsync excludes), per-MCP-server `package.json` dependency vulnerabilities, and `.env.example` vs runtime-required vars.

---

## After All Subagents Return

### 1. Compile Unified Report

Merge findings from both audits:

```markdown
## Comprehensive Audit — [DATE]

### Executive Summary
- Total findings: X (Critical: X, High: X, Medium: X, Low: X)
- Domains audited: Code, Infrastructure
- Previous audit baseline: [date or "none"]

### Critical & High Findings (Fix Immediately)
| ID | Domain | Finding | Severity | File/Location |
|----|--------|---------|----------|---------------|

### Medium Findings (Next Sprint)
| ID | Domain | Finding | Severity | File/Location |
|----|--------|---------|----------|---------------|

### Low Findings (Backlog)
| ID | Domain | Finding | Severity | File/Location |
|----|--------|---------|----------|---------------|

### Regression Check (if baseline provided)
| Previous Finding | Status | Notes |
|-----------------|--------|-------|
| [Previous issue] | Fixed / Regression / Outstanding | [Details] |

### Recommended Fix Priority
1. [Immediate — Critical issues]
2. [Next sprint — High issues]
3. [Backlog — Medium/Low]
```

### 2. Cross-Reference Baseline (if provided)

If `$ARGUMENTS` names a baseline report path, read it and classify EACH previous finding:
- **Fixed** — issue no longer exists
- **Regression** — previously fixed issue has reappeared
- **Outstanding** — was never addressed
- **New** — not in the baseline

(Skip this section if no baseline path was provided.)

### 3. Deduplicate

Remove duplicate findings that appear in multiple domain audits. Keep the most detailed version.

### 4. Save Report

Write the compiled report to `docs/SECURITY_AUDIT_[DATE].md`.
