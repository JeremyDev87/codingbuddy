import { describe, it, expect } from 'vitest';
import {
  createDefaultDashboardNode,
  DASHBOARD_NODE_STATUSES,
  createEmptyStageStats,
  getLayoutMode,
  type DashboardNode,
  type StageStats,
} from './dashboard-types';

describe('tui/dashboard-types', () => {
  describe('getLayoutMode', () => {
    it('should return "narrow" for columns < 80', () => {
      expect(getLayoutMode(40)).toBe('narrow');
      expect(getLayoutMode(79)).toBe('narrow');
    });

    it('should return "medium" for columns 80-119', () => {
      expect(getLayoutMode(80)).toBe('medium');
      expect(getLayoutMode(100)).toBe('medium');
      expect(getLayoutMode(119)).toBe('medium');
    });

    it('should return "wide" for columns >= 120', () => {
      expect(getLayoutMode(120)).toBe('wide');
      expect(getLayoutMode(200)).toBe('wide');
    });

    it('should handle boundary values exactly', () => {
      expect(getLayoutMode(79)).toBe('narrow');
      expect(getLayoutMode(80)).toBe('medium');
      expect(getLayoutMode(119)).toBe('medium');
      expect(getLayoutMode(120)).toBe('wide');
    });
  });

  describe('DASHBOARD_NODE_STATUSES', () => {
    it('should contain all 5 status values', () => {
      expect(DASHBOARD_NODE_STATUSES).toEqual(['running', 'idle', 'blocked', 'error', 'done']);
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(DASHBOARD_NODE_STATUSES)).toBe(true);
    });
  });

  describe('createDefaultDashboardNode', () => {
    it('should apply default values for optional fields', () => {
      const node: DashboardNode = createDefaultDashboardNode({
        id: 'agent-1',
        name: 'frontend-developer',
        stage: 'ACT',
      });

      expect(node).toEqual({
        id: 'agent-1',
        name: 'frontend-developer',
        stage: 'ACT',
        status: 'idle',
        isPrimary: false,
        progress: 0,
      });
    });

    it('should allow overriding default values', () => {
      const node: DashboardNode = createDefaultDashboardNode({
        id: 'agent-2',
        name: 'code-reviewer',
        stage: 'EVAL',
        status: 'running',
        isPrimary: true,
        progress: 75,
      });

      expect(node).toEqual({
        id: 'agent-2',
        name: 'code-reviewer',
        stage: 'EVAL',
        status: 'running',
        isPrimary: true,
        progress: 75,
      });
    });

    it('should allow partial overrides', () => {
      const node: DashboardNode = createDefaultDashboardNode({
        id: 'agent-3',
        name: 'security-specialist',
        stage: 'PLAN',
        isPrimary: true,
      });

      expect(node.isPrimary).toBe(true);
      expect(node.status).toBe('idle');
      expect(node.progress).toBe(0);
    });
  });

  describe('createEmptyStageStats', () => {
    it('should return all counters at zero', () => {
      const stats: StageStats = createEmptyStageStats();

      expect(stats).toEqual({
        running: 0,
        blocked: 0,
        waiting: 0,
        done: 0,
        error: 0,
      });
    });

    it('should return a new object each time', () => {
      const stats1 = createEmptyStageStats();
      const stats2 = createEmptyStageStats();

      expect(stats1).not.toBe(stats2);
      expect(stats1).toEqual(stats2);
    });
  });
});
