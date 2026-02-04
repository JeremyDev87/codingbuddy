/**
 * Template Renderer Tests
 *
 * Only JSON rendering is tested as JavaScript rendering was removed
 * for ESM/CJS compatibility.
 */

import { describe, it, expect } from 'vitest';
import { renderConfigAsJson } from './template.renderer';
import type { ConfigTemplate } from './template.types';

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
