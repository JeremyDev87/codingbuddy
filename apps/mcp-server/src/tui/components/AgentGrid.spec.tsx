import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { AgentGrid } from './AgentGrid';
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
    id: 'security-specialist',
    name: 'Security Specialist',
    description: 'd',
    category: 'Security',
    icon: '🔒',
    expertise: [],
  },
  {
    id: 'test-strategy-specialist',
    name: 'Test Strategy',
    description: 'd',
    category: 'Testing',
    icon: '🧪',
    expertise: [],
  },
];

describe('AgentGrid', () => {
  it('should render nothing when no agents', () => {
    const { lastFrame } = render(
      <AgentGrid
        allAgents={[]}
        activeAgentIds={new Set()}
        terminalWidth={120}
      />,
    );
    expect(lastFrame()).toBe('');
  });

  it('should render category rows', () => {
    const { lastFrame } = render(
      <AgentGrid
        allAgents={mockAgents}
        activeAgentIds={new Set()}
        terminalWidth={120}
      />,
    );
    expect(lastFrame()).toContain('Architecture');
    expect(lastFrame()).toContain('Security');
    expect(lastFrame()).toContain('Testing');
  });

  it('should place active agent categories first', () => {
    const { lastFrame } = render(
      <AgentGrid
        allAgents={mockAgents}
        activeAgentIds={new Set(['security-specialist'])}
        terminalWidth={120}
      />,
    );
    const output = lastFrame() ?? '';
    const securityIdx = output.indexOf('Security');
    const archIdx = output.indexOf('Architecture');
    expect(securityIdx).toBeLessThan(archIdx);
  });
});
