# Production action safety map

Which controls in the interface spend real money, contact real people, or cannot be undone. Fill this in as soon as any environment other than production can reach production services: a preview deploy that inherits production settings, a demo that shares a payment account, a local client pointed at the production backend. Read it before clicking through a review on any such environment.

If no non-production environment can reach production, say so in the first section, with how you checked, and leave the tables empty.

> Derived: [TODO: date, branch, and how: which server functions, migrations and client code were read].
> Line references move. Re-derive before trusting an entry, and whenever a payment, messaging or account-deletion path changes.

## How to derive it

Start from the effect and work back to the click. List every server-side path that charges, refunds, creates a payment account, sends email, text or push, calls a third party that acts on a real person, or deletes or permanently reveals something. For each, trace back through the client code to the control a user presses, on every client surface. A map written from the interface forward misses the actions that fire as side effects of something innocent, such as an email sent by a trigger when a profile is saved.

## What each environment can reach

Probe this; do not infer it from configuration. For each row, record what you ran and what came back.

| Environment | Database | Payments | Outbound messages | Evidence |
|---|---|---|---|---|
| local | | | | |
| preview | | | | |
| demo | | | | |

If something is unreachable only by accident (a cross-origin rule that happens to block a call), say that it is an accident. It will not survive the next configuration change.

## Demo environment

Only if the project has one (`docs/DEMO_ENVIRONMENT.md`). A demo environment is meant to reach nothing real, so its section is a list of proofs, not a list of dangers. Fill in the observed column from probes run on demo, and run them again after any change to demo's secrets, hosting settings or stored configuration. A row that cannot be proven is treated as reaching production, and its controls go in the tables below with "also on demo" beside them.

| What must be true on demo | Probe | Observed (date) |
|---|---|---|
| The interface talks to the demo database and no other | Read the built bundle or the network tab for the API host | |
| No production key, URL or reference in hosting settings, function secrets, CI secrets or stored configuration | List the names; search values for the production reference without printing them | |
| Server-side jobs and functions call demo's own URLs | The request log or response headers of the last day's outbound calls | |
| Payments are in test mode on demo's own account | A test-card payment appears in the sandbox and nowhere else | |
| Payment webhooks for that account arrive at demo | A sandbox event is logged by demo's webhook handler | |
| Email is captured, not sent, and demo holds no provider key | Trigger one message to an address you control; it appears in the capture store and not in the inbox | |
| Text and push are captured or off | The same, per channel | |
| Seed data holds no real contact details, including cc, bcc and reply-to defaults | Search the seeded rows and one captured message's headers | |
| Analytics and error reporting are off or tagged as demo | Load a page; check what was sent | |
| The destructive scripts refuse production | `node scripts/demo/guard.mjs --target <production reference>` exits 3 | |

Controls on demo that are safe only because of a row above (a Pay button, an Invite button) need no entry in the tables below while every row holds.

## The ones that surprise people

[TODO: the three to five controls whose effect is much larger than their label suggests. Put them first, because this is the part people read.]

## 1. Money

| Control (surface, screen, label) | What it does | Confirmation shown | Reversible |
|---|---|---|---|

## 2. Messages to real people

| Control (surface, screen, label) | Who receives it | Channel |
|---|---|---|

## 3. Irreversible, no money

| Control (surface, screen, label) | Why it cannot be undone |
|---|---|

## 4. Safe to click

Controls that look dangerous and are not, with the reason. This section keeps reviewers from avoiding half the product.

| Control | Why it is safe |
|---|---|

## Acting as another user

[TODO: if the product has impersonation or support access, state what happens to every row above when a click is made while acting as someone else.]
