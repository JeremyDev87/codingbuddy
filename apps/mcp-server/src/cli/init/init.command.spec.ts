import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { InitOptions } from '../cli.types';
import type { ProjectAnalysis } from '../../analyzer';
import type { CodingBuddyConfig } from '../../config';

// Use vi.hoisted to ensure mock functions are available before vi.mock hoisting
const {
  mockAnalyzeProject,
  mockGenerate,
  mockFindExistingConfig,
  mockWriteConfig,
  mockSelectTemplate,
  mockRenderConfigAsJs,
  mockRenderConfigAsJson,
  mockPromptModelSelection,
} = vi.hoisted(() => ({
  mockAnalyzeProject: vi.fn(),
  mockGenerate: vi.fn(),
  mockFindExistingConfig: vi.fn(),
  mockWriteConfig: vi.fn(),
  mockSelectTemplate: vi.fn(),
  mockRenderConfigAsJs: vi.fn(),
  mockRenderConfigAsJson: vi.fn(),
  mockPromptModelSelection: vi.fn(),
}));

// Mock all modules
vi.mock('../../analyzer', () => ({
  AnalyzerService: class MockAnalyzerService {
    analyzeProject = mockAnalyzeProject;
  },
}));

vi.mock('./config.generator', () => ({
  ConfigGenerator: class MockConfigGenerator {
    generate = mockGenerate;
  },
}));

vi.mock('./config.writer', () => ({
  findExistingConfig: mockFindExistingConfig,
  writeConfig: mockWriteConfig,
}));

vi.mock('./templates', () => ({
  selectTemplate: mockSelectTemplate,
  renderConfigAsJs: mockRenderConfigAsJs,
  renderConfigAsJson: mockRenderConfigAsJson,
}));

vi.mock('./prompts', () => ({
  promptModelSelection: mockPromptModelSelection,
  DEFAULT_MODEL_CHOICE: 'claude-sonnet-4-20250514',
}));

vi.mock('../utils/console', () => ({
  createConsoleUtils: () => ({
    log: {
      info: vi.fn(),
      success: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      step: vi.fn(),
    },
    spinner: {
      start: vi.fn(),
      succeed: vi.fn(),
      fail: vi.fn(),
      stop: vi.fn(),
    },
    formatConfig: () => '{}',
  }),
}));

// Import after mocks
import { runInit, getApiKey } from './init.command';

describe('init.command', () => {
  const mockAnalysis: ProjectAnalysis = {
    packageInfo: {
      name: 'test-app',
      version: '1.0.0',
      dependencies: {},
      devDependencies: {},
      scripts: {},
      detectedFrameworks: [],
    },
    directoryStructure: {
      rootDirs: ['src'],
      rootFiles: ['package.json'],
      allFiles: [],
      patterns: [],
      totalFiles: 5,
      totalDirs: 2,
    },
    configFiles: { detected: [] },
    codeSamples: [],
    detectedPatterns: [],
  };

  const mockConfig: CodingBuddyConfig = {
    projectName: 'test-app',
    language: 'en',
  };

  const mockTemplateResult = {
    template: {
      metadata: {
        id: 'default',
        name: 'Default',
        description: 'Default template',
        matchPatterns: [],
      },
      config: mockConfig,
      comments: { header: '// header' },
    },
    reason: 'Default template selected',
    detectedFrameworks: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock behaviors
    mockAnalyzeProject.mockResolvedValue(mockAnalysis);
    mockGenerate.mockResolvedValue(mockConfig);
    mockFindExistingConfig.mockResolvedValue(null);
    mockWriteConfig.mockResolvedValue('/project/codingbuddy.config.js');
    mockSelectTemplate.mockReturnValue(mockTemplateResult);
    mockRenderConfigAsJs.mockReturnValue('// rendered config');
    mockRenderConfigAsJson.mockReturnValue('{}');
    mockPromptModelSelection.mockResolvedValue('claude-sonnet-4-20250514');
  });

  describe('getApiKey', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return API key from options if provided', () => {
      const result = getApiKey({ apiKey: 'test-key' } as InitOptions);

      expect(result).toBe('test-key');
    });

    it('should return API key from ANTHROPIC_API_KEY env var', () => {
      process.env.ANTHROPIC_API_KEY = 'env-key';

      const result = getApiKey({} as InitOptions);

      expect(result).toBe('env-key');
    });

    it('should return null if no API key available', () => {
      delete process.env.ANTHROPIC_API_KEY;

      const result = getApiKey({} as InitOptions);

      expect(result).toBeNull();
    });
  });

  describe('runInit - Template mode (default)', () => {
    it('should complete successfully without API key', async () => {
      const options: InitOptions = {
        projectRoot: '/project',
        format: 'js',
        force: false,
      };

      const result = await runInit(options);

      expect(result.success).toBe(true);
      expect(result.configPath).toBe('/project/codingbuddy.config.js');
    });

    it('should call analyzer service', async () => {
      const options: InitOptions = {
        projectRoot: '/project',
        format: 'js',
        force: false,
      };

      await runInit(options);

      expect(mockAnalyzeProject).toHaveBeenCalledWith('/project');
    });

    it('should select template based on analysis', async () => {
      const options: InitOptions = {
        projectRoot: '/project',
        format: 'js',
        force: false,
      };

      await runInit(options);

      expect(mockSelectTemplate).toHaveBeenCalledWith(mockAnalysis);
    });

    it('should render config as JS by default', async () => {
      const options: InitOptions = {
        projectRoot: '/project',
        format: 'js',
        force: false,
      };

      await runInit(options);

      expect(mockRenderConfigAsJs).toHaveBeenCalled();
      expect(mockRenderConfigAsJson).not.toHaveBeenCalled();
    });

    it('should render config as JSON when format is json', async () => {
      const options: InitOptions = {
        projectRoot: '/project',
        format: 'json',
        force: false,
      };

      await runInit(options);

      expect(mockRenderConfigAsJson).toHaveBeenCalled();
      expect(mockRenderConfigAsJs).not.toHaveBeenCalled();
    });

    it('should write rendered config with raw option', async () => {
      const options: InitOptions = {
        projectRoot: '/project',
        format: 'js',
        force: false,
      };

      await runInit(options);

      expect(mockWriteConfig).toHaveBeenCalledWith(
        '/project',
        '// rendered config',
        { format: 'js', raw: true },
      );
    });

    it('should pass language option to renderer', async () => {
      const options: InitOptions = {
        projectRoot: '/project',
        format: 'js',
        force: false,
        language: 'en',
      };

      await runInit(options);

      expect(mockRenderConfigAsJs).toHaveBeenCalledWith(
        mockTemplateResult.template,
        expect.objectContaining({ language: 'en' }),
      );
    });

    it('should call promptModelSelection when skipPrompts is false', async () => {
      const options: InitOptions = {
        projectRoot: '/project',
        format: 'js',
        force: false,
        skipPrompts: false,
      };

      await runInit(options);

      expect(mockPromptModelSelection).toHaveBeenCalled();
    });

    it('should skip promptModelSelection when skipPrompts is true', async () => {
      const options: InitOptions = {
        projectRoot: '/project',
        format: 'js',
        force: false,
        skipPrompts: true,
      };

      await runInit(options);

      expect(mockPromptModelSelection).not.toHaveBeenCalled();
    });

    it('should pass selected model to renderer', async () => {
      mockPromptModelSelection.mockResolvedValue('claude-opus-4-20250514');

      const options: InitOptions = {
        projectRoot: '/project',
        format: 'js',
        force: false,
        skipPrompts: false,
      };

      await runInit(options);

      expect(mockRenderConfigAsJs).toHaveBeenCalledWith(
        mockTemplateResult.template,
        expect.objectContaining({ defaultModel: 'claude-opus-4-20250514' }),
      );
    });

    it('should use default model when skipPrompts is true', async () => {
      const options: InitOptions = {
        projectRoot: '/project',
        format: 'js',
        force: false,
        skipPrompts: true,
      };

      await runInit(options);

      expect(mockRenderConfigAsJs).toHaveBeenCalledWith(
        mockTemplateResult.template,
        expect.objectContaining({ defaultModel: 'claude-sonnet-4-20250514' }),
      );
    });
  });

  describe('runInit - AI mode', () => {
    it('should fail without API key when useAi is true', async () => {
      const options: InitOptions = {
        projectRoot: '/project',
        format: 'js',
        force: false,
        useAi: true,
      };

      const result = await runInit(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('API key');
    });

    it('should use AI generator when useAi is true with API key', async () => {
      const options: InitOptions = {
        projectRoot: '/project',
        format: 'js',
        force: false,
        useAi: true,
        apiKey: 'test-key',
      };

      const result = await runInit(options);

      expect(result.success).toBe(true);
      expect(mockGenerate).toHaveBeenCalledWith(mockAnalysis);
      expect(mockSelectTemplate).not.toHaveBeenCalled();
    });

    it('should write config without raw option in AI mode', async () => {
      const options: InitOptions = {
        projectRoot: '/project',
        format: 'js',
        force: false,
        useAi: true,
        apiKey: 'test-key',
      };

      await runInit(options);

      expect(mockWriteConfig).toHaveBeenCalledWith('/project', mockConfig, {
        format: 'js',
      });
    });
  });

  describe('runInit - Common behavior', () => {
    it('should check for existing config', async () => {
      const options: InitOptions = {
        projectRoot: '/project',
        format: 'js',
        force: false,
      };

      await runInit(options);

      expect(mockFindExistingConfig).toHaveBeenCalledWith('/project');
    });

    it('should fail if config exists and force is false', async () => {
      mockFindExistingConfig.mockResolvedValue(
        '/project/codingbuddy.config.js',
      );

      const options: InitOptions = {
        projectRoot: '/project',
        format: 'js',
        force: false,
      };

      const result = await runInit(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should overwrite if config exists and force is true', async () => {
      mockFindExistingConfig.mockResolvedValue(
        '/project/codingbuddy.config.js',
      );

      const options: InitOptions = {
        projectRoot: '/project',
        format: 'js',
        force: true,
      };

      const result = await runInit(options);

      expect(result.success).toBe(true);
      expect(mockWriteConfig).toHaveBeenCalled();
    });

    it('should handle analyzer error', async () => {
      mockAnalyzeProject.mockRejectedValue(new Error('Analysis failed'));

      const options: InitOptions = {
        projectRoot: '/project',
        format: 'js',
        force: false,
      };

      const result = await runInit(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Analysis failed');
    });

    it('should handle generator error in AI mode', async () => {
      mockGenerate.mockRejectedValue(new Error('Generation failed'));

      const options: InitOptions = {
        projectRoot: '/project',
        format: 'js',
        force: false,
        useAi: true,
        apiKey: 'test-key',
      };

      const result = await runInit(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Generation failed');
    });

    it('should handle write error', async () => {
      mockWriteConfig.mockRejectedValue(new Error('Write failed'));

      const options: InitOptions = {
        projectRoot: '/project',
        format: 'js',
        force: false,
      };

      const result = await runInit(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Write failed');
    });
  });
});
