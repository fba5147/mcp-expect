# Contributing to mcp-expect

Thanks for considering a contribution. This is a small, focused project — the
bar for a PR is "does it fit the [v1 scope](./README.md#what-this-is-not-v1-scope)
and does it come with a real test against a real server," not "is it clever."

## Setup

```bash
git clone https://github.com/fba5147/mcp-expect.git
cd mcp-expect
npm install
```

## Running the test suites

Two tiers: fast unit tests against a fake `Client` (`test/`, Node's built-in
`node:test`), and e2e suites that spin up a real MCP server over a real
transport (`example/*.mcptest.ts`).

```bash
npm run test:unit                 # fake-Client unit tests, no real server
npm run test:example              # local demo server (stdio)
npm run test:everything-server    # @modelcontextprotocol/server-everything (stdio)
npm run test:filesystem-server    # @modelcontextprotocol/server-filesystem (stdio)
npm run test:http-server          # example/http-server.ts (Streamable HTTP)
npm run demo:fail                 # the one deliberately-failing assertion
npm run coverage                  # c8 coverage of src/, unit + e2e combined
```

`npm run build` must pass (`tsc` with `strict: true`) before any of the above will run.

## Making a change

1. Pick the right tier: extend `test/*.test.ts` with a fake `Client` for
   assertion-logic edge cases (error branches, malformed results, argument
   validation), or add/extend a test in `example/*.mcptest.ts` against a
   real server if you're testing how it handles a real-world quirk (a demo
   server tool if the behavior is generic, one of the reference servers or
   the HTTP fixture otherwise).
2. Keep the existing style: no comments explaining *what* code does, only
   *why* when something is non-obvious. No speculative abstractions for
   features that don't exist yet.
3. If you're touching a documented claim in the README (performance
   numbers, dependency list, feature scope), verify it against the actual
   code or a real measurement before writing it down — see the
   "Performance characteristics" section for the standard this project
   holds itself to.
4. Open a PR. CI runs the full suite (Node 24, unit tests, and all four
   real-server suites) on every push.

## Looking for something to work on?

Check issues labeled [`good first issue`](https://github.com/fba5147/mcp-expect/labels/good%20first%20issue).

## Code of Conduct

This project follows the [Code of Conduct](./CODE_OF_CONDUCT.md).
