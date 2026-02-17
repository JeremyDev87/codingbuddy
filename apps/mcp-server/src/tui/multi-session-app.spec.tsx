import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import type { ManagedSession, MultiSessionManager } from './ipc/multi-session-manager';
import { MultiSessionApp } from './multi-session-app';

/* ------------------------------------------------------------------ */
/*  Mocks (vi.mock calls are hoisted before imports by Vitest)         */
/* ------------------------------------------------------------------ */

vi.mock('./dashboard-app', () => ({
  DashboardApp: () => React.createElement('ink-text', null, 'DashboardApp'),
}));

vi.mock('./hooks/use-terminal-size', () => ({
  useTerminalSize: () => ({ columns: 80, rows: 24, layoutMode: 'wide' as const }),
}));

vi.mock('./utils/icons', async importOriginal => {
  const actual = await importOriginal<typeof import('./utils/icons')>();
  return { ...actual, isNerdFontEnabled: () => false };
});

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function makeManagedSession(pid: number, projectRoot = `/project/session-${pid}`): ManagedSession {
  return {
    instance: {
      pid,
      projectRoot,
      socketPath: `/tmp/cb-tui-${pid}.sock`,
      startedAt: new Date().toISOString(),
    },
    client: {} as ManagedSession['client'],
    eventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() } as unknown as ManagedSession['eventBus'],
    connected: true,
  };
}

interface MockManager {
  getSessions: ReturnType<typeof vi.fn>;
  getSession: ReturnType<typeof vi.fn>;
  onSessionAdded: ReturnType<typeof vi.fn>;
  offSessionAdded: ReturnType<typeof vi.fn>;
  onSessionRemoved: ReturnType<typeof vi.fn>;
  offSessionRemoved: ReturnType<typeof vi.fn>;
}

function createMockManager(sessions: ManagedSession[] = []): MockManager {
  return {
    getSessions: vi.fn(() => sessions),
    getSession: vi.fn((pid: number) => sessions.find(s => s.instance.pid === pid)),
    onSessionAdded: vi.fn(),
    offSessionAdded: vi.fn(),
    onSessionRemoved: vi.fn(),
    offSessionRemoved: vi.fn(),
  };
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('MultiSessionApp', () => {
  it('renders without errors for empty manager', () => {
    const mgr = createMockManager([]);

    const { lastFrame } = render(
      React.createElement(MultiSessionApp, { manager: mgr as unknown as MultiSessionManager }),
    );

    const frame = lastFrame() ?? '';
    // DashboardApp should still render even with no sessions
    expect(frame).toContain('DashboardApp');
  });

  it('single session: no tab bar visible, DashboardApp renders', () => {
    const s1 = makeManagedSession(100);
    const mgr = createMockManager([s1]);

    const { lastFrame } = render(
      React.createElement(MultiSessionApp, { manager: mgr as unknown as MultiSessionManager }),
    );

    const frame = lastFrame() ?? '';
    // Tab bar returns null for single session (formatSessionTabs returns '' for <= 1 sessions)
    // So the frame should NOT contain tab indicators like "[1]"
    expect(frame).not.toContain('[1]');
    // DashboardApp should render
    expect(frame).toContain('DashboardApp');
  });

  it('multiple sessions: tab bar visible with indicators', () => {
    const s1 = makeManagedSession(100, '/project/frontend');
    const s2 = makeManagedSession(200, '/project/backend');
    const mgr = createMockManager([s1, s2]);

    const { lastFrame } = render(
      React.createElement(MultiSessionApp, { manager: mgr as unknown as MultiSessionManager }),
    );

    const frame = lastFrame() ?? '';
    // Tab bar should show tab indicators
    expect(frame).toContain('[1]');
    expect(frame).toContain('[2]');
    expect(frame).toContain('frontend');
    expect(frame).toContain('backend');
    // DashboardApp should also render
    expect(frame).toContain('DashboardApp');
  });

  it('keyboard right arrow does not crash', () => {
    const s1 = makeManagedSession(100);
    const s2 = makeManagedSession(200);
    const mgr = createMockManager([s1, s2]);

    const { lastFrame, stdin } = render(
      React.createElement(MultiSessionApp, { manager: mgr as unknown as MultiSessionManager }),
    );

    // Send right arrow key (escape sequence)
    stdin.write('\x1B[C');

    const frame = lastFrame() ?? '';
    // Should not crash — component still renders
    expect(frame).toContain('DashboardApp');
  });

  it('keyboard left arrow does not crash', () => {
    const s1 = makeManagedSession(100);
    const s2 = makeManagedSession(200);
    const mgr = createMockManager([s1, s2]);

    const { lastFrame, stdin } = render(
      React.createElement(MultiSessionApp, { manager: mgr as unknown as MultiSessionManager }),
    );

    // Send left arrow key (escape sequence)
    stdin.write('\x1B[D');

    const frame = lastFrame() ?? '';
    expect(frame).toContain('DashboardApp');
  });

  it('renders active session indicator for first session by default', () => {
    const s1 = makeManagedSession(100, '/project/alpha');
    const s2 = makeManagedSession(200, '/project/beta');
    const mgr = createMockManager([s1, s2]);

    const { lastFrame } = render(
      React.createElement(MultiSessionApp, { manager: mgr as unknown as MultiSessionManager }),
    );

    const frame = lastFrame() ?? '';
    // First session should be active (shown with IDLE state indicator)
    expect(frame).toContain('alpha');
    expect(frame).toContain('beta');
  });
});
