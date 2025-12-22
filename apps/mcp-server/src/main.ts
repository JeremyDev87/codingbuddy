#!/usr/bin/env node
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { McpService } from './mcp/mcp.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const transportMode = process.env.MCP_TRANSPORT || 'stdio';

  if (transportMode === 'sse') {
    // SSE Mode: Run as HTTP Server
    const app = await NestFactory.create(AppModule);
    const port = process.env.PORT || 3000;
    await app.listen(port);
    logger.log(`MCP Server running in SSE mode on port ${port}`);
  } else {
    // Stdio Mode: Run as Standalone App
    const app = await NestFactory.createApplicationContext(AppModule);
    const mcpService = app.get(McpService);
    await mcpService.startStdio();
    logger.log('MCP Server running in Stdio mode');
  }
}
bootstrap();
