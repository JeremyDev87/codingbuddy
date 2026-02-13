import { describe, it, expect } from 'vitest';
import type { AgentMetadata, AgentCategory } from '../events';
import {
  groupByCategory,
  sortCategoriesByActivity,
  computeColumns,
  computeCardWidth,
} from './agent-grid.pure';

const makeAgent = (id: string, category: AgentCategory): AgentMetadata => ({
  id,
  name: id,
  description: 'test',
  category,
  icon: '🔧',
  expertise: [],
});

describe('agent-grid.pure', () => {
  describe('groupByCategory', () => {
    it('should group agents by their category', () => {
      const agents = [
        makeAgent('solution-architect', 'Architecture'),
        makeAgent('architecture-specialist', 'Architecture'),
        makeAgent('security-specialist', 'Security'),
      ];
      const groups = groupByCategory(agents);

      expect(groups.get('Architecture')).toHaveLength(2);
      expect(groups.get('Security')).toHaveLength(1);
    });

    it('should return empty map for empty array', () => {
      const groups = groupByCategory([]);
      expect(groups.size).toBe(0);
    });
  });

  describe('sortCategoriesByActivity', () => {
    it('should place categories with active agents first', () => {
      const categories: AgentCategory[] = [
        'Security',
        'Architecture',
        'Testing',
      ];
      const activeIds = new Set(['solution-architect']);
      const agentsByCategory = new Map<AgentCategory, AgentMetadata[]>([
        ['Security', [makeAgent('security-specialist', 'Security')]],
        ['Architecture', [makeAgent('solution-architect', 'Architecture')]],
        ['Testing', [makeAgent('test-strategy-specialist', 'Testing')]],
      ]);

      const sorted = sortCategoriesByActivity(
        categories,
        activeIds,
        agentsByCategory,
      );

      expect(sorted[0]).toBe('Architecture');
    });

    it('should preserve original order for inactive categories', () => {
      const categories: AgentCategory[] = [
        'Security',
        'Architecture',
        'Testing',
      ];
      const activeIds = new Set<string>();
      const agentsByCategory = new Map<AgentCategory, AgentMetadata[]>([
        ['Security', [makeAgent('security-specialist', 'Security')]],
        ['Architecture', [makeAgent('solution-architect', 'Architecture')]],
        ['Testing', [makeAgent('test-strategy-specialist', 'Testing')]],
      ]);

      const sorted = sortCategoriesByActivity(
        categories,
        activeIds,
        agentsByCategory,
      );

      expect(sorted).toEqual(['Security', 'Architecture', 'Testing']);
    });
  });

  describe('computeColumns', () => {
    it('should return 1 for width < 80', () => {
      expect(computeColumns(60)).toBe(1);
      expect(computeColumns(79)).toBe(1);
    });

    it('should return 2 for width 80-99', () => {
      expect(computeColumns(80)).toBe(2);
      expect(computeColumns(99)).toBe(2);
    });

    it('should return 3 for width 100-119', () => {
      expect(computeColumns(100)).toBe(3);
      expect(computeColumns(119)).toBe(3);
    });

    it('should return 5 for width >= 120', () => {
      expect(computeColumns(120)).toBe(5);
      expect(computeColumns(200)).toBe(5);
    });
  });

  describe('computeCardWidth', () => {
    it('should return full width for 1 column', () => {
      expect(computeCardWidth(60, 1)).toBe(60);
    });

    it('should return 45 for 2 columns', () => {
      expect(computeCardWidth(90, 2)).toBe(45);
    });

    it('should return 35 for 3 columns', () => {
      expect(computeCardWidth(110, 3)).toBe(35);
    });

    it('should return 22 for 5 columns', () => {
      expect(computeCardWidth(130, 5)).toBe(22);
    });
  });
});
