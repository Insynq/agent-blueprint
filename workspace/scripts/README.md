# Deterministic scripts

Place deterministic Node CLIs invoked by `openclaw cron` in this directory.

**Conventions:**

- **Stdout = JSON.** Every script emits a single JSON document (or NDJSON for streaming) to stdout.
- **Stderr = tagged.** Format: `[script-name] message` per line. Keeps gateway logs greppable per-script.
- **Exit code = success/failure.** 0 for success, non-zero for failure.

**When to use a script vs an MCP tool vs a skill:**

- **Script:** mechanical work, no LLM reasoning, cost/latency matters
- **MCP tool:** deterministic operation on an external system, callable by multiple skills
- **Skill:** LLM-driven workflow with reasoning, interpretation, or judgment

See `docs/OpenClaw KBs/OC_KB_06_Cron_and_Scripts.md` for the convention details and a worked skeleton.

**Cron registration:** scripts here are wired to crons via `openclaw cron create --script <path>` on the runtime host. The runtime is authoritative; this directory just holds the script source.
