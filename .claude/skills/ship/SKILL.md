---
name: ship
description: Use when work is built and checked and you are landing it - at the end of a phase, or after a standalone fix that needs its docs, commit and release done together. Not for work still being built (use /implement) and not for a docs-only tidy (use /update-kb).
argument-hint: "[what is shipping; may name a completed phase, a version to tag, or 'merge']"
disable-model-invocation: true
---

# Ship

Ship summary: $ARGUMENTS

Land built work: reconcile the smoke ledger with what was observed, update the project's state docs, sweep the lessons, commit, land on the default branch the way this project does it, and release. Done means the change is on the remote, released if the project has a release step, and the report says truthfully what was verified, what was not, and how much verification debt is being carried.

Run this in the session that did or directed the work, because it holds the evidence of what was run. Do not hand the whole ship to a subagent: it would have only a summary to go on, and a ship written from a summary asserts things nobody observed.

The summary is a brief, not a commit message. Read it for three optional signals: a phase or wave named as complete (this is a phase boundary), a version such as `v1.2.0` (tag and publish a release), and an instruction to merge or land. `docs/WORKFLOW.md` (Verification, Autonomy) is the model this skill applies; read it if you have not this session.

## When this stops for the user

With an autonomy grant covering this work, run every step without asking. Without one, invoking `/ship` authorises the docs, the commit and the push of the working branch; ask once, in a single question, before merging into the default branch or running the release.

Whatever the grant, stop for these, because a grant covers landing and not deciding the evidence away:

- a smoke in scope is failed;
- a `live-required` smoke in scope has not run and has no logged grant;
- a smoke would cross a phase boundary without its own logged grant;
- a merge conflicts, a push is rejected for a reason other than being behind, or a tag already exists.

Collect every stop of the first three kinds and ask about them together.

## Pack steps

Installed packs add their own duties to shipping in their section of `CLAUDE.md`, between the pack markers: a release procedure, results to record before the ledger is reconciled, a log entry to write, a check to run before the commit. Read those sections now and fold each duty into the step it belongs to. They carry the same weight as the steps here.

## 1. See what is shipping

Read `git status` (untracked files included), the diff against the remote default branch, and recent history. If there is nothing to ship, say so and stop. Sort the changes into what belongs to this ship and what does not. Files you did not expect are someone else's work or a stray artifact: leave them unstaged and name them in the report.

Under a pull-request convention, if this phase's batch pull requests are still open, merge them in their declared landing order first and do the rest on top of the result.

## 2. Reconcile the smoke ledger

Read `docs/smoke-tests-pending.md`. If the project has none, say so in the report and go to step 3. The rows in scope are those covering behaviour this ship changes. The ledger is the gate because it is an artifact anyone can read back, where a recollection that "smokes passed" is not.

**Close only on evidence.** A row moves to passed when you observed, in this session, evidence matching its lane, or the user describes what they ran and what they saw. A bare "pass" or "looks good" from the user approves the work; it does not say a test ran. Ask what was exercised, or leave the row as it is. A `trace-verified` annotation stays an annotation.

**Add what is missing.** If the diff introduces behaviour no row covers and automated checks cannot see (an interface, a sign-in flow, a migration, anything timing-dependent), add a row with a new stable id and a lane. Never reuse a retired id.

**Service boundaries are `live-required`.** If the diff touches sign-in, outbound email or messages, a webhook, a payment, or any third-party API, there must be a `live-required` row for it; add one if there is not. Passing tests cannot close it, because the failures live in the other system. Run it before release where an environment exercises the real service. Where only production does, release and run it immediately afterwards as part of this ship. Shipping without running it needs the user's logged grant for that row.

**Failed rows block.** Fix the failure, or get the user's ruling.

**Everything else in scope is unverified.** A row that is pending, never run, or only trace-verified is carried into the commit body, the changelog line and the report, word for word, as `Unverified at ship: <id>`. Each one needs an owner and a due date recorded on its row; a deferral without both is a row nobody will ever run.

**Phase boundary.** When the summary names a completed phase, every unverified row needs the user's grant for that row, logged on it with owner, date deferred and date due. A grant from an earlier phase, or the fact that earlier ships went out this way, does not carry over: that is how a habit turns into a standing permission nobody gave.

**Debt rollup, every ship.** Count every deferred smoke in the ledger, not only this ship's: id, owner, date deferred, date due, and whether it is overdue. List rows that are trace-verified but still pending, with the trace date, as debt of the same kind. Put the total and how it moved since the last ship near the top of the report. Judge the phase by whether this number went down, not by how much was shipped.

## 3. Update the docs

Edit the checked-in files in place and match the voice of the entries already there.

- `docs/KB_8_Current_State.md`: the active phase as it now stands. At a phase boundary, demote the finished phase to a short summary and keep only the last few; older ones live in git and `docs/plans/`.
- `docs/CHANGELOG.md`: one line at the top with the date and what shipped, including any `Unverified at ship` ids. Detail belongs in the commit body. If the file has a gap, backfill it from `git log`, one line per shipped change.
- `CLAUDE.md`, current phase: rewrite the paragraph. It stays one paragraph, because every session pays to load it.
- `docs/PARKING_LOT.md`: close the items this ship resolved, and add the ones it surfaced.
- `docs/KB_1_Architecture.md`: decisions from the spec that outlast the phase, in the decision table.

## 4. Sweep the lessons

This replaces a separate retrospective. Ask two questions of the work just finished: what was harder than expected, and what nearly went wrong? Answer from the record and not from memory: the gate files and judge findings in `docs/plans/<slug>/`, fix and revert commits, smokes that failed on first run, decisions that flipped mid-build, anything the user had to catch.

- A lesson that would change what the next person does goes into `docs/LESSONS.md` in that file's existing format, with the real incident as its reason. A lesson without an incident is advice, and advice does not get read.
- A convention that is now settled goes into `CLAUDE.md` Patterns as one line.
- An idea for tooling goes to `docs/PARKING_LOT.md`.

Write the entries and list them in the report so the user can strike any. Do not create a retro document. Finding nothing is a legitimate result: say what you reviewed, and do not manufacture a lesson to fill the section.

## 5. Commit

Stage by path, naming each file that belongs to this ship. Never `git add -A` or `git add .`: other sessions and stray files share the working tree, and a blanket add ships them. Read `git diff --cached --stat` before committing. If other writers share this index, commit with `git commit --only -- <paths>`.

Compose the message from the summary; do not paste it. The shape is in `reference.md` in this folder. Two rules govern the body:

- **Provenance.** Any claim you did not observe yourself this session is tagged `[relayed: source]`; one you did is `[verified: how]`. A hedge in the source stays a hedge, and a code read is never reworded as an end-to-end pass.
- **No more completion than the ledger shows.** Every `Unverified at ship: <id>` line from step 2 appears verbatim.

## 6. Land and release

Land the way the project does. `CLAUDE.md` or recent history shows whether changes reach the default branch by pull request or by direct commit; if neither settles it, use a pull request. One rule overrides the convention: where a push to the default branch deploys, anything that changes behaviour lands by pull request, and docs-only changes still go straight in (`docs/WORKFLOW.md`, "Spec or pull request"). Write the pull request description for the user: what changes for the people using the product, what was verified and how, what was not, and what to look at before approving. Push the branch; if it is rejected for being behind, rebase onto the remote and push again. Never force-push, and stop on a conflict instead of resolving it by guesswork. After a merge, delete the merged branch with the safe form, which refuses if it is not fully merged.

Then follow the Release entry under Commands in `CLAUDE.md` exactly; packs put their stack's procedure there. If it is empty, the project has no release step and landing is the release. Check the effect and not the exit code: confirm the released thing is serving the new behaviour. Now run any `live-required` smoke that was waiting on the release and record what you saw.

If the summary names a version, tag the shipped commit and publish a release as `reference.md` describes. Never move an existing tag. A release that fails to publish after the tag is pushed is reported, and does not undo the ship.

## 7. Tidy up

Run `node _dev/tools/worktrees.mjs --prune`. It removes each worktree whose branch has landed and which holds nothing else, along with the branch, and refuses anything with uncommitted, untracked or unpushed work. Do this without asking: a finished worktree left behind is how a project ends up with twenty of them. If it reports worktrees that landed with leftovers or have gone stale, list them in the report for the user to decide; do not remove those yourself.

## 8. Report

Use the template in `reference.md`. Lead with the outcome and the smoke debt. Use the glossary words exactly: released without its live smokes run is not production-ready, and unverified rows mean the work is shipped and not done.
