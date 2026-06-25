# KB 8 — Current State

> This is the active tracking file. Keep it current — every Claude session reads it to orient on where the project stands.

## Active Phase
[TODO — populate during `/kickoff` or `/adopt`. Format: `Phase N — <name> — <status>`]

## Session Notes
- Framework-verification "done-vs-true" agenda (`docs/investigations/2026-06-24-kai-verification-grounding-findings.md` §6): **thread 3 shipped 2026-06-24** — closure "done-vs-true" discipline (spec `docs/done-vs-true-closure-spec.md`, LOCKED). **Thread 2 shipped 2026-06-25** — falsification primitive: independent Refutation Pass across the audit suite (`/audit-code`, `/audit-infra`, `/audit-full`) + a mandatory refutation bound at `/debug`'s three-strikes boundary; `/orchestrate` Phase 8 Stage 2 consumes the ledger (spec `docs/falsification-primitive-spec.md`, LOCKED). Installed, not yet exercised in a live `/audit-*` or 3-strike `/debug` run. **Thread 1 (ground-first reorder) remains open**, plus the cheap unbuilt step from thread 2: instrument which files were in context at a wrong output (a discovery-breadth lever the Refutation Pass deliberately does not cover — it refutes findings that exist, not false negatives).

## Changelog
<!-- Format: Phase X.Y — Description ✅ -->
[Empty — one-liner entries added as phases complete, typically by `/ship`.]
