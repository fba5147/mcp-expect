import { connectToServer } from "./client.js";
import { createExpect } from "./expect.js";
import { MCPAssertionError } from "./errors.js";
import type { RegisteredTest } from "./index.js";

export interface TestResult {
  test: RegisteredTest;
  status: "pass" | "fail";
  durationMs: number;
  error?: Error;
}

/** Runs every registered test sequentially, isolating connection failures per test. */
export async function runTests(tests: RegisteredTest[]): Promise<TestResult[]> {
  const results: TestResult[] = [];

  for (const test of tests) {
    const start = performance.now();
    let connected: Awaited<ReturnType<typeof connectToServer>> | undefined;
    try {
      connected = await connectToServer(test.server);
      const expect = createExpect(connected.client);
      await test.fn({ expect });
      results.push({ test, status: "pass", durationMs: performance.now() - start });
    } catch (err) {
      const error =
        err instanceof Error ? err : new MCPAssertionError(String(err));
      results.push({ test, status: "fail", durationMs: performance.now() - start, error });
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

  return results;
}
