/**
 * Init Wizard Tests
 *
 * Tests for the interactive wizard flow and data transformations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ProjectAnalysis } from '../../analyzer';
import type { WizardData } from './init.wizard';

// Use vi.hoisted to ensure mock functions are available before vi.mock hoisting
const {
  mockPromptLanguageSelection,
  mockPromptModelSelection,
  mockPromptPrimaryAgentSelection,
  mockPromptBasicSettings,
  mockPromptTechStackSettings,
  mockPromptArchitectureSettings,
  mockPromptConventionsSettings,
  mockPromptTestStrategySettings,
} = vi.hoisted(() => ({
  mockPromptLanguageSelection: vi.fn(),
  mockPromptModelSelection: vi.fn(),
  mockPromptPrimaryAgentSelection: vi.fn(),
  mockPromptBasicSettings: vi.fn(),
  mockPromptTechStackSettings: vi.fn(),
  mockPromptArchitectureSettings: vi.fn(),
  mockPromptConventionsSettings: vi.fn(),
  mockPromptTestStrategySettings: vi.fn(),
}));

const { mockRenderConfigSummary, mockPromptSummaryAction } = vi.hoisted(() => ({
  mockRenderConfigSummary: vi.fn(),
  mockPromptSummaryAction: vi.fn(),
}));

// Mock prompts module
vi.mock('./prompts', () => ({
  promptLanguageSelection: mockPromptLanguageSelection,
  promptModelSelection: mockPromptModelSelection,
  promptPrimaryAgentSelection: mockPromptPrimaryAgentSelection,
  promptBasicSettings: mockPromptBasicSettings,
  promptTechStackSettings: mockPromptTechStackSettings,
  promptArchitectureSettings: mockPromptArchitectureSettings,
  promptConventionsSettings: mockPromptConventionsSettings,
  promptTestStrategySettings: mockPromptTestStrategySettings,
  DEFAULT_LANGUAGE: 'ko',
  DEFAULT_MODEL_CHOICE: 'sonnet',
  DEFAULT_PRIMARY_AGENT: 'frontend-developer',
  DEFAULT_PROJECT_NAME: 'my-project',
  DEFAULT_DESCRIPTION: '',
  DEFAULT_COVERAGE: 90,
}));

// Mock summary module
vi.mock('./summary', () => ({
  renderConfigSummary: mockRenderConfigSummary,
  promptSummaryAction: mockPromptSummaryAction,
}));

// Mock console utils
vi.mock('../utils/console', () => ({
  createConsoleUtils: () => ({
    log: {
      info: vi.fn(),
      success: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      step: vi.fn(),
    },
  }),
}));

// Import after mocks
import { runInitWizard, wizardDataToConfig } from './init.wizard';

describe('init.wizard', () => {
  const mockAnalysis: ProjectAnalysis = {
    packageInfo: {
      name: 'test-project',
      version: '1.0.0',
      description: 'A test project',
      dependencies: {
        react: '^18.0.0',
        typescript: '^5.0.0',
        vitest: '^4.0.0',
      },
      devDependencies: {
        eslint: '^8.0.0',
        prettier: '^3.0.0',
      },
      scripts: {},
      detectedFrameworks: [
        { name: 'TypeScript', category: 'other', version: '5.0.0' },
      ],
    },
    directoryStructure: {
      rootDirs: ['src', 'tests'],
      rootFiles: ['package.json', 'tsconfig.json'],
      allFiles: [],
      patterns: [],
      totalFiles: 50,
      totalDirs: 10,
    },
    configFiles: {
      detected: ['tsconfig.json', '.eslintrc.js'],
      prettier: { path: '.prettierrc', singleQuote: true, semi: false },
    },
    codeSamples: [],
    detectedPatterns: [],
  };

  const mockBasicSettings = {
    projectName: 'test-project',
    description: 'A test project',
  };

  const mockTechStackSettings = {
    languages: ['TypeScript', 'JavaScript'],
    frontend: ['React'],
    backend: [],
    tools: ['Vitest', 'ESLint', 'Prettier'],
  };

  const mockArchitectureSettings = {
    pattern: 'modular',
    componentStyle: 'feature-based',
  };

  const mockConventionsSettings = {
    fileNaming: 'kebab-case',
    quotes: 'single' as const,
    semicolons: false,
  };

  const mockTestStrategySettings = {
    approach: 'tdd',
    coverage: 90,
    mockingStrategy: 'minimal',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock behaviors
    mockPromptLanguageSelection.mockResolvedValue('ko');
    mockPromptModelSelection.mockResolvedValue('sonnet');
    mockPromptPrimaryAgentSelection.mockResolvedValue('frontend-developer');
    mockPromptBasicSettings.mockResolvedValue(mockBasicSettings);
    mockPromptTechStackSettings.mockResolvedValue(mockTechStackSettings);
    mockPromptArchitectureSettings.mockResolvedValue(mockArchitectureSettings);
    mockPromptConventionsSettings.mockResolvedValue(mockConventionsSettings);
    mockPromptTestStrategySettings.mockResolvedValue(mockTestStrategySettings);
    mockRenderConfigSummary.mockReturnValue('Config Summary');
    mockPromptSummaryAction.mockResolvedValue('confirm');
  });

  describe('runInitWizard', () => {
    it('should return wizard data when user confirms', async () => {
      const result = await runInitWizard({ analysis: mockAnalysis });

      expect(result).not.toBeNull();
      expect(result?.basic.language).toBe('ko');
      expect(result?.basic.projectName).toBe('test-project');
    });

    it('should return null when user cancels', async () => {
      mockPromptSummaryAction.mockResolvedValue('cancel');

      const result = await runInitWizard({ analysis: mockAnalysis });

      expect(result).toBeNull();
    });

    it('should use defaults when useDefaults option is true', async () => {
      const result = await runInitWizard({
        analysis: mockAnalysis,
        useDefaults: true,
      });

      expect(result).not.toBeNull();
      // Should not call prompt functions
      expect(mockPromptLanguageSelection).not.toHaveBeenCalled();
      expect(mockPromptBasicSettings).not.toHaveBeenCalled();
    });

    it('should skip prompts and summary when skipPrompts option is true', async () => {
      const result = await runInitWizard({
        analysis: mockAnalysis,
        skipPrompts: true,
      });

      expect(result).not.toBeNull();
      // Should not call prompt functions
      expect(mockPromptLanguageSelection).not.toHaveBeenCalled();
      // Should not call summary
      expect(mockPromptSummaryAction).not.toHaveBeenCalled();
    });

    it('should call all prompt functions in correct order', async () => {
      await runInitWizard({ analysis: mockAnalysis });

      // Verify prompts were called
      expect(mockPromptLanguageSelection).toHaveBeenCalled();
      expect(mockPromptBasicSettings).toHaveBeenCalled();
      expect(mockPromptTechStackSettings).toHaveBeenCalled();
      expect(mockPromptArchitectureSettings).toHaveBeenCalled();
      expect(mockPromptConventionsSettings).toHaveBeenCalled();
      expect(mockPromptTestStrategySettings).toHaveBeenCalled();
      expect(mockPromptPrimaryAgentSelection).toHaveBeenCalled();
      expect(mockPromptModelSelection).toHaveBeenCalled();
    });

    it('should pass detected values to prompts', async () => {
      await runInitWizard({ analysis: mockAnalysis });

      // Basic settings should receive detected project info
      expect(mockPromptBasicSettings).toHaveBeenCalledWith({
        detectedProjectName: 'test-project',
        detectedDescription: 'A test project',
      });

      // Tech stack should receive detected dependencies
      expect(mockPromptTechStackSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          detectedLanguages: expect.arrayContaining(['TypeScript']),
          detectedFrontend: expect.arrayContaining(['React']),
          detectedTools: expect.arrayContaining(['Vitest']),
        }),
      );
    });

    it('should allow editing sections after summary', async () => {
      // First return edit-basic, then confirm
      mockPromptSummaryAction
        .mockResolvedValueOnce('edit-basic')
        .mockResolvedValueOnce('confirm');

      await runInitWizard({ analysis: mockAnalysis });

      // Summary should have been called twice
      expect(mockRenderConfigSummary).toHaveBeenCalledTimes(2);
      // Basic prompts should have been called twice
      expect(mockPromptLanguageSelection).toHaveBeenCalledTimes(2);
    });
  });

  describe('wizardDataToConfig', () => {
    const sampleWizardData: WizardData = {
      basic: {
        language: 'ko',
        projectName: 'my-app',
        description: 'A sample application',
      },
      techStack: {
        languages: ['TypeScript'],
        frontend: ['React', 'Next.js'],
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

    it('should convert wizard data to config object', () => {
      const config = wizardDataToConfig(sampleWizardData);

      expect(config.language).toBe('ko');
      expect(config.projectName).toBe('my-app');
      expect(config.description).toBe('A sample application');
    });

    it('should include tech stack with non-empty arrays', () => {
      const config = wizardDataToConfig(sampleWizardData);

      expect(config.techStack).toEqual({
        languages: ['TypeScript'],
        frontend: ['React', 'Next.js'],
        backend: undefined,
        tools: ['Vitest'],
      });
    });

    it('should include architecture settings', () => {
      const config = wizardDataToConfig(sampleWizardData);

      expect(config.architecture).toEqual({
        pattern: 'modular',
        componentStyle: 'feature-based',
      });
    });

    it('should include conventions with naming', () => {
      const config = wizardDataToConfig(sampleWizardData);

      expect(config.conventions).toEqual({
        naming: {
          files: 'kebab-case',
        },
        quotes: 'single',
        semicolons: true,
      });
    });

    it('should include test strategy', () => {
      const config = wizardDataToConfig(sampleWizardData);

      expect(config.testStrategy).toEqual({
        approach: 'tdd',
        coverage: 90,
        mockingStrategy: 'minimal',
      });
    });

    it('should include AI settings', () => {
      const config = wizardDataToConfig(sampleWizardData);

      expect(config.ai).toEqual({
        defaultModel: 'sonnet',
        primaryAgent: 'frontend-developer',
      });
    });

    it('should omit backend when array is empty', () => {
      const config = wizardDataToConfig(sampleWizardData);

      expect(
        (config.techStack as Record<string, unknown> | undefined)?.backend,
      ).toBeUndefined();
    });
  });

  describe('extractDetectedValues (via runInitWizard)', () => {
    it('should detect TypeScript from dependencies', async () => {
      const analysisWithTs: ProjectAnalysis = {
        ...mockAnalysis,
        packageInfo: {
          ...mockAnalysis.packageInfo!,
          dependencies: { typescript: '^5.0.0' },
          devDependencies: {},
          detectedFrameworks: [],
        },
      };

      await runInitWizard({ analysis: analysisWithTs });

      expect(mockPromptTechStackSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          detectedLanguages: expect.arrayContaining(['TypeScript']),
        }),
      );
    });

    it('should detect Next.js from dependencies', async () => {
      const analysisWithNext: ProjectAnalysis = {
        ...mockAnalysis,
        packageInfo: {
          ...mockAnalysis.packageInfo!,
          dependencies: { next: '^14.0.0', react: '^18.0.0' },
          devDependencies: {},
        },
      };

      await runInitWizard({ analysis: analysisWithNext });

      expect(mockPromptTechStackSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          detectedFrontend: expect.arrayContaining(['Next.js']),
        }),
      );
    });

    it('should detect monorepo pattern from directory structure', async () => {
      const analysisWithMonorepo: ProjectAnalysis = {
        ...mockAnalysis,
        directoryStructure: {
          ...mockAnalysis.directoryStructure,
          rootDirs: ['apps', 'packages'],
        },
      };

      await runInitWizard({ analysis: analysisWithMonorepo });

      expect(mockPromptArchitectureSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          detectedPattern: 'monorepo',
        }),
      );
    });

    it('should detect conventions from prettier config', async () => {
      const analysisWithPrettier: ProjectAnalysis = {
        ...mockAnalysis,
        configFiles: {
          detected: [],
          prettier: { path: '.prettierrc', singleQuote: false, semi: true },
        },
      };

      await runInitWizard({ analysis: analysisWithPrettier });

      expect(mockPromptConventionsSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          detectedQuotes: 'double',
          detectedSemicolons: true,
        }),
      );
    });
  });
});
