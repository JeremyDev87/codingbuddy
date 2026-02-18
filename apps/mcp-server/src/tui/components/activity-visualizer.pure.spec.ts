import { describe, it, expect } from 'vitest';
import { renderAgentRoster, renderAgentEvents } from './activity-visualizer.pure';
import type { DashboardNode, EventLogEntry } from '../dashboard-types';
import { createDefaultDashboardNode } from '../dashboard-types';
import { estimateDisplayWidth } from '../utils/display-width';

function makeAgents(): Map<string, DashboardNode> {
  const agents = new Map<string, DashboardNode>();
  agents.set(
    'plan-mode',
    createDefaultDashboardNode({
      id: 'plan-mode',
      name: 'plan-mode',
      stage: 'PLAN',
      status: 'running',
      isPrimary: true,
      progress: 75,
    }),
  );
  agents.set(
    'security',
    createDefaultDashboardNode({
      id: 'security',
      name: 'security',
      stage: 'EVAL',
      status: 'idle',
      isPrimary: false,
      progress: 0,
    }),
  );
  return agents;
}

describe('renderAgentRoster', () => {
  it('returns empty array for height <= 0', () => {
    expect(renderAgentRoster(new Map(), 40, 0)).toEqual([]);
  });

  it('returns empty array for width <= 0', () => {
    expect(renderAgentRoster(new Map(), 0, 5)).toEqual([]);
    expect(renderAgentRoster(new Map(), -1, 5)).toEqual([]);
  });

  it('includes Agents header as first line', () => {
    const lines = renderAgentRoster(makeAgents(), 80, 10);
    expect(lines[0]).toContain('Agents');
  });

  it('shows agent names', () => {
    const lines = renderAgentRoster(makeAgents(), 80, 10);
    const content = lines.join('\n');
    expect(content).toContain('plan-mode');
    expect(content).toContain('security');
  });

  it('shows running status icon', () => {
    const lines = renderAgentRoster(makeAgents(), 80, 10);
    const content = lines.join('\n');
    expect(content).toContain('●');
  });

  it('shows agent progress', () => {
    const lines = renderAgentRoster(makeAgents(), 80, 10);
    const content = lines.join('\n');
    expect(content).toContain('75%');
  });

  it('shows No agents when map is empty', () => {
    const lines = renderAgentRoster(new Map(), 80, 5);
    expect(lines.join('\n')).toContain('No agents');
  });

  it('respects height limit', () => {
    const lines = renderAgentRoster(makeAgents(), 80, 2);
    expect(lines.length).toBeLessThanOrEqual(2);
  });

  it('truncates lines to width', () => {
    const lines = renderAgentRoster(makeAgents(), 20, 10);
    for (const line of lines) {
      expect(estimateDisplayWidth(line)).toBeLessThanOrEqual(20);
    }
  });

  it('primary agents appear before non-primary', () => {
    const lines = renderAgentRoster(makeAgents(), 80, 10);
    const planIdx = lines.findIndex(l => l.includes('plan-mode'));
    const secIdx = lines.findIndex(l => l.includes('security'));
    expect(planIdx).toBeGreaterThan(-1);
    expect(secIdx).toBeGreaterThan(-1);
    expect(planIdx).toBeLessThan(secIdx);
  });

  it('returns only header when height is 1', () => {
    const lines = renderAgentRoster(makeAgents(), 80, 1);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('Agents');
  });
});

describe('renderAgentEvents', () => {
  const eventLog: EventLogEntry[] = [
    { timestamp: '10:00:01', message: 'agent: plan-mode activated', level: 'info' },
    { timestamp: '10:00:05', message: 'agent: security started', level: 'info' },
    { timestamp: '10:00:10', message: 'error: timeout', level: 'error' },
  ];

  it('returns empty array for height <= 0', () => {
    expect(renderAgentEvents(eventLog, 40, 0)).toEqual([]);
  });

  it('returns empty array for width <= 0', () => {
    expect(renderAgentEvents(eventLog, 0, 5)).toEqual([]);
    expect(renderAgentEvents(eventLog, -1, 5)).toEqual([]);
  });

  it('includes Events header as first line', () => {
    const lines = renderAgentEvents(eventLog, 80, 10);
    expect(lines[0]).toContain('Events');
  });

  it('shows event messages', () => {
    const lines = renderAgentEvents(eventLog, 80, 10);
    const content = lines.join('\n');
    expect(content).toContain('plan-mode activated');
  });

  it('shows No events when log is empty', () => {
    const lines = renderAgentEvents([], 80, 5);
    expect(lines.join('\n')).toContain('No events');
  });

  it('respects height limit', () => {
    const lines = renderAgentEvents(eventLog, 80, 2);
    expect(lines.length).toBeLessThanOrEqual(2);
  });

  it('truncates lines to width', () => {
    const lines = renderAgentEvents(eventLog, 20, 10);
    for (const line of lines) {
      expect(estimateDisplayWidth(line)).toBeLessThanOrEqual(20);
    }
  });

  it('shows events in chronological order (oldest first)', () => {
    const lines = renderAgentEvents(eventLog, 80, 10);
    const firstIdx = lines.findIndex(l => l.includes('plan-mode activated'));
    const lastIdx = lines.findIndex(l => l.includes('timeout'));
    expect(firstIdx).toBeGreaterThan(-1);
    expect(lastIdx).toBeGreaterThan(-1);
    expect(firstIdx).toBeLessThan(lastIdx);
  });

  it('returns only header when height is 1', () => {
    const lines = renderAgentEvents(eventLog, 80, 1);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('Events');
  });

  it('shows most recent events when log exceeds height', () => {
    const manyEvents: EventLogEntry[] = Array.from({ length: 20 }, (_, i) => ({
      timestamp: `10:00:${String(i).padStart(2, '0')}`,
      message: `event-${i}`,
      level: 'info' as const,
    }));
    const lines = renderAgentEvents(manyEvents, 80, 5);
    const content = lines.join('\n');
    // 최근 이벤트(event-16 ~ event-19)가 보여야 함
    expect(content).toContain('event-19');
    // 오래된 이벤트(event-0)는 보이지 않아야 함
    expect(content).not.toContain('event-0');
  });
});
