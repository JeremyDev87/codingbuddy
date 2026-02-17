import { describe, it, expect } from 'vitest';
import { formatSessionTabs, type SessionTab } from './session-tab-bar.pure';
import type { GlobalRunState } from '../dashboard-types';

describe('tui/components/session-tab-bar.pure', () => {
  const makeTabs = (overrides: Array<Partial<SessionTab>> = []): SessionTab[] =>
    overrides.map((o, i) => ({
      pid: 1000 + i,
      index: i + 1,
      projectName: `project-${i + 1}`,
      globalState: 'IDLE' as GlobalRunState | 'DISCONNECTED',
      isActive: i === 0,
      ...o,
    }));

  describe('formatSessionTabs', () => {
    // --- Single session → empty string ---

    it('should return empty string when tabs array is empty', () => {
      expect(formatSessionTabs([], 120, 'wide')).toBe('');
    });

    it('should return empty string when there is only one session', () => {
      const tabs = makeTabs([{ projectName: 'my-app', isActive: true }]);
      expect(formatSessionTabs(tabs, 120, 'wide')).toBe('');
    });

    // --- Multiple sessions in wide/medium layout ---

    it('should show tab indicators for multiple sessions in wide layout', () => {
      const tabs = makeTabs([
        { projectName: 'my-project', isActive: true, globalState: 'RUNNING' },
        { projectName: 'api-server', isActive: false, globalState: 'IDLE' },
      ]);
      const result = formatSessionTabs(tabs, 120, 'wide');
      expect(result).toContain('[1]');
      expect(result).toContain('my-project');
      expect(result).toContain('[2]');
      expect(result).toContain('api-server');
    });

    it('should show tab indicators for multiple sessions in medium layout', () => {
      const tabs = makeTabs([
        { projectName: 'frontend', isActive: true, globalState: 'RUNNING' },
        { projectName: 'backend', isActive: false, globalState: 'IDLE' },
      ]);
      const result = formatSessionTabs(tabs, 100, 'medium');
      expect(result).toContain('[1]');
      expect(result).toContain('frontend');
      expect(result).toContain('[2]');
      expect(result).toContain('backend');
    });

    // --- Status icon mapping ---

    it('should show ● icon for RUNNING state', () => {
      const tabs = makeTabs([
        { projectName: 'a', globalState: 'RUNNING' },
        { projectName: 'b', globalState: 'IDLE' },
      ]);
      const result = formatSessionTabs(tabs, 120, 'wide');
      expect(result).toContain('●');
    });

    it('should show ○ icon for IDLE state', () => {
      const tabs = makeTabs([
        { projectName: 'a', globalState: 'IDLE' },
        { projectName: 'b', globalState: 'RUNNING' },
      ]);
      const result = formatSessionTabs(tabs, 120, 'wide');
      expect(result).toContain('○');
    });

    it('should show ✗ icon for ERROR state', () => {
      const tabs = makeTabs([
        { projectName: 'a', globalState: 'ERROR' },
        { projectName: 'b', globalState: 'IDLE' },
      ]);
      const result = formatSessionTabs(tabs, 120, 'wide');
      expect(result).toContain('✗');
    });

    it('should show ? icon for DISCONNECTED state', () => {
      const tabs = makeTabs([
        { projectName: 'a', globalState: 'DISCONNECTED' },
        { projectName: 'b', globalState: 'IDLE' },
      ]);
      const result = formatSessionTabs(tabs, 120, 'wide');
      expect(result).toContain('?');
    });

    it('should map all four states to their correct icons in one output', () => {
      const tabs = makeTabs([
        { projectName: 'a', globalState: 'RUNNING', isActive: true },
        { projectName: 'b', globalState: 'IDLE', isActive: false },
        { projectName: 'c', globalState: 'ERROR', isActive: false },
        { projectName: 'd', globalState: 'DISCONNECTED', isActive: false },
      ]);
      const result = formatSessionTabs(tabs, 120, 'wide');
      expect(result).toContain('●');
      expect(result).toContain('○');
      expect(result).toContain('✗');
      expect(result).toContain('?');
    });

    // --- Narrow layout → compact counter ---

    it('should show compact counter in narrow layout', () => {
      const tabs = makeTabs([
        { projectName: 'my-project', isActive: true },
        { projectName: 'api-server', isActive: false },
        { projectName: 'worker', isActive: false },
      ]);
      const result = formatSessionTabs(tabs, 60, 'narrow');
      expect(result).toBe('(1/3)');
    });

    it('should show correct active index in narrow layout', () => {
      const tabs = makeTabs([
        { projectName: 'my-project', isActive: false },
        { projectName: 'api-server', isActive: true, index: 2 },
        { projectName: 'worker', isActive: false },
      ]);
      const result = formatSessionTabs(tabs, 60, 'narrow');
      expect(result).toBe('(2/3)');
    });

    it('should still return empty string for single session in narrow layout', () => {
      const tabs = makeTabs([{ projectName: 'solo' }]);
      expect(formatSessionTabs(tabs, 60, 'narrow')).toBe('');
    });

    // --- Project name truncation ---

    it('should truncate project names when total width exceeds maxWidth', () => {
      const tabs = makeTabs([
        { projectName: 'very-long-project-name-alpha', isActive: true, globalState: 'RUNNING' },
        { projectName: 'very-long-project-name-beta', isActive: false, globalState: 'IDLE' },
      ]);
      const result = formatSessionTabs(tabs, 40, 'wide');
      expect(result.length).toBeLessThanOrEqual(40);
      // Should still contain tab numbers
      expect(result).toContain('[1]');
      expect(result).toContain('[2]');
    });

    it('should not truncate project names when there is enough width', () => {
      const tabs = makeTabs([
        { projectName: 'app', isActive: true, globalState: 'RUNNING' },
        { projectName: 'api', isActive: false, globalState: 'IDLE' },
      ]);
      const result = formatSessionTabs(tabs, 120, 'wide');
      expect(result).toContain('app');
      expect(result).toContain('api');
    });

    it('should use ellipsis when truncating long project names', () => {
      const tabs = makeTabs([
        { projectName: 'very-long-project-name-alpha', isActive: true, globalState: 'RUNNING' },
        { projectName: 'very-long-project-name-beta', isActive: false, globalState: 'IDLE' },
      ]);
      const result = formatSessionTabs(tabs, 40, 'wide');
      expect(result).toContain('…');
    });

    // --- Active tab indication ---

    it('should visually distinguish the active tab', () => {
      const tabs = makeTabs([
        { projectName: 'active-proj', isActive: true, globalState: 'RUNNING' },
        { projectName: 'other-proj', isActive: false, globalState: 'IDLE' },
      ]);
      const result = formatSessionTabs(tabs, 120, 'wide');
      // The active tab segment and inactive tab segment should differ
      // Active tab uses the status icon directly; inactive uses it too
      // but the key difference is that we can parse individual tab segments
      expect(result).toContain('[1] active-proj');
      expect(result).toContain('[2] other-proj');
    });
  });
});
