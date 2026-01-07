/**
 * Summary Renderer Tests
 */

import { describe, it, expect } from 'vitest';
import {
  renderConfigSummary,
  type ConfigSummaryData,
} from './summary.renderer';

describe('summary.renderer', () => {
  const sampleData: ConfigSummaryData = {
    basic: {
      language: 'ko',
      projectName: 'my-project',
      description: 'A sample project',
    },
    techStack: {
      languages: ['TypeScript', 'JavaScript'],
      frontend: ['React', 'Next.js'],
      backend: ['NestJS'],
      tools: ['Vitest', 'ESLint'],
    },
    architecture: {
      pattern: 'monorepo',
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
      defaultModel: 'claude-sonnet-4-20250514',
      primaryAgent: 'frontend-developer',
    },
  };

  describe('renderConfigSummary', () => {
    it('should return a string', () => {
      const result = renderConfigSummary(sampleData);
      expect(typeof result).toBe('string');
    });

    it('should include Basic section', () => {
      const result = renderConfigSummary(sampleData);
      expect(result).toContain('[Basic]');
      expect(result).toContain('Language');
      expect(result).toContain('ko');
    });

    it('should include Tech Stack section', () => {
      const result = renderConfigSummary(sampleData);
      expect(result).toContain('[Tech Stack]');
      expect(result).toContain('TypeScript');
      expect(result).toContain('React');
    });

    it('should include Architecture section', () => {
      const result = renderConfigSummary(sampleData);
      expect(result).toContain('[Architecture]');
      expect(result).toContain('monorepo');
    });

    it('should include Conventions section', () => {
      const result = renderConfigSummary(sampleData);
      expect(result).toContain('[Conventions]');
      expect(result).toContain('kebab-case');
    });

    it('should include Test Strategy section', () => {
      const result = renderConfigSummary(sampleData);
      expect(result).toContain('[Test Strategy]');
      expect(result).toContain('tdd');
      expect(result).toContain('90');
    });

    it('should include AI section', () => {
      const result = renderConfigSummary(sampleData);
      expect(result).toContain('[AI]');
      expect(result).toContain('frontend-developer');
    });

    it('should handle empty arrays gracefully', () => {
      const dataWithEmpty: ConfigSummaryData = {
        ...sampleData,
        techStack: {
          languages: [],
          frontend: [],
          backend: [],
          tools: [],
        },
      };
      const result = renderConfigSummary(dataWithEmpty);
      expect(result).toContain('[Tech Stack]');
      expect(result).toContain('(none)');
    });
  });
});
