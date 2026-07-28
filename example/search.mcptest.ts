import path from "node:path";
import { fileURLToPath } from "node:url";
import { describeServer } from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverScript = path.join(__dirname, "demo-server.js");

describeServer({ command: "node", args: [serverScript] }, (defineTest) => {
  defineTest("search tool is registered", async ({ expect }) => {
    await expect.tool("search").exists();
  });

  defineTest("search tool responds quickly", async ({ expect }) => {
    await expect.tool("search").withInput({ query: "hello" }).respondsWithin(1000);
  });

  defineTest("search tool rejects invalid input", async ({ expect }) => {
    await expect.tool("search").withInput({ query: 123 }).rejectsInvalidInput();
  });

  defineTest("search tool returns the expected shape", async ({ expect }) => {
    await expect
      .tool("search")
      .withInput({ query: "hello" })
      .returnsSchema({ results: "array", count: "number" });
  });
});
