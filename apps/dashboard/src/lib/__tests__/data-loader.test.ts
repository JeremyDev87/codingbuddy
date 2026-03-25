import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadSessions,
  loadCostEntries,
  loadAgentActivity,
  loadSkillUsage,
  loadPREntries,
  sessionsFromRows,
  aggregateCostEntries,
  aggregateAgentActivity,
  aggregateSkillUsage,
} from '../data-loader';
import type { Session } from '../types';

describe('data-loader', () => {
  describe('sessionsFromRows', () => {
    it('converts raw DB rows to Session objects', () => {
      const rows = [
        {
          session_id: 'sess-1',
          started_at: 1711000000,
          ended_at: 1711003600,
          project: 'my-project',
          model: 'claude-opus-4-20250514',
          tool_call_count: 25,
          error_count: 2,
          outcome: 'success',
        },
      ];

      const result = sessionsFromRows(rows);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        sessionId: 'sess-1',
        startedAt: 1711000000,
        endedAt: 1711003600,
        project: 'my-project',
        model: 'claude-opus-4-20250514',
        toolCallCount: 25,
        errorCount: 2,
        outcome: 'success',
      });
    });

    it('handles null ended_at', () => {
      const rows = [
        {
          session_id: 'sess-2',
          started_at: 1711000000,
          ended_at: null,
          project: null,
          model: null,
          tool_call_count: 0,
          error_count: 0,
          outcome: null,
        },
      ];

      const result = sessionsFromRows(rows);
      expect(result[0].endedAt).toBeNull();
      expect(result[0].project).toBeNull();
    });

    it('returns empty array for empty input', () => {
      expect(sessionsFromRows([])).toEqual([]);
    });
  });

  describe('aggregateCostEntries', () => {
    it('groups sessions by date and calculates cost', () => {
      const sessions: Session[] = [
        {
          sessionId: 's1',
          startedAt: 1711929600, // 2024-04-01 00:00 UTC
          endedAt: 1711933200,
          project: 'proj',
          model: 'opus',
          toolCallCount: 50,
          errorCount: 0,
          outcome: 'success',
        },
        {
          sessionId: 's2',
          startedAt: 1711929600 + 3600,
          endedAt: 1711929600 + 7200,
          project: 'proj',
          model: 'opus',
          toolCallCount: 30,
          errorCount: 1,
          outcome: 'success',
        },
      ];

      const result = aggregateCostEntries(sessions);

      expect(result).toHaveLength(1);
      expect(result[0].sessions).toBe(2);
      expect(result[0].toolCalls).toBe(80);
      expect(result[0].cost).toBeGreaterThan(0);
    });

    it('returns empty array for no sessions', () => {
      expect(aggregateCostEntries([])).toEqual([]);
    });
  });

  describe('aggregateAgentActivity', () => {
    it('counts tool calls by agent prefix', () => {
      const toolCalls = [
        { sessionId: 's1', timestamp: 0, toolName: 'Agent(software-engineer)', inputSummary: null, success: true },
        { sessionId: 's1', timestamp: 0, toolName: 'Agent(software-engineer)', inputSummary: null, success: true },
        { sessionId: 's1', timestamp: 0, toolName: 'Agent(test-engineer)', inputSummary: null, success: false },
        { sessionId: 's1', timestamp: 0, toolName: 'Bash', inputSummary: null, success: true },
      ];

      const result = aggregateAgentActivity(toolCalls);

      expect(result).toHaveLength(2);
      const se = result.find((a) => a.agent === 'software-engineer');
      expect(se?.count).toBe(2);
      expect(se?.successRate).toBe(1);

      const te = result.find((a) => a.agent === 'test-engineer');
      expect(te?.count).toBe(1);
      expect(te?.successRate).toBe(0);
    });

    it('returns empty array for no agent calls', () => {
      const toolCalls = [
        { sessionId: 's1', timestamp: 0, toolName: 'Bash', inputSummary: null, success: true },
      ];
      expect(aggregateAgentActivity(toolCalls)).toEqual([]);
    });
  });

  describe('aggregateSkillUsage', () => {
    it('counts skill invocations from tool calls', () => {
      const toolCalls = [
        { sessionId: 's1', timestamp: 0, toolName: 'Skill(commit)', inputSummary: null, success: true },
        { sessionId: 's1', timestamp: 0, toolName: 'Skill(commit)', inputSummary: null, success: true },
        { sessionId: 's1', timestamp: 0, toolName: 'Skill(ship)', inputSummary: null, success: true },
        { sessionId: 's1', timestamp: 0, toolName: 'mcp__codingbuddy__parse_mode', inputSummary: null, success: true },
        { sessionId: 's1', timestamp: 0, toolName: 'Bash', inputSummary: null, success: true },
      ];

      const result = aggregateSkillUsage(toolCalls);

      expect(result).toHaveLength(3);
      const commit = result.find((s) => s.skill === 'commit');
      expect(commit?.count).toBe(2);

      const parseMode = result.find((s) => s.skill === 'parse_mode');
      expect(parseMode?.count).toBe(1);
    });

    it('returns empty array when no skills used', () => {
      const toolCalls = [
        { sessionId: 's1', timestamp: 0, toolName: 'Bash', inputSummary: null, success: true },
      ];
      expect(aggregateSkillUsage(toolCalls)).toEqual([]);
    });
  });

  describe('loadSessions', () => {
    it('returns mock data when DB is unavailable', async () => {
      const result = await loadSessions('/nonexistent/path.db');
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('sessionId');
      expect(result[0]).toHaveProperty('startedAt');
    });
  });

  describe('loadCostEntries', () => {
    it('returns mock data when DB is unavailable', async () => {
      const result = await loadCostEntries('/nonexistent/path.db');
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('cost');
    });
  });

  describe('loadAgentActivity', () => {
    it('returns mock data when DB is unavailable', async () => {
      const result = await loadAgentActivity('/nonexistent/path.db');
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('agent');
      expect(result[0]).toHaveProperty('count');
    });
  });

  describe('loadSkillUsage', () => {
    it('returns mock data when DB is unavailable', async () => {
      const result = await loadSkillUsage('/nonexistent/path.db');
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('skill');
      expect(result[0]).toHaveProperty('count');
    });
  });

  describe('loadPREntries', () => {
    it('returns mock data when parsing fails', async () => {
      const result = await loadPREntries('/nonexistent/dir');
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('created');
      expect(result[0]).toHaveProperty('merged');
    });
  });
});
