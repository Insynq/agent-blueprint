# Notifications

<!-- TODO: Routing rules for outgoing notifications.

     For each notification type the agent emits, document:
       - When it fires (the trigger condition or skill it comes from)
       - Where it goes (Slack channel, email, Discord, GitHub issue, etc.)
       - The MCP server / tool that delivers it (must be registered in mcporter.json)
       - Severity / priority

     Audit: every channel referenced here MUST have a corresponding MCP server in
     mcporter.json. Drift here surfaces as silently-dropped notifications.
-->

## Channel: [TODO channel-name]

- **MCP server:** [TODO server-id from mcporter.json]
- **Used for:** [TODO when this channel is the right one]
- **Format:** [TODO concise vs detailed; with links vs without; etc.]

## Routing rule: [TODO]

- **Trigger:** [TODO]
- **Channel:** [TODO]
- **Severity:** [TODO low | medium | high | critical]
