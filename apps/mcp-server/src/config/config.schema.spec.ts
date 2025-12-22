import { describe, it, expect } from 'vitest';
import {
  validateConfig,
  parseConfig,
  isCodingBuddyConfig,
  CodingBuddyConfigSchema,
} from './config.schema';
import type { CodingBuddyConfig } from './config.schema';

describe('CodingBuddyConfigSchema', () => {
  describe('validateConfig', () => {
    it('should accept empty config (all fields optional)', () => {
      const result = validateConfig({});
      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it('should accept minimal config with basic fields', () => {
      const config = {
        language: 'ko',
        projectName: 'my-app',
      };
      const result = validateConfig(config);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(config);
    });

    it('should accept config with valid repository URL', () => {
      const config = {
        repository: 'https://github.com/example/app',
      };
      const result = validateConfig(config);
      expect(result.success).toBe(true);
      expect(result.data?.repository).toBe('https://github.com/example/app');
    });

    it('should reject config with invalid repository URL', () => {
      const config = {
        repository: 'not-a-valid-url',
      };
      const result = validateConfig(config);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].path).toBe('repository');
    });

    it('should accept full config with all nested fields', () => {
      const config: CodingBuddyConfig = {
        language: 'en',
        projectName: 'full-app',
        description: 'A full featured app',
        repository: 'https://github.com/example/app',
        techStack: {
          languages: ['TypeScript', 'Python'],
          frontend: ['React', 'Next.js'],
          backend: ['NestJS'],
          database: ['PostgreSQL'],
          infrastructure: ['Docker', 'AWS'],
          tools: ['ESLint'],
        },
        architecture: {
          pattern: 'feature-sliced',
          structure: ['src/', 'features/'],
          componentStyle: 'feature-based',
        },
        conventions: {
          style: 'airbnb',
          naming: {
            files: 'kebab-case',
            components: 'PascalCase',
          },
          quotes: 'single',
          semicolons: true,
        },
        testStrategy: {
          approach: 'tdd',
          frameworks: ['vitest'],
          coverage: 80,
        },
        keyFiles: ['src/types.ts'],
        avoid: ['legacy-api'],
      };

      const result = validateConfig(config);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(config);
    });

    it('should accept config with deep optional fields', () => {
      const config: CodingBuddyConfig = {
        techStack: {
          frontend: ['React'],
          details: {
            React: {
              version: '18.x',
              notes: 'Using concurrent features',
            },
          },
        },
        architecture: {
          pattern: 'layered',
          layers: [
            {
              name: 'domain',
              path: 'src/domain',
              description: 'Business logic',
            },
            { name: 'infra', path: 'src/infra', dependencies: ['domain'] },
          ],
        },
      };

      const result = validateConfig(config);
      expect(result.success).toBe(true);
    });

    it('should reject invalid naming convention enum', () => {
      const config = {
        conventions: {
          naming: {
            files: 'invalid-case', // invalid enum value
          },
        },
      };

      const result = validateConfig(config);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should reject invalid coverage value (over 100)', () => {
      const config = {
        testStrategy: {
          coverage: 150, // invalid: should be 0-100
        },
      };

      const result = validateConfig(config);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject invalid coverage value (negative)', () => {
      const config = {
        testStrategy: {
          coverage: -10,
        },
      };

      const result = validateConfig(config);
      expect(result.success).toBe(false);
    });

    it('should reject non-object config', () => {
      expect(validateConfig(null).success).toBe(false);
      expect(validateConfig('string').success).toBe(false);
      expect(validateConfig(123).success).toBe(false);
      expect(validateConfig([]).success).toBe(false);
    });

    it('should provide error path for nested validation errors', () => {
      const config = {
        conventions: {
          naming: {
            files: 'invalid',
          },
        },
      };

      const result = validateConfig(config);
      expect(result.success).toBe(false);
      expect(result.errors![0].path).toContain('conventions');
    });
  });

  describe('parseConfig', () => {
    it('should return parsed config for valid input', () => {
      const config = { language: 'ko' };
      const result = parseConfig(config);
      expect(result).toEqual(config);
    });

    it('should throw for invalid input', () => {
      expect(() => parseConfig({ testStrategy: { coverage: 200 } })).toThrow();
    });
  });

  describe('isCodingBuddyConfig', () => {
    it('should return true for valid config', () => {
      expect(isCodingBuddyConfig({})).toBe(true);
      expect(isCodingBuddyConfig({ language: 'ko' })).toBe(true);
      expect(isCodingBuddyConfig({ techStack: { frontend: ['React'] } })).toBe(
        true,
      );
    });

    it('should return false for invalid config', () => {
      expect(isCodingBuddyConfig(null)).toBe(false);
      expect(isCodingBuddyConfig('string')).toBe(false);
      expect(isCodingBuddyConfig({ testStrategy: { coverage: 200 } })).toBe(
        false,
      );
      expect(
        isCodingBuddyConfig({ conventions: { naming: { files: 'invalid' } } }),
      ).toBe(false);
    });

    it('should reject invalid repository URL', () => {
      expect(isCodingBuddyConfig({ repository: 'not-a-url' })).toBe(false);
    });
  });

  describe('schema type inference', () => {
    it('should correctly infer types from schema', () => {
      const config = CodingBuddyConfigSchema.parse({
        language: 'en',
        techStack: {
          frontend: ['React'],
        },
      });

      // TypeScript should infer these correctly
      expect(typeof config.language).toBe('string');
      expect(Array.isArray(config.techStack?.frontend)).toBe(true);
    });
  });
});
