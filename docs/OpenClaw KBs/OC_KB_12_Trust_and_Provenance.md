# OC KB 12 — Trust and Provenance: making agent decisions auditable and reversible

## Pattern

Agent decisions decay into noise without an audit trail. The user remembers the agent took an action; the agent has no record of **why** it took it; six weeks later, when the action turns out to have been wrong, no one can reconstruct the decision.

This KB names five primitives that make agent decisions legible after the fact:

1. **Decision log** — every non-trivial action records inputs → reasoning → output.
2. **Rationale storage** — queryable later: "why did you do X on <date>?"
3. **Provenance flags** — every record the agent emits carries a `verified | inferred | unverifiable` tag.
4. **Reconciliation hierarchy** — when sources conflict, document which source wins and why.
5. **Audit trail conventions** — where logs live, how they're indexed, how to query them.

These primitives mostly target the **Data** and **Extraction** layers from `OC_KB_10`. They complement `OC_KB_11`'s safety primitives: safety primitives prevent bad actions; trust primitives let you understand actions that already happened (good or bad).

## When to use / when to skip

**Use when:**
- The agent takes actions a human will need to review later (financial, legal, customer-visible).
- Multiple sources of truth exist and the agent has to pick.
- The agent is multi-tenant or runs on behalf of multiple users.
- A regulator, auditor, or stakeholder will ask "show me why this happened."

**Skip when:**
- Agent state is fully ephemeral and disposable.
- Single-user / single-actor agent with low-stakes side effects.
- The cost of provenance metadata exceeds the value of the data being annotated.

## Decision log

Every action above a triviality threshold writes a structured row capturing what went into the decision.

```json
{
  "timestamp": "2026-05-08T14:23:00Z",
  "skill": "<skill-name>",
  "trigger": { "kind": "user-prompt | cron | webhook", "id": "<source-id>" },
  "inputs": {
    "primary": "<what the user / event provided>",
    "context": ["<bootstrap-file refs>", "<external-record-ids>"]
  },
  "extraction": { "<field>": "<value>", "confidence": { "<field>": 0.92 } },
  "decision": { "action": "<verb>", "target": "<id>", "alternatives_considered": ["<alt-1>"] },
  "rationale": "<one-sentence why>",
  "side_effects": [{ "system": "<id>", "op": "<verb>", "ref": "<id>" }],
  "provenance": "verified | inferred | unverifiable"
}
```

**Where it lives:** anonymized options:
- Append to `workspace/logs/decisions.ndjson` on the runtime host (see `OC_KB_07` rsync excludes — this is runtime-mutable, must be excluded from `rsync --delete`).
- An MCP tool that writes to an external append-only store (e.g., a deterministic-script-fed JSONL bucket).
- Both — local file for fast greppability, external for durability.

**What "non-trivial" means:** project decision. A reasonable default: any Action-layer side effect external to the agent's own bootstrap files. Reading MEMORY.md doesn't log; sending an email does.

## Rationale storage

The decision log captures inputs, decision, rationale. Rationale storage is the **query interface** over that log: a way for the user to ask "why did you do X?" and get a useful answer.

Two shapes work:

**Skill-driven query.** A skill (e.g., `explain-decision`) reads the decision log, matches by side-effect ID or timestamp, and returns the captured rationale plus the inputs that fed it.

```text
User: "Why did you mark <invoice-id> as paid yesterday at 3pm?"

Skill flow:
  1. Look up decisions.ndjson for entries touching <invoice-id> in the last 36h.
  2. Find the matching row.
  3. Render: trigger, inputs, extraction, rationale, alternatives considered.
  4. **Report:** human-readable summary + raw row for the curious.
```

**Inline self-explanation.** Each Action-layer skill, after committing, includes a one-line rationale in its user-facing report. This fills the "I want to know now" case without a separate query.

The two shapes compose: inline for "now," skill-query for "later."

## Provenance flags

Every record the agent emits — whether to its own bootstrap files, to an MCP-tool target, or as part of a user-facing response — carries a flag indicating how the agent knows what it claims:

| Flag | Meaning | Example |
|---|---|---|
| `verified` | Read directly from a system of record the agent trusts. | "Vendor: <name>" pulled from <source>. |
| `inferred` | Derived by reasoning from other signals; not directly observed. | "This appears to be a duplicate of <other-id>." |
| `unverifiable` | The agent has the value but cannot confirm it independently. | "Email body says due-by <date>" — agent didn't cross-check the underlying invoice. |

The flag travels with the record. When a downstream skill reads it, the skill knows whether to act on it autonomously (`verified`), require user confirmation (`inferred`), or refuse (`unverifiable`, depending on action class).

```yaml
# Anonymized skill-output example
- field: vendor
  value: <name>
  provenance: verified
  source: mcp__records__read(<id>)
- field: amount_due
  value: 1234
  provenance: inferred
  source: parsed from <doc-id> via mcp__pdf__extract
- field: due_date
  value: 2026-06-01
  provenance: unverifiable
  source: stated in user message; no cross-check available
```

The flag is structural metadata, not prose. It lets `OC_KB_11`'s confidence-scoring primitive route extractions into autonomous-vs-ask paths reliably.

## Reconciliation hierarchy

When two sources disagree, the agent must pick. Hardcoding "the LLM decides" is a recipe for inconsistency turn-to-turn. The fix is a documented hierarchy.

```yaml
# Anonymized example for a hypothetical "vendor name" field
Source priority for `vendor.name`:
  1. mcp__records__read         # canonical system of record
  2. workspace/MEMORY.md aliases # user-curated overrides
  3. mcp__pdf__extract          # parsed from current document
  4. user message                # what the user said in the prompt
On conflict:
  - Pick the highest-priority source that returned a non-null value.
  - Log the conflict in the decision log: which sources disagreed, which won.
  - If the loser is the user message, surface the conflict in the response.
```

The hierarchy is per-field, not global. `vendor.name` and `due_date` may have different priorities. Document each non-trivial field in `KB_1_Architecture.md`.

**Key property:** when the agent picks source A over source B, the decision log row contains the alternative that lost. Future-you can audit "we picked A; was that right?" — the alternative is right there.

## Audit trail conventions

Where do all these logs land, and how are they queried?

| Artifact | Path (anonymized) | Lifecycle |
|---|---|---|
| Decision log | `workspace/logs/decisions.ndjson` (excluded from rsync delete) | Append-only; rotate weekly via deterministic cron |
| Provenance-flagged records | embedded in agent state (MEMORY.md, TASK-QUEUE.md) | Lives with the record |
| Reconciliation events | rows in decision log with `kind: reconciliation` | Append-only |
| Session transcripts | `~/.openclaw/sessions/<id>/transcript.json` (per `OC_KB_08`) | Per-session; cleaned up on a schedule |

**Indexing:** for small projects, `grep` over NDJSON is enough. For larger, schedule a deterministic cron that ingests the NDJSON into a queryable store (DuckDB file, SQLite, etc.). Either way, the **canonical** form is the NDJSON; the indexed form is derived.

**Retention:** decisions for at least one full audit cycle (often 90 days, sometimes longer for regulated domains). Document the retention policy in `KB_1_Architecture.md` and enforce via a deterministic cron that prunes old rows.

## Anti-patterns

- **Hidden state changes.** The agent updates MEMORY.md or an external system without logging the change. Six weeks later, no one can tell when or why the value changed. → fix: every Action-layer side effect writes a decision-log row, including writes to the agent's own bootstrap files when those writes are non-trivial.

- **Confabulating sources.** The agent says "according to <source>" when the value actually came from inference. The provenance flag isn't optional; the flag exists to prevent this exact confabulation. → fix: enforce the flag at the MCP-tool boundary so any value the agent forwards has a flag attached or is rejected.

- **"Verified" status without actual verification.** The agent flags a value `verified` because it appeared in the source it last looked at — but it didn't actually re-check, it just remembered. → fix: `verified` requires a fresh read in the current turn (or within a freshness window the project documents). Past-verified is `inferred` until re-confirmed.

- **Reconciliation by LLM judgment alone.** No documented hierarchy; the agent picks among conflicting sources differently each turn. → fix: write the hierarchy down per-field in `KB_1_Architecture.md`. The LLM's role is to apply the documented rule, not to invent it.

- **Decision log with no querying interface.** Logs accumulate, no one ever reads them, the audit-trail benefit goes to zero. → fix: build the `explain-decision` skill (or equivalent) within the first month of an agent shipping any Action-layer skills. Without a query path, the log is write-only theater.

- **Logging secrets in the decision log.** Inputs and side-effect payloads can carry tokens, PII, etc. → fix: redact known patterns at the log-write boundary. Same redaction as for gateway logs (see `OC_KB_08` anti-patterns).

- **Reconciliation events buried in main decision log without a tag.** A query for "why did the agent pick A over B?" is hard to write. → fix: the decision-log row schema includes a `kind` field; reconciliation events are tagged so the query is `kind=reconciliation` plus a date range.

## Diagnosing "the agent's audit trail isn't telling me what I need"

In order:

1. Was the action actually logged? Search the decision log for the side-effect ID or timestamp. Missing → the skill didn't call the logger; fix the skill.
2. Is the rationale field meaningful, or is it boilerplate? "User asked" is not a rationale. → improve the prompt that generates the rationale field; make it record the inputs that drove the decision.
3. Is the provenance flag accurate? Cross-check the flag against the actual source path. Mismatches surface where flagging is sloppy.
4. Are conflicting-source events visible? Search for `kind=reconciliation`. Absent → the hierarchy isn't being applied (or no conflicts have occurred yet — verify with a synthetic test).
5. Is the log queryable? If grep is taking >10s, build the indexed copy.

## Cross-references

- `OC_KB_10` — capability layers; this KB targets Data and Extraction.
- `OC_KB_11` — safety primitives use the provenance flag and confidence score together to decide autonomous vs ask.
- `OC_KB_07` — runtime-mutable paths (decision log) must be in the rsync excludes or `rsync --delete` will wipe them on every deploy.
- `OC_KB_08` — observability conventions; decision log is observable infrastructure too.
- `OC_KB_06` — deterministic crons handle log rotation, indexing, retention enforcement.

[VERIFY BEFORE SHIPPING] The decision-log shape, provenance flag taxonomy, and reconciliation-hierarchy structure are framework conventions, not runtime-enforced. Document the project's chosen schema in `KB_1_Architecture.md` and stick to it across skills — drift across skills makes the audit trail useless.
