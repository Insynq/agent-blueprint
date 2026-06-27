# OC KB 13 — Self-Improvement Loops: mechanisms for the agent to learn from itself (ASPIRATIONAL)

## Status

**This KB is aspirational.** Most OpenClaw agents in the wild do not implement these mechanisms beyond ad-hoc memory updates. The patterns below are the recommended shape; the runtime does not enforce them. Treat the contents as a target architecture, not a documented capability.

This sits alongside `OC_KB_09` (Evals) as one of the framework's two "we know this is missing, here's the shape" KBs.

## Pattern

A self-improving agent has six distinct loops, each producing a different artifact:

1. **Correction pattern memory** — when the user corrects the agent, record the **class** of correction, not just the surface.
2. **Skill effectiveness telemetry** — invocation counts, failure counts, override counts per skill.
3. **Edge-case library** — cases that broke or required user intervention, kept as a reference set.
4. **Weekly self-retro** — the agent reviews its own week and identifies stuck points.
5. **Deviation self-reporting** — when the agent diverges from a documented rule, it flags the deviation.
6. **Template evolution** — defaults shift over time as the agent observes what the user actually wants.

These mostly target the **Reasoning** and **Data** layers from `OC_KB_10`. They are sequential in practical maturity: most projects implement (1) and (3) first, then (2), then maybe (4); (5) and (6) are advanced.

## When to use / when to skip

**Build these when:**
- The agent has been live for at least a month with stable user behavior.
- You have a corpus of corrections and overrides large enough to learn from (dozens at minimum).
- A human reviews and approves what the agent learns before it's wired into production behavior.

**Skip when:**
- Single-user dev agent where the user's preferences are still in flux.
- Pre-launch — you don't have enough history yet.
- The cost of a wrong learned pattern exceeds the cost of always asking the user.

## Correction pattern memory

When the user corrects the agent, capture the **class** of correction, not just the specific instance. The class generalizes; the instance does not.

```yaml
# Anonymized example — recorded when the user corrects an extraction
correction:
  timestamp: 2026-05-08T14:30:00Z
  skill: <skill-name>
  field: <field-that-was-wrong>
  agent_value: <what-the-agent-said>
  user_value: <what-the-user-said>
  class: |
    <one-sentence generalization of WHY this was wrong, not what was wrong>
    e.g., "<vendor> uses a non-standard invoice template that puts the
    amount in column 3 instead of column 2"
  pattern_to_apply: |
    <how to recognize this case in the future>
    e.g., "If <signal>, prefer <field> from <alternative source>"
```

The classification step is the value. "User said the value was 1234 not 1244" is useless on its own. "Vendor X's template has the amount in a different column" is reusable.

**Refinement — the class is only worth more than the case when it teaches behavior the agent *lacks*.** The classification is the value *when it changes future behavior*. If the agent already exhibits the corrected behavior from its existing instincts, the abstract class merely restates what it already does — `Installed, not yet proven` (`docs/LESSONS.md` `[PROCESS-1]`), and lower-ROI than it looks. In that case the higher-value artifact is the **concrete case** (the edge-case-library entry below) and, above all, the **specific defect** it exposed: a reproducible bug, a wrong stored value, a silently-dropped write is worth more captured-and-fixed than abstracted-into-a-maxim. (Observed downstream: a week of agent reviews produced its highest ROI from concrete defects — a silent 883-row drop, a per-run audit-row drop, several FATALs — while the abstract lessons mostly codified instincts the agent already had.) Weight the loop accordingly: a review's most valuable output is usually the concrete defect it catches, not the lesson it extracts — extract the lesson too, but don't mistake it for the payload.

**Implementation shape:**
- Skill `record-correction` is invoked when the user explicitly says "no, X is Y" or similar.
- The skill writes the correction row to `workspace/logs/corrections.ndjson`.
- A weekly cron (deterministic + LLM hybrid) scans new corrections, attempts to extract patterns, and writes proposed updates to a review queue.
- A human reviews the review queue and either applies the pattern (e.g., updates a SKILL.md) or rejects it.

The human-in-the-loop on pattern application is **load-bearing**. Letting the agent silently update its own behavior based on its own classification is how silent drift starts.

## Skill effectiveness telemetry

For each skill, track over time:

| Metric | What it is | Why it matters |
|---|---|---|
| Invocation count | Times the router selected this skill | Low = candidate for retirement; spike = router drift |
| Success rate | Times the skill completed without user override | Falling = regression somewhere |
| Override rate | Times the user corrected something the skill did | Rising = the skill is making more mistakes the user has to clean up |
| Escalation rate | Times the skill said "I can't, ask the user" | Stable = healthy; rising = scope creep |
| Mean tokens | Tokens consumed per invocation | Rising = bloat or context drift |

Where the data comes from: the decision log from `OC_KB_12` plus the gateway log. A deterministic cron aggregates per-skill metrics on a weekly cadence and writes a summary.

**Anonymized output shape:**

```text
Week of 2026-05-01:
  skill: <name>
    invocations: 47 (vs 52 prior week)
    success: 93% (vs 96% prior week)  ← regression flag
    overrides: 3 (vs 1)
    avg tokens: 4,210 (vs 4,180)

  skill: <name>
    invocations: 0 (vs 0 prior week)  ← retirement candidate
    ...
```

The summary doesn't need to be acted on automatically. It needs to be **read**. Schedule it to land in NOTIFICATIONS.md routing or a notification channel where the user will actually see it.

## Edge-case library

A versioned reference set of cases that broke or required intervention. Each case is a small artifact:

```yaml
# Anonymized example
case-id: <kebab-case-id>
captured: 2026-04-15
skill: <skill-name>
input: |
  <minimal anonymized reproduction of the input>
expected: |
  <what should have happened>
actual: |
  <what happened>
classification: <Perception | Extraction | Reasoning | Action | Data>
fix-applied: <link to commit / SKILL.md change / mcporter.json change>
status: open | fixed | known-limitation
```

**Where it lives:** `workspace/edge-cases/<case-id>.yml` (or wherever your project keeps reference data — must be excluded from rsync delete if mutable on the runtime host).

**How it's used:**
- Adopters writing a new skill scan the edge-case library for similar cases before designing.
- A regression suite (per `OC_KB_09`) replays the edge cases as evals.
- Stale cases get pruned during quarterly review (cases marked `fixed` for >6 months can be archived).

The library is the project's institutional memory of what's hard. Ad-hoc Slack threads and PR comments are no substitute.

## Weekly self-retro

Once a week, an LLM-driven cron reviews the past week's gateway logs, decision log entries, and corrections, and produces a one-page retrospective:

```text
# Retro for week of 2026-05-01

## What worked
- <observation, e.g., "skill <name> handled <N> instances of <case> without intervention">

## What broke
- <observation, e.g., "twice the agent acted on stale data from <bootstrap file>">

## Stuck points
- <observation, e.g., "every <kind of input> requires user intervention; this is a candidate for a new skill or a fix to an existing one">

## Proposed actions for the human
- <one or two specific tweaks the human could make>
```

The output is written to `workspace/retros/YYYY-MM-DD.md` (project-owned, excluded from rsync delete) and routed to a notification channel.

The cron should call out **its own** uncertainty in the retro. It is allowed (encouraged) to say "I'm not sure why X happened, but it happened N times." A retro that pretends to certainty is less useful than one that names ambiguity honestly.

## Deviation self-reporting

When the agent diverges from a documented rule, it flags the deviation explicitly rather than silently making it.

```text
Anonymized example:

Documented rule (from MEMORY.md): "Always confirm with user before sending external messages."

Agent in a turn: "I'm about to send <message>. The rule in MEMORY.md says
to confirm before sending. Do you want me to send, or should I treat this
as auto-confirmed because <reason>? If auto-confirmed, I'll record this as
a deviation in the decision log."
```

The flag goes in the decision log with `kind: deviation`. The query `kind=deviation` over time tells you which rules the agent has been bending and how often.

This primitive is what keeps the rule corpus from rotting silently. Rules in MEMORY.md that are bent on every other turn are obviously stale; the deviation log surfaces that.

## Template evolution

Defaults shift over time as the agent observes what the user actually wants. The shift is **proposed**, not auto-applied.

```text
Anonymized example:

Cron `template-evolution-review` runs monthly.
  Reads: corrections.ndjson, decision log, deviations.
  Identifies: defaults the user has overridden 3+ times in the same direction.

  Output (to review queue):
    "Default for <field> in <skill>: current = <value>. User has overridden to <other-value> 5 times in last 30 days. Propose updating default to <other-value>."

Human reviews and either accepts (skill template updated) or rejects.
```

As with correction-pattern memory, the human gate is load-bearing. The cron's job is to **propose**, not to silently mutate.

## Composition: practical adoption order

Most adopters can't (and shouldn't) build all six loops at once. The practical order:

1. **Decision log** (from `OC_KB_12`) — prerequisite for all six loops.
2. **Correction pattern memory** — produces the highest-value learning artifact early.
3. **Edge-case library** — pairs with corrections; both are case-based.
4. **Skill effectiveness telemetry** — once you have enough invocations to mean something (a few weeks).
5. **Weekly self-retro** — once 2–4 are providing data to summarize.
6. **Deviation self-reporting** — once the rule corpus is mature enough that deviation is meaningful.
7. **Template evolution** — last, because it requires all of the above to be reliable inputs.

## Anti-patterns

- **Silent behavior drift.** The agent learns from corrections and updates its own behavior with no human review. → fix: every learning artifact (corrections, deviations, proposed template changes) goes through a human-reviewed queue before affecting production behavior. Logging is automatic; application is gated.

- **No human review on learned patterns.** Even when the queue exists, no one reads it. The queue accumulates, the user feels the patterns aren't being applied, trust in the loop erodes. → fix: route the review queue into a notification channel the user actually sees, and make queue items individually accept/reject-able with one tap or short reply.

- **Treating correction memory as instance memory.** "User corrected X to Y" recorded literally — next time the same surface appears, the agent applies Y, but the same **class** of correction with a different surface goes unnoticed. → fix: invest in the classification step. The class is the unit of learning, not the instance.

- **Telemetry without a baseline.** Counting invocations without a baseline doesn't tell you if "47 invocations this week" is up or down. → fix: track week-over-week deltas, not absolutes. Surface only when something changes meaningfully.

- **Output metrics without a paired outcome metric.** Every metric in the telemetry table above — invocations, success rate (completed without override), override/escalation rate, tokens — is an *output/proxy*: it measures what the agent *did*, not whether the user's world got better. An agent can ship more, complete more, and override less while the human's actual manual-work surface (open items needing a decision, time-to-clear) doesn't move — or even grows, because shipping detectors and visibility *adds* surfaced items before the gated reducers shrink them. (Observed downstream: a four-phase rollout shipped 23 build artifacts and the operator's "needs-you" surface did not shrink, because the surface-reducers were still gated.) → fix: pair every output/throughput metric with **one lagging outcome metric** — did the human's surface shrink, did time-to-clear drop. "23 artifacts shipped" is not improvement; "the operator's open-decision count fell week-over-week" is.

- **Retro that nobody reads.** The cron writes the retro; no one looks at it. → fix: route to a notification channel, OR feed retros as a reference into the next planning session, OR both. Solitary write-only retros decay to zero value.

- **Edge-case library as a graveyard.** Cases captured, never replayed, never archived. The library grows linearly with no learning extracted. → fix: pair with `OC_KB_09` evals — the edge-case library is the source for regression test cases. If you're not running them, the cases are dead weight.

- **Deviation log as cover for breaking the rules.** "I deviated, see the log" becomes a way to rationalize ignoring rules. → fix: high deviation rate on a rule means the rule is wrong (rewrite it) or the skill is broken (fix it). Not "we have a deviation log so it's fine."

- **Template evolution that auto-applies.** The cron proposes AND applies in one step; humans never see the change until it's already running. → fix: hard-gate every template change behind explicit human approval. The cost of a wrong silent template change exceeds the cost of waiting a few days for review.

## Diagnosing "the agent isn't getting better"

In order:

1. Is the decision log actually being written? (Prereq for everything.) Grep `workspace/logs/decisions.ndjson` for recent entries.
2. Are corrections being captured? When the user said "no" last week, did `record-correction` fire? Check the corrections log.
3. Is the review queue being read? Open the queue. Are there pending items older than two weeks?
4. Are accepted patterns landing in production? After a queue item is accepted, does the SKILL.md / mcporter.json / MEMORY.md actually get updated? (Common gap: queue accept step doesn't apply the change.)
5. Is the same correction being re-captured? If the same class of correction is in the log multiple times across multiple weeks with no learning applied, the loop is broken at one of the prior steps — find which.

## Cross-references

- `OC_KB_09` — evals; edge-case library is the source for regression tests.
- `OC_KB_10` — capability layers; loops mostly target Reasoning and Data.
- `OC_KB_11` — safety primitives; deviation reporting builds on round-trip and rationale logging.
- `OC_KB_12` — trust and provenance; decision log is the prerequisite for every loop here.
- `OC_KB_06` — deterministic and LLM-driven crons; loops are scheduled.
- `OC_KB_08` — observability; telemetry feeds the same dashboards as cost and latency.

[VERIFY BEFORE SHIPPING] None of these loops are runtime-enforced. They are aspirational patterns; build incrementally. Document each loop's chosen implementation in `KB_1_Architecture.md` so future maintainers know what's wired up vs what's still aspirational for this project.
