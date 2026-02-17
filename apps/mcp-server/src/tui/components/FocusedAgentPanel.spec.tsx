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
        tasks={[{ id: '1', subject: 'routes added', completed: true }]}
        tools={['file_edit']}
        inputs={['spec.md']}
        outputs={{ files: 3 }}
        eventLog={[]}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('BackendDev');
    expect(frame).toContain('RUNNING');
    expect(frame).toContain('●');
  });

  it('should render progress bar', () => {
    const { lastFrame } = render(
      <FocusedAgentPanel
        agent={mockAgent}
        activeSkills={[]}
        objectives={[]}
        tasks={[]}
        tools={[]}
        inputs={[]}
        outputs={{}}
        eventLog={[]}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('█');
    expect(frame).toContain('░');
    expect(frame).toContain('[50%]');
  });

  it('should render section dividers', () => {
    const { lastFrame } = render(
      <FocusedAgentPanel
        agent={mockAgent}
        activeSkills={[]}
        objectives={['Design auth']}
        tasks={[]}
        tools={[]}
        inputs={[]}
        outputs={{}}
        eventLog={[]}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('─── Objective');
    expect(frame).toContain('─── Checklist');
    expect(frame).toContain('─── Tools / IO');
    expect(frame).toContain('─── Event Log');
  });

  it('should render objectives', () => {
    const { lastFrame } = render(
      <FocusedAgentPanel
        agent={mockAgent}
        activeSkills={[]}
        objectives={['Add /users endpoints', 'Update DTO']}
        tasks={[]}
        tools={[]}
        inputs={[]}
        outputs={{}}
        eventLog={[]}
      />,
    );
    expect(lastFrame()).toContain('Add /users endpoints');
  });

  it('should render checklist with completed items', () => {
    const { lastFrame } = render(
      <FocusedAgentPanel
        agent={mockAgent}
        activeSkills={[]}
        objectives={[]}
        tasks={[
          { id: '1', subject: 'routes added', completed: true },
          { id: '2', subject: 'tests updated', completed: false },
        ]}
        tools={[]}
        inputs={[]}
        outputs={{}}
        eventLog={[]}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('[x] routes added');
    expect(frame).toContain('[ ] tests updated');
  });

  it('should render tool/IO section', () => {
    const { lastFrame } = render(
      <FocusedAgentPanel
        agent={mockAgent}
        activeSkills={[]}
        objectives={[]}
        tasks={[]}
        tools={['file_edit', 'test_run']}
        inputs={['spec.md']}
        outputs={{ files: 12, commits: 3 }}
        eventLog={[]}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('file_edit');
    expect(frame).toContain('spec.md');
  });

  it('should render logs', () => {
    const { lastFrame } = render(
      <FocusedAgentPanel
        agent={mockAgent}
        activeSkills={[]}
        objectives={[]}
        tasks={[]}
        tools={[]}
        inputs={[]}
        outputs={{}}
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
      <FocusedAgentPanel
        agent={null}
        activeSkills={[]}
        objectives={[]}
        tasks={[]}
        tools={[]}
        inputs={[]}
        outputs={{}}
        eventLog={[]}
      />,
    );
    expect(lastFrame()).toContain('No agent focused');
  });

  it('accepts and applies width and height props', () => {
    const { lastFrame } = render(
      <FocusedAgentPanel
        agent={mockAgent}
        activeSkills={[]}
        objectives={[]}
        tasks={[]}
        tools={[]}
        inputs={[]}
        outputs={{}}
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
        tasks={[]}
        tools={[]}
        inputs={[]}
        outputs={{}}
        eventLog={[]}
        width={60}
        height={20}
      />,
    );
    expect(lastFrame()).toContain('No agent focused');
  });

  it('should render single border with cyan color', () => {
    const { lastFrame } = render(
      <FocusedAgentPanel
        agent={mockAgent}
        activeSkills={[]}
        objectives={[]}
        tasks={[]}
        tools={[]}
        inputs={[]}
        outputs={{}}
        eventLog={[]}
      />,
    );
    const frame = lastFrame() ?? '';
    // Single border uses ┌ ┐ └ ┘
    expect(frame).toContain('┌');
    expect(frame).toContain('┘');
  });

  it('should render Skills section with active skills', () => {
    const { lastFrame } = render(
      <FocusedAgentPanel
        agent={mockAgent}
        activeSkills={['tdd', 'debugging']}
        objectives={[]}
        tasks={[]}
        tools={[]}
        inputs={[]}
        outputs={{}}
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
      <FocusedAgentPanel
        agent={mockAgent}
        activeSkills={[]}
        objectives={[]}
        tasks={[]}
        tools={[]}
        inputs={[]}
        outputs={{}}
        eventLog={[]}
      />,
    );
    expect(lastFrame()).toContain('No skills');
  });
});
