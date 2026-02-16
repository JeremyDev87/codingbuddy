#!/usr/bin/env node
import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';
import { AppModule } from './app.module';
import { McpService } from './mcp/mcp.service';
import { hasTuiFlag } from './tui/cli-flags';
import { resolveTuiConfig } from './tui/tui-config';

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

import { esmImport } from './shared/esm-import';

/** Forced-exit timeout for server-side graceful shutdown (ms) */
const SHUTDOWN_TIMEOUT_MS = 5000;

/**
 * Register SIGINT/SIGTERM handlers that run graceful shutdown with forced-exit timeout.
 * Shared by both SSE and stdio modes.
 */
function registerShutdownSignals(
  manager: { shutdown: () => Promise<void> },
  timeoutMs: number,
): void {
  let shuttingDown = false;
  const handleSignal = (): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    const timeout = setTimeout(() => {
      debugLog('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, timeoutMs);
    timeout.unref();
    manager
      .shutdown()
      .then(() => {
        process.exitCode = 0;
      })
      .catch(() => {
        process.exitCode = 1;
      });
  };
  process.once('SIGINT', handleSignal);
  process.once('SIGTERM', handleSignal);
}

/** Minimal subset of Ink's Instance used for lifecycle management */
interface TuiInstance {
  readonly unmount: () => void;
}

/**
 * Initialize TUI Agent Monitor with dynamic imports.
 * Returns the TUI instance for external lifecycle management.
 * Isolates React/Ink dependencies behind --tui flag.
 */
async function initTui(
  app: INestApplicationContext,
  stdout?: NodeJS.WriteStream,
): Promise<TuiInstance> {
  const { ensureTuiReady } = await import('./tui/ensure-tui-ready');
  await ensureTuiReady(app);

  const { TuiEventBus } = await import('./tui/events');
  const { getTuiBundlePath } = await import('./shared/tui-bundle-path');
  const tuiBundle = await esmImport(getTuiBundlePath());
  const startTui = tuiBundle.startTui as (opts: {
    eventBus: InstanceType<typeof TuiEventBus>;
    stdout?: NodeJS.WriteStream;
  }) => TuiInstance;
  const eventBus = app.get(TuiEventBus);
  return startTui({ eventBus, ...(stdout ? { stdout } : {}) });
}

/**
 * Initialize IPC server for remote TUI clients.
 * Graceful degradation: IPC failure does not block MCP server.
 */
async function initIpc(
  app: INestApplicationContext,
): Promise<() => Promise<void>> {
  const { ensureTuiReady } = await import('./tui/ensure-tui-ready');
  await ensureTuiReady(app);

  const { TuiEventBus, TUI_EVENTS } = await import('./tui/events');
  const {
    TuiIpcServer,
    TuiIpcBridge,
    IpcStateCache,
    InstanceRegistry,
    getSocketPath,
    getInstancesFilePath,
  } = await import('./tui/ipc');

  const pid = process.pid;
  const socketPath = getSocketPath(pid);
  const eventBus = app.get(TuiEventBus);

  // State cache for late-connecting TUI clients (see IpcStateCache for strategies).
  // Uses bound on/off to bypass TuiEventBus generic narrowing — safe because
  // event names come from TUI_EVENTS and handlers only cache payloads.
  const stateCache = new IpcStateCache({
    on: eventBus.on.bind(eventBus) as (
      e: string,
      h: (p: unknown) => void,
    ) => void,
    off: eventBus.off.bind(eventBus) as (
      e: string,
      h: (p: unknown) => void,
    ) => void,
  });
  stateCache.trackSimple(TUI_EVENTS.AGENTS_LOADED);
  stateCache.trackSimple(TUI_EVENTS.MODE_CHANGED);
  stateCache.trackCompound(
    TUI_EVENTS.AGENT_ACTIVATED,
    TUI_EVENTS.AGENT_DEACTIVATED,
    (p: unknown) => (p as { agentId: string }).agentId,
  );
  stateCache.trackToggle(
    TUI_EVENTS.PARALLEL_STARTED,
    TUI_EVENTS.PARALLEL_COMPLETED,
  );

  // Provide initial state snapshot for late-connecting TUI clients
  const ipcServer = new TuiIpcServer(socketPath, {
    getInitialState: () => stateCache.getSnapshot(),
  });
  await ipcServer.listen();

  const bridge = new TuiIpcBridge(eventBus, ipcServer);

  // Register in instance discovery
  const registry = new InstanceRegistry(getInstancesFilePath());
  registry.prune();
  registry.register({
    pid,
    socketPath,
    projectRoot: process.env.CODINGBUDDY_PROJECT_ROOT || process.cwd(),
    startedAt: new Date().toISOString(),
  });

  debugLog(`IPC server listening on ${socketPath}`);

  // Return cleanup function
  return async () => {
    stateCache.destroy();
    bridge.destroy();
    await ipcServer.close();
    registry.unregister(pid);
  };
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

    // Unified shutdown manager for SSE mode — created before TUI/IPC init so
    // all resources can be registered as they are created, and signal handlers
    // are always registered even if subsequent initialization fails.
    const { ShutdownManager } = await import('./tui/ipc');
    const sseShutdownManager = new ShutdownManager();

    // TUI: SSE mode renders to stdout
    const tuiConfig = resolveTuiConfig({
      transportMode: 'sse',
      tuiEnabled,
      stderrIsTTY: process.stderr.isTTY ?? false,
    });
    if (tuiConfig.shouldRender) {
      try {
        const tuiInstance = await initTui(app);
        sseShutdownManager.register(async () => {
          debugLog('SSE graceful shutdown: unmounting TUI...');
          tuiInstance.unmount();
        });
        logger.log(`TUI Agent Monitor started (${tuiConfig.target})`);
      } catch (error) {
        logger.error('Failed to start TUI Agent Monitor', error);
      }
    }

    // Always start IPC server for remote TUI clients (SSE mode, graceful degradation)
    try {
      const cleanupIpc = await initIpc(app);
      sseShutdownManager.register(cleanupIpc);
    } catch (error) {
      logger.warn(`IPC server failed to start (non-blocking): ${error}`);
    }

    // Release module-level references before closing DI container
    sseShutdownManager.register(async () => {
      const { resetTuiReady } = await import('./tui/ensure-tui-ready');
      resetTuiReady();
    });
    // App close is the last cleanup step (NestJS DI must stay alive for IPC cleanup)
    sseShutdownManager.register(async () => {
      await app.close();
    });

    registerShutdownSignals(sseShutdownManager, SHUTDOWN_TIMEOUT_MS);
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

    // Unified shutdown manager for all stdio-mode resources
    const { ShutdownManager } = await import('./tui/ipc');
    const shutdownManager = new ShutdownManager();

    // Always start IPC server for remote TUI clients (graceful degradation)
    try {
      const cleanupIpc = await initIpc(app);
      shutdownManager.register(cleanupIpc);
    } catch (error) {
      debugLog(`IPC server failed to start (non-blocking): ${error}`);
    }

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
        const tuiInstance = await initTui(app, stdout);
        // Register TUI unmount in unified shutdown manager
        shutdownManager.register(async () => {
          debugLog('Graceful shutdown: unmounting TUI...');
          tuiInstance.unmount();
        });
        debugLog(`TUI Agent Monitor started (${tuiConfig.target})`);
      } catch (error) {
        debugLog(`Failed to start TUI Agent Monitor: ${error}`);
      }
    } else if (tuiEnabled) {
      debugLog(tuiConfig.reason);
    }

    // Release module-level references before closing DI container
    shutdownManager.register(async () => {
      const { resetTuiReady } = await import('./tui/ensure-tui-ready');
      resetTuiReady();
    });
    // App close is always the last cleanup step
    shutdownManager.register(async () => {
      await app.close();
    });

    registerShutdownSignals(shutdownManager, SHUTDOWN_TIMEOUT_MS);
  }
}

// Run if executed directly
if (require.main === module) {
  bootstrap().catch((error: unknown) => {
    process.stderr.write(
      `Fatal: ${error instanceof Error ? error.message : error}\n`,
    );
    process.exit(1);
  });
}
