import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { createExpect } from "../src/expect.js";
import { MCPAssertionError } from "../src/errors.js";

interface FakeTool {
  name: string;
  outputSchema?: object;
}

interface FakeClientOptions {
  tools?: FakeTool[];
  /** Called for every `callTool`. Return a result, or throw to simulate a protocol-level rejection. */
  callTool?: (args: { name: string; arguments: Record<string, unknown> }) => unknown;
}

/** A minimal stand-in for the SDK's Client — only implements what ToolAssertion actually calls. */
function createFakeClient(opts: FakeClientOptions = {}): Client {
  const calls: Array<{ name: string; arguments: Record<string, unknown> }> = [];
  const fake = {
    listTools: async () => ({ tools: opts.tools ?? [] }),
    callTool: async (args: { name: string; arguments: Record<string, unknown> }) => {
      calls.push(args);
      if (!opts.callTool) return { content: [] };
      return opts.callTool(args);
    },
    __calls: calls,
  };
  return fake as unknown as Client;
}

function getCalls(client: Client): Array<{ name: string; arguments: Record<string, unknown> }> {
  return (client as unknown as { __calls: Array<{ name: string; arguments: Record<string, unknown> }> }).__calls;
}

async function assertRejectsAssertion(promise: Promise<unknown>, messageMatch: RegExp): Promise<void> {
  await assert.rejects(promise, (err: unknown) => {
    assert.ok(err instanceof MCPAssertionError);
    assert.match((err as Error).message, messageMatch);
    return true;
  });
}

describe("exists()", () => {
  test("passes when the tool is in listTools", async () => {
    const client = createFakeClient({ tools: [{ name: "search" }] });
    await createExpect(client).tool("search").exists();
  });

  test("fails with the full tool list when the tool is missing", async () => {
    const client = createFakeClient({ tools: [{ name: "other" }] });
    await assertRejectsAssertion(createExpect(client).tool("search").exists(), /was not found/);
  });
});

describe("respondsWithin()", () => {
  test("passes for a fast, non-error result", async () => {
    const client = createFakeClient({ callTool: () => ({ content: [] }) });
    await createExpect(client).tool("x").respondsWithin(1000);
  });

  test("fails when the result has isError: true, even though it was fast", async () => {
    const client = createFakeClient({ callTool: () => ({ isError: true, content: ["boom"] }) });
    await assertRejectsAssertion(
      createExpect(client).tool("x").respondsWithin(1000),
      /returned an error result/,
    );
  });

  test("fails when the call takes longer than the given timeout", async () => {
    const client = createFakeClient({
      callTool: async () => {
        await new Promise((resolve) => setTimeout(resolve, 30));
        return { content: [] };
      },
    });
    await assertRejectsAssertion(createExpect(client).tool("x").respondsWithin(5), /slower than expected/);
  });

  test("wraps a thrown protocol error as a timeout-style failure", async () => {
    const client = createFakeClient({
      callTool: () => {
        throw new Error("MCP error -32001: Request timed out");
      },
    });
    await assertRejectsAssertion(
      createExpect(client).tool("x").respondsWithin(1000),
      /did not respond within 1000ms/,
    );
  });
});

describe("rejectsInvalidInput()", () => {
  test("passes when the server returns isError: true", async () => {
    const client = createFakeClient({ callTool: () => ({ isError: true, content: [] }) });
    await createExpect(client).tool("x").rejectsInvalidInput();
  });

  test("passes when the server throws at the protocol level", async () => {
    const client = createFakeClient({
      callTool: () => {
        throw new Error("Invalid arguments");
      },
    });
    await createExpect(client).tool("x").rejectsInvalidInput();
  });

  test("fails when the server silently accepts the input", async () => {
    const client = createFakeClient({ callTool: () => ({ content: [{ type: "text", text: "ok" }] }) });
    await assertRejectsAssertion(
      createExpect(client).tool("x").rejectsInvalidInput(),
      /accepted invalid input/,
    );
  });
});

describe("returnsSchema()", () => {
  test("passes using structuredContent", async () => {
    const client = createFakeClient({ callTool: () => ({ structuredContent: { results: [], count: 0 } }) });
    await createExpect(client).tool("x").returnsSchema({ results: "array", count: "number" });
  });

  test("passes by parsing JSON out of a text content block when there's no structuredContent", async () => {
    const client = createFakeClient({
      callTool: () => ({ content: [{ type: "text", text: JSON.stringify({ results: [] }) }] }),
    });
    await createExpect(client).tool("x").returnsSchema({ results: "array" });
  });

  test("fails when the text block isn't JSON at all — the shape check reports the field as missing", async () => {
    const client = createFakeClient({ callTool: () => ({ content: [{ type: "text", text: "not json" }] }) });
    await assertRejectsAssertion(
      createExpect(client).tool("x").returnsSchema({ results: "array" }),
      /"results" is missing/,
    );
  });

  test("fails on a type mismatch", async () => {
    const client = createFakeClient({ callTool: () => ({ structuredContent: { count: "not a number" } }) });
    await assertRejectsAssertion(
      createExpect(client).tool("x").returnsSchema({ count: "number" }),
      /expected number, got string/,
    );
  });

  test("fails when the result is an error instead of data", async () => {
    const client = createFakeClient({ callTool: () => ({ isError: true, content: [] }) });
    await assertRejectsAssertion(
      createExpect(client).tool("x").returnsSchema({ count: "number" }),
      /error result instead of data/,
    );
  });
});

describe("matchesOutputSchema()", () => {
  const outputSchema = {
    type: "object",
    properties: { count: { type: "number" } },
    required: ["count"],
  };

  test("passes when the result matches the tool's own declared outputSchema", async () => {
    const client = createFakeClient({
      tools: [{ name: "x", outputSchema }],
      callTool: () => ({ structuredContent: { count: 3 } }),
    });
    await createExpect(client).tool("x").matchesOutputSchema();
  });

  test("fails when the tool isn't found at all", async () => {
    const client = createFakeClient({ tools: [] });
    await assertRejectsAssertion(createExpect(client).tool("x").matchesOutputSchema(), /was not found/);
  });

  test("fails with a clear hint when the tool declares no outputSchema", async () => {
    const client = createFakeClient({ tools: [{ name: "x" }] });
    await assertRejectsAssertion(
      createExpect(client).tool("x").matchesOutputSchema(),
      /does not declare an outputSchema/,
    );
  });

  test("fails when the result violates the tool's own schema", async () => {
    const client = createFakeClient({
      tools: [{ name: "x", outputSchema }],
      callTool: () => ({ structuredContent: { count: "not a number" } }),
    });
    await assertRejectsAssertion(
      createExpect(client).tool("x").matchesOutputSchema(),
      /did not match its own declared outputSchema/,
    );
  });
});

describe("isSafeAgainst()", () => {
  test("passes when every payload is rejected via isError", async () => {
    const client = createFakeClient({ callTool: () => ({ isError: true, content: [] }) });
    await createExpect(client).tool("x").withInput({ path: "safe.txt" }).isSafeAgainst("path", "path-traversal");
  });

  test("passes when every payload is rejected via a thrown error", async () => {
    const client = createFakeClient({
      callTool: () => {
        throw new Error("rejected");
      },
    });
    await createExpect(client).tool("x").isSafeAgainst("path", "path-traversal");
  });

  test("fails and reports the payload when even one is silently accepted", async () => {
    const client = createFakeClient({
      callTool: ({ arguments: args }) => {
        // Accept the very first path-traversal payload, reject the rest.
        if (args.path === "../../../../etc/passwd") return { content: [{ type: "text", text: "leaked" }] };
        return { isError: true, content: [] };
      },
    });
    await assertRejectsAssertion(
      createExpect(client).tool("x").isSafeAgainst("path", "path-traversal"),
      /accepted 1 malicious payload/,
    );
  });

  test("preserves the rest of withInput() while overriding only the fuzzed field", async () => {
    const client = createFakeClient({ callTool: () => ({ isError: true, content: [] }) });
    await createExpect(client)
      .tool("x")
      .withInput({ mode: "strict", path: "safe.txt" })
      .isSafeAgainst("path", "path-traversal");
    for (const call of getCalls(client)) {
      assert.equal(call.arguments.mode, "strict");
      assert.notEqual(call.arguments.path, "safe.txt");
    }
  });

  test("accepts a single category or an array of categories", async () => {
    const client = createFakeClient({ callTool: () => ({ isError: true, content: [] }) });
    await createExpect(client).tool("x").isSafeAgainst("cmd", ["path-traversal", "command-injection"]);
  });

  test("rejects an unknown category with a clear error", async () => {
    const client = createFakeClient({ callTool: () => ({ isError: true, content: [] }) });
    await assertRejectsAssertion(
      // @ts-expect-error deliberately passing an invalid category to test the runtime guard
      createExpect(client).tool("x").isSafeAgainst("path", "sql-injection"),
      /Unknown security category/,
    );
  });
});

describe("withInput()", () => {
  test("returns `this` for chaining and threads arguments through to callTool", async () => {
    const client = createFakeClient({ callTool: () => ({ content: [] }) });
    const assertion = createExpect(client).tool("x");
    assert.equal(assertion.withInput({ a: 1 }), assertion);
    await assertion.respondsWithin(1000);
    assert.deepEqual(getCalls(client)[0].arguments, { a: 1 });
  });

  test("defaults to an empty object when never called", async () => {
    const client = createFakeClient({ callTool: () => ({ content: [] }) });
    await createExpect(client).tool("x").respondsWithin(1000);
    assert.deepEqual(getCalls(client)[0].arguments, {});
  });
});
