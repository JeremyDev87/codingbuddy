/**
 * Architecture Prompt Tests
 */

import { describe, it, expect } from 'vitest';
import {
  PATTERN_CHOICES,
  COMPONENT_STYLE_CHOICES,
  type ArchitectureSettings,
} from './architecture-prompt';

describe('architecture-prompt', () => {
  describe('PATTERN_CHOICES', () => {
    it('should include monorepo', () => {
      const mono = PATTERN_CHOICES.find(c => c.value === 'monorepo');
      expect(mono).toBeDefined();
    });

    it('should include modular', () => {
      const modular = PATTERN_CHOICES.find(c => c.value === 'modular');
      expect(modular).toBeDefined();
    });

    it('should include layered', () => {
      const layered = PATTERN_CHOICES.find(c => c.value === 'layered');
      expect(layered).toBeDefined();
    });
  });

  describe('COMPONENT_STYLE_CHOICES', () => {
    it('should include feature-based', () => {
      const feature = COMPONENT_STYLE_CHOICES.find(
        c => c.value === 'feature-based',
      );
      expect(feature).toBeDefined();
    });

    it('should include flat', () => {
      const flat = COMPONENT_STYLE_CHOICES.find(c => c.value === 'flat');
      expect(flat).toBeDefined();
    });

    it('should include grouped', () => {
      const grouped = COMPONENT_STYLE_CHOICES.find(c => c.value === 'grouped');
      expect(grouped).toBeDefined();
    });
  });

  describe('ArchitectureSettings type', () => {
    it('should have pattern and componentStyle fields', () => {
      const settings: ArchitectureSettings = {
        pattern: 'monorepo',
        componentStyle: 'feature-based',
      };

      expect(settings.pattern).toBe('monorepo');
      expect(settings.componentStyle).toBe('feature-based');
    });
  });
});
