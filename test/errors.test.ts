import { test } from "node:test";
import assert from "node:assert/strict";
import { MCPAssertionError } from "../src/errors.js";

test("MCPAssertionError: message alone, no details", () => {
  const err = new MCPAssertionError("something went wrong");
  assert.equal(err.message, "something went wrong");
  assert.equal(err.name, "MCPAssertionError");
  assert.equal(err.expected, undefined);
  assert.equal(err.actual, undefined);
  assert.equal(err.hint, undefined);
});

test("MCPAssertionError: formats expected/actual/hint as separate lines", () => {
  const err = new MCPAssertionError("mismatch", {
    expected: "foo",
    actual: "bar",
    hint: "check the spelling",
  });
  assert.equal(
    err.message,
    ["mismatch", "  expected: foo", "  actual:   bar", "  hint:     check the spelling"].join("\n"),
  );
});

test("MCPAssertionError: non-string expected/actual are JSON-stringified", () => {
  const err = new MCPAssertionError("bad shape", {
    expected: { results: "array" },
    actual: { results: 42 },
  });
  assert.match(err.message, /expected: \{"results":"array"\}/);
  assert.match(err.message, /actual:   \{"results":42\}/);
});

test("MCPAssertionError: circular actual value falls back to String() instead of throwing", () => {
  const circular: Record<string, unknown> = {};
  circular.self = circular;
  assert.doesNotThrow(() => new MCPAssertionError("circular", { actual: circular }));
});

test("MCPAssertionError: omits a details line entirely when that field is absent", () => {
  const err = new MCPAssertionError("only expected", { expected: "x" });
  assert.ok(!err.message.includes("actual:"));
  assert.ok(!err.message.includes("hint:"));
});

test("MCPAssertionError: is a real Error (instanceof, stack trace)", () => {
  const err = new MCPAssertionError("x");
  assert.ok(err instanceof Error);
  assert.ok(typeof err.stack === "string");
});
