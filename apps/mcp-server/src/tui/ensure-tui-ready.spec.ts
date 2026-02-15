import { describe, it, expect, vi, afterEach } from 'vitest';
import { ensureTuiReady, resetTuiReady } from './ensure-tui-ready';

function createMockApp() {
  const interceptor = { enable: vi.fn() };
  const metadataService = {
    initialize: vi.fn().mockResolvedValue(undefined),
    getAllMetadata: vi
      .fn()
      .mockReturnValue([{ id: 'arch', name: 'architecture' }]),
  };
  const eventBus = { emit: vi.fn() };

  return {
    get: vi.fn((token: unknown) => {
      const name = (token as { name?: string }).name;
      if (name === 'TuiInterceptor') return interceptor;
      if (name === 'AgentMetadataService') return metadataService;
      if (name === 'TuiEventBus') return eventBus;
      throw new Error(`Unknown token: ${String(token)}`);
    }),
    interceptor,
    metadataService,
    eventBus,
  };
}

describe('ensureTuiReady', () => {
  afterEach(() => {
    resetTuiReady();
  });

  it('should enable interceptor and load metadata on first call', async () => {
    const mock = createMockApp();
    await ensureTuiReady(mock as never);

    expect(mock.interceptor.enable).toHaveBeenCalledOnce();
    expect(mock.metadataService.initialize).toHaveBeenCalledOnce();
    expect(mock.eventBus.emit).toHaveBeenCalledOnce();
  });

  it('should be idempotent - second call does nothing', async () => {
    const mock = createMockApp();
    await ensureTuiReady(mock as never);
    await ensureTuiReady(mock as never);

    expect(mock.interceptor.enable).toHaveBeenCalledOnce();
    expect(mock.metadataService.initialize).toHaveBeenCalledOnce();
  });

  it('should not emit AGENTS_LOADED when no agents exist', async () => {
    const mock = createMockApp();
    mock.metadataService.getAllMetadata.mockReturnValue([]);
    await ensureTuiReady(mock as never);

    expect(mock.eventBus.emit).not.toHaveBeenCalled();
  });
});
