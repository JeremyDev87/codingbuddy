import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { StageHealthBar } from './StageHealthBar';
import { createEmptyStageStats } from '../dashboard-types';

function makeHealth() {
  return {
    PLAN: { ...createEmptyStageStats(), running: 1, done: 5 },
    ACT: { ...createEmptyStageStats(), running: 2, waiting: 1 },
    EVAL: { ...createEmptyStageStats(), error: 1 },
    AUTO: createEmptyStageStats(),
  };
}

describe('tui/components/StageHealthBar', () => {
  it('should render stage names with colors', () => {
    const { lastFrame } = render(
      <StageHealthBar
        stageHealth={makeHealth()}
        bottlenecks={[]}
        tokenCount={128000}
        width={120}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('PLAN:');
    expect(frame).toContain('ACT:');
    expect(frame).toContain('EVAL:');
  });

  it('should render running/done/error stats', () => {
    const { lastFrame } = render(
      <StageHealthBar stageHealth={makeHealth()} bottlenecks={[]} tokenCount={0} width={120} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('running');
    expect(frame).toContain('err');
  });

  it('should render token count', () => {
    const { lastFrame } = render(
      <StageHealthBar stageHealth={makeHealth()} bottlenecks={[]} tokenCount={64000} width={120} />,
    );
    expect(lastFrame()).toContain('64k');
  });

  it('should render bottlenecks', () => {
    const { lastFrame } = render(
      <StageHealthBar
        stageHealth={makeHealth()}
        bottlenecks={['tests failing(3)', 'lint errors']}
        tokenCount={0}
        width={120}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('tests failing');
    expect(frame).toContain('Bottlenecks');
  });

  it('should render in narrow mode', () => {
    const { lastFrame } = render(
      <StageHealthBar
        stageHealth={makeHealth()}
        bottlenecks={['long bottleneck description']}
        tokenCount={50000}
        width={60}
      />,
    );
    expect(lastFrame()).toBeTruthy();
  });

  it('should render with empty stats', () => {
    const empty = {
      PLAN: createEmptyStageStats(),
      ACT: createEmptyStageStats(),
      EVAL: createEmptyStageStats(),
      AUTO: createEmptyStageStats(),
    };
    const { lastFrame } = render(
      <StageHealthBar stageHealth={empty} bottlenecks={[]} tokenCount={0} width={120} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('PLAN:');
    expect(frame).toContain('idle');
  });

  it('should render double border', () => {
    const { lastFrame } = render(
      <StageHealthBar stageHealth={makeHealth()} bottlenecks={[]} tokenCount={0} width={120} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('╔');
    expect(frame).toContain('╝');
  });
});
