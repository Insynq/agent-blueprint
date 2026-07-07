# OC KB 5 — Models and Prompts: routing, caching, and assembly

## Pattern

OpenClaw uses **Anthropic Claude** as the LLM. Two distinct configuration layers govern how the gateway interacts with the API:

1. **Routing config** — which model to call, with primary + fallback. Lives at `agents.defaults.model` (SINGULAR `model`).
2. **Cache config** — how long to retain prompt-cache breakpoints. Lives at `agents.defaults.models["<id>"].params.cacheRetention` (PLURAL `models`).

The two keys differ by one letter and live in the same config file. Putting cache config under singular `model` (instead of plural `models`) parses as valid JSON and silently disables prompt caching. This is the fourth canonical OpenClaw silent-failure trap.

## Routing config (singular `model`)

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "claude-sonnet-4-6",
        "fallback": "claude-haiku-4-5-20251001",
        "reasoning_escalation": "claude-opus-4-7"
      }
    }
  }
}
```

- **`primary`** — the default for skill routing and most prompts.
- **`fallback`** — used when `primary` is rate-limited or fails. Should be cheaper.
- **`reasoning_escalation`** (optional) — for skills that explicitly call out to a stronger model (e.g., a code-review skill that needs Opus).

Per-cron and per-skill overrides also go in this config — see the OpenClaw runtime docs for the full schema.

## Routing philosophy

**Cost is not a gate on what ships.** Use the cheapest capable model to explore, gather information, and try approaches; escalate to a stronger model as the work moves toward something that ships. Escalating costs less than shipping mediocre work; cost breaks ties only when the quality axes are genuinely equal.

**Configured routing is a default, not a ceiling.** A skill routed to a cheaper model has standing permission to redo the work on a stronger one when the output doesn't meet the bar — judge the output, not the price tag. Keep escalation visible via per-cron-key cost attribution (see §Per-cron API keys below). Record *which axes* matter for your agent in `KB_1_Architecture.md`, in prose — not a per-model score sheet that rots each release.

**Task-shape tiers (per-skill overrides).** Bulk mechanical work (clear-spec implementation, data analysis, migrations, log-digging, large-document reading) → cheapest capable tier. Output the user judges directly (copy, API/UX surfaces) → highest-quality tier. Plan/implementation reviews → strongest reasoning tier, optionally plus one *independent, cheaper* perspective (the routing form of the Refutation Pass).

**Anti-pattern:** blanket "never use model X" rules are lineup-and-pricing snapshots that rot each release — express routing as capability tiers, never named exclusions.

## Cache config (PLURAL `models`)

```json
{
  "agents": {
    "defaults": {
      "models": {
        "claude-sonnet-4-6": {
          "params": {
            "cacheRetention": "long"
          }
        },
        "claude-haiku-4-5-20251001": {
          "params": {
            "cacheRetention": "short"
          }
        }
      }
    }
  }
}
```

- **`cacheRetention: "short"`** — 5 minutes. The default for API-key auth.
- **`cacheRetention: "long"`** — 1 hour. **Requires** the `extended-cache-ttl-2025-04-11` Anthropic beta header. The OpenClaw gateway injects this automatically when `cacheRetention: "long"` is set.

For agents with stable, large bootstrap content + tool schemas (which is most agents), `long` cache retention dramatically lowers cost. The cache breakpoint is the part of the prompt that doesn't change between calls — bootstrap files, tool schemas, skill content.

## Why the singular vs plural distinction matters

Both keys parse as valid JSON. The gateway reads them at different points and for different purposes:

- Singular `model` controls which API endpoint to hit (`Messages.create`'s `model` param).
- Plural `models[<id>]` controls per-model parameters that apply when that model is used (cache, max tokens, etc.).

If you put `cacheRetention` under singular `model`, the cache config is never read. The agent works (it routes correctly), but every API call is uncached. Cost can be 10–20x higher than expected before anyone notices.

**Detection:** check Anthropic Console's per-key cache hit rate. If it's near 0%, suspect this misconfiguration first.

## Per-cron API keys (cost attribution)

Anthropic Console attributes cost **per API key**. To see which cron is burning the budget, give each cron its own key.

```
Setup:
1. Create an Anthropic API key per cron in Anthropic Console (e.g., "agent-name-nightly-summary").
2. Set ANTHROPIC_API_KEY_<CRON_NAME> in the runtime host's plist EnvironmentVariables.
3. In the cron's config (typically registered via `openclaw cron edit`), set the api-key reference to the per-cron var.
4. View Anthropic Console → Usage → filter by API key.
```

Without per-cron keys, you see one aggregate bill and have no signal on which job is misbehaving. **This is the practical mechanism for cost control.**

## Prompt assembly: how a single API call is constructed

The gateway assembles each Messages API call from these layers (in order):

1. **System prompt fragment 1: SOUL.md** (identity, role, tone)
2. **System prompt fragment 2: SCHEMA.md, MEMORY.md, etc.** (the rest of the bootstrap files relevant to the call)
3. **System prompt fragment 3: Tool schemas** (from registered MCP servers)
4. **Cache breakpoint** — everything above is stable; cache it.
5. **Skill content** (the matched skill's SKILL.md, loaded on demand)
6. **User message + history** (the actual conversation)

Caching kicks in at the breakpoint between layer 4 and 5. If layers 1–3 grow on every call (because some "stable" file is actually being mutated), cache misses every time — useless caching.

## Cache cost-thresholds (per Anthropic docs, verify before shipping)

Different models have different minimum prompt sizes for cache breakpoints to be worth establishing:

| Model | Approximate cache threshold |
|---|---|
| Opus 4.7 | ~4096 tokens |
| Sonnet 4.6 | ~2048 tokens |
| Haiku 4.5 | ~4096 tokens |
| Older / specialty models | ~1024 tokens |

If your bootstrap+tools assembly is below the threshold, caching adds overhead without saving cost. Most production agents are well above (bootstrap files alone are typically 5K–15K tokens combined).

## Static-context optimization (system-prompt diet)

OpenClaw bootstrap files become the system prompt. **Every token in those files is in every prompt, multiplied by every turn — and stays in the prompt cache.** A bloated bootstrap costs at every request, forever, even with caching working as intended (cache hits are cheap, but they're not free).

The discipline:

- **Hard-cap each bootstrap file well below `bootstrapMaxChars`.** Aim for ~5K–15K characters per file. The framework cap (default ~20K, see `OC_KB_04`) is a ceiling, not a target. Approaching it means you'll silently truncate when you next add a sentence.
- **Per-conversation content does not belong in bootstrap.** If it changes per-turn, load it via skill on demand, not via system prompt.
- **Per-day content may belong in MEMORY.md, but stay terse.** If it changes daily, MEMORY.md is the right home — but a daily sprawl that never gets pruned bloats forever. Treat MEMORY.md as a working memory, not an archive.
- **Long-form domain knowledge belongs in `references/`.** Per `OC_KB_02`, a skill can have a `references/<topic>.md` directory that the skill instructs the LLM to load on intent match. The reference content stays out of every prompt and only loads when relevant.
- **Tool schemas are static context too.** If you have many MCP servers with verbose tool schemas, the schemas count against the same prompt budget as bootstrap. Disable servers that aren't actively used.
- **Verify cache engages after structural changes.** Per the Anthropic Console steps below: a cache-hit-rate near 0% after a config or bootstrap change is the signal that something broke the breakpoint.

```text
Anonymized assembly budget — illustrative, not normative:

  SOUL.md          ~1,500 chars   (identity, role, tone)
  AGENTS.md        ~2,000 chars   (skill router preamble)
  TOOLS.md         ~1,000 chars   (tool conventions, naming, gates)
  SCHEMA.md        ~3,000 chars   (data model summary)
  MEMORY.md        ~2,500 chars   (active state, defaults)
  HEARTBEAT.md       ~800 chars   (cron registry summary)
  NOTIFICATIONS.md   ~600 chars   (routing config)
  TASK-QUEUE.md    ~1,500 chars   (open items; PRUNE)
  INDEX.md           ~800 chars   (cross-ref pointers)
  ───────────────
  Total           ~13,700 chars   (well under per-file cap; comfortable
                                    for stable cache hits)
```

The point of writing the budget down is that the next person who wants to add 4K of "important context" to MEMORY.md sees the existing budget and asks where to make room — instead of silently bloating the prompt.

**Rule of thumb when a bootstrap file is over-budget:**
- Content that's per-conversation → move to a skill.
- Content that's domain reference → move to `workspace/skills/<skill>/references/`.
- Content that's cron-registry detail → keep HEARTBEAT.md as a summary, link to source-of-truth (`openclaw cron list` on the runtime host).
- Content that's accumulating chronologically → prune; old entries belong in git history, not in the live prompt.

## Anti-patterns

- **Cache config under singular `model`.** Silent cache disable. → fix: move to plural `models` keyed by model ID.
- **One shared API key across all crons.** No cost attribution. → fix: per-cron keys.
- **System prompt drift between calls.** Cache hits drop because "stable" content is actually mutating. → fix: identify what's changing, move it below the breakpoint into per-call content.
- **Using Opus 4.7 as primary routing model.** Much more expensive than Sonnet 4.6 for ~marginal quality difference on most agent tasks. → fix: Sonnet 4.6 primary, escalate to Opus only for genuinely-hard reasoning skills via a dedicated routing config.
- **Attributing a cost/quality change to an un-isolated model swap.** If you changed the routing model in the same iteration that also trimmed context, added references, or edited prompts, you cannot credit the model for the result — the win is confounded. → fix: change one variable at a time; re-run the same golden traces (which stamp `model_primary`, see `OC_KB_09`) holding bootstrap/skills fixed, so a routing decision rests on an isolated comparison.
- **Setting `cacheRetention: "long"` without realizing it requires the beta header.** OpenClaw gateway injects automatically; if you're calling Anthropic directly outside the gateway, you have to add the header yourself.
- **Letting bootstrap files balloon past the per-file cap.** Silent truncation produces unpredictable behavior. → see `OC_KB_04`.
- **Treating "well under the cap" as cheap.** Even at half the cap, bootstrap content is in every prompt forever. The cap protects against truncation; budget discipline (above) protects against per-request cost bloat. → fix: budget per-file with explicit targets, not "fits under the cap."
- **Putting per-conversation context in MEMORY.md.** It looks like memory; it bloats the cache because it changes between calls and breaks the breakpoint. → fix: move to a skill loaded on demand.

## Diagnosing "expected cache hits, getting cache misses"

In order:

1. Check Anthropic Console → per-key cache hit rate for the relevant API key.
2. Read the OpenClaw config — confirm `cacheRetention` is under PLURAL `models`, NOT singular `model`.
3. Confirm `cacheRetention: "long"` if you expected long-retention caching.
4. Check whether bootstrap files or tool schemas changed recently — even a single character changes the cache key. If a file is being touched on every call, identify and stop.
5. Confirm prompts aren't below the cache threshold for the model in use.

[VERIFY BEFORE SHIPPING] Cache thresholds per model (Anthropic publishes these), the `extended-cache-ttl-2025-04-11` beta header name, and the exact JSON path of routing vs cache config — confirm against the OpenClaw config schema docs.
