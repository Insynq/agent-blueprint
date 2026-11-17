> Superseded by `docs/patterns/DEV_DASHBOARD.md`. Kept as the original intake note.

# OC KB 15 — Dev Dashboard Pattern: single-file async PM↔agent channel

> **Status: intake only, not wired up.** No skill, command, or workflow in this repo generates
> or references a dev dashboard yet. This KB documents the pattern (proven in the Tally-App
> project) for future adoption. Adopting it in a project means running its Step 0 analysis and
> build order below inside that project — not modifying this framework repo.

## Pattern

A **single, self-contained HTML file** that is the human PM's window into the development
side of a project, and — critically — a **two-way async channel between the PM and agents**.

- **Agents write the left-hand side:** derived status (phases, features, routes, surfaces,
  test ledgers, tech debt) rendered from repo docs. The dashboard is a *derived artifact*;
  it is refreshed whenever source docs change materially.
- **The PM writes the right-hand side:** per-item statuses, notes, screenshots, findings
  (bugs/improvements), and ratings — captured in a browser, saved to a JSON sidecar file.
- **Agents then read the PM's side back** in later sessions (or via automation) and act on it.

**The core value is the round trip.** A static status page is worth little; the payoff is a
PM who can annotate real screens on a phone at midnight and an agent that picks it up.

**Hard constraints that make it work:**
- One file. No build, no npm, no framework, no CDN. Opens over `file://` or a tiny local server.
- Gitignored (it embeds project-private status), as is its state sidecar.
- Plain ES5-style JS (`var`, `function`) — no transpiling, no modules.

---

## Step 0 — Decide what it should track (DO THIS FIRST)

Do not scaffold blindly. Inspect the target project and pick **the highest-value async
channel**, i.e. whatever the human currently has no good place to record. Read, in order:

1. `CLAUDE.md` / `README` → phases, workstreams, current focus
2. The router / route config → the app's real surfaces
3. Any test ledger, punch list, or backlog doc
4. `git log --oneline -40` → what actually moves

Then choose **3–7 page sections**. Typical high-value set (adapt to the project):

| Page | Source of truth | Tracked item `data-kind` |
|---|---|---|
| Status & phase | CLAUDE.md phase block | *(untracked, display only)* |
| Features | CLAUDE.md workstreams | *(display)* |
| Surfaces & routes | router config | `surface`, `route` |
| Workflows | flow docs / code reading | `workflow` |
| Test/smoke ledger | ledger doc | `smoke` |
| Tech debt / parking lot | debt doc | `debt` |
| Daily log | git history | *(JSON payload)* |

**Rule:** a section earns its place only if the PM would *act* on it. Prefer fewer, deeper pages.

---

## File skeleton (exact block order)

```
<!DOCTYPE html>
<!-- ═══ MAINTENANCE CONTRACT (for agents) ═══
     Section → source-of-truth table, plus the rules below. Keep this at the top. -->
<html><head><meta charset + viewport><title>
<style> … design tokens + all component CSS … </style>        ← ~450 lines
</head><body>
  <aside class="sidebar"> brand + snapshot date + nav groups </aside>
  <main>
    <section class="page" id="status">…</section>             ← one per page
    <section class="page" id="surfaces">…</section>
    …
  </main>

  <script id="logData"  type="application/json">[ … ]</script>  ← data payloads
  <script id="ctxData"  type="application/json">{ … }</script>
  <script id="inspoData" type="application/json">{ … }</script>

  <script> … all behavior … </script>                          ← ~1,500 lines, IIFE-ish
</body></html>
```

**Why JSON payloads are separate `<script type="application/json">` blocks:** agents rewrite
them programmatically (parse → mutate → re-serialize) without touching executable code.
**Escape `</` as `<\/` inside them** or the parser closes the script tag early.

---

## Navigation & page model

Hash-routed, no library:

```html
<a class="nl" href="#surfaces">Surfaces &amp; Routes</a>
<section class="page" id="surfaces"> … </section>
```
```css
section.page      { display: none; }
section.page.on   { display: block; animation: riseIn .35s cubic-bezier(.22,.7,.3,1) both; }
```
```js
function route() {
  var id = (location.hash || '#status').slice(1);
  document.querySelectorAll('section.page').forEach(function (s) { s.classList.toggle('on', s.id === id); });
  document.querySelectorAll('.nl').forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + id); });
}
window.addEventListener('hashchange', route); route();
```

Group nav links under `.navgroup > .gh` headers. Add a sticky secondary sub-nav on dense
pages, built at load by iterating the page's tracked cards.

---

## The tracked-item contract (the load-bearing idea)

Any element becomes PM-annotatable by adding `data-trk`, inside a container declaring `data-kind`:

```html
<ul data-kind="debt">
  <li data-trk="dbt-stale-sessions">Playwright sessions wiped by every db reset</li>
</ul>
```

At load, `decorateAll()` walks `[data-trk]` and **injects controls into every one**: a status
`<select>` (options vary by kind), a note field, and — for evidence-bearing kinds — a
screenshot/finding UI. Markup stays clean; behavior is centralized.

```js
var STATUS_SETS = {
  surface: [['', '— status —'], ['in-progress','In progress'], ['done','Done'], ['blocked','Blocked']],
  smoke:   [['', '— open —'],   ['passed','Passed'], ['blocked','Blocked'], ['parked','Parked']],
  debt:    [['', '— open —'],   ['in-progress','In progress'], ['addressed','Addressed'], ['stale','Stale']],
  route:   [['', '— status —'], ['reviewed','Reviewed'], ['in-progress','In progress'], ['needs-work','Needs work']],
  workflow:[['', '— status —'], ['good','Works well'], ['in-progress','Reviewing'], ['needs-work','Needs rework']]
};

function decorate(el, rebuild) {
  var id   = el.getAttribute('data-trk');
  var kind = (el.closest('[data-kind]') || {}).getAttribute
             ? el.closest('[data-kind]').getAttribute('data-kind') : 'debt';
  if (el.querySelector('.trk-bar') && !rebuild) return;   // idempotent
  // … build select + note + evidence UI, wire to setItem(id, …) …
}
function decorateAll(rebuild) { document.querySelectorAll('[data-trk]').forEach(function (el) { decorate(el, rebuild); }); }
```

> **`data-trk` IDs are primary keys. Never rename or renumber them** — the PM's saved state
> keys off them. Add new IDs for new items; leave orphaned state entries alone (harmless).

---

## State & persistence

**Shape** — one object, keyed by `data-trk` id:

```js
var state = {
  version: 1,
  lastSaved: '2026-08-24T…Z',
  items: {
    'srf-order-services': {
      label: 'Order services',            // human label, for agent-side readability
      status: 'in-progress',
      note: 'free text',                  // or notes: {role: text}
      updated: '…Z',
      shots:    [{ file, label, note, role, added }],
      findings: [{ fid, type:'bug'|'improvement', text, shot, pin:{x,y},
                   stage, stageAt, done, added }]
    }
  }
};
```

**Read/write:**

```js
function getItem(id) { return state.items[id] || {}; }
function setItem(id, patch) {
  var it = state.items[id] || {};
  Object.keys(patch).forEach(function (k) { patch[k] === undefined ? delete it[k] : it[k] = patch[k]; });
  it.updated = new Date().toISOString();
  var empty = !it.status && !it.note && !(it.shots||[]).length && !(it.findings||[]).length;
  if (empty) delete state.items[id]; else state.items[id] = it;   // keeps the file clean
  save();
}
```

**Save — three tiers, in this order:**

```js
var SERVED = location.protocol === 'http:' || location.protocol === 'https:';
function save() {
  state.lastSaved = new Date().toISOString();
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {}   // 1. always
  clearTimeout(saveTimer);
  saveTimer = setTimeout(SERVED ? postState : writeFile, 600);               // 2. debounced
  renderProgress();
}
```
- **localStorage** — instant, never loses work, survives a dead server.
- **`POST /state`** — served mode (preferred; works on phones, no permission prompts).
- **File System Access API** — `file://` fallback; requires one directory-picker grant.

Show a live save-status chip (`ok` / `warn`) so the PM always knows whether it persisted.

**Two-writer merge (required if agents also write the state file).** On load in served mode,
`GET /state` and fold the file into local state before the first write, or an agent's
overnight additions get clobbered:

```js
// file-only items appended; agent-added shots/findings unioned by id;
// PM-authored note/status ALWAYS win locally.
```

---

## Serving it (~80 lines of Python, no deps)

```python
# dashboard-server.local.py — GET /  → the HTML
#                              GET /state → the JSON sidecar
#                              POST /state → overwrite sidecar (atomic: tmp + os.replace)
#                              POST /shot?name=… → save an uploaded screenshot
#                              GET  /screenshots/… → serve images
python3 dashboard-server.local.py   # http://<lan-ip>:8790
```

Run it under `launchd`/`systemd` with keep-alive so it is always up. Served mode is what makes
phone review work. **One writer at a time** — never open a `file://` copy and a served tab together.

> Gotcha of record: `crontab <file>` hangs forever in headless macOS sessions (unanswerable TCC
> prompt). Use `launchd` for scheduling. (Cross-reference `OC_KB_06`.)

---

## Styling

**Design tokens on `:root`** (~28 custom properties), then every component references them —
this is what keeps a 3,700-line file visually coherent:

```css
:root {
  --surface-0: #0b0f16; --surface-1: #121826; --surface-2: #1a2233; --surface-inset: #0e1420;
  --border: #223047; --border-strong: #2f4162; --border-faint: #1a2434;
  --text-1: #e8eefc; --text-2: #b3c0d6; --text-3: #7d8ba5;
  --good: #38d39f; --warning: #f5b301; --serious: #f97316; --critical: #ef4444; --neutral: #64748b;
  --accent: #4c8dff; --accent-dim: #2a4d8f;
  --tint-good: rgba(56,211,159,.12); /* …one tint per status… */
  --shadow-card: 0 1px 3px rgba(0,0,0,.4); --focus-ring: 0 0 0 3px rgba(76,141,255,.35);
}
```

Rules: dark theme by default (PMs review at night); status colors used *only* for status;
one card component reused everywhere; `@media (max-width: 720px)` for phone layout —
**stack, never shrink** (a side-by-side split becomes an unreadable sliver on a phone).

---

## The agent-facing maintenance contract

Put this as an HTML comment at the top of the file, filled in for the project:

1. **Section → source-of-truth table** (which repo doc feeds which page).
2. **Refresh triggers** — at ship, phase boundaries, ledger burn-downs. Also update the
   snapshot date and KPI numbers.
3. **Never rename/renumber `data-trk` IDs.**
4. **State file is PM-owned.** Agent writes must be *additive* (append shots/findings/derived
   fields). Never rewrite PM note text or statuses.
5. **A PM's status mark is a claim, not evidence.** If the project has a truth-gate (e.g. a
   test ledger), the dashboard never bypasses it.
6. **Escape `</` as `<\/`** in JSON payloads.

**Automation loop (optional, high value):**
- A session-start hook diffs the state file against a cursor copy (`…-cursor.local.json`),
  digests what's new, acts on it, then copies state → cursor to mark it processed.
- A scheduled job breaks new findings into small jobs, works them, writes replies back into a
  thread payload the dashboard renders. Give findings a **single `stage` field** with a
  timestamp (`stageAt`); "needs review" is *derived* (thread reply newer than `stageAt`),
  never stored — that keeps the overnight process from writing to the PM's file.

---

## Evidence model (screenshots, findings, pins) — build if the PM reviews UI

Highest-value extension. In dependency order:

1. **Screenshots per item** — paste or upload; the file is copied into a screenshots dir and
   recorded in `shots[]`. Each shot carries its own label + note.
2. **Findings entered *on* a screenshot** — `{type, text, shot}`. Typed bug/improvement, with
   a stage. Findings without a shot still render in a separate legacy list.
3. **Reference images** (design inspiration, competitor screens) attached per-item, and
   optionally per-*screen* via a `shot` field on each ref — mirror however findings attach.
4. **A lightbox** with: scoped + looping galleries (only the screens for that item), swipe,
   pinch-zoom **on the image only** (`touch-action: none`; `transform-origin: 0 0`; the point
   under the fingers' midpoint stays glued to it), persistent per-image zoom/pan, double-tap
   reset, and a context pill naming the screen.
5. **Pin comments** — click-to-place markers. Store `pin:{x,y}` as **percentages** so they
   survive any zoom/resize. Render numbered dots in an overlay layer that inherits the image's
   transform. Ship a companion script that, given a finding id, draws a crosshair on a copy of
   the screenshot and emits a centered crop — that is how an agent *sees* what the PM meant.

> Mirror rule: any edit made in the lightbox must write through the same setter the list view
> uses **and** refresh the list-view inputs, or the two views silently diverge.

---

## Validation before declaring done (mandatory)

A single HTML file has no compiler. Run all four:

```bash
# 1. inline JS parses
python3 - <<'PY'
import re; html=open('DEV-DASHBOARD.local.html').read()
s=re.findall(r'<script(?![^>]*(?:src=|application/json))[^>]*>(.*?)</script>', html, re.S)
open('/tmp/inline.js','w').write('\n;\n'.join(x.replace('<\\/','</') for x in s))
PY
node --check /tmp/inline.js

# 2. every JSON payload parses  → json.loads on each <script type="application/json">
# 3. render check: open the served URL in a browser, assert 0 console errors
#    and that every referenced image returns 200
# 4. interaction check: set a status / add a finding, confirm it lands in the state file,
#    then REMOVE the test data and re-sync the cursor file
```

Never report the dashboard as working on the strength of a syntax check alone — it is a UI.

---

## Build order (follow exactly, in the adopting project)

1. Step 0 analysis → choose pages + `data-kind`s. **Confirm the list with the human.**
2. Skeleton: contract comment, tokens, sidebar, empty pages, hash router.
3. Populate pages from repo docs; add `data-trk` to every trackable row.
4. State layer: `getItem`/`setItem`/`save` + localStorage + save-status chip.
5. `decorate()` injection + `STATUS_SETS` + progress KPIs.
6. Server + launchd; switch to served mode; add two-writer merge.
7. Evidence model (above) if the PM reviews UI.
8. Automation loop (above) if async agent work is wanted.
9. Validate (above). Gitignore the HTML, the state file, the cursor, and the screenshots dir.

**Anti-patterns:** frameworks or a build step; storing derived data in the state file;
renaming `data-trk` IDs; agents editing PM prose; a phone layout that shrinks instead of
stacking; declaring done without a browser render check.

**Source:** proven in the Tally-App project as `DEV-DASHBOARD.local.html` (3,720 lines / 385KB,
no build step, no dependencies, no framework). Intake date: 2026-08-25.
