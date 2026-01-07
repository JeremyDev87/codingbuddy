/**
 * Test Strategy Prompt Tests
 */

import { describe, it, expect } from 'vitest';
import {
  APPROACH_CHOICES,
  MOCKING_STRATEGY_CHOICES,
  DEFAULT_COVERAGE,
  type TestStrategySettings,
} from './test-strategy-prompt';

describe('test-strategy-prompt', () => {
  describe('APPROACH_CHOICES', () => {
    it('should include tdd', () => {
      const tdd = APPROACH_CHOICES.find(c => c.value === 'tdd');
      expect(tdd).toBeDefined();
    });

    it('should include bdd', () => {
      const bdd = APPROACH_CHOICES.find(c => c.value === 'bdd');
      expect(bdd).toBeDefined();
    });

    it('should include test-after', () => {
      const testAfter = APPROACH_CHOICES.find(c => c.value === 'test-after');
      expect(testAfter).toBeDefined();
    });

    it('should include mixed', () => {
      const mixed = APPROACH_CHOICES.find(c => c.value === 'mixed');
      expect(mixed).toBeDefined();
    });
  });

  describe('MOCKING_STRATEGY_CHOICES', () => {
    it('should include minimal', () => {
      const minimal = MOCKING_STRATEGY_CHOICES.find(c => c.value === 'minimal');
      expect(minimal).toBeDefined();
    });

    it('should include extensive', () => {
      const extensive = MOCKING_STRATEGY_CHOICES.find(
        c => c.value === 'extensive',
      );
      expect(extensive).toBeDefined();
    });

    it('should include no-mocks', () => {
      const noMocks = MOCKING_STRATEGY_CHOICES.find(
        c => c.value === 'no-mocks',
      );
      expect(noMocks).toBeDefined();
    });
  });

  describe('DEFAULT_COVERAGE', () => {
    it('should be 90', () => {
      expect(DEFAULT_COVERAGE).toBe(90);
    });
  });

  describe('TestStrategySettings type', () => {
    it('should have all required fields', () => {
      const settings: TestStrategySettings = {
        approach: 'tdd',
        coverage: 90,
        mockingStrategy: 'minimal',
      };

      expect(settings.approach).toBe('tdd');
      expect(settings.coverage).toBe(90);
      expect(settings.mockingStrategy).toBe('minimal');
    });
  });
});
