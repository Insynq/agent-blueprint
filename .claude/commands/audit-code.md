---
description: Review proposed code/plans to check if the solution is the most elegant option
argument-hint: "[file to audit (default: pending changes)] [focus: reuse | patterns | antipatterns | security | all (default)]"
---

# Code Audit Subagent

**IMPORTANT: This skill spawns a subagent to protect main context.**

## Action Required

Spawn a Task with `subagent_type: Explore` using the prompt below. The subagent will audit the code/plan and return a verdict.

---

## Subagent Prompt

```
# Code Auditor

Audit target: `$ARGUMENTS` (if argument supplied; otherwise audit current pending changes).

> **This is the quality stage (Stage 2).** It assumes the Stage-1 spec-compliance gate already passed — i.e., the implementation built what the plan specified, with no gaps or unrequested extras (see `/implement` Step 5b and `/orchestrate` Phase 8). Do not re-check plan-conformance here; this review is about elegance, reuse, anti-patterns, and security.

## Core Question

> "Knowing what you know now about this codebase, is this solution the most elegant option?"

## Step 0: Discover Project Patterns

Before auditing, read the project to understand its established patterns.

1. Read `CLAUDE.md` (if present) — look for:
   - Explicit DO NOTs or anti-patterns
   - Patterns section describing established conventions
   - Tech stack (framework, UI library, DB, auth system)

2. Scan for existing utilities/hooks/contexts:
   - `Glob("src/lib/**/*.ts")` — utility functions
   - `Glob("src/hooks/**/*.ts")` — existing hooks
   - `Glob("src/contexts/**/*.tsx")` — state contexts
   - Read a sample of each to understand what's available

3. Read 2-3 existing files similar to what's being audited to understand the established code style.

Document what you find — this informs every check below.

## Audit Checklist

### 1. Reuse Opportunities

Before approving new code, check if existing utilities solve the problem:

- Search `src/lib/` for utility functions that do something similar
- Search `src/hooks/` for hooks that already fetch or compute this data
- Search `src/contexts/` for contexts that already provide this state
- Search `src/components/` for UI components with similar patterns

**IMPORTANT: Actually read the source files of potential reuse candidates.**
Don't just check if they exist — read the code to see if the implementation
can be extended or extracted into a shared component.

### 2. Pattern Alignment

Check that new code follows the patterns established in the codebase:

- **Data fetching**: Does it use the same approach as existing fetches (custom hooks, React Query, context, etc.)?
- **Auth/user identity**: Does it access the current user the same way as other components?
- **MCP tool calls** (if applicable): Does the skill's `Systems` section enumerate the specific tools it uses, rather than referring to whole servers blanket-style?
- **Role/permission checks**: Does it use the project's established role-checking pattern?
- **Skill frontmatter** (if editing a SKILL.md): Is `user-invokable` spelled correctly (NOT `user-invocable`)? Does the folder name match the frontmatter `name`?
- **Error handling**: Does it follow the project's error handling conventions?

### 3. Universal Anti-Patterns to Flag

| Anti-Pattern | Severity | Why It's Bad |
|--------------|----------|--------------|
| `select('*')` on DB queries | High | Security risk, over-fetches data |
| `localStorage` for auth/session state | High | Persists unexpectedly across sessions |
| Direct role column comparison | Medium | Bypasses role abstraction |
| Missing error handling at system boundaries | Medium | Silent failures |
| New hook/component for data already fetched elsewhere | Medium | Duplicates functionality |
| String concatenation for class names | Low | Use project's class merging utility |
| Deterministic logic (exact SQL writes, parsing, reconciliation math) embedded as prose in a SKILL.md workflow | Medium-High | Model-executed so skippable; bloats context every fire; untestable. Extract to `workspace/scripts/` + dry-run handoff (OC_KB_02 "The mixed case"). Critical for guaranteed/irreversible writes. Do NOT flag a query *template* inside a judgment step — only the deterministic *execution*. |

### 4. Over-Engineering Checks

Flag if code:
- Creates abstraction for single use
- Designs for hypothetical future requirements
- Adds error handling for impossible scenarios (trust internal code)
- Uses feature flags when a direct change is possible
- Creates a helper for a one-time operation
- Creates two near-identical hooks/components when one parameterized version works

A fix disproportionate to its request is a codebase signal, not only an over-engineering smell — see `LESSONS.md` [PROCESS-7].

### 5. Type Consistency

Check types match project standards:
- Uses the project's established type definitions (not ad-hoc inline types for shared concepts)
- Date handling consistent with rest of codebase (Date objects vs ISO strings)
- Enum values match DB or project-defined enums

### 6. Security-Specific Checks (REQUIRED)

These checks catch vulnerabilities that pattern matching alone won't find.

**6a. Auth/Data Bypass**
For any endpoint or server action that accepts status fields or IDs from the client:
- Can a user call it directly with fabricated data to skip payment/validation?
- Is the frontend the only thing preventing bad data, or is there server-side validation?
- For payment flows: Can someone submit a completion status with a fake payment reference?

**6b. Race Conditions on Shared State**
For any counter, flag, or status field modified by the plan:
- Are there OTHER places that modify this same data (other skills, scripts, scheduled crons, MCP server logic)?
- If multiple paths exist, are ALL of them atomic?

**6c. Webhook/Event Idempotency**
For any webhook or event handler that modifies data:
- What happens if the same event fires twice?
- Will it double-count, double-charge, or corrupt state?
- Is there a check for "already processed" before modifying data?

**6d. Hardcoded Values vs Config**
Are there values in the plan (limits, fees, thresholds) that:
- Are hardcoded in SQL/code but also exist as configurable constants elsewhere?
- Could drift if an admin changes configuration via UI?
- Exist in multiple places that could get out of sync?

**6e. Data Exposure**
Do any new columns or fields (especially tokens, keys, identifiers):
- Get exposed to the frontend via existing broad queries?
- Contain sensitive data that shouldn't be in the browser?

**6f. XSS Prevention**
- Flag any `dangerouslySetInnerHTML` — each usage must be justified and sanitized
- Check URL construction with user input — use `new URL()` not string concat
- Verify any markdown rendering uses sanitization (e.g., DOMPurify)
- Verify user-supplied content in email templates is escaped

**6g. CSRF & Request Forgery**
- Verify all server-side handlers for state changes check authentication (JWT, session, etc.)
- Verify CORS is configured via environment variable (not hardcoded `"*"`)
- Check that no GET requests perform state-changing operations

**6h. Rate Limiting**
Flag any server-side handler that processes these WITHOUT rate limiting:
- Authentication endpoints (password reset, magic links, invite acceptance)
- Payment creation
- Email sending
- User registration/account creation

**6i. Privilege / Auth Scope**
- Does any new code allow a lower-privileged user to trigger actions reserved for higher roles?
- Are there any direct object reference issues (user A accessing user B's data by ID)?
- Verify server-side handlers re-check permissions, not just the frontend

**6j. Payment Security** (if project uses a payment provider)
- Amount validation: server must verify prices against DB records, not trust client-provided amounts
- Customer ownership: verify payment customer ID belongs to the authenticated user
- Webhook idempotency: every webhook handler must check "already processed"
- No raw payment data (card numbers, CVVs) in logs, DB, or error messages

**6k. Error Information Disclosure**
- Flag server handlers returning raw error messages to clients
- Flag logging of auth metadata (email addresses, tokens, user IDs in auth flows)
- Verify error responses don't reveal: database structure, table/column names, stack traces

**6l. Environment Variable Exposure**
- Verify no plist `EnvironmentVariables` expose secrets unnecessarily (each entry should be required by an MCP server or cron); `${ENV_VAR}` references in `mcporter.json` must match plist entries (substitution reads `process.env`, not `.env` files)
- Verify secret keys are NEVER referenced in frontend code
- Check that no `.env` file with real values is committed

## OUTPUT FORMAT (Required)

```markdown
## Code Audit Report

### Project Patterns Discovered
- Framework/stack: [what was found]
- Established data fetching pattern: [description]
- Auth/user identity pattern: [description]
- Key reusable utilities found: [list]

### Summary
- [ ] Reuse opportunities found
- [ ] Pattern violations
- [ ] Anti-patterns detected
- [ ] Over-engineering concerns
- [ ] Security concerns

### Reuse Opportunities
| Proposed Code | Existing Alternative | Location |
|---------------|---------------------|----------|

### Pattern Violations
| Issue | Location | Fix |
|-------|----------|-----|

### Anti-Patterns
| Pattern | Location | Severity |
|---------|----------|----------|

### Over-Engineering Concerns
| Concern | Recommendation |
|---------|----------------|

### Security Concerns
| Issue | Category | Severity | Mitigation |
|-------|----------|----------|------------|

### Recommendations
1. [Specific recommendation with exact file/change needed]
2. [Specific recommendation with exact file/change needed]

### Verdict
[ ] APPROVED - Solution is elegant
[ ] NEEDS CHANGES - See recommendations above
```
```

---

## After Subagent Returns

### Refutation Pass (independent — supersedes the provisional verdict)

The audit above came from a single Explore subagent; its `APPROVED`/`NEEDS CHANGES` checkbox is that subagent's **self-report**. Before acting on it, the **main session** (a separate context that did NOT produce the findings) runs an independent refutation on the load-bearing findings.

**Load-bearing set** (the only findings refuted — keeps cost bounded; typically 0–3):
- every **Critical/High** finding, **and**
- every finding touching a CLAUDE.md DO-NOT canonical trap (mcporter `mcpServers` key · `${ENV_VAR}`→`process.env` · `user-invokable` spelling · skill folder = `name` · `bootstrapMaxChars` · plural-`models` cache · unexcluded rsync path) — **regardless of the severity the auditor assigned** (a fixed allowlist the producing auditor cannot shrink).

Medium/Low/style/over-engineering rows are NOT refuted — they ride the auditor's self-report.

For each load-bearing finding, **spawn one fresh `Explore` agent** (a context that never saw the audit's reasoning), given ONLY the finding claim + its `file:line`, with the inverted mandate:

> "Finding: [claim] at [file:line]. Your job is to **KILL** it. Read the primary source yourself and find the strongest evidence it is wrong, overstated, or already mitigated elsewhere — quote the contradicting lines. If you cannot refute it after a real search, say so and state what observation *would* have falsified it. Default to skepticism; do not assume the finding is correct."

Each refuter returns **CONFIRMED** (tried and failed to kill it — quote the empty/contrary search) · **OVERSTATED** (real but narrower/lower-severity — cite the narrowing evidence) · **REFUTED** (contradicted — cite the killing `file:line`), with a confidence. Record a **Refutation Ledger** (ID | Finding | Refuter verdict | Confidence | Refuting/weakening evidence) that supersedes the binary checkbox.

**Split-verdict escalation:** when independent verifiers disagree on a finding, that split is a *positive* escalation trigger — route the contested finding to the orchestrator/human with both positions quoted. Unanimity earns nothing: correlated verifiers sharing a seed error produce worthless consensus (`[PROCESS-4]`; the F1 false-negative case). Escalate splits; never promote unanimity to "verified clean." (Today's pass runs one refuter per finding, so a split arises only when a finding accumulates multiple independent verdicts — re-runs, judge panels, or a multi-refuter configuration; this clause does not by itself mandate multi-refuter spend.)

**Mechanical tally** (so a bad ledger can't be laundered into a pass):
- Treat the result as `APPROVED` only if **every** load-bearing finding came back `REFUTED`. Any `CONFIRMED` or `OVERSTATED`-still-High → `NEEDS CHANGES`. A finding leaves the must-fix list only if its refuter graded it `REFUTED` with cited contradicting evidence.
- **Blind-spot honesty:** if the load-bearing set was empty, state verbatim — *"Refutation pass: no-op — no load-bearing findings surfaced. A clean verdict here means the audit found nothing, NOT that an independent skeptic verified the code is clean."* Refutation tests findings that exist; it cannot surface one the auditor missed.

### Then act on the ledger
1. **All load-bearing findings `REFUTED` (or none surfaced)** → proceed (carry the no-op caveat if it applies)
2. **Any `CONFIRMED`/`OVERSTATED`-still-High** → address those recommendations, then re-audit or proceed with fixes
3. **Major confirmed concerns** → consider running `/plan` to redesign approach
