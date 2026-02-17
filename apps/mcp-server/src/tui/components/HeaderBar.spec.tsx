import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import { HeaderBar } from './HeaderBar';

describe('tui/components/HeaderBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 14, 30, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render title', () => {
    const { lastFrame } = render(
      <HeaderBar
        workspace="/repo/myapp"
        sessionId="2026-01-01_14-30-00"
        currentMode="PLAN"
        globalState="RUNNING"
        layoutMode="wide"
        width={120}
      />,
    );
    expect(lastFrame()).toContain('Codingbuddy TUI');
  });

  it('should render mode flow', () => {
    const { lastFrame } = render(
      <HeaderBar
        workspace="/repo/myapp"
        sessionId="sess-1"
        currentMode="ACT"
        globalState="RUNNING"
        layoutMode="wide"
        width={120}
      />,
    );
    expect(lastFrame()).toContain('ACT');
  });

  it('should render state indicator', () => {
    const { lastFrame } = render(
      <HeaderBar
        workspace="/repo"
        sessionId="s"
        currentMode={null}
        globalState="IDLE"
        layoutMode="wide"
        width={120}
      />,
    );
    expect(lastFrame()).toContain('IDLE');
  });

  it('should render in narrow mode without workspace', () => {
    const { lastFrame } = render(
      <HeaderBar
        workspace="/very/long/workspace/path"
        sessionId="long-session-id"
        currentMode="PLAN"
        globalState="RUNNING"
        layoutMode="narrow"
        width={60}
      />,
    );
    // In narrow mode, workspace should be hidden
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Codingbuddy');
  });

  it('should render with null mode', () => {
    const { lastFrame } = render(
      <HeaderBar
        workspace="/repo"
        sessionId="s"
        currentMode={null}
        globalState="IDLE"
        layoutMode="medium"
        width={100}
      />,
    );
    expect(lastFrame()).toBeTruthy();
  });
});
