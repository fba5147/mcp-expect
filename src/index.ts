import type { ServerConfig } from "./client.js";
import { createExpect } from "./expect.js";

export type { ServerConfig, StdioServerConfig, HttpServerConfig, ConnectedServer } from "./client.js";
export { connectToServer } from "./client.js";
export { MCPAssertionError } from "./errors.js";
export { ToolAssertion, createExpect } from "./expect.js";

export interface TestContext {
  expect: ReturnType<typeof createExpect>;
}

export interface RegisteredTest {
  name: string;
  server: ServerConfig;
  fn: (ctx: TestContext) => Promise<void> | void;
  /** Populated by the file path that called defineTest, used for reporting. */
  file?: string;
}

/** In-process registry populated as test files are imported by the CLI runner. */
export const testRegistry: RegisteredTest[] = [];

/**
 * Registers a test against a given MCP server. The server is launched fresh
 * (stdio) or connected to (http) once per test and torn down afterward.
 *
 * @example
 * defineTest("search tool", { command: "node", args: ["server.js"] }, async ({ expect }) => {
 *   await expect.tool("search").exists();
 * });
 */
export function defineTest(
  name: string,
  server: ServerConfig,
  fn: (ctx: TestContext) => Promise<void> | void,
): void {
  testRegistry.push({ name, server, fn });
}
