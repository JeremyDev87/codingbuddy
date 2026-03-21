# MCP Protocol Quick Reference

## Protocol Overview

The Model Context Protocol (MCP) uses JSON-RPC 2.0 over stdio or HTTP+SSE transport. Servers expose three capability types: **Tools**, **Resources**, and **Prompts**.

## JSON-RPC 2.0 Message Format

### Request

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "search_rules",
    "arguments": { "query": "TDD" }
  }
}
```

### Response (Success)

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{ "type": "text", "text": "..." }]
  }
}
```

### Response (Error)

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32601,
    "message": "Method not found"
  }
}
```

## Capability Methods

### Tools

| Method | Direction | Description |
|--------|-----------|-------------|
| `tools/list` | Client → Server | List available tools with schemas |
| `tools/call` | Client → Server | Execute a tool by name with arguments |

**Tool Result Shape:**

```typescript
interface ToolResult {
  content: ContentBlock[];  // text, image, or resource content
  isError?: boolean;        // true if the tool encountered an error
}

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; data: string; mimeType: string }
  | { type: 'resource'; resource: ResourceContent };
```

### Resources

| Method | Direction | Description |
|--------|-----------|-------------|
| `resources/list` | Client → Server | List available resources |
| `resources/templates/list` | Client → Server | List URI templates for dynamic resources |
| `resources/read` | Client → Server | Read a resource by URI |
| `notifications/resources/list_changed` | Server → Client | Notify resource list changed |

**Resource Shape:**

```typescript
interface Resource {
  uri: string;          // e.g., "rules://core"
  name: string;         // Human-readable name
  description?: string; // What this resource contains
  mimeType?: string;    // e.g., "text/markdown", "application/json"
}

interface ResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;   // For text content
  blob?: string;   // For binary content (base64)
}
```

### Prompts

| Method | Direction | Description |
|--------|-----------|-------------|
| `prompts/list` | Client → Server | List available prompt templates |
| `prompts/get` | Client → Server | Get a prompt with arguments filled in |

**Prompt Shape:**

```typescript
interface Prompt {
  name: string;
  description?: string;
  arguments?: PromptArgument[];
}

interface PromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

interface GetPromptResult {
  messages: Array<{
    role: 'user' | 'assistant';
    content: TextContent | ImageContent | EmbeddedResource;
  }>;
}
```

## Initialization Handshake

```
Client                          Server
  |                                |
  |-- initialize ----------------->|   (capabilities, clientInfo)
  |<-- initialize result ----------|   (capabilities, serverInfo)
  |-- notifications/initialized -->|   (confirm ready)
  |                                |
  |-- tools/list ----------------->|   (discover tools)
  |-- resources/list ------------->|   (discover resources)
  |-- prompts/list --------------->|   (discover prompts)
```

### Server Capabilities Declaration

```typescript
const serverCapabilities = {
  tools: {},                    // Server provides tools
  resources: {
    subscribe: true,            // Supports resource subscriptions
    listChanged: true,          // Sends list_changed notifications
  },
  prompts: {
    listChanged: true,          // Sends list_changed notifications
  },
};
```

## Transport Modes

### Stdio

- Server reads JSON-RPC from stdin, writes to stdout
- Logs MUST go to stderr (never stdout)
- One message per line (newline-delimited JSON)
- No HTTP overhead, fastest for local use

### HTTP + SSE

- Client opens SSE connection at `GET /sse`
- Server sends `endpoint` event with message URL
- Client sends JSON-RPC via `POST /messages`
- Server streams responses via SSE

```
Client                              Server
  |                                    |
  |-- GET /sse ----------------------->|   (open SSE stream)
  |<-- event: endpoint ---------------|   (data: /messages?sessionId=abc)
  |                                    |
  |-- POST /messages?sessionId=abc --->|   (JSON-RPC request)
  |<-- event: message ----------------|   (JSON-RPC response via SSE)
```

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| `-32700` | Parse error | Invalid JSON |
| `-32600` | Invalid request | Missing required fields |
| `-32601` | Method not found | Unknown method |
| `-32602` | Invalid params | Wrong parameter types |
| `-32603` | Internal error | Server-side error |

## Input Schema Best Practices

- Always set `type: 'object'` at the top level
- Mark required parameters in the `required` array
- Add `description` to every property (LLMs use these to decide how to call)
- Use `minLength`, `maximum`, `enum` constraints where applicable
- Set sensible `default` values for optional parameters

## URI Scheme Conventions

```
scheme://authority/path

rules://core                   → Core rules
rules://augmented-coding       → Augmented coding rules
agents://solution-architect    → Agent definition
config://project               → Project config
skills://mcp-builder           → Skill content
```

- Use lowercase, hyphen-separated paths
- Scheme should indicate the resource domain
- Path should be human-readable and predictable
