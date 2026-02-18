import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { ChecklistPanel } from './ChecklistPanel';

describe('tui/components/ChecklistPanel', () => {
  it('tasks가 있을 때 체크리스트를 렌더링한다', () => {
    const { lastFrame } = render(
      <ChecklistPanel
        tasks={[
          { id: '1', subject: 'routes added', completed: true },
          { id: '2', subject: 'tests updated', completed: false },
        ]}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('✔ routes added');
    expect(frame).toContain('◻ tests updated');
  });

  it('tasks가 비어있고 contextDecisions가 있으면 fallback을 렌더링한다', () => {
    const { lastFrame } = render(
      <ChecklistPanel tasks={[]} contextDecisions={['Use JWT for auth']} contextNotes={[]} />,
    );
    expect(lastFrame()).toContain('Use JWT for auth');
  });

  it('tasks가 비어있고 contextNotes만 있으면 note fallback을 렌더링한다', () => {
    const { lastFrame } = render(
      <ChecklistPanel
        tasks={[]}
        contextDecisions={[]}
        contextNotes={['Review existing codebase']}
      />,
    );
    expect(lastFrame()).toContain('Review existing codebase');
  });

  it('모두 비어있으면 기본 fallback을 렌더링한다', () => {
    const { lastFrame } = render(
      <ChecklistPanel tasks={[]} contextDecisions={[]} contextNotes={[]} />,
    );
    expect(lastFrame()).toContain('Review current task objectives');
  });

  it('패널이 비어있지 않다 - 항상 최소 1개 항목 표시', () => {
    const { lastFrame } = render(<ChecklistPanel tasks={[]} />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Review current task objectives');
  });

  it('border와 Checklist 헤더를 렌더링한다', () => {
    const { lastFrame } = render(
      <ChecklistPanel tasks={[{ id: '1', subject: 'task', completed: false }]} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('┌');
    expect(frame).toContain('Checklist');
  });

  it('width, height props를 수용한다', () => {
    const { lastFrame } = render(
      <ChecklistPanel
        tasks={[{ id: '1', subject: 'task', completed: false }]}
        width={60}
        height={8}
      />,
    );
    expect(lastFrame()).toContain('task');
  });
});
