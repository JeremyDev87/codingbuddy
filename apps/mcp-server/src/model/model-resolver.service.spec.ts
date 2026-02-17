import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModelResolverService } from './model-resolver.service';
import { ConfigService } from '../config/config.service';

describe('ModelResolverService', () => {
  let service: ModelResolverService;
  let mockConfigService: ConfigService;

  beforeEach(() => {
    mockConfigService = {
      getSettings: vi.fn().mockResolvedValue({
        ai: { defaultModel: 'claude-opus-4-20250514' },
      }),
    } as unknown as ConfigService;

    service = new ModelResolverService(mockConfigService);
  });

  describe('resolve', () => {
    it('should return global default when available', async () => {
      const result = await service.resolve();

      expect(result.model).toBe('claude-opus-4-20250514');
      expect(result.source).toBe('global');
    });

    it('should return system default when no global config', async () => {
      mockConfigService.getSettings = vi.fn().mockResolvedValue(null);

      const result = await service.resolve();

      expect(result.source).toBe('system');
    });

    it('should return system default when ai config is undefined', async () => {
      mockConfigService.getSettings = vi.fn().mockResolvedValue({});

      const result = await service.resolve();

      expect(result.source).toBe('system');
    });

    it('should return system default when defaultModel is undefined', async () => {
      mockConfigService.getSettings = vi.fn().mockResolvedValue({
        ai: {},
      });

      const result = await service.resolve();

      expect(result.source).toBe('system');
    });

    it('should handle config service failure gracefully', async () => {
      mockConfigService.getSettings = vi.fn().mockRejectedValue(new Error('Config error'));

      const result = await service.resolve();

      expect(result.source).toBe('system');
    });

    it('should include warning for unknown model', async () => {
      mockConfigService.getSettings = vi.fn().mockResolvedValue({
        ai: { defaultModel: 'unknown-model-id' },
      });

      const result = await service.resolve();

      expect(result.model).toBe('unknown-model-id');
      expect(result.warning).toContain('Unknown model ID');
    });

    it('should include deprecation warning for haiku models', async () => {
      mockConfigService.getSettings = vi.fn().mockResolvedValue({
        ai: { defaultModel: 'claude-haiku-3-5-20241022' },
      });

      const result = await service.resolve();

      expect(result.model).toBe('claude-haiku-3-5-20241022');
      expect(result.warning).toContain('not recommended');
    });
  });
});
