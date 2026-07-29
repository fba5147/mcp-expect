import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Logs a real diagnostic line to its own stderr on every call, then
// succeeds normally — a realistic pattern (stdout is reserved for the MCP
// protocol channel, so servers that log at all do it via stderr). Exists so
// test/cli.test.ts can exercise the CLI's "server stderr:" output, which no
// other fixture triggers: existing failures are either client-side timeouts
// or a tool result that never touches the real process's stderr.
const server = new McpServer({ name: "noisy-server", version: "1.0.0" });

server.tool("noisy", { value: z.string() }, async ({ value }) => {
  console.error(`diagnostic: handling value=${value}`);
  return { content: [{ type: "text", text: JSON.stringify({ value }) }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
