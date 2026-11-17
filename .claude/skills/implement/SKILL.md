---
name: implement
description: Use when a spec is locked, the user has said to build it, and its batches need turning into reviewed pull requests. For a spec that is not locked yet use /plan-review; for a small change with no spec, make the change directly.
argument-hint: "<path to locked spec> [batch: all | next | N | N-M]"
disable-model-invocation: true
---

# Implement

Build a locked spec one batch at a time through the pipeline in `docs/WORKFLOW.md`: ground, implement, mechanical gate, review, fold, package. A batch is finished when its branch is pushed, a pull request is open and unmerged, and `docs/plans/<slug>/gate-<batch>.md` records a gate you ran yourself. This skill never merges, because the landing order across batches belongs to whoever is running the phase.

The stages and their order are fixed. You judge the work inside a stage; you do not decide whether a stage can be skipped or whether a failed one passed.

Arguments: $ARGUMENTS is the spec path, optionally followed by a batch selection. `all` is the default, `next` is the first batch with no open pull request, and `N` or `N-M` selects by number. Work out the concrete path and batch numbers before doing anything else. The batches, the files each owns and their landing order come from the spec; do not re-derive them.

## Before the first batch

Stop and report if any of these fails, since each one means the batch would be built from the wrong thing:

- The spec's first lines carry `> **Status: LOCKED YYYY-MM-DD**`. A draft is exploratory.
- The same locked spec is on the remote default branch. Fetch, then read the file from the remote ref and compare. A worktree is branched from the remote and cannot see a spec that exists only locally.
- The build, test, typecheck and lint commands are filled in under Commands in `CLAUDE.md`.

Invoking this skill is the user's go for building and opening pull requests. It is not a go for merging or releasing.

## Running the pipeline

If the Workflow tool is available, write the stages below as a workflow script, one run per batch, so that stage order and the fold cap are enforced by the script. Load the tool's authoring reference first. Otherwise drive the same stages with Agent dispatches. Either way you create the worktree and pass its path along; do not use per-agent worktree isolation, which gives each stage its own throwaway tree and leaves nothing coherent to package.

Batches with no dependency between them can run in parallel, two or three at most. A batch that builds on an earlier unmerged batch branches from that batch's branch and opens its pull request against it; say so in the pull request.

### 1. Ground

Dispatch the `grounder` agent with the spec path and the batch number. Ask it to re-derive, against the remote default branch, every anchor, count and named value the batch relies on, and to classify each site of any sweep as a straight change or context-bound.

If it returns `Premise broken: yes`, open the evidence it quotes and confirm it yourself. If it holds, the batch stops here: report the claim, the real set and the difference. Do not reconcile the spec to fit and do not build anyway. The spec needs correcting and re-locking first, and that is not this skill's decision. Anchors that only moved are not a broken premise; pass their new locations to the implementer.

### 2. Worktree and baseline

Create one worktree for the batch at `.claude/worktrees/<slug>-<batch>/`, on a new branch from the remote default branch (or from the earlier batch's branch, as above). Keep worktrees there and not beside the repository, so housekeeping can find them. Set up what a fresh checkout lacks: environment files, installed dependencies, linked projects.

Before any edit, run the typecheck and lint commands in the worktree and save each output as a sorted list with line and column numbers removed, in a temporary location outside the worktree. This is the baseline. Run the tests too and note any that already fail. A typecheck that reports nothing on a project of any size deserves a second look: one project's root configuration checked no files at all, and every gate quoting it was meaningless.

### 3. Implement

Dispatch the `implementer` agent with the worktree path, the spec path, the batch number, the grounder's report, and the baseline's location. One writer per worktree: do not dispatch again until this agent has returned, however quiet it looks.

If it reports a spec deviation, or that the spec is wrong about the code, treat that as a broken premise and handle it as in stage 1.

### 4. Mechanical gate

Run the gate yourself, in the worktree. The implementer's report tells you where to look and is not the result.

- **Build and tests** pass, judged by exit code and not by searching the output. If something fails, run the identical command on the base before blaming the change; a wrong runner flag looks exactly like a regression.
- **Every new test has been seen failing.** For each test the batch added, break the change it covers, run it, watch it go red, and restore. Afterwards confirm the tree matches what it was before. A test that stays green with the change broken is asserting nothing; that is a gate failure.
- **Zero new typecheck and lint problems.** Produce the same sorted, position-stripped list and compare it with the baseline as a set. Any member that was not there before is new. A count is not a comparison, and unstripped line numbers produce phantom new errors whenever code above them moves.
- **Only the batch's files changed.** Compare the changed paths, including untracked files, with the files the spec gives this batch.

Append the result to `docs/plans/<slug>/gate-<batch>.md` in the worktree, using `gate-template.md` in this folder. Add a new dated section for every cycle and never overwrite an earlier one. The gate has not passed until it is written down: a later cycle has to be able to read which controls the earlier one ran, and a control that silently disappears between cycles looks the same as one that still passes.

### 5. Review

Dispatch a `judge` with the spec path, the batch number, the worktree path and the command that shows the batch's diff. Do not send the implementer's report or your view of the work. Its lens is the batch against the spec: every step landed as specified, nothing extra, and the code correct. Ask it to check any name the batch uses but does not own (a column, a payload key, an event name) against the owner's definition, since tests written from the consumer's side agree with the consumer even when it is wrong. Add a second judge on the security and data integrity lens when the batch touches authorisation, money, private data or irreversible writes.

For every security-class finding, dispatch a `refuter` before acting on it, and act on what stands. Open the cited lines of any other blocker or major yourself.

`go` moves to packaging. `go-with-nits` also moves to packaging once every nit is fixed or parked in `docs/PARKING_LOT.md` with a pointer; a fixed nit means the gate runs again. `no-go` goes to a fold.

### 6. Fold

Send the standing findings and any gate failures, verbatim, to the `implementer` in the same worktree. Then run stage 4 and stage 5 again in full, with the same mutation controls as the earlier cycle plus any for new tests.

Two fold cycles at most. If the gate or the review still fails after the second, stop the batch and take it to the user with the standing findings. Folding until something turns green is how a real problem becomes a recorded pass.

### 7. Package

Add the batch's smoke rows from the spec to `docs/smoke-tests-pending.md`, each with its lane, a starting file for wiring rows, and `live-required` on anything that crosses a service boundary. Commit by path, including the gate file, and push the branch. Open a pull request whose description links the spec, states the gate and review results, lists what was not verified, and gives the batch's place in the landing order. Then leave it open.

A batch does not write anything addressed to the user beyond its pull request: no log entries, question runs or test sittings. The session running the phase does that after the batches land, so several batches do not each produce their own.

## Report

For each batch: grounding result, files changed, gate result with the path of the gate file, review verdict and cycles used, pull request link, and anything not verified. For a stopped batch, the stage it stopped at and the evidence. Use the evidence words as `CLAUDE.md` defines them: a packaged batch is built and reviewed, not done, until its smokes are run. Say plainly that nothing has been merged and nothing with a user interface has been looked at by a person.
