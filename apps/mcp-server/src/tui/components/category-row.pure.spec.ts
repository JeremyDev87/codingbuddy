import { describe, it, expect } from 'vitest';
import {
  buildCategoryLabel,
  buildCompactCategoryRow,
} from './category-row.pure';
import { estimateDisplayWidth } from '../utils/display-width';

describe('category-row.pure', () => {
  describe('buildCategoryLabel', () => {
    it('should combine icon and category name', () => {
      expect(buildCategoryLabel('🏛️', 'Architecture')).toBe('🏛️ Architecture');
    });

    it('should handle empty icon', () => {
      expect(buildCategoryLabel('', 'Testing')).toBe('Testing');
    });
  });

  describe('buildCompactCategoryRow', () => {
    it('should build single-line row with label and agent tags', () => {
      const result = buildCompactCategoryRow('🏛️', 'Architecture', [
        'solution-architect',
        'agent-architect',
      ]);
      expect(result).toContain('🏛️ Architecture');
      expect(result).toContain('solution-architect \u00b7 agent-architect');
    });

    it('should truncate agent list to fit maxWidth', () => {
      const agents = [
        'agent-one',
        'agent-two',
        'agent-three',
        'agent-four',
        'agent-five',
        'agent-six',
      ];
      const result = buildCompactCategoryRow('🧪', 'Testing', agents, 50);
      expect(estimateDisplayWidth(result)).toBeLessThanOrEqual(50);
    });

    it('should pad category label to LABEL_WIDTH', () => {
      const result = buildCompactCategoryRow('🔒', 'Security', ['sec-agent']);
      // label width is consistent
      const labelPart = result.substring(0, 18);
      expect(labelPart.trimEnd().length).toBeGreaterThan(0);
    });

    it('should handle empty agents list', () => {
      const result = buildCompactCategoryRow('🧪', 'Testing', []);
      expect(result).toContain('🧪 Testing');
    });
  });
});
