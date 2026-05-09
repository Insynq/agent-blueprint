# In-repo MCP servers

Place each in-repo MCP server in its own folder: `workspace/mcp-servers/<server-id>/`.

Each is its own npm package with `package.json`, source, and a build artifact under `dist/`.

**Conventions:**

- Server ID (folder name and `mcpServers` key in `mcporter.json`): kebab-case
- Tool ID: snake_case
- Tool param name: camelCase
- Every tool input MUST be validated with a zod schema
- Every tool returns a single `text` content block of stringified JSON

**Skeleton:** see `docs/OpenClaw KBs/OC_KB_03_MCP_Tools.md` for the canonical in-repo MCP server skeleton (`@modelcontextprotocol/sdk@1.x` + `zod`).

**Registration:** after building, register in `workspace/config/mcporter.json` under the `mcpServers` key. Run `openclaw gateway restart` on the runtime host after changes.

**External MCP servers** (npm packages, hosted services) don't go here — they're registered directly in `mcporter.json` via `npx -y @some-org/mcp-package` (stdio) or HTTP `baseUrl`.
