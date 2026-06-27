---
description: Phase-closure retro — read phase artifacts (best-effort) and write a structured retro doc capturing what worked, what was harder, close-calls, and candidate LESSONS.md entries
argument-hint: "[phase-slug — optional, e.g. auth-rework; defaults to the most recent shipped phase]"
---

# Phase Retro

`/retro` runs **post-ship (Phase 10.5)** in the PM phase loop. It is **non-blocking** — the doc lands at `docs/retros/[phase-slug]-retro.md` for review at next session start or before kicking off the next phase. The pattern is **retroactive**, not pre-commit: capture happens after the work has shipped.

**Input strategy: best-effort.** `/retro` reads whatever phase artifacts exist and produces a correspondingly-detailed retro. Phases that went through `/orchestrate` (with `docs/plans/[phase-slug]/` populated by workers) yield richer retros than phases that skipped the loop. The output explicitly notes which inputs were available — so a reader can tell whether a thin retro reflects a thin phase or a missing artifact trail.

## Action Required

1. Resolve `[phase-slug]` from `$ARGUMENTS` if provided; otherwise scan `docs/CHANGELOG.md` and `docs/plans/` for the most recently shipped phase.
2. Pre-flight: `mkdir -p docs/retros/` (self-heal — no canonical `.gitkeep` needed).
3. Spawn one `Explore` subagent with the prompt below. It reads the available artifacts and returns a structured digest. **Do not** edit project files from `/retro` directly — `/retro` only writes the retro doc.
4. Write the structured retro to `docs/retros/[phase-slug]-retro.md` following the 7-section template at `_dev/phase-retro-template.md`.
5. Surface candidate `LESSONS.md` entries to the user with proposed `[CATEGORY-N]` tags. **Do not auto-commit** to `LESSONS.md` — the PM decides per entry which to keep.

---

## Explore Subagent Prompt

Spawn an `Explore` subagent (thoroughness: "thorough") with this prompt:

```
# Phase Retro Inputs

Phase slug: [phase-slug]

Your job: read whatever phase artifacts exist on a **best-effort** basis and return a digest that the parent skill will write into a structured retro doc. Do not fail on missing artifacts — note what was missing and continue with what's available.

## Read in priority order (skip silently if absent)

1. **The implemented spec doc** — typical paths:
   - `docs/[phase-slug]-spec.md`
   - `docs/[phase-slug]-adoption-spec.md`
   - Any `docs/*-spec.md` whose body references the phase slug
   This is the canonical home for the **decisions table** (per the `Decision | Choice | Reasoning | Date` format introduced in v0.3.0). Extract every row.

2. **Worker plan docs** at `docs/plans/[phase-slug]/`:
   - `phase-plan.md` — read Scope, Brainstorm findings, Audit findings, Smoke tests added
   - `worker-N-*.md` — read the `Implementation log` and `Completion notes` sections of each worker doc
   Missing for phases that went through `/implement` directly (not `/orchestrate`) — skip in that case.

3. **`docs/smoke-tests-pending.md`** — filter by smoke IDs prefixed `[phase-slug]-`. Note which smokes passed (collapsed to one-liners), which are still pending.

4. **`git log` for the phase commit range:**
   - Use `git log --format="%H|%ad|%s" --date=short --no-merges` and filter by date range from spec/phase-plan creation to ship.
   - If a phase-end commit is identifiable (look for "Phase X complete" or `/ship`-style messages), use that as the end bound; otherwise use the most recent commit on `main`.
   - Capture commit subjects, file counts, and any commits flagged "fix", "revert", or "rollback" (close-call signals).

5. **`docs/CHANGELOG.md`** — if a parseable per-phase section exists for this slug. The format is currently undefined; do not depend on it.

## Return digest in this shape

```
# Phase retro digest — [phase-slug]

## Inputs found
- Spec: [path or "missing"]
- Worker plan docs: [N docs found at docs/plans/[phase-slug]/ or "missing"]
- Smokes: [N smokes for this phase, M passed, K pending, or "none"]
- Git log: [N commits, date range YYYY-MM-DD to YYYY-MM-DD]
- Changelog entry: [present | absent | malformed]

## Decisions captured (from spec decisions table)
[Verbatim rows from the spec's decisions table, or "no decisions table found"]

## Scope vs. delivered
- Scope (from spec / phase-plan): [bullet list]
- Delivered (from git log + worker completion notes): [bullet list]
- Gaps / deviations: [bullet list, or "none observed"]

## Friction signals (commit + worker patterns)
- Reverts / fix-up commits: [N, with subjects]
- Workers reporting blockers: [N, with one-line summaries]
- Smokes that failed first run: [N, with IDs]
- Decisions that flipped during implementation: [N, with before/after]

## Worker completion notes (verbatim where load-bearing)
[Quote any "lessons" / "gotchas" the worker docs explicitly captured]

## Tools that paid off (from spec + worker observations)
[What patterns / skills / commands earned their keep]

## Friction worth a framework change
[Any pain point a future skill or workflow tweak would address]
```

Be concise. The parent will reshape this into the 7-section retro doc. Do not write the retro doc yourself.
```

---

## After Subagent Returns

Use the digest to populate `docs/retros/[phase-slug]-retro.md` following `_dev/phase-retro-template.md`. The seven sections:

1. **What worked** — patterns/tools that paid off (from "Tools that paid off")
2. **Harder than expected** — items that took longer or surfaced unforeseen depth (from "Friction signals" + worker blockers)
3. **Close-calls** — things that almost shipped wrong, caught by smoke / `/audit-code` / user review (from reverts + failed first-run smokes + flipped decisions)
4. **Lessons** — candidate `LESSONS.md` entries, each with a proposed `[CATEGORY-N]` tag (e.g., `[ARCH-1]`, `[PROCESS-2]`). One bullet per candidate. PM picks which to commit.
5. **Tools to build** — friction worth a future framework change (from "Friction worth a framework change")
6. **TL;DR recipe** — 2–3 sentences distilling the phase. What was the shape? What's the durable takeaway?
7. **Inputs available / inputs missing** — explicit listing from the subagent's "Inputs found" so the retro's depth is auditable.

> **Outcome, not output.** When you write "What worked" and the TL;DR, judge the phase by whether it moved the *outcome* — did the user's manual surface (open items needing a decision, time-to-clear) actually shrink — not by output (artifacts/commits shipped, skills added). Shipping detectors and visibility *adds* surfaced items before the gated reducers shrink them, so "N artifacts shipped" can co-exist with zero outcome gain. Name the one outcome metric you'd check next phase. See `OC_KB_13` "Output metrics without a paired outcome metric."

> **Provenance discipline.** For every claim you carry forward from a worker/sub-agent self-report into a candidate lesson, tag it `[verified: how]` or `[relayed: source-said]`; never harden a hedge ("appears to" stays "appears to," a grep-count stays a grep-count); re-read the source's own caveats and carry the strongest dissenting line forward so front-confidence never exceeds back-caveats. Failure this prevents: `docs/investigations/2026-06-24-kai-verification-grounding-findings.md`.

After writing the doc, output to the user:

```
Retro written: docs/retros/[phase-slug]-retro.md

Candidate LESSONS.md entries (NOT auto-committed):
- [CATEGORY-N] One-line summary — pulled from <section>
- ...

Review the doc; commit the lessons you want to keep to docs/LESSONS.md.
```

---

## Important

1. **Best-effort, not blocking.** If artifacts are missing, the retro is lighter — that's fine. Note what was missing in section 7 and ship the doc anyway.
2. **Never auto-commit to `LESSONS.md`.** Always surface candidates and let the PM decide.
3. **Do not edit the spec doc, phase-plan.md, or worker docs.** `/retro` is read-only against historical artifacts. The only thing it writes is the retro doc itself.
4. **Run after `/ship`, not before.** Retros are retroactive — pre-ship capture is what `/plan-review` and `/audit-code` are for.
5. **If `docs/retros/[phase-slug]-retro.md` already exists**, do not overwrite. Suffix with a date (`[phase-slug]-retro-YYYY-MM-DD.md`) or ask the user how to proceed.
