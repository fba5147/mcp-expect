# mcp-testing-kit

[![CI](https://github.com/fba5147/mcp-testing/actions/workflows/ci.yml/badge.svg)](https://github.com/fba5147/mcp-testing/actions/workflows/ci.yml)

Jest-style assertions for testing MCP (Model Context Protocol) servers.

![mcp-testing-kit running the example suite, then showing a failing assertion](./assets/demo.gif)

```ts
defineTest("search tool", { command: "node", args: ["server.js"] }, async ({ expect }) => {
  await expect.tool("search").exists();

  await expect.tool("search")
    .withInput({ query: "hello" })
    .respondsWithin(2000);

  await expect.tool("search")
    .withInput({ query: 123 })       // wrong type
    .rejectsInvalidInput();

  await expect.tool("search")
    .withInput({ query: "hello" })
    .returnsSchema({ results: "array" });
});
```

Run it, get a real pass/fail report — no writing raw `client.callTool()` calls, no guessing why an AI coding assistant thinks your working server is broken.

## Why

MCP servers fail in a small number of very specific ways: a tool isn't actually
registered, a handler hangs, a schema silently accepts bad input, or a result
doesn't look like what the caller expects. Those are exactly the four
assertions below. This is deliberately not a general test framework — it's a
thin, opinionated layer on the official `@modelcontextprotocol/sdk` client
aimed at catching those four failure modes in CI, before an agent has to
discover them at runtime.

## Install

```bash
npm install --save-dev mcp-testing-kit zod
```

## Quickstart

1. Write a test file ending in `.mcptest.ts` (compile it, or run via `tsx`/`ts-node`):

```ts
// search.mcptest.ts
import { defineTest } from "mcp-testing-kit";

const server = { command: "node", args: ["./dist/server.js"] };

defineTest("search tool is registered", server, async ({ expect }) => {
  await expect.tool("search").exists();
});
```

2. Run it:

```bash
npx mcp-testing-kit "dist/**/*.mcptest.js"
```

You'll get colored pass/fail output and a non-zero exit code on failure, so it
drops straight into CI.

## Server configs

Two transports are supported out of the box:

```ts
// stdio — the server is a local process
{ command: "node", args: ["server.js"], env: { API_KEY: "..." } }

// Streamable HTTP — the server is already running somewhere
{ url: "http://localhost:3000/mcp", headers: { Authorization: "Bearer ..." } }
```

A fresh connection is made per test and closed afterward, so tests don't leak
state into one another.

## API reference

### `expect.tool(name)`

Returns a `ToolAssertion` for the given tool name, bound to the client for the
current test.

### `.withInput(args)`

Sets the arguments used by the assertions below it. Returns `this`, so it
chains.

### `.exists()`

Asserts the tool is registered and discoverable via `tools/list`.

### `.respondsWithin(ms)`

Asserts a call with the current input completes within `ms` and does not
return `isError: true`. This is the single most useful assertion in practice —
a hanging handler is the most common reason an AI coding assistant decides
your working MCP server is broken and starts "fixing" it.

### `.rejectsInvalidInput()`

Asserts the current input is rejected, either by a protocol-level schema
error or by an `isError: true` result. If the call silently succeeds, the
assertion fails — that's a sign your input schema is too loose.

### `.returnsSchema(shape)`

Asserts the result matches a **shallow** shape, e.g.
`{ results: "array", count: "number" }`. This is intentionally not full JSON
Schema validation — v1 scope is a quick shape check, not a validator.

## Running in GitHub Actions

```yaml
- run: npx mcp-testing-kit "dist/**/*.mcptest.js"
```

When `GITHUB_ACTIONS=true` is set (which GitHub does automatically), failures
are also emitted as `::error file=...::` annotations so they show up inline
on the PR diff, not just in the log.

## Working example

See [`example/`](./example) for a complete demo: a small MCP server exposing
a `search` tool, and a test file exercising all four assertions.

```bash
npm install
npm run test:example
```

Want to see what a failing assertion looks like? `example/red-demo.mcptest.ts`
is the same server with one deliberately-wrong expectation, kept in its own
file so it doesn't turn the main demo (or CI) red:

```bash
npm run demo:fail
```

Not convinced a testing library that only tests its own demo server proves
anything? `example/real-server.mcptest.ts` runs the same four assertions
against [`@modelcontextprotocol/server-everything`](https://www.npmjs.com/package/@modelcontextprotocol/server-everything),
the official MCP reference server maintained independently of this project:

```bash
npm run test:real-server
```

## What this is not (v1 scope)

- Not a multi-model grading harness — it doesn't judge how well an LLM
  interprets your tool descriptions.
- Not full JSON Schema validation — `.returnsSchema()` is a shallow check.
- Not a registry, discovery tool, or security scanner.

These may show up in later versions once the core assertion set has proven
useful in practice. Contributions and issues welcome.

## License

MIT
