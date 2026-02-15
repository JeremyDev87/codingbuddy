import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAgentFilter } from '@/widgets/AgentsShowcase/hooks/useAgentFilter';
import type { Agent } from '@/types';

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
    description: 'Security expert',
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

describe('useAgentFilter hook', () => {
  it('should return all agents initially', () => {
    const { result } = renderHook(() => useAgentFilter(mockAgents));
    expect(result.current.filteredAgents).toHaveLength(3);
    expect(result.current.category).toBe('all');
    expect(result.current.searchQuery).toBe('');
  });

  it('should filter by category when setCategory is called', () => {
    const { result } = renderHook(() => useAgentFilter(mockAgents));

    act(() => {
      result.current.setCategory('Development');
    });

    expect(result.current.filteredAgents).toHaveLength(1);
    expect(result.current.filteredAgents[0].id).toBe('frontend-developer');
    expect(result.current.category).toBe('Development');
  });

  it('should filter by search query when setSearchQuery is called', () => {
    const { result } = renderHook(() => useAgentFilter(mockAgents));

    act(() => {
      result.current.setSearchQuery('security');
    });

    expect(result.current.filteredAgents).toHaveLength(1);
    expect(result.current.filteredAgents[0].id).toBe('security-specialist');
  });

  it('should combine category and search filters', () => {
    const { result } = renderHook(() => useAgentFilter(mockAgents));

    act(() => {
      result.current.setCategory('Development');
      result.current.setSearchQuery('react');
    });

    expect(result.current.filteredAgents).toHaveLength(1);
    expect(result.current.filteredAgents[0].id).toBe('frontend-developer');
  });

  it('should reset filters correctly', () => {
    const { result } = renderHook(() => useAgentFilter(mockAgents));

    act(() => {
      result.current.setCategory('Security');
    });
    expect(result.current.filteredAgents).toHaveLength(1);

    act(() => {
      result.current.setCategory('all');
    });
    expect(result.current.filteredAgents).toHaveLength(3);
  });
});
