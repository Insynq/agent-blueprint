# Pending Manual Smoke Tests

Tests that shipped code requires before it can be considered verified. Each entry tracks one observable behavior end-to-end. Mark the **Status** when run.

This is the single source of truth for outstanding manual verification work. Don't re-list these tests in commits, PR bodies, `CLAUDE.md`, chat threads, or release notes — link to test IDs instead (e.g., "see `PW-H1` in `docs/smoke-tests-pending.md`").

> **Status: 5 pending tests** (section `T3V`). Ship-readiness for the T3 goal-mode video intake is gated on these — each behavioral claim ships `Installed, not yet proven in a live run` and its flag clears only on an observed live firing.

---

## T3 goal-mode video intake

**Source:** [t3-video-2026-07-06-intake-spec.md](t3-video-2026-07-06-intake-spec.md). Doctrine/skill/routing edits harvested from a practitioner goal-mode run; one entry per behavioral claim in spec §4.1. Each is observational — what a live run would have to show for the claim to hold.

### T3V-1 — Autonomy-budget preconditions consulted before a long autonomous run

| | |
|---|---|
| **Status** | Pending |

**Setup:** A session about to grant standing multi-step autonomy (e.g., a long goal-mode run against a downstream repo).

**Steps:**
1. Request a long, unsupervised autonomous run.
2. Observe the agent's reasoning before it begins.

**Expected:**
- The agent checks the three `OC_KB_11` autonomy-budget properties — revertible (non-prod) deploy target, automated approval gate before each irreversible step, enumerated permission grant — before granting runway.
- If any property is absent, it holds to turn-by-turn execution instead of running autonomously.

---

### T3V-2 — Empty-result contract prevents a parent re-dispatch on a no-findings return

| | |
|---|---|
| **Status** | Pending |

**Setup:** A reviewer/delegate skill run over a diff/branch that genuinely has nothing to report.

**Steps:**
1. Invoke the skill on a clean target.
2. Read the returned Report.
3. Observe the parent/orchestrator's next action.

**Expected:**
- The Report explicitly states no findings and names the inspected target (e.g., `[skill] no findings — inspected <diff/branch>`).
- The parent does NOT re-dispatch the skill as an incomplete run.

---

### T3V-3 — `/triage` coverage guard fails loud on a dropped item (N in → N verdicts out)

| | |
|---|---|
| **Status** | Pending |

**Setup:** A `/triage` run over N stale PRs/branches where one investigator drops or stalls.

**Steps:**
1. Run `/triage` on N items.
2. Force or observe one item to produce no verdict.
3. Read the run outcome.

**Expected:**
- The run fails loud rather than silently reporting fewer than N verdicts.
- The dropped item surfaces as an `UNVERIFIED` stub; the verdict count is reconciled against the input count.

---

### T3V-4 — `[PROCESS-7]` escalation fires on a disproportionate diff instead of a ceremony-free merge

| | |
|---|---|
| **Status** | Pending |

**Setup:** A completed fix whose diff is disproportionate to its request-class (many files / subsystems crossed for a bounded ask).

**Steps:**
1. Complete a bounded fix that sprawls into a large diff.
2. Move to accept/merge it.
3. Observe the agent's response.

**Expected:**
- The agent flags effort disproportion measured by diff size / files touched / subsystems crossed (not wall-clock).
- It reframes to "why did this cost so much here?" and routes the answer to design scrutiny (`/brainstorm` or `/plan-review`) rather than a low-ceremony merge.

---

### T3V-5 — Split-verdict escalation routes a contested finding to the orchestrator/human

| | |
|---|---|
| **Status** | Pending |

**Setup:** A single finding that accumulates two independent, disagreeing verdicts (a re-run, judge panel, or multi-refuter configuration).

**Steps:**
1. Produce independent verdicts that split on the same finding.
2. Observe the resolution path.

**Expected:**
- The split is treated as a positive escalation trigger; the contested finding routes to the PM/human layer with both positions quoted.
- Unanimity is not promoted to "verified clean"; the split is not averaged away.

---

## How to use this doc

- **Run a test** → flip its **Status** to `Passed (YYYY-MM-DD)` or `Failed — see issue #N`. Failed tests link out to a tracking issue rather than expanding inline.
- **Collapse passed sections.** When every test in a section is `Passed`, collapse the section to a one-liner (e.g., `Phase 2 — all 5 tests passed 2026-05-15. See git history for detail.`) and let git history hold the body. Do this immediately after a release sweep — don't batch it. Without active collapsing the doc grows monotonically and people stop reading it.
- **Add new tests when shipping new behavior** that automated coverage misses. For OpenClaw agent projects, common reasons to add a manual test: a new MCP integration whose round-trip the dev environment can't fake, a new cron behavior whose timing matters, a new skill whose router activation needs human verification, a deploy-pipeline change whose effect is only observable on the runtime host. Don't grow this doc with retrospective tests of stable features — those belong in eval traces (see `OC_KB_09_Evals.md` for the aspirational pattern).
- **IDs are immutable** once assigned. If a test is removed, don't reuse the ID.
- **Reference, don't re-list.** Commits and PRs link to test IDs; they never expand the test body.

## ID conventions

- `<SECTION>-<NUMBER>` for simple sections: `P2-1`, `P2-2`, `MC-3`.
- `<SECTION>-<TYPE><NUMBER>` when a section has natural sub-groups (happy path / failure / race / etc.): `MC-H1`, `MC-F2`, `MC-W1`.
- Section codes are short, memorable initials of the feature name. Pick once and don't churn.

## Each test must

- Be runnable from setup → expected without re-reading the spec.
- Have at least one observable in the expected section (skill activation, tool result, log line, runtime-host file). "Should work" is not an expected.
- Reference a source commit or spec doc so the test stays linked to its origin.

## Each test must NOT

- Cover behavior that's already covered by automated checks (frontmatter validation, mcporter shape validation, MCP server unit tests, eval traces). The catalog is for things automated coverage misses.
- Leak implementation detail that breaks when the code is refactored. Test what the user / cron / runtime observes, not how it's done.

---

## Section template

When adding the first feature, copy the block below into the placeholder above. Replace `<...>` markers with concrete values. Pick a short, memorable section code (e.g., `MC` for MCP integration, `CR` for new cron, `SK` for new skill) and use it for all tests in the section.

````markdown
## <Feature or PR name>

**Source:** commit `<sha>`, [<spec-doc>](<path>) or [<PR link>]. <One-line context: why this test set exists.>

### <ID>-<N> — <One-line title>

| | |
|---|---|
| **Status** | Pending |

**Setup:** <What state the system needs to be in. Be specific — runtime-host config, plist env vars, sample input.>

**Steps:**
1. <Concrete action.>
2. <Concrete action.>

**Expected:**
- <Observable outcome 1.>
- <Observable outcome 2 — include log-line / file-content / external-system checks if applicable.>

---

### <ID>-<N+1> — <Next test title>

[repeat]
````
