# OC KB 8 — Observability: logs, transcripts, and cost

## Pattern

OpenClaw's observability surface is intentionally minimal in V1. The data sources adopters can rely on:

1. **Gateway logs** via launchd `StandardOutPath` / `StandardErrorPath`
2. **Deploy logs** under `~/Library/Logs/<name>.log` (whatever the deploy.sh writes)
3. **Webhook receiver logs** under `~/Library/Logs/<name>.log`
4. **Session transcripts** captured by the gateway on disk (the agent's conversation history)
5. **Anthropic Console** for per-API-key cost attribution (the only billing/usage signal)

There is no built-in tracing, distributed log aggregation, or APM today. Most observability work is reading logs, replaying sessions, and watching the Anthropic Console.

## Where logs live

| Source | Path (typical macOS) |
|---|---|
| Gateway stdout | configured in launchd plist `StandardOutPath` (often `~/Library/Logs/openclaw.out.log`) |
| Gateway stderr | configured in launchd plist `StandardErrorPath` (often `~/Library/Logs/openclaw.err.log`) |
| Deploy script | configured in `deploy.sh` (often `~/Library/Logs/agent-deploy.log`) |
| Webhook receiver | configured in launchd plist for the webhook unit |
| Session transcripts | `~/.openclaw/sessions/<id>/transcript.json` (verify path against runtime version) |
| Per-MCP-server stdout/stderr | captured by gateway, prefixed with server ID — read from gateway log |

Knowing where each log lives is the first step in incident response. Document them in your KB_1_Architecture once you've confirmed paths on your runtime host.

## Tagged-stderr convention (deterministic scripts)

Per `OC_KB_06`: deterministic scripts emit JSON to stdout and tagged messages to stderr in the format `[script-name] message`. This makes the gateway log greppable per-script:

```bash
grep '\[nightly-summary\]' ~/Library/Logs/openclaw.err.log | tail -50
```

Same convention for in-repo MCP servers: prefix stderr lines with `[server-id]`.

## Session transcript replay

When a user reports "the agent did X wrong yesterday at 3pm":

1. Find the session in `~/.openclaw/sessions/`. Sessions are typically dated.
2. Read `transcript.json` to see the full conversation: user messages, system prompt, tool calls, tool results, agent response.
3. To repro in clean context, re-run the prompt with `--session isolated`:
   ```bash
   openclaw session run --session isolated "<the user's original prompt>"
   ```
   This bypasses session history but uses the current bootstrap + skills + tools.

The `--session isolated` flag is the equivalent of "incognito mode" for debugging. If the bug repros in isolated mode, it's in the agent config (bootstrap, skills, tools). If it doesn't repro, it's in the conversation state (some prior turn pushed the agent into a weird place).

### Context-at-turn extraction (shipped framework tool)

When an output is *wrong*, the first question is: **what was actually in context when it was produced?** `_dev/tools/context-at-turn.mjs` reconstructs that from a transcript — every file loaded (via `Read`/`Edit`/`Write`) up to a chosen turn, and a `claimedButNeverInContext` discrepancy list (sources the output cites authoritatively that were never in context — the "trusted a self-report" signal made testable).

```bash
node _dev/tools/context-at-turn.mjs <transcript.jsonl> [--turn N | --match "substr"] [--json]
```

Verified format: Claude Code `.jsonl`. The OpenClaw gateway `transcript.json` reader is a deliberate stub — implement it against a real `~/.openclaw/sessions/<id>/transcript.json` on the runtime host (do not guess the schema). See `docs/context-instrumentation-spec.md`.

## Anthropic Console (cost)

There is no in-product cost dashboard. Cost lives in Anthropic Console:

- Console → Usage → per-key breakdown
- Filter by API key to see per-cron costs (assuming per-cron keys per `OC_KB_05` and `OC_KB_06`)
- Filter by date to see cost trends

If your agent suddenly costs more this week than last week:
1. Anthropic Console → identify which API key spiked.
2. Map key → cron via the plist EnvironmentVariables names.
3. Read the gateway log for that cron's recent runs — what changed? More items to process? A skill regressed and is using more tokens per call?
4. If skill regressed: read the SKILL.md, recent diffs in git, and the cron's recent transcripts.

## What's missing (V1 limitations)

- **No tracing.** No request IDs propagating through gateway → MCP servers → external APIs.
- **No log aggregation.** Logs live on the runtime host. If the host disk fills, log rotation is your job (configure via launchd or `newsyslog` per macOS conventions).
- **No alerting.** Anthropic Console has no native alerting. To catch cost spikes, schedule a deterministic script that pulls Anthropic's usage API and posts to a notification channel when a threshold is crossed.
- **No metrics.** No success rate, latency percentiles, error rate by tool. If you need these, build them via deterministic scripts that parse gateway logs.

These gaps are intentional for V1 — OpenClaw is opinionated against premature observability infrastructure. If you find yourself building a real APM, that's a signal you've outgrown the runtime model and need something else.

## Patterns adopters can layer on

**Cost guardrail (deterministic script):**
```
workspace/scripts/cost-watch.js
  Pulls Anthropic Console usage API for last 24h.
  Compares per-key spend against thresholds in workspace/MEMORY.md.
  Writes JSON to stdout with overage flags.
  On overage, an LLM-driven cron picks it up and posts to NOTIFICATIONS.md routing.
```

**Session replay harness (deterministic script):**
```
workspace/scripts/replay-failure.js
  Reads a session transcript by ID.
  Re-runs the user prompts in --session isolated.
  Diffs the output. Reports differences.
```

**Health check (deterministic script):**
```
workspace/scripts/health-check.js
  Pings each MCP server (registered tool: ping or list_tools).
  Confirms each ${ENV_VAR} resolves on the host.
  Confirms gateway responds within N seconds.
  Cron'd every 5min; alerts to Slack on failure.
```

These aren't shipped by the framework — they're recommended adopter implementations.

## Anti-patterns

- **Logging secrets to gateway stdout/stderr.** Credentials end up in launchd logs forever. → fix: redact known patterns (API keys, OAuth tokens) at the source — in MCP servers and scripts before they emit.
- **Mixing JSON and human messages on stdout in deterministic scripts.** Breaks downstream piping. → fix: tagged stderr for human; JSON on stdout (per `OC_KB_06`).
- **Ignoring Anthropic Console.** "Cost feels fine" is not data. → fix: monthly review at minimum; weekly during active development.
- **Letting the gateway log file grow unbounded.** macOS doesn't auto-rotate by default. → fix: configure log rotation via `newsyslog.d` or via launchd's `logrotate` equivalents.

[VERIFY BEFORE SHIPPING] Session transcript path conventions (`~/.openclaw/sessions/<id>/transcript.json`) and `openclaw session run --session isolated` flag — confirm against the OpenClaw runtime version actually deployed.
