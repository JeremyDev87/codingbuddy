const { spawn } = require('child_process');
const path = require('path');

// Path to the compiled server
const serverPath = path.join(__dirname, '../dist/main.js');

console.log(`🚀 Starting MCP Server from: ${serverPath}`);

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'inherit'], // Pipe stdin/stdout, inherit stderr for logs
});

// Buffer to store incoming data
let buffer = '';

server.stdout.on('data', data => {
  const chunk = data.toString();
  buffer += chunk;

  // Process complete messages (newline delimited)
  const lines = buffer.split('\n');
  buffer = lines.pop(); // Keep incomplete line in buffer

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const response = JSON.parse(line);
      console.log('📩 Received:', JSON.stringify(response, null, 2));
    } catch (e) {
      console.log('Received (Raw):', line);
    }
  }
});

// Send a JSON-RPC message
function send(msg) {
  console.log('bw Sending:', JSON.stringify(msg));
  server.stdin.write(JSON.stringify(msg) + '\n');
}

// Test Sequence
setTimeout(() => {
  // 1. Initialize
  send({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' },
    },
  });
}, 1000);

setTimeout(() => {
  // 2. List Resources
  send({
    jsonrpc: '2.0',
    id: 2,
    method: 'resources/list',
  });
}, 2000);

setTimeout(() => {
  // 3. List Tools
  send({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/list',
  });
}, 3000);

setTimeout(() => {
  console.log('🛑 Stopping server...');
  server.kill();
  process.exit(0);
}, 4000);
