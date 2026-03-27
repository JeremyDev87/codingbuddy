import { describe, it, expect } from 'vitest';
import {
  renderTddPhaseBar,
  renderProgressBar,
  renderTddSteps,
  renderOverallProgress,
  renderActScreen,
} from './act-screen.pure';
import type { TddStep, DashboardNode } from '../dashboard-types';

function makeAgents(...entries: [string, Partial<DashboardNode>][]): Map<string, DashboardNode> {
  const map = new Map<string, DashboardNode>();
  for (const [id, partial] of entries) {
    map.set(id, {
      id,
      name: partial.name ?? id,
      stage: partial.stage ?? 'ACT',
      status: partial.status ?? 'running',
      isPrimary: partial.isPrimary ?? false,
      progress: partial.progress ?? 0,
      isParallel: partial.isParallel ?? false,
    });
  }
  return map;
}

describe('act-screen.pure', () => {
  describe('renderTddPhaseBar', () => {
    it('should render all three phases', () => {
      const lines = renderTddPhaseBar('RED', 80);
      expect(lines[0].type).toBe('header');
      const bar = lines[1].text;
      expect(bar).toContain('RED');
      expect(bar).toContain('GREEN');
      expect(bar).toContain('REFACTOR');
    });

    it('should mark current phase with ►', () => {
      const lines = renderTddPhaseBar('GREEN', 80);
      const bar = lines[1].text;
      expect(bar).toContain('►');
      // RED should not have ►
      const redIdx = bar.indexOf('RED');
      const greenIdx = bar.indexOf('GREEN');
      const markerIdx = bar.indexOf('►');
      expect(markerIdx).toBeGreaterThan(redIdx);
      expect(markerIdx).toBeLessThan(greenIdx);
    });

    it('should handle null phase', () => {
      const lines = renderTddPhaseBar(null, 80);
      expect(lines[1].text).not.toContain('►');
    });
  });

  describe('renderProgressBar', () => {
    it('should render 0%', () => {
      const bar = renderProgressBar(0, 10);
      expect(bar).toContain('░'.repeat(10));
      expect(bar).toContain('0%');
    });

    it('should render 100%', () => {
      const bar = renderProgressBar(100, 10);
      expect(bar).toContain('█'.repeat(10));
      expect(bar).toContain('100%');
    });

    it('should render 50%', () => {
      const bar = renderProgressBar(50, 10);
      expect(bar).toContain('█'.repeat(5));
      expect(bar).toContain('░'.repeat(5));
    });
  });

  describe('renderTddSteps', () => {
    it('should show empty message when no steps', () => {
      const lines = renderTddSteps([], 80);
      expect(lines[1].text).toContain('no steps yet');
    });

    it('should render steps with status icons', () => {
      const steps: TddStep[] = [
        { id: '1', label: 'Write test', phase: 'RED', agentId: 'test-eng', status: 'done' },
        { id: '2', label: 'Implement', phase: 'GREEN', agentId: null, status: 'active' },
      ];
      const lines = renderTddSteps(steps, 80);
      expect(lines[1].text).toContain('✓');
      expect(lines[1].text).toContain('Write test');
      expect(lines[2].text).toContain('●');
      expect(lines[2].text).toContain('Implement');
    });
  });

  describe('renderOverallProgress', () => {
    it('should calculate step-based progress', () => {
      const steps: TddStep[] = [
        { id: '1', label: 'a', phase: 'RED', agentId: null, status: 'done' },
        { id: '2', label: 'b', phase: 'GREEN', agentId: null, status: 'done' },
        { id: '3', label: 'c', phase: 'REFACTOR', agentId: null, status: 'pending' },
      ];
      const lines = renderOverallProgress(new Map(), steps, 80);
      const text = lines.map(l => l.text).join(' ');
      expect(text).toContain('67%');
      expect(text).toContain('2/3');
    });

    it('should fall back to agent-based progress when no steps', () => {
      const agents = makeAgents(['a1', { progress: 50 }]);
      const lines = renderOverallProgress(agents, [], 80);
      const text = lines.map(l => l.text).join(' ');
      expect(text).toContain('50%');
    });
  });

  describe('renderActScreen', () => {
    it('should combine all sections', () => {
      const lines = renderActScreen('RED', [], new Map(), 80);
      expect(lines.some(l => l.type === 'header')).toBe(true);
      expect(lines.some(l => l.type === 'phase-bar')).toBe(true);
    });
  });
});
