import { describe, it, expect } from 'vitest';
import {
  shouldRenderTree,
  TREE_CHARS,
  buildVerticalConnector,
  buildBranchLine,
  buildDropLines,
} from './agent-tree.pure';
import { createDefaultAgentState } from '../types';

describe('tui/components/agent-tree.pure', () => {
  describe('shouldRenderTree', () => {
    it('should return false when primaryAgent is null', () => {
      expect(shouldRenderTree(null)).toBe(false);
    });

    it('should return true when primaryAgent is provided', () => {
      const agent = createDefaultAgentState({
        id: '1',
        name: 'solution-architect',
        role: 'primary',
      });
      expect(shouldRenderTree(agent)).toBe(true);
    });
  });

  describe('TREE_CHARS', () => {
    it('should export box drawing character constants', () => {
      expect(TREE_CHARS.VERTICAL).toBe('│');
      expect(TREE_CHARS.HORIZONTAL).toBe('─');
      expect(TREE_CHARS.TOP_LEFT).toBe('┌');
      expect(TREE_CHARS.TOP_RIGHT).toBe('┐');
      expect(TREE_CHARS.TOP_TEE).toBe('┬');
    });
  });

  describe('buildVerticalConnector', () => {
    it('should return a single vertical bar character', () => {
      expect(buildVerticalConnector()).toBe('│');
    });
  });

  describe('buildBranchLine', () => {
    const cardWidth = 11;
    const gap = 1;

    it('should return vertical bar for 0 agents', () => {
      expect(buildBranchLine(0, cardWidth, gap)).toBe('│');
    });

    it('should return vertical bar for 1 agent', () => {
      expect(buildBranchLine(1, cardWidth, gap)).toBe('│');
    });

    it('should build branch for 2 agents', () => {
      // Total width = 2*11 + 1*1 = 23
      // Card centers at: 5, 17
      // ┌ at 5, ┐ at 17, ─ between
      const result = buildBranchLine(2, cardWidth, gap);
      expect(result.length).toBe(23);
      expect(result[5]).toBe('┌');
      expect(result[17]).toBe('┐');
      for (let i = 6; i < 17; i++) {
        expect(result[i]).toBe('─');
      }
    });

    it('should build branch for 3 agents', () => {
      // Total width = 3*11 + 2*1 = 35
      // Card centers at: 5, 17, 29
      const result = buildBranchLine(3, cardWidth, gap);
      expect(result.length).toBe(35);
      expect(result[5]).toBe('┌');
      expect(result[17]).toBe('┬');
      expect(result[29]).toBe('┐');
    });

    it('should have spaces outside the branch span', () => {
      const result = buildBranchLine(2, cardWidth, gap);
      for (let i = 0; i < 5; i++) {
        expect(result[i]).toBe(' ');
      }
      for (let i = 18; i < 23; i++) {
        expect(result[i]).toBe(' ');
      }
    });
  });

  describe('buildDropLines', () => {
    const cardWidth = 11;
    const gap = 1;

    it('should return vertical bar for 0 agents', () => {
      expect(buildDropLines(0, cardWidth, gap)).toBe('│');
    });

    it('should return vertical bar for 1 agent', () => {
      expect(buildDropLines(1, cardWidth, gap)).toBe('│');
    });

    it('should place vertical bars at each card center for 2 agents', () => {
      const result = buildDropLines(2, cardWidth, gap);
      expect(result.length).toBe(23);
      expect(result[5]).toBe('│');
      expect(result[17]).toBe('│');
      expect(result[0]).toBe(' ');
      expect(result[10]).toBe(' ');
    });

    it('should place vertical bars at each card center for 3 agents', () => {
      const result = buildDropLines(3, cardWidth, gap);
      expect(result.length).toBe(35);
      expect(result[5]).toBe('│');
      expect(result[17]).toBe('│');
      expect(result[29]).toBe('│');
    });
  });
});
