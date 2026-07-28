import { test } from "node:test";
import assert from "node:assert/strict";
import { isHttpConfig } from "../src/client.js";

test("isHttpConfig: true for a config with a url", () => {
  assert.equal(isHttpConfig({ url: "http://localhost:3000/mcp" }), true);
});

test("isHttpConfig: false for a stdio config (command/args)", () => {
  assert.equal(isHttpConfig({ command: "node", args: ["server.js"] }), false);
});

test("isHttpConfig: false for a stdio config with no args", () => {
  assert.equal(isHttpConfig({ command: "node" }), false);
});
