#!/usr/bin/env node
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { McpService } from './mcp/mcp.service';
import { Logger } from '@nestjs/common';

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

export async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const transportMode = process.env.MCP_TRANSPORT || 'stdio';

  if (transportMode === 'sse') {
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
    const app = await NestFactory.createApplicationContext(AppModule);
    const mcpService = app.get(McpService);
    await mcpService.startStdio();
    logger.log('MCP Server running in Stdio mode');
  }
}

// Run if executed directly
if (require.main === module) {
  bootstrap();
}
