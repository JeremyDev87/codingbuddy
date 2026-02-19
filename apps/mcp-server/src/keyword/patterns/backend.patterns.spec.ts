/**
 * Backend Developer Intent Patterns Tests
 *
 * Tests for BACKEND_INTENT_PATTERNS including:
 * - Framework-specific patterns (NestJS, Express, Django, etc.)
 * - API patterns (REST, GraphQL, gRPC)
 * - Generic development patterns (refactoring, TypeScript types)
 */

import { describe, it, expect } from 'vitest';
import { BACKEND_INTENT_PATTERNS } from './backend.patterns';

const matchesPattern = (input: string): boolean =>
  BACKEND_INTENT_PATTERNS.some(({ pattern }) => pattern.test(input));

describe('BACKEND_INTENT_PATTERNS', () => {
  describe('existing framework patterns', () => {
    it('should match NestJS', () => {
      expect(matchesPattern('NestJS API 만들어줘')).toBe(true);
    });

    it('should match REST API', () => {
      expect(matchesPattern('REST API 설계해줘')).toBe(true);
    });

    it('should match server development (Korean)', () => {
      expect(matchesPattern('서버 개발 해줘')).toBe(true);
    });
  });

  describe('refactoring patterns', () => {
    it('should match Korean refactoring keyword', () => {
      expect(matchesPattern('리팩토링 해줘')).toBe(true);
    });

    it('should match English refactor keyword', () => {
      expect(matchesPattern('refactor this module')).toBe(true);
    });

    it('should match refactor with various casing', () => {
      expect(matchesPattern('Refactor the service layer')).toBe(true);
    });

    it('should have confidence 0.75 for refactoring pattern', () => {
      const match = BACKEND_INTENT_PATTERNS.find(
        ({ description }) => description === 'Refactoring',
      );
      expect(match?.confidence).toBe(0.75);
    });
  });

  describe('TypeScript type definition patterns', () => {
    it('should match Korean type addition pattern', () => {
      expect(matchesPattern('타입 추가해줘')).toBe(true);
    });

    it('should match English type definition pattern', () => {
      expect(matchesPattern('type definition needed')).toBe(true);
    });

    it('should match Korean type with spaces', () => {
      expect(matchesPattern('타입추가 필요해')).toBe(true);
    });

    it('should have confidence 0.80 for type definition pattern', () => {
      const match = BACKEND_INTENT_PATTERNS.find(
        ({ description }) => description === 'TypeScript Type Definition',
      );
      expect(match?.confidence).toBe(0.8);
    });
  });
});
