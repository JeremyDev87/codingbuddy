/**
 * ConfigDiffService Tests
 *
 * Tests for comparing project analysis with current config
 */

import { describe, it, expect } from 'vitest';
import { ConfigDiffService, ConfigDiffResult } from './config-diff.service';
import type { ProjectAnalysis } from '../analyzer';
import type { CodingBuddyConfig } from './config.schema';

describe('ConfigDiffService', () => {
  const service = new ConfigDiffService();

  const createMockAnalysis = (overrides: Partial<ProjectAnalysis> = {}): ProjectAnalysis => ({
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
    ...overrides,
  });

  describe('compareConfig', () => {
    it('should return empty suggestions when config matches analysis', () => {
      const analysis = createMockAnalysis({
        packageInfo: {
          name: 'test-app',
          version: '1.0.0',
          dependencies: { react: '^18.0.0' },
          devDependencies: {},
          scripts: {},
          detectedFrameworks: [{ name: 'React', category: 'frontend', version: '^18.0.0' }],
        },
        configFiles: {
          detected: ['tsconfig.json'],
          typescript: {
            path: 'tsconfig.json',
            strict: true,
            hasPathAliases: false,
          },
        },
      });

      const config: CodingBuddyConfig = {
        projectName: 'test-app',
        techStack: {
          frontend: ['React'],
          languages: ['TypeScript'],
        },
      };

      const result = service.compareConfig(analysis, config);

      expect(result.suggestions).toHaveLength(0);
      expect(result.isUpToDate).toBe(true);
    });

    it('should suggest adding missing frontend frameworks', () => {
      const analysis = createMockAnalysis({
        packageInfo: {
          name: 'test-app',
          version: '1.0.0',
          dependencies: { react: '^18.0.0', next: '^14.0.0' },
          devDependencies: {},
          scripts: {},
          detectedFrameworks: [
            { name: 'React', category: 'frontend', version: '^18.0.0' },
            { name: 'Next.js', category: 'fullstack', version: '^14.0.0' },
          ],
        },
      });

      const config: CodingBuddyConfig = {
        projectName: 'test-app',
        techStack: {
          frontend: ['React'],
        },
      };

      const result = service.compareConfig(analysis, config);

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.isUpToDate).toBe(false);

      const frontendSuggestion = result.suggestions.find(s => s.field === 'techStack.frontend');
      expect(frontendSuggestion).toBeDefined();
      expect(frontendSuggestion?.suggestedValue).toContain('Next.js');
    });

    it('should suggest adding missing backend frameworks', () => {
      const analysis = createMockAnalysis({
        packageInfo: {
          name: 'test-app',
          version: '1.0.0',
          dependencies: { '@nestjs/core': '^10.0.0' },
          devDependencies: {},
          scripts: {},
          detectedFrameworks: [{ name: 'NestJS', category: 'backend', version: '^10.0.0' }],
        },
      });

      const config: CodingBuddyConfig = {
        projectName: 'test-app',
      };

      const result = service.compareConfig(analysis, config);

      const backendSuggestion = result.suggestions.find(s => s.field === 'techStack.backend');
      expect(backendSuggestion).toBeDefined();
      expect(backendSuggestion?.suggestedValue).toContain('NestJS');
    });

    it('should suggest updating project name if different', () => {
      const analysis = createMockAnalysis({
        packageInfo: {
          name: 'new-project-name',
          version: '1.0.0',
          dependencies: {},
          devDependencies: {},
          scripts: {},
          detectedFrameworks: [],
        },
      });

      const config: CodingBuddyConfig = {
        projectName: 'old-project-name',
      };

      const result = service.compareConfig(analysis, config);

      const nameSuggestion = result.suggestions.find(s => s.field === 'projectName');
      expect(nameSuggestion).toBeDefined();
      expect(nameSuggestion?.suggestedValue).toBe('new-project-name');
      expect(nameSuggestion?.currentValue).toBe('old-project-name');
    });

    it('should suggest adding testing frameworks', () => {
      const analysis = createMockAnalysis({
        packageInfo: {
          name: 'test-app',
          version: '1.0.0',
          dependencies: {},
          devDependencies: {
            vitest: '^1.0.0',
            '@testing-library/react': '^14.0.0',
          },
          scripts: {},
          detectedFrameworks: [
            { name: 'Vitest', category: 'testing', version: '^1.0.0' },
            {
              name: 'Testing Library',
              category: 'testing',
              version: '^14.0.0',
            },
          ],
        },
      });

      const config: CodingBuddyConfig = {
        projectName: 'test-app',
      };

      const result = service.compareConfig(analysis, config);

      const testSuggestion = result.suggestions.find(s => s.field === 'testStrategy.frameworks');
      expect(testSuggestion).toBeDefined();
      expect(testSuggestion?.suggestedValue).toContain('Vitest');
    });

    it('should handle empty config', () => {
      const analysis = createMockAnalysis({
        packageInfo: {
          name: 'test-app',
          version: '1.0.0',
          dependencies: { react: '^18.0.0' },
          devDependencies: {},
          scripts: {},
          detectedFrameworks: [{ name: 'React', category: 'frontend', version: '^18.0.0' }],
        },
      });

      const config: CodingBuddyConfig = {};

      const result = service.compareConfig(analysis, config);

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.isUpToDate).toBe(false);
    });

    it('should suggest database frameworks', () => {
      const analysis = createMockAnalysis({
        packageInfo: {
          name: 'test-app',
          version: '1.0.0',
          dependencies: { prisma: '^5.0.0' },
          devDependencies: {},
          scripts: {},
          detectedFrameworks: [{ name: 'Prisma', category: 'database', version: '^5.0.0' }],
        },
      });

      const config: CodingBuddyConfig = {
        projectName: 'test-app',
      };

      const result = service.compareConfig(analysis, config);

      const dbSuggestion = result.suggestions.find(s => s.field === 'techStack.database');
      expect(dbSuggestion).toBeDefined();
      expect(dbSuggestion?.suggestedValue).toContain('Prisma');
    });

    it('should detect TypeScript usage from config files', () => {
      const analysis = createMockAnalysis({
        configFiles: {
          detected: ['tsconfig.json'],
          typescript: {
            path: 'tsconfig.json',
            strict: true,
            hasPathAliases: false,
          },
        },
      });

      const config: CodingBuddyConfig = {
        projectName: 'test-app',
      };

      const result = service.compareConfig(analysis, config);

      const langSuggestion = result.suggestions.find(s => s.field === 'techStack.languages');
      expect(langSuggestion).toBeDefined();
      expect(langSuggestion?.suggestedValue).toContain('TypeScript');
    });

    it('should detect JavaScript usage when no TypeScript config', () => {
      const analysis = createMockAnalysis({
        packageInfo: {
          name: 'js-app',
          version: '1.0.0',
          dependencies: {},
          devDependencies: {},
          scripts: {},
          detectedFrameworks: [],
        },
        configFiles: {
          detected: ['package.json'],
        },
      });

      const config: CodingBuddyConfig = {
        projectName: 'js-app',
      };

      const result = service.compareConfig(analysis, config);

      const langSuggestion = result.suggestions.find(s => s.field === 'techStack.languages');
      expect(langSuggestion).toBeDefined();
      expect(langSuggestion?.suggestedValue).toContain('JavaScript');
    });

    it('should detect JavaScript from jsconfig.json', () => {
      const analysis = createMockAnalysis({
        configFiles: {
          detected: ['jsconfig.json'],
        },
      });

      const config: CodingBuddyConfig = {
        projectName: 'test-app',
      };

      const result = service.compareConfig(analysis, config);

      const langSuggestion = result.suggestions.find(s => s.field === 'techStack.languages');
      expect(langSuggestion).toBeDefined();
      expect(langSuggestion?.suggestedValue).toContain('JavaScript');
    });

    it('should prefer TypeScript over JavaScript when both present', () => {
      const analysis = createMockAnalysis({
        packageInfo: {
          name: 'ts-app',
          version: '1.0.0',
          dependencies: {},
          devDependencies: {},
          scripts: {},
          detectedFrameworks: [],
        },
        configFiles: {
          detected: ['tsconfig.json', 'package.json'],
          typescript: {
            path: 'tsconfig.json',
            strict: true,
            hasPathAliases: false,
          },
        },
      });

      const config: CodingBuddyConfig = {
        projectName: 'ts-app',
      };

      const result = service.compareConfig(analysis, config);

      const langSuggestion = result.suggestions.find(s => s.field === 'techStack.languages');
      expect(langSuggestion).toBeDefined();
      expect(langSuggestion?.suggestedValue).toContain('TypeScript');
      expect(langSuggestion?.suggestedValue).not.toContain('JavaScript');
    });
  });

  describe('formatSuggestionsAsText', () => {
    it('should format suggestions in human-readable text', () => {
      const result: ConfigDiffResult = {
        isUpToDate: false,
        suggestions: [
          {
            field: 'techStack.frontend',
            reason: 'Detected new frontend framework',
            currentValue: ['React'],
            suggestedValue: ['React', 'Next.js'],
            priority: 'high',
          },
        ],
      };

      const text = service.formatSuggestionsAsText(result);

      expect(text).toContain('techStack.frontend');
      expect(text).toContain('Next.js');
      expect(text).toContain('HIGH');
    });

    it('should return up-to-date message when no suggestions', () => {
      const result: ConfigDiffResult = {
        isUpToDate: true,
        suggestions: [],
      };

      const text = service.formatSuggestionsAsText(result);

      expect(text).toContain('up to date');
    });
  });
});
