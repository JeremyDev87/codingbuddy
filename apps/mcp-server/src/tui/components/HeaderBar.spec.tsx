import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { HeaderBar } from './HeaderBar';

describe('tui/components/HeaderBar', () => {
  it('should render title with neon branding', () => {
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
    expect(lastFrame()).toContain('CODINGBUDDY');
  });

  it('should render mode flow with active mode highlighted', () => {
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
    const frame = lastFrame() ?? '';
    expect(frame).toContain('[ACT]');
    expect(frame).toContain('PLAN');
    expect(frame).toContain('EVAL');
  });

  it('should render state indicator with icon', () => {
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
    const frame = lastFrame() ?? '';
    expect(frame).toContain('IDLE');
    expect(frame).toContain('○');
  });

  it('should render RUNNING state with filled circle', () => {
    const { lastFrame } = render(
      <HeaderBar
        workspace="/repo"
        sessionId="s"
        currentMode="PLAN"
        globalState="RUNNING"
        layoutMode="wide"
        width={120}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('●');
    expect(frame).toContain('RUNNING');
  });

  it('should render ERROR state with ! icon', () => {
    const { lastFrame } = render(
      <HeaderBar
        workspace="/repo"
        sessionId="s"
        currentMode="PLAN"
        globalState="ERROR"
        layoutMode="wide"
        width={120}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('!');
    expect(frame).toContain('ERROR');
  });

  it('should render in narrow mode with shortened title', () => {
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
    const frame = lastFrame() ?? '';
    expect(frame).toContain('CODINGBUDDY');
  });

  it('should render workspace and session in wide mode', () => {
    const { lastFrame } = render(
      <HeaderBar
        workspace="/repo/myapp"
        sessionId="abc123def"
        currentMode="PLAN"
        globalState="RUNNING"
        layoutMode="wide"
        width={120}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('/repo/myapp');
    expect(frame).toContain('sess:');
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

  // --- Bug #488: AUTO mode display fix ---

  it('should not render AUTO in process flow arrows for non-AUTO modes', () => {
    const { lastFrame } = render(
      <HeaderBar
        workspace="/repo"
        sessionId="s"
        currentMode="PLAN"
        globalState="RUNNING"
        layoutMode="wide"
        width={120}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('PLAN');
    expect(frame).toContain('ACT');
    expect(frame).toContain('EVAL');
    expect(frame).not.toMatch(/EVAL[^]*AUTO/);
  });

  it('should render AUTO as separate badge when AUTO mode is active', () => {
    const { lastFrame } = render(
      <HeaderBar
        workspace="/repo"
        sessionId="s"
        currentMode="AUTO"
        globalState="RUNNING"
        layoutMode="wide"
        width={120}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('AUTO');
    expect(frame).toContain('PLAN');
    expect(frame).toContain('ACT');
    expect(frame).toContain('EVAL');
    // AUTO should not be connected by arrow to EVAL
    expect(frame).not.toMatch(/EVAL[^A]*→[^A]*AUTO/);
  });

  it('should render double border (Ink box rendering)', () => {
    const { lastFrame } = render(
      <HeaderBar
        workspace="/repo"
        sessionId="s"
        currentMode="PLAN"
        globalState="RUNNING"
        layoutMode="wide"
        width={120}
      />,
    );
    const frame = lastFrame() ?? '';
    // Double border uses ╔ ╗ ╚ ╝ characters
    expect(frame).toContain('╔');
    expect(frame).toContain('╗');
    expect(frame).toContain('╚');
    expect(frame).toContain('╝');
  });
});
