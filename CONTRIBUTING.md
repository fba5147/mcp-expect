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

There's no mocked test harness — every suite spins up a real MCP server and
talks to it over the real transport.

```bash
npm run test:example              # local demo server
npm run test:everything-server    # @modelcontextprotocol/server-everything
npm run test:filesystem-server    # @modelcontextprotocol/server-filesystem
npm run demo:fail                 # the one deliberately-failing assertion
npm run coverage                  # c8 coverage of src/
```

`npm run build` must pass (`tsc` with `strict: true`) before any of the above will run.

## Making a change

1. If you're fixing a bug or adding an assertion, add or extend a test in
   `example/*.mcptest.ts` against a real server — a demo-server tool if the
   behavior is generic, or one of the reference servers if you're testing
   how it handles a real-world quirk.
2. Keep the existing style: no comments explaining *what* code does, only
   *why* when something is non-obvious. No speculative abstractions for
   features that don't exist yet.
3. If you're touching a documented claim in the README (performance
   numbers, dependency list, feature scope), verify it against the actual
   code or a real measurement before writing it down — see the
   "Performance characteristics" section for the standard this project
   holds itself to.
4. Open a PR. CI runs the full suite (Node 24, all three real-server
   suites) on every push.

## Looking for something to work on?

Check issues labeled [`good first issue`](https://github.com/fba5147/mcp-expect/labels/good%20first%20issue).

## Code of Conduct

This project follows the [Code of Conduct](./CODE_OF_CONDUCT.md).
