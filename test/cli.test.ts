import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..", "..");
const cliPath = path.join(repoRoot, "dist", "src", "cli.js");

interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function runCli(args: string[], env?: Record<string, string>): Promise<CliResult> {
  try {
    const { stdout, stderr } = await execFileAsync("node", [cliPath, ...args], {
      cwd: repoRoot,
      env: { ...process.env, ...env },
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return { stdout: e.stdout ?? "", stderr: e.stderr ?? "", exitCode: e.code ?? 1 };
  }
}

// This exercises the real, compiled CLI binary as a black box (real process,
// real argv, real exit codes) — the parts of cli.ts that are fundamentally
// about process I/O rather than pure logic, so a fake Client wouldn't help.

describe("mcp-expect CLI", () => {
  test("no patterns: prints usage and exits 1", async () => {
    const result = await runCli([]);
    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /Usage: mcp-expect/);
  });

  test("pattern matches nothing: warns, exits 0", async () => {
    const result = await runCli(["dist/nonexistent/*.mcptest.js"]);
    assert.equal(result.exitCode, 0);
    assert.match(result.stderr, /No test files matched/);
    assert.match(result.stdout, /0 passed, 0 failed, 0 skipped/);
  });

  test("a matched file with zero registered tests is silently skipped, not headed", async () => {
    const result = await runCli(["dist/test/fixtures/empty.mcptest.js"]);
    assert.equal(result.exitCode, 0);
    assert.ok(!result.stdout.includes("empty.mcptest.js"));
  });

  test("a failing test: exits 1, prints the error and real server stderr", async () => {
    const result = await runCli(["dist/test/fixtures/noisy.mcptest.js"]);
    assert.equal(result.exitCode, 1);
    assert.match(result.stdout, /✗ noisy tool/);
    assert.match(result.stdout, /did not match the expected schema/);
    assert.match(result.stdout, /server stderr:/);
    assert.match(result.stdout, /diagnostic: handling value=hi/);
  });

  test("GITHUB_ACTIONS=true adds a ::error:: annotation on failure", async () => {
    const withCi = await runCli(["dist/test/fixtures/noisy.mcptest.js"], { GITHUB_ACTIONS: "true" });
    assert.match(withCi.stdout, /::error file=.*noisy\.mcptest\.js::/);

    const withoutCi = await runCli(["dist/test/fixtures/noisy.mcptest.js"], { GITHUB_ACTIONS: "" });
    assert.ok(!withoutCi.stdout.includes("::error"));
  });

  test("a skipped test is reported separately from pass/fail", async () => {
    const result = await runCli(["dist/example/search.mcptest.js"]);
    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /○ not implemented yet \(skipped\)/);
    assert.match(result.stdout, /4 passed, 0 failed, 1 skipped/);
  });
});
