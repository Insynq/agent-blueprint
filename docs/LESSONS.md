# Lessons Log

A running log of gotchas, hard-won lessons, and non-obvious behaviors discovered during development. Add entries here as they accumulate — this becomes more valuable the longer the agent runs.

**Format:** Each entry has a short ID for cross-referencing (e.g., `[MCP-1]`), the rule itself, a **Why** (the real incident), and a **How to apply** line (when to use it).

Commands that reference this file: `/debug`, `/implement`, `/audit-code`.

> **Status: starter template.** This file ships nearly empty so that **app-specific** lessons accumulate from your own incidents rather than carrying another project's baggage. The exception is **framework-level architectural lessons** (like `[SKILL-1]` below) that apply to *every* OpenClaw agent — those ship with the framework and propagate via `/update-framework`. Add your own entries as gotchas surface during development.

---

## SKILL

### [SKILL-1] Keep judgment in the skill, mechanics in a script

**Rule:** When a skill workflow interleaves model judgment with deterministic operations (exact SQL writes, parsing, reconciliation math, hashing, fixed API payloads), keep the *judgment* in the SKILL.md and extract the *deterministic execution* to a `workspace/scripts/<name>.js` script, called via the dry-run handoff (build payload → invoke `--dry-run` → review → invoke for real). The skill orchestrates and judges; the script computes and writes. See `OC_KB_02` "The mixed case."

**Why:** A read-only assessment of a production agent's six longest skills (2026-06-25) found all six over-reliant on embedded deterministic logic — e.g. one transaction skill at 956 lines with 48 embedded SQL/command blocks, and a billing skill that re-described in prose the exact CSV parsing a 68 KB script (`hd-reconcile.js`) already did. Embedded deterministic prose carries three costs the script layer avoids: it's **skippable** (model-executed, so a write you need guaranteed isn't), it **bloats context** (loads every fire, pushes the character cap), and it's **untestable**. The same project had already invented the right pattern elsewhere (`ctme-processor.js`'s dry-run handoff) — the lesson is to propagate that boundary, not rediscover it.

**How to apply:** The trigger is writing a *second* exact-SQL/parse/compute block into a skill workflow — that's the signal to extract. Prioritize money-touching / irreversible writes (payments, settlements, invoices), where "skippable + untestable" is most dangerous. **Caveat — don't over-extract:** a query *template* shown inside a judgment step legitimately stays inline; extract the deterministic *execution*, not the illustration. (An independent refutation pass on the assessment confirmed one skill's queries were correctly inline and should NOT have been extracted — the smell is real, but verify per-block.)

---

## PROCESS

### [PROCESS-1] A prose change is unproven until a live run

**Rule:** A markdown/prose edit to a skill, command, or KB is **unproven until you have observed it change behavior in a live run.** "Installed and verified by read-back on disk" proves the text exists — not that it changed what the agent does. Prompt and context tweaks are non-deterministic, so it is easy to convince yourself a technique works when it did nothing (placebo). When you ship a prose change, carry the verbatim flag `Installed, not yet proven in a live run` in the changelog/commit, and downgrade any effectiveness claim that rests on inspection rather than observation. Treat externally-sourced or viral techniques as unproven until they survive a live run *here*.

**Why:** The v0.4.0 / v0.4.1 verification agenda (the independent Refutation Pass, the ground-first anchor, the done-vs-true gate) shipped with every CHANGELOG entry self-flagged "Installed, not yet proven in a live run," and `KB_8_Current_State.md` deliberately separates "verified by read-back on disk" from "exercised in a live run" — the team already practiced this discipline but had never named it as a lesson. The trigger to codify it came from reviewing the *Insecure Agents* (Sentry) talk: "there's a lot of placebo — you convince yourself something's working and then realize it didn't do anything at all... it's so random, so non-predictable." Pointedly, nine of fourteen candidate improvements from that same review were themselves prose additions — so the rule polices the very act of adopting it.

**How to apply:** The trigger is catching yourself about to call a prose change "works" / "done" on the strength of reading the file back. Reframe to: *have I observed this change behavior in a live run, or do I only believe it?* This is the verification-side twin of `[SKILL-1]`: where `[SKILL-1]` keeps must-happen *mechanics* out of skippable prose, `[PROCESS-1]` keeps *claims about prose's effect* honest until observed.

### [PROCESS-2] Augment the deterministic baseline; don't replace it

**Rule:** When designing any verification or quality mechanism, start from the pre-LLM **deterministic** check (a golden-trace compare, an external-artifact gate, a manual smoke, a diagnostic run) and use the LLM to *augment* it — judge ambiguity, synthesize, route — never to *be* the check. The pre-LLM problems (synthetic testing, infra, reproduction) are still the real work, and an LLM does not make them easier. The things that were true before are still true.

**Why:** Every verification mechanism the framework already ships augments-rather-than-replaces a deterministic check: `/ship` gates on the literal smoke-catalog state, not a self-report; evals use a deterministic `compare.js`, with LLM-as-judge flagged as a worse default (`OC_KB_09`); the Refutation Pass re-reads primary source. But the heuristic was never named, so it had to be re-derived each time. Surfaced from the *Insecure Agents* (Sentry) review: "we're over-rotating on LLMs — how do I do this WITH an LLM versus how can I augment the thing I was trying to do, not just replace it. That's especially true in verification."

**How to apply:** The trigger is catching yourself asking "how do I do this *with* an LLM?" for a check — reframe to "what was the deterministic check before LLMs, and how do I augment it?" This is the verification-side twin of `[SKILL-1]` (which keeps deterministic *mechanics* in a script); `[PROCESS-2]` keeps deterministic *verification* as the baseline the LLM augments.

---

## Suggested categories

For OpenClaw agent projects, the natural categories are:

- `MCP` — mcporter.json, MCP server lifecycle, tool unavailability bugs, env-var resolution
- `SKILL` — skill routing, frontmatter spelling, folder/name mismatches, character-cap truncation
- `MODEL` — model routing, cache hit rate, per-cron API key cost attribution
- `CRON` — scheduled job behavior, deterministic-script convention, runtime-host vs repo drift
- `DEPLOY` — webhook + rsync, plist EnvironmentVariables, rsync excludes correctness
- `ARCH` — design decisions specific to this agent, scope-out vs scope-creep judgment calls
- `PROCESS` — planning, verification, scoping discipline

Add new categories as they emerge — there's no hard rule against `[OBS-1]` if observability becomes a recurring theme.

---

## How to Add a New Entry

Copy this template and append to the relevant section (or create a new section if the category is new):

```markdown
### [CATEGORY-N] Short title

**Rule:** The specific, actionable rule.

**Why:** The real incident that caused this lesson. Be specific — which symptom, what failed, what the actual root cause was. The narrative is what makes a lesson sticky.

**How to apply:** When exactly does this apply? What's the trigger that should remind you of this lesson?
```

When you add an entry, also consider:

- Does this lesson belong in `CLAUDE.md`'s `## DO NOT` section as a hard constraint? (For lessons that should affect every future change.)
- Does this lesson reveal a framework gap? (Surface it to `agent-blueprint` upstream if the OpenClaw runtime makes it easy to repeat.)
