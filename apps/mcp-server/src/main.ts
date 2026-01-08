#!/usr/bin/env node
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { McpService } from './mcp/mcp.service';

/**
 * Parse CORS origin configuration from environment variable
 * Supports: single origin, comma-separated list, or '*' for all origins
 */
function parseCorsOrigin(
  corsOrigin: string | undefined,
): string | string[] | boolean {
  if (!corsOrigin) {
    // Default: no CORS (most restrictive)
    return false;
  }

  if (corsOrigin === '*') {
    // Allow all origins
    return true;
  }

  if (corsOrigin.includes(',')) {
    // Multiple origins
    return corsOrigin.split(',').map(o => o.trim());
  }

  // Single origin
  return corsOrigin;
}

/**
 * Log to stderr for debugging in stdio mode
 * Use MCP_DEBUG=1 to enable debug output
 */
function debugLog(message: string): void {
  if (process.env.MCP_DEBUG === '1') {
    process.stderr.write(`[codingbuddy] ${message}\n`);
  }
}

export async function bootstrap(): Promise<void> {
  const transportMode = process.env.MCP_TRANSPORT || 'stdio';

  if (transportMode === 'sse') {
    // Import Logger only when needed (SSE mode)
    const { Logger } = await import('@nestjs/common');
    const logger = new Logger('Bootstrap');
    // SSE Mode: Run as HTTP Server with CORS configuration
    const corsOrigin = parseCorsOrigin(process.env.CORS_ORIGIN);
    const app = await NestFactory.create(AppModule, {
      cors: corsOrigin !== false ? { origin: corsOrigin } : false,
    });
    const port = process.env.PORT || 3000;
    await app.listen(port);

    // Log CORS configuration
    if (corsOrigin === false) {
      logger.warn('SSE mode: CORS disabled (set CORS_ORIGIN to enable)');
    } else if (corsOrigin === true) {
      logger.warn('SSE mode: CORS enabled for all origins (*)');
    } else {
      logger.log(`SSE mode: CORS enabled for: ${JSON.stringify(corsOrigin)}`);
    }

    logger.log(`MCP Server running in SSE mode on port ${port}`);
  } else {
    // Stdio Mode: Run as Standalone App
    // Disable NestJS logger to prevent ANSI color codes from breaking MCP protocol
    // MCP uses stdio for JSON-RPC communication, so stdout must only contain JSON messages
    debugLog('Starting in stdio mode...');
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
    });
    const mcpService = app.get(McpService);
    await mcpService.startStdio();
    debugLog('MCP Server connected via stdio');
  }
}

// Run if executed directly
if (require.main === module) {
  bootstrap();
}
