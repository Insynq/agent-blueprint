# Workflow

How non-trivial work ships in this project. `/orchestrate` drives it. The skills hold the step-by-step procedure; this document holds the model they all share, so that a judge, a build batch and `/ship` mean the same thing by "locked", "verified" and "done".

## Spec or pull request

They answer different questions, and most confusion comes from treating them as alternatives.

- **A spec records what was decided and why.** It is a document in the repository and it outlives the change. Edits to it are docs and go straight to the default branch.
- **A pull request is how a change lands.** It is the point where the user sees a plain-language summary of what will be different and nothing goes live until they approve. It is temporary: once merged, the record is the spec, the changelog and git.

Which one a piece of work needs depends on two things: whether a decision is being made, and whether landing it changes what users get.

| The work | Spec | Lands by |
|---|---|---|
| A fix or tidy-up with no decision in it | None | The project's Landing convention |
| A decision was made, but the build is small | Record the decision: a row in the decisions table, or a short section in the relevant spec | Pull request if it changes behaviour |
| Crosses subsystems, needs the user's rulings, or is too big to hold in your head | A locked spec, through the loop below | One pull request per batch |
| A change to a spec, a KB or other docs | It is the spec | Straight to the default branch |

Two rules settle the cases the table does not:

- **If a push to the default branch deploys, anything that changes behaviour goes through a pull request**, however small. Pushing is releasing, and the user should choose when that happens. `CLAUDE.md` records whether this project deploys on push.
- **If you made a choice the user would want to know about, write it down before you build**, even when the build is ten lines. An unrecorded decision is the thing nobody can find six weeks later.

A pull request description is written for the user, not for a reviewer of code: what changes for the people using the product, what was verified and how, what was not verified, and what to look at before approving. An autonomy grant can cover merging; it does not remove the pull request, because the summary is still the record of what went live and when.

## When to use the loop

Small work does not need the loop. A bug fix, a one-file change or a doc edit is done directly in one session. Use the loop when work crosses subsystems, has decisions the user must make, or is big enough that you would otherwise lose the plan while executing it.

## Roles

- **The PM session** is the one long-lived conversation. It holds the goal, makes the architectural calls, dispatches subagents, checks what comes back, and talks to the user in plain decision-oriented language.
- **Subagents** do bounded work in their own context and return a report. Recurring roles are defined once in `.claude/agents/`: `explorer`, `grounder`, `implementer`, `judge`, `refuter`, `trace-verifier`.
- **The user** decides scope, product and money questions, and gives the go to build and to release.

The PM decides forks. A subagent is never handed an open architectural choice, because it lacks the context to make it and will pick whatever is locally convenient. If a fork cannot be resolved, ask whether the framing is wrong before asking the user to choose.

## The loop

| # | Phase | Output | Stops for the user |
|---|---|---|---|
| 1 | Pivot review | Confirmed scope for this phase | Yes: what changed since the last plan |
| 2 | Brainstorm | Options, a recommendation, open questions | Yes: the open questions, all at once |
| 3 | Spec | `docs/plans/<slug>/spec.md` | No |
| 4 | Judge panel | Unanimous pass, then `Status: LOCKED` | Only if round 3 fails |
| 5 | Go | Authorisation to build | Yes: one explicit go |
| 6 | Build batches | One PR per batch, unmerged | Only on a broken premise or a third failed fold |
| 7 | Integrated judge | Pass over the combined diff | Only on a fail |
| 8 | PM verification, then merge | Firsthand evidence for each claim; pull requests merged in landing order | Only if the go did not cover merging |
| 9 | Smoke | Rows closed or honestly deferred | Yes: human-only lanes |
| 10 | Ship | Docs, changelog, release | Per the autonomy grant |

Nothing merges before phase 8. `/implement` opens pull requests and leaves them; the PM merges them in the declared landing order once the integrated judge has passed and the PM has verified the result. `/ship` then updates the docs and releases, and when it is run on its own it lands whatever is still open.

Phases 1 and 2 are where the user's time goes. The grilling in phase 2 is the point of the phase: ask every question that would otherwise interrupt the build three hours in, and record the answers in the spec.

## Plan artifacts

Everything for one phase lives in `docs/plans/<slug>/`:

- `brainstorm.md`: options considered and why the chosen one won.
- `spec.md`: what will be built. The only thing a build batch implements from.
- `judge-round-N-findings.md`: one per panel round.
- `panel-history.md`: fold history, moved out of the spec after lock.
- `gate-<batch>.md`: the mechanical gate result for each batch, appended per cycle.

A spec is implementable only when it carries `> **Status: LOCKED YYYY-MM-DD**`. Only `/plan-review` writes that header. Locked means the design is complete and ready to dispatch. It is not permission to build or deploy; that is phase 5, and the go is written into the spec with its date so a resumed session can see it.

If a locked spec turns out to be wrong about the code, remove the header, correct the spec, and take it back through `/plan-review`. A build never continues on a spec that has been edited since it was locked.

Commit the locked spec to the default branch before dispatching any build batch. A batch works in a fresh worktree branched from the default branch and cannot see a spec that exists only locally, and a squash merge will orphan local-only spec commits.

Architecture decisions are recorded in a `Decision | Choice | Reasoning | Date` table, in the spec while it is live and in `docs/KB_1_Architecture.md` once they outlast the phase.

Packs extend the loop through their section of `CLAUDE.md`, which is always loaded. A pack can route the grilling and the human-run smokes through its own channel, add lock checks through a rule covering `docs/plans/`, and add steps to shipping.

Tangents that come up mid-task go to `docs/PARKING_LOT.md`, not into the current work. `/orchestrate` and `/brainstorm` read it at the start of each phase.

## Judge panel

The panel exists to falsify the design against the real codebase before anything is built from it.

- **Self-ground first.** Before convening the panel, the drafter checks its own spec mechanically: re-run a count for every number the spec states, confirm every `file:line` anchor, and walk any state machine the spec touches. This removes the errors that otherwise cost a full round.
- **Two judges, two lenses.** Dispatch two `judge` agents in parallel, each locked to a different lens. The default pair is systems correctness (data flow, sequencing, state, whether the spec's counts and anchors hold) and security and data integrity (authorisation, irreversible writes, money paths, exposure of private data). Pick different lenses when the work calls for it.
- **Every load-bearing claim is re-grounded.** A judge reads the primary source and quotes it. It does not accept the spec's prose, an earlier report, or a stale citation.
- **Verdicts.** Each judge returns pass or fail with findings graded blocker, major or minor. Any standing blocker or major is a fail. Lock requires both to pass.
- **Rounds.** At most three. Between rounds every finding is folded into the spec, including minors from a judge that passed. If round three fails, stop and bring the options to the user.
- **A split verdict goes to the user** with both positions quoted. It is never averaged. Agreement between two judges that started from the same assumption is not independent confirmation.
- **After lock, regenerate the spec clean** with every fold applied in place, and move the round history to `panel-history.md`. An implementer must never work from a strike-through.

For lighter work, one judge and one round is enough. Scale the panel to the cost of being wrong.

## Build pipeline

Each batch runs the same stages in the same order. The pipeline decides whether a stage passed; the model does the work inside it. Run it as a Workflow script when that tool is available, and as a sequence of agent dispatches when it is not. Either way the stage contract is the same.

1. **Ground** (`grounder`). Re-derive every anchor and count the spec names against live source. If a premise is false, stop and report it. Do not reconcile the spec to fit, and do not adjust a count: re-derive the real set and report the difference. A count is a hypothesis about scope, so every site in a sweep is classified individually as a straight change or as context-bound before anything is edited.
2. **Implement** (`implementer`). One isolated worktree per batch, created by the caller and shared by implementation and all of its fix cycles. Never one worktree per stage, which scatters the work. Before the first edit the caller records the typecheck and lint output as the baseline. The implementer never pushes, merges or deploys.
3. **Mechanical gate.** Checks with no model verdict, run by the caller. The implementer runs the same checks while it works, but its report says where to look; the caller's run is the gate of record:
   - the project's build and tests pass;
   - every new test has been seen failing: break the change, watch the test go red, restore it. A test never observed failing is an assumption;
   - typecheck and lint show zero new problems against the recorded baseline, compared as a sorted set of errors with positions stripped, not as a count. Confirm once that the typecheck command checks files at all: a root configuration that includes nothing passes everything.

   Write the result to `docs/plans/<slug>/gate-<batch>.md`. The gate has not passed until it is recorded, because a result that lives only in a chat message cannot be re-run or audited.
4. **Review** (`judge`, against the diff). Returns go, go-with-nits or no-go. Security-class findings also get a `refuter`, which tries to kill each finding against live code before it is acted on.
5. **Fold.** Findings go back into the same worktree, and the gate and review run again. Two cycles at most. A third failure goes to the user. Folding until something goes green is how a real problem gets laundered into a pass.
6. **Package.** Push the branch and open a pull request. Never merge from inside a batch. Batches that share files declare a landing order, and merging in that order is a PM action. A batch that needs an earlier unmerged batch branches from that batch's branch and targets it; when the parent merges, keep its branch until the child has been retargeted.

When every batch has an open pull request, one `judge` reviews the combined diff, looking hardest at files more than one batch touched and at every name one batch produces and another consumes (a column, a payload key, an event name), compared literal against literal. Each batch's tests agree with that batch's own idea of the name.

## Verification

**A report is a claim.** Before the PM treats a slice as complete it names the check that proves it, runs that check in the current exchange, and reads the output. A subagent saying it passed, or the PM having run it earlier in the phase, is not evidence.

**Never write a verification status you did not observe.** This covers a pass in a smoke row, a status board, a commit message and a summary to the user alike.

Useful habits that follow from the same rule:

- Every probe needs a negative control. "Not found" is the least trustworthy result a tool can return, so treat "I could not find it" as a fact about the search.
- Verify the effect and not the exit code. A deploy that reports success has proven an upload.
- After an interrupted agent, read `git status` and the files. `git diff --stat` does not show untracked files.
- Diff the deployed baseline against the candidate and treat the changed surface as the risk map. Re-exercise the old behaviour next to the change, not only the new feature.

### Smoke lanes

`docs/smoke-tests-pending.md` is the single list of what still needs verifying. Each row carries a lane, and the lane says what evidence closes it:

| Lane | Closed by |
|---|---|
| `data` | A check against the data store: a query, a database test, a permission round-trip. |
| `wiring` | Exercising or tracing a code path: a unit or component test, or a direct invocation. |
| `visual` | A human looking at the real interface. Nothing else closes it. |
| `integration` | An end-to-end run across systems. |

`live-required` is a qualifier on any lane: only a run against the live service closes it. It applies to anything crossing a service boundary (sign-in, outbound email or messages, webhooks, payments, third-party APIs), because unit and type checks cannot model those failures. Where production is the only live environment, release, run the smoke at once, and describe the change as released but not production-ready until it passes.

A `trace-verifier` can annotate a wiring row as trace-verified, with the date. That is weaker than verified and never flips a row to passed, and a trace more than a month old is stale: the code has moved, so trace again or run it. Dispatch one when the path crosses three or more files or a permission or state boundary; trace a single-file check yourself.

Gates verify logic. None of them can see a screen. Plan a human pass over anything with a user interface before calling it done.

### Shipping honestly

- A smoke in scope that was never run ships as `Unverified at ship: <id>`. It is never folded into "complete".
- A user saying "looks good" approves the work. It is not evidence that a test ran. A recorded result from the person who ran it is: a row closed from a guided sitting reads `Passed <date> (sitting <id>, <who>)`.
- A smoke may cross a phase boundary only with a logged grant for that smoke, recording owner, date deferred and date due. `/ship` reports the running total of deferred smokes every time.
- Carried-forward claims are tagged `[verified: how]` or `[relayed: source]` so a reader can tell which is which.

## Autonomy

The default is long uninterrupted runs.

1. **Grill, then run.** Before an autonomous run, ask the user everything in one go: scope edges, product rulings, wording, anything touching money or legal exposure, what done means, landing order, which environment. Record the answers in the spec.
2. **Then do not stop.** Within the agreed scope, a go covers committing, pushing branches, opening and merging pull requests in order, and releasing to the environments named in the grilling.
3. **Stop only when** a decision appears that the grilling did not cover, a spec premise turns out false in a way that changes what gets built, an action would spend money or contact real people outside the agreed scope, or something is destructive beyond normal landing (deleting production data, rewriting history). Otherwise pick the sensible default, note it, and continue.
4. **Design sign-off is not a build grant.** Answering design questions does not authorise building. A go does. Once given, do not ask again before each step.

The evidence rules above do not relax during an autonomous run.

### Unattended loops

For work that continues while the user is away, keep a queue file (start from `_dev/away-queue-template.md`): read it first and rewrite it last on every wake. Do one bounded unit per wake. List what the loop must never do without a per-instance grant. Two failed gate attempts on the same cause mark the item blocked with the literal error, and the loop moves on.

## Worktrees and parallel work

- One writer per worktree, always. Two sessions never share a checkout. An idle transcript does not mean an agent has finished.
- Fetch and ground on the remote default branch. A local checkout lags.
- Parallel workers share one git index within a worktree, so each stages by path and the PM lands each slice with `git commit --only -- <paths>`.
- A new worktree has none of the untracked state of the original: environment files, installed dependencies, linked projects. Set those up before running anything in it.
- Anything timestamped or sequentially numbered (migrations, IDs) can collide across parallel worktrees. Check uniqueness where the branches meet.
- Worktrees live in `.claude/worktrees/<slug>/`, inside the repository and ignored by git, never as sibling directories beside it. One place means they can be found and counted.
- A worktree is removed when its branch lands. `node _dev/tools/worktrees.mjs --prune` removes every worktree whose branch has landed and which holds nothing else, and its branch with it; it never removes one with uncommitted, untracked or unpushed work. `/ship` runs it after landing, and a session-start hook reports any that are left, so a finished worktree does not outlive the session after it merged. Removing a finished worktree needs no go from the user. One that landed but still holds stray files, or has sat untouched for two weeks, is reported to the user to decide.

Keep at most two or three subagents writing at once. Parallelism pays only when the tasks are independent, and integrating three diffs that were not costs more than it saved.

## Models

Use a fast model for grounding, gathering and tracing, and the strongest available model for implementation and judgment. The agent definitions encode this. When a phase mixes models, note which model produced each artifact.

## State

- `CLAUDE.md` says what phase the project is in, in a paragraph.
- `docs/KB_8_Current_State.md` holds the active phase and the last few completed ones.
- `docs/CHANGELOG.md` is one line per shipped change.
- `docs/LESSONS.md` holds what was learned the hard way. `/ship` sweeps new lessons into it; there is no separate retro document.

History lives in git and in `docs/plans/`. When a file starts accumulating history, move the history out.
