import { describe, it, expect } from 'vitest';
import type { Agent } from '@/types';
import { filterAgents } from '@/widgets/AgentsShowcase/hooks/useAgentFilter';

const mockAgents: Agent[] = [
  {
    id: 'frontend-developer',
    name: 'Frontend Developer',
    description: 'React/Next.js specialist',
    category: 'Development',
    icon: '⚛️',
    tags: ['React', 'Next.js'],
    expertise: ['React', 'TypeScript'],
  },
  {
    id: 'security-specialist',
    name: 'Security Specialist',
    description: 'Security expert for vulnerability assessment',
    category: 'Security',
    icon: '🔒',
    tags: ['Security', 'OWASP'],
    expertise: ['Security Audit'],
  },
  {
    id: 'ui-ux-designer',
    name: 'UI/UX Designer',
    description: 'Design specialist',
    category: 'UX',
    icon: '🎨',
    tags: ['UI Design', 'UX'],
    expertise: ['UI Design'],
  },
];

describe('filterAgents', () => {
  it('should return all agents when no filters applied', () => {
    const result = filterAgents(mockAgents, {});
    expect(result).toHaveLength(3);
  });

  it('should return all agents when category is "all"', () => {
    const result = filterAgents(mockAgents, { category: 'all' });
    expect(result).toHaveLength(3);
  });

  it('should filter by category', () => {
    const result = filterAgents(mockAgents, { category: 'Development' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('frontend-developer');
  });

  it('should filter by search query matching name (case-insensitive)', () => {
    const result = filterAgents(mockAgents, { searchQuery: 'frontend' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('frontend-developer');
  });

  it('should filter by search query matching description', () => {
    const result = filterAgents(mockAgents, { searchQuery: 'vulnerability' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('security-specialist');
  });

  it('should filter by search query matching tags', () => {
    const result = filterAgents(mockAgents, { searchQuery: 'OWASP' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('security-specialist');
  });

  it('should combine category and search filters', () => {
    const result = filterAgents(mockAgents, {
      category: 'Development',
      searchQuery: 'react',
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('frontend-developer');
  });

  it('should return empty array when no matches', () => {
    const result = filterAgents(mockAgents, { searchQuery: 'nonexistent' });
    expect(result).toHaveLength(0);
  });

  it('should handle empty search query as no filter', () => {
    const result = filterAgents(mockAgents, { searchQuery: '' });
    expect(result).toHaveLength(3);
  });

  it('should trim search query whitespace', () => {
    const result = filterAgents(mockAgents, { searchQuery: '  frontend  ' });
    expect(result).toHaveLength(1);
  });
});
