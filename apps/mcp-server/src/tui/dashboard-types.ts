/**
 * TUI Dashboard - Type Definitions
 *
 * Types for the redesigned TUI dashboard that visualizes agent orchestration,
 * task progress, stage health, and event logs.
 */
import type { Mode } from './types';

/**
 * Layout breakpoints based on terminal column width.
 * - narrow: < 80 columns (compact single-column)
 * - medium: 80-119 columns (two-column)
 * - wide: >= 120 columns (full three-column)
 */
export type LayoutMode = 'narrow' | 'medium' | 'wide';

export function getLayoutMode(columns: number): LayoutMode {
  if (columns < 80) return 'narrow';
  if (columns < 120) return 'medium';
  return 'wide';
}

/**
 * Valid statuses for a dashboard agent node.
 */
export const DASHBOARD_NODE_STATUSES = Object.freeze([
  'running',
  'idle',
  'blocked',
  'error',
  'done',
] as const);
export type DashboardNodeStatus = (typeof DASHBOARD_NODE_STATUSES)[number];

/**
 * Represents an agent node in the dashboard graph view.
 */
export interface DashboardNode {
  id: string;
  name: string;
  stage: Mode;
  status: DashboardNodeStatus;
  isPrimary: boolean;
  progress: number;
}

type DashboardNodeRequired = Pick<DashboardNode, 'id' | 'name' | 'stage'>;
type DashboardNodeOptional = Partial<Omit<DashboardNode, 'id' | 'name' | 'stage'>>;

/**
 * Creates a DashboardNode with sensible defaults for optional fields.
 */
export function createDefaultDashboardNode(
  params: DashboardNodeRequired & DashboardNodeOptional,
): DashboardNode {
  return {
    status: 'idle',
    isPrimary: false,
    progress: 0,
    ...params,
  };
}

/**
 * Relationship type between two agent nodes.
 */
export type EdgeType = 'delegation' | 'output' | 'dependency';

/**
 * Represents a directed edge between two agent nodes.
 */
export interface Edge {
  from: string;
  to: string;
  label: string;
  type: EdgeType;
}

/**
 * Severity level for event log entries.
 */
export type LogLevel = 'info' | 'warn' | 'error';

/**
 * A single entry in the dashboard event log.
 */
export interface EventLogEntry {
  timestamp: string;
  message: string;
  level: LogLevel;
}

/**
 * Aggregate statistics for a single workflow stage.
 */
export interface StageStats {
  running: number;
  blocked: number;
  waiting: number;
  done: number;
  error: number;
}

/**
 * Creates a StageStats object with all counters at zero.
 */
export function createEmptyStageStats(): StageStats {
  return { running: 0, blocked: 0, waiting: 0, done: 0, error: 0 };
}

/**
 * A task item tracked in the dashboard.
 */
export interface TaskItem {
  id: string;
  subject: string;
  completed: boolean;
}

/**
 * Top-level run state for the entire dashboard session.
 */
export type GlobalRunState = 'RUNNING' | 'IDLE' | 'ERROR';

/**
 * Complete dashboard state containing all data needed to render the TUI.
 */
export interface DashboardState {
  workspace: string;
  sessionId: string;
  currentMode: Mode | null;
  globalState: GlobalRunState;
  agents: Map<string, DashboardNode>;
  edges: Edge[];
  focusedAgentId: string | null;
  tasks: TaskItem[];
  eventLog: EventLogEntry[];
  objectives: string[];
  activeSkills: string[];
}

/**
 * A rectangular region in the terminal grid.
 * All values are in character units (columns/rows), 0-based.
 */
export interface GridRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Pre-computed layout for all dashboard sections.
 * Every section has deterministic (x, y, width, height).
 */
export interface DashboardGrid {
  header: GridRegion;
  flowMap: GridRegion;
  monitorPanel: GridRegion;
  focusedAgent: GridRegion;
  stageHealth: GridRegion;
  total: Pick<GridRegion, 'width' | 'height'>;
}
