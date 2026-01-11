/**
 * Tech Stack Prompt Tests
 *
 * Tests for tech stack selection prompts (languages, frontend, backend, tools)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  LANGUAGE_CHOICES,
  FRONTEND_CHOICES,
  BACKEND_CHOICES,
  TOOL_CHOICES,
  getChoicesWithDefaults,
  promptTechStackSettings,
  type TechStackSettings,
  type StackChoice,
} from './tech-stack-prompt';

// Mock @inquirer/prompts
vi.mock('@inquirer/prompts', () => ({
  checkbox: vi.fn(),
}));

describe('tech-stack-prompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('LANGUAGE_CHOICES', () => {
    it('should include TypeScript', () => {
      const ts = LANGUAGE_CHOICES.find(c => c.value === 'TypeScript');
      expect(ts).toBeDefined();
      expect(ts?.name).toBe('TypeScript');
    });

    it('should include JavaScript', () => {
      const js = LANGUAGE_CHOICES.find(c => c.value === 'JavaScript');
      expect(js).toBeDefined();
    });

    it('should include Python', () => {
      const py = LANGUAGE_CHOICES.find(c => c.value === 'Python');
      expect(py).toBeDefined();
    });

    it('should have name and value for all choices', () => {
      for (const choice of LANGUAGE_CHOICES) {
        expect(choice.name).toBeDefined();
        expect(choice.value).toBeDefined();
      }
    });
  });

  describe('FRONTEND_CHOICES', () => {
    it('should include React', () => {
      const react = FRONTEND_CHOICES.find(c => c.value === 'React');
      expect(react).toBeDefined();
    });

    it('should include Next.js', () => {
      const next = FRONTEND_CHOICES.find(c => c.value === 'Next.js');
      expect(next).toBeDefined();
    });

    it('should include Vue', () => {
      const vue = FRONTEND_CHOICES.find(c => c.value === 'Vue');
      expect(vue).toBeDefined();
    });

    it('should include all major frameworks', () => {
      const values = FRONTEND_CHOICES.map(c => c.value);
      expect(values).toContain('React');
      expect(values).toContain('Next.js');
      expect(values).toContain('Vue');
      expect(values).toContain('Nuxt');
      expect(values).toContain('Svelte');
      expect(values).toContain('Angular');
    });
  });

  describe('BACKEND_CHOICES', () => {
    it('should include NestJS', () => {
      const nest = BACKEND_CHOICES.find(c => c.value === 'NestJS');
      expect(nest).toBeDefined();
    });

    it('should include Express', () => {
      const express = BACKEND_CHOICES.find(c => c.value === 'Express');
      expect(express).toBeDefined();
    });

    it('should include FastAPI', () => {
      const fastapi = BACKEND_CHOICES.find(c => c.value === 'FastAPI');
      expect(fastapi).toBeDefined();
    });

    it('should include all major frameworks', () => {
      const values = BACKEND_CHOICES.map(c => c.value);
      expect(values).toContain('NestJS');
      expect(values).toContain('Express');
      expect(values).toContain('Fastify');
      expect(values).toContain('FastAPI');
      expect(values).toContain('Django');
      expect(values).toContain('Spring Boot');
    });
  });

  describe('TOOL_CHOICES', () => {
    it('should include Vitest', () => {
      const vitest = TOOL_CHOICES.find(c => c.value === 'Vitest');
      expect(vitest).toBeDefined();
    });

    it('should include ESLint', () => {
      const eslint = TOOL_CHOICES.find(c => c.value === 'ESLint');
      expect(eslint).toBeDefined();
    });

    it('should include Prettier', () => {
      const prettier = TOOL_CHOICES.find(c => c.value === 'Prettier');
      expect(prettier).toBeDefined();
    });

    it('should include all common tools', () => {
      const values = TOOL_CHOICES.map(c => c.value);
      expect(values).toContain('Vitest');
      expect(values).toContain('Jest');
      expect(values).toContain('ESLint');
      expect(values).toContain('Prettier');
      expect(values).toContain('Docker');
      expect(values).toContain('GitHub Actions');
    });
  });

  describe('TechStackSettings type', () => {
    it('should have all required fields', () => {
      const settings: TechStackSettings = {
        languages: ['TypeScript'],
        frontend: ['React'],
        backend: ['NestJS'],
        tools: ['Vitest', 'ESLint'],
      };

      expect(settings.languages).toContain('TypeScript');
      expect(settings.frontend).toContain('React');
      expect(settings.backend).toContain('NestJS');
      expect(settings.tools).toContain('Vitest');
    });
  });

  describe('getChoicesWithDefaults', () => {
    it('should return choices with detected items pre-checked', () => {
      const choices: StackChoice[] = [
        { name: 'Option A', value: 'a' },
        { name: 'Option B', value: 'b' },
        { name: 'Option C', value: 'c' },
      ];
      const detected = ['a', 'c'];

      const result = getChoicesWithDefaults(choices, detected);

      expect(result[0].checked).toBe(true);
      expect(result[1].checked).toBe(false);
      expect(result[2].checked).toBe(true);
    });

    it('should return all unchecked when detected is empty', () => {
      const choices: StackChoice[] = [
        { name: 'Option A', value: 'a' },
        { name: 'Option B', value: 'b' },
      ];

      const result = getChoicesWithDefaults(choices, []);

      expect(result[0].checked).toBe(false);
      expect(result[1].checked).toBe(false);
    });

    it('should return all unchecked when detected is undefined', () => {
      const choices: StackChoice[] = [
        { name: 'Option A', value: 'a' },
        { name: 'Option B', value: 'b' },
      ];

      const result = getChoicesWithDefaults(choices);

      expect(result[0].checked).toBe(false);
      expect(result[1].checked).toBe(false);
    });

    it('should preserve original choice properties', () => {
      const choices: StackChoice[] = [{ name: 'Option A', value: 'a' }];

      const result = getChoicesWithDefaults(choices, ['a']);

      expect(result[0].name).toBe('Option A');
      expect(result[0].value).toBe('a');
      expect(result[0].checked).toBe(true);
    });

    it('should handle empty choices array', () => {
      const result = getChoicesWithDefaults([], ['a']);
      expect(result).toEqual([]);
    });

    it('should handle non-matching detected values', () => {
      const choices: StackChoice[] = [
        { name: 'Option A', value: 'a' },
        { name: 'Option B', value: 'b' },
      ];

      const result = getChoicesWithDefaults(choices, ['x', 'y']);

      expect(result[0].checked).toBe(false);
      expect(result[1].checked).toBe(false);
    });
  });

  describe('promptTechStackSettings', () => {
    it('should call checkbox for all categories', async () => {
      const { checkbox } = await import('@inquirer/prompts');
      const mockCheckbox = vi.mocked(checkbox);

      mockCheckbox
        .mockResolvedValueOnce(['TypeScript'])
        .mockResolvedValueOnce(['React'])
        .mockResolvedValueOnce(['NestJS'])
        .mockResolvedValueOnce(['Vitest']);

      await promptTechStackSettings();

      expect(mockCheckbox).toHaveBeenCalledTimes(4);
    });

    it('should return all selected values', async () => {
      const { checkbox } = await import('@inquirer/prompts');
      const mockCheckbox = vi.mocked(checkbox);

      mockCheckbox
        .mockResolvedValueOnce(['TypeScript', 'JavaScript'])
        .mockResolvedValueOnce(['React', 'Next.js'])
        .mockResolvedValueOnce(['NestJS', 'Express'])
        .mockResolvedValueOnce(['Vitest', 'ESLint', 'Prettier']);

      const result = await promptTechStackSettings();

      expect(result.languages).toEqual(['TypeScript', 'JavaScript']);
      expect(result.frontend).toEqual(['React', 'Next.js']);
      expect(result.backend).toEqual(['NestJS', 'Express']);
      expect(result.tools).toEqual(['Vitest', 'ESLint', 'Prettier']);
    });

    it('should handle empty selections', async () => {
      const { checkbox } = await import('@inquirer/prompts');
      const mockCheckbox = vi.mocked(checkbox);

      mockCheckbox
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await promptTechStackSettings();

      expect(result.languages).toEqual([]);
      expect(result.frontend).toEqual([]);
      expect(result.backend).toEqual([]);
      expect(result.tools).toEqual([]);
    });

    it('should pass detected options to getChoicesWithDefaults', async () => {
      const { checkbox } = await import('@inquirer/prompts');
      const mockCheckbox = vi.mocked(checkbox);

      mockCheckbox
        .mockResolvedValueOnce(['TypeScript'])
        .mockResolvedValueOnce(['React'])
        .mockResolvedValueOnce(['NestJS'])
        .mockResolvedValueOnce(['Vitest']);

      await promptTechStackSettings({
        detectedLanguages: ['TypeScript'],
        detectedFrontend: ['React'],
        detectedBackend: ['NestJS'],
        detectedTools: ['Vitest'],
      });

      // First call should have TypeScript pre-checked
      expect(mockCheckbox).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          message: 'Select programming languages:',
          choices: expect.arrayContaining([
            expect.objectContaining({ value: 'TypeScript', checked: true }),
          ]),
        }),
      );
    });

    it('should use correct messages for each prompt', async () => {
      const { checkbox } = await import('@inquirer/prompts');
      const mockCheckbox = vi.mocked(checkbox);

      mockCheckbox.mockResolvedValue([]);

      await promptTechStackSettings();

      expect(mockCheckbox).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          message: 'Select programming languages:',
        }),
      );

      expect(mockCheckbox).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          message: 'Select frontend frameworks:',
        }),
      );

      expect(mockCheckbox).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          message: 'Select backend frameworks:',
        }),
      );

      expect(mockCheckbox).toHaveBeenNthCalledWith(
        4,
        expect.objectContaining({
          message: 'Select tools:',
        }),
      );
    });
  });
});
