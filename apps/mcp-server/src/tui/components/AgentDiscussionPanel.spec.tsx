import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { AgentDiscussionPanel } from './AgentDiscussionPanel';
import { createAgentOpinion, createCrossReview } from '../../collaboration/types';
import type { DiscussionRound } from '../../collaboration/types';

function makeRound(): DiscussionRound {
  return {
    roundNumber: 1,
    opinions: [
      createAgentOpinion({
        agentId: 'arch-1',
        agentName: 'architecture',
        stance: 'approve',
        reasoning: 'Clean design',
      }),
      createAgentOpinion({
        agentId: 'sec-1',
        agentName: 'security',
        stance: 'concern',
        reasoning: 'Auth needs review',
      }),
      createAgentOpinion({
        agentId: 'test-1',
        agentName: 'test-strategy',
        stance: 'approve',
        reasoning: 'Good testability',
      }),
    ],
    crossReviews: [
      createCrossReview({
        fromAgentId: 'arch-1',
        toAgentId: 'sec-1',
        stance: 'approve',
        comment: 'Middleware pattern solves it',
      }),
    ],
  };
}

describe('tui/components/AgentDiscussionPanel', () => {
  it('should render discussion with agent opinions', () => {
    const { lastFrame } = render(
      <AgentDiscussionPanel rounds={[makeRound()]} width={80} height={20} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Agent Discussion');
    expect(frame).toContain('architecture');
    expect(frame).toContain('security');
    expect(frame).toContain('test-strategy');
  });

  it('should render consensus line', () => {
    const { lastFrame } = render(
      <AgentDiscussionPanel rounds={[makeRound()]} width={80} height={20} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Consensus');
    expect(frame).toContain('2/3');
  });

  it('should render cross-review with arrow', () => {
    const { lastFrame } = render(
      <AgentDiscussionPanel rounds={[makeRound()]} width={80} height={20} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('→');
    expect(frame).toContain('agrees');
  });

  it('should render empty state when no rounds', () => {
    const { lastFrame } = render(
      <AgentDiscussionPanel rounds={[]} width={80} height={10} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('No agent discussion yet');
  });

  it('should truncate lines to fit height', () => {
    const manyOpinions = Array.from({ length: 20 }, (_, i) =>
      createAgentOpinion({
        agentId: `a${i}`,
        agentName: `agent-${i}`,
        stance: 'approve',
        reasoning: `Reason ${i}`,
      }),
    );

    const round: DiscussionRound = {
      roundNumber: 1,
      opinions: manyOpinions,
      crossReviews: [],
    };

    const { lastFrame } = render(
      <AgentDiscussionPanel rounds={[round]} width={80} height={8} />,
    );
    const frame = lastFrame() ?? '';
    // Should not contain all 20 agents due to height constraint
    const lines = frame.split('\n');
    // Border + content should fit within height
    expect(lines.length).toBeLessThanOrEqual(10); // some tolerance for border rendering
  });
});
