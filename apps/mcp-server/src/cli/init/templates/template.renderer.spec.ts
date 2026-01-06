/**
 * Template Renderer Tests
 */

import { describe, it, expect } from 'vitest';
import { renderConfigAsJs, renderConfigAsJson } from './template.renderer';
import type { ConfigTemplate } from './template.types';
import { nextjsTemplate } from './frameworks';

describe('Template Renderer', () => {
  const mockTemplate: ConfigTemplate = {
    metadata: {
      id: 'default',
      name: 'Test',
      description: 'Test template',
      matchPatterns: [],
    },
    config: {
      language: 'ko',
      projectName: 'test-project',
      techStack: {
        languages: ['TypeScript'],
        frontend: ['React'],
      },
      testStrategy: {
        approach: 'tdd',
        coverage: 90,
      },
    },
    comments: {
      header: '// Header comment',
      language: '// Language comment',
      techStack: '// TechStack comment',
      testStrategy: '// Test comment',
      footer: '// Footer comment',
    },
  };

  describe('renderConfigAsJs', () => {
    it('renders config with header comment', () => {
      const result = renderConfigAsJs(mockTemplate);

      expect(result).toContain('// Header comment');
      expect(result).toContain('module.exports = {');
    });

    it('renders language setting with comment', () => {
      const result = renderConfigAsJs(mockTemplate);

      expect(result).toContain('// Language comment');
      expect(result).toContain("language: 'ko'");
    });

    it('renders techStack with comment', () => {
      const result = renderConfigAsJs(mockTemplate);

      expect(result).toContain('// TechStack comment');
      expect(result).toContain('techStack: {');
      expect(result).toContain("languages: ['TypeScript']");
    });

    it('renders footer comment', () => {
      const result = renderConfigAsJs(mockTemplate);

      expect(result).toContain('// Footer comment');
    });

    it('overrides project name when provided', () => {
      const result = renderConfigAsJs(mockTemplate, { projectName: 'my-app' });

      expect(result).toContain("projectName: 'my-app'");
    });

    it('overrides language when provided', () => {
      const result = renderConfigAsJs(mockTemplate, { language: 'en' });

      expect(result).toContain("language: 'en'");
    });

    it('renders ai section when defaultModel is provided', () => {
      const result = renderConfigAsJs(mockTemplate, {
        defaultModel: 'claude-opus-4-20250514',
      });

      expect(result).toContain('// AI Configuration');
      expect(result).toContain('ai: {');
      expect(result).toContain("defaultModel: 'claude-opus-4-20250514'");
    });

    it('renders ai section when primaryAgent is provided', () => {
      const result = renderConfigAsJs(mockTemplate, {
        primaryAgent: 'frontend-developer',
      });

      expect(result).toContain('// AI Configuration');
      expect(result).toContain('ai: {');
      expect(result).toContain("primaryAgent: 'frontend-developer'");
    });

    it('renders both defaultModel and primaryAgent in ai section', () => {
      const result = renderConfigAsJs(mockTemplate, {
        defaultModel: 'claude-opus-4-20250514',
        primaryAgent: 'backend-developer',
      });

      expect(result).toContain('// AI Configuration');
      expect(result).toContain("defaultModel: 'claude-opus-4-20250514'");
      expect(result).toContain("primaryAgent: 'backend-developer'");
    });

    it('does not render ai section when neither defaultModel nor primaryAgent is provided', () => {
      const result = renderConfigAsJs(mockTemplate);

      expect(result).not.toContain('// AI Configuration');
      expect(result).not.toContain('ai: {');
    });

    it('renders Next.js template correctly', () => {
      const result = renderConfigAsJs(nextjsTemplate, {
        projectName: 'nextjs-app',
      });

      expect(result).toContain('Next.js');
      expect(result).toContain("projectName: 'nextjs-app'");
      expect(result).toContain("frontend: ['React', 'Next.js']");
    });

    it('produces well-formed JavaScript module export', () => {
      const result = renderConfigAsJs(mockTemplate);

      // Check basic structure
      expect(result).toMatch(/^\/\//); // Starts with comment
      expect(result).toContain('module.exports = {');
      expect(result).toContain('};'); // Contains closing

      // Check no syntax issues (balanced braces)
      const openBraces = (result.match(/{/g) || []).length;
      const closeBraces = (result.match(/}/g) || []).length;
      expect(openBraces).toBe(closeBraces);
    });
  });

  describe('renderConfigAsJson', () => {
    it('renders valid JSON', () => {
      const result = renderConfigAsJson(mockTemplate);

      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('includes all config properties', () => {
      const result = renderConfigAsJson(mockTemplate);
      const parsed = JSON.parse(result);

      expect(parsed.language).toBe('ko');
      expect(parsed.projectName).toBe('test-project');
      expect(parsed.techStack).toBeDefined();
    });

    it('overrides values when options provided', () => {
      const result = renderConfigAsJson(mockTemplate, {
        projectName: 'custom-name',
        language: 'ja',
      });
      const parsed = JSON.parse(result);

      expect(parsed.projectName).toBe('custom-name');
      expect(parsed.language).toBe('ja');
    });

    it('formats JSON with indentation', () => {
      const result = renderConfigAsJson(mockTemplate);

      expect(result).toContain('\n');
      expect(result).toContain('  '); // Has indentation
    });

    it('includes ai section when defaultModel is provided', () => {
      const result = renderConfigAsJson(mockTemplate, {
        defaultModel: 'claude-opus-4-20250514',
      });
      const parsed = JSON.parse(result);

      expect(parsed.ai).toBeDefined();
      expect(parsed.ai.defaultModel).toBe('claude-opus-4-20250514');
    });

    it('includes ai section when primaryAgent is provided', () => {
      const result = renderConfigAsJson(mockTemplate, {
        primaryAgent: 'frontend-developer',
      });
      const parsed = JSON.parse(result);

      expect(parsed.ai).toBeDefined();
      expect(parsed.ai.primaryAgent).toBe('frontend-developer');
    });

    it('includes both defaultModel and primaryAgent in ai section', () => {
      const result = renderConfigAsJson(mockTemplate, {
        defaultModel: 'claude-opus-4-20250514',
        primaryAgent: 'backend-developer',
      });
      const parsed = JSON.parse(result);

      expect(parsed.ai).toBeDefined();
      expect(parsed.ai.defaultModel).toBe('claude-opus-4-20250514');
      expect(parsed.ai.primaryAgent).toBe('backend-developer');
    });

    it('does not include ai section when neither defaultModel nor primaryAgent is provided', () => {
      const result = renderConfigAsJson(mockTemplate);
      const parsed = JSON.parse(result);

      expect(parsed.ai).toBeUndefined();
    });
  });
});
