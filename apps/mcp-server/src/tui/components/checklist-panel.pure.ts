import type { TaskItem } from '../dashboard-types';

export function resolveChecklistTasks(
  tasks: TaskItem[],
  contextDecisions: string[],
  contextNotes: string[],
): TaskItem[] {
  if (tasks.length > 0) {
    return tasks;
  }

  if (contextDecisions.length > 0) {
    return [
      { id: 'fallback-decision', subject: `Review: ${contextDecisions[0]}`, completed: false },
    ];
  }

  if (contextNotes.length > 0) {
    return [{ id: 'fallback-note', subject: `Check: ${contextNotes[0]}`, completed: false }];
  }

  return [{ id: 'fallback-default', subject: 'Review current task objectives', completed: false }];
}
