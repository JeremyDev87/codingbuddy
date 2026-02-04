/**
 * Config Renderer Tests
 *
 * Tests for rendering config objects (from wizard) to JSON format.
 * JavaScript rendering was removed for ESM/CJS compatibility.
 */

import { describe, it, expect } from 'vitest';
import { renderConfigObjectAsJson } from './config-renderer';

describe('config-renderer', () => {
  const sampleConfig = {
    language: 'ko',
    projectName: 'my-project',
    description: 'A sample project',
    techStack: {
      languages: ['TypeScript', 'JavaScript'],
      frontend: ['React', 'Next.js'],
      backend: ['NestJS'],
      tools: ['Vitest', 'ESLint'],
    },
    architecture: {
      pattern: 'modular',
      componentStyle: 'feature-based',
    },
    conventions: {
      naming: {
        files: 'kebab-case',
      },
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

  describe('renderConfigObjectAsJson', () => {
    it('should render config object as valid JSON', () => {
      const result = renderConfigObjectAsJson(sampleConfig);

      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('should include all config sections', () => {
      const result = renderConfigObjectAsJson(sampleConfig);
      const parsed = JSON.parse(result);

      expect(parsed.language).toBe('ko');
      expect(parsed.projectName).toBe('my-project');
      expect(parsed.techStack.languages).toEqual(['TypeScript', 'JavaScript']);
      expect(parsed.architecture.pattern).toBe('modular');
      expect(parsed.conventions.quotes).toBe('single');
      expect(parsed.testStrategy.approach).toBe('tdd');
      expect(parsed.ai.defaultModel).toBe('sonnet');
    });

    it('should handle empty arrays by omitting them', () => {
      const configWithEmptyArrays = {
        ...sampleConfig,
        techStack: {
          languages: ['TypeScript'],
          frontend: [],
          backend: [],
          tools: [],
        },
      };

      const result = renderConfigObjectAsJson(configWithEmptyArrays);
      const parsed = JSON.parse(result);

      expect(parsed.techStack.languages).toEqual(['TypeScript']);
      expect(parsed.techStack.frontend).toBeUndefined();
      expect(parsed.techStack.backend).toBeUndefined();
      expect(parsed.techStack.tools).toBeUndefined();
    });

    it('should be formatted with 2-space indentation', () => {
      const result = renderConfigObjectAsJson(sampleConfig);

      expect(result).toContain('  "language"');
    });

    it('should handle minimal config', () => {
      const minimalConfig = {
        language: 'en',
        projectName: 'test',
      };

      const result = renderConfigObjectAsJson(minimalConfig);
      const parsed = JSON.parse(result);

      expect(parsed.language).toBe('en');
      expect(parsed.projectName).toBe('test');
      expect(parsed.techStack).toBeUndefined();
      expect(parsed.architecture).toBeUndefined();
    });

    it('should safely handle special characters in values', () => {
      const configWithSpecialChars = {
        projectName: "test's project",
        description: 'Line 1\nLine 2',
        language: 'en',
      };

      const result = renderConfigObjectAsJson(configWithSpecialChars);
      const parsed = JSON.parse(result);

      expect(parsed.projectName).toBe("test's project");
      expect(parsed.description).toBe('Line 1\nLine 2');
    });
  });
});
