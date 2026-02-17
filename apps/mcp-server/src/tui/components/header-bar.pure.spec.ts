import { describe, it, expect } from 'vitest';
import { formatTime, formatHeaderBar, type HeaderBarData } from './header-bar.pure';

describe('tui/components/header-bar.pure', () => {
  const baseData: HeaderBarData = {
    workspace: '/home/user/my-project',
    sessionId: 'sess-abc123',
    currentMode: 'PLAN',
    globalState: 'RUNNING',
  };

  describe('formatTime', () => {
    it('should format time as HH:MM', () => {
      const date = new Date(2026, 0, 1, 9, 5, 0);
      expect(formatTime(date)).toBe('09:05');
    });

    it('should pad single-digit hours and minutes with zero', () => {
      const date = new Date(2026, 0, 1, 1, 3, 0);
      expect(formatTime(date)).toBe('01:03');
    });

    it('should handle midnight correctly', () => {
      const date = new Date(2026, 0, 1, 0, 0, 0);
      expect(formatTime(date)).toBe('00:00');
    });

    it('should handle 23:59 correctly', () => {
      const date = new Date(2026, 0, 1, 23, 59, 0);
      expect(formatTime(date)).toBe('23:59');
    });
  });

  describe('formatHeaderBar', () => {
    it('should include the title in output', () => {
      const result = formatHeaderBar(baseData, 120, 'wide');
      expect(result).toContain('Codingbuddy TUI / Agent Dashboard');
    });

    it('should include workspace in wide mode', () => {
      const result = formatHeaderBar(baseData, 120, 'wide');
      expect(result).toContain('Workspace: /home/user/my-project');
    });

    it('should include session ID in wide mode', () => {
      const result = formatHeaderBar(baseData, 120, 'wide');
      expect(result).toContain('Session: sess-abc123');
    });

    it('should include mode flow with current mode highlighted', () => {
      const result = formatHeaderBar(baseData, 120, 'wide');
      expect(result).toContain('[PLAN]');
      expect(result).toContain('ACT');
      expect(result).toContain('EVAL');
    });

    it('should include state indicator', () => {
      const result = formatHeaderBar(baseData, 120, 'wide');
      expect(result).toContain('RUNNING ●');
    });

    it('should display ERROR state with ! icon', () => {
      const errorData: HeaderBarData = { ...baseData, globalState: 'ERROR' };
      const result = formatHeaderBar(errorData, 120, 'wide');
      expect(result).toContain('ERROR !');
    });

    it('should display IDLE state with ○ icon', () => {
      const idleData: HeaderBarData = { ...baseData, globalState: 'IDLE' };
      const result = formatHeaderBar(idleData, 120, 'wide');
      expect(result).toContain('IDLE ○');
    });

    it('should hide workspace and session in narrow mode', () => {
      const result = formatHeaderBar(baseData, 60, 'narrow');
      expect(result).not.toContain('Workspace:');
      expect(result).not.toContain('Session:');
    });

    it('should include title, mode flow, and state in narrow mode', () => {
      const result = formatHeaderBar(baseData, 200, 'narrow');
      expect(result).toContain('Codingbuddy TUI / Agent Dashboard');
      expect(result).toContain('[PLAN]');
      expect(result).toContain('RUNNING ●');
    });

    it('should truncate workspace if line exceeds width in medium mode', () => {
      const longWsData: HeaderBarData = {
        ...baseData,
        workspace: '/very/long/path/to/some/deeply/nested/workspace/directory/that/goes/on/and/on',
      };
      const result = formatHeaderBar(longWsData, 100, 'medium');
      // Should still have two lines
      expect(result).toContain('\n');
      // Should still contain the title on line 1
      const lines = result.split('\n');
      expect(lines[0]).toContain('Codingbuddy TUI / Agent Dashboard');
    });

    it('should return a single line in narrow mode', () => {
      const result = formatHeaderBar(baseData, 200, 'narrow');
      expect(result).not.toContain('\n');
    });

    it('should return two lines in wide mode', () => {
      const result = formatHeaderBar(baseData, 200, 'wide');
      const lines = result.split('\n');
      expect(lines).toHaveLength(2);
    });

    it('should truncate to width in narrow mode when content is too long', () => {
      const result = formatHeaderBar(baseData, 40, 'narrow');
      expect(result.length).toBeLessThanOrEqual(40);
    });

    // --- Bug #488: AUTO mode display fix ---

    it('should not include AUTO in process flow arrows', () => {
      const result = formatHeaderBar(baseData, 120, 'wide');
      expect(result).toContain('[PLAN]');
      expect(result).not.toMatch(/EVAL → AUTO/);
    });

    it('should show AUTO mode as separate indicator when active', () => {
      const autoData: HeaderBarData = { ...baseData, currentMode: 'AUTO' };
      const result = formatHeaderBar(autoData, 120, 'wide');
      expect(result).toContain('[AUTO]');
      expect(result).not.toMatch(/EVAL → AUTO/);
      expect(result).not.toMatch(/→ \[AUTO\]/);
    });

    it('should show process flow without highlighting when AUTO is active', () => {
      const autoData: HeaderBarData = { ...baseData, currentMode: 'AUTO' };
      const result = formatHeaderBar(autoData, 120, 'wide');
      expect(result).toMatch(/PLAN → ACT → EVAL/);
    });

    // --- Bug #488: Overflow fix ---

    it('should never produce line2 exceeding width in wide mode', () => {
      const longData: HeaderBarData = {
        ...baseData,
        workspace: '/very/long/path/to/some/deeply/nested/workspace/directory/that/goes/on',
        sessionId: 'sess-very-long-session-id-that-is-quite-lengthy',
      };
      const result = formatHeaderBar(longData, 80, 'wide');
      const lines = result.split('\n');
      for (const line of lines) {
        expect(line.length).toBeLessThanOrEqual(80);
      }
    });

    it('should never produce output exceeding width in narrow mode', () => {
      const longData: HeaderBarData = {
        ...baseData,
        workspace: '/very/long/workspace',
        sessionId: 'very-long-session-id',
      };
      const result = formatHeaderBar(longData, 50, 'narrow');
      expect(result.length).toBeLessThanOrEqual(50);
    });
  });
});
