# Codebuddy Rules MCP Server

A NestJS-based Model Context Protocol (MCP) server that exposes the Multi-AI Rules System (`.ai-rules/`) to AI clients.

## Features

- **Resources**: Access rule files directly (`rules://core`, `rules://agents/frontend-developer`, etc.)
- **Tools**: Search rules (`search_rules`) and get agent profiles (`get_agent_details`).
- **Prompts**: Activate agents with context (`activate_agent`).

## Prerequisites

- Node.js v18+

## Installation

### Option 1: npx (Recommended - No Installation Required)

Add the following configuration to your Claude Desktop config:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "codebuddy-rules": {
      "command": "npx",
      "args": ["@wishket/codebuddy"]
    }
  }
}
```

### Option 2: Global Installation

```bash
npm install -g @wishket/codebuddy
```

Then configure Claude Desktop:

```json
{
  "mcpServers": {
    "codebuddy-rules": {
      "command": "codebuddy-mcp"
    }
  }
}
```

### Option 3: Local Development (Stdio Mode)

```bash
cd mcp-server
yarn install
yarn build
```

```json
{
  "mcpServers": {
    "codebuddy-rules": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/codebuddy/mcp-server/dist/main.js"]
    }
  }
}
```

Replace `/ABSOLUTE/PATH/TO` with your actual path.

### Option 4: AWS Fargate / Docker - SSE Mode

Build the Docker image from the **repository root**:

```bash
# Run from codebuddy root
docker build -f mcp-server/Dockerfile -t codebuddy-rules-mcp .
```

Run the container:

```bash
docker run -p 3000:3000 \
  -e MCP_TRANSPORT=sse \
  -e PORT=3000 \
  codebuddy-rules-mcp
```

The server will start in SSE mode, exposing:
- `GET /sse`: SSE Endpoint
- `POST /messages`: Message Endpoint

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MCP_TRANSPORT` | Transport mode (`stdio` or `sse`) | `stdio` |
| `PORT` | HTTP port for SSE mode | `3000` |
| `CODEBUDDY_RULES_DIR` | Custom path to `.ai-rules` directory | Auto-detected |

## Development

```bash
# Watch mode
yarn start:dev
```

## Testing

### 1. Using MCP Inspector (Recommended)

The [MCP Inspector](https://github.com/modelcontextprotocol/inspector) is a web-based tool to interactively test your MCP server.

```bash
# Build the server first
yarn build

# Run with Inspector
npx @modelcontextprotocol/inspector node dist/main.js
```

### 2. Manual Test Script

A simple script is provided to verify basic connectivity and JSON-RPC responses.

```bash
# Build the server
yarn build

# Run the test script
node test/manual-client.js
```

## Publishing

Automated via GitHub Actions on `master` push.

1. **Update Version**:
   ```bash
   npm version patch # or minor, major
   ```

2. **Push to Master**:
   ```bash
   git push
   ```

The workflow will:
1. Detect version change.
2. Create a GitHub Release (e.g., `v1.0.1`).
3. Publish to NPM as `@wishket/codebuddy`.

