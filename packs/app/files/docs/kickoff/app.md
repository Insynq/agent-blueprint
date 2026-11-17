# Kickoff questions: app pack

One round, sent as one numbered message after the core rounds. Skip what the user has already answered and reword the rest around what you know. Read `docs/APP_MONOREPO.md` first, and `docs/DEMO_ENVIRONMENT.md` before the demo questions; several questions only make sense against them.

If the user has no opinion on stack, recommend the one this pack's skills are written for (Supabase, a React web client, Expo for mobile) and say that the layout and rules hold for any other.

## Questions

**Surfaces**

1. Which client surfaces will exist: web, mobile (iOS, Android or both), a staff or admin console? Which are in the first version, and which are planned?
2. Who uses each surface, and for what? If the same person uses two, what do they do on each?
3. Is there, or will there be, a marketing site? If so, where does it live? (It stays in its own repository; everything else lives here.)

**People and permissions**

4. What roles exist, and what can each see and do that the others cannot? Is there a hierarchy?
5. Is the data divided by tenant (organisation, team, account)? Can a person belong to more than one?
6. Will staff need to act as a user, or see data across tenants?

**Data**

7. What are the core things the product manages? Five to ten nouns, each with a line on what it is and what it belongs to.
8. Which data is sensitive: contact details, identity documents, health or financial data, anything about children, anything under a regulation you know applies?
9. Does money move? For each path: who pays whom, through which provider, who bears the fee, and what must never happen (a double charge, a payout before delivery).
10. Does the product send email, text or push to real people? Which events trigger it?

**Environments and release**

11. Which environments will exist? Local and production always. A demo environment is optional: a hosted copy on its own database, with invented data and a nightly reset, that you can open from any computer or a phone to test and review before anything reaches production. It costs a day or two to set up and a little upkeep. Do you want one, now or later, and does one exist yet?
12. Where is each surface hosted, and how does a change reach users on each: a build on merge, a store release, over-the-air updates?
13. If there is a mobile client: how old a build do you intend to support? That decides how long the backend must keep old behaviour working.
14. Do preview deploys exist, and which backend do they talk to?

**Outside services**

15. Which third-party services does it depend on at launch (sign-in, payments, email, storage, maps, anything else)? For each: is it replaceable, and is there a test mode?
16. Which of those are places where a failure would cost money or reach a real person? Those are service boundaries, and each gets a smoke that only a run against the live service closes.

**Demo environment** (only if the answer to 11 is yes or later)

17. How will demo be hosted: a second hosting project and a second database project on the same providers as production? Under which domain? Who pays for the database project, and is the smallest paid size acceptable if the free one proves too small?
18. Should demo show work before it is merged (a long-lived `demo` branch that branches under review are merged into), or only what is already on the default branch? The first is the default when merging deploys production.
19. For each third party in question 15: on demo, is it in test mode on an account that is only demo's, captured (email, text, push stored for reading and never sent), or switched off? Anything with no test mode and no way to capture it is switched off on demo.
20. What should the nightly reset put back, and when? Which accounts and situations must exist every morning (one per role, plus the states worth testing), what content edited on demo should survive, and at what hour in your time zone is nobody using it?

## Where the answers go

Edit the checked-in files in place, marker by marker, as the core skill describes.

- **`CLAUDE.md`, the App pack section** (between the `pack:app` markers): replace each `[TODO]` there. Client surfaces is the list of names specs must give a verdict for, so use short, stable names. Directories, the types file and the environments take one line each. On the demo line write `none` if there is no demo environment, or its URL, database reference, branch, reset hour and `not armed` (it is armed only after the first reset has been watched). If there is one client, write one name; the spec check then accepts the single `all` line.
- **`CLAUDE.md`, Commands:** a typecheck, test and lint command for each client, run from that client's directory, plus the database commands. Try each before writing it down. Under Release, name `/deploy` and the per-surface release commands.
- **`CLAUDE.md`, Live invariants and Do not:** one line for each money path's "must never happen" from question 9, and for anything in question 8 that is regulated.
- **`docs/APP_CONCEPT.md`:** surfaces and who uses each (1, 2), under its users section.
- **`docs/SCOPE.md`:** surfaces and roles deferred from the first version (1, 4); unknowns from any question answered "not sure".
- **`docs/KB_1_Architecture.md`:** roles and the tenancy model (4, 5, 6), core entities (7), data sensitivity (8), money paths (9), hosting and release per surface (12, 13), third-party services with the boundary ones marked (15, 16). Record each choice made here in the decisions table.
- **`docs/smoke-tests-pending.md`:** one `live-required` row per service boundary from question 16, pending. A demo environment does not close these; it rehearses them.
- **`docs/demo-logins.md`:** if a demo is wanted, the accounts from question 20, one per role and situation, and the reset hour. Leave the file untouched otherwise.
- **`scripts/demo/environments.json`:** the demo and production references, once both projects exist. Do not invent them.
- **`docs/prod-action-safety-map.md`:** if question 14 shows a preview or demo that reaches production services, note that at the top and leave the tables for the first feature that adds a control. Otherwise state that no non-production environment reaches production. Record the answers to question 19 as what demo is meant to reach; the probes are run when demo is built.
- **Nested `CLAUDE.md` files:** do not create them now. Create `web/CLAUDE.md` or `mobile/CLAUDE.md` when that client's directory exists and has a rule of its own.

Leave `docs/PARITY_LEDGER.md` empty. Rows are added by specs.

## Follow up, do not write down

- If the user wants web and mobile in separate repositories, walk through "Why one repository" in `docs/APP_MONOREPO.md` and ask what their case has that it does not cover. Record whichever way they decide, with the reasoning.
- If money moves and there is no demo environment, say that the first phase should create one before any payment code is written.
- If a demo is wanted, setting it up is its own piece of work with its own go: the checklist in `docs/DEMO_ENVIRONMENT.md`. Kickoff records the decisions and creates nothing.
- If the user wants demo to share anything with production (a database, a payment account, an email sender), say plainly that it is then not a demo environment, and that the safety map has to be filled in before anyone clicks through it.
- If question 6 is yes, flag it for the first spec's security lens: acting as a user makes every action in the safety map reachable by staff.
