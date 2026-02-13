import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { CategoryRow } from './CategoryRow';
import type { AgentMetadata } from '../events';

const mockAgents: AgentMetadata[] = [
  {
    id: 'solution-architect',
    name: 'Solution Architect',
    description: 'd',
    category: 'Architecture',
    icon: '🏛️',
    expertise: [],
  },
  {
    id: 'architecture-specialist',
    name: 'Architecture Specialist',
    description: 'd',
    category: 'Architecture',
    icon: '🏛️',
    expertise: [],
  },
];

describe('CategoryRow', () => {
  it('should render category label', () => {
    const { lastFrame } = render(
      <CategoryRow
        category="Architecture"
        agents={mockAgents}
        activeAgentIds={new Set()}
        icon="🏛️"
      />,
    );
    expect(lastFrame()).toContain('🏛️ Architecture');
  });

  it('should render agent mini cards', () => {
    const { lastFrame } = render(
      <CategoryRow
        category="Architecture"
        agents={mockAgents}
        activeAgentIds={new Set()}
        icon="🏛️"
      />,
    );
    expect(lastFrame()).toContain('Solution Archite');
  });
});
