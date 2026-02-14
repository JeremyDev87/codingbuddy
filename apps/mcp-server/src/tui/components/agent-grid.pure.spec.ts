import { describe, it, expect } from 'vitest';
import type { AgentMetadata, AgentCategory } from '../events';
import {
  groupByCategory,
  sortCategoriesByActivity,
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
});
