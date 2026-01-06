import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ConfigGenerator,
  ConfigGeneratorOptions,
  parseJsonResponse,
  extractJsonFromResponse,
} from './config.generator';
import type { ProjectAnalysis } from '../../analyzer';
import { SYSTEM_DEFAULT_MODEL } from '../../model';

// Mock function for messages.create
const mockCreate = vi.fn();

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = {
      create: mockCreate,
    };
  },
}));

describe('config.generator', () => {
  const mockAnalysis: ProjectAnalysis = {
    packageInfo: {
      name: 'test-app',
      version: '1.0.0',
      dependencies: { react: '^18.0.0' },
      devDependencies: { typescript: '^5.0.0' },
      scripts: { dev: 'next dev' },
      detectedFrameworks: [
        { name: 'React', category: 'frontend', version: '^18.0.0' },
      ],
    },
    directoryStructure: {
      rootDirs: ['src', 'components'],
      rootFiles: ['package.json'],
      allFiles: ['src/index.ts'],
      patterns: [],
      totalFiles: 10,
      totalDirs: 5,
    },
    configFiles: {
      detected: ['tsconfig.json'],
    },
    codeSamples: [],
    detectedPatterns: ['React Project'],
  };

  describe('extractJsonFromResponse', () => {
    it('should extract JSON from plain JSON response', () => {
      const response = '{"projectName": "test"}';

      const result = extractJsonFromResponse(response);

      expect(result).toBe('{"projectName": "test"}');
    });

    it('should extract JSON from markdown code block', () => {
      const response = '```json\n{"projectName": "test"}\n```';

      const result = extractJsonFromResponse(response);

      expect(result).toBe('{"projectName": "test"}');
    });

    it('should extract JSON from response with surrounding text', () => {
      const response =
        'Here is the config:\n```json\n{"projectName": "test"}\n```\nEnjoy!';

      const result = extractJsonFromResponse(response);

      expect(result).toBe('{"projectName": "test"}');
    });

    it('should handle response without code block markers', () => {
      const response = 'Some text {"projectName": "test"} more text';

      const result = extractJsonFromResponse(response);

      expect(result).toBe('{"projectName": "test"}');
    });

    it('should return null for invalid response', () => {
      const response = 'No JSON here';

      const result = extractJsonFromResponse(response);

      expect(result).toBeNull();
    });
  });

  describe('parseJsonResponse', () => {
    it('should parse valid JSON response', () => {
      const response = '{"projectName": "test", "language": "ko"}';

      const result = parseJsonResponse(response);

      expect(result).toEqual({ projectName: 'test', language: 'ko' });
    });

    it('should parse JSON from markdown code block', () => {
      const response = '```json\n{"projectName": "test"}\n```';

      const result = parseJsonResponse(response);

      expect(result).toEqual({ projectName: 'test' });
    });

    it('should parse complex nested config', () => {
      const response = JSON.stringify({
        projectName: 'my-app',
        techStack: {
          frontend: ['React', 'TypeScript'],
        },
        conventions: {
          naming: {
            files: 'kebab-case',
          },
        },
      });

      const result = parseJsonResponse(response);

      expect(result.projectName).toBe('my-app');
      expect(result.techStack?.frontend).toContain('React');
      expect(result.conventions?.naming?.files).toBe('kebab-case');
    });

    it('should throw on invalid JSON', () => {
      const response = 'not valid json';

      expect(() => parseJsonResponse(response)).toThrow();
    });

    it('should validate against schema and filter invalid fields', () => {
      const response = JSON.stringify({
        projectName: 'test',
        invalidField: 'should be ignored',
        techStack: {
          frontend: ['React'],
        },
      });

      const result = parseJsonResponse(response);

      expect(result.projectName).toBe('test');
      expect(result.techStack?.frontend).toContain('React');
      // Invalid field should be stripped by schema validation
    });
  });

  describe('ConfigGenerator', () => {
    let generator: ConfigGenerator;

    beforeEach(() => {
      mockCreate.mockReset();
      generator = new ConfigGenerator({ apiKey: 'test-key' });
    });

    it('should generate config from analysis', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              projectName: 'test-app',
              language: 'en',
              techStack: {
                frontend: ['React'],
              },
            }),
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await generator.generate(mockAnalysis);

      expect(result.projectName).toBe('test-app');
      expect(result.techStack?.frontend).toContain('React');
    });

    it('should call Anthropic API with correct parameters', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: '{"projectName": "test"}' }],
      };

      mockCreate.mockResolvedValue(mockResponse);

      await generator.generate(mockAnalysis);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.any(String),
          max_tokens: expect.any(Number),
          system: expect.any(String),
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.any(String),
            }),
          ]),
        }),
      );
    });

    it('should throw on API error', async () => {
      mockCreate.mockRejectedValue(new Error('API Error'));

      await expect(generator.generate(mockAnalysis)).rejects.toThrow(
        'API Error',
      );
    });

    it('should throw on empty response', async () => {
      const mockResponse = {
        content: [],
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(generator.generate(mockAnalysis)).rejects.toThrow();
    });

    it('should use custom model when specified', async () => {
      const customGenerator = new ConfigGenerator({
        apiKey: 'test-key',
        model: 'claude-3-opus-20240229',
      });

      const mockResponse = {
        content: [{ type: 'text', text: '{"projectName": "test"}' }],
      };

      mockCreate.mockResolvedValue(mockResponse);

      await customGenerator.generate(mockAnalysis);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-opus-20240229',
        }),
      );
    });

    describe('model resolution', () => {
      it('should use model from options when explicitly provided', () => {
        const options: ConfigGeneratorOptions = {
          apiKey: 'test-key',
          model: 'explicit-model',
        };
        const gen = new ConfigGenerator(options);
        expect((gen as unknown as { model: string }).model).toBe(
          'explicit-model',
        );
      });

      it('should use model from global config when options.model is not provided', () => {
        const options: ConfigGeneratorOptions = {
          apiKey: 'test-key',
          config: {
            ai: { defaultModel: 'config-model' },
          },
        };
        const gen = new ConfigGenerator(options);
        expect((gen as unknown as { model: string }).model).toBe(
          'config-model',
        );
      });

      it('should use system default when no model is configured', () => {
        const options: ConfigGeneratorOptions = {
          apiKey: 'test-key',
        };
        const gen = new ConfigGenerator(options);
        expect((gen as unknown as { model: string }).model).toBe(
          SYSTEM_DEFAULT_MODEL,
        );
      });

      it('should prioritize explicit model over config model', () => {
        const options: ConfigGeneratorOptions = {
          apiKey: 'test-key',
          model: 'explicit-model',
          config: {
            ai: { defaultModel: 'config-model' },
          },
        };
        const gen = new ConfigGenerator(options);
        expect((gen as unknown as { model: string }).model).toBe(
          'explicit-model',
        );
      });
    });
  });
});
