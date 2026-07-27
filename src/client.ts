import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export interface StdioServerConfig {
  /** Command to launch the server, e.g. "node" */
  command: string;
  /** Arguments passed to the command, e.g. ["server.js"] */
  args?: string[];
  /** Extra environment variables for the spawned process */
  env?: Record<string, string>;
}

export interface HttpServerConfig {
  /** URL of a running Streamable HTTP MCP server */
  url: string;
  headers?: Record<string, string>;
}

export type ServerConfig = StdioServerConfig | HttpServerConfig;

function isHttpConfig(config: ServerConfig): config is HttpServerConfig {
  return "url" in config;
}

export interface ConnectedServer {
  client: Client;
  close: () => Promise<void>;
}

/**
 * Connects to an MCP server over stdio or Streamable HTTP and returns a ready
 * `Client` plus a `close()` cleanup function. This is the only place the raw
 * SDK transport classes are touched — everything else in the library talks
 * to this thin wrapper.
 */
export async function connectToServer(config: ServerConfig): Promise<ConnectedServer> {
  const client = new Client({ name: "mcp-testing-kit", version: "0.1.0" });

  if (isHttpConfig(config)) {
    const transport = new StreamableHTTPClientTransport(new URL(config.url), {
      requestInit: config.headers ? { headers: config.headers } : undefined,
    });
    await client.connect(transport);
    return {
      client,
      close: async () => {
        await client.close();
      },
    };
  }

  const transport = new StdioClientTransport({
    command: config.command,
    args: config.args ?? [],
    env: config.env,
  });
  await client.connect(transport);
  return {
    client,
    close: async () => {
      await client.close();
    },
  };
}
