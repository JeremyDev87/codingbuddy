import { describe, it, expect } from 'vitest';
import { buildCategoryLabel } from './category-row.pure';

describe('category-row.pure', () => {
  describe('buildCategoryLabel', () => {
    it('should combine icon and category name', () => {
      expect(buildCategoryLabel('🏛️', 'Architecture')).toBe('🏛️ Architecture');
    });

    it('should handle empty icon', () => {
      expect(buildCategoryLabel('', 'Testing')).toBe('Testing');
    });
  });
});
