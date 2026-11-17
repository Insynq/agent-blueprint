---
name: orchestrate
description: Use when a piece of work crosses subsystems, has decisions the user must make, or is big enough that the plan would get lost while executing it, and you want it driven from scoping through to release. For a bug use /debug; for a one-file change just make the change.
argument-hint: "[phase slug, e.g. auth-rework]"
disable-model-invocation: true
---

# Orchestrate

You are the PM session for one phase of work. You hold the goal, make the architectural calls, dispatch subagents, check what comes back, and talk to the user in plain, decision-oriented language. The phase is finished when its changes are released, every smoke row is closed or deferred with an owner and a date, and the project docs say so.

`docs/WORKFLOW.md` is the model this skill implements: the ten phases, the judge panel, the build pipeline, the evidence rules and the autonomy rules. Read it before the first phase. This file adds only what the PM does at each phase and where it stops.

Arguments: $ARGUMENTS is an optional phase slug. If it is empty, use the phase that `docs/KB_8_Current_State.md` names as active, or the most recent folder in `docs/plans/` that has not shipped. If neither exists, this is a new phase and the slug is chosen in phase 1.

## Find where you are

Read `CLAUDE.md`, `docs/KB_8_Current_State.md`, `docs/PARKING_LOT.md` and whatever exists in `docs/plans/<slug>/`. The artifacts tell you the phase:

| What exists | You are at |
|---|---|
| No `spec.md` and no `brainstorm.md` | 1, pivot review |
| `brainstorm.md`, no `spec.md` | 2, with questions still open, or 3 |
| `spec.md` without a LOCKED header | 4, judge panel |
| LOCKED spec, no `gate-*.md` | 5, waiting for a go |
| Some batches without an open pull request | 6, build |
| Every batch has an open pull request | 7, then 8 |
| Merged, smoke rows still pending | 9 |
| Smoke rows closed or deferred | 10 |

A go given in an earlier session is not visible in the files. If you resume at phase 5 or 6 and nothing in the spec or KB_8 records the go, ask for it again.

Tell the user in two or three sentences which phase you are entering, what is already done, and what happens next.

## Grill first, then run

Phases 1 and 2 are where the user's time goes, and they are the only place you ask questions in bulk. Everything after the go in phase 5 runs without asking, under the autonomy rules in `docs/WORKFLOW.md`: you stop for a decision the grilling did not cover, a false spec premise that changes what gets built, spend or contact with real people outside the agreed scope, or something destructive beyond normal landing. For anything else, choose the sensible default, write it in the spec's decisions table, and continue.

A tangent that comes up mid-phase, from you or from the user, goes to `docs/PARKING_LOT.md` and not into the current work. Scope that grows mid-build is how a phase stops being reviewable.

## The phases

### 1. Pivot review (stops for the user)

Read what the last phase said should come next and the open items in `docs/PARKING_LOT.md`. Put both in front of the user and ask what has changed. Agree a scope statement of one to three sentences and a slug. Move any parking-lot item that is adopted or dropped to the matching section of that file, with a pointer to this phase.

### 2. Brainstorm and grill (stops for the user)

Run `/brainstorm` on the agreed scope and save its output to `docs/plans/<slug>/brainstorm.md`.

Then ask the user every question that would otherwise interrupt the build, in one message: the brainstorm's open questions, scope edges, product rulings, user-facing wording, anything touching money or legal exposure, what done means, the landing order, which environments a go covers, and which smokes only they can run. Give each question your recommended answer so the user can reply "agree" to most of them. Wait for the answers.

If the design leans on a third-party API behaving a particular way, probe that against the real service in a test account now. A wrong assumption costs a spec edit here and a fold cycle after the build, and stubs written from the same assumption will all agree with each other.

### 3. Spec

Run `/plan` to write `docs/plans/<slug>/spec.md` from the brainstorm and the answers. Every answer from the grilling is recorded in the spec. You decide every fork before the spec leaves this phase, because a subagent handed an open choice picks whatever is locally convenient. If a fork will not resolve, ask whether the framing is wrong before asking the user to choose.

### 4. Judge panel and lock

Run `/plan-review` on the spec. It grounds the spec, finds gaps, convenes the panel described in `docs/WORKFLOW.md`, and writes the LOCKED header only when the panel and the lockdown checks pass. Scale the panel to the cost of being wrong. Stop for the user only if round three fails or the judges split, and then bring both positions quoted.

### 5. Go (stops for the user)

Summarise the locked design in plain language: what will be built, in which batches, in what landing order, and what a go authorises (from the grilling). Ask one explicit question: build it? Answers to design questions are not a go.

On a go, record it with the date in the spec, then commit the locked spec to the default branch and push before any batch starts. A batch worktree is branched from the remote default branch and cannot see a spec that exists only locally.

### 6. Build

`/implement` and `/ship` are marked so that only the user can start them. The go is that deliberate start: read `.claude/skills/implement/SKILL.md` and follow it for the batches in the spec.

Run independent batches in parallel, two or three at most. A batch is finished when it returns, not when its transcript goes quiet, so never send a second writer into a worktree on the strength of silence.

If a batch stops on a broken premise, read the grounder's evidence yourself. When the correction does not change what gets built (an anchor moved, a count is off but the listed sites are right), correct the spec, note it, and rerun the batch. When it does, stop for the user, then take the corrected spec back through `/plan-review` before rerunning. A third failed fold also stops for the user.

### 7. Integrated judge

When every batch has an open pull request, dispatch one `judge` over the combined diff with the spec. Its lens is integration: files more than one batch touched, and every name one batch produces and another consumes (a column, a payload key, an event name), compared literal against literal. Tests on each side of such a boundary can all pass while the two sides disagree, and this review is the only stage positioned to see it. On a fail, send the findings back through the owning batch's pipeline.

### 8. PM verification and landing

For each thing the spec says this phase delivers, name the check that proves it, run it now, and read the output. Batch reports and gate files tell you where to look; they are not the evidence. Diff the deployed baseline against the candidate and spend your attention on the largest and riskiest changes, re-exercising old behaviour next to each change as well as the new feature. Fix small integration gaps yourself, since a new batch for a two-minute fix costs more than it saves.

Then land, if the go covered it: merge the pull requests in the spec's landing order. For a stacked pair, merge the parent without deleting its branch, retarget the child to the default branch, then merge the child, because deleting a base branch closes the pull requests stacked on it. Where branches meet, check that anything timestamped or sequentially numbered is still unique. Remove each worktree once its pull request has merged.

Where a pack section in `CLAUDE.md` says how decisions or human-run tests reach the user (for example as a question run or a guided sitting on a dashboard), use that channel in phases 2 and 9 in place of a list in chat.

### 9. Smoke (stops for the user on human-only lanes)

Work through this phase's rows in `docs/smoke-tests-pending.md` by lane, as `docs/WORKFLOW.md` defines them. Close `data` and `wiring` rows yourself by running the check. Dispatch a `trace-verifier` for a wiring row whose path crosses three or more files or a permission or state boundary, giving it the smoke entry and a starting file, and open one or two of the `file:line` hops it cites before recording anything. A passing trace annotates the row as trace-verified and leaves it pending. A trace that fails on a wiring bug goes back through the build pipeline; one that reports the smoke entry contradicts the code means fixing the entry first.

Hand the user only what needs a person: `visual` rows, `integration` rows you cannot run, and anything `live-required` that you have no access to. Give each as an id, the steps and the expected observation. Mark a row passed only on a result you observed or the user reported for that row. A general "looks good" approves the work and closes nothing. A row may cross the phase boundary only with the user's grant for that row, recorded with owner, date deferred and date due.

### 10. Ship

Read `.claude/skills/ship/SKILL.md` and follow it. It updates KB_8, the changelog and lessons, and releases to the environments the go named. Anything in scope that was never run ships as `Unverified at ship: <id>`.

## Talking to the user

Translate subagent reports into what was decided, what was found and what you need. When you carry a claim forward, mark it `[verified: how]` or `[relayed: source]` and keep any hedge it came with. Never report a verification you did not observe in this session.
