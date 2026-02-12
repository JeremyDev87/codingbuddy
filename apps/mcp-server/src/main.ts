#!/usr/bin/env node
import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';
import { AppModule } from './app.module';
import { McpService } from './mcp/mcp.service';
import { hasTuiFlag } from './tui/cli-flags';

/** Minimal subset of Ink's Instance used for lifecycle management */
interface TuiInstance {
  readonly unmount: () => void;
}

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

/**
 * Set up graceful shutdown for Ink TUI instance
 * Unmounts the Ink application and closes NestJS on SIGINT/SIGTERM
 */
function setupGracefulShutdown(
  instance: TuiInstance,
  app: INestApplicationContext,
): void {
  let shuttingDown = false;
  const shutdown = async (): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    debugLog('Graceful shutdown: unmounting TUI...');
    instance.unmount();
    await app.close();
    process.exit(0);
  };

  process.once('SIGINT', () => void shutdown());
  process.once('SIGTERM', () => void shutdown());
}

/**
 * Initialize TUI Agent Monitor with dynamic imports
 * Isolates React/Ink dependencies behind --tui flag
 */
async function initTui(
  app: INestApplicationContext,
  stdout?: NodeJS.WriteStream,
): Promise<void> {
  const { TuiEventBus } = await import('./tui/events');
  const { startTui } = await import('./tui');
  const eventBus = app.get(TuiEventBus);
  const instance = startTui({ eventBus, ...(stdout ? { stdout } : {}) });
  setupGracefulShutdown(instance, app);
}

export async function bootstrap(): Promise<void> {
  const transportMode = process.env.MCP_TRANSPORT || 'stdio';
  const tuiEnabled = hasTuiFlag(process.argv);

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

    // TUI: SSE mode renders to stdout
    if (tuiEnabled) {
      try {
        await initTui(app);
        logger.log('TUI Agent Monitor started (stdout)');
      } catch (error) {
        logger.error('Failed to start TUI Agent Monitor', error);
      }
    }
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

    // TUI: stdio mode renders to stderr (protect stdout for MCP JSON-RPC)
    if (tuiEnabled && process.stderr.isTTY) {
      try {
        await initTui(app, process.stderr);
        debugLog('TUI Agent Monitor started (stderr)');
      } catch (error) {
        debugLog(`Failed to start TUI Agent Monitor: ${error}`);
      }
    } else if (tuiEnabled) {
      debugLog('TUI requested but stderr is not a TTY; skipping TUI render');
    }
  }
}

// Run if executed directly
if (require.main === module) {
  bootstrap();
}
