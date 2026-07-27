import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineTest } from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverScript = path.join(__dirname, "demo-server.js");

const server = { command: "node", args: [serverScript] };

defineTest("search tool is registered", server, async ({ expect }) => {
  await expect.tool("search").exists();
});

defineTest("search tool responds quickly", server, async ({ expect }) => {
  await expect.tool("search").withInput({ query: "hello" }).respondsWithin(1000);
});

defineTest("search tool rejects invalid input", server, async ({ expect }) => {
  await expect.tool("search").withInput({ query: 123 }).rejectsInvalidInput();
});

defineTest("search tool returns the expected shape", server, async ({ expect }) => {
  await expect
    .tool("search")
    .withInput({ query: "hello" })
    .returnsSchema({ results: "array", count: "number" });
});
