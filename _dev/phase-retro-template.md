# Phase retro — <phase-slug> — <YYYY-MM-DD>

<!--
  Phase retro skeleton — output of /retro.

  Use when: a phase has shipped (post-`/ship`, Phase 10.5 of the orchestrate
  loop) and the PM wants to capture what worked, what was hard, and
  candidate LESSONS.md entries before context decays.

  Save as: docs/retros/<phase-slug>-retro.md  (per project convention).

  Each section has a 1–3 line guidance comment. Replace [TODO] markers
  with content. Delete the comments before committing if you prefer a
  cleaner artifact (the template's HTML comments don't render in GitHub
  markdown view, so leaving them is also fine).

  This file lives in `_dev/` so it propagates to installed agents via
  `/update-framework` (as a `.new` sibling for manual merge). Adopters who
  customize the template get their version preserved; the framework's
  next iteration arrives next to it.
-->

## 1. What worked

<!--
  Patterns, tools, skills, or workflow steps that paid off during the
  phase. Be specific: "the C2 lockdown check caught X before dispatch"
  beats "the workflow worked well." One bullet per item.
-->

- [TODO observation — what paid off and why]
- [TODO observation]

## 2. Harder than expected

<!--
  Items that took longer than estimated, surfaced unforeseen depth, or
  required a re-plan mid-phase. Includes worker blockers, scope creep
  caught mid-implementation, and "we thought this was simple but ..."
  moments.
-->

- [TODO friction — what surprised us and where the depth was hiding]
- [TODO friction]

## 3. Close-calls

<!--
  Things that almost shipped wrong — caught by smoke tests, /audit-code,
  user review, or last-minute PM verification. The point is to surface
  what we got lucky on so the next phase doesn't depend on the same
  luck. Each entry should name (a) what almost shipped, (b) what
  caught it, (c) whether the catch was reliable or coincidental.
-->

- [TODO close-call — what nearly shipped, what caught it, was the catch reliable]
- [TODO close-call]

## 4. Lessons — candidate `docs/LESSONS.md` entries

<!--
  Each bullet is a CANDIDATE entry for the project's LESSONS.md. The PM
  reviews this section and decides which (if any) to commit. Do NOT
  auto-flow these to LESSONS.md from /retro.

  Format per bullet: `[CATEGORY-N] One-line lesson title` — choose a
  category tag that matches existing entries (ARCH, PROCESS, DEPLOY,
  AUTH, DATA, etc.) and the next available number in that category.

  If the lesson needs more context than one line, follow with 2–4
  indented sub-bullets covering: (a) the incident, (b) the rule, (c)
  how to apply it next time.
-->

- [CATEGORY-N] [TODO one-line lesson title]
  - **Incident:** [TODO what happened]
  - **Rule:** [TODO the durable lesson, stated as a rule]
  - **How to apply:** [TODO concrete check or step for next time]
- [CATEGORY-N] [TODO another candidate lesson]

## 5. Tools to build

<!--
  Friction items worth a future framework change. Each entry should be
  small and specific: "a /skill-name skill that ..." or "a check inside
  /existing-skill for X" rather than "we need better tooling." If the
  same friction appears in multiple retros, that's a strong signal to
  prioritize.
-->

- [TODO friction worth a framework change — what tool / skill / check would help]
- [TODO]

## 6. TL;DR recipe

<!--
  2–3 sentences distilling the phase. What was the shape of the work?
  What's the durable takeaway someone reading just this section would
  carry into the next phase? Lead with the takeaway, not the chronology.
-->

[TODO 2–3 sentences — durable takeaway, not a phase chronology]

## 7. Inputs available / inputs missing

<!--
  Explicit listing of what artifacts the retro had access to (so the
  reader can tell whether a thin retro reflects a thin phase or a
  missing artifact trail). Populated from the /retro subagent's
  "Inputs found" digest section.

  This section is auditability — keep it even when every input was
  present, so future readers can confirm the retro's depth was earned.
-->

**Available:**
- [TODO artifact path — e.g., docs/<phase-slug>-spec.md (with decisions table, N rows)]
- [TODO artifact path]

**Missing:**
- [TODO artifact path — e.g., docs/plans/<phase-slug>/ (phase did not go through /orchestrate)]
- [TODO artifact path or "none"]
