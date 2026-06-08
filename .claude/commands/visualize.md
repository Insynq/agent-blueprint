---
description: Generate ASCII diagrams for architecture, data flows, schemas, and UI layouts
argument-hint: "<diagram type: architecture|flow|schema|ui|sequence|all> <what to diagram>"
---

# Visualizer

Generate clear ASCII diagrams based on actual codebase state.

## Instructions for Claude

Read the relevant files first, then produce accurate diagrams — not generic ones.

---

## Diagram Types

### Architecture (`type=architecture`)
High-level system overview — components, services, and how they connect.

```
┌─────────────────────────────────────────┐
│              Client Browser             │
│  ┌──────────┐  ┌──────────┐           │
│  │ React UI │  │  Router  │           │
│  └────┬─────┘  └──────────┘           │
└───────┼─────────────────────────────────┘
        │ HTTPS
        ▼
┌───────────────┐     ┌──────────────────┐
│   CDN / Host  │────▶│   API / Backend  │
└───────────────┘     └────────┬─────────┘
                               │
                       ┌───────▼──────┐
                       │   Database   │
                       └──────────────┘
```

### Data Flow (`type=flow`)
How data moves through the system for a specific operation.

```
User Action
     │
     ▼
Component (src/components/X.tsx)
     │ calls
     ▼
Hook (src/hooks/useX.ts)
     │ calls
     ▼
API / Service
     │
     ▼
Database / External Service
     │
     ▼
Response mapped to type
     │
     ▼
Component re-renders
```

### Schema (`type=schema`)
Entity relationships and key fields.

```
┌──────────────┐         ┌──────────────────┐
│    users     │         │     orders       │
├──────────────┤         ├──────────────────┤
│ id (PK)      │◄────────│ user_id (FK)     │
│ email        │         │ id (PK)          │
│ role         │         │ status           │
│ created_at   │         │ total            │
└──────────────┘         │ created_at       │
                         └──────────────────┘
```

### UI Layout (`type=ui`)
Screen layout with component breakdown.

```
┌─────────────────────────────────────────┐
│ Header                    [User Menu ▼] │
├──────────┬──────────────────────────────┤
│          │  Page Title                  │
│ Sidebar  │  ┌────────────────────────┐  │
│          │  │ Main Content Card      │  │
│ [Nav 1]  │  │                        │  │
│ [Nav 2]  │  │  [Action Button]       │  │
│ [Nav 3]  │  └────────────────────────┘  │
│          │                              │
└──────────┴──────────────────────────────┘
```

### Sequence (`type=sequence`)
Time-ordered interactions between components/services.

```
Client          API         Database
  │              │              │
  │─── POST ────▶│              │
  │              │── SELECT ───▶│
  │              │◀─── rows ────│
  │              │── INSERT ───▶│
  │              │◀─── ok ──────│
  │◀── 200 ──────│              │
  │              │              │
```

### State Machine (`type=state-machine`)
Shows all states an entity can be in and the transitions between them.
Use when: modelling order status, user account lifecycle, modal open/close flow, async operation states.
Format hint: nodes are states, edges are transitions with trigger labels (e.g., `submit → processing`, `error → idle`).

```
         submit
  idle ──────────▶ processing
  ▲ │                  │
  │ │ reset         success│  error
  │ │                  │      │
  │ └──────────── complete   failed
  │                           │
  └───────────────────────────┘
          retry
```

### User Journey (`type=journey`)
Shows the steps a user takes through a flow, with the actor, action, and system response at each step.
Use when: documenting onboarding flows, checkout sequences, or any multi-step user interaction.
Format hint: columns are stages; rows can be User action / System response / Emotional state (optional).

```
Stage:        1. Land          2. Sign Up        3. Onboard        4. First Action
              ─────────────    ──────────────    ──────────────    ───────────────
User:         Views landing    Fills out form    Completes steps   Places first order
System:       Shows marketing  Creates account   Guides wizard     Confirms order
Emotion:      Curious          Cautious          Focused           Satisfied
```

### Deployment Diagram (`type=deployment`)
Shows infrastructure topology — services, where they run, and how they connect.
Use when: documenting hosting setup, microservice relationships, CDN + origin + DB layout.
Format hint: boxes are services/machines; lines are network connections with protocol labels (HTTP, WebSocket, SQL, etc.).

```
┌────────────────────────────────────────────────┐
│           Developer machine (this repo)        │
│  ┌──────────────────────────────────────────┐  │
│  │  workspace/ + deploy/ + .claude/         │  │
│  └──────────────────────────────────────────┘  │
└───────────────────────┬────────────────────────┘
                        │ git push
                        ▼
             ┌──────────────────────┐
             │  GitHub (canonical)  │
             └──────────┬───────────┘
                        │ webhook (HMAC)
                        ▼
       ┌────────────────────────────────┐
       │      Runtime host (launchd)    │
       │  ┌──────────────────────────┐  │
       │  │ webhook-receiver.js      │  │
       │  │   → deploy.sh            │  │
       │  │   → rsync workspace/     │  │
       │  └────────────┬─────────────┘  │
       │               ▼                │
       │  ┌──────────────────────────┐  │
       │  │ openclaw gateway         │──── stdio ──▶ MCP servers
       │  │   • bootstrap files      │
       │  │   • on-demand skills     │
       │  │   • cron jobs            │──── HTTPS ──▶ Anthropic API
       │  └──────────────────────────┘  │
       └────────────────────────────────┘
```

---

## Instructions

1. Read the relevant source files for the focus named in `$ARGUMENTS` before drawing
2. Make diagrams accurate — use actual file paths, field names, and component names from the code
3. Keep diagrams focused — one clear thing per diagram
4. Use consistent box-drawing characters (`┌ ┐ └ ┘ │ ─ ├ ┤ ┬ ┴ ┼ ▶ ◀ ▲ ▼`)
5. Label all connections and arrows
6. If `type=all`, produce one of each relevant type for the given focus
