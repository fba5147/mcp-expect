import http from "node:http";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// A minimal, spec-correct (stateful, session-ID-tracked) Streamable HTTP
// server, built on plain node:http rather than express — this exists so
// example/http-server.mcptest.ts can exercise the Streamable HTTP transport
// path, which otherwise has zero real coverage (every other example server
// runs over stdio).
function createMcpServer(): McpServer {
  const server = new McpServer({ name: "http-demo-server", version: "1.0.0" });
  server.tool("ping", { value: z.string() }, async ({ value }) => ({
    content: [{ type: "text", text: JSON.stringify({ pong: value }) }],
    structuredContent: { pong: value },
  }));
  return server;
}

const transports: Record<string, StreamableHTTPServerTransport> = {};

function readJsonBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk: Buffer) => {
      raw += chunk;
    });
    req.on("end", () => {
      if (!raw) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
    req.on("error", reject);
  });
}

const httpServer = http.createServer(async (req, res) => {
  if (req.url !== "/mcp") {
    res.writeHead(404).end();
    return;
  }

  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (req.method === "POST") {
    let body: unknown;
    try {
      body = await readJsonBody(req);
    } catch {
      res.writeHead(400).end();
      return;
    }

    let transport = sessionId ? transports[sessionId] : undefined;
    if (!transport) {
      if (sessionId || !isInitializeRequest(body)) {
        res.writeHead(400, { "content-type": "application/json" }).end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32000, message: "Bad Request: No valid session ID provided" },
            id: null,
          }),
        );
        return;
      }
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
          transports[id] = transport!;
        },
      });
      transport.onclose = () => {
        const sid = transport!.sessionId;
        if (sid) delete transports[sid];
      };
      await createMcpServer().connect(transport);
    }
    await transport.handleRequest(req, res, body);
    return;
  }

  if (req.method === "GET" || req.method === "DELETE") {
    const transport = sessionId ? transports[sessionId] : undefined;
    if (!transport) {
      res.writeHead(400).end("Invalid or missing session ID");
      return;
    }
    await transport.handleRequest(req, res);
    return;
  }

  res.writeHead(405).end();
});

const PORT = Number(process.env.PORT ?? 4310);
httpServer.listen(PORT, "127.0.0.1", () => {
  console.log(`http-demo-server listening on http://127.0.0.1:${PORT}/mcp`);
});
