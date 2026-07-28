import { describeServer } from "../src/index.js";

// Tests against the official MCP reference "everything" server
// (@modelcontextprotocol/server-everything), not our own demo-server — this
// is here to prove the library works against a real, independently
// maintained MCP server, not just one we control.
//
// Uses describeServer() so all five assertions share one connection instead
// of paying the ~800ms npx/connect cost five times over.
describeServer({ command: "npx", args: ["-y", "mcp-server-everything"] }, (defineTest) => {
  defineTest("everything server: echo tool is registered", async ({ expect }) => {
    await expect.tool("echo").exists();
  });

  defineTest("everything server: echo tool responds quickly", async ({ expect }) => {
    await expect.tool("echo").withInput({ message: "hello" }).respondsWithin(2000);
  });

  defineTest("everything server: echo tool rejects invalid input", async ({ expect }) => {
    await expect.tool("echo").withInput({ message: 123 }).rejectsInvalidInput();
  });

  defineTest("everything server: get-structured-content returns the expected shape", async ({ expect }) => {
    await expect
      .tool("get-structured-content")
      .withInput({ location: "New York" })
      .returnsSchema({ temperature: "number", conditions: "string", humidity: "number" });
  });

  defineTest("everything server: get-structured-content matches its own declared outputSchema", async ({ expect }) => {
    await expect.tool("get-structured-content").withInput({ location: "Chicago" }).matchesOutputSchema();
  });
});
