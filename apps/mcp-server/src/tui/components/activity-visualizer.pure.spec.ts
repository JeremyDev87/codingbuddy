import { describe, it, expect } from 'vitest';
import { renderAgentTree, renderAgentStatusCard } from './activity-visualizer.pure';
import type { DashboardNode, Edge } from '../dashboard-types';
import { createDefaultDashboardNode } from '../dashboard-types';
import { estimateDisplayWidth } from '../utils/display-width';

function makeAgents(): Map<string, DashboardNode> {
  const agents = new Map<string, DashboardNode>();
  agents.set(
    'main-agent',
    createDefaultDashboardNode({
      id: 'main-agent',
      name: 'main-agent',
      stage: 'PLAN',
      status: 'running',
      isPrimary: true,
      progress: 50,
    }),
  );
  agents.set(
    'sub-agent-2',
    createDefaultDashboardNode({
      id: 'sub-agent-2',
      name: 'sub-agent-2',
      stage: 'EVAL',
      status: 'done',
      isPrimary: false,
      progress: 100,
    }),
  );
  agents.set(
    'solution-architect',
    createDefaultDashboardNode({
      id: 'solution-architect',
      name: 'solution-architect',
      stage: 'PLAN',
      status: 'running',
      isPrimary: false,
      progress: 30,
    }),
  );
  return agents;
}

const sampleEdges: Edge[] = [
  { from: 'main-agent', to: 'solution-architect', label: 'delegates', type: 'delegation' },
  { from: 'main-agent', to: 'sub-agent-2', label: 'output', type: 'output' },
];

describe('renderAgentTree', () => {
  it('returns empty array for height <= 0', () => {
    expect(renderAgentTree(new Map(), [], [], 40, 0)).toEqual([]);
  });

  it('returns empty array for width <= 0', () => {
    expect(renderAgentTree(new Map(), [], [], 0, 5)).toEqual([]);
    expect(renderAgentTree(new Map(), [], [], -1, 5)).toEqual([]);
  });

  it('includes Activity header as first line', () => {
    const lines = renderAgentTree(makeAgents(), sampleEdges, [], 80, 10);
    expect(lines[0]).toContain('Activity');
  });

  it('shows primary agent as root node', () => {
    const lines = renderAgentTree(makeAgents(), sampleEdges, [], 80, 10);
    const content = lines.join('\n');
    expect(content).toContain('main-agent');
  });

  it('shows child agents with tree connectors', () => {
    const lines = renderAgentTree(makeAgents(), sampleEdges, [], 80, 10);
    const content = lines.join('\n');
    expect(content).toContain('solution-architect');
    expect(content).toContain('sub-agent-2');
  });

  it('uses running icon ● for running agents', () => {
    const lines = renderAgentTree(makeAgents(), sampleEdges, [], 80, 10);
    expect(lines.join('\n')).toContain('●');
  });

  it('uses done icon ○ for done agents', () => {
    const lines = renderAgentTree(makeAgents(), sampleEdges, [], 80, 10);
    expect(lines.join('\n')).toContain('○');
  });

  it('shows activeSkills as leaf nodes with (skill) label', () => {
    const lines = renderAgentTree(makeAgents(), sampleEdges, ['brainstorming'], 80, 10);
    const content = lines.join('\n');
    expect(content).toContain('brainstorming');
    expect(content).toContain('skill');
  });

  it('uses ◉ icon for skill nodes', () => {
    const lines = renderAgentTree(makeAgents(), sampleEdges, ['brainstorming'], 80, 10);
    expect(lines.join('\n')).toContain('◉');
  });

  it('shows No agents when map is empty', () => {
    const lines = renderAgentTree(new Map(), [], [], 80, 5);
    expect(lines.join('\n')).toContain('No agents');
  });

  it('respects height limit', () => {
    const lines = renderAgentTree(makeAgents(), sampleEdges, ['skill1', 'skill2'], 80, 3);
    expect(lines.length).toBeLessThanOrEqual(3);
  });

  it('truncates lines to width', () => {
    const lines = renderAgentTree(makeAgents(), sampleEdges, [], 20, 10);
    for (const line of lines) {
      expect(estimateDisplayWidth(line)).toBeLessThanOrEqual(20);
    }
  });

  it('returns only header when height is 1', () => {
    const lines = renderAgentTree(makeAgents(), sampleEdges, [], 80, 1);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('Activity');
  });

  it('uses tree connector characters', () => {
    const lines = renderAgentTree(makeAgents(), sampleEdges, [], 80, 10);
    const content = lines.join('\n');
    // ├ 또는 └ 트리 연결자가 있어야 함
    expect(content.includes('├') || content.includes('└')).toBe(true);
  });

  it('does not show agents not connected to root via edges', () => {
    const agentsWithDisconnected = new Map(makeAgents());
    agentsWithDisconnected.set(
      'disconnected-agent',
      createDefaultDashboardNode({
        id: 'disconnected-agent',
        name: 'disconnected-agent',
        stage: 'PLAN',
        status: 'idle',
        isPrimary: false,
        progress: 0,
      }),
    );
    const lines = renderAgentTree(agentsWithDisconnected, sampleEdges, [], 80, 15);
    expect(lines.join('\n')).not.toContain('disconnected-agent');
  });

  it('uses ○ icon for idle agents (via ACTIVITY_STATUS_ICONS)', () => {
    const idleAgents = new Map<string, DashboardNode>();
    idleAgents.set(
      'root',
      createDefaultDashboardNode({
        id: 'root',
        name: 'root',
        stage: 'PLAN',
        status: 'running',
        isPrimary: true,
      }),
    );
    idleAgents.set(
      'idle-child',
      createDefaultDashboardNode({
        id: 'idle-child',
        name: 'idle-child',
        stage: 'PLAN',
        status: 'idle',
      }),
    );
    const edges: Edge[] = [{ from: 'root', to: 'idle-child', label: '', type: 'delegation' }];
    const lines = renderAgentTree(idleAgents, edges, [], 80, 10);
    // idle 에이전트는 ○ 아이콘을 사용해야 함
    const childLine = lines.find(l => l.includes('idle-child'));
    expect(childLine).toContain('○');
  });
});

describe('renderAgentStatusCard', () => {
  const focusedAgent = createDefaultDashboardNode({
    id: 'solution-architect',
    name: 'solution-architect',
    stage: 'PLAN',
    status: 'running',
    isPrimary: false,
    progress: 30,
  });

  it('returns empty array for height <= 0', () => {
    expect(renderAgentStatusCard(null, null, [], [], 40, 0)).toEqual([]);
  });

  it('returns empty array for width <= 0', () => {
    expect(renderAgentStatusCard(null, null, [], [], 0, 5)).toEqual([]);
    expect(renderAgentStatusCard(null, null, [], [], -1, 5)).toEqual([]);
  });

  it('includes Live header as first line', () => {
    const lines = renderAgentStatusCard(focusedAgent, 'PLAN', [], [], 80, 10);
    expect(lines[0]).toContain('Live');
  });

  it('shows current mode', () => {
    const lines = renderAgentStatusCard(focusedAgent, 'PLAN', [], [], 80, 10);
    expect(lines.join('\n')).toContain('PLAN');
  });

  it('shows focused agent name', () => {
    const lines = renderAgentStatusCard(focusedAgent, 'PLAN', [], [], 80, 10);
    expect(lines.join('\n')).toContain('solution-architect');
  });

  it('shows agent running status', () => {
    const lines = renderAgentStatusCard(focusedAgent, 'PLAN', [], [], 80, 10);
    expect(lines.join('\n')).toContain('running');
  });

  it('shows separator line with ─ character', () => {
    const lines = renderAgentStatusCard(focusedAgent, 'PLAN', [], [], 80, 10);
    expect(lines.join('\n')).toContain('─');
  });

  it('shows first objective', () => {
    const objectives = ['Design Activity/Live panels for TUI HUD', 'Another objective'];
    const lines = renderAgentStatusCard(focusedAgent, 'PLAN', objectives, [], 80, 10);
    expect(lines.join('\n')).toContain('Design Activity');
  });

  it('does NOT show second objective', () => {
    const objectives = ['First objective', 'Second objective'];
    const lines = renderAgentStatusCard(focusedAgent, 'PLAN', objectives, [], 80, 15);
    expect(lines.join('\n')).not.toContain('Second objective');
  });

  it('shows active skills with ⚙ prefix', () => {
    const lines = renderAgentStatusCard(focusedAgent, 'PLAN', [], ['brainstorming'], 80, 10);
    const content = lines.join('\n');
    expect(content).toContain('⚙');
    expect(content).toContain('brainstorming');
  });

  it('shows No agent when focusedAgent is null', () => {
    const lines = renderAgentStatusCard(null, 'PLAN', [], [], 80, 5);
    expect(lines.join('\n')).toContain('No agent');
  });

  it('respects height limit', () => {
    const objectives = ['Long objective text here'];
    const skills = ['skill1', 'skill2', 'skill3'];
    const lines = renderAgentStatusCard(focusedAgent, 'PLAN', objectives, skills, 80, 4);
    expect(lines.length).toBeLessThanOrEqual(4);
  });

  it('truncates lines to width', () => {
    const lines = renderAgentStatusCard(focusedAgent, 'PLAN', ['objective'], ['skill'], 20, 10);
    for (const line of lines) {
      expect(estimateDisplayWidth(line)).toBeLessThanOrEqual(20);
    }
  });

  it('handles null currentMode gracefully', () => {
    const lines = renderAgentStatusCard(focusedAgent, null, [], [], 80, 5);
    expect(lines).toBeDefined();
    expect(lines.length).toBeGreaterThan(0);
  });

  it('word-wraps long objectives to width', () => {
    const longObj = 'A'.repeat(30) + ' ' + 'B'.repeat(30);
    const lines = renderAgentStatusCard(focusedAgent, 'PLAN', [longObj], [], 40, 10);
    for (const line of lines) {
      expect(estimateDisplayWidth(line)).toBeLessThanOrEqual(40);
    }
  });

  it('returns only header when height is 1', () => {
    const lines = renderAgentStatusCard(focusedAgent, 'PLAN', [], [], 80, 1);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('Live');
  });

  it('does not show double separator when objectives are empty', () => {
    const lines = renderAgentStatusCard(focusedAgent, 'PLAN', [], ['brainstorming'], 80, 15);
    let prevWasSeparator = false;
    for (const line of lines) {
      const isSeparator = line.length > 0 && [...line].every(c => c === '─');
      if (isSeparator && prevWasSeparator) {
        // 연속 separator 금지
        expect(isSeparator && prevWasSeparator).toBe(false);
      }
      prevWasSeparator = isSeparator;
    }
  });
});
