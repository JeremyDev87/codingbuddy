import { describe, test, expect } from 'vitest';
import type { Agent, AgentCategory, AgentFilter } from '../../types/agents';

describe('Agent types', () => {
  test('Agent interface has required properties', () => {
    const agent: Agent = {
      id: 'frontend-developer',
      name: 'Frontend Developer',
      description: 'React/Next.js specialist',
      category: 'Development',
      icon: '💻',
      tags: ['react', 'nextjs'],
      expertise: ['React', 'TypeScript'],
    };

    expect(agent.id).toBe('frontend-developer');
    expect(agent.category).toBe('Development');
    expect(agent.tags).toHaveLength(2);
    expect(agent.expertise).toHaveLength(2);
  });

  test('AgentCategory is a valid union type', () => {
    const categories: AgentCategory[] = [
      'Planning',
      'Development',
      'Review',
      'Security',
      'UX',
    ];

    expect(categories).toHaveLength(5);
  });

  test('AgentFilter supports optional fields', () => {
    const filterAll: AgentFilter = {};
    const filterByCategory: AgentFilter = { category: 'Security' };
    const filterBySearch: AgentFilter = { searchQuery: 'react' };
    const filterBoth: AgentFilter = {
      category: 'Development',
      searchQuery: 'next',
    };
    const filterCategoryAll: AgentFilter = { category: 'all' };

    expect(filterAll).toBeDefined();
    expect(filterByCategory.category).toBe('Security');
    expect(filterBySearch.searchQuery).toBe('react');
    expect(filterBoth.category).toBe('Development');
    expect(filterCategoryAll.category).toBe('all');
  });
});
