import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigHandler } from './config.handler';
import { ConfigService } from '../../config/config.service';
import { ConfigDiffService } from '../../config/config-diff.service';
import { AnalyzerService } from '../../analyzer/analyzer.service';

describe('ConfigHandler', () => {
  let handler: ConfigHandler;
  let mockConfigService: ConfigService;
  let mockConfigDiffService: ConfigDiffService;
  let mockAnalyzerService: AnalyzerService;

  const mockSettings = {
    language: 'ko',
    techStack: ['typescript', 'react'],
  };

  beforeEach(() => {
    mockConfigService = {
      getSettings: vi.fn().mockResolvedValue(mockSettings),
      reload: vi.fn().mockResolvedValue(undefined),
    } as unknown as ConfigService;

    mockConfigDiffService = {
      compareConfig: vi.fn().mockReturnValue({
        suggestions: [],
        hasDifferences: false,
      }),
    } as unknown as ConfigDiffService;

    mockAnalyzerService = {
      analyzeProject: vi.fn().mockResolvedValue({
        techStack: ['typescript'],
        frameworks: ['react'],
      }),
    } as unknown as AnalyzerService;

    handler = new ConfigHandler(
      mockConfigService,
      mockConfigDiffService,
      mockAnalyzerService,
    );
  });

  describe('handle', () => {
    it('should return null for unhandled tools', async () => {
      const result = await handler.handle('unknown_tool', {});
      expect(result).toBeNull();
    });

    describe('get_project_config', () => {
      it('should return project config', async () => {
        const result = await handler.handle('get_project_config', {});

        expect(result?.isError).toBeFalsy();
        expect(mockConfigService.getSettings).toHaveBeenCalled();
      });

      it('should return error when config service fails', async () => {
        mockConfigService.getSettings = vi
          .fn()
          .mockRejectedValue(new Error('Config error'));

        const result = await handler.handle('get_project_config', {});

        expect(result?.isError).toBe(true);
        expect(result?.content[0]).toMatchObject({
          type: 'text',
          text: expect.stringContaining('Config error'),
        });
      });
    });

    describe('suggest_config_updates', () => {
      it('should suggest config updates with default project root', async () => {
        const result = await handler.handle('suggest_config_updates', {});

        expect(result?.isError).toBeFalsy();
        expect(mockAnalyzerService.analyzeProject).toHaveBeenCalled();
        expect(mockConfigService.reload).toHaveBeenCalled();
        expect(mockConfigDiffService.compareConfig).toHaveBeenCalled();
      });

      it('should use provided projectRoot when string', async () => {
        const result = await handler.handle('suggest_config_updates', {
          projectRoot: '/custom/path',
        });

        expect(result?.isError).toBeFalsy();
        expect(mockAnalyzerService.analyzeProject).toHaveBeenCalledWith(
          '/custom/path',
        );
      });

      it('should use cwd when projectRoot is not a string', async () => {
        const result = await handler.handle('suggest_config_updates', {
          projectRoot: 123,
        });

        expect(result?.isError).toBeFalsy();
        expect(mockAnalyzerService.analyzeProject).toHaveBeenCalledWith(
          expect.any(String),
        );
      });

      it('should return error when analysis fails', async () => {
        mockAnalyzerService.analyzeProject = vi
          .fn()
          .mockRejectedValue(new Error('Analysis error'));

        const result = await handler.handle('suggest_config_updates', {});

        expect(result?.isError).toBe(true);
        expect(result?.content[0]).toMatchObject({
          type: 'text',
          text: expect.stringContaining('Analysis error'),
        });
      });
    });
  });

  describe('getToolDefinitions', () => {
    it('should return tool definitions', () => {
      const definitions = handler.getToolDefinitions();

      expect(definitions).toHaveLength(2);
      expect(definitions.map(d => d.name)).toEqual([
        'get_project_config',
        'suggest_config_updates',
      ]);
    });

    it('should have no required parameters', () => {
      const definitions = handler.getToolDefinitions();

      definitions.forEach(def => {
        expect(def.inputSchema.required).toEqual([]);
      });
    });
  });
});
