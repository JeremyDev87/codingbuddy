import type { INestApplicationContext } from '@nestjs/common';

let tuiReadyPromise: Promise<void> | null = null;
let boundApp: INestApplicationContext | null = null;

/**
 * Ensures TUI event infrastructure is initialized exactly once.
 * Shared between initTui() (local rendering) and initIpc() (remote clients).
 * Prevents duplicate interceptor.enable() and AGENTS_LOADED events.
 * Uses Promise-based guard to handle concurrent callers safely.
 *
 * @warning The cached promise is tied to the first `app` instance passed.
 * If called with a different app, a warning is logged and the first
 * initialization is reused. Call resetTuiReady() between distinct app
 * lifecycles (e.g., in tests).
 */
export function ensureTuiReady(app: INestApplicationContext): Promise<void> {
  if (!tuiReadyPromise) {
    boundApp = app;
    tuiReadyPromise = doEnsureTuiReady(app).catch(err => {
      tuiReadyPromise = null; // Allow retry on failure
      boundApp = null;
      throw err;
    });
  } else if (boundApp && boundApp !== app) {
    if (process.env.MCP_DEBUG === '1') {
      process.stderr.write(
        '[codingbuddy] ensureTuiReady: called with a different app instance; reusing first initialization\n',
      );
    }
  }
  return tuiReadyPromise;
}

async function doEnsureTuiReady(app: INestApplicationContext): Promise<void> {
  const { TuiEventBus, TuiInterceptor, AgentMetadataService, TUI_EVENTS } =
    await import('./events');

  const tuiInterceptor = app.get(TuiInterceptor);
  tuiInterceptor.enable();

  const metadataService = app.get(AgentMetadataService);
  await metadataService.initialize();

  const allAgents = metadataService.getAllMetadata();
  if (allAgents.length > 0) {
    const eventBus = app.get(TuiEventBus);
    eventBus.emit(TUI_EVENTS.AGENTS_LOADED, { agents: allAgents });
  }
}

/** Reset module-level state for shutdown or testing */
export function resetTuiReady(): void {
  tuiReadyPromise = null;
  boundApp = null;
}
