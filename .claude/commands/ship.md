---
description: Update project docs, compose a commit, and push to remote (optional tag + release, or gated merge to main)
argument-hint: "<free-text ship summary — may name a phase/wave, a version like v0.4.0 to tag+release, and/or 'merge to main'>"
---

# Ship Orchestrator

**This skill spawns a general-purpose subagent that updates documentation, commits, and pushes.**

## Action Required

Spawn a Task with `subagent_type: general-purpose` using the prompt below.

---

## Subagent Prompt

```
# Ship Orchestrator

Ship summary (free-text): **$ARGUMENTS**

This summary is a loose brief, NOT a paste-ready commit message — you will COMPOSE a clean commit message from it in Step 5. Parse it for three optional signals:
- **Phase/wave** named (e.g. "phase 6.5", "auth wave") → drives the doc updates in Step 3.
- **Version** named (e.g. "v0.4.0", "release v0.4.0") → triggers tag + GitHub Release (Steps 5.5 / 6.5).
- **Merge intent** ("ship and merge", "land it", "merge to main") → triggers the gated merge-to-main in Step 6.7.

Never echo template tokens (`$ARGUMENTS`, `.message`, `{{…}}`) into the commit or your output.

## Your Role

You are a shipping orchestrator. You will:
1. Review what's being shipped
2. Update project documentation to reflect the work
3. Compose a clean commit message from the summary, then stage and commit
4. Push to remote (commits + any annotated tags)
5. If the summary names a version: tag the release and cut a GitHub Release
6. If the summary asks to merge/land: merge to main and clean up the branch

You have access to: Read, Edit, Write, Bash, Glob, Grep tools.

## Step 1: Review Changes

Run these to understand what's being shipped:
```bash
git status
git diff --stat
git log --oneline -5
```

If there are no changes to commit, STOP and report "Nothing to ship — working tree clean."

## Step 2: Discover Project Documentation

Read the project context to understand the doc structure:

1. Read `CLAUDE.md` — look for:
   - References to KB or doc files (e.g., "See `/docs` folder:", file paths)
   - Current phase status section
   - Documentation conventions or maintenance rules

2. Glob for docs: `docs/**/*.md` — list all doc files

3. Identify the docs most likely to need updating based on the git diff:
   - **Current state / session tracking** — most frequently updated doc
   - **Planning or phase docs** — if a phase was completed
   - **CLAUDE.md itself** — if phase status needs updating

If no `docs/` folder exists, check for `README.md` or `.claude/*.md` files.

## Step 3: Update Documentation

### If the ship summary names a phase/wave

If the summary names a completed phase/wave, treat that phase as complete. Find and update:

1. **CLAUDE.md** — Mark the named phase as ✅ complete. Update "Current Phase" or equivalent section to advance to the next item.

2. **Current state doc** — The doc that tracks active work (highest-traffic KB, STATUS.md, etc.).
   Add a one-liner completion entry and clear any resolved session notes for this phase.

3. **Planning doc for this phase** — If found, collapse the completed phase details to a 2-3 line summary:
   - What was built
   - Key deviations from plan (if any)
   - Reference git history for full details

### Always (regardless of whether a phase is named)

Review the git diff. If the changes introduce new features, patterns, or conventions not yet reflected in docs:
- Add a one-liner changelog entry to the relevant docs
- Update any "Recent Additions" or equivalent section in CLAUDE.md if significant enough

### Documentation conventions to apply

**Status emojis:** ✅ Complete | ⏳ In Progress / Next | 📋 Deferred

**Changelog format** — one-liner entries only:
```
| Version | Date | Changes |
| v2.5 | 2026-02-04 | Phase 6.5 complete - new MCP server registered |
```

**Collapsed phase format:**
```
### Phase X.Y — Name
[What was built in 1-2 sentences]. [Key deviation if any.]
```

**Versioned docs:** Always bump VERSION and DATE when editing.

## Step 3.5: Sweep Smoke-Test Catalog

If `docs/smoke-tests-pending.md` exists:

1. Read it. Look for sections where every test is `Passed (YYYY-MM-DD)` — collapse those sections in this commit to a one-liner (e.g., `Phase 2 — all 5 tests passed 2026-05-15. See git history for detail.`). Don't batch this across releases; do it now.
2. Check if the diff introduces behavior that needs new manual verification (UI flows, OAuth, payments, third-party webhooks, migrations, browser-specific bugs, race conditions). If so, propose new entries to add — assign stable IDs following the `<SECTION>-<NUMBER>` or `<SECTION>-<TYPE><NUMBER>` convention, do NOT reuse retired IDs.
3. **Truth-in-world gate (not just `Failed`).** If any test in the diff's scope is in `Failed` status, STOP and report — do not ship until it is resolved or explicitly deferred. Additionally, if any test in the diff's scope is **not** `Passed` (never-run, `Pending`, or absent), it is **not** truth-checked: the composed commit/changelog body (Step 5) MUST name it verbatim as `Unverified at ship: <id>` rather than asserting it as validated/working. A never-run smoke must surface as an unverified claim — it may never launder into a bare "Ship Complete." (This gate reads the literal catalog state, an external artifact — not an agent self-report, so it can't be rubber-stamped.)

If the file does not exist, skip this step (project hasn't adopted the catalog yet).

## Step 4: Stage Changes

Stage all modified files:
```bash
git add -A
```

Review what's staged:
```bash
git diff --cached --stat
```

## Step 5: Compose the Commit Message, then Commit

The ship summary is a loose brief, not a commit message. **Compose** a clean message from it — do not paste the summary verbatim:

- **Subject:** ≤72 chars, imperative mood, no trailing punctuation. Distill what shipped (not how it was requested).
- **Blank line**, then **1–3 short body paragraphs** distilling: what changed and why, quality gates / smoke tests run, and any migration or follow-up note. Drop meta-instructions aimed at the agent (e.g. "make sure to…", "don't forget…").
- **Two trailers** (see below).

> **Provenance discipline.** For every claim you carry forward from a worker/sub-agent self-report (smoke status, worker completion notes, the loose brief's quality-gate assertions), tag it `[verified: how]` or `[relayed: source-said]`; never harden a hedge ("appears to" stays "appears to," a grep-count stays a grep-count); re-read the source's own caveats and carry the strongest dissenting line forward so front-confidence never exceeds back-caveats. The body may not assert more completion than the smoke catalog (Step 3.5) actually verified — carry any `Unverified at ship: <id>` line through verbatim. Failure this prevents: `docs/investigations/2026-06-24-kai-verification-grounding-findings.md`.

Write the composed message to a temp file and commit from it (avoids shell-quoting issues with multi-paragraph bodies):

```bash
cat > /tmp/ship-commit-msg.txt <<'EOF'
<composed subject line>

<composed body paragraph(s)>

Co-Authored-By: Claude <MODEL> <noreply@anthropic.com>
Built-With: Insynq's Framework — https://github.com/Insynq/agent-blueprint — https://insynqk.com
EOF
git commit -F /tmp/ship-commit-msg.txt
```

- Replace `<MODEL>` with the model you are executing as (e.g. `Opus 4.8`). Do **not** leave the placeholder literal, and do **not** hardcode a fixed version into the template — it drifts every model release.
- The `Built-With:` trailer credits the framework this project was scaffolded from and links Insynq's site. Keep it on every commit unless the user explicitly says to remove it for a specific repo.

## Step 5.5: Tag the Release (only if the summary names a version)

**Skip this entire step if the summary names no version** — incremental phase ships are not tagged.

If the summary names a version (call it `$VERSION`, e.g. `v0.4.0`), create an annotated tag on the commit you just made. Reuse the composed commit message as the tag annotation — it becomes the source of truth for the GitHub Release notes (Step 6.5 reads it back):

```bash
VERSION="v0.4.0"   # <- the version parsed from the ship summary
# Guard: refuse to overwrite an existing tag
git rev-parse "$VERSION" >/dev/null 2>&1 && { echo "Tag $VERSION already exists — STOP"; exit 1; }
git tag -a "$VERSION" -F /tmp/ship-commit-msg.txt
```

If the tag already exists, STOP and report — do not move or force the tag.

## Step 6: Push

Push commits **and** any annotated tags reachable from them. `--follow-tags` is safe on every ship: with no new tag it behaves like a plain push, and it guarantees a tag created in Step 5.5 ships in the same operation (never stranded locally).

```bash
git push --follow-tags
```

If push fails due to upstream changes:
```bash
git pull --rebase && git push --follow-tags
```

If push fails for any other reason, report the error and STOP — do not force push.

## Step 6.5: Cut GitHub Release (only if the summary names a version)

**Skip this entire step if the summary names no version.**

The tag is now on the remote (pushed in Step 6). Create a GitHub Release that points at it, sourcing notes from the tag annotation so there's a single source of truth:

```bash
# Requires gh CLI authenticated. If gh is unavailable, report that the tag
# was pushed but the Release was not cut, and STOP (do not fail the ship).
gh release create "$VERSION" --verify-tag --title "$VERSION" --notes-from-tag
```

- `--verify-tag` aborts if the tag somehow isn't on the remote (catches a failed push).
- `--notes-from-tag` reuses the annotated-tag message as the release body.

This is what makes the `/releases/latest` GitHub endpoint resolve — without a published Release, that endpoint returns 404 even when tags exist. If the command fails, report the error but treat the ship as succeeded (commit + tag are already pushed); the Release can be created manually later.

## Step 6.7: Merge to main + clean up branch (only if the summary asks to land/merge)

**Skip this entire step unless the ship summary explicitly asks to land or merge** (e.g. "ship and merge", "land it", "merge to main"). Default behavior is unchanged: the feature branch is pushed (Step 6) and you remind the user to open a PR.

`/ship` commits and pushes the *current branch* — it does not merge. Merged feature branches otherwise accumulate, so cleanup hooks here, to the merge.

When merge IS requested and you are on a feature branch (not already on main):

```bash
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
git checkout main
git pull --ff-only                        # STOP if this fails — do not rebase/merge to force it
git merge --no-ff "$BRANCH"               # STOP on any conflict — never auto-resolve
git log --oneline -3                      # verify the merge looks right before pushing
git push origin main
# cleanup — only after a clean push
git branch -d "$BRANCH"                    # -d (safe), NEVER -D (force)
git push origin --delete "$BRANCH" 2>/dev/null || true   # tolerate an already-auto-deleted remote branch
git remote prune origin
```

Safety rails:
- **Stop on any merge conflict** — report and let the user resolve; never auto-resolve.
- **Never force-push, never force-delete** (`-d`, not `-D`). If `git branch -d` refuses (branch not fully merged), STOP — something is wrong.
- **Stacked branches:** merging a stacked child also lands its parent's commits. If this branch was stacked on another unmerged branch, call that out rather than silently landing it.
- A release tagged in Step 5.5 sits on the feature commit, which a `--no-ff` merge brings into main's history — so the tag stays reachable from main. No retag needed.

## Step 7: Final Output

```markdown
## Ship Complete

### Changes Shipped
[git diff --stat summary]

### Documentation Updated
- [File]: [what changed]
- [File]: [what changed]
(or "No doc updates needed")

### Commit
**Hash:** [short hash]
**Message:** [the composed commit subject line]

### Push
[Success + remote URL, or error details]

### Release
[If a version was named: tag $VERSION pushed + Release URL, or error details]
[If no version: "Incremental ship — no tag/release"]

### Merge
[If merge was requested: "[branch] merged to main (--no-ff), deleted local + remote"]
[If not requested: "Branch pushed — open a PR to land"]
```

## Important Instructions

1. **Don't skip git status** — always verify there are changes first
2. **Update docs before staging** — doc changes should be part of the same commit
3. **Compose the commit message from the ship summary** — never paste the summary verbatim, and NEVER emit template tokens (`$ARGUMENTS`, `.message`, `{{…}}`) into the commit or output
4. **Always include Co-Authored-By and Built-With trailers** — required for all commits unless the user has explicitly asked to remove them; set the Co-Authored-By model to the model you are executing as (no stale hardcoded version)
5. **Never force push** — if push fails after pull --rebase, report and stop
6. **Never move or force a tag** — if the version tag already exists, stop and report (Step 5.5)
7. **Tagging/releasing is opt-in** — only fires when the summary names a version; plain ships commit + push only
8. **A failed Release is not a failed ship** — if `gh release create` fails after the tag is pushed, report it but treat the ship as succeeded
9. **Merging is opt-in and gated** — only merge to main when the summary explicitly asks; stop on conflicts, never force-push, never force-delete a branch
10. **Report failures clearly** — if any step fails, stop and explain
```

---

## After Orchestrator Returns

1. **Nothing to commit** → No action needed
2. **Push failed** → May need to resolve conflicts manually
3. **Doc update failed** → Run `/update-kb` manually, then commit and push
