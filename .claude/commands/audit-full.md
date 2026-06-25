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

### 4. Refutation Pass (independent — runs on the merged findings)

Subagents 1 & 2 produced the findings; this orchestrating context (separate from both) now runs an independent refutation on the load-bearing set of the **merged, deduplicated** table.

**Load-bearing set** (keeps cost bounded; typically 0–5): every **Critical/High** finding, **plus** every finding touching a CLAUDE.md DO-NOT canonical trap (mcporter `mcpServers` key · `${ENV_VAR}`→`process.env` · `user-invokable` spelling · skill folder = `name` · `bootstrapMaxChars` · plural-`models` cache · unexcluded rsync path) — **regardless of the severity the producing auditor assigned**. Medium/Low rows are not refuted.

For each load-bearing finding, **spawn one fresh `Explore` agent** (neither Subagent 1 nor 2), given ONLY the finding claim + its `file:line`, mandate:

> "Finding: [claim] at [file:line]. Your job is to **KILL** it against primary source — quote the lines that prove it wrong, overstated, or already mitigated. If you can't refute it after a real search, say so and state what would have falsified it. Default to skepticism."

Replace the implicit "these are the findings" framing with a **Refutation Ledger** column on the Critical & High table: `Refuter verdict (confirmed/overstated/refuted) | Confidence | Refuting evidence (file:line)`.

**Mechanical tally:** the audit is clean only if every load-bearing finding came back `REFUTED`; a finding is dropped only if graded `REFUTED` with cited evidence. **Blind-spot note:** if the load-bearing set was empty, state — *"Refutation pass: no-op — no load-bearing findings surfaced; a clean result means nothing was found, NOT that an independent skeptic verified the system."*

### 5. Save Report

Write the compiled report (including the Refutation Ledger) to `docs/SECURITY_AUDIT_[DATE].md`.
