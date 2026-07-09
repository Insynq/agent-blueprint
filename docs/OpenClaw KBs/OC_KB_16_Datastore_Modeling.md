# OC KB 16 — Datastore Modeling for Tool-Call Reads

> **Provenance:** the patterns here are graduated from a downstream product (a realtor transaction-coordination agent on Sheets) and are **design-validated, not runtime-proven** — the source product had not yet cleared a live end-to-end run at graduation time. Treat the shapes as vetted design, and confirm the tool-call economics against your own runtime before optimizing hard.

## Pattern

When your datastore is a **tool-call-read store** — Google Sheets, Notion, Airtable, and their kind, read one API round-trip at a time rather than one indexed query at a time — the cost model inverts from what SQL-shaped intuition assumes. A JOIN is not free. Every foreign-key hop is a **separate read tool call**, with its own latency, its own token cost in the transcript, and its own failure surface. A schema that is textbook-normalized for a relational engine can be pathologically expensive here: the everyday "who's on this deal / what's the state of this record" read fans out into a dozen round-trips to reassemble one logical row.

This KB is the Data-layer (`OC_KB_10`) design discipline for that class of store. It reconciles read-speed denormalization with the framework's duplicated-fact ban (`CLAUDE.md` `## DO NOT`; `OC_KB_10` Data layer) — see **The one sanctioned exception** below, which is the load-bearing part of this file.

### Motivating case

The source product's first schema kept people in an **external store** — Google Contacts — not in the spreadsheet at all; the deal row carried inline party names, with only the client linked out to a Google Contact (the other parties had names only, no detail store). The **first** exercise of that schema took **112 tool calls** to organize a single deal. The dominant cost was **write-side thrash**: the wide deal row was written in trailing-column fragments, each patch preceded by layout probing and next-empty-row discovery and followed by a per-cell corrective read-back. Reaching out to the external contact store for party details added round-trips on top, and a few run-level inefficiencies (rediscovering document tooling, over-broad email search) piled on more. No single expensive JOIN explains the number — it was many small, avoidable round-trips, mostly on the *write* path.

The schema-v2 redesign is where the modeling rules below come from — they are the **fix**, not the naive culprit. v2 pulled people into an in-sheet `Contacts` tab (an in-store canonical source), paired each party FK with an inline hot-field name, persisted the scaffolding IDs, and — carrying most of the weight — replaced the fragmentary patches with a single full-width batch write plus one consolidated read-back. The write discipline (`OC_KB_11` §3a) did the bulk of the collapse from 112 toward a handful; this KB's modeling rules (in-store canonical + hot fields + lazy FKs) keep the everyday "who's on this deal" read on a single tab so it stays cheap. Read the two together: the write rules and the modeling rules fixed this case jointly.

Note the framing precisely: 112 calls was a **first-run baseline inefficiency, not a regression**. No faster prior version existed to degrade from; the git record shows only `Initial` → `Schema v2`. The lesson is therefore *stronger* than "watch for regressions" — it is **design your read/write discipline up front**, because a naive layout is expensive on its very first run, before any drift.

## The four rules

### 1. The tool round-trip is the cost unit, not the byte

Optimize for the number of read/write tool calls, not for storage. A wide, partly-blank row read in one round-trip beats a compact, fully-normalized row that costs six round-trips to reassemble. Bytes are cheap in these stores; round-trips are the scarce resource — they cost latency, transcript tokens, and each is an independent failure point. Count the tool calls the *common* read path will take, and design to minimize that count first.

### 2. Denormalize hot fields to collapse everyday reads

For the fields the common read needs every time, store an **inline denormalized copy** on the row that read targets — a *hot field* — so the everyday view resolves in a single tab read. In the source product each party appears twice on the deal row: an inline name (`client_name`, `coop_agent_name`, `lender_name`, `title_company`, `inspector`…) for the everyday "who's on this deal" read, alongside its FK for details. The everyday read never leaves the one tab. (This is the rule that abuts existing canon — read rule 3 and **The one sanctioned exception** before implementing it.)

### 3. Keep FKs for integrity, resolve lazily

Denormalizing the hot field does **not** mean deleting the foreign key. Keep a deduped canonical record (one row per real person / entity, reused across every deal) and keep the FK (`client_contact_id` → `Contacts.contact_id`) alongside the hot field. Resolve the FK **lazily** — hop to the canonical tab only when the read genuinely needs the *details* (phone, email, company) that the hot field doesn't carry. The hot field answers "who," the FK answers "everything about them," and you only pay the second round-trip when you actually need the second answer.

### 4. Never delegate joins to live spreadsheet formulas

Do **not** implement the join with in-cell formulas — `VLOOKUP`, `XLOOKUP`, `QUERY`, cross-sheet references. They are fragile (they break on row insertion, renamed tabs, and locale quirks), and — the point that matters here — **reading a computed cell does not save a read**. The round-trip to fetch the resolved cell is the same round-trip you were trying to avoid; you have added formula fragility for zero round-trip savings. Store plain values and plain IDs; do the resolution in the agent's logic, on the round-trips you actually choose to spend.

## The one sanctioned exception (reconciling rules 2–3 with the duplicated-fact ban)

Rule 2 stores a party's name twice — once inline as the hot field, once in the canonical tab. The framework's `## DO NOT` (`CLAUDE.md`) and `OC_KB_10`'s Data layer ban **"the same fact in two stores with no canonical source"** — a facts-diverge-silently trap. Rules 2–3 are **not** a license to break that ban. They are the one shape the ban explicitly permits, and the difference is precise:

- **Banned (the trap):** an *unnamed second copy* — the same fact living in two places with no declared owner, each independently editable, drifting apart silently until the agent defends a stale copy against the live system.
- **Sanctioned (rules 2–3):** a **named denormalized cache over a single canonical source.** Every condition must hold:
  1. **The cache names its owner.** The hot field is documented as a cache *of* a specific canonical location (in the source product, the `Contacts` tab is the single source of truth for people; the inline `client_name` is a cache of it). The schema reference states which is canonical and which is the cache — there is never ambiguity about which one wins.
  2. **Co-written with its own row, copied from canonical, never hand-edited.** The hot field is written in the *same batch that writes the row it lives on* (per-row atomicity), and its value is always copied **from** the canonical source at that write — never typed in independently, never edited in place afterward. Be precise about what this does *not* claim: it is **not** "one batch writes both copies." For an entity reused across deals, the canonical row was written long before, on its own row; a later deal's hot field is written in that deal's batch. What per-row co-write guarantees is only that *this* row's hot field matched the canonical value **at the moment this row was written** — nothing about later.
  3. **A canonical change fans out — you owe the sweep.** Because the hot field is a point-in-time copy, editing the canonical record (a person renames, a company changes) leaves every previously-written hot field stale. That staleness is your obligation to handle, one of two honest ways: either a canonical edit **triggers a sweep that rewrites the dependent hot fields**, or you accept the staleness **explicitly, in the schema doc, as display-only** — the hot field then answers "who was on this deal at the time," and the FK-resolved canonical record is what wins for anything that must be current. What you may **not** do is let the hot field drift silently and then treat it as authoritative.

If any of the three fails, you are back in the banned trap. An inline copy nobody owns, one a second code path can hand-edit, or one whose canonical source can change with no sweep and no display-only declaration — each is the anti-pattern. Naming the owner, copying from canonical on every write, and owning the fan-out are what make rules 2–3 safe rather than a violation.

**The trap firing (evidence the ban is right):** in the source product, schema-v2 removed a legacy dependency and made the in-sheet `Contacts` tab authoritative — but a human-facing README kept an old "keep your people in Google Contacts" line. The operational spine was fixed and propagated; the unowned second copy on the doc surface rotted independently. That is the duplicated-fact-diverges trap firing exactly as the DO-NOT predicts — and precisely why a denormalized cache must **name its canonical owner** and be written by one path. The distinction between rules 2–3 and that bug is the whole point of this section.

**Cross-refs for the write mechanics:** the "co-written with its own row" half (condition 2) is enforced by wide-row write discipline — see `OC_KB_11` "Round-trip verification" (its write-verifiability subsection, *3a. Make the write verifiable and the read-back cheap*): full-width single-batch write (valid only where the agent is the row's sole writer — §3a gives the human-co-edited-surface branches), volatile fields pinned to fixed front columns, one consolidated read-back. That discipline is what makes per-row co-write mechanically true instead of aspirational — the row and its hot field land in one batch, never in fragments that could leave the field half-written or copied from a stale value.

## Persist scaffolding IDs at first-run (a round-trip-savings corollary)

The same round-trip-is-the-cost-unit logic applies to the **cloud artifacts the agent creates** — the Drive folder, the calendars, the spreadsheet itself. At first-run setup, after creating each artifact, **capture its real ID and persist it to the update-safe config surface** (the user-state store that survives updates — see `OC_KB_04` cross-reference-patterns and the plugin-distribution config-home rule). Standard keys in the source product: the root-folder ID, per-calendar IDs, and per-artifact IDs written back onto the owning row as they are created.

Two payoffs, both concrete:
- **Fewer tool calls.** A later session jumps straight to the resource by ID instead of re-searching by name every session — search-by-name is a round-trip (or several) that a stored pointer eliminates.
- **Idempotency / duplicate-name safety.** Re-discovery by name is ambiguous the moment two artifacts share a name, and risks the agent *re-creating* a resource it already has. A stored ID is unambiguous and makes setup safely re-runnable. (This is the idempotency story in `OC_KB_11` / `OC_KB_10` Action layer, applied to setup.)

Store the **ID pointer**, never a copy of the artifact's contents — the pointer to where the truth lives is the sanctioned thing to persist (`OC_KB_04` §Cross-reference patterns, "pointer to where the truth lives"); the contents are fetched fresh. Persisting the pointer is the same rule as rule 3's lazy FK resolution: keep the addressable key, resolve on demand.

## Anti-patterns

- **Normalizing for a relational engine you don't have.** Textbook third-normal-form on a Sheets/Notion/Airtable store makes the common read a round-trip storm. → fix: rules 1–3 — denormalize the hot read path, keep FKs for the cold detail path.
- **An unnamed second copy.** A hot field that isn't documented as a cache of a named canonical source, or that a second path can edit independently. → fix: the three conditions under **The one sanctioned exception**; if you can't meet all three, don't denormalize that field.
- **Live formulas as the join.** `VLOOKUP`/`XLOOKUP`/`QUERY` to "avoid a read" — they add fragility and save no round-trip. → fix: rule 4, plain values resolved in agent logic.
- **Re-discovering scaffolding by name every session.** Searching for the folder/calendar/sheet by name on every run — extra round-trips plus duplicate-name ambiguity and accidental re-creation. → fix: persist the IDs at first-run.
- **Partial-patch writes on a wide row.** Patching a wide row in column fragments, each needing a corrective read-back (the trailing-timestamp thrash behind the 112-call run). → fix: `OC_KB_11` "Round-trip verification" §3a — one full-width batch write (sole-writer surfaces; §3a gives the co-edited branch), volatile fields front, one consolidated read-back.

## Cross-references

- `OC_KB_10` — Data layer: this KB is the design discipline for the Data layer on tool-call-read stores; the "same fact in two stores, no canonical source" Data-layer failure is the trap that **The one sanctioned exception** navigates.
- `OC_KB_11` — "Round-trip verification" (§3a write-verifiability): the wide-row write mechanics that make per-row co-write real (condition 2), and the write-side discipline that did most of the collapse from the 112-call run; idempotency for the persist-IDs corollary.
- `OC_KB_04` — Bootstrap-file cross-reference patterns: the "pointer to where the truth lives" rule the persisted-ID pattern extends; SCHEMA.md is where the canonical-vs-cache statement is documented.
- `OC_KB_03` — MCP tools: the round-trip is a tool call; the cost model here is the tool-surface cost model.
- `CLAUDE.md` `## DO NOT` — the duplicated-fact ban this KB's denormalization is the sanctioned exception to (see the clarifying line there).

[VERIFY BEFORE SHIPPING] The round-trip-is-the-cost-unit economics assume a store read one API call at a time (Sheets/Notion/Airtable-class). If your store supports server-side queries/joins that return an assembled result in one call, re-run the tool-call count for *your* store before denormalizing — the math that justifies the hot field changes. These patterns are design-validated from a downstream product that had not yet cleared a live end-to-end run; confirm the call counts on your own runtime.
