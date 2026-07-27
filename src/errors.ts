export interface AssertionDetails {
  expected?: unknown;
  actual?: unknown;
  hint?: string;
}

/**
 * Thrown whenever an `expect().tool()` assertion fails.
 * Carries structured expected/actual data so reporters (CLI, CI annotations)
 * can render a real diff instead of a bare stack trace.
 */
export class MCPAssertionError extends Error {
  readonly expected?: unknown;
  readonly actual?: unknown;
  readonly hint?: string;

  constructor(message: string, details: AssertionDetails = {}) {
    super(MCPAssertionError.formatMessage(message, details));
    this.name = "MCPAssertionError";
    this.expected = details.expected;
    this.actual = details.actual;
    this.hint = details.hint;
    Error.captureStackTrace?.(this, MCPAssertionError);
  }

  private static formatMessage(message: string, details: AssertionDetails): string {
    const lines = [message];
    if (details.expected !== undefined) {
      lines.push(`  expected: ${MCPAssertionError.stringify(details.expected)}`);
    }
    if (details.actual !== undefined) {
      lines.push(`  actual:   ${MCPAssertionError.stringify(details.actual)}`);
    }
    if (details.hint) {
      lines.push(`  hint:     ${details.hint}`);
    }
    return lines.join("\n");
  }

  private static stringify(value: unknown): string {
    if (typeof value === "string") return value;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
}
