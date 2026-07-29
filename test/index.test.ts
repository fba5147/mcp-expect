import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { defineTest, describeServer, testRegistry } from "../src/index.js";
import { runTests } from "../src/runner.js";

// `testRegistry` is a shared module-level singleton, so every test here
// captures its length beforehand and inspects only what it just pushed,
// rather than assuming the array starts empty.
function lastPushed() {
  return testRegistry[testRegistry.length - 1];
}

describe("defineTest.only() / defineTest.skip()", () => {
  test("defineTest.only registers with mode: 'only'", () => {
    defineTest.only("an only test", { command: "node" }, async () => {});
    assert.equal(lastPushed().mode, "only");
    assert.equal(lastPushed().groupId, undefined);
  });

  test("defineTest.skip registers with mode: 'skip'", () => {
    defineTest.skip("a skipped test", { command: "node" }, async () => {});
    assert.equal(lastPushed().mode, "skip");
  });

  test("plain defineTest has no mode set", () => {
    defineTest("a normal test", { command: "node" }, async () => {});
    assert.equal(lastPushed().mode, undefined);
  });
});

describe("describeServer()", () => {
  test("scoped defineTest shares one groupId across all tests in the block", () => {
    const before = testRegistry.length;
    describeServer({ command: "node" }, (defineTest) => {
      defineTest("first", async () => {});
      defineTest("second", async () => {});
    });
    const [first, second] = testRegistry.slice(before);
    assert.equal(typeof first.groupId, "number");
    assert.equal(first.groupId, second.groupId);
  });

  test("scoped .only() and .skip() set mode within the shared group", () => {
    const before = testRegistry.length;
    describeServer({ command: "node" }, (defineTest) => {
      defineTest.only("only in group", async () => {});
      defineTest.skip("skip in group", async () => {});
    });
    const [onlyTest, skipTest] = testRegistry.slice(before);
    assert.equal(onlyTest.mode, "only");
    assert.equal(skipTest.mode, "skip");
    assert.equal(onlyTest.groupId, skipTest.groupId);
  });

  test("separate describeServer() calls get different groupIds", () => {
    const groupIds: number[] = [];
    describeServer({ command: "node" }, (defineTest) => {
      defineTest("a", async () => {});
      groupIds.push(lastPushed().groupId!);
    });
    describeServer({ command: "node" }, (defineTest) => {
      defineTest("b", async () => {});
      groupIds.push(lastPushed().groupId!);
    });
    assert.notEqual(groupIds[0], groupIds[1]);
  });
});

describe("runTests(): skip handling never needs a real connection", () => {
  // An unreachable command proves these paths never actually try to connect —
  // if they did, this would hang or throw instead of resolving immediately.
  const unreachableServer = { command: "definitely-not-a-real-command-xyz" };

  test("mode: 'skip' tests are reported as skipped, unrun", async () => {
    const results = await runTests(
      [{ name: "skip me", server: unreachableServer, fn: async () => {}, mode: "skip" as const }],
      false,
    );
    assert.equal(results.length, 1);
    assert.equal(results[0].status, "skip");
    assert.equal(results[0].durationMs, 0);
  });

  test("when anyOnly is true, every non-only test is skipped", async () => {
    const results = await runTests(
      [
        { name: "not only, a", server: unreachableServer, fn: async () => {} },
        { name: "not only, b", server: unreachableServer, fn: async () => {} },
      ],
      true,
    );
    assert.equal(results.every((r) => r.status === "skip"), true);
  });
});
