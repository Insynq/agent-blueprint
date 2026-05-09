# Task Queue

<!-- TODO: Runtime-mutable working state.

     This file is unique among the bootstrap files: the agent WRITES to it at runtime.

     CRITICAL: deploy/deploy.sh MUST exclude TASK-QUEUE.md from `rsync --delete` excludes,
     otherwise every deploy wipes the runtime state. The framework's deploy.sh template
     ships this exclude already; double-check before adding new mutable paths.

     Format is up to the agent. Common shapes:
       - Markdown table of in-flight tasks with status
       - Bullet list of pending items
       - Sectioned by priority or topic

     Keep an eye on the character cap. If TASK-QUEUE grows past it, older entries silently
     truncate. Plan for an archival pattern (move resolved entries to a sibling file) before
     you hit the cap.
-->

## In-flight

- [Empty — populated by the agent at runtime]

## Pending

- [Empty]

## Recently resolved

- [Empty]
