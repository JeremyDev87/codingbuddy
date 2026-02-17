import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { SessionTabBar } from './SessionTabBar';
import type { SessionTab } from './session-tab-bar.pure';

function makeTab(overrides: Partial<SessionTab> & { index: number }): SessionTab {
  return {
    pid: overrides.index * 1000,
    projectName: `project-${overrides.index}`,
    globalState: 'IDLE',
    isActive: false,
    ...overrides,
  };
}

describe('tui/components/SessionTabBar', () => {
  it('should render nothing for a single session', () => {
    const sessions: SessionTab[] = [makeTab({ index: 1, isActive: true })];
    const { lastFrame } = render(
      <SessionTabBar sessions={sessions} width={120} layoutMode="wide" />,
    );
    expect(lastFrame()).toBe('');
  });

  it('should render tab indicators and project names for multiple sessions', () => {
    const sessions: SessionTab[] = [
      makeTab({ index: 1, projectName: 'my-app', isActive: true }),
      makeTab({ index: 2, projectName: 'api-server', isActive: false }),
    ];
    const { lastFrame } = render(
      <SessionTabBar sessions={sessions} width={120} layoutMode="wide" />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('[1]');
    expect(frame).toContain('[2]');
    expect(frame).toContain('my-app');
    expect(frame).toContain('api-server');
  });

  it('should contain status icons for multiple sessions', () => {
    const sessions: SessionTab[] = [
      makeTab({ index: 1, globalState: 'RUNNING', isActive: true }),
      makeTab({ index: 2, globalState: 'IDLE', isActive: false }),
    ];
    const { lastFrame } = render(
      <SessionTabBar sessions={sessions} width={120} layoutMode="wide" />,
    );
    const frame = lastFrame() ?? '';
    // RUNNING = ●, IDLE = ○
    expect(frame).toContain('●');
    expect(frame).toContain('○');
  });

  it('should render compact counter in narrow layout', () => {
    const sessions: SessionTab[] = [
      makeTab({ index: 1, isActive: true }),
      makeTab({ index: 2, isActive: false }),
      makeTab({ index: 3, isActive: false }),
    ];
    const { lastFrame } = render(
      <SessionTabBar sessions={sessions} width={60} layoutMode="narrow" />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('(1/3)');
  });

  it('should render nothing for zero sessions', () => {
    const { lastFrame } = render(<SessionTabBar sessions={[]} width={120} layoutMode="wide" />);
    expect(lastFrame()).toBe('');
  });
});
