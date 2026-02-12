import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import { Header } from './Header';

describe('tui/components/Header', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 16, 43, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render logo text', () => {
    const { lastFrame } = render(<Header mode={null} />);
    expect(lastFrame()).toContain('CODINGBUDDY');
  });

  it('should render mode indicator when mode is provided', () => {
    const { lastFrame } = render(<Header mode="PLAN" />);
    expect(lastFrame()).toContain('● PLAN');
  });

  it('should not render mode indicator when mode is null', () => {
    const { lastFrame } = render(<Header mode={null} />);
    expect(lastFrame()).not.toContain('●');
  });

  it('should render current time', () => {
    const { lastFrame } = render(<Header mode="PLAN" />);
    expect(lastFrame()).toContain('16:43');
  });

  it('should render all mode types', () => {
    for (const mode of ['PLAN', 'ACT', 'EVAL', 'AUTO'] as const) {
      const { lastFrame } = render(<Header mode={mode} />);
      expect(lastFrame()).toContain(`● ${mode}`);
    }
  });
});
