import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineTest } from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "fixtures");
const greetingPath = path.join(fixturesDir, "greeting.txt");

// A second, differently-shaped real server: @modelcontextprotocol/server-filesystem.
// Unlike the "everything" server, it takes a startup argument (the allowed
// directory), rejects invalid input via domain logic (path outside the
// sandbox) as well as via type validation, and nests its structured result
// under a "content" string rather than the "everything" server's object shape.
const server = { command: "npx", args: ["-y", "mcp-server-filesystem", fixturesDir] };

defineTest("filesystem server: read_file tool is registered", server, async ({ expect }) => {
  await expect.tool("read_file").exists();
});

defineTest("filesystem server: read_file responds quickly", server, async ({ expect }) => {
  await expect.tool("read_file").withInput({ path: greetingPath }).respondsWithin(2000);
});

defineTest("filesystem server: read_file rejects invalid input", server, async ({ expect }) => {
  await expect.tool("read_file").withInput({ path: 12345 }).rejectsInvalidInput();
});

defineTest("filesystem server: read_file rejects paths outside the sandbox", server, async ({ expect }) => {
  await expect.tool("read_file").withInput({ path: "/etc/passwd" }).rejectsInvalidInput();
});

defineTest("filesystem server: read_file returns the expected shape", server, async ({ expect }) => {
  await expect.tool("read_file").withInput({ path: greetingPath }).returnsSchema({ content: "string" });
});
