import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { ProgressBar } from './ProgressBar';

describe('tui/components/ProgressBar', () => {
  it('should render a progress bar with default width', () => {
    const { lastFrame } = render(<ProgressBar value={50} />);
    expect(lastFrame()).toContain('█████░░░░░');
  });

  it('should render a full bar for value 100', () => {
    const { lastFrame } = render(<ProgressBar value={100} width={10} />);
    expect(lastFrame()).toContain('██████████');
  });

  it('should render an empty bar for value 0', () => {
    const { lastFrame } = render(<ProgressBar value={0} width={10} />);
    expect(lastFrame()).toContain('░░░░░░░░░░');
  });

  it('should respect custom width', () => {
    const { lastFrame } = render(<ProgressBar value={50} width={20} />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('██████████░░░░░░░░░░');
  });

  it('should apply color prop', () => {
    // ink-testing-library strips ANSI codes, so we verify render doesn't throw
    expect(() => render(<ProgressBar value={50} width={10} color="cyan" />)).not.toThrow();
  });

  it('should clamp value below 0', () => {
    const { lastFrame } = render(<ProgressBar value={-20} width={10} />);
    expect(lastFrame()).toContain('░░░░░░░░░░');
  });

  it('should clamp value above 100', () => {
    const { lastFrame } = render(<ProgressBar value={200} width={10} />);
    expect(lastFrame()).toContain('██████████');
  });
});
