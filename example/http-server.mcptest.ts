import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { describeServer } from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 4310;

// The library's HTTP transport doesn't manage server lifecycle — per the
// README, an HTTP MCP server is "already running somewhere." So unlike
// every other example here, this file has to start and stop that server
// itself before describeServer() can connect to it.
const child = spawn("node", [path.join(__dirname, "http-server.js")], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: ["ignore", "pipe", "inherit"],
});

await new Promise<void>((resolve, reject) => {
  child.once("error", reject);
  child.once("exit", (code) => reject(new Error(`http-server exited early with code ${code}`)));
  child.stdout?.on("data", (chunk: Buffer) => {
    if (chunk.toString().includes("listening")) resolve();
  });
});

process.on("exit", () => child.kill());

describeServer({ url: `http://127.0.0.1:${PORT}/mcp` }, (defineTest) => {
  defineTest("http server: ping tool is registered", async ({ expect }) => {
    await expect.tool("ping").exists();
  });

  defineTest("http server: ping tool responds quickly", async ({ expect }) => {
    await expect.tool("ping").withInput({ value: "hi" }).respondsWithin(2000);
  });

  defineTest("http server: ping tool rejects invalid input", async ({ expect }) => {
    await expect.tool("ping").withInput({ value: 123 }).rejectsInvalidInput();
  });

  defineTest("http server: ping tool returns the expected shape", async ({ expect }) => {
    await expect.tool("ping").withInput({ value: "hi" }).returnsSchema({ pong: "string" });
  });
});
