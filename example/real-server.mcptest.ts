import { defineTest } from "../src/index.js";

// Tests against the official MCP reference "everything" server
// (@modelcontextprotocol/server-everything), not our own demo-server — this
// is here to prove the library works against a real, independently
// maintained MCP server, not just one we control.
const server = { command: "npx", args: ["-y", "mcp-server-everything"] };

defineTest("everything server: echo tool is registered", server, async ({ expect }) => {
  await expect.tool("echo").exists();
});

defineTest("everything server: echo tool responds quickly", server, async ({ expect }) => {
  await expect.tool("echo").withInput({ message: "hello" }).respondsWithin(2000);
});

defineTest("everything server: echo tool rejects invalid input", server, async ({ expect }) => {
  await expect.tool("echo").withInput({ message: 123 }).rejectsInvalidInput();
});

defineTest(
  "everything server: get-structured-content returns the expected shape",
  server,
  async ({ expect }) => {
    await expect
      .tool("get-structured-content")
      .withInput({ location: "New York" })
      .returnsSchema({ temperature: "number", conditions: "string", humidity: "number" });
  },
);
