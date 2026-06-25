# Context-at-Turn Instrumentation — Spec

> **Status: LOCKED 2026-06-25**

> **What this is.** The verification agenda's open "instrumentation" item (kai findings doc §7, *"the investigation's own best idea"*): capture **which files were actually in context at the moment of a wrong output**, converting "the agent trusted a self-report" from an argument into something **testable**. Shipped as `_dev/tools/context-at-turn.mjs`.

## 1. The reframe that made it cheap

The raw data **already exists**. Per OC_KB_08, the gateway captures full session transcripts (system prompt, tool calls, tool results, agent output). So this is an **extraction/analysis** problem, not a capture-infrastructure problem. The tool reconstructs, for any chosen turn:
- **`filesInContext`** — every file actually loaded (via `Read`/`Edit`/`Write`/`NotebookEdit`), with `via` provenance and the turn it entered, accumulated up to the target turn (turn-aware).
- **`claimedSources`** — file paths the output's text cites.
- **`claimedButNeverInContext`** — the §7 signal: a source cited authoritatively that was **never actually in context**.

## 2. Decisions

| Decision | Choice | Reasoning | Date |
|---|---|---|---|
| Format target | **Claude Code `.jsonl`** (schema verified by reading real transcripts); OpenClaw `transcript.json` reader **stubbed** behind a `[VERIFY-on-runtime-host]` guard that throws rather than guesses | The `.jsonl` schema was groundable here *and* is what the kai investigation used; `~/.openclaw` does not exist on the dev host, so the gateway schema couldn't be inspected — writing it blind is the exact ground-first failure thread 1 just fixed. | 2026-06-25 |
| Artifact shape | A **deterministic Node CLI** (OC_KB_06/08 idiom: JSON to stdout, tagged `[context-at-turn]` stderr), placed in **`_dev/tools/`** | It's a manual operator/dev analysis tool run on a transcript, not a cron'd agent-runtime script — keeps the rsync'd `workspace/` clean. | 2026-06-25 |
| Core signal | **`claimedButNeverInContext`** | Makes "the synthesis trusts a self-report" a checkable discrepancy rather than an argument. | 2026-06-25 |
| Honesty | basename matching + heuristic injected-context detection are documented in the script header as **"a signal to investigate, not a verdict"** | Avoids overclaiming; consistent with the verification discipline. | 2026-06-25 |

## 3. Proven, not just installed

Unlike the three agenda threads (prose command edits, *installed* not *exercised*), this tool was **tested against real transcripts** — the independent check, not a self-report:
- Ran on the **kai investigation transcript** (437 records, 192 turns) and **this session** (293 turns) — turn targeting, file-in-context reconstruction, and the OpenClaw-format honest-error path all behaved.
- The claimed-vs-actual signal correctly flagged real cases: a turn that cited `CHANGELOG.md`/`KB_8` which a **ship subagent** (separate context) had touched but the main context never loaded; and a turn citing a **downstream kai-openclaw doc** never opened in-session. Both are true "cited-but-not-loaded" discrepancies — exactly the §7 signal.
- Known heuristic false-positives (files discussed hypothetically in brainstorm options; runtime paths being *discussed* not cited) are surfaced as signals to investigate, as documented.

## 4. Usage

```bash
node _dev/tools/context-at-turn.mjs <transcript.jsonl> [--turn N | --match "substr"] [--json]
```
Default targets the last assistant turn; `--match` finds the first turn whose output contains a substring; `--turn N` targets the Nth assistant turn.

## 5. Known limitation / next step

The **OpenClaw gateway `transcript.json` reader is unimplemented** — its schema is `[VERIFY BEFORE SHIPPING]` (OC_KB_08) and was not inspectable from a dev host. To analyze the deployed agent's *runtime* sessions (vs Claude Code dev sessions), inspect a real `~/.openclaw/sessions/<id>/transcript.json` on the runtime host and implement `readOpenClawTranscript()` to map its records to the same `{ role, contentBlocks }` shape. **Do not guess the schema.** This is the natural follow-up if the tool earns its keep on `.jsonl` first.
