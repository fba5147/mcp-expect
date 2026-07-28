import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Ajv } from "ajv";
import { MCPAssertionError } from "./errors.js";
import { SECURITY_PAYLOADS, type SecurityCategory } from "./security-payloads.js";

/** Shallow type descriptor used by `.returnsSchema()`. Intentionally not full JSON Schema for v1. */
export type ShapeSpec = Record<string, "string" | "number" | "boolean" | "array" | "object">;

function typeOf(value: unknown): string {
  if (Array.isArray(value)) return "array";
  if (value === null) return "object";
  return typeof value;
}

/** Pulls a JS value out of an MCP tool result, preferring structuredContent over parsing text blocks. */
function extractResultValue(result: any): unknown {
  if (result && typeof result === "object" && "structuredContent" in result && result.structuredContent) {
    return result.structuredContent;
  }
  const textBlock = result?.content?.find((block: any) => block.type === "text");
  if (textBlock?.text) {
    try {
      return JSON.parse(textBlock.text);
    } catch {
      return textBlock.text;
    }
  }
  return undefined;
}

export class ToolAssertion {
  private input: Record<string, unknown> = {};

  constructor(
    private readonly client: Client,
    private readonly toolName: string,
  ) {}

  /** Sets the arguments used by the assertions below. Returns `this` for chaining. */
  withInput(input: Record<string, unknown>): this {
    this.input = input;
    return this;
  }

  /** Asserts the tool is registered and discoverable via `tools/list`. */
  async exists(): Promise<void> {
    const { tools } = await this.client.listTools();
    const names = tools.map((t) => t.name);
    if (!names.includes(this.toolName)) {
      throw new MCPAssertionError(`Tool "${this.toolName}" was not found on the server`, {
        expected: this.toolName,
        actual: names,
        hint: "Check the tool name matches exactly what the server registers, including case.",
      });
    }
  }

  /** Asserts a call with the given input completes within `ms` milliseconds and does not error. */
  async respondsWithin(ms: number): Promise<void> {
    const start = performance.now();
    try {
      const result: any = await this.client.callTool(
        { name: this.toolName, arguments: this.input },
        undefined,
        { timeout: ms },
      );
      const elapsed = performance.now() - start;
      if (result?.isError) {
        throw new MCPAssertionError(`Tool "${this.toolName}" returned an error result`, {
          actual: result.content,
          hint: "The call completed in time but the server reported isError: true.",
        });
      }
      if (elapsed > ms) {
        throw new MCPAssertionError(`Tool "${this.toolName}" was slower than expected`, {
          expected: `<= ${ms}ms`,
          actual: `${elapsed.toFixed(0)}ms`,
        });
      }
    } catch (err) {
      if (err instanceof MCPAssertionError) throw err;
      throw new MCPAssertionError(`Tool "${this.toolName}" did not respond within ${ms}ms`, {
        expected: `<= ${ms}ms`,
        actual: (err as Error).message,
        hint: "This usually means the handler is hanging — the most common cause of an AI assistant wrongly 'fixing' working MCP code.",
      });
    }
  }

  /** Asserts calling the tool with the current input is rejected as invalid, either at the protocol level or via isError. */
  async rejectsInvalidInput(): Promise<void> {
    try {
      const result: any = await this.client.callTool({ name: this.toolName, arguments: this.input });
      if (!result?.isError) {
        throw new MCPAssertionError(
          `Tool "${this.toolName}" accepted invalid input instead of rejecting it`,
          {
            expected: "isError: true, or a thrown protocol error",
            actual: result?.content ?? result,
            hint: "Tighten the tool's input schema so malformed arguments are rejected before the handler runs.",
          },
        );
      }
    } catch (err) {
      if (err instanceof MCPAssertionError) throw err;
      // A thrown error here means the SDK rejected the call at the protocol
      // level (e.g. schema validation) — that counts as a pass.
      return;
    }
  }

  /** Asserts the tool's result matches a shallow shape, e.g. `{ results: "array" }`. */
  async returnsSchema(shape: ShapeSpec): Promise<void> {
    const result: any = await this.client.callTool({ name: this.toolName, arguments: this.input });
    if (result?.isError) {
      throw new MCPAssertionError(`Tool "${this.toolName}" returned an error result instead of data`, {
        actual: result.content,
      });
    }
    const value = extractResultValue(result);
    const mismatches: string[] = [];
    for (const [key, expectedType] of Object.entries(shape)) {
      const actualValue = (value as Record<string, unknown> | undefined)?.[key];
      const actualType = typeOf(actualValue);
      if (actualValue === undefined) {
        mismatches.push(`"${key}" is missing`);
      } else if (actualType !== expectedType) {
        mismatches.push(`"${key}" expected ${expectedType}, got ${actualType}`);
      }
    }
    if (mismatches.length > 0) {
      throw new MCPAssertionError(`Tool "${this.toolName}" result did not match the expected schema`, {
        expected: shape,
        actual: value,
        hint: mismatches.join("; "),
      });
    }
  }

  /**
   * Asserts the tool's result matches the JSON Schema it declares itself in
   * `outputSchema` (via `tools/list`) — no manual shape spec needed. Fails
   * loudly if the tool doesn't declare one; use `.returnsSchema()` instead
   * for tools that don't.
   */
  async matchesOutputSchema(): Promise<void> {
    const { tools } = await this.client.listTools();
    const tool = tools.find((t) => t.name === this.toolName);
    if (!tool) {
      throw new MCPAssertionError(`Tool "${this.toolName}" was not found on the server`, {
        expected: this.toolName,
        actual: tools.map((t) => t.name),
      });
    }
    const outputSchema = (tool as { outputSchema?: object }).outputSchema;
    if (!outputSchema) {
      throw new MCPAssertionError(`Tool "${this.toolName}" does not declare an outputSchema`, {
        hint: "Use .returnsSchema({...}) for a shallow manual shape check instead, or add an outputSchema to the tool's registration on the server.",
      });
    }

    const result: any = await this.client.callTool({ name: this.toolName, arguments: this.input });
    if (result?.isError) {
      throw new MCPAssertionError(`Tool "${this.toolName}" returned an error result instead of data`, {
        actual: result.content,
      });
    }
    const value = extractResultValue(result);

    const ajv = new Ajv({ strict: false });
    const validate = ajv.compile(outputSchema);
    if (!validate(value)) {
      throw new MCPAssertionError(`Tool "${this.toolName}" result did not match its own declared outputSchema`, {
        expected: outputSchema,
        actual: value,
        hint: (validate.errors ?? [])
          .map((e: { instancePath: string; message?: string }) => `${e.instancePath || "(root)"} ${e.message}`)
          .join("; "),
      });
    }
  }

  /**
   * Fuzzes the given input field with known malicious payloads (path
   * traversal, command injection, ...) and asserts every one is rejected,
   * either via `isError: true` or a thrown protocol error. Any payload that
   * gets through is a real finding — the tool is likely passing this field
   * unchecked into a filesystem or shell call.
   */
  async isSafeAgainst(field: string, categories: SecurityCategory | SecurityCategory[]): Promise<void> {
    const categoryList = Array.isArray(categories) ? categories : [categories];
    const accepted: Array<{ category: SecurityCategory; payload: string; actual: unknown }> = [];

    for (const category of categoryList) {
      const payloads = SECURITY_PAYLOADS[category];
      if (!payloads) {
        throw new MCPAssertionError(`Unknown security category "${category}"`, {
          expected: Object.keys(SECURITY_PAYLOADS).join(", "),
          actual: category,
        });
      }
      for (const payload of payloads) {
        const input = { ...this.input, [field]: payload };
        try {
          const result: any = await this.client.callTool({ name: this.toolName, arguments: input });
          if (!result?.isError) {
            accepted.push({ category, payload, actual: result?.content ?? result });
          }
        } catch {
          // Thrown here means the SDK/server rejected the call at the
          // protocol level — that counts as safe, same as rejectsInvalidInput().
        }
      }
    }

    if (accepted.length > 0) {
      throw new MCPAssertionError(
        `Tool "${this.toolName}" accepted ${accepted.length} malicious payload(s) in "${field}" instead of rejecting them`,
        {
          expected: "isError: true, or a thrown error, for every payload",
          actual: accepted
            .map((a) => `[${a.category}] ${JSON.stringify(a.payload)} -> ${JSON.stringify(a.actual)}`)
            .join("\n"),
          hint: "The handler is likely passing this field into a filesystem or shell call without validating it — that's the exact bug class behind a large share of real-world MCP server vulnerabilities.",
        },
      );
    }
  }
}

/** Creates the fluent assertion entry point bound to an already-connected client. */
export function createExpect(client: Client) {
  return {
    tool(name: string): ToolAssertion {
      return new ToolAssertion(client, name);
    },
  };
}
