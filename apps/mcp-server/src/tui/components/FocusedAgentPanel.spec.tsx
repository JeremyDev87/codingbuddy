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
