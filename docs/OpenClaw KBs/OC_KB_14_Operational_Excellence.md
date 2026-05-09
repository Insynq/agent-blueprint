# OC KB 14 — Operational Excellence: production operations for long-running agents

## Pattern

A long-running agent is a production system. Treating it as a one-off script — no SLOs, no canary path, no cost attribution, no rollback path — is how agents quietly degrade until a user notices and trust collapses.

This KB names the five pieces of production operations that pay back in OpenClaw agent dev:

1. **SLOs per skill** — latency, success rate, escalation rate, cost.
2. **Canary testing of skill changes** — route a fraction of traffic to a new version before full rollout.
3. **Cost visibility** — per-cron API keys are the practical attribution mechanism (cross-reference `OC_KB_05` and `OC_KB_06`).
4. **Observability dashboards** — built on top of the data from `OC_KB_08` and `OC_KB_12`.
5. **Skill-change rollback path** — every skill change has a revertible commit and a documented rollback procedure.

These primitives mostly live at the **Action** and **Data** layers from `OC_KB_10`, and they cross-cut the loops in `OC_KB_13`.

## When to use / when to skip

**Build these when:**
- The agent runs autonomously on a cron, with no human in the loop turn-by-turn.
- You have multiple users / tenants depending on the agent's reliability.
- A regression has cost more than a day of cleanup at least once.
- The monthly Anthropic bill is large enough to warrant attribution.

**Skip when:**
- Single-user dev agent. SLOs and canaries are ceremony.
- Weekend hack. Rollback is `git checkout HEAD~1`.
- Pre-launch. You don't have the traffic for any of these primitives to mean anything.

## SLOs per skill

For each user-invokable skill (and each cron-driven skill), define:

| SLO | Target shape | Why |
|---|---|---|
| Latency p95 | "<skill> completes within <N> seconds at p95" | User patience cap; cron deadline |
| Success rate | "<skill> completes without user override <P>% of invocations" | Quality floor |
| Escalation rate | "<skill> says 'I can't, ask the user' <P>% of invocations" | Stable = healthy; rising = scope drift |
| Cost per invocation | "<skill> uses <T> tokens p95 per invocation" | Budget control |

The targets are **per-skill**, not per-agent. A retrieval skill has different latency expectations than a multi-step reasoning skill.

**Where the data comes from:** the decision log from `OC_KB_12`, the gateway log, and Anthropic Console. A weekly deterministic-cron summarizes per-skill (overlaps the telemetry from `OC_KB_13`).

**What an SLO breach does:** documented per skill. Most agents start with "log + notify"; mature agents add "auto-disable the skill, fall back to alternate" when it's safer to be silent than to act unreliably.

```yaml
# Anonymized per-skill SLO doc, lives in KB_1_Architecture.md
- skill: <name>
  latency_p95_target: 8s
  success_rate_target: 95%
  escalation_rate_target: <5%
  cost_p95_target: 5000 tokens
  on_breach:
    minor: log + weekly retro callout
    major: notify <channel> + flag for next planning
    critical: auto-disable, fall back to <alternate skill or human-only>
```

The "on_breach" field is what makes SLOs more than performance art. Without a defined response, breaches are noted and ignored.

## Canary testing of skill changes

When a skill changes, route a fraction of traffic to the new version before full rollout. The fraction is small (5–20%); the comparison is against the old version on the same inputs where possible.

**Practical OpenClaw shape (anonymized):**

```text
1. New skill version lands at workspace/skills/<name>-v2/SKILL.md.
2. mcporter.json keeps both versions exposed (or routing config picks).
3. A canary-routing config (in agent defaults or per-skill override)
   specifies: "20% of invocations route to <name>-v2; 80% to <name>".
4. Both versions write decision-log rows tagged with the version.
5. After N invocations or T duration, compare:
     - Success rate v1 vs v2
     - Latency v1 vs v2
     - Cost v1 vs v2
     - User overrides v1 vs v2
6. If v2 wins: flip routing 100% to v2; archive v1.
   If v2 loses: archive v2; investigate.
```

Canary routing is **not** a runtime feature OpenClaw provides out of the box (verify against current runtime). The pattern is implementable today by:
- Two skill folders (`<name>-v1`, `<name>-v2`).
- A "router" skill that picks v1 or v2 based on a hash of the input or a percentage roll.
- Both versions write decision logs.

**When canary is worth the overhead:** skill changes that affect a high-volume Action-layer skill, where a regression would be expensive. For low-traffic or read-only skills, canarying is overkill — ship and watch.

## Cost visibility

Anthropic Console attributes cost **per API key**. The practical attribution mechanism in OpenClaw is per-cron API keys (per `OC_KB_05` and `OC_KB_06`).

The shape, recapped:

```text
Plist EnvironmentVariables:
  ANTHROPIC_API_KEY_NIGHTLY_SUMMARY = sk-...
  ANTHROPIC_API_KEY_HOURLY_TRIAGE   = sk-...
  ANTHROPIC_API_KEY_INTERACTIVE     = sk-...

Cron registration (per OC_KB_06):
  openclaw cron create --name nightly-summary --skill summarize-day \
    --schedule "0 22 * * *" --api-key ANTHROPIC_API_KEY_NIGHTLY_SUMMARY

Anthropic Console → Usage → filter by API key.
```

For interactive (non-cron) usage, a single `ANTHROPIC_API_KEY_INTERACTIVE` covers the whole interactive surface — you can't easily slice further without per-skill keys (overkill in V1).

**Cost guardrail (deterministic script pattern):**

```text
workspace/scripts/cost-watch.js
  Pulls Anthropic Console Usage API for last 24h, grouped by key.
  Compares per-key spend against thresholds in workspace/MEMORY.md or KB_1_Architecture.md.
  Writes JSON to stdout. Tagged stderr per OC_KB_06.
  Exits non-zero on overage.

Cron'd hourly. On non-zero exit:
  An LLM-driven cron picks up the JSON, identifies which cron is over,
  cross-references recent gateway logs for that cron, posts a summary
  to NOTIFICATIONS.md routing.
```

The pattern is recommended in `OC_KB_08`; this KB names it explicitly as part of the operational excellence baseline.

## Observability dashboards

A "dashboard" in V1 OpenClaw is most often a markdown summary written by a deterministic cron, not a Grafana board. The runtime ships no APM (per `OC_KB_08`); the dashboard is a derived artifact.

**Anonymized shape, lives at `workspace/dashboards/agent-health.md`:**

```text
# Agent health — auto-updated hourly

## Last 24h
- Total invocations: <N>
- Total cost: $<X>
- Slowest skill p95: <name> at <T>s
- Most expensive skill: <name> at <tokens>

## Last 7 days (delta vs prior week)
- Cost: $<X> (delta: <±%>)
- Invocations: <N> (delta: <±%>)
- Override rate: <P>% (delta: <±pp>)

## Active SLO breaches
- <skill>: <which SLO>, <how much over>, <since when>

## Updated: <timestamp>
```

The dashboard is **read by the user.** Route it to the same notification channel as retros so it lands in the same place at the same cadence. A dashboard that lives in a directory no one opens is a write-only file.

For projects that outgrow markdown — e.g., multi-tenant agents where per-tenant slicing matters — the path is to feed the same source data (decision log, gateway log, Anthropic Console exports) into a real dashboard tool. Until then, markdown wins on simplicity.

## Skill-change rollback path

Every skill change must have:

1. **A revertible commit.** One change per commit, on a branch, never amended after deploy. `git revert <commit>` produces a clean rollback patch.
2. **A documented rollback procedure.** Per skill, in `KB_1_Architecture.md`, the procedure for reverting that skill specifically (e.g., "revert the SKILL.md change AND restart the gateway AND, if any cron config changed, run `openclaw cron edit <name>` on the runtime host to reset").
3. **A pre-deploy snapshot for the runtime side.** If the change affects mcporter.json or workspace files that the gateway loads at start, capture the prior file state in `.framework-backup/` (or equivalent) so a rollback is a file copy + gateway restart, not a re-derivation.

```text
Anonymized rollback procedure per skill:

  Skill: <name>
  Files changed when this skill ships:
    - workspace/skills/<name>/SKILL.md
    - mcporter.json (if new tools)
    - workspace/MEMORY.md (if new defaults)

  Rollback procedure:
    1. git revert <commit>
    2. git push origin main  (deploy webhook fires)
    3. On runtime host: openclaw gateway restart
    4. If mcporter.json was reverted: openclaw doctor --repair (catches tool-list drift)
    5. Verify: openclaw session run --session isolated "<canonical test prompt>"
```

The verify step matters. A revert that "succeeds" but leaves the agent in a broken state is not a rollback.

## Anti-patterns

- **SLOs without an "on_breach" field.** Numbers are tracked; nothing happens when they're missed. → fix: every SLO has a documented response. "Log + notify" is a valid response; "do nothing" is not.

- **Canary that doesn't actually compare.** v1 and v2 both run, no one looks at the comparison data. → fix: the canary period ends with an explicit comparison step (cron or human-driven), and a decision: keep, roll back, or extend the canary.

- **Cost guardrail with no threshold.** The script pulls usage; there's no defined "too much" so it never fires. → fix: pick a threshold per cron (per-day or per-week budget); document in KB_1_Architecture.md; revisit monthly.

- **Dashboard that lives in a directory no one opens.** Cron writes; user never reads. → fix: route to a notification channel on the same cadence as the writes, OR pin in the user's calendar / reading list.

- **Rollback procedure that says "git revert and you're done."** The runtime side (gateway restart, cron re-registration, file sync) is part of the rollback. Skipping it leaves the runtime in a half-state. → fix: every skill's rollback procedure enumerates **every** runtime-host action needed.

- **Treating production agents as dev agents.** No SLOs, no canary, no cost attribution — but the agent has been running for the user's actual work for six months. The first regression that costs an afternoon is the moment to start; don't wait for the second. → fix: the lightweight version of each primitive (one SLO per top-3 skills, manual canary, single per-cron key) takes a day to set up and pays back the next time something drifts.

- **Building a real APM before you've outgrown markdown.** A Grafana board or a hosted observability tool for a single-user agent is overkill and a maintenance liability. → fix: stay on markdown summaries until the data needs slicing in ways markdown can't express.

## Diagnosing "the agent regressed and we didn't notice"

In order:

1. Were SLOs defined for the affected skill? If no — that's the gap; define them now and pick a baseline from the period before the regression.
2. If SLOs were defined, was the dashboard actually being read? Check timestamps on the dashboard file vs when the user noticed.
3. If the dashboard was being read, did the breach actually surface in it? If not, the dashboard's queries are missing the metric or the period.
4. If the breach surfaced, was there an "on_breach" response? If "log + notify," did the notification go to a channel the user reads?
5. Is there a canary or staged-rollout path that would have caught this? If the change went 0→100% with no canary, there's the gap.

## Cross-references

- `OC_KB_05` — model routing and per-cron API keys; the cost-attribution mechanism.
- `OC_KB_06` — cron and deterministic scripts; how cost-watch and dashboard-update are scheduled.
- `OC_KB_08` — observability primitives; this KB is the operational layer on top of those primitives.
- `OC_KB_09` — evals; canary comparison overlaps with regression evals.
- `OC_KB_12` — decision log; SLO and dashboard data come from here.
- `OC_KB_13` — self-improvement; telemetry overlaps with the inputs feeding self-retro.

[VERIFY BEFORE SHIPPING] None of the patterns in this KB are runtime-enforced by OpenClaw. SLOs, canary routing, cost guardrails, and rollback procedures are project conventions implemented in deterministic scripts, MCP tools, and KB documentation. Adopters that build these incrementally — usually starting with per-cron API keys (free) and the simplest dashboard markdown — see the highest leverage per hour invested.
