import { connectToServer } from "./client.js";
import { createExpect } from "./expect.js";
import { MCPAssertionError } from "./errors.js";
import type { RegisteredTest } from "./index.js";

export interface TestResult {
  test: RegisteredTest;
  status: "pass" | "fail" | "skip";
  durationMs: number;
  error?: Error;
  /** The server's captured stderr, only populated when the test failed. */
  stderr?: string;
}

/**
 * Runs every registered test, isolating connection failures per group.
 * `anyOnly` should be true if any test anywhere in this invocation (across
 * every loaded file) is `.only` — when true, every test here that isn't
 * itself `.only` is reported as skipped instead of run, matching
 * Jest/Mocha's cross-file `.only` semantics.
 *
 * Tests are batched into contiguous runs sharing the same `groupId` (set by
 * `describeServer`) — each group opens one connection, reused across every
 * test in it, closed once at the end. A plain `defineTest` call (no
 * `groupId`) is just a group of one, so its behavior is unchanged: connect,
 * run, close.
 */
export async function runTests(tests: RegisteredTest[], anyOnly: boolean): Promise<TestResult[]> {
  const results: TestResult[] = [];
  let i = 0;

  while (i < tests.length) {
    const groupId = tests[i].groupId;
    const group: RegisteredTest[] = [tests[i]];
    i++;
    if (groupId !== undefined) {
      while (i < tests.length && tests[i].groupId === groupId) {
        group.push(tests[i]);
        i++;
      }
    }
    await runGroup(group, anyOnly, results);
  }

  return results;
}

/** Runs one connection-sharing group of tests, appending each result in order. */
async function runGroup(tests: RegisteredTest[], anyOnly: boolean, results: TestResult[]): Promise<void> {
  let connected: Awaited<ReturnType<typeof connectToServer>> | undefined;
  try {
    for (const test of tests) {
      if (test.mode === "skip" || (anyOnly && test.mode !== "only")) {
        results.push({ test, status: "skip", durationMs: 0 });
        continue;
      }

      const start = performance.now();
      try {
        if (!connected) {
          connected = await connectToServer(test.server);
        }
        const expect = createExpect(connected.client);
        await test.fn({ expect });
        results.push({ test, status: "pass", durationMs: performance.now() - start });
      } catch (err) {
        const error = err instanceof Error ? err : new MCPAssertionError(String(err));
        const stderr = connected?.getStderr() || undefined;
        results.push({ test, status: "fail", durationMs: performance.now() - start, error, stderr });
      }
    }
  } finally {
    if (connected) {
      try {
        await connected.close();
      } catch {
        // Server already exited — nothing to clean up.
      }
    }
  }
}
