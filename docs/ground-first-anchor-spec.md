# Ground-First Primary-Artifact Anchor — Spec

> **Status: LOCKED 2026-06-25**

> **What this is.** Thread 1 (final thread) of the [framework-verification-agenda](../../.claude/projects/-Users-chrisparsons-Documents-GitHub-agent-blueprint/memory/framework-verification-agenda.md): "ground-first — read the primary source before theorizing." The grounded brainstorm found thread 1 is **substantially already covered**; this spec records that finding and wires the one genuinely-uncovered seam.

## 1. Finding: mostly covered, one real seam

The 4-lens adversarial brainstorm (run `wf_a1014478-c50`) confirmed — rather than manufactured — that research-before-theory is already enforced:
- `/brainstorm` Phase 1 → Phase 2 + rule #13 ("Research FIRST, options SECOND") + the earned-vs-assumed rule (line 227) + the provenance discipline (line 124, which already names the kai investigation).
- `/debug` Step 1 ("the *literal, observable* symptom — Not what you think is wrong") is the fully-formed anchor discipline.
- `/plan-review` §3a covers the spec boundary.

**The one uncovered seam:** `/investigate` line 37 — "Start at the entry point" — treats the entry point as *given*. Nothing forces it to be derived from the literal primary artifact. **This is the exact seam the kai seed-failure lived in**: it theorized the entry point from a premise it never checked against the actual record. Grep confirms zero references to `/debug`'s discipline in `/investigate` or `/brainstorm`.

## 2. Decisions

| Decision | Choice | Reasoning | Date |
|---|---|---|---|
| `/investigate` | Add a **"Step 0: Anchor on the Primary Artifact"** — quote the literal artifact, derive the entry point from it, mark downstream UNVERIFIED if the artifact is unavailable — with a **checkable output field** (`Primary Artifact` + `Entry point derived from:`) | The entry-point-from-unchecked-premise seam is real and uncovered (`/investigate:37`); a checkable output field makes it more than skippable boilerplate. | 2026-06-25 |
| `/brainstorm` | One **conditional sentence** in Phase 1 (quote a topic-named artifact first; tag the premise `[verified]`/`[relayed]`) | Borderline-redundant with rules #13/227/124 — kept as one line for the narrow "brainstorm about a specific failure/transcript" shape; reuses existing provenance vocabulary, adds no new gate. | 2026-06-25 |
| **Rejected** | A `falsifiable-premise` gate (input-side premise falsification subsystem) | Graded **redundant** by the adversarial pass — duplicates `/debug:263`'s refutation seam and `/brainstorm:227`; "a distinction without a difference for the kai case." | 2026-06-25 |
| **Rejected** | Cloning `/debug` Step 1 into both files as a full gate | Maintenance-drift trap — three near-identical characterization blocks to keep in sync. Cross-reference instead (the framework's native idiom, per the `[PROCESS-1]` cross-link pattern). | 2026-06-25 |

**Grounding artifacts (per `/plan-review` §6c):** workflow run `wf_a1014478-c50` (4 inventories + 3 designs, redundancy as the primary kill-test); the kai grounding-findings doc; the [framework-verification-agenda](../../.claude/projects/-Users-chrisparsons-Documents-GitHub-agent-blueprint/memory/framework-verification-agenda.md) memory note.

## 3. Changes

| # | File | Site | Edit |
|---|------|------|------|
| 1 | `.claude/commands/investigate.md` | Investigation Protocol + Output Format | Add "### 0. Anchor on the Primary Artifact" before Step 1; add `Primary Artifact` + `Entry point derived from:` to the output |
| 2 | `.claude/commands/brainstorm.md` | Phase 1 | One conditional "anchor on the topic-named artifact first" sentence, reusing the existing `[verified]`/`[relayed]` vocabulary |

## 4. Verification

Markdown-prose edits; acceptance check is read-back of each diff (no build/smoke). Installed ≠ proven-in-a-live-run (per the `c48f93d` discipline). This closes the verification agenda's three threads; the remaining open item is **session instrumentation** (capture which files were actually in context at a wrong output) — separate, tracked next.
