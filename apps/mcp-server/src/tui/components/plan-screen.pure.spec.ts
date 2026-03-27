import { describe, it, expect } from 'vitest';
import {
  renderAgentSummonList,
  renderConsensusSummary,
  renderPlanScreen,
} from './plan-screen.pure';
import type { DashboardNode } from '../dashboard-types';
import { createAgentOpinion, createDiscussionRound } from '../../collaboration/types';

function makeAgents(...entries: [string, Partial<DashboardNode>][]): Map<string, DashboardNode> {
  const map = new Map<string, DashboardNode>();
  for (const [id, partial] of entries) {
    map.set(id, {
      id,
      name: partial.name ?? id,
      stage: partial.stage ?? 'PLAN',
      status: partial.status ?? 'idle',
      isPrimary: partial.isPrimary ?? false,
      progress: partial.progress ?? 0,
      isParallel: partial.isParallel ?? false,
    });
  }
  return map;
}

describe('plan-screen.pure', () => {
  describe('renderAgentSummonList', () => {
    it('should show empty message when no agents', () => {
      const lines = renderAgentSummonList(new Map(), 80);
      expect(lines).toHaveLength(2);
      expect(lines[0].type).toBe('header');
      expect(lines[1].text).toContain('no agents summoned');
    });

    it('should render agents with status icons', () => {
      const agents = makeAgents(
        ['a1', { name: 'architect', status: 'running', isPrimary: true }],
        ['a2', { name: 'security', status: 'idle' }],
      );
      const lines = renderAgentSummonList(agents, 80);
      expect(lines.length).toBeGreaterThanOrEqual(3);
      expect(lines[1].text).toContain('architect');
      expect(lines[1].text).toContain('★');
      expect(lines[2].text).toContain('security');
    });

    it('should truncate long lines to width', () => {
      const agents = makeAgents(['a1', { name: 'a-very-long-agent-name-that-exceeds-width' }]);
      const lines = renderAgentSummonList(agents, 30);
      expect(lines[1].text.length).toBeLessThanOrEqual(30);
    });
  });

  describe('renderConsensusSummary', () => {
    it('should show empty message when no rounds', () => {
      const lines = renderConsensusSummary([]);
      expect(lines[0].text).toContain('no discussion yet');
    });

    it('should render consensus from last round', () => {
      const round = createDiscussionRound(1, [
        createAgentOpinion({ agentId: 'a1', agentName: 'A1', stance: 'approve', reasoning: 'ok' }),
        createAgentOpinion({ agentId: 'a2', agentName: 'A2', stance: 'concern', reasoning: 'hmm' }),
      ]);
      const lines = renderConsensusSummary([round]);
      expect(lines[0].type).toBe('header');
      expect(lines[0].text).toContain('Round 1');
      const consensusText = lines.map(l => l.text).join(' ');
      expect(consensusText).toContain('Consensus reached');
    });

    it('should show not reached when rejections exist', () => {
      const round = createDiscussionRound(1, [
        createAgentOpinion({ agentId: 'a1', agentName: 'A1', stance: 'reject', reasoning: 'no' }),
      ]);
      const lines = renderConsensusSummary([round]);
      const text = lines.map(l => l.text).join(' ');
      expect(text).toContain('not reached');
    });
  });

  describe('renderPlanScreen', () => {
    it('should combine agent list and consensus', () => {
      const agents = makeAgents(['a1', { name: 'architect', status: 'running' }]);
      const lines = renderPlanScreen(agents, [], 80);
      expect(lines.some(l => l.type === 'header')).toBe(true);
      expect(lines.some(l => l.type === 'agent')).toBe(true);
    });
  });
});
