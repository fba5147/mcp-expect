import path from "node:path";
import { fileURLToPath } from "node:url";
import { describeServer } from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "fixtures");
const greetingPath = path.join(fixturesDir, "greeting.txt");

// A second, differently-shaped real server: @modelcontextprotocol/server-filesystem.
// Unlike the "everything" server, it takes a startup argument (the allowed
// directory), rejects invalid input via domain logic (path outside the
// sandbox) as well as via type validation, and nests its structured result
// under a "content" string rather than the "everything" server's object shape.
//
// Uses describeServer() so all seven assertions share one connection.
describeServer({ command: "npx", args: ["-y", "mcp-server-filesystem", fixturesDir] }, (defineTest) => {
  defineTest("filesystem server: read_file tool is registered", async ({ expect }) => {
    await expect.tool("read_file").exists();
  });

  defineTest("filesystem server: read_file responds quickly", async ({ expect }) => {
    await expect.tool("read_file").withInput({ path: greetingPath }).respondsWithin(2000);
  });

  defineTest("filesystem server: read_file rejects invalid input", async ({ expect }) => {
    await expect.tool("read_file").withInput({ path: 12345 }).rejectsInvalidInput();
  });

  defineTest("filesystem server: read_file rejects paths outside the sandbox", async ({ expect }) => {
    await expect.tool("read_file").withInput({ path: "/etc/passwd" }).rejectsInvalidInput();
  });

  defineTest("filesystem server: read_file returns the expected shape", async ({ expect }) => {
    await expect.tool("read_file").withInput({ path: greetingPath }).returnsSchema({ content: "string" });
  });

  defineTest("filesystem server: read_file matches its own declared outputSchema", async ({ expect }) => {
    await expect.tool("read_file").withInput({ path: greetingPath }).matchesOutputSchema();
  });

  defineTest("filesystem server: read_file is safe against path traversal", async ({ expect }) => {
    await expect.tool("read_file").withInput({ path: greetingPath }).isSafeAgainst("path", "path-traversal");
  });
});
