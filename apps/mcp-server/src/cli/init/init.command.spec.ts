import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { InitOptions } from '../cli.types';
import type { ProjectAnalysis } from '../../analyzer';
import type { CodingBuddyConfig } from '../../config';
import type { WizardData } from './init.wizard';

// Use vi.hoisted to ensure mock functions are available before vi.mock hoisting
const {
  mockAnalyzeProject,
  mockGenerate,
  mockFindExistingConfig,
  mockWriteConfig,
  mockRunInitWizard,
  mockWizardDataToConfig,
  mockRenderConfigObjectAsJs,
  mockRenderConfigObjectAsJson,
} = vi.hoisted(() => ({
  mockAnalyzeProject: vi.fn(),
  mockGenerate: vi.fn(),
  mockFindExistingConfig: vi.fn(),
  mockWriteConfig: vi.fn(),
  mockRunInitWizard: vi.fn(),
  mockWizardDataToConfig: vi.fn(),
  mockRenderConfigObjectAsJs: vi.fn(),
  mockRenderConfigObjectAsJson: vi.fn(),
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
  renderConfigObjectAsJs: mockRenderConfigObjectAsJs,
  renderConfigObjectAsJson: mockRenderConfigObjectAsJson,
}));

vi.mock('./init.wizard', () => ({
  runInitWizard: mockRunInitWizard,
  wizardDataToConfig: mockWizardDataToConfig,
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
    language: 'ko',
  };

  const mockWizardData: WizardData = {
    basic: {
      language: 'ko',
      projectName: 'test-app',
      description: 'Test application',
    },
    techStack: {
      languages: ['TypeScript'],
      frontend: ['React'],
      backend: [],
      tools: ['Vitest'],
    },
    architecture: {
      pattern: 'modular',
      componentStyle: 'feature-based',
    },
    conventions: {
      fileNaming: 'kebab-case',
      quotes: 'single',
      semicolons: true,
    },
    testStrategy: {
      approach: 'tdd',
      coverage: 90,
      mockingStrategy: 'minimal',
    },
    ai: {
      defaultModel: 'sonnet',
      primaryAgent: 'frontend-developer',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock behaviors
    mockAnalyzeProject.mockResolvedValue(mockAnalysis);
    mockGenerate.mockResolvedValue(mockConfig);
    mockFindExistingConfig.mockResolvedValue(null);
    mockWriteConfig.mockResolvedValue('/project/codingbuddy.config.js');
    mockRunInitWizard.mockResolvedValue(mockWizardData);
    mockWizardDataToConfig.mockReturnValue(mockConfig);
    mockRenderConfigObjectAsJs.mockReturnValue('// rendered config');
    mockRenderConfigObjectAsJson.mockReturnValue('{}');
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

    it('should run init wizard with analysis', async () => {
      const options: InitOptions = {
        projectRoot: '/project',
        format: 'js',
        force: false,
      };

      await runInit(options);

      expect(mockRunInitWizard).toHaveBeenCalledWith({
        analysis: mockAnalysis,
        useDefaults: undefined,
        skipPrompts: undefined,
      });
    });

    it('should convert wizard data to config', async () => {
      const options: InitOptions = {
        projectRoot: '/project',
        format: 'js',
        force: false,
      };

      await runInit(options);

      expect(mockWizardDataToConfig).toHaveBeenCalledWith(mockWizardData);
    });

    it('should render config as JS by default', async () => {
      const options: InitOptions = {
        projectRoot: '/project',
        format: 'js',
        force: false,
      };

      await runInit(options);

      expect(mockRenderConfigObjectAsJs).toHaveBeenCalledWith(mockConfig);
      expect(mockRenderConfigObjectAsJson).not.toHaveBeenCalled();
    });

    it('should render config as JSON when format is json', async () => {
      const options: InitOptions = {
        projectRoot: '/project',
        format: 'json',
        force: false,
      };

      await runInit(options);

      expect(mockRenderConfigObjectAsJson).toHaveBeenCalledWith(mockConfig);
      expect(mockRenderConfigObjectAsJs).not.toHaveBeenCalled();
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

    it('should pass useDefaults option to wizard', async () => {
      const options: InitOptions = {
        projectRoot: '/project',
        format: 'js',
        force: false,
        useDefaults: true,
      };

      await runInit(options);

      expect(mockRunInitWizard).toHaveBeenCalledWith({
        analysis: mockAnalysis,
        useDefaults: true,
        skipPrompts: undefined,
      });
    });

    it('should pass skipPrompts option to wizard', async () => {
      const options: InitOptions = {
        projectRoot: '/project',
        format: 'js',
        force: false,
        skipPrompts: true,
      };

      await runInit(options);

      expect(mockRunInitWizard).toHaveBeenCalledWith({
        analysis: mockAnalysis,
        useDefaults: undefined,
        skipPrompts: true,
      });
    });

    it('should handle wizard cancellation', async () => {
      mockRunInitWizard.mockResolvedValue(null);

      const options: InitOptions = {
        projectRoot: '/project',
        format: 'js',
        force: false,
      };

      const result = await runInit(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('cancelled');
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
      expect(mockRunInitWizard).not.toHaveBeenCalled();
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
