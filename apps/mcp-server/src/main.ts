#!/usr/bin/env node
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';
import { AppModule } from './app.module';
import { McpService } from './mcp/mcp.service';
import { hasTuiFlag } from './tui/cli-flags';
import { resolveTuiConfig } from './tui/tui-config';

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
 * Real dynamic import() that preserves ESM loading in CJS output.
 * TypeScript compiles import() to require() in CommonJS mode,
 * but ink v6+ requires ESM with top-level await.
 */
const esmImport = new Function('s', 'return import(s)') as (
  specifier: string,
) => Promise<any>;

/**
 * Initialize TUI Agent Monitor with dynamic imports
 * Isolates React/Ink dependencies behind --tui flag
 */
async function initTui(
  app: INestApplicationContext,
  stdout?: NodeJS.WriteStream,
): Promise<void> {
  const { TuiEventBus, TuiInterceptor, AgentMetadataService, TUI_EVENTS } =
    await import('./tui/events');
  const { startTui } = await esmImport(
    path.resolve(__dirname, 'tui-bundle.mjs'),
  );
  const tuiInterceptor = app.get(TuiInterceptor);
  tuiInterceptor.enable();
  const eventBus = app.get(TuiEventBus);
  const instance = startTui({ eventBus, ...(stdout ? { stdout } : {}) });

  // Load and emit all agent metadata for AgentGrid
  const metadataService = app.get(AgentMetadataService);
  await metadataService.initialize();
  const allAgents = metadataService.getAllMetadata();
  if (allAgents.length > 0) {
    eventBus.emit(TUI_EVENTS.AGENTS_LOADED, { agents: allAgents });
  }

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
    const tuiConfig = resolveTuiConfig({
      transportMode: 'sse',
      tuiEnabled,
      stderrIsTTY: process.stderr.isTTY ?? false,
    });
    if (tuiConfig.shouldRender) {
      try {
        await initTui(app);
        logger.log(`TUI Agent Monitor started (${tuiConfig.target})`);
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
    const tuiConfig = resolveTuiConfig({
      transportMode: 'stdio',
      tuiEnabled,
      stderrIsTTY: process.stderr.isTTY ?? false,
    });
    if (tuiConfig.shouldRender) {
      try {
        const stdout =
          tuiConfig.target === 'stderr' ? process.stderr : undefined;
        await initTui(app, stdout);
        debugLog(`TUI Agent Monitor started (${tuiConfig.target})`);
      } catch (error) {
        debugLog(`Failed to start TUI Agent Monitor: ${error}`);
      }
    } else if (tuiEnabled) {
      debugLog(tuiConfig.reason);
    }
  }
}

// Run if executed directly
if (require.main === module) {
  bootstrap();
}
