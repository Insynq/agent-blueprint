# OC KB 6 — Cron and Scripts: scheduled jobs and deterministic CLIs

## Pattern

OpenClaw supports **scheduled jobs** via the `openclaw cron` CLI on the runtime host. Jobs come in two flavors:

1. **Deterministic Node scripts** under `workspace/scripts/<name>.{js,ts,sh}` — pure compute, no LLM call. Cheap, fast.
2. **LLM-driven crons** — bound to a specific agent context with its own API key. The LLM runs through a defined skill or workflow.

The `openclaw cron` CLI is the source of truth for what crons exist. **In-repo cron documentation (HEARTBEAT.md) describes intent; runtime state can drift from it.** Always check `openclaw cron list` on the runtime host before assuming.

## When to use which

**Deterministic Node script:**
- The work is mechanical: pull data from API, transform JSON, write file, post webhook
- Cost matters (no LLM tokens)
- Latency matters (no API round-trip)
- The output is consumed by another script, an external system, or as a structured log

**LLM-driven cron:**
- The work requires interpretation, summarization, or judgment
- The output goes back into agent state (TASK-QUEUE.md, MEMORY.md updates)
- A user-readable narrative is the deliverable

A common composition: deterministic script gathers raw data and writes JSON. An LLM-driven cron picks up the JSON, interprets it, and posts a notification.

## `openclaw cron` operations

```bash
# Inspect (always run before assuming runtime state):
openclaw cron list

# Create:
openclaw cron create --name <name> --schedule "<cron expr>" \
  --skill <skill-name>             # for LLM-driven, references a workspace/skills/ entry
  --script <script-relative-path>  # for deterministic
  --api-key <ANTHROPIC_KEY_VAR>    # plist env var for per-cron cost attribution

# Edit / delete:
openclaw cron edit <name>
openclaw cron delete <name>
```

Subcommand surface may evolve — confirm with `openclaw cron --help`. **All cron mutations happen on the runtime host, NOT via repo edits.** This is by design (security + clarity); it does mean you must coordinate `HEARTBEAT.md` updates with the actual cron edit.

## Deterministic Node script convention

```
workspace/scripts/<name>.{js,ts,sh}
```

Conventions:

- **Stdout = JSON.** Every script emits a single JSON document to stdout (or NDJSON if streaming). This makes the output pipe-able and machine-parseable.
- **Stderr = tagged human-readable.** Format: `[script-name] message` per line. Keeps logs greppable per-script.
- **Exit code = success/failure.** 0 for success, non-zero for failure. The cron runner uses this to decide whether to retry or notify.

Example skeleton (`workspace/scripts/example.js`):
```javascript
#!/usr/bin/env node
// example: anonymized deterministic script

const SCRIPT_NAME = 'example';
const log = (msg) => process.stderr.write(`[${SCRIPT_NAME}] ${msg}\n`);

async function main() {
  log('starting');

  // Do the work. Fetch from APIs, transform, etc.
  const result = {
    timestamp: new Date().toISOString(),
    items: [],  // populate
    status: 'ok',
  };

  log(`completed: ${result.items.length} items`);
  process.stdout.write(JSON.stringify(result) + '\n');
}

main().catch((err) => {
  log(`error: ${err.message}`);
  process.exit(1);
});
```

## Cost attribution via per-cron API keys

```
Plist EnvironmentVariables:
  ANTHROPIC_API_KEY_NIGHTLY_SUMMARY = sk-...
  ANTHROPIC_API_KEY_HOURLY_TRIAGE   = sk-...

Cron registration:
  openclaw cron create --name nightly-summary --skill summarize-day \
    --schedule "0 22 * * *" --api-key ANTHROPIC_API_KEY_NIGHTLY_SUMMARY

  openclaw cron create --name hourly-triage --skill triage \
    --schedule "0 * * * *" --api-key ANTHROPIC_API_KEY_HOURLY_TRIAGE
```

Anthropic Console then attributes cost per-key. To see which cron is over-budget, sort by spend in the per-key view.

## Scheduled-job decision matrix

| Need | Solution |
|---|---|
| Daily nightly summary, narrative output | LLM-driven cron + skill |
| Hourly health check, post to Slack on anomaly | Deterministic script (status check + Slack post) |
| Weekly aggregation of cost from Anthropic Console | Deterministic script (API pull + JSON write) |
| Triage incoming emails every 15 min | LLM-driven cron + triage-mail skill |
| Backup TASK-QUEUE.md to S3 every hour | Deterministic script |
| Generate a weekly retrospective | LLM-driven cron + retrospective skill |

## Anti-patterns

- **Editing in-repo cron docs without running `openclaw cron edit`.** Repo describes "daily 9am"; runtime is actually "every 4 hours." Both states exist; only the runtime is real. → fix: every HEARTBEAT.md change is paired with a coordinated cron command on the host.
- **Mixed-format script output.** Mixing log lines and JSON on stdout makes downstream parsing brittle. → fix: JSON to stdout, tagged messages to stderr, no exceptions.
- **Single shared API key across all crons.** No per-cron cost visibility. → fix: per-cron keys.
- **Deterministic script with LLM call inside.** Defeats the "no LLM = cheap and fast" property. → fix: if you need LLM reasoning, register an LLM-driven cron; if not, keep the script pure.
- **Cron that depends on TASK-QUEUE.md state without coordination with the gateway.** TASK-QUEUE is read-write at runtime. Two writers (cron + gateway) without coordination → race conditions. → fix: cron either reads-only OR writes via an MCP tool that the gateway also uses (single writer path).
- **Script output captured by gateway logs not separated by script.** Hard to debug. → fix: tagged stderr (`[script-name] msg`) lets you grep the gateway log per-script.

## Diagnosing "cron didn't fire"

In order:

1. On the runtime host, `openclaw cron list` — is the cron actually registered? The repo's HEARTBEAT.md is not authoritative.
2. Check the cron's `schedule` field — valid cron expression? (Use `crontab.guru` to sanity-check.)
3. Read the script directly with the cron's input — does it run, does it exit 0?
4. Check the gateway log around the time the cron should have fired (`StandardOutPath` and `StandardErrorPath` from the launchd plist).
5. Per-cron API key set correctly in plist? `launchctl print <unit-target> | grep ANTHROPIC_API_KEY_<CRON>`.
6. For LLM-driven: does the referenced skill exist at `workspace/skills/<name>/SKILL.md` AND is its frontmatter valid (folder=name, user-invokable spelling)?

[VERIFY BEFORE SHIPPING] `openclaw cron` subcommand surface — confirm via `openclaw cron --help` against the runtime version.
