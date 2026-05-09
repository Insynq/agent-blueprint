# OC KB 10 — Capability Layers: a diagnostic taxonomy for skills and failures

## Pattern

Agents do five distinct things, every time they take a turn:

1. **Perception** — ingest external input (text, voice, files, OCR, transcripts).
2. **Extraction** — pull structured information out of unstructured input.
3. **Reasoning** — reconcile conflicting info, apply rules, decide what to do.
4. **Action** — commit side effects (write a record, send a message, call a tool).
5. **Data** — read and maintain agent state across turns and over time.

These layers are a **diagnostic lens**, not a mandate. Skills don't have to map 1:1 to a layer. The point of the taxonomy is that when an agent fails, the failure happened in one of these layers first — and naming the layer narrows the fix dramatically. "The agent doesn't know about my new vendor" is not the same bug if the vendor wasn't in the inbox the agent read (Perception) vs. if the agent read it but couldn't parse the line item (Extraction) vs. if it parsed it but ignored the override rule (Reasoning).

This KB is the framing layer for `OC_KB_11` (Safety Primitives), `OC_KB_12` (Trust and Provenance), `OC_KB_13` (Self-Improvement Loops), and `OC_KB_14` (Operational Excellence). Each of those KBs targets specific layers; this one names them.

## When to use this lens

Use the layer taxonomy when:

- A user reports a failure and the symptom is ambiguous ("the agent did the wrong thing").
- You're scoping a new skill and want to confirm you've covered the steps end-to-end.
- A skill keeps regressing and you can't tell which change caused it.
- You're tagging skills in `KB_1_Architecture.md` for portfolio-level review.
- You're writing an agent-improvement spec (see `_dev/agent-improvement-spec-template.md`).

Skip this lens when:

- The failure is obviously in one place (a single tool call returned an error; a single env var is missing).
- The skill is single-step deterministic and crosses no layer boundary.
- You're prototyping and structure-first organization would slow you down.

## Skill tagging convention

In `KB_1_Architecture.md` (or per-skill SKILL.md frontmatter, if you choose to extend the schema), tag each skill with its **primary** layer:

```yaml
# In a skill catalog table — anonymized
| Skill | Primary layer | Touches |
|---|---|---|
| ingest-mailbox      | Perception | Data        |
| extract-invoice     | Extraction | Data        |
| triage-priority     | Reasoning  | Perception, Extraction |
| send-followup       | Action     | Reasoning, Data |
| reconcile-records   | Reasoning  | Data        |
```

The "primary layer" is where the work actually happens. "Touches" lets readers see the dependency footprint. A skill whose primary layer is Action and that touches Reasoning, Extraction, and Data is doing a lot — consider splitting.

## Layer-by-layer notes

### Perception

The agent's sensors. What gets in, in what shape, with what fidelity.

Sources include: an MCP tool that polls an inbox, a webhook that fires on a third-party event, a file dropped in a watched directory, a transcript pasted into a chat, a voice memo run through ASR, an OCR pass over a PDF.

Common Perception failures:
- The signal never arrives (polling cron didn't fire; webhook misconfigured).
- The signal arrives but is mis-typed (OCR garbled; ASR mistranscribed).
- The signal is filtered upstream (spam folder, label rule, retention policy).
- The agent sees only a sample (rate limit; pagination cap; truncation).

If a user says "the agent doesn't know about X" and X exists somewhere reachable, the first question is Perception: did the agent ever see it?

### Extraction

Turning unstructured input into structured fields. Names, amounts, dates, references, intent labels — anything the next layer needs as discrete values.

Common Extraction failures:
- Field present but mis-bounded (parser grabbed too much / too little).
- Field absent in the source but the schema demanded it (forced hallucination).
- Format drift (vendor changed their invoice template; the parser broke silently).
- Multi-instance under-counting (one record extracted from a document with three).

Confidence scoring (`OC_KB_11`) and provenance flags (`OC_KB_12`) belong here as much as anywhere — extraction is where false certainty originates.

### Reasoning

Deciding what to do given the extracted facts and the agent's existing state. Reconciling conflicts, applying rules, choosing among alternatives, summarizing.

Common Reasoning failures:
- Conflicting sources, no reconciliation hierarchy (`OC_KB_12`).
- Rule rot (a policy from MEMORY.md is stale; agent applies the old rule).
- Over-confident inference (one weak signal generalized to a strong claim).
- Skill-routing miss (the right skill exists but the router picked another).

The Reasoning layer is the one that LLM choice and prompt-engineering most directly affect. If you're moving from a smaller to a larger model, expect Reasoning to improve and the other layers to be unchanged.

### Action

Committing the side effect. Writing a row, sending the message, scheduling the cron, posting the webhook reply.

Common Action failures:
- Wrote to the wrong place (right verb, wrong object).
- Action partially succeeded (multi-step write where step 2 failed silently).
- Action repeated (no idempotency token; the cron fired twice).
- Action skipped the dry-run / sanity-gate path (`OC_KB_11`).

Action is the layer with the highest blast radius. Most safety primitives in `OC_KB_11` exist to constrain Action specifically.

### Data

What the agent remembers, reads back, and trusts. Bootstrap files (MEMORY.md, TASK-QUEUE.md), workspace state, external systems of record the agent reads from but does not own.

Common Data failures:
- Agent state and external state drift (TASK-QUEUE.md says open; the underlying ticket was closed yesterday).
- The same fact in two stores, no canonical source named.
- Data layer gets skipped entirely — the agent re-derives state every turn from Perception alone, no continuity across sessions.
- Bootstrap file truncation (`OC_KB_04`) silently drops the relevant memory.

The Data layer is the one most likely to be **skipped** in early-stage agents. The fix is a deliberate decision about which file or external system is the source of truth for each piece of state, documented in `KB_1_Architecture.md`.

## Failure-localization recipe

When a failure surfaces, walk the layers in order:

1. **Perception** — did the input reach the agent at all? Read the gateway log around the relevant time. Confirm the cron fired / the webhook was received / the file was visible.
2. **Extraction** — what did the agent parse the input into? If you have a session transcript (`OC_KB_08`), the tool-call inputs and outputs are in it. Compare what the agent extracted against what was actually in the source.
3. **Reasoning** — given what the agent extracted, was the decision correct? This is where prompt content, skill content, and model capability matter most.
4. **Action** — given the decision, did the side effect commit correctly? Round-trip verify (`OC_KB_11`) — read back the system the agent wrote to.
5. **Data** — between turns, did state persist correctly? If the agent "forgot," the answer is in the Data layer.

The first layer where the actual behavior diverges from the expected behavior is the layer to fix. Fixing a downstream layer when the bug is upstream produces a regression-prone patch.

## Anti-patterns

- **Mixing layers in one skill without gates.** A single skill that perceives, extracts, reasons, acts, and updates data in one straight shot is a brittle skill. When it fails, you can't tell which layer failed. → fix: split into 2–4 named workflows in the SKILL.md (per `OC_KB_02`), each ending with an explicit reporting/logging step that lets you see where execution stopped.

- **Treating "agent doesn't know X" as a Reasoning bug when it's a Perception bug.** Most prompt rewrites that fail to fix a "doesn't know" complaint are actually Perception or Data problems in disguise. → fix: before editing the SKILL.md, confirm the input the agent saw via the session transcript. If X wasn't in the input, no amount of reasoning improvement will help.

- **Skipping the Data layer.** "The agent re-derives state every turn" sounds clean until you hit a multi-turn flow that needs continuity. → fix: name the source of truth for each piece of state in `KB_1_Architecture.md`. State that lives in MEMORY.md, TASK-QUEUE.md, or an external system has different durability and concurrency stories — be explicit.

- **Routing fixes through the LLM when the bug is mechanical.** Confidence scoring, dry-run, sanity gates (`OC_KB_11`) belong in Extraction and Action — not in a "be more careful" addition to the system prompt. → fix: structural primitives over prompt engineering for layers below Reasoning.

- **Using the layer taxonomy as a checklist for every skill.** Most simple skills don't need all five layers. Force-fitting causes ceremony. → fix: tag the **primary** layer; let the others be implicit when they're trivial.

## Cross-references

- `OC_KB_02` — skills are the unit; this KB is the lens for organizing them.
- `OC_KB_11` — safety primitives, mostly targeted at Extraction and Action.
- `OC_KB_12` — trust and provenance, mostly targeted at Extraction and Data.
- `OC_KB_13` — self-improvement, mostly targeted at Reasoning and Data.
- `OC_KB_14` — operational excellence, cross-cutting (mostly Action and Data observability).
- `_dev/agent-improvement-spec-template.md` — uses this taxonomy as the spine for Section 5 (Capability Fixes by layer).

[VERIFY BEFORE SHIPPING] This taxonomy is a framing convention adopted by the framework. It is not a runtime concept enforced by the OpenClaw gateway — there is no gateway field that consumes a "primary layer" tag. If you choose to add it to SKILL.md frontmatter, document the schema extension in `KB_1_Architecture.md` so future readers know it's a project convention.
