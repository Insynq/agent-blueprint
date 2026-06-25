# KB 8 — Current State

> This is the active tracking file. Keep it current — every Claude session reads it to orient on where the project stands.

## Active Phase
[TODO — populate during `/kickoff` or `/adopt`. Format: `Phase N — <name> — <status>`]

## Session Notes
- Framework-verification "done-vs-true" agenda (`docs/investigations/2026-06-24-kai-verification-grounding-findings.md` §6): **all three threads shipped and released as v0.4.0 (2026-06-25).** Thread 3 — closure "done-vs-true" discipline (spec `docs/done-vs-true-closure-spec.md`, LOCKED; `c48f93d`). Thread 2 — falsification primitive: independent Refutation Pass across the audit suite (`/audit-code`, `/audit-infra`, `/audit-full`) + a mandatory refutation bound at `/debug`'s three-strikes boundary; `/orchestrate` Phase 8 Stage 2 consumes the ledger (spec `docs/falsification-primitive-spec.md`, LOCKED; `7aea047`). Thread 1 — ground-first primary-artifact anchor: `/investigate` Step 0 (quote the literal artifact, derive the entry point from it, checkable `Primary Artifact` + `Entry point derived from:` fields) + a one-line `/brainstorm` Phase 1 anchor; the grounded brainstorm (`wf_a1014478-c50`) confirmed thread 1 was otherwise already covered (spec `docs/ground-first-anchor-spec.md`, LOCKED). All three are markdown-prose edits — installed and verified by read-back on disk, not yet exercised in a live `/investigate`, `/audit-*`, or 3-strike `/debug` run. **One open item remains: session instrumentation** — capture which files were actually in context at a wrong output (a discovery-breadth / false-negative lever the Refutation Pass deliberately does not cover). Not yet started.

## Changelog
<!-- Format: Phase X.Y — Description ✅ -->
[Empty — one-liner entries added as phases complete, typically by `/ship`.]
