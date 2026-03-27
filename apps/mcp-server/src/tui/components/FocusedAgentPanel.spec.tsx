import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { FocusedAgentPanel } from './FocusedAgentPanel';
import { createDefaultDashboardNode } from '../dashboard-types';

describe('tui/components/FocusedAgentPanel', () => {
  const mockAgent = createDefaultDashboardNode({
    id: 'agent-1',
    name: 'BackendDev',
    stage: 'ACT',
    status: 'running',
    isPrimary: true,
    progress: 50,
  });

  it('should render agent name and status', () => {
    const { lastFrame } = render(
      <FocusedAgentPanel
        agent={mockAgent}
        activeSkills={[]}
        objectives={['Add /users endpoints']}
        eventLog={[]}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('BackendDev');
    expect(frame).toContain('RUNNING');
    expect(frame).toContain('●');
  });

  it('should render progress bar with braille chars and label', () => {
    const { lastFrame } = render(
      <FocusedAgentPanel agent={mockAgent} activeSkills={[]} objectives={[]} eventLog={[]} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('⣿');
    expect(frame).toContain('░');
    expect(frame).toContain('50%');
  });

  it('should render section dividers without Activity or Tools/IO', () => {
    const { lastFrame } = render(
      <FocusedAgentPanel
        agent={mockAgent}
        activeSkills={[]}
        objectives={['Design auth']}
        eventLog={[]}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('─── Objective');
    expect(frame).not.toContain('─── Activity');
    expect(frame).not.toContain('─── Tools / IO');
    expect(frame).toContain('─── Event Log');
  });

  it('should render objectives', () => {
    const { lastFrame } = render(
      <FocusedAgentPanel
        agent={mockAgent}
        activeSkills={[]}
        objectives={['Add /users endpoints', 'Update DTO']}
        eventLog={[]}
      />,
    );
    expect(lastFrame()).toContain('Add /users endpoints');
  });

  it('should render logs', () => {
    const { lastFrame } = render(
      <FocusedAgentPanel
        agent={mockAgent}
        activeSkills={[]}
        objectives={[]}
        eventLog={[
          { timestamp: '10:12:01', message: 'ACT start', level: 'info' },
          { timestamp: '10:12:09', message: 'edited: users.controller.ts', level: 'info' },
        ]}
      />,
    );
    expect(lastFrame()).toContain('ACT start');
  });

  it('should render placeholder when no agent focused', () => {
    const { lastFrame } = render(
      <FocusedAgentPanel agent={null} activeSkills={[]} objectives={[]} eventLog={[]} />,
    );
    expect(lastFrame()).toContain('No agent focused');
  });

  it('accepts and applies width and height props', () => {
    const { lastFrame } = render(
      <FocusedAgentPanel
        agent={mockAgent}
        activeSkills={[]}
        objectives={[]}
        eventLog={[]}
        width={60}
        height={20}
      />,
    );
    expect(lastFrame()).toContain('BackendDev');
  });

  it('accepts width and height props with no agent', () => {
    const { lastFrame } = render(
      <FocusedAgentPanel
        agent={null}
        activeSkills={[]}
        objectives={[]}
        eventLog={[]}
        width={60}
        height={20}
      />,
    );
    expect(lastFrame()).toContain('No agent focused');
  });

  it('should render single border with cyan color', () => {
    const { lastFrame } = render(
      <FocusedAgentPanel agent={mockAgent} activeSkills={[]} objectives={[]} eventLog={[]} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('┌');
    expect(frame).toContain('┘');
  });

  it('should render Skills section with active skills', () => {
    const { lastFrame } = render(
      <FocusedAgentPanel
        agent={mockAgent}
        activeSkills={['tdd', 'debugging']}
        objectives={[]}
        eventLog={[]}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('─── Skills');
    expect(frame).toContain('tdd');
    expect(frame).toContain('debugging');
  });

  it('should render "No skills" when activeSkills is empty', () => {
    const { lastFrame } = render(
      <FocusedAgentPanel agent={mockAgent} activeSkills={[]} objectives={[]} eventLog={[]} />,
    );
    expect(lastFrame()).toContain('No skills');
  });

  it('should render emoji avatar in agent header', () => {
    const { lastFrame } = render(
      <FocusedAgentPanel agent={mockAgent} activeSkills={[]} objectives={[]} eventLog={[]} />,
    );
    // BackendDev → backend 키워드 매칭 → ⚙️
    expect(lastFrame()).toContain('⚙️');
  });

  describe('elapsed timer and spinner for running agent', () => {
    it('should show spinner frame and elapsed time when tick and now are provided', () => {
      const now = 1710000090000;
      const startedAt = now - 83000; // 1m 23s ago
      const runningAgent = createDefaultDashboardNode({
        id: 'agent-1',
        name: 'BackendDev',
        stage: 'ACT',
        status: 'running',
        isPrimary: true,
        progress: 50,
        startedAt,
      });
      const { lastFrame } = render(
        <FocusedAgentPanel
          agent={runningAgent}
          activeSkills={[]}
          objectives={[]}
          eventLog={[]}
          tick={0}
          now={now}
        />,
      );
      const frame = lastFrame() ?? '';
      expect(frame).toContain('⠋'); // spinnerFrame(0)
      expect(frame).toContain('1m 23s');
    });

    it('should not show spinner/elapsed when agent is not running', () => {
      const now = 1710000090000;
      const doneAgent = createDefaultDashboardNode({
        id: 'agent-1',
        name: 'BackendDev',
        stage: 'ACT',
        status: 'done',
        isPrimary: true,
        progress: 100,
        startedAt: now - 83000,
      });
      const { lastFrame } = render(
        <FocusedAgentPanel
          agent={doneAgent}
          activeSkills={[]}
          objectives={[]}
          eventLog={[]}
          tick={0}
          now={now}
        />,
      );
      const frame = lastFrame() ?? '';
      expect(frame).not.toContain('⠋');
      expect(frame).not.toContain('1m 23s');
    });

    it('should show spinner but hide elapsed when tick is provided without now', () => {
      const runningAgent = createDefaultDashboardNode({
        id: 'agent-1',
        name: 'BackendDev',
        stage: 'ACT',
        status: 'running',
        isPrimary: true,
        progress: 50,
        startedAt: 1710000000000,
      });
      const { lastFrame } = render(
        <FocusedAgentPanel
          agent={runningAgent}
          activeSkills={[]}
          objectives={[]}
          eventLog={[]}
          tick={0}
        />,
      );
      const frame = lastFrame() ?? '';
      expect(frame).toContain('⠋'); // spinner shown
      expect(frame).not.toMatch(/\d+m \d+s/); // no elapsed time
    });

    it('should not show elapsed when startedAt is missing', () => {
      const now = 1710000090000;
      const { lastFrame } = render(
        <FocusedAgentPanel
          agent={mockAgent}
          activeSkills={[]}
          objectives={[]}
          eventLog={[]}
          tick={0}
          now={now}
        />,
      );
      const frame = lastFrame() ?? '';
      expect(frame).toContain('⠋'); // spinner still shows for running
      expect(frame).not.toContain('m '); // no elapsed time
    });
  });

  describe('relative timestamps in event log', () => {
    it('should show relative timestamps when now is provided and rawTimestamp exists', () => {
      const now = 1710000060000;
      const { lastFrame } = render(
        <FocusedAgentPanel
          agent={mockAgent}
          activeSkills={[]}
          objectives={[]}
          eventLog={[
            { timestamp: '10:00:00', message: 'Started', level: 'info', rawTimestamp: now - 5000 },
          ]}
          now={now}
        />,
      );
      const frame = lastFrame() ?? '';
      expect(frame).toContain('5s ago');
      expect(frame).toContain('Started');
    });

    it('should fall back to original timestamp when now is not provided', () => {
      const { lastFrame } = render(
        <FocusedAgentPanel
          agent={mockAgent}
          activeSkills={[]}
          objectives={[]}
          eventLog={[{ timestamp: '10:12:01', message: 'ACT start', level: 'info' }]}
        />,
      );
      const frame = lastFrame() ?? '';
      expect(frame).toContain('10:12:01');
      expect(frame).toContain('ACT start');
    });
  });

  describe('Context section', () => {
    it('renders context decisions when provided', () => {
      const { lastFrame } = render(
        <FocusedAgentPanel
          agent={mockAgent}
          activeSkills={[]}
          objectives={[]}
          eventLog={[]}
          contextDecisions={['Use JWT for auth', 'Add rate limiting']}
          contextNotes={[]}
        />,
      );
      const frame = lastFrame() ?? '';
      expect(frame).toContain('Use JWT for auth');
      expect(frame).toContain('Add rate limiting');
      expect(frame).toContain('─── Context');
    });

    it('renders context notes when provided', () => {
      const { lastFrame } = render(
        <FocusedAgentPanel
          agent={mockAgent}
          activeSkills={[]}
          objectives={[]}
          eventLog={[]}
          contextDecisions={[]}
          contextNotes={['Review existing codebase']}
        />,
      );
      const frame = lastFrame() ?? '';
      expect(frame).toContain('Review existing codebase');
      expect(frame).toContain('─── Context');
    });

    it('renders No context when both empty', () => {
      const { lastFrame } = render(
        <FocusedAgentPanel
          agent={mockAgent}
          activeSkills={[]}
          objectives={[]}
          eventLog={[]}
          contextDecisions={[]}
          contextNotes={[]}
        />,
      );
      const frame = lastFrame() ?? '';
      expect(frame).toContain('No context');
    });

    it('renders No context when props omitted', () => {
      const { lastFrame } = render(
        <FocusedAgentPanel agent={mockAgent} activeSkills={[]} objectives={[]} eventLog={[]} />,
      );
      const frame = lastFrame() ?? '';
      expect(frame).toContain('No context');
    });
  });
});
