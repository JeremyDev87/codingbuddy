import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { AgentDiscussionPanel } from './AgentDiscussionPanel';
import { createAgentOpinion, createCrossReview } from '../../collaboration/types';
import type { DiscussionRound } from '../../collaboration/types';
import {
  assignAgentColors,
  detectConflicts,
  renderCollaborationBlocks,
  renderStanceHistory,
  AGENT_PALETTE,
} from './agent-discussion-panel.pure';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

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

function makeConflictRound(): DiscussionRound {
  return {
    roundNumber: 1,
    opinions: [
      createAgentOpinion({
        agentId: 'arch-1',
        agentName: 'architecture',
        stance: 'approve',
        reasoning: 'Good structure',
      }),
      createAgentOpinion({
        agentId: 'sec-1',
        agentName: 'security',
        stance: 'reject',
        reasoning: 'Critical vulnerability found',
      }),
    ],
    crossReviews: [],
  };
}

// ---------------------------------------------------------------------------
// Pure function tests
// ---------------------------------------------------------------------------

describe('pure/assignAgentColors', () => {
  it('should assign distinct colors to different agents', () => {
    const rounds = [makeRound()];
    const colors = assignAgentColors(rounds);

    expect(colors['arch-1']).toBe(AGENT_PALETTE[0]);
    expect(colors['sec-1']).toBe(AGENT_PALETTE[1]);
    expect(colors['test-1']).toBe(AGENT_PALETTE[2]);
    // All different
    const values = Object.values(colors);
    expect(new Set(values).size).toBe(values.length);
  });

  it('should wrap palette when more agents than colors', () => {
    const opinions = Array.from({ length: AGENT_PALETTE.length + 2 }, (_, i) =>
      createAgentOpinion({
        agentId: `a${i}`,
        agentName: `agent-${i}`,
        stance: 'approve',
        reasoning: `r${i}`,
      }),
    );
    const rounds: DiscussionRound[] = [{ roundNumber: 1, opinions, crossReviews: [] }];
    const colors = assignAgentColors(rounds);
    // The (PALETTE.length + 1)th agent wraps to palette[0]
    expect(colors[`a${AGENT_PALETTE.length}`]).toBe(AGENT_PALETTE[0]);
  });
});

describe('pure/detectConflicts', () => {
  it('should return empty set when all stances agree', () => {
    const opinions = [
      createAgentOpinion({ agentId: 'a', agentName: 'a', stance: 'approve', reasoning: 'ok' }),
      createAgentOpinion({ agentId: 'b', agentName: 'b', stance: 'approve', reasoning: 'ok' }),
    ];
    expect(detectConflicts(opinions).size).toBe(0);
  });

  it('should return empty set when only concern and approve', () => {
    const opinions = [
      createAgentOpinion({ agentId: 'a', agentName: 'a', stance: 'approve', reasoning: 'ok' }),
      createAgentOpinion({ agentId: 'b', agentName: 'b', stance: 'concern', reasoning: 'hmm' }),
    ];
    expect(detectConflicts(opinions).size).toBe(0);
  });

  it('should detect conflict when approve and reject coexist', () => {
    const opinions = makeConflictRound().opinions;
    const conflicts = detectConflicts(opinions);
    expect(conflicts.size).toBe(1);
    expect(conflicts.has('sec-1')).toBe(true);
    expect(conflicts.has('arch-1')).toBe(false);
  });
});

describe('pure/renderStanceHistory', () => {
  it('should return empty for single stance', () => {
    expect(renderStanceHistory(['approve'])).toBe('');
  });

  it('should join stances with arrows', () => {
    const result = renderStanceHistory(['concern', 'approve']);
    expect(result).toContain('→');
    expect(result).toContain('⚠️');
    expect(result).toContain('✅');
  });
});

describe('pure/renderCollaborationBlocks', () => {
  it('should return empty block for no rounds', () => {
    const blocks = renderCollaborationBlocks([], 80);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('empty');
  });

  it('should produce header, bubbles, cross-review, and consensus-bar', () => {
    const blocks = renderCollaborationBlocks([makeRound()], 80);
    const types = blocks.map(b => b.type);

    expect(types[0]).toBe('header');
    expect(types.filter(t => t === 'agent-bubble')).toHaveLength(3);
    expect(types.filter(t => t === 'cross-review-block')).toHaveLength(1);
    expect(types.filter(t => t === 'consensus-bar')).toHaveLength(1);
  });

  it('should compute correct consensus percentage', () => {
    const blocks = renderCollaborationBlocks([makeRound()], 80);
    const bar = blocks.find(b => b.type === 'consensus-bar');
    expect(bar).toBeDefined();
    if (bar?.type === 'consensus-bar') {
      expect(bar.percentage).toBe(67); // 2/3 approve
      expect(bar.approveCount).toBe(2);
      expect(bar.concernCount).toBe(1);
      expect(bar.rejectCount).toBe(0);
    }
  });

  it('should mark conflicting agents in bubbles', () => {
    const blocks = renderCollaborationBlocks([makeConflictRound()], 80);
    const bubbles = blocks.filter(b => b.type === 'agent-bubble');

    const archBubble = bubbles.find(
      b => b.type === 'agent-bubble' && b.agentName === 'architecture',
    );
    const secBubble = bubbles.find(b => b.type === 'agent-bubble' && b.agentName === 'security');

    expect(archBubble?.type === 'agent-bubble' && archBubble.isConflict).toBe(false);
    expect(secBubble?.type === 'agent-bubble' && secBubble.isConflict).toBe(true);
  });

  it('should assign distinct colors to agent bubbles', () => {
    const blocks = renderCollaborationBlocks([makeRound()], 80);
    const bubbles = blocks.filter(b => b.type === 'agent-bubble');
    const colors = bubbles.map(b => (b.type === 'agent-bubble' ? b.color : ''));
    expect(new Set(colors).size).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Component rendering tests
// ---------------------------------------------------------------------------

describe('tui/components/AgentDiscussionPanel', () => {
  it('should render speech bubbles with agent names', () => {
    const { lastFrame } = render(
      <AgentDiscussionPanel rounds={[makeRound()]} width={80} height={30} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('architecture');
    expect(frame).toContain('security');
    expect(frame).toContain('test-strategy');
  });

  it('should render agent reasoning inside bubbles', () => {
    const { lastFrame } = render(
      <AgentDiscussionPanel rounds={[makeRound()]} width={80} height={30} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Clean design');
    expect(frame).toContain('Auth needs review');
  });

  it('should render consensus progress bar with percentage', () => {
    const { lastFrame } = render(
      <AgentDiscussionPanel rounds={[makeRound()]} width={80} height={30} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('67%');
    expect(frame).toContain('█');
  });

  it('should render stance count summary', () => {
    const { lastFrame } = render(
      <AgentDiscussionPanel rounds={[makeRound()]} width={80} height={30} />,
    );
    const frame = lastFrame() ?? '';
    // 2 approve, 1 concern, 0 reject
    expect(frame).toContain('2');
    expect(frame).toContain('1');
  });

  it('should render cross-review with verb', () => {
    const { lastFrame } = render(
      <AgentDiscussionPanel rounds={[makeRound()]} width={80} height={30} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('→');
    expect(frame).toContain('agrees');
  });

  it('should highlight conflicts with lightning marker', () => {
    const { lastFrame } = render(
      <AgentDiscussionPanel rounds={[makeConflictRound()]} width={80} height={30} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('⚡');
  });

  it('should not show conflict marker when no disagree', () => {
    const { lastFrame } = render(
      <AgentDiscussionPanel rounds={[makeRound()]} width={80} height={30} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('⚡');
  });

  it('should render empty state when no rounds', () => {
    const { lastFrame } = render(<AgentDiscussionPanel rounds={[]} width={80} height={10} />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('No agent discussion yet');
  });

  it('should render round header', () => {
    const { lastFrame } = render(
      <AgentDiscussionPanel rounds={[makeRound()]} width={80} height={30} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Agent Discussion');
    expect(frame).toContain('Round 1');
  });

  it('should truncate blocks to fit height', () => {
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

    const { lastFrame } = render(<AgentDiscussionPanel rounds={[round]} width={80} height={8} />);
    const frame = lastFrame() ?? '';
    const lines = frame.split('\n');
    // Height constraint should limit rendered content
    expect(lines.length).toBeLessThanOrEqual(10);
  });
});
