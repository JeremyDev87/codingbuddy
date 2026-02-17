import { describe, it, expect } from 'vitest';
import { renderEventLog, renderAgentTimeline, renderTaskProgress } from './monitor-panel.pure';
import type { EventLogEntry, DashboardNode, TaskItem } from '../dashboard-types';

describe('renderEventLog', () => {
  const entries: EventLogEntry[] = [
    { timestamp: '10:01', message: 'Agent started', level: 'info' },
    { timestamp: '10:02', message: 'Tool called', level: 'info' },
    { timestamp: '10:03', message: 'Error occurred', level: 'error' },
  ];

  it('returns header as first line', () => {
    const lines = renderEventLog(entries, 30, 5);
    expect(lines[0]).toContain('Event Log');
  });

  it('shows most recent entries last (chronological order)', () => {
    const lines = renderEventLog(entries, 30, 5);
    const content = lines.slice(1).join('\n');
    expect(content).toContain('10:01');
    expect(content).toContain('10:03');
  });

  it('limits output to height lines', () => {
    const lines = renderEventLog(entries, 30, 3);
    expect(lines.length).toBeLessThanOrEqual(3);
  });

  it('truncates long messages to width', () => {
    const longEntries: EventLogEntry[] = [
      { timestamp: '10:01', message: 'A'.repeat(100), level: 'info' },
    ];
    const lines = renderEventLog(longEntries, 20, 5);
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(20);
    }
  });

  it('returns only header for empty entries', () => {
    const lines = renderEventLog([], 30, 5);
    expect(lines.length).toBe(2);
    expect(lines[1]).toContain('No events');
  });

  it('returns only header when height=1 and entries empty', () => {
    const lines = renderEventLog([], 30, 1);
    expect(lines.length).toBe(1);
    expect(lines[0]).toContain('Event Log');
  });

  it('returns empty array for height <= 0', () => {
    expect(renderEventLog(entries, 30, 0)).toEqual([]);
    expect(renderEventLog(entries, 30, -1)).toEqual([]);
  });
});

describe('renderAgentTimeline', () => {
  const agents = new Map<string, DashboardNode>([
    [
      'a1',
      {
        id: 'a1',
        name: 'architect',
        stage: 'PLAN',
        status: 'running',
        isPrimary: true,
        progress: 75,
      },
    ],
    [
      'a2',
      { id: 'a2', name: 'tester', stage: 'ACT', status: 'idle', isPrimary: false, progress: 30 },
    ],
  ]);

  it('returns header as first line', () => {
    const lines = renderAgentTimeline(agents, 30, 5);
    expect(lines[0]).toContain('Timeline');
  });

  it('shows one line per agent with name and progress bar', () => {
    const lines = renderAgentTimeline(agents, 30, 5);
    const content = lines.slice(1).join('\n');
    expect(content).toContain('architect');
    expect(content).toContain('tester');
  });

  it('limits output to height lines', () => {
    const lines = renderAgentTimeline(agents, 30, 3);
    expect(lines.length).toBeLessThanOrEqual(3);
  });

  it('returns only header for empty agents', () => {
    const lines = renderAgentTimeline(new Map(), 30, 5);
    expect(lines.length).toBe(2);
    expect(lines[1]).toContain('No agents');
  });

  it('truncates agent names to fit width', () => {
    const lines = renderAgentTimeline(agents, 15, 5);
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(15);
    }
  });

  it('clamps progress > 100 without crashing', () => {
    const overflowAgents = new Map<string, DashboardNode>([
      [
        'a1',
        { id: 'a1', name: 'bot', stage: 'ACT', status: 'running', isPrimary: false, progress: 150 },
      ],
    ]);
    const lines = renderAgentTimeline(overflowAgents, 30, 5);
    expect(lines.length).toBeGreaterThanOrEqual(2);
    // Bar should be fully filled, not overflow
    const barLine = lines[1];
    expect(barLine).toBeDefined();
    expect(barLine!.length).toBeLessThanOrEqual(30);
  });

  it('clamps negative progress without crashing', () => {
    const negAgents = new Map<string, DashboardNode>([
      [
        'a1',
        { id: 'a1', name: 'bot', stage: 'ACT', status: 'error', isPrimary: false, progress: -20 },
      ],
    ]);
    const lines = renderAgentTimeline(negAgents, 30, 5);
    expect(lines.length).toBeGreaterThanOrEqual(2);
    const barLine = lines[1];
    expect(barLine).toBeDefined();
    expect(barLine!.length).toBeLessThanOrEqual(30);
  });

  it('returns only header when height=1 and agents empty', () => {
    const lines = renderAgentTimeline(new Map(), 30, 1);
    expect(lines.length).toBe(1);
    expect(lines[0]).toContain('Timeline');
  });

  it('returns empty array for height <= 0', () => {
    expect(renderAgentTimeline(agents, 30, 0)).toEqual([]);
    expect(renderAgentTimeline(agents, 30, -1)).toEqual([]);
  });
});

describe('renderTaskProgress', () => {
  const tasks: TaskItem[] = [
    { id: '1', subject: 'Write tests', completed: true },
    { id: '2', subject: 'Implement feature', completed: false },
    { id: '3', subject: 'Code review', completed: false },
  ];

  it('returns header as first line with completion summary', () => {
    const lines = renderTaskProgress(tasks, 30, 6);
    expect(lines[0]).toContain('Tasks');
    expect(lines[0]).toContain('1/3');
  });

  it('shows completed tasks with checkmark', () => {
    const lines = renderTaskProgress(tasks, 30, 6);
    const content = lines.join('\n');
    expect(content).toMatch(/\[x].*Write tests/);
  });

  it('shows incomplete tasks with empty checkbox', () => {
    const lines = renderTaskProgress(tasks, 30, 6);
    const content = lines.join('\n');
    expect(content).toMatch(/\[ ].*Implement feature/);
  });

  it('limits output to height lines', () => {
    const lines = renderTaskProgress(tasks, 30, 3);
    expect(lines.length).toBeLessThanOrEqual(3);
  });

  it('returns only header for empty tasks', () => {
    const lines = renderTaskProgress([], 30, 5);
    expect(lines.length).toBe(2);
    expect(lines[1]).toContain('No tasks');
  });

  it('returns only header when height=1 and tasks empty', () => {
    const lines = renderTaskProgress([], 30, 1);
    expect(lines.length).toBe(1);
    expect(lines[0]).toContain('Tasks');
  });

  it('returns empty array for height <= 0', () => {
    expect(renderTaskProgress(tasks, 30, 0)).toEqual([]);
    expect(renderTaskProgress(tasks, 30, -1)).toEqual([]);
  });

  it('truncates long subjects to width', () => {
    const longTasks: TaskItem[] = [{ id: '1', subject: 'A'.repeat(100), completed: false }];
    const lines = renderTaskProgress(longTasks, 20, 5);
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(20);
    }
  });
});
