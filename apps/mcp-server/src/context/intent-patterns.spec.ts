import { describe, it, expect } from 'vitest';
import { detectIntentFromPatterns, INTENT_PATTERNS } from './intent-patterns';

describe('Intent Patterns', () => {
  describe('INTENT_PATTERNS configuration', () => {
    it('should have all required intents', () => {
      const intents = INTENT_PATTERNS.map(p => p.intent);
      expect(intents).toContain('bug_fix');
      expect(intents).toContain('refactoring');
      expect(intents).toContain('code_review');
      expect(intents).toContain('testing');
      expect(intents).toContain('documentation');
      expect(intents).toContain('performance_optimization');
      expect(intents).toContain('security_hardening');
      expect(intents).toContain('feature_development');
    });

    it('should have keywords for each pattern', () => {
      for (const pattern of INTENT_PATTERNS) {
        expect(pattern.keywords.length).toBeGreaterThan(0);
      }
    });
  });

  describe('detectIntentFromPatterns', () => {
    it('should detect bug_fix intent', () => {
      expect(detectIntentFromPatterns('fix the login bug')).toBe('bug_fix');
      expect(detectIntentFromPatterns('there is an error')).toBe('bug_fix');
      expect(detectIntentFromPatterns('debug the issue')).toBe('bug_fix');
    });

    it('should detect refactoring intent', () => {
      expect(detectIntentFromPatterns('refactor the code')).toBe('refactoring');
      expect(detectIntentFromPatterns('clean up this module')).toBe(
        'refactoring',
      );
      expect(detectIntentFromPatterns('improve code quality')).toBe(
        'refactoring',
      );
    });

    it('should detect code_review intent', () => {
      expect(detectIntentFromPatterns('review my changes')).toBe('code_review');
      expect(detectIntentFromPatterns('check this PR')).toBe('code_review');
    });

    it('should detect testing intent', () => {
      expect(detectIntentFromPatterns('add unit tests')).toBe('testing');
      expect(detectIntentFromPatterns('write spec for this')).toBe('testing');
    });

    it('should detect documentation intent', () => {
      expect(detectIntentFromPatterns('update the docs')).toBe('documentation');
      expect(detectIntentFromPatterns('write a readme')).toBe('documentation');
    });

    it('should detect performance_optimization intent', () => {
      expect(detectIntentFromPatterns('optimize this function')).toBe(
        'performance_optimization',
      );
      // Note: 'improve performance' matches 'refactoring' first due to 'improve' keyword
      // Note: 'performance issues' matches 'bug_fix' first due to 'issue' keyword
      expect(detectIntentFromPatterns('slow performance')).toBe(
        'performance_optimization',
      );
      expect(detectIntentFromPatterns('make it faster')).toBe(
        'performance_optimization',
      );
    });

    it('should detect security_hardening intent', () => {
      // Note: 'fix security vulnerability' matches 'bug_fix' first due to 'fix' keyword
      expect(detectIntentFromPatterns('security vulnerability found')).toBe(
        'security_hardening',
      );
      expect(detectIntentFromPatterns('add auth middleware')).toBe(
        'security_hardening',
      );
    });

    it('should detect feature_development intent', () => {
      expect(detectIntentFromPatterns('add a new feature')).toBe(
        'feature_development',
      );
      expect(detectIntentFromPatterns('create user profile')).toBe(
        'feature_development',
      );
      expect(detectIntentFromPatterns('implement login')).toBe(
        'feature_development',
      );
      expect(detectIntentFromPatterns('build dashboard')).toBe(
        'feature_development',
      );
    });

    it('should return unknown for unrecognized prompts', () => {
      expect(detectIntentFromPatterns('hello world')).toBe('unknown');
      expect(detectIntentFromPatterns('just chatting')).toBe('unknown');
    });

    it('should be case insensitive', () => {
      expect(detectIntentFromPatterns('FIX THE BUG')).toBe('bug_fix');
      expect(detectIntentFromPatterns('Refactor This')).toBe('refactoring');
    });

    it('should detect first matching pattern (priority order)', () => {
      // 'fix' comes before 'feature' keywords
      expect(detectIntentFromPatterns('fix and add new feature')).toBe(
        'bug_fix',
      );
    });
  });
});
