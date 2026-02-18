import { describe, it, expect } from 'vitest';
import { resolveChecklistTasks } from './checklist-panel.pure';
import type { TaskItem } from '../dashboard-types';

describe('resolveChecklistTasks', () => {
  it('tasks가 있을 때 그대로 반환한다', () => {
    const tasks: TaskItem[] = [
      { id: '1', subject: 'routes added', completed: true },
      { id: '2', subject: 'tests updated', completed: false },
    ];
    const result = resolveChecklistTasks(tasks, [], []);
    expect(result).toEqual(tasks);
  });

  it('tasks가 비어있고 contextDecisions가 있으면 첫 번째 decision에서 도출한다', () => {
    const result = resolveChecklistTasks(
      [],
      ['Use JWT for auth', 'Add rate limiting'],
      ['Review codebase'],
    );
    expect(result).toHaveLength(1);
    expect(result[0].subject).toContain('Use JWT for auth');
    expect(result[0].completed).toBe(false);
  });

  it('tasks가 비어있고 contextDecisions가 없으면 contextNotes[0]에서 도출한다', () => {
    const result = resolveChecklistTasks([], [], ['Review existing codebase']);
    expect(result).toHaveLength(1);
    expect(result[0].subject).toContain('Review existing codebase');
    expect(result[0].completed).toBe(false);
  });

  it('tasks, contextDecisions, contextNotes 모두 비어있으면 기본 fallback을 반환한다', () => {
    const result = resolveChecklistTasks([], [], []);
    expect(result).toHaveLength(1);
    expect(result[0].subject).toBe('Review current task objectives');
    expect(result[0].completed).toBe(false);
  });
});
