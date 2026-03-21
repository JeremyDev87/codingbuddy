/**
 * Widget Component Example
 *
 * Demonstrates a complete Widget following the Widget-Slot Architecture:
 * - Server Component entry point (data fetching)
 * - Client Component UI (interactions)
 * - Colocated Server Actions (mutations)
 * - Barrel file exports
 *
 * File structure:
 *
 * Widgets/TaskBoard/
 * ├── index.tsx           ← Entry point (this file concept - Server Component)
 * ├── types.ts            ← Widget-specific types
 * ├── ui/
 * │   ├── index.ts        ← Barrel file
 * │   ├── TaskBoardUI.tsx  ← Main UI (Client Component)
 * │   └── TaskCard.tsx     ← Sub-component (Client Component)
 * ├── hooks/
 * │   └── useTaskDrag.ts  ← Widget-specific hook
 * └── actions/
 *     ├── getTasks.ts     ← Data fetching (cached)
 *     └── updateTask.ts   ← Data mutation (revalidates)
 */

// ═══════════════════════════════════════════════════════════
// types.ts — Widget-specific types
// ═══════════════════════════════════════════════════════════

export interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  assignee: string | null;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}

export interface TaskBoardProps {
  /** Project identifier to fetch tasks for */
  projectId: string;
  /** Optional filter for task status */
  statusFilter?: Task['status'][];
}

// ═══════════════════════════════════════════════════════════
// actions/getTasks.ts — Cached data fetching
// ═══════════════════════════════════════════════════════════

// 'use server';
// import { cache } from 'react';

/**
 * Fetch tasks for a project. Results are cached with a tag
 * so other widgets can trigger re-fetch via revalidateTag.
 */
// export const getTasks = cache(async (projectId: string): Promise<Task[]> => {
//   const res = await fetch(`${process.env.API_URL}/projects/${projectId}/tasks`, {
//     next: { tags: [`tasks-${projectId}`] },
//   });
//
//   if (!res.ok) {
//     throw new Error(`Failed to fetch tasks: ${res.status}`);
//   }
//
//   return res.json();
// });

// ═══════════════════════════════════════════════════════════
// actions/updateTask.ts — Data mutation with cache invalidation
// ═══════════════════════════════════════════════════════════

// 'use server';
// import { revalidateTag } from 'next/cache';

/**
 * Update a task's status. After mutation, invalidates the cache tag
 * so all widgets consuming this project's tasks will re-fetch.
 */
// export async function updateTaskStatus(
//   projectId: string,
//   taskId: string,
//   newStatus: Task['status'],
// ): Promise<{ success: boolean }> {
//   const res = await fetch(
//     `${process.env.API_URL}/projects/${projectId}/tasks/${taskId}`,
//     {
//       method: 'PATCH',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ status: newStatus }),
//     },
//   );
//
//   if (!res.ok) {
//     throw new Error(`Failed to update task: ${res.status}`);
//   }
//
//   // Invalidate cache so all widgets showing these tasks re-fetch
//   revalidateTag(`tasks-${projectId}`);
//
//   return { success: true };
// }

// ═══════════════════════════════════════════════════════════
// index.tsx — Widget Entry Point (Server Component)
// ═══════════════════════════════════════════════════════════

/**
 * TaskBoard Widget — Server Component entry point.
 *
 * Principles:
 * 1. Receives only minimal props (projectId) — fetches own data
 * 2. Starts as Server Component — delegates interactivity to Client UI
 * 3. Portable — works in any slot that provides a projectId
 */

// import { getTasks } from './actions/getTasks';
// import { TaskBoardUI } from './ui';
//
// export default async function TaskBoardWidget({
//   projectId,
//   statusFilter,
// }: TaskBoardProps) {
//   const allTasks = await getTasks(projectId);
//
//   const tasks = statusFilter
//     ? allTasks.filter((t) => statusFilter.includes(t.status))
//     : allTasks;
//
//   if (tasks.length === 0) {
//     return (
//       <div className="task-board--empty">
//         <p>No tasks found. Create your first task to get started.</p>
//       </div>
//     );
//   }
//
//   return <TaskBoardUI tasks={tasks} projectId={projectId} />;
// }

// ═══════════════════════════════════════════════════════════
// ui/TaskBoardUI.tsx — Main UI (Client Component)
// ═══════════════════════════════════════════════════════════

// 'use client';
//
// import { type Task } from '../types';
// import { TaskCard } from './TaskCard';
// import { updateTaskStatus } from '../actions/updateTask';
//
// interface TaskBoardUIProps {
//   tasks: Task[];
//   projectId: string;
// }
//
// const COLUMNS: Array<{ status: Task['status']; label: string }> = [
//   { status: 'todo', label: 'To Do' },
//   { status: 'in_progress', label: 'In Progress' },
//   { status: 'done', label: 'Done' },
// ];
//
// export function TaskBoardUI({ tasks, projectId }: TaskBoardUIProps) {
//   const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
//     await updateTaskStatus(projectId, taskId, newStatus);
//   };
//
//   return (
//     <div className="task-board">
//       {COLUMNS.map(({ status, label }) => (
//         <div key={status} className="task-board__column">
//           <h3 className="task-board__column-header">
//             {label}
//             <span className="task-board__count">
//               {tasks.filter((t) => t.status === status).length}
//             </span>
//           </h3>
//           <div className="task-board__cards">
//             {tasks
//               .filter((t) => t.status === status)
//               .map((task) => (
//                 <TaskCard
//                   key={task.id}
//                   task={task}
//                   onStatusChange={handleStatusChange}
//                 />
//               ))}
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// }

// ═══════════════════════════════════════════════════════════
// ui/TaskCard.tsx — Sub-component (Client Component)
// ═══════════════════════════════════════════════════════════

// 'use client';
//
// import { type Task } from '../types';
//
// interface TaskCardProps {
//   task: Task;
//   onStatusChange: (taskId: string, newStatus: Task['status']) => Promise<void>;
// }
//
// const PRIORITY_COLORS: Record<Task['priority'], string> = {
//   low: 'var(--color-success)',
//   medium: 'var(--color-warning)',
//   high: 'var(--color-danger)',
// };
//
// export function TaskCard({ task, onStatusChange }: TaskCardProps) {
//   return (
//     <article className="task-card" data-priority={task.priority}>
//       <div
//         className="task-card__priority-indicator"
//         style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
//         aria-label={`Priority: ${task.priority}`}
//       />
//       <h4 className="task-card__title">{task.title}</h4>
//       {task.assignee && (
//         <span className="task-card__assignee">{task.assignee}</span>
//       )}
//     </article>
//   );
// }

// ═══════════════════════════════════════════════════════════
// ui/index.ts — Barrel file
// ═══════════════════════════════════════════════════════════

// export { TaskBoardUI } from './TaskBoardUI';
// export { TaskCard } from './TaskCard';

// ═══════════════════════════════════════════════════════════
// Slot connection example
// File: app/dashboard/@tasks/page.tsx
// ═══════════════════════════════════════════════════════════

// import TaskBoardWidget from '@/Widgets/TaskBoard';
//
// export default function TasksSlotPage({
//   searchParams,
// }: {
//   searchParams: { project?: string };
// }) {
//   const projectId = searchParams.project ?? 'default';
//   return <TaskBoardWidget projectId={projectId} />;
// }
