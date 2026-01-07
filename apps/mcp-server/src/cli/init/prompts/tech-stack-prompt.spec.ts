/**
 * Tech Stack Prompt Tests
 *
 * Tests for tech stack selection prompts (languages, frontend, backend, tools)
 */

import { describe, it, expect } from 'vitest';
import {
  LANGUAGE_CHOICES,
  FRONTEND_CHOICES,
  BACKEND_CHOICES,
  TOOL_CHOICES,
  type TechStackSettings,
} from './tech-stack-prompt';

describe('tech-stack-prompt', () => {
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
});
