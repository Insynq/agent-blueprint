# Changelog

> Maintained automatically by `/ship`. Newest entries at the top.
> Each entry represents one shipped commit or completed phase.
>
> This is the primary "what has been built and when" reference for Claude sessions.
> Read alongside `docs/KB_8_Current_State.md` for project history without reading git log.
>
> To generate this file from existing git history, run `/changelog`.

---

<!-- /ship prepends new entries below this line -->

- 2026-06-25 — **v0.4.0 — Verification discipline agenda complete (threads 1–3).** Bundles thread 3 closure provenance (`c48f93d`), thread 2 falsification primitive (`7aea047`), and thread 1 ground-first anchor (below). Tagged `v0.4.0`.
- 2026-06-25 — Install the ground-first primary-artifact anchor (thread 1, final thread, of the verification agenda): `/investigate` gains a "Step 0: Anchor on the Primary Artifact" — quote the literal artifact, derive the §2 entry point from it (not from a theory of what's wrong), and mark downstream root-cause claims UNVERIFIED when the artifact is unavailable — with checkable `Primary Artifact` + `Entry point derived from:` output fields. `/brainstorm` Phase 1 gains one conditional artifact-anchor line reusing the existing `[verified]`/`[relayed]` provenance vocabulary. The grounded brainstorm (`wf_a1014478-c50`) confirmed thread 1 was otherwise already covered (rules #13/227/124, `/debug` Step 1, `/plan-review` §3a); only the `/investigate:37` entry-point seam was genuinely uncovered. Spec: `docs/ground-first-anchor-spec.md` (LOCKED). Installed, not yet proven in a live run.
- 2026-06-25 — Install the falsification primitive (thread 2 of the verification agenda): the audit suite (`/audit-code`, `/audit-infra`, `/audit-full`) now ends in an independent, graded **Refutation Ledger** — a fresh skeptic agent tries to KILL each load-bearing finding against primary source — superseding the self-graded `APPROVED`/`PASSED` checkbox, bounded by a fixed CLAUDE.md DO-NOT allowlist the producing auditor cannot shrink, with a mechanical tally and an explicit false-negative no-op caveat. `/debug` binds a mandatory independent refutation at the three-strikes boundary; `/orchestrate` Phase 8 Stage 2 consumes the ledger. Spec: `docs/falsification-primitive-spec.md` (LOCKED). Installed, not yet proven in a live run.
- 2026-06-24 — Install closure "done-vs-true" truth-discipline (thread 3 of the verification agenda): `/ship` Step 3.5 now gates on not-`Passed` (a never-run smoke surfaces verbatim as `Unverified at ship: <id>`), and a verified-vs-relayed provenance block is inlined at 5 synthesis sites across `/ship`, `/orchestrate`, `/retro`, `/brainstorm`. Spec: `docs/done-vs-true-closure-spec.md` (LOCKED).
- 2026-06-24 — Add grounding-findings investigation doc capturing the kai verification-theory grounding pass (16-claim ledger, the synthesis-amplifies-hedges meta-finding) and the 3-thread framework "done-vs-true" agenda.
