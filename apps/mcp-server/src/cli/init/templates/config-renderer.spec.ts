/**
 * Config Renderer Tests
 *
 * Tests for rendering config objects (from wizard) to JS/JSON format
 */

import { describe, it, expect } from 'vitest';
import {
  renderConfigObjectAsJs,
  renderConfigObjectAsJson,
  escapeJsString,
} from './config-renderer';

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

  describe('renderConfigObjectAsJs', () => {
    it('should render config object as JavaScript module', () => {
      const result = renderConfigObjectAsJs(sampleConfig);

      expect(result).toContain('module.exports = {');
      expect(result).toContain("language: 'ko'");
      expect(result).toContain("projectName: 'my-project'");
      expect(result).toContain("description: 'A sample project'");
    });

    it('should include techStack section', () => {
      const result = renderConfigObjectAsJs(sampleConfig);

      expect(result).toContain('techStack: {');
      expect(result).toContain("languages: ['TypeScript', 'JavaScript']");
      expect(result).toContain("frontend: ['React', 'Next.js']");
      expect(result).toContain("backend: ['NestJS']");
      expect(result).toContain("tools: ['Vitest', 'ESLint']");
    });

    it('should include architecture section', () => {
      const result = renderConfigObjectAsJs(sampleConfig);

      expect(result).toContain('architecture: {');
      expect(result).toContain("pattern: 'modular'");
      expect(result).toContain("componentStyle: 'feature-based'");
    });

    it('should include conventions section', () => {
      const result = renderConfigObjectAsJs(sampleConfig);

      expect(result).toContain('conventions: {');
      expect(result).toContain('naming: {');
      expect(result).toContain("files: 'kebab-case'");
      expect(result).toContain("quotes: 'single'");
      expect(result).toContain('semicolons: true');
    });

    it('should include testStrategy section', () => {
      const result = renderConfigObjectAsJs(sampleConfig);

      expect(result).toContain('testStrategy: {');
      expect(result).toContain("approach: 'tdd'");
      expect(result).toContain('coverage: 90');
      expect(result).toContain("mockingStrategy: 'minimal'");
    });

    it('should include ai section', () => {
      const result = renderConfigObjectAsJs(sampleConfig);

      expect(result).toContain('ai: {');
      expect(result).toContain("defaultModel: 'sonnet'");
      expect(result).toContain("primaryAgent: 'frontend-developer'");
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

      const result = renderConfigObjectAsJs(configWithEmptyArrays);

      expect(result).toContain("languages: ['TypeScript']");
      expect(result).not.toContain('frontend: []');
      expect(result).not.toContain('backend: []');
      expect(result).not.toContain('tools: []');
    });

    it('should handle undefined properties', () => {
      const minimalConfig = {
        language: 'en',
        projectName: 'test',
      };

      const result = renderConfigObjectAsJs(minimalConfig);

      expect(result).toContain("language: 'en'");
      expect(result).toContain("projectName: 'test'");
      expect(result).not.toContain('techStack');
      expect(result).not.toContain('architecture');
    });

    it('should include header comment', () => {
      const result = renderConfigObjectAsJs(sampleConfig);

      expect(result).toContain('/**');
      expect(result).toContain('* Codingbuddy Configuration');
    });
  });

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
  });

  describe('escapeJsString', () => {
    it('should return regular strings unchanged', () => {
      expect(escapeJsString('hello')).toBe('hello');
      expect(escapeJsString('my-project')).toBe('my-project');
      expect(escapeJsString('TypeScript')).toBe('TypeScript');
    });

    it('should escape single quotes', () => {
      expect(escapeJsString("it's")).toBe("it\\'s");
      expect(escapeJsString("test'value")).toBe("test\\'value");
    });

    it('should escape backslashes', () => {
      expect(escapeJsString('path\\to\\file')).toBe('path\\\\to\\\\file');
    });

    it('should escape newlines', () => {
      expect(escapeJsString('line1\nline2')).toBe('line1\\nline2');
    });

    it('should escape carriage returns', () => {
      expect(escapeJsString('line1\rline2')).toBe('line1\\rline2');
    });

    it('should escape tabs', () => {
      expect(escapeJsString('col1\tcol2')).toBe('col1\\tcol2');
    });

    it('should handle multiple special characters', () => {
      expect(escapeJsString("it's a\nnew\\path")).toBe(
        "it\\'s a\\nnew\\\\path",
      );
    });

    it('should prevent code injection via quote breakout', () => {
      // Malicious input attempting to break out of string
      const malicious = "'; console.log('hacked'); '";
      const escaped = escapeJsString(malicious);

      // Should escape the quotes, preventing code injection
      expect(escaped).toBe("\\'; console.log(\\'hacked\\'); \\'");

      // The escaped string should be safe to use in JS
      // When wrapped in quotes: '\\'; console.log(\'hacked\'); \''
      // This is a valid string literal, not executable code
    });

    it('should handle empty string', () => {
      expect(escapeJsString('')).toBe('');
    });

    it('should escape U+2028 (Line Separator)', () => {
      const withLineSeparator = 'before\u2028after';
      expect(escapeJsString(withLineSeparator)).toBe('before\\u2028after');
    });

    it('should escape U+2029 (Paragraph Separator)', () => {
      const withParagraphSeparator = 'before\u2029after';
      expect(escapeJsString(withParagraphSeparator)).toBe('before\\u2029after');
    });

    it('should escape both U+2028 and U+2029 in same string', () => {
      const withBoth = 'line1\u2028line2\u2029line3';
      expect(escapeJsString(withBoth)).toBe('line1\\u2028line2\\u2029line3');
    });

    it('should handle all line terminators together', () => {
      // String with all possible line terminators
      const allLineTerminators = 'a\nb\rc\u2028d\u2029e';
      expect(escapeJsString(allLineTerminators)).toBe(
        'a\\nb\\rc\\u2028d\\u2029e',
      );
    });

    it('should escape null bytes (defense-in-depth)', () => {
      // Null bytes can cause issues in string handling and should be escaped
      const withNullByte = 'before\x00after';
      expect(escapeJsString(withNullByte)).toBe('before\\x00after');
    });

    it('should escape null bytes mixed with other special characters', () => {
      const mixed = "test\x00value's\nnew";
      expect(escapeJsString(mixed)).toBe("test\\x00value\\'s\\nnew");
    });
  });

  describe('renderConfigObjectAsJs - security', () => {
    it('should safely handle project names with special characters', () => {
      const configWithSpecialChars = {
        projectName: "test's project",
        language: 'en',
      };

      const result = renderConfigObjectAsJs(configWithSpecialChars);

      // Should contain escaped quote
      expect(result).toContain("projectName: 'test\\'s project'");
      // Should be valid JS (no syntax errors when wrapped)
      expect(result).not.toContain("projectName: 'test's project'");
    });

    it('should safely handle descriptions with newlines', () => {
      const configWithNewlines = {
        projectName: 'test',
        description: 'Line 1\nLine 2',
        language: 'en',
      };

      const result = renderConfigObjectAsJs(configWithNewlines);

      // Should contain escaped newline
      expect(result).toContain("description: 'Line 1\\nLine 2'");
    });

    it('should safely handle tech stack items with special characters', () => {
      const configWithSpecialTech = {
        language: 'en',
        techStack: {
          languages: ['C++', 'C#', 'F#'],
          tools: ["it's-a-tool"],
        },
      };

      const result = renderConfigObjectAsJs(configWithSpecialTech);

      // Should escape special characters in array items
      expect(result).toContain("it\\'s-a-tool");
    });
  });
});
