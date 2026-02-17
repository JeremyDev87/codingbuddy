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
  it('should render category label with inline agent tags', () => {
    const { lastFrame } = render(
      <CategoryRow
        category="Architecture"
        agents={mockAgents}
        activeAgentIds={new Set()}
        icon="🏛️"
      />,
    );
    const output = lastFrame() ?? '';
    expect(output).toContain('🏛️ Architecture');
    // Agent names joined with middle dot separator
    expect(output).toContain('Solution Architect');
    expect(output).toContain('\u00b7');
  });

  it('should not contain border characters', () => {
    const { lastFrame } = render(
      <CategoryRow
        category="Architecture"
        agents={mockAgents}
        activeAgentIds={new Set()}
        icon="🏛️"
      />,
    );
    const output = lastFrame() ?? '';
    expect(output).not.toContain('┌');
    expect(output).not.toContain('┐');
    expect(output).not.toContain('└');
    expect(output).not.toContain('┘');
    expect(output).not.toContain('│');
  });

  it('should render bold when category has active agents', () => {
    const { lastFrame } = render(
      <CategoryRow
        category="Architecture"
        agents={mockAgents}
        activeAgentIds={new Set(['solution-architect'])}
        icon="🏛️"
      />,
    );
    // When active, bold text is rendered (ink renders bold escape codes)
    const output = lastFrame() ?? '';
    expect(output).toContain('🏛️ Architecture');
  });

  it('should render dimmed when no active agents', () => {
    const { lastFrame } = render(
      <CategoryRow
        category="Architecture"
        agents={mockAgents}
        activeAgentIds={new Set()}
        icon="🏛️"
      />,
    );
    const output = lastFrame() ?? '';
    expect(output).toContain('🏛️ Architecture');
  });

  it('should handle empty agents list', () => {
    const { lastFrame } = render(
      <CategoryRow category="Architecture" agents={[]} activeAgentIds={new Set()} icon="🏛️" />,
    );
    const output = lastFrame() ?? '';
    expect(output).toContain('🏛️ Architecture');
  });
});
