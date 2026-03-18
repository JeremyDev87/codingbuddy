import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { StageHealthBar } from './StageHealthBar';
import { createEmptyStageStats } from '../dashboard-types';
import type { ActivitySample } from './live.pure';

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
        toolCount={128000}
        agentCount={0}
        skillCount={0}
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
      <StageHealthBar
        stageHealth={makeHealth()}
        bottlenecks={[]}
        toolCount={0}
        agentCount={0}
        skillCount={0}
        width={120}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('running');
    expect(frame).toContain('err');
  });

  it('should render tool count', () => {
    const { lastFrame } = render(
      <StageHealthBar
        stageHealth={makeHealth()}
        bottlenecks={[]}
        toolCount={64000}
        agentCount={0}
        skillCount={0}
        width={120}
      />,
    );
    expect(lastFrame()).toContain('64k');
  });

  it('should render bottlenecks', () => {
    const { lastFrame } = render(
      <StageHealthBar
        stageHealth={makeHealth()}
        bottlenecks={['tests failing(3)', 'lint errors']}
        toolCount={0}
        agentCount={0}
        skillCount={0}
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
        toolCount={50000}
        agentCount={0}
        skillCount={0}
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
      <StageHealthBar
        stageHealth={empty}
        bottlenecks={[]}
        toolCount={0}
        agentCount={0}
        skillCount={0}
        width={120}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('PLAN:');
    expect(frame).toContain('idle');
  });

  it('should render double border', () => {
    const { lastFrame } = render(
      <StageHealthBar
        stageHealth={makeHealth()}
        bottlenecks={[]}
        toolCount={0}
        agentCount={0}
        skillCount={0}
        width={120}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('╔');
    expect(frame).toContain('╝');
  });

  it('shows agent, skill, and tool counts on right side', () => {
    const { lastFrame } = render(
      <StageHealthBar
        stageHealth={makeHealth()}
        bottlenecks={[]}
        toolCount={5}
        agentCount={3}
        skillCount={2}
        width={120}
      />,
    );
    const out = lastFrame() ?? '';
    expect(out).toContain('🤖 3');
    expect(out).toContain('⚙ 2');
    expect(out).toContain('🔧 5');
  });

  it('formats counts >= 1000 as Nk', () => {
    const { lastFrame } = render(
      <StageHealthBar
        stageHealth={makeHealth()}
        bottlenecks={[]}
        toolCount={1500}
        agentCount={2000}
        skillCount={0}
        width={120}
      />,
    );
    const out = lastFrame() ?? '';
    expect(out).toContain('🤖 2k');
    expect(out).toContain('🔧 2k');
    expect(out).toContain('⚙ 0');
  });

  it('renders sparkline and throughput when activityHistory is provided', () => {
    const samples: ActivitySample[] = [
      { timestamp: 1000, toolCalls: 2 },
      { timestamp: 61000, toolCalls: 5 },
      { timestamp: 121000, toolCalls: 3 },
    ];
    const { lastFrame } = render(
      <StageHealthBar
        stageHealth={makeHealth()}
        bottlenecks={[]}
        toolCount={0}
        agentCount={0}
        skillCount={0}
        width={120}
        activityHistory={samples}
      />,
    );
    const out = lastFrame() ?? '';
    // sparkline block chars should be present
    expect(out).toMatch(/[▁▂▃▄▅▆▇█]/);
    // throughput label
    expect(out).toContain('/min');
  });

  it('does not render sparkline when activityHistory is undefined', () => {
    const { lastFrame } = render(
      <StageHealthBar
        stageHealth={makeHealth()}
        bottlenecks={[]}
        toolCount={0}
        agentCount={0}
        skillCount={0}
        width={120}
      />,
    );
    const out = lastFrame() ?? '';
    expect(out).not.toMatch(/[▁▂▃▄▅▆▇█]/);
    expect(out).not.toContain('/min');
  });

  it('does not render sparkline when activityHistory is empty', () => {
    const { lastFrame } = render(
      <StageHealthBar
        stageHealth={makeHealth()}
        bottlenecks={[]}
        toolCount={0}
        agentCount={0}
        skillCount={0}
        width={120}
        activityHistory={[]}
      />,
    );
    const out = lastFrame() ?? '';
    expect(out).not.toContain('/min');
  });
});
