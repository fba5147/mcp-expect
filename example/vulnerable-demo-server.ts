import { execSync } from "node:child_process";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// INTENTIONALLY VULNERABLE — exists only so example/security-red-demo.mcptest.ts
// can demonstrate .isSafeAgainst() actually catching a real bug, not just
// passing against servers that are already safe. Never copy this pattern:
// interpolating unchecked user input into a shell command is a textbook
// command-injection hole, which is exactly the bug class the assertion
// targets. The payloads it fuzzes with (see security-payloads.ts) are all
// benign, read-only commands (whoami) — safe to actually execute in CI.
const server = new McpServer({ name: "vulnerable-demo-server", version: "1.0.0" });

server.tool("greet", { name: z.string() }, async ({ name }) => ({
  content: [{ type: "text", text: execSync(`echo hello ${name}`).toString() }],
}));

const transport = new StdioServerTransport();
await server.connect(transport);
