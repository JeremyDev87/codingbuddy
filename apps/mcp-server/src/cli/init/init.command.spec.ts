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
} = vi.hoisted(() => ({
  mockAnalyzeProject: vi.fn(),
  mockGenerate: vi.fn(),
  mockFindExistingConfig: vi.fn(),
  mockWriteConfig: vi.fn(),
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

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock behaviors
    mockAnalyzeProject.mockResolvedValue(mockAnalysis);
    mockGenerate.mockResolvedValue(mockConfig);
    mockFindExistingConfig.mockResolvedValue(null);
    mockWriteConfig.mockResolvedValue('/project/codingbuddy.config.js');
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

  describe('runInit', () => {
    it('should complete successfully with valid options', async () => {
      const options: InitOptions = {
        projectRoot: '/project',
        format: 'js',
        force: false,
        apiKey: 'test-key',
      };

      const result = await runInit(options);

      expect(result.success).toBe(true);
      expect(result.configPath).toBe('/project/codingbuddy.config.js');
    });

    it('should fail without API key', async () => {
      const options: InitOptions = {
        projectRoot: '/project',
        format: 'js',
        force: false,
      };

      const result = await runInit(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('API key');
    });

    it('should check for existing config', async () => {
      const options: InitOptions = {
        projectRoot: '/project',
        format: 'js',
        force: false,
        apiKey: 'test-key',
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
        apiKey: 'test-key',
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
        apiKey: 'test-key',
      };

      const result = await runInit(options);

      expect(result.success).toBe(true);
      expect(mockWriteConfig).toHaveBeenCalled();
    });

    it('should call analyzer service', async () => {
      const options: InitOptions = {
        projectRoot: '/project',
        format: 'js',
        force: false,
        apiKey: 'test-key',
      };

      await runInit(options);

      expect(mockAnalyzeProject).toHaveBeenCalledWith('/project');
    });

    it('should call config generator', async () => {
      const options: InitOptions = {
        projectRoot: '/project',
        format: 'js',
        force: false,
        apiKey: 'test-key',
      };

      await runInit(options);

      expect(mockGenerate).toHaveBeenCalledWith(mockAnalysis);
    });

    it('should write config file', async () => {
      const options: InitOptions = {
        projectRoot: '/project',
        format: 'js',
        force: false,
        apiKey: 'test-key',
      };

      await runInit(options);

      expect(mockWriteConfig).toHaveBeenCalledWith('/project', mockConfig, {
        format: 'js',
      });
    });

    it('should handle analyzer error', async () => {
      mockAnalyzeProject.mockRejectedValue(new Error('Analysis failed'));

      const options: InitOptions = {
        projectRoot: '/project',
        format: 'js',
        force: false,
        apiKey: 'test-key',
      };

      const result = await runInit(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Analysis failed');
    });

    it('should handle generator error', async () => {
      mockGenerate.mockRejectedValue(new Error('Generation failed'));

      const options: InitOptions = {
        projectRoot: '/project',
        format: 'js',
        force: false,
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
        apiKey: 'test-key',
      };

      const result = await runInit(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Write failed');
    });
  });
});
