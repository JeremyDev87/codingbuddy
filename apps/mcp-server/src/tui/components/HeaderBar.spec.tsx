import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { HeaderBar } from './HeaderBar';

const FIXED_NOW = new Date(2026, 2, 18, 14, 30, 45).getTime(); // local 14:30:45

describe('tui/components/HeaderBar', () => {
  it('should render title with neon branding', () => {
    const { lastFrame } = render(
      <HeaderBar
        workspace="/repo/myapp"
        currentMode="PLAN"
        globalState="RUNNING"
        layoutMode="wide"
        width={120}
        tick={0}
        now={FIXED_NOW}
      />,
    );
    expect(lastFrame()).toContain('CODINGBUDDY');
  });

  it('should render mode flow with active mode highlighted', () => {
    const { lastFrame } = render(
      <HeaderBar
        workspace="/repo/myapp"
        currentMode="ACT"
        globalState="RUNNING"
        layoutMode="wide"
        width={120}
        tick={0}
        now={FIXED_NOW}
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
        currentMode={null}
        globalState="IDLE"
        layoutMode="wide"
        width={120}
        tick={0}
        now={FIXED_NOW}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('IDLE');
    expect(frame).toContain('○');
  });

  it('should render RUNNING state with spinner when tick provided', () => {
    const { lastFrame } = render(
      <HeaderBar
        workspace="/repo"
        currentMode="PLAN"
        globalState="RUNNING"
        layoutMode="wide"
        width={120}
        tick={0}
        now={FIXED_NOW}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('⠋');
    expect(frame).toContain('RUNNING');
  });

  it('should render ERROR state with ! icon', () => {
    const { lastFrame } = render(
      <HeaderBar
        workspace="/repo"
        currentMode="PLAN"
        globalState="ERROR"
        layoutMode="wide"
        width={120}
        tick={0}
        now={FIXED_NOW}
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
        currentMode="PLAN"
        globalState="RUNNING"
        layoutMode="narrow"
        width={60}
        tick={0}
        now={FIXED_NOW}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('CODINGBUDDY');
  });

  it('should render workspace path without sess: prefix in wide mode', () => {
    const { lastFrame } = render(
      <HeaderBar
        workspace="/repo/myapp"
        currentMode="PLAN"
        globalState="RUNNING"
        layoutMode="wide"
        width={120}
        tick={0}
        now={FIXED_NOW}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('/repo/myapp');
    expect(frame).not.toContain('sess:');
  });

  it('should render with null mode', () => {
    const { lastFrame } = render(
      <HeaderBar
        workspace="/repo"
        currentMode={null}
        globalState="IDLE"
        layoutMode="medium"
        width={100}
        tick={0}
        now={FIXED_NOW}
      />,
    );
    expect(lastFrame()).toBeTruthy();
  });

  // --- Bug #488: AUTO mode display fix ---

  it('should not render AUTO in process flow arrows for non-AUTO modes', () => {
    const { lastFrame } = render(
      <HeaderBar
        workspace="/repo"
        currentMode="PLAN"
        globalState="RUNNING"
        layoutMode="wide"
        width={120}
        tick={0}
        now={FIXED_NOW}
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
        currentMode="AUTO"
        globalState="RUNNING"
        layoutMode="wide"
        width={120}
        tick={0}
        now={FIXED_NOW}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('AUTO');
    expect(frame).toContain('PLAN');
    expect(frame).toContain('ACT');
    expect(frame).toContain('EVAL');
    expect(frame).not.toMatch(/EVAL[^A]*→[^A]*AUTO/);
  });

  it('should render double border (Ink box rendering)', () => {
    const { lastFrame } = render(
      <HeaderBar
        workspace="/repo"
        currentMode="PLAN"
        globalState="RUNNING"
        layoutMode="wide"
        width={120}
        tick={0}
        now={FIXED_NOW}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('╔');
    expect(frame).toContain('╗');
    expect(frame).toContain('╚');
    expect(frame).toContain('╝');
  });

  // --- Issue #673: Animated spinner + live clock ---

  it('should change spinner frame based on tick value', () => {
    const { lastFrame } = render(
      <HeaderBar
        workspace="/repo"
        currentMode="PLAN"
        globalState="RUNNING"
        layoutMode="wide"
        width={120}
        tick={3}
        now={FIXED_NOW}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('⠸');
    expect(frame).not.toContain('⠋');
  });

  it('should display live clock when now is provided', () => {
    const { lastFrame } = render(
      <HeaderBar
        workspace="/repo"
        currentMode="PLAN"
        globalState="RUNNING"
        layoutMode="wide"
        width={120}
        tick={0}
        now={FIXED_NOW}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('14:30:45');
  });

  it('should render without tick/now for backward compatibility', () => {
    const { lastFrame } = render(
      <HeaderBar
        workspace="/repo"
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
});
