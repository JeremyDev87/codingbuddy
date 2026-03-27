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
      expect(result.data).toEqual({ eco: true, tui: true, tone: 'casual' });
    });

    it('should accept minimal config with basic fields', () => {
      const config = {
        language: 'ko',
        projectName: 'my-app',
      };
      const result = validateConfig(config);
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject(config);
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
      expect(result.data).toMatchObject(config);
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
      expect(result).toMatchObject(config);
    });

    it('should throw for invalid input', () => {
      expect(() => parseConfig({ testStrategy: { coverage: 200 } })).toThrow();
    });
  });

  describe('isCodingBuddyConfig', () => {
    it('should return true for valid config', () => {
      expect(isCodingBuddyConfig({})).toBe(true);
      expect(isCodingBuddyConfig({ language: 'ko' })).toBe(true);
      expect(isCodingBuddyConfig({ techStack: { frontend: ['React'] } })).toBe(true);
    });

    it('should return false for invalid config', () => {
      expect(isCodingBuddyConfig(null)).toBe(false);
      expect(isCodingBuddyConfig('string')).toBe(false);
      expect(isCodingBuddyConfig({ testStrategy: { coverage: 200 } })).toBe(false);
      expect(isCodingBuddyConfig({ conventions: { naming: { files: 'invalid' } } })).toBe(false);
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

  describe('AIConfigSchema', () => {
    it('should accept valid ai config with defaultModel', () => {
      const config = {
        ai: {
          defaultModel: 'claude-opus-4-20250514',
        },
      };
      const result = validateConfig(config);
      expect(result.success).toBe(true);
      expect(result.data?.ai?.defaultModel).toBe('claude-opus-4-20250514');
    });

    it('should accept config without ai field', () => {
      const config = {
        language: 'ko',
      };
      const result = validateConfig(config);
      expect(result.success).toBe(true);
    });

    it('should accept ai config with empty object', () => {
      const config = {
        ai: {},
      };
      const result = validateConfig(config);
      expect(result.success).toBe(true);
    });
  });

  describe('eco/tui/tone fields', () => {
    it('should accept config with eco field (boolean)', () => {
      const result = validateConfig({ eco: true });
      expect(result.success).toBe(true);
      expect(result.data?.eco).toBe(true);
    });

    it('should accept config with eco=false', () => {
      const result = validateConfig({ eco: false });
      expect(result.success).toBe(true);
      expect(result.data?.eco).toBe(false);
    });

    it('should reject non-boolean eco', () => {
      const result = validateConfig({ eco: 'yes' });
      expect(result.success).toBe(false);
    });

    it('should default eco to true when parsed', () => {
      const result = CodingBuddyConfigSchema.parse({});
      expect(result.eco).toBe(true);
    });

    it('should accept config with tui field (boolean)', () => {
      const result = validateConfig({ tui: true });
      expect(result.success).toBe(true);
      expect(result.data?.tui).toBe(true);
    });

    it('should accept config with tui=false', () => {
      const result = validateConfig({ tui: false });
      expect(result.success).toBe(true);
      expect(result.data?.tui).toBe(false);
    });

    it('should reject non-boolean tui', () => {
      const result = validateConfig({ tui: 'no' });
      expect(result.success).toBe(false);
    });

    it('should default tui to true when parsed', () => {
      const result = CodingBuddyConfigSchema.parse({});
      expect(result.tui).toBe(true);
    });

    it('should accept config with tone="casual"', () => {
      const result = validateConfig({ tone: 'casual' });
      expect(result.success).toBe(true);
      expect(result.data?.tone).toBe('casual');
    });

    it('should accept config with tone="formal"', () => {
      const result = validateConfig({ tone: 'formal' });
      expect(result.success).toBe(true);
      expect(result.data?.tone).toBe('formal');
    });

    it('should reject invalid tone value', () => {
      const result = validateConfig({ tone: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('should default tone to "casual" when parsed', () => {
      const result = CodingBuddyConfigSchema.parse({});
      expect(result.tone).toBe('casual');
    });

    it('should accept config with all three fields together', () => {
      const result = validateConfig({ eco: false, tui: true, tone: 'formal' });
      expect(result.success).toBe(true);
      expect(result.data?.eco).toBe(false);
      expect(result.data?.tui).toBe(true);
      expect(result.data?.tone).toBe('formal');
    });

    it('should work without new fields (backward compatible)', () => {
      const result = validateConfig({ language: 'ko', projectName: 'test' });
      expect(result.success).toBe(true);
    });
  });

  describe('AutoConfigSchema', () => {
    it('should accept valid auto configuration', () => {
      const config = {
        auto: {
          maxIterations: 5,
        },
      };
      const result = validateConfig(config);
      expect(result.success).toBe(true);
      expect(result.data?.auto?.maxIterations).toBe(5);
    });

    it('should use default maxIterations of 3', () => {
      const config = {
        auto: {},
      };
      const result = CodingBuddyConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.auto?.maxIterations).toBe(3);
      }
    });

    it('should reject maxIterations below 1', () => {
      const config = {
        auto: {
          maxIterations: 0,
        },
      };
      const result = validateConfig(config);
      expect(result.success).toBe(false);
    });

    it('should reject maxIterations above 10', () => {
      const config = {
        auto: {
          maxIterations: 11,
        },
      };
      const result = validateConfig(config);
      expect(result.success).toBe(false);
    });
  });
});
