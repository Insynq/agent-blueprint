# OC KB 11 — Safety Primitives: defensive patterns for action-taking agents

## Pattern

Action-taking agents (those that send messages, write to systems of record, schedule jobs, mutate shared state) need primitives that bound the blast radius of mistakes. The nine primitives in this KB are the ones that pay back in production (the first eight govern the deliberate write path; the ninth governs the error path). None are runtime-enforced by OpenClaw — they are conventions that skills, MCP tools, and deterministic scripts opt into.

The taxonomy from `OC_KB_10` is useful here: most of these primitives target **Extraction** (where false certainty originates) and **Action** (where blast radius lives).

A "safety primitive" is not a confirmation prompt slapped on top of a destructive op. Confirmation is one primitive among eight, and the weakest. The point of the broader set is that the agent's behavior is auditable, reversible, and pre-checked **before** the user has to say yes — so when confirmation does come, it's meaningful.

The strongest move, though, comes *before* the nine: don't put a destructive operation on the agent's surface at all. See **Primitive 0** below.

## When to use / when to skip

**Use the full set when:**
- The skill has Action-layer side effects on systems the user cannot easily undo (financial records, customer-visible messages, third-party APIs that lack idempotency).
- The agent runs on a cron and there's no human in the loop turn-by-turn.
- The skill has multi-step writes where partial completion is worse than no completion.

**Use a subset when:**
- The skill is read-only (Perception + Extraction + Reasoning + report). Round-trip verification and undo primitives don't apply.
- The skill writes only to agent-owned state (MEMORY.md, TASK-QUEUE.md). Soft-delete and time-delayed commits are usually overkill.

**Skip when:**
- Single-user dev agent on disposable state, no shared system of record involved.
- Prototype phase where the friction would slow learning.

## Primitive 0 — Don't expose the operation (close the capability)

Primitive zero precedes the other eight. The strongest way to make a destructive operation safe is to **not put it on the agent's surface at all.** Before guarding an irreversible action with dry-runs, sanity gates, and undo, ask whether the agent needs the capability in the first place. If a destructive operation is a rare, outlier need, leave it out of `mcporter.json` and route the few legitimate cases to a human UI — even when a user asks for it.

```text
Anonymized example:

  Request: "It'd be nice if the agent could delete <records> from this."
  Decision: don't register a `delete_<records>` MCP tool. The rare real
            deletion happens in the existing admin UI; the agent never holds
            the capability, so no prompt-injected or fat-fingered instruction
            can trigger it.
```

Prevention-by-class beats per-call guarding: a capability the agent doesn't have cannot be misused — not by a confidently-wrong model, and not by an injected "someone-else-told-it-to" instruction (the agent's real threat model is instruction-following, not rogue invention). Scale the cut to context: a disposable single-user toy can expose more; a shared or enterprise system of record should default to **closed**, granting a destructive tool only when a concrete, recurring need justifies the standing risk. The nine primitives below bound the blast radius of the operations you *do* expose; Primitive 0 removes operations from the blast radius entirely.

## Autonomy budget — scale unsupervised runway to structural containment

A long autonomous run is safe not because the model is trusted but because the downside is structurally bounded. Grant standing multi-step autonomy only when three properties hold: (1) **the reachable deploy target cannot touch prod** — the agent's merges land somewhere revertible, and prod promotion stays human-gated; the containment earns the runway, not the model's judgment. (2) **An automated approval gate precedes each irreversible step** — "do not merge until the automated reviewers approve" is an enforced precondition, not a request. (3) **The permission grant is explicit and enumerated up front** — name the exact verbs the agent may take autonomously, so scope is a closed set. Absent all three, autonomy stays turn-by-turn. This is the write-path complement to CLAUDE.md's prod-mutation gate: the gate says *stop at the prod boundary*; this says *how far you may run before it*. Verification disciplines (`[PROCESS-1]`, Refutation Pass) still run on the output — containment bounds damage, it does not certify quality. This grants a *bounded* runway, not "always autonomous": inside the run, the per-operation confidence-threshold and confirmation anti-patterns (§Anti-patterns below) still apply.

**Supervision surface:** a bounded autonomous run writes its whole program as an in-repo checklist and commits each item's completion as it goes — the committed ledger lets a human watch progress land out-of-band without interrupting the run. Scoped to contained runs only: committing-as-you-go to a live deploying branch *without* the three properties above is the anti-pattern the deploy gate exists to stop.

**The ledger must be git-tracked, or it is not a supervision surface.** A gitignored, untracked `TODO.md` cannot be watched out-of-band and never travels to a derived package (plugin, slice, regenerated snapshot) — it leaves the derived artifact with no validation signal at all. A downstream product carried its entire readiness sequence in exactly this shape: every phase box still unchecked while the work landed in commits, so the only durable validation signal was prose in commit bodies. The `[RUN]`-item ledger (the manual-validation checklist that only a live run can close) has to be committed to be a supervision surface at all. (Design-validated: this failure mode is attested in the source artifacts, not reproduced under a live run.)

## Least privilege: no keys in context, default-deny in shared contexts

Before the nine primitives, two prevention rules:

**The model never holds credentials.** The LLM context itself carries no keys — secrets live only in the launchd plist (read into `process.env`) and are used by MCP **server processes**; the model invokes a tool by name and never sees the secret. A leaked or injected instruction can ask a tool to act, but cannot read a credential the model was never given. (This is why secrets belong in the plist / MCP server config, never in a bootstrap file or skill — see `OC_KB_07`, `OC_KB_03`.)

**(Multi-user only) Default-deny query scoping.** When one agent serves multiple distinct users in a shared channel, default to deny: the agent queries only data everyone present can already see, or data the requesting user explicitly asked for and already has access to (treat anything broader as a rare anomaly needing explicit confirmation). Put this access-scope check in the MCP tool or script boundary, never in skill prose — the model can be wrong about who may see what; a scoped query against the system of record cannot. The threat model is instruction-following ("someone else told it to"), not rogue invention, so the control must be external and default-closed.

**Label every safety rule by enforcement class — and state the soft promise and the hard gate together.** Each rule is either **SOFT** (a behavioral promise the agent keeps by choosing to — e.g. "I only touch the folder I set up," running on a connector scoped to the whole account) or **HARD** (a host-enforced gate the agent cannot bypass — e.g. Codex's write-approval prompt, or a scoped query at the tool boundary above). Tag each rule with its class. **The label classifies ENFORCEMENT, not bindingness.** A SOFT rule binds the agent exactly as much as a HARD one — both are rules to be kept, in full. SOFT names *what stands behind the rule if the agent tries to break it*: for a HARD rule, the host stops it; for a SOFT rule, nothing does — the only thing between the rule and its breach is the agent's own behavior. That is a reason for **more** care on a SOFT rule, not less. It does not license the reading "this is only a SOFT rule, so breaking it is just a broken promise" — breaking it is breaking a rule that had no backstop, which is worse, not lighter. The honesty doctrine is the point: when you disclose a soft promise, disclose the hard gate — or its absence — in the same breath. A soft promise presented as a wall is the difference between a promise and a lie: the connector *can* reach more than the folder, and the containment is the agent's behavior, not the grant. Never dress a behavioral promise as a structural boundary. (Structural precedent: `OC_KB_12`'s provenance-flag taxonomy tags each fact with *how it is known*; this tags each safety rule with *how it is enforced*. Design-validated from the source artifacts, not runtime-proven.)

## Two-tier safety loading: compaction-proof spine + path-loaded domain floors

Safety content splits by altitude, and the two tiers load by different mechanisms on purpose.

**Tier 1 — the always-on spine (force-re-injected).** The universal safety rules — the abstract "don't act destructively without …" spine — live on the always-on surface (`AGENTS.md`) and are force-re-injected by a `SessionStart` hook on **all four** matchers: `startup`, `resume`, `clear`, **and `compact`**. The `compact` matcher is the load-bearing one: compaction evicts the spine from context, so without a re-injection on `compact` the agent runs post-compaction with its safety rules silently gone. (Full hook mechanics — the dual-runtime `${CLAUDE_PLUGIN_ROOT:-$PLUGIN_ROOT}` path fallback, Codex trust-gating, the `~/.codex/AGENTS.md` backstop — are in the 2026-07-07 plugins investigation; this KB canonicalizes the four-matcher rule as safety doctrine.)

**Tier 2 — path-loaded domain floors (lazy).** Domain-specific safety content loads only when the skill that owns it runs. It is not on the always-on surface and does not survive compaction on its own — it re-loads with its skill each time. Two extension points hang off this split:

- **Domain-invariant "never-do" block — bolted onto the always-on surface, kept separate from the spine.** A labeled block of concrete, irreversible domain invariants ("never auto-close a protective deadline"; "'all clear' is an honest count, not a hope"; "dates come from the signed document, not the email") lives on the *same* always-on file as the spine but in its own section, so the abstract spine stays abstract and the concrete invariants are not diluted into it. Concrete-and-domain-specific on the always-on surface; abstract-and-universal in the spine.
- **Domain-safety OUTPUT floor — silent self-checks on the agent's own draft before it is shown.** A per-domain content floor (a real-estate agent's `compliance.md`: Fair Housing, no legal/tax advice, no guaranteed outcomes, CAN-SPAM/TCPA) runs as silent self-checks against the agent's *own draft* before that draft is surfaced — an output gate, not an input gate. It is owned by the single skill that produces the governed output and loaded lazily by that skill.

**The enforcement asymmetry is deliberate — and it names a failure mode.** The spine is compaction-proof because it is hooked; the domain floors are best-effort because they ride their skill. That asymmetry is a choice, and the hook-vs-lazy decision carries a specific failure mode: a floor referenced only in a skill's prose ("silently run it through `compliance.md`") fires *only* on the path that names it. Any output drafted on a different path skips the floor entirely, with no session-level guardrail. The default is not symmetric. **A liability-bearing output floor (compliance-class — Fair Housing, CAN-SPAM/TCPA, no legal/tax advice, and their kin) defaults to HOOKED / always-on**: compaction-proof, path-independent, firing on every draft regardless of which skill produced it. Lazy loading for a floor in this class is not a free branch — it requires an explicit, recorded decision (in `KB_1_Architecture.md`) that names the second-draft-path exposure it accepts and why the cost is worth it. For a non-liability floor, the two-way choice stands: **hook it** (compaction-proof, path-independent) or **accept lazy loading** (cheaper, but only as reliable as the single path that loads it) — and if lazy, know that a second draft path silently has no floor. The field case is the evidence for defaulting compliance-class to hooked: the source product's compliance floor was lazy, reachable through one skill's prose, and that skill had run zero times — so the one content-safety layer was both unhooked and never exercised. That is the failure the default exists to prevent.

(Design-validated on the source artifacts, not runtime-proven: the output floor above was never exercised by a live run — the caveat is load-bearing here, since an unrun compliance gate is precisely what the failure mode above describes.)

Cross-refs: `OC_KB_02` §references (lazy skill-scoped floors), `OC_KB_04` (the always-on surface), `OC_KB_12` (newest-wins re-injection).

## The nine primitives

### 1. Dry-run before writes

The agent describes the intended action — full payload, target system, identifying keys — **before** committing. The user (or a downstream check) reads the description and approves or rejects.

```text
Anonymized example surface:

  Agent: "About to write to <system> with this payload:
    target: <id>
    fields: { <field>: <value>, <field>: <value> }
    side effects: <what this triggers>

   Confirm? (yes/no)"
```

The dry-run **must mirror the real call.** A dry-run that uses different payload-building logic from the real call defeats the primitive — the user reviews shape A and the agent commits shape B.

### 2. Sanity gate (pre-condition checks)

Before write, run mechanical checks that surface conflicts. These run unconditionally, separately from the LLM's own reasoning.

```text
Anonymized checks for a hypothetical "send-followup" skill:

  - Does the recipient exist in <system>?
  - Has a followup already been sent in the last <threshold>?
  - Is <field> non-empty in the upstream record?
  - Does the proposed action match the routing config in <bootstrap file>?

  Any failure → halt write, surface the conflict, ask user.
```

Sanity gates are deterministic. They live in MCP tools or deterministic scripts, **not** in skill prose. The LLM can be wrong about whether a precondition holds; a query against the system of record cannot.

### 3. Round-trip verification (read-back)

After write, read back what was written and confirm it matches what was intended. This catches partial commits, silent type coercion, race conditions, and the wrong-target write.

```text
Pseudocode:

  intended = build_payload(input)
  result   = mcp__system__write(intended)
  readback = mcp__system__read(result.id)
  if readback != intended_invariants:
    log_inconsistency(intended, readback)
    surface_to_user("write may have partially committed")
```

The check is on **invariants that should be true after the write**, not byte-equality. Some fields will differ (timestamps, server-assigned IDs); the invariant is that the user-visible content the agent meant to write is now actually there. Read-back scope explicitly includes the **side-effect rows** a write is supposed to *also* emit — the audit / log / provenance record, not just the primary row: a primary write that succeeds while its audit row silently drops is the Primitive 9 failure, and reading back only the primary misses it.

**3a. Make the write verifiable and the read-back cheap.** Round-trip verification is only as cheap as the write shape allows. When the store is a wide row read one API round-trip at a time (Sheets/Notion/Airtable — the tool call is the cost unit, not the byte), a partial-patch write forces a read storm to verify: each patched cell re-read, each corrective cycle another round-trip. Three write-side disciplines collapse the verify to a single read:

- **Write the whole row in one full-width batch — blanks included, never partial patches — but ONLY where the agent is the row's sole writer.** The precondition is load-bearing: a full-width batch clobbers every column, so if a human is co-editing the same Sheet, the agent's write from a stale read silently overwrites the cells they just changed. Where the agent owns the whole row, the full-width batch is correct — it cannot half-commit and cannot misalign, whereas a sequence of narrow patches can leave the row in a state no single read describes, which is what turns verification into a re-read-per-cell storm. Where the surface is human-co-edited, do NOT full-width batch: either **write only the columns you own** (narrow patches scoped to agent-owned fields — you re-take the read-storm cost to avoid clobbering a human's edit) or **re-read immediately before writing** and abort if the row changed under you (narrow the race window; it does not close it). Name the trade each branch makes: full-width batch trades away concurrent-human safety for a one-read verify; own-columns-only trades the cheap verify back for co-edit safety; re-read-before-write trades a residual race window for keeping the batch shape.
- **Pin volatile fields to fixed FRONT columns.** Timestamps (`created_at`/`updated_at`) and other clock- or server-driven values go in known leading columns, so a partial or reordered write cannot shift them under a neighbouring field's header. Volatile-fields-at-the-tail is exactly what misaligns under a partial write and forces corrective write-then-read cycles.
- **Verify with ONE consolidated range read, not per-cell re-reads.** Read the whole row back in a single call and check the Primitive 3 invariants against it. One write, one read, done.

A downstream real-estate agent's wide Deals row (39 columns at the time, later widened to 45) originally trailed its timestamps and patched cells piecemeal, which forced 3–4 corrective write-then-read cycles per deal; the full-width-batch + volatile-front + single-read discipline removed the thrash. The data-model side of this — *why* the row is wide and denormalized, and when a denormalized hot field is a named cache rather than a duplicated fact — is `OC_KB_16` (Datastore Modeling for Tool-Call Reads). (Design-validated on the source artifacts, not yet runtime-proven on a live open deal.)

### 4. Confidence scoring

Every Extraction-layer output carries a confidence value. Low confidence flips the skill from autonomous to ask-mode.

```json
{
  "extracted": { "amount": 1234, "vendor": "<name>" },
  "confidence": {
    "amount": 0.95,
    "vendor": 0.62
  },
  "threshold": 0.80
}
```

Confidence scoring is not magical — for LLM-based extraction, it can be the agent's own self-reported confidence, OR a structural signal (regex match strength, multi-source agreement). Either is better than implicit-1.0-confidence-on-everything.

The threshold is a project decision, documented in `KB_1_Architecture.md`. Below threshold → the skill explicitly asks the user; above → autonomous commit allowed.

### 5. Pre-write assumption surfacing

Before writing, the agent enumerates the assumptions it's making — invariants it didn't verify but is acting as if true. The user sees the list and can correct any assumption that's wrong.

```text
Anonymized example:

  Agent: "Proceeding with these assumptions:
    1. <assumption 1 — e.g., this is the canonical record>
    2. <assumption 2 — e.g., no other agent is writing concurrently>
    3. <assumption 3 — e.g., <field> defaults to <value> when unset>

  Any wrong? (yes/no/list-numbers)"
```

Assumption surfacing is the **strongest** primitive against confidently-wrong agents. It forces the agent to make its model of the world legible. Most agent failures are bad assumptions silently held; surfacing them is the cheap fix.

**The BLOCKED corollary — never invent a required input.** Not every unverified assumption is safe to proceed under, so classify before you act. A **required** input is one whose invention would change a *persisted or irreversible* outcome — the record that gets written, the target that gets mutated. When a required input is unresolved, the task is **BLOCKED**: log the *exact* missing input, stop, and escalate. Inventing it is prohibited — a guessed required input is a silent-open failure (see Primitive 9). A **soft** assumption, by contrast, is a stateable default you can proceed under and surface for correction — the list in the surfacing example above is soft assumptions. The classification test: *would inventing this change a persisted or irreversible outcome?* Yes → required → BLOCKED. No → soft → proceed-and-surface. This matters because agents fabricate missing inputs to satisfy an output-format instruction rather than escalate the gap (verified in executor and planner system cards) — the fail-loud BLOCKED path is what stops the fabrication.

### 6. Soft-delete and time-delayed commits

Irreversible operations get a delay window. The agent stages the action, and only after the window elapses (or an explicit go) does the commit fire.

```text
Anonymized example:

  Agent: "Marked <record> for deletion. Will commit in 24 hours unless you say cancel.
   <link to the staging area>."

  -> deterministic cron checks the staging area at the threshold and commits.
  -> if user says cancel before then, the staged action is cleared.
```

"Soft-delete" specifically means: the agent moves the record to a holding state and only later truly deletes it. Same idea applies to "send" actions for messages that, once sent, cannot be unsent.

### 7. Undo primitive

Every mutating action has a documented inverse. The inverse may be exact (delete what was inserted) or compensating (a refund row that offsets a charge row). Either way, the inverse is named, tested, and discoverable.

```yaml
# Anonymized example surface in a skill catalog
| Skill | Mutating action | Inverse | Inverse type |
|---|---|---|---|
| send-followup     | mcp__mail__send         | mcp__mail__delete (within recall window) OR send-correction skill | exact / compensating |
| write-task        | mcp__tasks__create      | mcp__tasks__archive                                                | exact |
| commit-record     | mcp__records__write     | mcp__records__write_correction                                     | compensating |
```

If a mutating action has no documented inverse, you cannot say the action is reversible — and a user reasonably will not trust the agent with it. The undo is part of the skill's contract, not an afterthought.

### 8. Capability self-assessment

When the agent encounters a task and is about to declare "I can't do that," it instead **attempts the smallest version** and reports the actual failure mode. Verify by attempt, not by assumption.

```text
Anonymized example:

  User: "Can you read messages from <channel>?"

  Bad: "I don't have access to <channel>." (assumption — possibly wrong)

  Good: "Trying — calling mcp__channel__list... result: <success or specific error>.
   If <specific error>, the missing capability is <X>; here's how to add it: <pointer>."
```

The bad version is plausible-sounding noise that wastes the user's time. The good version surfaces the actual missing capability — usually a config gap (env var, plist entry, MCP server registration) the user can fix in a minute.

**Sharpen — a "blocked" / "skipped" / "unavailable" verdict is a capability claim too, held to the same bar.** The primitive is symmetric: before you *report or persist* that a lane is blocked, execute-verify every candidate your **own** probes already surfaced — open the file, run `--help`, invoke the smallest call. The set to try is bounded and self-defining: it is your own search hits, not an open-ended hunt. An MCP-auth banner (`needsAuthMcpServers`, "unauthorized") rules out only *that one MCP path* — never the capability, which may have a working CLI or script sitting in the same grep. And do **not** treat runbook- or skill-named tools as ground truth: in the incident below the in-repo prose pointed at a dead MCP while the grep surfaced the live tool, and the agent believed the prose. Verify by attempt, not by banner, prose, or assumption — and make the negative claim evidence-carrying: name the exact commands attempted and their verbatim errors (the negative twin of "state the counts you read").

```text
Blocked-side example (real incident):

  Task: pull settlement emails. Harness banner: "claude.ai Gmail — unauthorized."
  In-repo prose: a SKILL says "pull-via-MCP"; a parser header says "via the Gmail MCP".

  Bad: digest declares Gmail "blocked", persists blocked=true to a durable row,
       skips the reconcile step predicated on the lane, recommends the forbidden
       connector as the only fix. (The agent's own grep had surfaced
       gmail-attachment.js — a working CLI whose usage header documents `search` —
       as a top hit; it discounted the hit WITHOUT opening the file.)

  Good: before writing "blocked", open gmail-attachment.js / run its --help.
        The banner rules out the MCP path only; the CLI path works. No blockage —
        and the reconcile step that depended on the lane still runs.
```

### 9. Fail loud or fail closed — never fail silent-open

Primitives 1–8 govern the *deliberate* write path — they assume a write either commits or visibly halts. Primitive 9 governs the *error* path. When a write to a system of record **can fail**, its failure handler must **fail loud** (re-surface the error into the run's own summary as a non-zero failure count) or **fail closed** (abort the protected operation) — never **fail silent-open** (log a Warning and continue as if nothing happened). A broad `catch → log → continue` inverts the intent of the write: a guard meant to *protect* rows skips protecting them; a sync meant to *persist* an audit row drops it — every run, with no surfaced signal, while the surrounding run still reports success.

```text
Anti-pattern (real incident):
  try { await write('audit_runs', record) }
  catch (e) { log(`Warning: failed to write audit row: ${e}`) }   // ← swallowed
  // run continues; digest prints "9 synced, 0 flags" — but the audit row never
  // landed (a column the writer expects was never migrated). Silent every run.

Fix — scope the catch to the SPECIFIC expected error; surface everything else:
  try { await write('audit_runs', record) }
  catch (e) {
    if (isExpectedDegrade(e)) summary.degraded = e.code   // fail-LOUD: counted in the run summary
    else throw e                                          // fail-CLOSED: aborts the protected op
  }
```

Two failure shapes, one rule. A **fail-silent** trap drops the write and a green digest lies. A **fail-open** trap — a catch broad enough to swallow a *transient* error (a 500 / network blip), not just the one expected condition — silently skips the protected operation on a fluke. Both are defeated the same way: scope the catch to the specific expected condition, and make every other path either counted in the run summary or fatal. The test: **the digest (or any persisted status) must not be able to assert a success the write never achieved — nor a blockage no attempt verified.** This is the write-path sibling of the orchestration-path rule in `docs/LESSONS.md` `[PROCESS-3]` ("log the drop, don't let it pass silently") and the authoring-side complement of the `[PROCESS-1]` runtime corollary (which tells the *reviewer* not to trust that green digest).

**Field closure (2026-07-02):** the "real incident" this primitive was authored from (2026-06-26) is fixed downstream — the column the audit writer expected was migrated and prod-verified, and the audit row wrote for the first time since the drop began (6/25). Field-attested end to end: the drop itself was surfaced only by the `[PROCESS-1]` Corollary 2 adversarial re-verification against the raw tool-results, never by the run's own green digest — which is exactly the reviewer/authoring pairing this primitive names.

## Composition: which primitives stack

Most production skills use a layered subset:

| Skill class | Primitives that apply |
|---|---|
| Read-only summarize / report | confidence scoring, capability self-assessment |
| Mutate agent-owned state | sanity gate, round-trip verify, undo, capability self-assessment |
| Send messages externally | full set except soft-delete (use mail recall window if available) |
| Modify records in a system of record | full set |
| Schedule / mutate crons | dry-run, sanity gate, undo (the inverse: `openclaw cron edit/delete`) |

The point of stacking is that confidence scoring catches some failures, sanity gates catch others, round-trip catches the rest — and the few that get past all three are the ones the user genuinely needs to look at.

## Anti-patterns

- **Confirmation as the only safety.** A skill that does no sanity gating, no confidence scoring, no round-trip verification, but pops a "are you sure? (y/n)" before the write — the user becomes a rubber stamp. They say yes because the agent said this is what we're doing. → fix: layer the other primitives so confirmation is only the last gate, not the only one.

- **Logging after-the-fact instead of before.** The agent writes, then logs what it wrote. If the write is wrong, the only artifact is the wrongness, with no record of intent. → fix: log the intended payload **before** the write fires (dry-run output goes to the log too), so post-hoc you can compare intent vs result.

- **Dry-run that doesn't mirror the real call.** Different code paths build the dry-run text vs the real call. The user reviews payload A; the agent submits payload B. → fix: the dry-run output is a string-rendering of the **same payload object** that gets passed to the real call. One source.

- **Confidence scoring with a threshold of zero.** "Always autonomous" defeats the primitive. → fix: pick a non-zero threshold per-field; document in `KB_1_Architecture.md`. Tune later, but start above zero.

- **Round-trip verification of identity instead of invariants.** The agent reads back and checks `==`, but the system stamps an updated_at, so equality always fails or always passes for the wrong reason. → fix: the readback compares the **invariants** the user cares about (the message body, the record's user-visible fields), not the whole envelope.

- **Soft-delete with no commit cron.** The staging area fills with marked-for-deletion records that never actually delete. → fix: pair the staging mechanism with the deterministic-cron commit job (`OC_KB_06`); test that the cron fires.

- **Undo primitive only documented for the happy path.** The inverse is named for the success case; the partial-success case (write committed half-way) is undocumented. → fix: think through partial-success modes in the skill's Important Rules section; name the inverse for each.

- **Declaring a lane "blocked" on a banner or a stale runbook, without attempting it.** An MCP-auth banner (or in-repo prose naming a dead tool) gets read as the *capability* being unavailable; the agent persists a false "blocked" and skips the downstream steps that depended on the lane — even though its own grep surfaced a working CLI it never opened. → fix: Primitive 8's blocked-side — before reporting or persisting blocked/skipped, execute-verify every candidate your own probes surfaced (open the file, run `--help`); the banner rules out one MCP path, never the capability. Enumerate the exact commands attempted + verbatim errors so "blocked" carries evidence.

- **Fail-silent-open error trap.** A write wrapped in a broad `catch → log Warning → continue`: the write silently no-ops while the run reports success (a green "N done, 0 errors" digest sitting over a swallowed failure), or a *transient* blip trips the same broad catch and skips a guard's protection for that run. → fix: Primitive 9 — scope the catch to the *specific* expected error; make every other path fail-loud (counted in the run summary) or fail-closed (aborts). The digest must not be able to assert a success the write never achieved.

- **Semantic defaults on attribution/financial columns.** A column `DEFAULT` — or a view's `COALESCE(...)` fallback — set to a *business-rule value* instead of an inert one silently stamps its assertion on every row whose writer omitted the field. This is a two-headed trap: the write-side `DEFAULT` and the read-side `COALESCE` each assert the same business rule and can be introduced (or dropped) independently, so fixing one head leaves the other live. → fix: defaults and `COALESCE` fallbacks on attribution/financial columns must be inert (`NULL` / `0` / `'unknown'`), never a business meaning — force the omission to be visible so a real value has to be supplied, and audit both heads together. (Real incident: a `parsons_split_pct DEFAULT 75` plus a view `COALESCE(..., 75)` put ~$97,156 of mis-credit at risk across 13 settlements; hardening migration `20260625000001` (2026-06-25) dropped both heads, and the ruling session cleared the flags 2026-07-03.)

## Diagnosing "the agent did the wrong thing"

In order, when a destructive action turns out to have been wrong:

1. Was there a dry-run output for this action? Read the gateway log around the time of the write — search for the dry-run prefix the skill uses (e.g., `[skill-name] dry-run:`).
2. Did sanity gates run? If a gate would have caught this, why didn't it fire? (Either the gate isn't there, or the precondition check itself was wrong.)
3. What was the confidence on the extracted fields that drove the action? If it was below threshold, why did the skill commit anyway? If it was above threshold, the threshold may be too low.
4. Did the round-trip verify run? If yes, did it surface the inconsistency, and was the surfacing ignored?
5. Was the undo primitive used? If not, why? (User didn't know it existed → discoverability bug. User couldn't run it → undo path is broken.)
6. Did a write **error get trapped non-fatally**? A clean-looking digest can sit over a swallowed write failure — grep the run for caught-and-continued write errors the summary never counted (`Warning`, the `catch` blocks, the system's error codes). If found, the fix is Primitive 9 (scope the catch; fail loud or closed).

Each step localizes the layer the safety failed at. The fix is in that layer, not in adding a new layer further up the stack.

## Cross-references

- `OC_KB_10` — capability layers; this KB targets Extraction and Action.
- `OC_KB_12` — trust and provenance; the decision log records what these primitives caught.
- `OC_KB_03` — MCP tools enforce sanity gates and round-trip verification at the tool surface.
- `OC_KB_06` — deterministic crons run delayed-commit and undo flows.
- `OC_KB_16` — datastore modeling for tool-call reads; the data-model side of Primitive 3a's wide-row write discipline.
- `OC_KB_02`, `OC_KB_04` — lazy skill-scoped floors and the always-on surface, the two tiers of §Two-tier safety loading.

[VERIFY BEFORE SHIPPING] None of these primitives are runtime-enforced by OpenClaw. They are conventions implemented in skill content, MCP tool implementations, and deterministic scripts. When adopting them, document the chosen subset and thresholds in `KB_1_Architecture.md` so future-you can audit drift.
