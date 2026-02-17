import type { DashboardNode } from '../dashboard-types';

/**
 * Select the focused agent from the agents map.
 * Priority: running+isPrimary > any running (last in map) > keep current > null
 */
export function selectFocusedAgent(
  agents: Map<string, DashboardNode>,
  currentFocusId: string | null,
): string | null {
  if (agents.size === 0) return null;

  // Single pass: find running+primary or last running agent
  let primaryRunning: string | null = null;
  let lastRunning: string | null = null;
  for (const a of agents.values()) {
    if (a.status === 'running') {
      if (a.isPrimary) {
        primaryRunning = a.id;
      }
      lastRunning = a.id;
    }
  }

  // Priority 1: running + isPrimary
  if (primaryRunning) return primaryRunning;

  // Priority 2: any running (last in iteration = most recently added)
  if (lastRunning) return lastRunning;

  // Priority 3: keep current if valid
  if (currentFocusId && agents.has(currentFocusId)) {
    return currentFocusId;
  }

  // Priority 4: null
  return null;
}
