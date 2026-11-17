# KB 1: Architecture

Filled in by `/kickoff` or `/adopt`, then kept current by `/update-kb`.

## Overview
[TODO: how the pieces fit together, in a paragraph or two.]

## Stack
[TODO: each component with its version where it matters.]

## Capabilities in play
[TODO: which of these the project has, and where each lives: sign-in, payments, real-time, file storage, outbound email or messages, third-party APIs, scheduled jobs, an in-product agent, an admin surface, a mobile client.]

## Data model
[TODO: the main entities and how they relate. Concepts, not a schema dump. Point to where the real schema is defined.]

## Service boundaries
Everything that crosses to another system. Each one needs a `live-required` smoke before a change to it is production-ready.

[TODO: boundary, direction, what fails silently if it breaks.]

## Architecture decisions

| # | Decision | Choice | Reasoning | Date |
|---|---|---|---|---|
| 1 | [TODO] | | | |

## Open questions
Unresolved questions that block or shape upcoming work. Each has an owner and a point by which it must be answered.

[TODO: none.]
