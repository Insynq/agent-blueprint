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

- 2026-06-24 — Install closure "done-vs-true" truth-discipline (thread 3 of the verification agenda): `/ship` Step 3.5 now gates on not-`Passed` (a never-run smoke surfaces verbatim as `Unverified at ship: <id>`), and a verified-vs-relayed provenance block is inlined at 5 synthesis sites across `/ship`, `/orchestrate`, `/retro`, `/brainstorm`. Spec: `docs/done-vs-true-closure-spec.md` (LOCKED).
- 2026-06-24 — Add grounding-findings investigation doc capturing the kai verification-theory grounding pass (16-claim ledger, the synthesis-amplifies-hedges meta-finding) and the 3-thread framework "done-vs-true" agenda.
