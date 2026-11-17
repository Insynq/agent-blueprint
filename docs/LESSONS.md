# Lessons

What was learned the hard way. Read the relevant section before debugging or working in an unfamiliar area. `/ship` adds entries during its lessons sweep.

An entry has an ID for cross-reference, the rule, and why: the incident behind it. Keep entries short; a lesson nobody reads protects nothing. Promote a lesson to `CLAUDE.md` when every session needs it, and to a hook check when it can be detected mechanically.

The entries below ship with the framework. They come from real incidents across several projects and are general enough to apply to any. Add your own beneath them, in the same categories or new ones.

---

## VERIFY

### [VERIFY-1] Never write a status you did not observe
A pass, a fail or a finding is recorded only by whoever watched it happen. This includes status boards and summaries, which feel exempt and are not. **Why:** a status board once showed a fabricated pass that nobody had run, and work was scheduled on top of it.

### [VERIFY-2] A test never seen failing is an assumption
Break the change, watch the test go red, restore it. **Why:** tests written alongside a change routinely pass with the change removed.

### [VERIFY-3] Every probe needs a negative control
"Not found" is the least trustworthy result a tool gives. Run the same search for something known to exist, and treat "I could not find it" as a fact about the search. **Why:** absence has been reported from searches that could not have matched anything.

### [VERIFY-4] A count is a hypothesis about scope
Never dispatch a sweep from a number. Classify every site as a straight change or context-bound first. **Why:** a "sweep of 11 sites" was really 4; changing the other 7 would have attributed money to the wrong party.

### [VERIFY-5] Verify the effect, not the exit code
A mechanism reporting success is not the mechanism working. A green deploy line proves an upload. **Why:** a release reported success while serving the previous build.

### [VERIFY-6] Gates verify logic; none can see a screen
Plan a human pass over anything with an interface. **Why:** one person in a browser found eleven issues after every automated gate had passed.

### [VERIFY-7] A fixture test cannot prove producer and consumer agree
Both sides can be wrong in the same way. Compare the real artifacts, or guard the shape at run time. **Why:** two halves of a feature each passed their own tests while disagreeing on a field name.

### [VERIFY-8] Inherited claims are relayed until re-grounded
An audit, a plan or an earlier report is unverified until its load-bearing facts are re-derived from source. "Could not find it broken" is not "confirmed correct". **Why:** a refuter given the broader object found a worse hole than the three the original audit named.

### [VERIFY-9] An unverified negative gets defended by every later run
Do not record "no match" or "not ours" in durable state without exhausting the source of truth and citing what was checked. **Why:** a stored negative suppressed the very re-check that would have corrected it.

### [VERIFY-10] Check that the checker checks
A typecheck at a root whose configuration includes no files passes everything. When comparing error lists across runs, strip positions first. **Why:** every gate quoting one such command was meaningless for weeks.

## PROCESS

### [PROCESS-1] A gate result that lives only in chat cannot be re-run
Record each gate, per cycle, in a checked-in file. **Why:** a control that quietly vanished between fix cycles looked identical to one that still passed.

### [PROCESS-2] Commit the locked spec to the default branch before dispatching
A worktree branches from the remote and cannot see a local-only spec, and a squash merge orphans local spec commits.

### [PROCESS-3] One worktree, one writer
An idle transcript is not a finished agent. Isolation is per batch, not per stage: a worktree per stage fragments the work. After an interrupted agent, read `git status` and the files, because `git diff --stat` omits untracked files.

### [PROCESS-4] Parallel worktrees collide on anything numbered
Timestamps and sequential IDs minted in parallel will clash. Check uniqueness where the branches meet.

### [PROCESS-5] Workers report "green on my files"
Parallel workers share an index: each stages by path, and the PM lands each slice with `git commit --only` and owns the clean, whole-repository gate.

### [PROCESS-6] Decide forks before dispatch
A subagent given an open architectural choice picks the locally convenient one. If a fork cannot be resolved, question the framing.

### [PROCESS-7] Scope decisions surface at smoke, not at audit
Permission and scope questions show up when a person clicks through as the real role. Keep an irreversible step unlanded until that has happened.

### [PROCESS-8] Every landing precondition gets its own smoke row
A precondition named only in a spec ships the phase inert.

### [PROCESS-9] "Out of scope" is earned, not assumed
Show why something is unaffected before excluding it.

### [PROCESS-10] Ground on the remote, not the local checkout
Local default branches lag. Fetch first.

### [PROCESS-11] Spike the load-bearing assumption first
Test the one thing the design depends on at a few percent of the design's cost, before designing around it.

### [PROCESS-12] Effort out of proportion is an architecture signal
When a small change produces a large diff, stop and look at the structure. Measure by diff, not by time.

## RELEASE

### [RELEASE-1] "Merge is deploy" is true only for what the host builds
List the changed paths and check which have their own deploy step before saying something is live.

### [RELEASE-2] Passing on staging is not a go for production
A demo or staging pass is evidence. Release to production is a separate decision by the user.

### [RELEASE-3] A fact recorded somewhere that can go stale will contradict the source
Do not record landing facts in a pull request title or a note when the system itself can be queried.

## AGENT

### [AGENT-1] Agreement between judges that share a premise is not independent
A split verdict is escalated with both positions quoted, never averaged.

### [AGENT-2] In a fan-out, the synthesis is the least trustworthy layer
Check the primaries, and log every item that was dropped, so that N in means N out.

### [AGENT-3] Never embed a copy of a canonical file in a skill
The copy drifts and then overwrites the original. **Why:** a setup skill carried a project-file template two releases old and would have wiped the newer sections.

### [AGENT-4] An instruction that needs emphasis belongs in a hook
If the same rule keeps being missed, make it a mechanical check.

### [AGENT-5] Most permission prompts are self-inflicted
Compound commands, `cd` prefixes and heredocs trigger prompts that a plain command would not.

### [AGENT-6] No secrets in chat
Never print a secret to verify it. `${var:+set}${var:-MISSING}` prints the value. Pipe between tools.

---

## Adding an entry

```markdown
### [CATEGORY-N] Short title
The rule, specific enough to act on. **Why:** the incident, in a sentence.
```
