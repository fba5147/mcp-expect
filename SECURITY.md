# Security Policy

## Supported Versions

`mcp-expect` is pre-1.0. Only the latest published version on npm is
supported — please upgrade before reporting an issue.

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Instead, report privately via
[GitHub Security Advisories](https://github.com/fba5147/mcp-expect/security/advisories/new),
or email fba5147@alumni.psu.edu. Include:

- A description of the vulnerability and its impact
- Steps to reproduce (a minimal `.mcptest.ts` file if applicable)
- The affected version

You should get a response within a few days. This is a small, solo-maintained
project — there's no formal SLA, but security reports get priority over
everything else.

## Scope

A couple of things worth being explicit about, given what this library does:

- **`.isSafeAgainst()` fuzzes *your* server with known-malicious payloads
  (path traversal, command injection).** That's the library working as
  intended, not a vulnerability in the library itself. Only run it against
  servers you own or are authorized to test.
- `mcp-expect` spawns child processes (stdio transport) or makes HTTP
  requests (Streamable HTTP) to whatever server config you give it. It does
  not sandbox or validate that server in any way — you are responsible for
  only pointing it at servers you trust to run.
- Vulnerabilities in a server *found by* `.isSafeAgainst()` are not
  vulnerabilities in `mcp-expect` — report those to the maintainer of the
  server you tested.
