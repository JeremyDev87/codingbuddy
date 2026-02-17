import { describe, it, expect } from 'vitest';
import { extractEventsFromResponse } from './response-event-extractor';
import { TUI_EVENTS } from './types';

/** Helper to build a valid MCP tool response */
function makeResponse(json: Record<string, unknown>) {
  return { content: [{ type: 'text', text: JSON.stringify(json) }] };
}

describe('extractEventsFromResponse', () => {
  describe('parse_mode → mode:changed', () => {
    it('should extract mode:changed event from parse_mode response', () => {
      const result = extractEventsFromResponse(
        'parse_mode',
        makeResponse({ mode: 'PLAN', originalPrompt: 'PLAN something' }),
      );
      expect(result).toContainEqual({
        event: TUI_EVENTS.MODE_CHANGED,
        payload: { from: null, to: 'PLAN' },
      });
    });

    it('should extract ACT mode', () => {
      const result = extractEventsFromResponse('parse_mode', makeResponse({ mode: 'ACT' }));
      expect(result).toContainEqual({
        event: TUI_EVENTS.MODE_CHANGED,
        payload: { from: null, to: 'ACT' },
      });
    });

    it('should not emit mode:changed if mode is missing', () => {
      const result = extractEventsFromResponse(
        'parse_mode',
        makeResponse({ originalPrompt: 'hello' }),
      );
      const modeEvents = result.filter(e => e.event === TUI_EVENTS.MODE_CHANGED);
      expect(modeEvents).toHaveLength(0);
    });

    it('should not emit mode:changed if mode is not a string', () => {
      const result = extractEventsFromResponse('parse_mode', makeResponse({ mode: 123 }));
      const modeEvents = result.filter(e => e.event === TUI_EVENTS.MODE_CHANGED);
      expect(modeEvents).toHaveLength(0);
    });

    it('should not emit mode:changed for invalid mode values', () => {
      const result = extractEventsFromResponse(
        'parse_mode',
        makeResponse({ mode: 'INVALID_MODE' }),
      );
      const modeEvents = result.filter(e => e.event === TUI_EVENTS.MODE_CHANGED);
      expect(modeEvents).toHaveLength(0);
    });
  });

  describe('parse_mode → skill:recommended', () => {
    it('should extract skill:recommended events from included_skills', () => {
      const result = extractEventsFromResponse(
        'parse_mode',
        makeResponse({
          mode: 'PLAN',
          included_skills: [
            { name: 'writing-plans', reason: 'matched pattern' },
            { name: 'systematic-debugging', reason: 'bug fix detected' },
          ],
        }),
      );
      const skillEvents = result.filter(e => e.event === TUI_EVENTS.SKILL_RECOMMENDED);
      expect(skillEvents).toHaveLength(2);
      expect(skillEvents[0].payload).toEqual({
        skillName: 'writing-plans',
        reason: 'matched pattern',
      });
      expect(skillEvents[1].payload).toEqual({
        skillName: 'systematic-debugging',
        reason: 'bug fix detected',
      });
    });

    it('should handle skills with missing reason', () => {
      const result = extractEventsFromResponse(
        'parse_mode',
        makeResponse({
          mode: 'PLAN',
          included_skills: [{ name: 'tdd' }],
        }),
      );
      const skillEvents = result.filter(e => e.event === TUI_EVENTS.SKILL_RECOMMENDED);
      expect(skillEvents).toHaveLength(1);
      expect(skillEvents[0].payload).toEqual({
        skillName: 'tdd',
        reason: '',
      });
    });

    it('should skip skills without name', () => {
      const result = extractEventsFromResponse(
        'parse_mode',
        makeResponse({
          mode: 'PLAN',
          included_skills: [{ reason: 'no name' }, null, { name: 'valid' }],
        }),
      );
      const skillEvents = result.filter(e => e.event === TUI_EVENTS.SKILL_RECOMMENDED);
      expect(skillEvents).toHaveLength(1);
      expect(skillEvents[0].payload).toEqual({
        skillName: 'valid',
        reason: '',
      });
    });

    it('should not emit skills if included_skills is missing', () => {
      const result = extractEventsFromResponse('parse_mode', makeResponse({ mode: 'PLAN' }));
      const skillEvents = result.filter(e => e.event === TUI_EVENTS.SKILL_RECOMMENDED);
      expect(skillEvents).toHaveLength(0);
    });

    it('should emit both mode:changed and skill:recommended together', () => {
      const result = extractEventsFromResponse(
        'parse_mode',
        makeResponse({
          mode: 'EVAL',
          included_skills: [{ name: 'debugging', reason: 'error' }],
        }),
      );
      expect(result).toHaveLength(2);
      expect(result[0].event).toBe(TUI_EVENTS.MODE_CHANGED);
      expect(result[1].event).toBe(TUI_EVENTS.SKILL_RECOMMENDED);
    });
  });

  describe('prepare_parallel_agents → parallel:started', () => {
    it('should extract parallel:started from prepare_parallel_agents response', () => {
      const result = extractEventsFromResponse(
        'prepare_parallel_agents',
        makeResponse({
          agents: [{ agentName: 'security-specialist' }, { agentName: 'performance-specialist' }],
          mode: 'EVAL',
        }),
      );
      expect(result).toContainEqual({
        event: TUI_EVENTS.PARALLEL_STARTED,
        payload: {
          specialists: ['security-specialist', 'performance-specialist'],
          mode: 'EVAL',
        },
      });
    });

    it('should use agent name field if agentName is missing', () => {
      const result = extractEventsFromResponse(
        'prepare_parallel_agents',
        makeResponse({
          agents: [{ name: 'test-agent' }],
          mode: 'PLAN',
        }),
      );
      expect(result).toContainEqual({
        event: TUI_EVENTS.PARALLEL_STARTED,
        payload: {
          specialists: ['test-agent'],
          mode: 'PLAN',
        },
      });
    });

    it('should default mode to PLAN if missing', () => {
      const result = extractEventsFromResponse(
        'prepare_parallel_agents',
        makeResponse({
          agents: [{ agentName: 'arch' }],
        }),
      );
      expect(result[0].payload).toEqual({
        specialists: ['arch'],
        mode: 'PLAN',
      });
    });

    it('should return empty if agents array is missing', () => {
      const result = extractEventsFromResponse(
        'prepare_parallel_agents',
        makeResponse({ mode: 'EVAL' }),
      );
      expect(result).toHaveLength(0);
    });

    it('should return empty if agents array is empty', () => {
      const result = extractEventsFromResponse(
        'prepare_parallel_agents',
        makeResponse({ agents: [], mode: 'EVAL' }),
      );
      expect(result).toHaveLength(0);
    });

    it('should filter out agents without name', () => {
      const result = extractEventsFromResponse(
        'prepare_parallel_agents',
        makeResponse({
          agents: [{ agentName: 'valid' }, { other: 'no-name' }, {}],
          mode: 'ACT',
        }),
      );
      expect(result[0].payload).toEqual({
        specialists: ['valid'],
        mode: 'ACT',
      });
    });
  });

  describe('other tools', () => {
    it('should return empty array for non-semantic tools', () => {
      expect(extractEventsFromResponse('search_rules', makeResponse({ results: [] }))).toEqual([]);
    });

    it('should return empty array for get_agent_system_prompt', () => {
      expect(
        extractEventsFromResponse(
          'get_agent_system_prompt',
          makeResponse({ systemPrompt: 'test' }),
        ),
      ).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should return empty array for null/undefined result', () => {
      expect(extractEventsFromResponse('parse_mode', null)).toEqual([]);
      expect(extractEventsFromResponse('parse_mode', undefined)).toEqual([]);
    });

    it('should return empty array for invalid JSON response', () => {
      expect(
        extractEventsFromResponse('parse_mode', {
          content: [{ type: 'text', text: 'not json' }],
        }),
      ).toEqual([]);
    });

    it('should return empty array for empty content', () => {
      expect(extractEventsFromResponse('parse_mode', { content: [] })).toEqual([]);
    });
  });
});
