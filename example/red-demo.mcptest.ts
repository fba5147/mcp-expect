import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineTest } from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverScript = path.join(__dirname, "demo-server.js");

const server = { command: "node", args: [serverScript] };

// Kept separate from search.mcptest.ts (which is used in CI and should stay
// green) so you can run this on its own to see what a failing assertion
// actually looks like.
defineTest("search tool (intentionally wrong expectation)", server, async ({ expect }) => {
  await expect.tool("search").withInput({ query: "hello" }).respondsWithin(1);
});
