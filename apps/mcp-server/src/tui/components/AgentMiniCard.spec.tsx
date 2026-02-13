import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { AgentMiniCard } from './AgentMiniCard';
import type { AgentMetadata } from '../events';

const mockAgent: AgentMetadata = {
  id: 'frontend-developer',
  name: 'Frontend Developer',
  description: 'Modern React specialist',
  category: 'Frontend',
  icon: '🎨',
  expertise: ['React'],
};

describe('AgentMiniCard', () => {
  it('should render agent name', () => {
    const { lastFrame } = render(
      <AgentMiniCard agent={mockAgent} isActive={false} />,
    );
    expect(lastFrame()).toContain('Frontend Develo');
  });

  it('should render agent icon', () => {
    const { lastFrame } = render(
      <AgentMiniCard agent={mockAgent} isActive={true} />,
    );
    expect(lastFrame()).toContain('🎨');
  });
});
