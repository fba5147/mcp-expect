import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "demo-search-server", version: "1.0.0" });

server.tool(
  "search",
  { query: z.string() },
  async ({ query }) => {
    // Simulate a slow lookup so respondsWithin() has something to catch.
    await new Promise((resolve) => setTimeout(resolve, 50));
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ results: [`result for ${query}`], count: 1 }),
        },
      ],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
