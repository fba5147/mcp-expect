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
  /** Set by `.only()`/`.skip()`. Undefined means "run normally". */
  mode?: "only" | "skip";
  /** Tests sharing a groupId (from `describeServer`) reuse one connection. */
  groupId?: number;
}

/** In-process registry populated as test files are imported by the CLI runner. */
export const testRegistry: RegisteredTest[] = [];

type DefineTestFn = (
  name: string,
  server: ServerConfig,
  fn: (ctx: TestContext) => Promise<void> | void,
) => void;

/**
 * Registers a test against a given MCP server. The server is launched fresh
 * (stdio) or connected to (http) once per test and torn down afterward.
 *
 * @example
 * defineTest("search tool", { command: "node", args: ["server.js"] }, async ({ expect }) => {
 *   await expect.tool("search").exists();
 * });
 */
export const defineTest: DefineTestFn & { only: DefineTestFn; skip: DefineTestFn } = (name, server, fn) => {
  testRegistry.push({ name, server, fn });
};

/**
 * Runs only this test (and any other `.only` tests) for this invocation —
 * every other test across every loaded file is reported as skipped instead
 * of run. Useful for focusing on one test while debugging.
 */
defineTest.only = (name, server, fn) => {
  testRegistry.push({ name, server, fn, mode: "only" });
};

/** Never runs this test; reported as skipped in the output. */
defineTest.skip = (name, server, fn) => {
  testRegistry.push({ name, server, fn, mode: "skip" });
};

type ScopedDefineTestFn = (name: string, fn: (ctx: TestContext) => Promise<void> | void) => void;

let nextGroupId = 1;

/**
 * Groups several tests under one shared server connection instead of
 * reconnecting for every single `defineTest`. The connection is opened once,
 * right before the first test in the group actually runs, and closed once
 * after the last — cutting most of the per-test process-spawn overhead when
 * you have several assertions against the same server.
 *
 * @example
 * describeServer({ command: "node", args: ["server.js"] }, (defineTest) => {
 *   defineTest("search exists", async ({ expect }) => {
 *     await expect.tool("search").exists();
 *   });
 *   defineTest("search responds", async ({ expect }) => {
 *     await expect.tool("search").withInput({ query: "hi" }).respondsWithin(1000);
 *   });
 * });
 */
export function describeServer(
  server: ServerConfig,
  register: (defineTest: ScopedDefineTestFn & { only: ScopedDefineTestFn; skip: ScopedDefineTestFn }) => void,
): void {
  const groupId = nextGroupId++;

  const scoped: ScopedDefineTestFn & { only: ScopedDefineTestFn; skip: ScopedDefineTestFn } = (name, fn) => {
    testRegistry.push({ name, server, fn, groupId });
  };
  scoped.only = (name, fn) => {
    testRegistry.push({ name, server, fn, groupId, mode: "only" });
  };
  scoped.skip = (name, fn) => {
    testRegistry.push({ name, server, fn, groupId, mode: "skip" });
  };

  register(scoped);
}
