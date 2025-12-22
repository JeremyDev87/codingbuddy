import { describe, it, expect } from 'vitest';
import {
  CONFIG_FILE_NAMES,
  ConfigLoadError,
  validateAndTransform,
} from './config.loader';

describe('config.loader', () => {
  describe('CONFIG_FILE_NAMES', () => {
    it('should have correct priority order', () => {
      expect(CONFIG_FILE_NAMES[0]).toBe('codingbuddy.config.js');
      expect(CONFIG_FILE_NAMES[1]).toBe('codingbuddy.config.mjs');
      expect(CONFIG_FILE_NAMES[2]).toBe('codingbuddy.config.json');
    });

    it('should have 3 supported file names', () => {
      expect(CONFIG_FILE_NAMES).toHaveLength(3);
    });
  });

  describe('ConfigLoadError', () => {
    it('should create error with message and file path', () => {
      const error = new ConfigLoadError('Test error', '/path/to/config.js');

      expect(error.message).toBe('Test error');
      expect(error.filePath).toBe('/path/to/config.js');
      expect(error.name).toBe('ConfigLoadError');
    });

    it('should include cause when provided', () => {
      const cause = new Error('Original error');
      const error = new ConfigLoadError(
        'Wrapped error',
        '/path/to/config.js',
        cause,
      );

      expect(error.cause).toBe(cause);
    });

    it('should be instanceof Error', () => {
      const error = new ConfigLoadError('Test', '/path');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('validateAndTransform', () => {
    it('should accept valid config', () => {
      const raw = {
        language: 'ko',
        projectName: 'test-project',
        techStack: {
          frontend: ['React'],
        },
      };

      const result = validateAndTransform(raw, '/path/config.json');

      expect(result.config.language).toBe('ko');
      expect(result.config.projectName).toBe('test-project');
      expect(result.config.techStack?.frontend).toEqual(['React']);
      expect(result.warnings).toEqual([]);
    });

    it('should accept empty config', () => {
      const result = validateAndTransform({}, '/path/config.json');

      expect(result.config).toEqual({});
      expect(result.warnings).toEqual([]);
    });

    it('should throw ConfigLoadError for invalid config', () => {
      const raw = {
        testStrategy: {
          coverage: 200, // invalid: max 100
        },
      };

      expect(() => validateAndTransform(raw, '/path/config.json')).toThrow(
        ConfigLoadError,
      );
    });

    it('should include field path in error message', () => {
      const raw = {
        conventions: {
          naming: {
            files: 'invalid-value',
          },
        },
      };

      try {
        validateAndTransform(raw, '/path/config.json');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigLoadError);
        expect((error as ConfigLoadError).message).toContain('conventions');
      }
    });

    it('should throw ConfigLoadError for invalid URL in repository', () => {
      const raw = {
        repository: 'not-a-valid-url',
      };

      expect(() => validateAndTransform(raw, '/path/config.json')).toThrow(
        ConfigLoadError,
      );
    });
  });
});
