import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigHandler } from './config.handler';
import { ConfigService } from '../../config/config.service';
import { ConfigDiffService } from '../../config/config-diff.service';
import { AnalyzerService } from '../../analyzer/analyzer.service';

// Mock security utils module
vi.mock('../../shared/security.utils', () => ({
  assertPathSafe: vi.fn((path: string) => path),
  sanitizeHandlerArgs: vi.fn((_args: Record<string, unknown> | undefined) => ({
    safe: true,
  })),
}));

import { assertPathSafe } from '../../shared/security.utils';

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
      setProjectRootAndReload: vi.fn().mockResolvedValue(undefined),
      getProjectRoot: vi.fn().mockReturnValue('/test/project'),
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

    handler = new ConfigHandler(mockConfigService, mockConfigDiffService, mockAnalyzerService);

    // Reset mocks to default behavior
    (assertPathSafe as ReturnType<typeof vi.fn>).mockImplementation((path: string) => path);
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
        mockConfigService.getSettings = vi.fn().mockRejectedValue(new Error('Config error'));

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
        expect(mockAnalyzerService.analyzeProject).toHaveBeenCalledWith('/custom/path');
      });

      it('should use cwd when projectRoot is not a string', async () => {
        const result = await handler.handle('suggest_config_updates', {
          projectRoot: 123,
        });

        expect(result?.isError).toBeFalsy();
        expect(mockAnalyzerService.analyzeProject).toHaveBeenCalledWith(expect.any(String));
      });

      it('should return error when analysis fails', async () => {
        mockAnalyzerService.analyzeProject = vi.fn().mockRejectedValue(new Error('Analysis error'));

        const result = await handler.handle('suggest_config_updates', {});

        expect(result?.isError).toBe(true);
        expect(result?.content[0]).toMatchObject({
          type: 'text',
          text: expect.stringContaining('Analysis error'),
        });
      });
    });

    describe('set_project_root', () => {
      it('should set project root successfully', async () => {
        const result = await handler.handle('set_project_root', {
          projectRoot: '/new/project/path',
        });

        expect(result?.isError).toBeFalsy();
        expect(mockConfigService.setProjectRootAndReload).toHaveBeenCalledWith('/new/project/path');
      });

      it('should return error when projectRoot is missing', async () => {
        const result = await handler.handle('set_project_root', {});

        expect(result?.isError).toBe(true);
        expect(result?.content[0]).toMatchObject({
          type: 'text',
          text: expect.stringContaining('projectRoot'),
        });
      });

      it('should return error when projectRoot is empty string', async () => {
        const result = await handler.handle('set_project_root', {
          projectRoot: '',
        });

        expect(result?.isError).toBe(true);
        expect(result?.content[0]).toMatchObject({
          type: 'text',
          text: expect.stringContaining('projectRoot'),
        });
      });

      it('should return error when projectRoot is whitespace only', async () => {
        const result = await handler.handle('set_project_root', {
          projectRoot: '   ',
        });

        expect(result?.isError).toBe(true);
        expect(result?.content[0]).toMatchObject({
          type: 'text',
          text: expect.stringContaining('projectRoot'),
        });
      });

      it('should return error when setProjectRootAndReload fails', async () => {
        mockConfigService.setProjectRootAndReload = vi
          .fn()
          .mockRejectedValue(new Error('Path does not exist'));

        const result = await handler.handle('set_project_root', {
          projectRoot: '/nonexistent/path',
        });

        expect(result?.isError).toBe(true);
        expect(result?.content[0]).toMatchObject({
          type: 'text',
          text: expect.stringContaining('Path does not exist'),
        });
      });

      it('should return error when path validation fails', async () => {
        (assertPathSafe as ReturnType<typeof vi.fn>).mockImplementation(() => {
          throw new Error('Path traversal attempt detected');
        });

        const result = await handler.handle('set_project_root', {
          projectRoot: '../../../etc/passwd',
        });

        expect(result?.isError).toBe(true);
        expect(result?.content[0]).toMatchObject({
          type: 'text',
          text: expect.stringContaining('Path traversal'),
        });
      });

      it('should return current project root on success', async () => {
        const result = await handler.handle('set_project_root', {
          projectRoot: '/new/project/path',
        });

        expect(result?.isError).toBeFalsy();
        const content = JSON.parse((result?.content[0] as { text: string }).text);
        expect(content).toHaveProperty('projectRoot');
      });

      it('should include deprecation warning in response', async () => {
        const result = await handler.handle('set_project_root', {
          projectRoot: '/new/project/path',
        });

        expect(result?.isError).toBeFalsy();
        const content = JSON.parse((result?.content[0] as { text: string }).text);
        expect(content).toHaveProperty('deprecationWarning');
        expect(content.deprecationWarning).toContain('DEPRECATED');
        expect(content.deprecationWarning).toContain('v2.0.0');
      });
    });
  });

  describe('getToolDefinitions', () => {
    it('should return tool definitions', () => {
      const definitions = handler.getToolDefinitions();

      expect(definitions).toHaveLength(3);
      expect(definitions.map(d => d.name)).toEqual([
        'get_project_config',
        'suggest_config_updates',
        'set_project_root',
      ]);
    });

    it('should have no required parameters for get and suggest tools', () => {
      const definitions = handler.getToolDefinitions();

      const getConfigDef = definitions.find(d => d.name === 'get_project_config');
      const suggestDef = definitions.find(d => d.name === 'suggest_config_updates');

      expect(getConfigDef?.inputSchema.required).toEqual([]);
      expect(suggestDef?.inputSchema.required).toEqual([]);
    });

    it('should require projectRoot for set_project_root tool', () => {
      const definitions = handler.getToolDefinitions();

      const setRootDef = definitions.find(d => d.name === 'set_project_root');

      expect(setRootDef?.inputSchema.required).toEqual(['projectRoot']);
    });
  });
});
