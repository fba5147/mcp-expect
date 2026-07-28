import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineTest } from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverScript = path.join(__dirname, "vulnerable-demo-server.js");

const server = { command: "node", args: [serverScript] };

// Kept separate from the green CI suites (like red-demo.mcptest.ts) so this
// intentional failure doesn't turn CI red. This demonstrates .isSafeAgainst()
// actually catching a real command-injection bug, not just passing against
// servers that are already safe — see vulnerable-demo-server.ts.
defineTest("greet tool is vulnerable to command injection", server, async ({ expect }) => {
  await expect.tool("greet").withInput({ name: "world" }).isSafeAgainst("name", "command-injection");
});
