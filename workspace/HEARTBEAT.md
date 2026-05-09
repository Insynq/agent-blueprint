# Heartbeat

<!-- TODO: Proactive / scheduled behavior.

     This file describes the INTENT of scheduled behavior. The actual cron registrations
     live on the runtime host and are managed via `openclaw cron list/edit/create/delete`.
     The runtime is authoritative; this file is the documented intent.

     For each scheduled behavior:
       - Name (matches the cron name on the runtime host)
       - Schedule (when it fires)
       - Type (deterministic script or LLM-driven)
       - What it does and where the output goes

     If you change a cron on the runtime host, update this file in the same PR.
-->

## Cron: [TODO cron-name]

- **Schedule:** [TODO cron expression]
- **Type:** [TODO deterministic | LLM-driven]
- **Script / skill:** [TODO workspace/scripts/<name> | workspace/skills/<name>/]
- **Purpose:** [TODO]
- **Output routing:** [TODO see NOTIFICATIONS.md]
