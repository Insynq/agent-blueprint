# Demo logins

Accounts on the demo environment. This file is safe to commit: it lists logins, not the password.

> Only if the project has a demo environment (`docs/DEMO_ENVIRONMENT.md`). Otherwise leave this file as it is.

- **Demo URL:** [TODO]
- **Password:** one shared password for every account below, kept in [TODO: where, e.g. the secret manager entry `DEMO_LOGIN_PASSWORD`]. Ask the owner; do not write it here, in a sitting, or in chat.
- **Reset:** every night at [TODO: hour and time zone]. Every account is recreated from the seed, so a changed password, a changed profile and anything the account did are gone the next morning.

The password is shared and low value on purpose. It opens only invented data, anyone on the project may know it, and the nightly reset restores it. For the same reason it must never be reused: not for a production account, not for a staging tool, not for anything a real person relies on. If it turns up somewhere it should not be, change the secret and run a reset.

Nothing on demo reaches a real person. Outbound email is captured, not sent; read it at [TODO: where captured messages can be viewed]. Every address below is at a domain that cannot receive mail.

## Accounts

Named for the role or the situation they test, so the right one can be picked at a glance. Keep this table in step with the seed (`scripts/demo/seed/`): the seed is the source of truth, and an account listed here that the seed does not create is a broken sitting.

| Login | What it is for | Role | Starts with |
|---|---|---|---|
| `owner@demo.test` | [TODO: e.g. full access to one organisation] | [TODO] | [TODO: the seeded state] |
| `member@demo.test` | [TODO] | [TODO] | [TODO] |
| `new-user@demo.test` | [TODO: e.g. signed up, has done nothing; the empty states] | [TODO] | [TODO] |

Roles that require multi-factor sign-in cannot be shared logins. List them here as not available on demo, with how they are tested instead: [TODO or none].

## Which login for which smoke

| Smoke ID | Sign in as | Where |
|---|---|---|
| [TODO] | [TODO] | [TODO: path] |

## What the seed sets up

[TODO: a few lines on the invented world: the organisations, the records at each stage, anything deliberately broken or overdue. Enough that a person opening demo knows what they are looking at.]
