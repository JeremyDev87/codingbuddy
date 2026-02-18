import { describe, it, expect } from 'vitest';
import { selectFocusedAgent } from './use-focus-agent';
import type { DashboardNode } from '../dashboard-types';

function makeNode(overrides: Partial<DashboardNode> & { id: string }): DashboardNode {
  return {
    name: overrides.id,
    stage: 'PLAN',
    status: 'idle',
    isPrimary: false,
    progress: 0,
    isParallel: false,
    ...overrides,
  };
}

describe('selectFocusedAgent', () => {
  it('selects running primary agent', () => {
    const agents = new Map<string, DashboardNode>([
      [
        'a1',
        makeNode({
          id: 'a1',
          name: 'Arch',
          stage: 'PLAN',
          status: 'running',
          isPrimary: true,
          progress: 50,
        }),
      ],
      [
        'a2',
        makeNode({
          id: 'a2',
          name: 'BE',
          stage: 'ACT',
          status: 'running',
          isPrimary: false,
          progress: 40,
        }),
      ],
    ]);
    expect(selectFocusedAgent(agents, null)).toBe('a1');
  });

  it('falls back to last running agent if no primary', () => {
    const agents = new Map<string, DashboardNode>([
      [
        'a1',
        makeNode({
          id: 'a1',
          name: 'Sec',
          stage: 'EVAL',
          status: 'running',
          isPrimary: false,
          progress: 20,
        }),
      ],
    ]);
    expect(selectFocusedAgent(agents, null)).toBe('a1');
  });

  it('selects last running agent when multiple non-primary are running', () => {
    const agents = new Map<string, DashboardNode>([
      ['a1', makeNode({ id: 'a1', status: 'running' })],
      ['a2', makeNode({ id: 'a2', status: 'running' })],
      ['a3', makeNode({ id: 'a3', status: 'running' })],
    ]);
    expect(selectFocusedAgent(agents, null)).toBe('a3');
  });

  it('keeps current focus if no running agents', () => {
    const agents = new Map<string, DashboardNode>([
      [
        'a1',
        makeNode({
          id: 'a1',
          name: 'Arch',
          stage: 'PLAN',
          status: 'done',
          isPrimary: true,
          progress: 100,
        }),
      ],
    ]);
    expect(selectFocusedAgent(agents, 'a1')).toBe('a1');
  });

  it('returns null for empty agents', () => {
    expect(selectFocusedAgent(new Map(), null)).toBeNull();
  });

  it('returns null for empty agents even with currentFocusId', () => {
    expect(selectFocusedAgent(new Map(), 'a1')).toBeNull();
  });

  it('returns null if current focus is invalid and no running', () => {
    const agents = new Map<string, DashboardNode>([
      [
        'a1',
        makeNode({
          id: 'a1',
          name: 'Arch',
          stage: 'PLAN',
          status: 'done',
          isPrimary: true,
          progress: 100,
        }),
      ],
    ]);
    expect(selectFocusedAgent(agents, 'nonexistent')).toBeNull();
  });

  it('prefers running primary over running non-primary even when non-primary added later', () => {
    const agents = new Map<string, DashboardNode>([
      ['a1', makeNode({ id: 'a1', status: 'running', isPrimary: false })],
      ['a2', makeNode({ id: 'a2', status: 'running', isPrimary: true })],
      ['a3', makeNode({ id: 'a3', status: 'running', isPrimary: false })],
    ]);
    expect(selectFocusedAgent(agents, null)).toBe('a2');
  });

  it('ignores primary agent that is not running', () => {
    const agents = new Map<string, DashboardNode>([
      ['a1', makeNode({ id: 'a1', status: 'done', isPrimary: true })],
      ['a2', makeNode({ id: 'a2', status: 'running', isPrimary: false })],
    ]);
    expect(selectFocusedAgent(agents, null)).toBe('a2');
  });

  it('returns null when all agents are done and currentFocusId is null', () => {
    const agents = new Map<string, DashboardNode>([
      ['a1', makeNode({ id: 'a1', status: 'done' })],
      ['a2', makeNode({ id: 'a2', status: 'error' })],
    ]);
    expect(selectFocusedAgent(agents, null)).toBeNull();
  });
});
