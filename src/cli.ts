#!/usr/bin/env node
import path from "node:path";
import { pathToFileURL } from "node:url";
import fg from "fast-glob";
import chalk from "chalk";
import { testRegistry, type RegisteredTest } from "./index.js";
import { runTests } from "./runner.js";
import { MCPAssertionError } from "./errors.js";

interface FileTests {
  file: string;
  tests: RegisteredTest[];
}

async function loadTestFiles(patterns: string[]): Promise<FileTests[]> {
  const files = await fg(patterns, { absolute: true });
  if (files.length === 0) {
    console.error(chalk.yellow(`No test files matched: ${patterns.join(", ")}`));
    console.error(chalk.dim('Test files should be named like "*.mcptest.js" (compiled output).'));
  }

  const grouped: FileTests[] = [];
  for (const file of files) {
    const before = testRegistry.length;
    await import(pathToFileURL(file).href);
    const tests = testRegistry.slice(before);
    grouped.push({ file, tests });
  }
  return grouped;
}

function printGitHubActionsAnnotation(file: string, error: Error) {
  const message = error.message.replace(/\n/g, "%0A");
  console.log(`::error file=${path.relative(process.cwd(), file)}::${message}`);
}

async function main() {
  const patterns = process.argv.slice(2);
  if (patterns.length === 0) {
    console.error(chalk.red("Usage: mcp-testing-kit <glob pattern> [...more patterns]"));
    process.exit(1);
  }

  const grouped = await loadTestFiles(patterns);
  const inCI = process.env.GITHUB_ACTIONS === "true";

  let totalPass = 0;
  let totalFail = 0;

  for (const { file, tests } of grouped) {
    if (tests.length === 0) continue;
    console.log(chalk.bold(`\n${path.relative(process.cwd(), file)}`));
    const results = await runTests(tests);

    for (const result of results) {
      if (result.status === "pass") {
        totalPass++;
        console.log(`  ${chalk.green("✓")} ${result.test.name} ${chalk.dim(`(${result.durationMs.toFixed(0)}ms)`)}`);
      } else {
        totalFail++;
        console.log(`  ${chalk.red("✗")} ${result.test.name}`);
        const error = result.error ?? new MCPAssertionError("Unknown failure");
        for (const line of error.message.split("\n")) {
          console.log(chalk.red(`      ${line}`));
        }
        if (inCI) printGitHubActionsAnnotation(file, error);
      }
    }
  }

  console.log();
  const summary = `${totalPass} passed, ${totalFail} failed`;
  console.log(totalFail > 0 ? chalk.red.bold(summary) : chalk.green.bold(summary));

  process.exit(totalFail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(chalk.red("mcp-testing-kit crashed:"), err);
  process.exit(1);
});
