# OC KB 3 — MCP Tools: mcporter.json registry and in-repo MCP servers

## Pattern

Tools in OpenClaw are exposed **exclusively via MCP** (Model Context Protocol). There is no first-class "tool" object in the agent repo — every tool is a registered MCP server. The single source of truth for the agent's tool surface is `workspace/config/mcporter.json`.

`mcporter` is the MCP transport multiplexer the OpenClaw gateway uses to manage MCP server lifecycles. It supports stdio (subprocess) and HTTP transports, env-var substitution, and per-server enable/disable.

## When to use stdio vs HTTP transport

**stdio (subprocess):**
- Default. Lower overhead. No network surface area.
- Use for in-repo MCP servers and most external/published MCP servers.
- Server is spawned by the gateway and communicates via stdin/stdout.

**HTTP:**
- Use when the MCP server runs as a separate persistent process (e.g., a hosted service, or a heavy server that's slow to spawn).
- Server must expose the MCP protocol over HTTP at a `baseUrl`.
- Add auth via `headers`.

## mcporter.json schema

```json
{
  "mcpServers": {
    "server-id-kebab-case": {
      "transport": "stdio",
      "command": "node",
      "args": ["./workspace/mcp-servers/server-name/dist/index.js"],
      "env": { "EXTRA_VAR": "value-or-${ENV_VAR}" },
      "description": "Human-readable purpose",
      "enabled": true
    },
    "external-server-id": {
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@some-org/mcp-package"],
      "env": { "API_TOKEN": "${SOME_API_TOKEN}" },
      "description": "..."
    },
    "http-server-id": {
      "baseUrl": "https://mcp.example.com",
      "headers": { "Authorization": "Bearer ${HOSTED_TOKEN}" },
      "description": "..."
    }
  }
}
```

**Top-level key:** `mcpServers`. **Not** `servers`. **Not** `mcp_servers`. Any other key parses without error and the gateway silently registers nothing.

## ${ENV_VAR} resolution

`${ENV_VAR}` references in any string field are resolved at gateway start by reading **`process.env`**. On macOS launchd, the source of `process.env` is the **plist `EnvironmentVariables` dict**. NOT `.env` files.

This is the second canonical silent-failure trap in OpenClaw:

```json
{
  "env": {
    "GMAIL_TOKEN": "${GMAIL_TOKEN}"
  }
}
```

If the runtime host's plist doesn't have `GMAIL_TOKEN`, the substitution produces an empty string. The MCP server starts with no auth, fails its first request, and the agent reports "tool unavailable" with no clear root cause.

**The fix is operational, not in the repo:** add the var to the plist's `EnvironmentVariables` dict, reload the unit (`launchctl bootload <unit>`), restart the gateway.

`.env` files in the repo are for **local-dev** MCP servers only — when you're testing an MCP server outside the OpenClaw gateway, your dev tools may load `.env`. The gateway itself does not.

## Naming conventions

| Layer | Convention | Example |
|---|---|---|
| Server ID (mcporter.json key) | kebab-case | `gmail-mcp` |
| Tool ID (inside server) | snake_case | `send_email` |
| Tool param name | camelCase | `recipientAddress` |

Mixing conventions silently confuses the LLM router and complicates audits.

## In-repo MCP server skeleton

Place under `workspace/mcp-servers/<server-id>/`. Each is its own npm package.

`package.json`:
```json
{
  "name": "@<scope>/<server-id>",
  "version": "0.1.0",
  "main": "./dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.0.0"
  }
}
```

`src/index.ts` (anonymized skeleton):
```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const server = new Server(
  { name: "<server-id>", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

const TOOL_NAME = "tool_id_snake_case";

const InputSchema = z.object({
  recipientId: z.string(),
  body: z.string(),
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: TOOL_NAME,
      description: "Single sentence describing what this tool does",
      inputSchema: {
        type: "object",
        properties: {
          recipientId: { type: "string" },
          body: { type: "string" },
        },
        required: ["recipientId", "body"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (req.params.name !== TOOL_NAME) {
    throw new Error(`Unknown tool: ${req.params.name}`);
  }
  const args = InputSchema.parse(req.params.arguments);

  // Do the work. Touch external systems here.
  const result = { ok: true, recipientId: args.recipientId };

  return {
    content: [{ type: "text", text: JSON.stringify(result) }],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

**Conventions baked into the skeleton:**
- Single tool per file is fine; multiple tools dispatch via the `req.params.name` switch.
- Every tool input MUST be validated with a zod schema. Skipping this is a "typed-by-vibes" anti-pattern.
- Every tool returns a single `text` content block of stringified JSON. Mixed-shape returns break downstream LLM parsing.

Then register in `workspace/config/mcporter.json`:
```json
"server-id-kebab-case": {
  "transport": "stdio",
  "command": "node",
  "args": ["./workspace/mcp-servers/server-id-kebab-case/dist/index.js"],
  "description": "What this server does"
}
```

## Anti-patterns

- **Wrong top-level key.** `servers`, `mcp_servers`, `mcpservers` (lowercase) — silent failure. → fix: `mcpServers` exactly.
- **`${ENV_VAR}` with no plist entry.** Substitution → empty string → server starts without auth. → fix: add to plist `EnvironmentVariables`, `launchctl bootload`.
- **Tool with no zod input schema.** Bad inputs crash the server or do the wrong thing silently. → fix: validate every tool's input with zod before acting.
- **Mixed naming conventions.** `getEmail` (camelCase) tool ID instead of `get_email` (snake_case). The LLM router still sometimes routes to it, but audits and consistency suffer. → fix: stick to the conventions table above.
- **Tools that mutate state without confirmation.** `send_email` should not fire on every router-selected skill activation. → fix: skill's Important Rules section requires user confirmation before destructive ops.
- **Embedding API tokens in `mcporter.json` directly.** Commits secrets to git. → fix: use `${ENV_VAR}` references; set the env var in the plist.

## Diagnosing "tool unavailable" bugs

In order:

1. Read `mcporter.json`. Top-level key is `mcpServers`?
2. Is the entry present and `enabled` (or unset, defaults to enabled)?
3. For stdio: does `command` resolve on the runtime host's PATH? `command -v <name>` on the host.
4. For stdio in-repo: did the server's `npm run build` succeed? Does `args[0]` point at the built artifact (e.g., `dist/index.js`), not the source (`src/index.ts`)?
5. Grep `mcporter.json` for `${...}` references. For each, run on the runtime host: `launchctl print <unit-target> | grep <ENV_VAR>`. Missing → fix in plist.
6. Read the gateway log around server-start time (typically right after `openclaw gateway restart`). Look for connection errors or "command not found".
7. For HTTP: try `curl <baseUrl>` from the runtime host. Check DNS, TLS, firewall.

[VERIFY BEFORE SHIPPING] mcporter.json schema (top-level key, stdio/HTTP entry shapes, env-substitution rules) — confirm against the latest mcporter docs if behavior is unexpected.
