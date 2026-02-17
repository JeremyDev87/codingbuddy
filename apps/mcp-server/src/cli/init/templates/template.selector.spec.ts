/**
 * Template Selector Tests
 */

import { describe, it, expect } from 'vitest';
import { selectTemplate, getTemplateById, getAllTemplates } from './template.selector';
import type { ProjectAnalysis, DetectedFramework } from '../../../analyzer';
import type { FrameworkType } from './template.types';

describe('Template Selector', () => {
  const createMockAnalysis = (
    frameworks: DetectedFramework[] = [],
    patterns: string[] = [],
  ): ProjectAnalysis => ({
    packageInfo: {
      name: 'test-project',
      version: '1.0.0',
      dependencies: {},
      devDependencies: {},
      scripts: {},
      detectedFrameworks: frameworks,
    },
    directoryStructure: {
      rootDirs: [],
      rootFiles: [],
      allFiles: [],
      patterns: [],
      totalFiles: 0,
      totalDirs: 0,
    },
    configFiles: {
      detected: [],
    },
    codeSamples: [],
    detectedPatterns: patterns,
  });

  describe('selectTemplate', () => {
    it('selects Next.js template when next is detected', () => {
      const analysis = createMockAnalysis([
        { name: 'next', category: 'fullstack', version: '14.0.0' },
        { name: 'react', category: 'frontend', version: '18.0.0' },
      ]);

      const result = selectTemplate(analysis);

      expect(result.template.metadata.id).toBe('nextjs');
      expect(result.detectedFrameworks).toContain('next');
    });

    it('selects React template when only react is detected', () => {
      const analysis = createMockAnalysis([
        { name: 'react', category: 'frontend', version: '18.0.0' },
      ]);

      const result = selectTemplate(analysis);

      expect(result.template.metadata.id).toBe('react');
      expect(result.detectedFrameworks).toContain('react');
    });

    it('selects NestJS template when @nestjs/core is detected', () => {
      const analysis = createMockAnalysis([
        { name: '@nestjs/core', category: 'backend', version: '10.0.0' },
      ]);

      const result = selectTemplate(analysis);

      expect(result.template.metadata.id).toBe('nestjs');
      expect(result.detectedFrameworks).toContain('@nestjs/core');
    });

    it('selects Express template when express is detected', () => {
      const analysis = createMockAnalysis([
        { name: 'express', category: 'backend', version: '4.18.0' },
      ]);

      const result = selectTemplate(analysis);

      expect(result.template.metadata.id).toBe('express');
    });

    it('selects Node template when no framework but has node patterns', () => {
      const analysis = createMockAnalysis([], ['node-project']);

      const result = selectTemplate(analysis);

      expect(result.template.metadata.id).toBe('node');
    });

    it('selects default template when nothing is detected', () => {
      const analysis = createMockAnalysis();

      const result = selectTemplate(analysis);

      expect(result.template.metadata.id).toBe('default');
      expect(result.reason).toContain('default');
    });

    it('prioritizes fullstack over frontend templates', () => {
      const analysis = createMockAnalysis([
        { name: 'react', category: 'frontend', version: '18.0.0' },
        { name: 'next', category: 'fullstack', version: '14.0.0' },
      ]);

      const result = selectTemplate(analysis);

      expect(result.template.metadata.id).toBe('nextjs');
    });

    it('handles null packageInfo gracefully', () => {
      const analysis: ProjectAnalysis = {
        packageInfo: null,
        directoryStructure: {
          rootDirs: [],
          rootFiles: [],
          allFiles: [],
          patterns: [],
          totalFiles: 0,
          totalDirs: 0,
        },
        configFiles: { detected: [] },
        codeSamples: [],
        detectedPatterns: [],
      };

      const result = selectTemplate(analysis);

      expect(result.template.metadata.id).toBe('default');
    });
  });

  describe('getTemplateById', () => {
    it('returns template for valid id', () => {
      const template = getTemplateById('nextjs');

      expect(template).toBeDefined();
      expect(template?.metadata.id).toBe('nextjs');
    });

    it('returns undefined for invalid id', () => {
      const template = getTemplateById('invalid' as FrameworkType);

      expect(template).toBeUndefined();
    });

    it('returns all standard templates', () => {
      const types: FrameworkType[] = ['nextjs', 'react', 'nestjs', 'express', 'node', 'default'];

      for (const type of types) {
        const template = getTemplateById(type);
        expect(template).toBeDefined();
        expect(template?.metadata.id).toBe(type);
      }
    });
  });

  describe('getAllTemplates', () => {
    it('returns all available templates', () => {
      const templates = getAllTemplates();

      expect(templates.length).toBeGreaterThanOrEqual(6);
      expect(templates.map(t => t.metadata.id)).toContain('nextjs');
      expect(templates.map(t => t.metadata.id)).toContain('react');
      expect(templates.map(t => t.metadata.id)).toContain('nestjs');
    });

    it('each template has required metadata', () => {
      const templates = getAllTemplates();

      for (const template of templates) {
        expect(template.metadata.id).toBeDefined();
        expect(template.metadata.name).toBeDefined();
        expect(template.metadata.description).toBeDefined();
        expect(template.config).toBeDefined();
        expect(template.comments).toBeDefined();
      }
    });
  });
});
