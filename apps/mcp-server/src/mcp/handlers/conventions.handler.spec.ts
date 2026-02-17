import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConventionsHandler } from './conventions.handler';
import { ConventionsAnalyzer } from '../../analyzer/conventions.analyzer';
import { ConfigService } from '../../config/config.service';
import type { ProjectConventions } from '../../analyzer/conventions.types';

// Mock security utils module
vi.mock('../../shared/security.utils', () => ({
  assertPathSafe: vi.fn((path: string) => path),
  sanitizeHandlerArgs: vi.fn((_args: Record<string, unknown> | undefined) => ({
    safe: true,
  })),
}));

// Mock validation constants module
vi.mock('../../shared/validation.constants', () => ({
  extractOptionalString: vi.fn(
    (args: Record<string, unknown> | undefined, key: string) => args?.[key] as string | undefined,
  ),
}));

import { assertPathSafe, sanitizeHandlerArgs } from '../../shared/security.utils';
import { extractOptionalString } from '../../shared/validation.constants';

describe('ConventionsHandler', () => {
  let handler: ConventionsHandler;
  let mockConventionsAnalyzer: ConventionsAnalyzer;
  let mockConfigService: ConfigService;

  const mockProjectRoot = '/test/project';

  const mockConventions: ProjectConventions = {
    projectRoot: '/test/project',
    typescript: {
      strict: true,
      noImplicitAny: true,
      target: 'ES2021',
      module: 'commonjs',
    },
    eslint: {
      configType: 'flat',
      rules: {
        'no-console': 'warn',
      },
    },
    prettier: {
      tabWidth: 2,
      semi: true,
      singleQuote: true,
      trailingComma: 'es5',
    },
    editorconfig: {
      indent_style: 'space',
      indent_size: 2,
      end_of_line: 'lf',
      charset: 'utf-8',
    },
    markdownlint: {
      default: true,
      MD013: false,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockConventionsAnalyzer = {
      analyzeProjectConventions: vi.fn().mockResolvedValue(mockConventions),
    } as unknown as ConventionsAnalyzer;

    mockConfigService = {
      getProjectRoot: vi.fn().mockReturnValue(mockProjectRoot),
    } as unknown as ConfigService;

    handler = new ConventionsHandler(mockConventionsAnalyzer, mockConfigService);

    // Reset mocks to default behavior
    (assertPathSafe as ReturnType<typeof vi.fn>).mockImplementation((path: string) => path);
    (sanitizeHandlerArgs as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      safe: true,
    }));
    (extractOptionalString as ReturnType<typeof vi.fn>).mockImplementation(
      (args: Record<string, unknown> | undefined, key: string) => args?.[key] as string | undefined,
    );
  });

  describe('handle', () => {
    it('should return null for unhandled tools', async () => {
      const result = await handler.handle('unknown_tool', {});
      expect(result).toBeNull();
    });

    describe('get_code_conventions', () => {
      it('should return conventions with default projectRoot from configService', async () => {
        const result = await handler.handle('get_code_conventions', {});

        expect(result?.isError).toBeFalsy();
        expect(mockConfigService.getProjectRoot).toHaveBeenCalled();
        expect(extractOptionalString).toHaveBeenCalledWith({}, 'projectRoot');
        expect(assertPathSafe).toHaveBeenCalledWith(mockProjectRoot, {
          basePath: mockProjectRoot,
          allowAbsolute: true,
        });
        expect(mockConventionsAnalyzer.analyzeProjectConventions).toHaveBeenCalledWith(
          mockProjectRoot,
        );
      });

      it('should use provided projectRoot when string', async () => {
        const customPath = '/custom/path';
        const result = await handler.handle('get_code_conventions', {
          projectRoot: customPath,
        });

        expect(result?.isError).toBeFalsy();
        expect(extractOptionalString).toHaveBeenCalledWith(
          { projectRoot: customPath },
          'projectRoot',
        );
        expect(assertPathSafe).toHaveBeenCalledWith(customPath, {
          basePath: mockProjectRoot,
          allowAbsolute: true,
        });
        expect(mockConventionsAnalyzer.analyzeProjectConventions).toHaveBeenCalledWith(customPath);
      });

      it('should validate path to prevent path traversal attacks', async () => {
        const maliciousPath = '/etc/../../etc/passwd';

        await handler.handle('get_code_conventions', {
          projectRoot: maliciousPath,
        });

        expect(assertPathSafe).toHaveBeenCalledWith(maliciousPath, {
          basePath: mockProjectRoot,
          allowAbsolute: true,
        });
      });

      it('should return error when path validation fails', async () => {
        const maliciousPath = '../../../etc/passwd';
        (assertPathSafe as ReturnType<typeof vi.fn>).mockImplementation(() => {
          throw new Error('Path traversal attempt detected');
        });

        const result = await handler.handle('get_code_conventions', {
          projectRoot: maliciousPath,
        });

        expect(result?.isError).toBe(true);
        expect(result?.content[0]).toMatchObject({
          type: 'text',
          text: expect.stringContaining('Path traversal attempt detected'),
        });
      });

      it('should return error when analyzer fails', async () => {
        mockConventionsAnalyzer.analyzeProjectConventions = vi
          .fn()
          .mockRejectedValue(new Error('Failed to read tsconfig.json'));

        const result = await handler.handle('get_code_conventions', {});

        expect(result?.isError).toBe(true);
        expect(result?.content[0]).toMatchObject({
          type: 'text',
          text: expect.stringContaining('Failed to read tsconfig.json'),
        });
      });

      it('should handle non-Error exceptions gracefully', async () => {
        mockConventionsAnalyzer.analyzeProjectConventions = vi
          .fn()
          .mockRejectedValue('String error');

        const result = await handler.handle('get_code_conventions', {});

        expect(result?.isError).toBe(true);
        expect(result?.content[0]).toMatchObject({
          type: 'text',
          text: expect.stringContaining('String error'),
        });
      });

      it('should return complete conventions structure', async () => {
        const result = await handler.handle('get_code_conventions', {});

        expect(result?.isError).toBeFalsy();

        const jsonContent = result?.content.find(c => c.type === 'text');
        expect(jsonContent).toBeDefined();

        const conventions = JSON.parse((jsonContent as { text: string }).text);
        expect(conventions).toHaveProperty('typescript');
        expect(conventions).toHaveProperty('eslint');
        expect(conventions).toHaveProperty('prettier');
        expect(conventions).toHaveProperty('editorconfig');
        expect(conventions).toHaveProperty('markdownlint');
      });
    });
  });

  describe('getToolDefinitions', () => {
    it('should return tool definitions', () => {
      const definitions = handler.getToolDefinitions();

      expect(definitions).toHaveLength(1);
      expect(definitions[0].name).toBe('get_code_conventions');
    });

    it('should have correct tool definition structure', () => {
      const definitions = handler.getToolDefinitions();
      const def = definitions[0];

      expect(def.description).toContain('project configuration');
      expect(def.inputSchema.type).toBe('object');
      expect(def.inputSchema.properties).toHaveProperty('projectRoot');
      expect(def.inputSchema.required).toEqual([]);
    });

    it('should define projectRoot as optional string parameter', () => {
      const definitions = handler.getToolDefinitions();
      const def = definitions[0];

      expect(def.inputSchema.properties?.projectRoot).toMatchObject({
        type: 'string',
        description: expect.stringContaining('Project root directory'),
      });
    });
  });
});
