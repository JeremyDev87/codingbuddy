import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModelResolverService } from './model-resolver.service';
import { ConfigService } from '../config/config.service';
import { RulesService } from '../rules/rules.service';

describe('ModelResolverService', () => {
  let service: ModelResolverService;
  let mockConfigService: ConfigService;
  let mockRulesService: RulesService;

  beforeEach(() => {
    mockConfigService = {
      getSettings: vi.fn().mockResolvedValue({
        ai: { defaultModel: 'claude-sonnet-4-20250514' },
      }),
    } as unknown as ConfigService;

    mockRulesService = {
      getAgent: vi.fn().mockResolvedValue({
        name: 'test-agent',
        model: { preferred: 'claude-opus-4-20250514' },
      }),
    } as unknown as RulesService;

    service = new ModelResolverService(mockConfigService, mockRulesService);
  });

  describe('resolveForMode', () => {
    it('should return system default when no agent specified', async () => {
      mockConfigService.getSettings = vi.fn().mockResolvedValue(null);

      const result = await service.resolveForMode();

      expect(result.source).toBe('system');
    });

    it('should return global default when available and no agent', async () => {
      const result = await service.resolveForMode();

      expect(result.model).toBe('claude-sonnet-4-20250514');
      expect(result.source).toBe('global');
    });

    it('should return mode model when agent has preferred model', async () => {
      const result = await service.resolveForMode('test-agent');

      expect(result.model).toBe('claude-opus-4-20250514');
      expect(result.source).toBe('mode');
      expect(mockRulesService.getAgent).toHaveBeenCalledWith('test-agent');
    });

    it('should fallback to global when agent has no model config', async () => {
      mockRulesService.getAgent = vi.fn().mockResolvedValue({
        name: 'test-agent',
        model: undefined,
      });

      const result = await service.resolveForMode('test-agent');

      expect(result.model).toBe('claude-sonnet-4-20250514');
      expect(result.source).toBe('global');
    });

    it('should handle config service failure gracefully', async () => {
      mockConfigService.getSettings = vi
        .fn()
        .mockRejectedValue(new Error('Config error'));
      mockRulesService.getAgent = vi.fn().mockResolvedValue({
        name: 'test-agent',
        model: undefined,
      });

      const result = await service.resolveForMode('test-agent');

      expect(result.source).toBe('system');
    });

    it('should handle rules service failure gracefully', async () => {
      mockRulesService.getAgent = vi
        .fn()
        .mockRejectedValue(new Error('Agent not found'));

      const result = await service.resolveForMode('nonexistent-agent');

      expect(result.model).toBe('claude-sonnet-4-20250514');
      expect(result.source).toBe('global');
    });
  });

  describe('resolveForAgent', () => {
    it('should return agent model when provided', async () => {
      const result = await service.resolveForAgent({
        preferred: 'claude-haiku-3-20250514',
      });

      expect(result.model).toBe('claude-haiku-3-20250514');
      expect(result.source).toBe('agent');
    });

    it('should fallback to global when agent model not provided', async () => {
      const result = await service.resolveForAgent(undefined);

      expect(result.model).toBe('claude-sonnet-4-20250514');
      expect(result.source).toBe('global');
    });

    it('should return system default when no configs available', async () => {
      mockConfigService.getSettings = vi.fn().mockResolvedValue(null);

      const result = await service.resolveForAgent(undefined);

      expect(result.source).toBe('system');
    });

    it('should include warning for unknown model', async () => {
      const result = await service.resolveForAgent({
        preferred: 'unknown-model-id',
      });

      expect(result.model).toBe('unknown-model-id');
      expect(result.warning).toContain('Unknown model ID');
    });
  });
});
