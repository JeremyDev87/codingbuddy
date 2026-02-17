import type { VercelRequest, VercelResponse } from '@vercel/node';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { McpServerlessService } from '../src/mcp/mcp-serverless';

// Constants
const MAX_BODY_SIZE = 1024 * 1024; // 1MB limit
const ALLOWED_METHODS = ['GET', 'POST', 'DELETE', 'OPTIONS'];

// Singleton service instance (reused across warm invocations)
let mcpService: McpServerlessService | null = null;

function getService(): McpServerlessService {
  if (!mcpService) {
    mcpService = new McpServerlessService();
  }
  return mcpService;
}

function jsonRpcError(
  res: VercelResponse,
  code: number,
  message: string,
  status: number = 500,
): void {
  res.status(status).json({
    jsonrpc: '2.0',
    error: { code, message },
    id: null,
  });
}

async function parseBody(req: VercelRequest): Promise<unknown> {
  // Vercel may already parse body in some cases
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  // Manual parsing for streaming body
  const chunks: Buffer[] = [];
  let totalSize = 0;

  for await (const chunk of req as unknown as AsyncIterable<Buffer>) {
    totalSize += chunk.length;
    if (totalSize > MAX_BODY_SIZE) {
      throw new Error('PAYLOAD_TOO_LARGE');
    }
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return undefined;
  }

  const bodyStr = Buffer.concat(chunks).toString('utf-8');
  return JSON.parse(bodyStr);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS.join(', '));
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Validate method
  if (!req.method || !ALLOWED_METHODS.includes(req.method)) {
    return jsonRpcError(res, -32600, 'Method not allowed', 405);
  }

  // Check Content-Length header for early rejection
  const contentLength = req.headers['content-length'];
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    return jsonRpcError(res, -32700, 'Request entity too large', 413);
  }

  // Validate Content-Type for POST
  if (req.method === 'POST') {
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('application/json')) {
      return jsonRpcError(res, -32700, 'Unsupported Media Type: expected application/json', 415);
    }
  }

  try {
    // Parse request body
    let body: unknown;
    if (req.method === 'POST') {
      try {
        body = await parseBody(req);
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message === 'PAYLOAD_TOO_LARGE') {
          return jsonRpcError(res, -32700, 'Request entity too large', 413);
        }
        console.error('Body parse error:', parseError);
        return jsonRpcError(res, -32700, 'Parse error: invalid JSON', 400);
      }
    }

    const service = getService();
    const server = service.getServer();

    // Create stateless transport for this request
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // Stateless mode
      enableJsonResponse: true,
    });

    // Connect server to transport
    await server.connect(transport);

    // Handle the request
    await transport.handleRequest(
      req as unknown as import('express').Request,
      res as unknown as import('express').Response,
      body,
    );
  } catch (error) {
    console.error('MCP handler error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return jsonRpcError(res, -32603, message);
  }
}
