/** Categories of payloads `.isSafeAgainst()` can fuzz a tool's input field with. */
export type SecurityCategory = "path-traversal" | "command-injection";

/**
 * Deliberately small, well-known payload lists — this is a smoke test for the
 * most common real-world MCP tool bugs (a string field passed unchecked into
 * a filesystem or shell call), not a general-purpose fuzzer.
 */
export const SECURITY_PAYLOADS: Record<SecurityCategory, string[]> = {
  "path-traversal": [
    "../../../../etc/passwd",
    "..\\..\\..\\..\\windows\\win.ini",
    "....//....//....//etc/passwd",
    "/etc/passwd",
    "%2e%2e%2fetc%2fpasswd",
    "file:///etc/passwd",
  ],
  "command-injection": ["; whoami", "$(whoami)", "`whoami`", "| whoami", "&& whoami", "\nwhoami"],
};
