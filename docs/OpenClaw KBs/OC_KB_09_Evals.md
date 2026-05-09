# OC KB 9 — Evals: framework gap and recommended pattern (ASPIRATIONAL)

## Status

**There is no first-class eval pattern in OpenClaw today.** Validation in current OpenClaw projects is markdown checklists run by hand. This KB describes the **shape** of a recommended primitive that adopters can implement; it is not yet supported by the runtime.

This is a known framework gap. Treat what follows as a pattern recommendation, not a documented capability.

## Why evals matter for agents

Agent quality is hard to track without evals because:

- Symptoms are intermittent (LLMs are stochastic)
- Regression is invisible until a user notices the agent gets dumber
- Skills interact: a tweak to one SKILL.md can change router behavior for another skill
- Cost regressions hide in normal-looking usage

Evals catch these by replaying canonical user→agent traces against the current config and comparing outputs to a golden baseline.

## Recommended shape

```
evals/
├── README.md
├── golden/
│   ├── <skill-name-1>.json   one trace per skill (or per user-facing flow)
│   ├── <skill-name-2>.json
│   └── ...
├── replay.js                 CLI that re-runs each golden trace against the live config
└── compare.js                CLI that diffs replay output vs golden output
```

### Golden trace shape

```json
{
  "name": "skill-name-1__happy-path",
  "input": {
    "user_message": "<exact phrase the user types>",
    "session": "isolated"
  },
  "expected": {
    "skill_activated": "skill-name-1",
    "tools_called": ["mcp__server__tool_id"],
    "output_contains": ["<substring 1>", "<substring 2>"],
    "output_excludes": ["<substring that must not appear>"],
    "max_tokens_used": 5000
  },
  "captured_at": "2026-05-08T00:00:00Z",
  "captured_against": {
    "framework_version": "0.1.0",
    "model_primary": "claude-sonnet-4-6"
  }
}
```

The shape is a recommendation; adapt to your needs. Key properties:
- **`skill_activated`** — checks the router did the right thing (catches description-drift bugs)
- **`tools_called`** — checks the skill's Systems section is honored (catches MCP-availability bugs)
- **`output_contains` / `output_excludes`** — substring assertions (LLM output won't be byte-equal across runs; use semantic anchors)
- **`max_tokens_used`** — cost-regression check

### `replay.js` shape

```javascript
// evals/replay.js — anonymized skeleton
//
// For each golden trace:
//   1. Spawn an isolated openclaw session.
//   2. Send the user_message.
//   3. Capture: which skill activated, which tools called, output text, tokens used.
//   4. Write to evals/output/<trace-name>.json
//
// Designed to run in CI on PRs that touch workspace/.

import fs from 'fs';
import { execSync } from 'child_process';

const goldenDir = './evals/golden';
const outputDir = './evals/output';
fs.mkdirSync(outputDir, { recursive: true });

for (const file of fs.readdirSync(goldenDir)) {
  if (!file.endsWith('.json')) continue;
  const golden = JSON.parse(fs.readFileSync(`${goldenDir}/${file}`, 'utf8'));

  // Pseudocode — actual openclaw invocation depends on the runtime CLI surface
  const result = execSync(
    `openclaw session run --session isolated --json "${golden.input.user_message}"`,
    { encoding: 'utf8' }
  );
  fs.writeFileSync(`${outputDir}/${file}`, result);
}
```

### `compare.js` shape

```javascript
// evals/compare.js — anonymized skeleton
//
// For each golden + corresponding output:
//   1. Check skill_activated matches.
//   2. Check tools_called is a superset (extra tools tolerated; missing fails).
//   3. Check every output_contains substring is present.
//   4. Check no output_excludes substring is present.
//   5. Check tokens_used is within tolerance (e.g., +20% of max_tokens_used).
//   6. Emit a diff per failure.

import fs from 'fs';

let failures = 0;

for (const file of fs.readdirSync('./evals/golden')) {
  if (!file.endsWith('.json')) continue;
  const golden = JSON.parse(fs.readFileSync(`./evals/golden/${file}`, 'utf8'));
  const output = JSON.parse(fs.readFileSync(`./evals/output/${file}`, 'utf8'));

  // Compare each assertion. Print failures.
  // (Implementation left to adopter.)
}

process.exit(failures > 0 ? 1 : 0);
```

## Capture flow (one-time per skill)

To create a golden trace:

1. Run the canonical user prompt against the current agent in isolated mode.
2. Inspect the result. If it's good, save the captured output as the golden.
3. Annotate with assertions (which substrings are load-bearing, max tokens).
4. Commit to `evals/golden/`.

When the skill changes:
1. Re-run replay. If output diverges from golden:
   - Bug? Fix and re-run.
   - Intentional improvement? Update golden and commit.
2. Never silently update golden without a reviewable commit message explaining why.

## CI integration

```yaml
# .github/workflows/evals.yml — anonymized
on:
  pull_request:
    paths:
      - 'workspace/**'

jobs:
  evals:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: node evals/replay.js
      - run: node evals/compare.js
```

This runs on every PR that touches `workspace/`. PRs that change the agent's behavior fail eval until the golden traces are updated.

## When to invest in this

Skip evals when:
- The agent is a single-skill prototype
- You're the only user and a regression is fine
- You don't yet have stable canonical user prompts

Build evals when:
- The agent has 3+ user-invokable skills with regular use
- Regressions have happened that took >1 day to notice
- Cost variance month-over-month is worrying

## Open questions for the framework

These are gaps the framework hasn't yet addressed:

- **Captured trace stability.** The exact output of a golden trace depends on model version. Sonnet 4.6 → 4.7 will likely shift output text. How does the eval pattern accommodate model upgrades without manual re-baselining of every trace?
- **Substring assertions vs semantic checks.** Substring assertions are brittle. Semantic equivalence checks (LLM-as-judge) are themselves probabilistic and add cost. Which is the right default?
- **Determinism.** `--session isolated` removes session history, but model output is still stochastic across runs (temperature, top-p). Should evals run N times and compare against a tolerance band?

If your project has settled into a working pattern, contribute it back to the framework — this KB will graduate from aspirational to documented.

[VERIFY BEFORE SHIPPING] None — this entire KB is aspirational. Verify with the user that they know they're implementing a framework gap, not a supported feature.
