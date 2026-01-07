/**
 * Summary Prompt Tests
 */

import { describe, it, expect } from 'vitest';
import { SUMMARY_ACTION_CHOICES, SummaryAction } from './summary.prompt';

describe('summary.prompt', () => {
  describe('SUMMARY_ACTION_CHOICES', () => {
    it('should include confirm action', () => {
      const confirm = SUMMARY_ACTION_CHOICES.find(c => c.value === 'confirm');
      expect(confirm).toBeDefined();
      expect(confirm?.name).toContain('Confirm');
    });

    it('should include edit actions for each section', () => {
      const editBasic = SUMMARY_ACTION_CHOICES.find(
        c => c.value === 'edit-basic',
      );
      const editTechStack = SUMMARY_ACTION_CHOICES.find(
        c => c.value === 'edit-tech-stack',
      );
      const editArchitecture = SUMMARY_ACTION_CHOICES.find(
        c => c.value === 'edit-architecture',
      );
      const editConventions = SUMMARY_ACTION_CHOICES.find(
        c => c.value === 'edit-conventions',
      );
      const editTestStrategy = SUMMARY_ACTION_CHOICES.find(
        c => c.value === 'edit-test-strategy',
      );
      const editAi = SUMMARY_ACTION_CHOICES.find(c => c.value === 'edit-ai');

      expect(editBasic).toBeDefined();
      expect(editTechStack).toBeDefined();
      expect(editArchitecture).toBeDefined();
      expect(editConventions).toBeDefined();
      expect(editTestStrategy).toBeDefined();
      expect(editAi).toBeDefined();
    });

    it('should include cancel action', () => {
      const cancel = SUMMARY_ACTION_CHOICES.find(c => c.value === 'cancel');
      expect(cancel).toBeDefined();
    });

    it('should start choice names with text label for screen reader accessibility', () => {
      // All choices should start with a text label (not emoji) for screen readers
      // Pattern: "[ActionType] emoji text" e.g., "[Confirm] ✅ Confirm and generate config"
      for (const choice of SUMMARY_ACTION_CHOICES) {
        expect(choice.name).toMatch(/^\[.+\]/);
      }
    });

    it('should have specific edit prefixes for each section', () => {
      // Each edit option should have a specific prefix for better accessibility
      // e.g., "[Edit Basic]", "[Edit Tech]" instead of generic "[Edit]"
      const editChoices = SUMMARY_ACTION_CHOICES.filter(c =>
        c.value.startsWith('edit-'),
      );

      const prefixes = editChoices.map(c => {
        const match = c.name.match(/^\[([^\]]+)\]/);
        return match ? match[1] : '';
      });

      // All edit prefixes should be unique and specific
      const uniquePrefixes = new Set(prefixes);
      expect(uniquePrefixes.size).toBe(editChoices.length);

      // Should not all be the same generic "[Edit]"
      expect(prefixes.every(p => p === 'Edit')).toBe(false);
    });
  });

  describe('SummaryAction type', () => {
    it('should accept all valid action values', () => {
      const actions: SummaryAction[] = [
        'confirm',
        'edit-basic',
        'edit-tech-stack',
        'edit-architecture',
        'edit-conventions',
        'edit-test-strategy',
        'edit-ai',
        'cancel',
      ];

      expect(actions).toHaveLength(8);
    });
  });
});
