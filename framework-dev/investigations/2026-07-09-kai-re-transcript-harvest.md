# Kai-RE Creation Transcript Harvest — Verified Insights

**Date:** 2026-07-09
**Method:** Multi-agent workflow (`kai-re-transcript-harvest`, run `wf_f6fda6b8-955`): one Opus harvester per Kai-RE session transcript (Jul 7–8, 2026), adversarial verification of every high/medium-confidence insight against the Kai-RE and kai-re-plugin repos + source transcripts, plus a completeness-critic sweep.
**Chain under study:** agent-blueprint (framework) → Kai-RE (sliced realtor transaction-coordination product) → kai-re-plugin (Codex + Claude Code distribution package).
**Status:** 6/7 transcripts harvested (86d41ebd failed — see critic report), 24/24 insights CONFIRMED by adversarial verification. Critic identified material gaps for a second pass.

---

## Sessions covered

- `295e81f3` — This transcript is a Kai-RE distribution-strategy exploration session (predating the actual kai-re-plugin build), conducted in Claude Code while the user's real target host was Codex. The user, blocked by Codex's free-tier message cap, had the agent pick up a gitignored plan doc (PLANS/kai-re-distribution-strategy.md) written in a prior Codex session and pressure-test the packaging decision. The session establishes that the Kai-RE slice is pure Markdown with zero Node dependency, diagnoses how Codex plugins wrap Google connectors (install != authorize), maps the write-capability risk of personal-Gmail+Plus connectors, and adversarially rules out the "just share a Custom GPT" shortcut (it secretly requires the builder to host OAuth). Conclusion: v1 is a Codex plugin, BYO Plus + personal Gmail, because it's the only low-effort path where the agent's Google "hands" work using each user's own connectors. Ends with the agent offering to package the repo into the Codex plugin structure.
- `86d41ebd` — **HARVEST FAILED** (returned probe placeholder; see critic report)
- `6a9aff6c` — This session (Kai-RE repo, 2026-07-09) is NOT the plugin-release work itself but the design session that preceded/surrounded it: (1) a clean-slate cleanup of the Codex test environment before new-user onboarding testing, and (2) a long design conversation that produced PLANS/onboarding-experience-spec.md — a "discover your world" onboarding rework for Kai-RE (a transaction-coordination agent for solo realtors running on Codex/ChatGPT as host). The bulk of the work was collaboratively designing an honest, non-technical, permission-respecting onboarding arc (ask-to-look → probe only what's green-lit → calendar-led reveal → Drive-boundary honesty → find-or-create the Kai-RE folder → daily-use/automation/growth guidance), then verifying every host-capability claim against the user's actual Codex install (config.toml, app directory cache, connector safety refs) rather than guessing. It ended with the agent handing the user a self-contained copy-paste prompt to execute the build in a fresh context window.
- `e7f87e78` — This session was NOT the plugin build itself — it was a downstream task: building a live workshop presentation to teach solo realtors how to install and onboard the Kai-RE ("Kai") plugin. The user supplied four Loom recordings (three as .srt transcripts, one install video as mp4 with no transcript) and asked for a workshop run-of-show. The agent read the transcripts plus the Kai-RE repo's AGENTS.md, skills/onboard.md, and a kai-re-plugin-distribution memory note, produced a markdown run-of-show, then iterated it through several visual forms: a scrolling "talk-track" Artifact, then a projectable full-screen keyboard-driven slide deck (16 slides, presenter notes, terminal cards with copy buttons, inline-SVG logo), and finally packaged a fully standalone self-contained HTML file for the user to host on insynq.com via Lovable. Along the way it surfaced the real Codex/Claude Code install commands, the product's onboarding flow and positioning, and several deployment gotchas.
- `cffcc660` — A single focused implementation session in the Kai-RE repo (the sliced realtor transaction-coordination product): rebuild skills/onboard.md into a provider-agnostic first-run arc per a locked spec (onboarding-experience-spec.md), add new Meta config fields to the sheets schema, and — on a mid-session user request — rename the persisted spreadsheet from 'Kai-RE Database' to 'Kai-RE Organizer' consistently everywhere. The agent planned first, discovered the rename was load-bearing (the AGENTS.md first-run check opens the file by exact name), mapped every reference across AGENTS.md + 5 skills before editing, verified constraints held with grep sweeps, and committed (commit d542c86, 10 files, no push). The session also surfaced the repo's plugin-packaging architecture: Kai-RE is the private source of truth and tools/build-plugin.py generates the derived public kai-re-plugin snapshot.
- `74bbecf9` — A single overnight session (Jul 7-8, 2026) in the Kai-RE repo that went from "deep-research on how Codex + Claude Code plugins work" to a shipped, dual-ecosystem plugin (insynq/kai-re-plugin) versioned across 9 releases (v0.1.0 to v1.7.1). The agent ran two deep-research workflows, then executed a pre-planned slice of the private Kai-RE agent into a public plugin: transforming flat skills into SKILL.md folders, bundling the AGENTS.md safety spine via SessionStart hooks, writing manifests/marketplace files for both ecosystems, and building a durable sync script (tools/build-plugin.py). Most hard-won knowledge came from live Codex testing feedback: the deep-research spec for Codex packaging was materially wrong (git-subdir source, repo-root layout, allowed hooks field) and had to be corrected against the authoritative Codex plugin-creator skill and hooks docs the user pasted in. The agent iteratively fixed Codex layout, skill frontmatter, openai.yaml UI metadata, install/naming ergonomics, hook trust-gating, and a plugin icon, bumping the version each time with the user acting as the Codex test harness. Durable learnings were continuously written back into agent-blueprint's investigation doc.

---

## Verified insights (all CONFIRMED)

### slicing-pattern

**The sliced product is pure Markdown playbooks with zero runtime dependency** _(src 295e81f3, high)_

The Kai-RE repo — the slice of the big kai-openclaw agent — contains only 19 Markdown files plus a .gitignore: AGENTS.md, CLAUDE.md, README.md, and skills/references/docs folders. No package.json, no JS/TS, no build step. The whole product is instructions a coding-agent host reads; Google access is provided by the host, not by repo code. Durable pattern: a sliced agent product is portable documentation, not an application, so it runs unchanged on any host (Claude Code or Codex) and carries no Node dependency.

### plugin-packaging

**Codex plugin chosen because it's the only low-effort path where the agent's 'hands' work without hosting OAuth** _(src 295e81f3, high)_

The core packaging decision hinges on Google access: a Codex plugin borrows each end-user's OWN connectors (the user connects, low build effort), whereas a Custom GPT or hosted app forces the builder to stand up and host OAuth for all users. This is why the plan doc landed on the Codex plugin format — it's the sole low-effort distribution path where a write-capable coordinator actually functions. Reusable framing for packaging any connector-dependent agent: distinguish who owns the OAuth.

**A Codex connector plugin is a thin wrapper around a connector ID, and install != authorize** _(src 295e81f3, high)_

Inspection of ~/.codex showed the installed Gmail plugin's manifest was literally just a connector pointer, and config.toml showed enabled=true. But 'enabled' only means the wrapper is in place; the actual Google OAuth consent is a separate interactive step that fires the first time the connector is used inside Codex. Anyone packaging or testing a Codex connector plugin must treat install-state and authorized-state as distinct, or they'll build on a false 'it's connected' read.

**Bundled Codex plugins are local-file tools; account-connected plugins are the real work** _(src 295e81f3, high)_

The session produced a clean mental model of the Codex plugin marketplace: the free/bundled plugins (Docs, PDF, Sheets, Slides, template-creator, browser) are all local-file tools that need no auth, while the moment a plugin needs the user's Google account (Gmail, and live Calendar/Drive/Sheets connectors) it becomes a separate curated/connector install with an OAuth step. When packaging Kai-RE, the connector-backed capabilities are the friction, not the file tools.

**Codex connectors are OAuth apps separate from plugins — a plugin/skill cannot enable one (detect→guide, not detect→install)** _(src 6a9aff6c, high)_

Verified against the real Codex install: connectors live as [apps.connector_…] OAuth entries in the app directory, entirely separate from plugins, and nothing in a shipped plugin or skill can switch one on or grant access. The durable design consequence: onboarding must DETECT what the user has connected and GUIDE them to Codex's app directory to flip on anything missing, then resume — it can never auto-enable. This is a hard host constraint any Codex-targeted agent package inherits.

**Codex double-locks writes (own approve prompt) but leaves reads ungated — reshapes both the trust pitch and automation** _(src 6a9aff6c, high)_

Codex itself gates every write tool (create/update/upload/delete across Drive and Calendar) behind an 'approve' prompt, while reads run silently with no prompt. This means an agent's own confirm-gate is doubled by the host for outward actions ('you'll get asked twice'), but read boundaries are purely behavioral promises. The same gate that creates trust is exactly what blocks unattended automation: an automated run with nobody at the keyboard can read/organize/draft but every outward action freezes at an unanswerable approve prompt.

### framework-win

**Safety-spine verification discipline transferred cleanly to a live product-testing decision** _(src 295e81f3, high)_

When advising how to test the connector write path, the agent invoked the project's own safety spine — 'a tool saying done is only a claim' — to insist the user verify writes in Google itself rather than trust the assistant's 'done'. It prescribed a tight isolate-and-verify test (create one event, write one row, then check the Google side). This is the framework's verification/'done vs true' discipline firing in a non-coding, product-strategy context, showing the pattern generalizes beyond code.

**Verify host capabilities against the real install before promising them — grounding repeatedly beat guessing** _(src 6a9aff6c, high)_

The 'done vs true' verification discipline paid off concretely: rather than assume connector behavior, the agent inspected the actual Codex config.toml, app-directory cache, and connector safety references. This surfaced the account-wide Drive scope, the write double-lock, and the true (mixed) connector landscape — and the spec carried explicit [VERIFY] flags for anything not yet checkable. It also caught its own error under user correction (see SharePoint), reinforcing that host claims must be grounded in the install, not memory.

### process-lesson

**Agent held the line against a false 'we bypassed the paywall' narrative** _(src 295e81f3, high)_

The user excitedly concluded they'd exploited Codex to get paid plugins for free. The agent refused to accept the flattering misread, established from the session record that it had only READ files and installed nothing, and explained the plugins were already enabled from a prior Codex session. This is grounding-over-agreement: correcting a user's exciting-but-wrong causal story rather than riding the enthusiasm. Class lesson: when a user attributes a state change to the current session, verify the session actually caused it.

**Agent flagged LLM CLI-command confabulation, then verified rather than trusting the prior transcript** _(src 295e81f3, high)_

A pasted Codex transcript claimed it had 'confirmed the exact install command' codex plugin add gmail@openai-curated. The agent explicitly distrusted this because LLMs routinely fabricate CLI syntax, checked ~/.codex/config.toml, and found the command HAD actually worked — then gave credit. The durable lesson is the reflex: treat another agent's claimed-verified CLI command as unverified until checked against real system state, in either direction (it may be right).

**A gitignored plan doc served as the cross-host, cross-session handoff artifact** _(src 295e81f3, high)_

The user ran out of Codex free-tier messages mid-work and switched to Claude Code; continuity was preserved because the prior session had written PLANS/kai-re-distribution-strategy.md (gitignored) into the shared repo. The Claude Code agent read it and picked up exactly where Codex left off, including the concrete next step. This validates the pattern of persisting strategy/state to an in-repo doc so work survives a host switch or a quota wall — the doc is the handoff, not the chat history.

**Agent held its own wrong claim only until the user grounded it — 'no OneDrive' was corrected to SharePoint/OneDrive existing** _(src 6a9aff6c, high)_

The agent initially reported 'no OneDrive and no Excel connector' because it had filtered the directory on the wrong names; the user corrected that Microsoft file access ships under the SharePoint name. The agent re-checked the directory, confirmed the user was right, and refined the finding (SharePoint exists but its blurb says 'search and pull' → likely read-only, must verify write). Lesson: local-catalog keyword filters can miss capabilities hiding under a different product name, and the human's domain knowledge is a load-bearing check on the agent's environment scan.

**User explicitly valued the agent's pushback against skipping a safety check** _(src 6a9aff6c, high)_

When the user proposed skipping the folder-existence check ('we know with 100% certainty the folder will not exist'), the agent argued for keeping it (find-or-create as cheap insurance against duplicate artifacts). The user conceded and thanked the agent for the pushback, revealing a working relationship where reasoned disagreement on correctness/safety is welcomed, not just compliance. The user's underlying driver was an ethical discomfort ('icky feeling') about acting without permission, which the agent then generalized into an 'ask before you probe, every connector' principle.

### gotcha

**Two different 'Google connectors' in ChatGPT have opposite account requirements** _(src 295e81f3, high)_

ChatGPT-land has a synced/indexed Drive connector that background-indexes Drive for search and REQUIRES a Workspace domain (personal gmail unsupported, Pro/Business/Enterprise), versus real-time app connectors (Gmail, Calendar, Contacts) that work on personal Gmail at the Plus ($20) tier. Kai-RE lives in the second bucket. Conflating the two produces wrong architecture conclusions about who can use the product. The floor is 'personal Gmail + $20 Plus', not free and not Workspace.

**Cross-host confusion is a recurring failure mode: same repo, different connector/auth mechanisms** _(src 295e81f3, high)_

Because the Kai-RE repo runs under both Claude Code and Codex, the user conflated the two hosts and asked the Claude Code agent to complete Codex's Gmail auth. The agent repeatedly disambiguated: Codex authorizes Gmail via a plugin/connector inside Codex; Claude Code authorizes via a claude.ai connector in claude.ai settings — totally separate mechanisms. Also, a non-interactive session cannot self-trigger any OAuth browser flow. Portable-across-hosts agents inherit this ambiguity; users need explicit host disambiguation before any auth step.

**The Google Drive connector is account-wide — a folder boundary is a promise, not a technical wall** _(src 6a9aff6c, high)_

The Codex Google Drive connector exposes account-wide tools (fullText search across the whole Drive, plus upload/update/create-folder/edit-spreadsheet) with zero folder scoping. So 'I only look in your Kai-RE folder' is a behavioral promise the agent keeps, not an enforced limit. The honesty rule that emerged: state the soft access-promise and the hard action-gate together, and never tell the user 'I can't see your other folders' when the connector actually can — 'that's the difference between a promise and a lie.' A drive.file-scoped connector WOULD be a real wall, so scope must be verified per host.

**Shipped .md skills are plaintext — a skill is not a security boundary, so IP leaks with the plugin** _(src 6a9aff6c, high)_

The crown-jewel logic of a sliced product (Kai-RE's contract-extraction and date logic) ships as readable markdown inside the distributed plugin; anyone who installs it can read it. The only real way to hide moat logic is to run it server-side behind an API the plugin calls, turning the plugin into a thin client. This is a structural limitation of the markdown-skill packaging model that any agent-blueprint-style product must confront before distributing.

**Codex memory is global, not per-project — a 'clean slate' for one project is a factory reset of everything** _(src 6a9aff6c, high)_

~/.codex/ holds memories_1.sqlite, goals_1.sqlite, logs, sessions, ambient-suggestions etc. as a single background extraction pipeline across ALL the user's work — there is no per-project partition to surgically delete. 'Clear the memory' therefore means resetting the entire Codex assistant to factory. The cheaper alternative for a clean test run is simply starting a brand-new Codex conversation (no carried context) rather than nuking global memory. auth.json, config.toml, installation_id, plugins/ and skills/ can be preserved through a wipe to stay logged in.

**A live Codex process re-creates SQLite WAL/-shm files instantly after deletion — the wipe isn't real until you quit and restart** _(src 6a9aff6c, high)_

After deleting the Codex state databases, tiny *-shm/*-wal orphan files reappeared within seconds because a running Codex process still had the old memory loaded in RAM and re-opened the databases. Deleting on-disk state while the app is running is not a true reset and can even flush stale state back to disk. The wipe only takes effect after fully quitting and relaunching the host app.

**'Never assume state you can cheaply confirm' — use find-or-create for real cloud write-state** _(src 6a9aff6c, high)_

Even on a supposedly-fresh run, a Kai-RE folder can already exist (a prior onboarding that died partway, a re-run on a touched account, a leftover test run, or a user-made folder). Assuming absence and blindly creating yields duplicate folders with split data. The pattern is a silent find-or-create: look for the folder by name, adopt if present, create if not — invisible to the user and fully inside the folder-only boundary promise. The agent pushed back on the user's instinct to skip the check.

### user-preference

**User thinks out loud and wants pushback, not agreement, on strategy** _(src 295e81f3, medium)_

The user narrated a rambling, half-formed plan ('Just thinking out loud here') and explicitly wanted it played back and untangled. He responded well to being corrected (the bypass myth, the Custom GPT dead end) and to being told which risk actually mattered. He is cost-sensitive (blocked by free-tier caps) and floated a positioning stance of targeting capable early adopters rather than the lowest-friction user. Durable signal: give this user honest disambiguation and decision tables, and name the real hinge risk explicitly.

### product-insight

**Write/action capability on personal-Plus connectors is the real product risk, not cost** _(src 295e81f3, high)_

Reporting suggested that on personal accounts the Google connectors are read/reference-strong but write/action-weak — reading email and referencing calendar works, but creating/editing events 'usually needs to be done directly inside Google Calendar.' Since Kai-RE's whole job is writing (calendar deadline events, Sheet rows, Drive filing), a personal-Plus account that can read but not write would gut the core loop. The agent flagged this as the thing to verify before committing the architecture — bigger than the free-vs-paid question already settled.

**The 'just share a Custom GPT' shortcut secretly requires hosting the entire OAuth backend** _(src 295e81f3, high)_

The tempting lowest-friction distribution idea — share a Custom GPT with Kai's logic — was adversarially checked and folded. A Custom GPT can carry the brain (instructions + knowledge files) but does NOT inherit the invoking user's Gmail/Calendar/Drive connectors; to give it real Google access the builder must build Actions with their own hosted OAuth app. Even built-in Drive attach for GPTs is read-only RAG. So the 'lighter' path drags in the entire hosted-app hard part. Verified against a real builder hitting the same wall in OpenAI's forum.

**No clean 'Microsoft 365' stack exists in Codex's directory — provider routing must be per-capability, not per-vendor** _(src 6a9aff6c, high)_

Auditing Codex's connector directory found Outlook Email, Outlook Calendar, Dropbox, Box, Smartsheet, Google Contacts, SharePoint/OneDrive and Teams — but no standalone Excel connector and no monolithic Microsoft file+spreadsheet store. Real-world non-Google stacks are therefore capability-mixed (e.g. Outlook mail/calendar + Dropbox files + Smartsheet or Google Sheets as the database). This concretely validated designing a per-capability provider_stack (email/calendar/files/database each routed to its own connector) rather than a per-vendor 'Microsoft adapter'.

---

## Completeness-critic report

Completeness-critic report. Findings, not a restatement of what was harvested.

---

## 1. Transcripts whose coverage admits skipping substance

**86d41ebd — TOTAL FAILURE, not a coverage caveat.** The harvester returned literally `coverage: probe B / insights: (empty)`. This is a real, substantive 197-line session (`/Users/chrisparsons/.claude/projects/-Users-chrisparsons-Documents-GitHub-Kai-RE/86d41ebd-dfaf-451c-9260-88137166756b.jsonl`) that opens with "Can a regular GPT edit its own knowledgebase .MD files yet?" — i.e. the self-editing-config / can-a-plugin-mutate-its-own-knowledge question that sits at the center of the config-vs-plugin-code and self-improvement themes. **One of seven sessions was never harvested at all.** Second pass must re-run this one.

**Systemic caveat across the other five: no harvester read a single primary repo artifact.** Every coverage note confesses the same substitution — insights drawn from the assistant's *in-transcript narration* of tool results, not the artifacts themselves:
- e7f87e78 never opened the 3 Loom `.srt` transcripts, AGENTS.md, or onboard.md — and flags a permanent hole: the install-walkthrough Loom is **mp4 with no transcript**, so the actual install demo is uncaptured.
- 74bbecf9 (the main build session) never opened the real plugin repo, `build-plugin.py`, or **the agent-blueprint investigation doc it says durable learnings were "continuously written back into"** — the single artifact whose entire purpose is framework intake was read by nobody.
- 295e81f3 / 6a9aff6c / cffcc660 each skipped raw tool_result bodies (connector-directory dumps, config.toml, per-Edit diffs).

Given this repo's own governing lesson (synthesis-amplification / verify-the-primary), a harvest built entirely on narration layers is the exact failure mode flagged in MEMORY. The second pass needs a primary-artifact reading pass, not more transcript reading.

## 2. Themes live in the repos that NO harvester surfaced

- **The schema-v2 data-modeling engineering body (TODO.md Phases 1–3).** Normalize-for-integrity / denormalize-for-read-speed, FK contact-ids with kept inline names, full-width single-batch row writes to kill "trailing-timestamp thrash," the **112-tool-call performance regression** that drove it, "avoid live VLOOKUP," persisting scaffolding IDs so Kai stops re-discovering folders/calendars every session. This is the largest hard-won product-engineering seam in the whole creation and it is nearly absent from all seven summaries (cffcc660 touches only "add Meta config fields").
- **The Meta-tab config-home pattern (distribution-strategy Decision 5 + TODO Decision 4):** all user config lives in the user's *own Google Sheet, outside the plugin*, so plugin updates can never overwrite it; `.md` files never hold user config. This is the reusable **"config vs plugin-code / update-safe surface"** distribution pattern — the single most directly framework-relevant idea in the corpus — and it appears only glancingly.
- **references/compliance.md — an entire domain-safety layer.** Fair-Housing floor, no-legal/tax-advice, no-guaranteed-outcomes, run as silent self-checks on all client-facing output. A substantive safety-spine *extension* beyond the four-rule spine every harvester fixated on. Unsurfaced.
- **references/calendar-gotchas.md as a durable-gotchas artifact.** The attendee-emails/double-display, secondary-calendar-needs-@-ID (the base64 rejection), and auto-Meet-link-on-holds gotchas are captured as a written reference — the reusable "write the gotcha down once so no future session rediscovers it" pattern. 74bbecf9 mentioned the base64 bug as an anecdote but missed that it became a doctrine artifact.
- **The IP-protection decision is OPEN, not closed (TODO 7a).** Two harvesters noted "a skill is not a security boundary," but none flagged that this leaves an *unresolved architectural fork*: the contract-extraction logic (the actual IP) can only be hidden by moving it server-side behind an API — a decision that reshapes the whole product and is explicitly deferred.
- **Provider-agnostic capability-abstraction design (TODO 7c) in full.** Google→Microsoft 365→Dropbox market expansion via a per-capability provider map in Meta, with the "codebase is half-ready because skills already speak vendor-neutral" reasoning. Harvesters caught "route by capability" as a slogan but not the market/architecture design.

## 3. Two concrete truths in the shipped artifacts nobody caught

- **The product has never been validated end-to-end.** TODO Phase 6 (RUN items) states the entire thing has only ever been exercised on a *closed* file: a real **open** deal end-to-end has never run, and **draft-email — the one compliance-governed outward skill — has never executed once.** The "what worked" story rests on an unrun product.
- **Release/versioning is not real, and a stale doc shipped.** Despite "12 releases," there are **zero git tags**; versions run v0.1.0→v0.1.7 then jump inexplicably to **1.7.1** — "releases" are just manifest bumps. And the shipped **plugin README still says "Keep your people organized in your Google Contacts,"** which the schema-v2 rework explicitly reversed (AGENTS.md now says people live in the Sheet's Contacts tab, *not* Google Contacts) — a live, unfixed instance of the very "slice leaves stale docs" bug cffcc660 described only in the abstract.

## Biggest unanswered question

**Did the plugin ever actually install and run clean, end-to-end, for a real user on the target host (Codex)?** The whole narrative is design → build → maker-driven live-test-feedback loop, but every captured transcript is authoring; the one artifact that would show a successful install→onboard→process-a-real-contract is precisely what's missing (the untranscribed install mp4 + the never-run Phase-6 validations). We have the maker's iteration story and no evidence of the outcome it was iterating toward.

## Where a second pass should look
1. **Re-harvest 86d41ebd** (path above) — the self-editing-knowledgebase session, wholly missed.
2. **Primary-artifact pass** reading the files directly, not narration: `Kai-RE/TODO.md`, `references/compliance.md`, `references/calendar-gotchas.md`, `references/sheets-schema.md`, full `AGENTS.md` safety spine, `PLANS/kai-re-distribution-strategy.md`, `PLANS/onboarding-experience-spec.md`, `tools/build-plugin.py`, and both repos' manifests/hooks. (Repos live at `/Users/chrisparsons/Documents/GitHub/Kai/Kai RE Slice/{Kai-RE,kai-re-plugin}` — not the paths in the brief.)
3. **The agent-blueprint investigation doc** that 74bbecf9 says durable learnings were written into — the intended framework-intake artifact, opened by no one (agent-blueprint recent commits reference a "Codex & Claude Code plugins" research report + hooks investigation).
4. **Transcribe the install-walkthrough Loom mp4** and read the three `.srt` files — the only record of the product actually being installed.