import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineTest } from "../../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const server = { command: "node", args: [path.join(__dirname, "noisy-server.js")] };

// Deliberately wrong expectation: the schema check fails, but the server's
// own console.error already ran during the same call — real stderr, not
// simulated. Used by test/cli.test.ts to check the "server stderr:" block.
defineTest("noisy tool (intentionally wrong expectation, for stderr coverage)", server, async ({ expect }) => {
  await expect.tool("noisy").withInput({ value: "hi" }).returnsSchema({ definitely_missing_field: "string" });
});
