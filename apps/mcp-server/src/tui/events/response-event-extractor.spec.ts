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
      expect(result[0].event).toBe(TUI_EVENTS.MODE_CHANGED);
      expect(result[1].event).toBe(TUI_EVENTS.SKILL_RECOMMENDED);
      // TASK_SYNCED is also emitted for included_skills (initial checklist)
      expect(result.some(e => e.event === TUI_EVENTS.TASK_SYNCED)).toBe(true);
    });
  });

  describe('parse_mode → agent:activated', () => {
    it('should extract agent:activated from delegates_to in parse_mode response', () => {
      const result = extractEventsFromResponse(
        'parse_mode',
        makeResponse({
          mode: 'PLAN',
          delegates_to: 'solution-architect',
          included_skills: [],
        }),
      );
      const agentEvent = result.find(e => e.event === TUI_EVENTS.AGENT_ACTIVATED);
      expect(agentEvent).toBeDefined();
      expect(agentEvent!.payload).toEqual({
        agentId: 'primary:solution-architect',
        name: 'solution-architect',
        role: 'primary',
        isPrimary: true,
      });
    });

    it('should not emit agent:activated if delegates_to is missing', () => {
      const result = extractEventsFromResponse('parse_mode', makeResponse({ mode: 'PLAN' }));
      const agentEvents = result.filter(e => e.event === TUI_EVENTS.AGENT_ACTIVATED);
      expect(agentEvents).toHaveLength(0);
    });

    it('should not emit agent:activated if delegates_to is an empty string', () => {
      const result = extractEventsFromResponse(
        'parse_mode',
        makeResponse({ mode: 'PLAN', delegates_to: '' }),
      );
      const agentEvents = result.filter(e => e.event === TUI_EVENTS.AGENT_ACTIVATED);
      expect(agentEvents).toHaveLength(0);
    });

    it('should not emit agent:activated if delegates_to is not a string', () => {
      const result = extractEventsFromResponse(
        'parse_mode',
        makeResponse({ mode: 'PLAN', delegates_to: 123 }),
      );
      const agentEvents = result.filter(e => e.event === TUI_EVENTS.AGENT_ACTIVATED);
      expect(agentEvents).toHaveLength(0);
    });

    it('should emit mode:changed, skill:recommended, and agent:activated together', () => {
      const result = extractEventsFromResponse(
        'parse_mode',
        makeResponse({
          mode: 'PLAN',
          delegates_to: 'technical-planner',
          included_skills: [{ name: 'writing-plans', reason: 'matched' }],
        }),
      );
      expect(result[0].event).toBe(TUI_EVENTS.MODE_CHANGED);
      expect(result[1].event).toBe(TUI_EVENTS.SKILL_RECOMMENDED);
      // TASK_SYNCED follows immediately after skill:recommended (same included_skills pass)
      expect(result[2].event).toBe(TUI_EVENTS.TASK_SYNCED);
      expect(result[3].event).toBe(TUI_EVENTS.AGENT_ACTIVATED);
    });
  });

  describe('parse_mode → agent:relationship (recommended_act_agent)', () => {
    it('should extract AGENT_RELATIONSHIP from recommended_act_agent', () => {
      const events = extractEventsFromResponse(
        'parse_mode',
        makeResponse({
          mode: 'PLAN',
          delegates_to: 'technical-planner',
          recommended_act_agent: { agentName: 'frontend-developer', confidence: 0.9 },
        }),
      );
      const rel = events.find(e => e.event === TUI_EVENTS.AGENT_RELATIONSHIP);
      expect(rel).toBeDefined();
      expect(rel!.payload).toEqual({
        from: 'primary:technical-planner',
        to: 'recommended:frontend-developer',
        label: 'recommends',
        type: 'recommendation',
      });
    });

    it('should not extract AGENT_RELATIONSHIP without delegates_to', () => {
      const events = extractEventsFromResponse(
        'parse_mode',
        makeResponse({
          mode: 'PLAN',
          recommended_act_agent: { agentName: 'frontend-developer', confidence: 0.9 },
        }),
      );
      const rel = events.find(e => e.event === TUI_EVENTS.AGENT_RELATIONSHIP);
      expect(rel).toBeUndefined();
    });

    it('should not extract AGENT_RELATIONSHIP if agentName is not a string', () => {
      const events = extractEventsFromResponse(
        'parse_mode',
        makeResponse({
          mode: 'PLAN',
          delegates_to: 'technical-planner',
          recommended_act_agent: { agentName: 123 },
        }),
      );
      const rel = events.find(e => e.event === TUI_EVENTS.AGENT_RELATIONSHIP);
      expect(rel).toBeUndefined();
    });

    it('should not extract AGENT_RELATIONSHIP if recommended_act_agent is missing', () => {
      const events = extractEventsFromResponse(
        'parse_mode',
        makeResponse({
          mode: 'PLAN',
          delegates_to: 'technical-planner',
        }),
      );
      const rel = events.find(e => e.event === TUI_EVENTS.AGENT_RELATIONSHIP);
      expect(rel).toBeUndefined();
    });
  });

  describe('parse_mode → parallel:started (parallelAgentsRecommendation)', () => {
    it('should extract PARALLEL_STARTED from parallelAgentsRecommendation', () => {
      const events = extractEventsFromResponse(
        'parse_mode',
        makeResponse({
          mode: 'EVAL',
          delegates_to: 'evaluator',
          parallelAgentsRecommendation: {
            specialists: ['security-specialist', 'performance-specialist'],
          },
        }),
      );
      const ps = events.find(e => e.event === TUI_EVENTS.PARALLEL_STARTED);
      expect(ps).toBeDefined();
      expect(ps!.payload).toEqual({
        specialists: ['security-specialist', 'performance-specialist'],
        mode: 'EVAL',
      });
    });

    it('should default mode to PLAN if mode is missing in json', () => {
      const events = extractEventsFromResponse(
        'parse_mode',
        makeResponse({
          parallelAgentsRecommendation: {
            specialists: ['arch-specialist'],
          },
        }),
      );
      const ps = events.find(e => e.event === TUI_EVENTS.PARALLEL_STARTED);
      expect(ps).toBeDefined();
      expect(ps!.payload).toEqual({
        specialists: ['arch-specialist'],
        mode: 'PLAN',
      });
    });

    it('should filter out non-string specialists', () => {
      const events = extractEventsFromResponse(
        'parse_mode',
        makeResponse({
          mode: 'ACT',
          parallelAgentsRecommendation: {
            specialists: ['valid', 123, null, 'also-valid'],
          },
        }),
      );
      const ps = events.find(e => e.event === TUI_EVENTS.PARALLEL_STARTED);
      expect(ps).toBeDefined();
      expect(ps!.payload).toEqual({
        specialists: ['valid', 'also-valid'],
        mode: 'ACT',
      });
    });

    it('should not extract PARALLEL_STARTED if specialists is empty', () => {
      const events = extractEventsFromResponse(
        'parse_mode',
        makeResponse({
          mode: 'PLAN',
          parallelAgentsRecommendation: { specialists: [] },
        }),
      );
      const ps = events.find(e => e.event === TUI_EVENTS.PARALLEL_STARTED);
      expect(ps).toBeUndefined();
    });

    it('should not extract PARALLEL_STARTED if parallelAgentsRecommendation is missing', () => {
      const events = extractEventsFromResponse('parse_mode', makeResponse({ mode: 'PLAN' }));
      const ps = events.find(e => e.event === TUI_EVENTS.PARALLEL_STARTED);
      expect(ps).toBeUndefined();
    });
  });

  describe('parse_mode → objective:set', () => {
    it('should extract OBJECTIVE_SET from parse_mode with originalPrompt', () => {
      const events = extractEventsFromResponse(
        'parse_mode',
        makeResponse({
          mode: 'PLAN',
          originalPrompt: 'implement auth feature',
          delegates_to: 'technical-planner',
        }),
      );
      const objectiveEvent = events.find(e => e.event === TUI_EVENTS.OBJECTIVE_SET);
      expect(objectiveEvent).toBeDefined();
      expect(objectiveEvent!.payload).toEqual({ objective: 'implement auth feature' });
    });

    it('should not extract OBJECTIVE_SET when originalPrompt is missing', () => {
      const events = extractEventsFromResponse(
        'parse_mode',
        makeResponse({
          mode: 'PLAN',
          delegates_to: 'technical-planner',
        }),
      );
      const objectiveEvent = events.find(e => e.event === TUI_EVENTS.OBJECTIVE_SET);
      expect(objectiveEvent).toBeUndefined();
    });

    it('should not extract OBJECTIVE_SET when originalPrompt is empty string', () => {
      const events = extractEventsFromResponse(
        'parse_mode',
        makeResponse({
          mode: 'PLAN',
          originalPrompt: '   ',
          delegates_to: 'technical-planner',
        }),
      );
      const objectiveEvent = events.find(e => e.event === TUI_EVENTS.OBJECTIVE_SET);
      expect(objectiveEvent).toBeUndefined();
    });
  });

  describe('parse_mode → task:synced (initial checklist)', () => {
    it('should emit TASK_SYNCED with included_skills as initial checklist', () => {
      const events = extractEventsFromResponse(
        'parse_mode',
        makeResponse({
          mode: 'PLAN',
          delegates_to: 'solution-architect',
          included_skills: [{ name: 'tdd' }, { name: 'debugging' }],
        }),
      );
      const taskSynced = events.filter(e => e.event === TUI_EVENTS.TASK_SYNCED);
      expect(taskSynced).toHaveLength(1);
      expect(taskSynced[0].payload).toEqual({
        agentId: 'primary:solution-architect',
        tasks: [
          { id: 'skill-0', subject: 'Apply tdd', completed: false },
          { id: 'skill-1', subject: 'Apply debugging', completed: false },
        ],
      });
    });

    it('should not emit TASK_SYNCED when included_skills is empty', () => {
      const events = extractEventsFromResponse(
        'parse_mode',
        makeResponse({ mode: 'PLAN', included_skills: [] }),
      );
      expect(events.filter(e => e.event === TUI_EVENTS.TASK_SYNCED)).toHaveLength(0);
    });

    it('should not emit TASK_SYNCED when included_skills is missing', () => {
      const events = extractEventsFromResponse('parse_mode', makeResponse({ mode: 'PLAN' }));
      expect(events.filter(e => e.event === TUI_EVENTS.TASK_SYNCED)).toHaveLength(0);
    });

    it('should use UNKNOWN_AGENT_ID when delegates_to is missing', () => {
      const events = extractEventsFromResponse(
        'parse_mode',
        makeResponse({ included_skills: [{ name: 'tdd' }] }),
      );
      const taskSynced = events.find(e => e.event === TUI_EVENTS.TASK_SYNCED);
      expect(taskSynced?.payload.agentId).toBe('unknown-agent');
    });

    it('should skip skills without name field', () => {
      const events = extractEventsFromResponse(
        'parse_mode',
        makeResponse({
          delegates_to: 'planner',
          included_skills: [{ name: 'tdd' }, { description: 'no name' }, { name: 'debugging' }],
        }),
      );
      const taskSynced = events.find(e => e.event === TUI_EVENTS.TASK_SYNCED);
      expect(taskSynced?.payload.tasks).toHaveLength(2);
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

  describe('dispatch_agents → agent:relationship', () => {
    it('should extract delegation relationships from dispatch_agents response', () => {
      const result = extractEventsFromResponse(
        'dispatch_agents',
        makeResponse({
          primaryAgent: { name: 'solution-architect' },
          specialists: [{ name: 'security-specialist' }, { agentName: 'performance-specialist' }],
        }),
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        event: TUI_EVENTS.AGENT_RELATIONSHIP,
        payload: {
          from: 'primary:solution-architect',
          to: 'specialist:security-specialist',
          label: 'delegates',
          type: 'delegation',
        },
      });
      expect(result[1]).toEqual({
        event: TUI_EVENTS.AGENT_RELATIONSHIP,
        payload: {
          from: 'primary:solution-architect',
          to: 'specialist:performance-specialist',
          label: 'delegates',
          type: 'delegation',
        },
      });
    });

    it('should return empty if primaryAgent is missing', () => {
      const result = extractEventsFromResponse(
        'dispatch_agents',
        makeResponse({
          specialists: [{ name: 'security-specialist' }],
        }),
      );
      expect(result).toHaveLength(0);
    });

    it('should return empty if specialists array is missing', () => {
      const result = extractEventsFromResponse(
        'dispatch_agents',
        makeResponse({
          primaryAgent: { name: 'solution-architect' },
        }),
      );
      expect(result).toHaveLength(0);
    });

    it('should use parallelAgents as fallback for specialists', () => {
      const result = extractEventsFromResponse(
        'dispatch_agents',
        makeResponse({
          primaryAgent: { name: 'architect' },
          parallelAgents: [{ name: 'sec' }],
        }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].payload).toEqual(
        expect.objectContaining({
          from: 'primary:architect',
          to: 'specialist:sec',
        }),
      );
    });

    it('should skip specialists without name or agentName', () => {
      const result = extractEventsFromResponse(
        'dispatch_agents',
        makeResponse({
          primaryAgent: { name: 'architect' },
          specialists: [{ name: 'valid' }, { other: 'no-name' }, null],
        }),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('update_context → task:synced', () => {
    it('should extract task:synced from update_context response with progress', () => {
      const result = extractEventsFromResponse(
        'update_context',
        makeResponse({
          document: {
            sections: [
              {
                mode: 'ACT',
                primaryAgent: 'frontend-developer',
                status: 'in_progress',
                progress: ['Implemented login form', 'Added validation'],
              },
            ],
          },
        }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].event).toBe(TUI_EVENTS.TASK_SYNCED);
      expect(result[0].payload).toEqual({
        agentId: 'frontend-developer',
        tasks: [
          { id: 'ctx-p-0', subject: 'Implemented login form', completed: false },
          { id: 'ctx-p-1', subject: 'Added validation', completed: false },
        ],
      });
    });

    it('should set completed: true when section status is completed', () => {
      const result = extractEventsFromResponse(
        'update_context',
        makeResponse({
          document: {
            sections: [
              {
                mode: 'ACT',
                primaryAgent: 'dev',
                status: 'completed',
                progress: ['Task done'],
              },
            ],
          },
        }),
      );
      expect(result[0].payload).toEqual({
        agentId: 'dev',
        tasks: [{ id: 'ctx-p-0', subject: 'Task done', completed: true }],
      });
    });

    it('should return empty if document is missing', () => {
      const result = extractEventsFromResponse('update_context', makeResponse({ success: true }));
      expect(result).toHaveLength(0);
    });

    it('should return empty if sections is empty', () => {
      const result = extractEventsFromResponse(
        'update_context',
        makeResponse({ document: { sections: [] } }),
      );
      expect(result).toHaveLength(0);
    });

    it('should return empty if all task source fields are empty or missing', () => {
      const result = extractEventsFromResponse(
        'update_context',
        makeResponse({
          document: {
            sections: [
              {
                mode: 'ACT',
                primaryAgent: 'dev',
                progress: [],
                decisions: [],
                findings: [],
                notes: [],
              },
            ],
          },
        }),
      );
      expect(result).toHaveLength(0);
    });

    it('should use unknown-agent as fallback agentId', () => {
      const result = extractEventsFromResponse(
        'update_context',
        makeResponse({
          document: {
            sections: [{ progress: ['task1'] }],
          },
        }),
      );
      expect(result[0].payload).toEqual(expect.objectContaining({ agentId: 'unknown-agent' }));
    });

    it('should use the last section for progress extraction', () => {
      const result = extractEventsFromResponse(
        'update_context',
        makeResponse({
          document: {
            sections: [
              { primaryAgent: 'old', progress: ['old task'] },
              { primaryAgent: 'new', progress: ['new task'] },
            ],
          },
        }),
      );
      expect(result[0].payload).toEqual(expect.objectContaining({ agentId: 'new' }));
    });

    it('should extract task:synced from PLAN mode decisions', () => {
      const result = extractEventsFromResponse(
        'update_context',
        makeResponse({
          document: {
            sections: [
              {
                mode: 'PLAN',
                primaryAgent: 'technical-planner',
                status: 'in_progress',
                decisions: ['Use JWT for auth', 'Add rate limiting'],
              },
            ],
          },
        }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].event).toBe(TUI_EVENTS.TASK_SYNCED);
      expect(result[0].payload).toEqual({
        agentId: 'technical-planner',
        tasks: [
          { id: 'ctx-d-0', subject: 'Use JWT for auth', completed: true },
          { id: 'ctx-d-1', subject: 'Add rate limiting', completed: true },
        ],
      });
    });

    it('should extract task:synced from EVAL mode findings', () => {
      const result = extractEventsFromResponse(
        'update_context',
        makeResponse({
          document: {
            sections: [
              {
                mode: 'EVAL',
                primaryAgent: 'code-reviewer',
                status: 'in_progress',
                findings: ['Missing error handling in auth', 'No input validation'],
              },
            ],
          },
        }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].event).toBe(TUI_EVENTS.TASK_SYNCED);
      expect(result[0].payload).toEqual({
        agentId: 'code-reviewer',
        tasks: [
          { id: 'ctx-f-0', subject: 'Missing error handling in auth', completed: true },
          { id: 'ctx-f-1', subject: 'No input validation', completed: true },
        ],
      });
    });

    it('should fall back to notes when no primary field is present', () => {
      const result = extractEventsFromResponse(
        'update_context',
        makeResponse({
          document: {
            sections: [
              {
                mode: 'PLAN',
                primaryAgent: 'planner',
                status: 'in_progress',
                notes: ['Reviewed existing codebase', 'Identified dependencies'],
              },
            ],
          },
        }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].payload).toEqual({
        agentId: 'planner',
        tasks: [
          { id: 'ctx-n-0', subject: 'Reviewed existing codebase', completed: false },
          { id: 'ctx-n-1', subject: 'Identified dependencies', completed: false },
        ],
      });
    });

    it('should merge decisions and progress when both exist', () => {
      const result = extractEventsFromResponse(
        'update_context',
        makeResponse({
          document: {
            sections: [
              {
                mode: 'ACT',
                primaryAgent: 'dev',
                status: 'in_progress',
                progress: ['Implemented feature'],
                decisions: ['Use pattern X'],
              },
            ],
          },
        }),
      );
      expect(result[0].payload).toEqual({
        agentId: 'dev',
        tasks: [
          { id: 'ctx-d-0', subject: 'Use pattern X', completed: true },
          { id: 'ctx-p-0', subject: 'Implemented feature', completed: false },
        ],
      });
    });

    describe('source-aware completion', () => {
      it('should mark decisions as completed: true always', () => {
        const result = extractEventsFromResponse(
          'update_context',
          makeResponse({
            document: {
              sections: [
                { primaryAgent: 'agent-1', status: 'in_progress', decisions: ['Use JWT'] },
              ],
            },
          }),
        );
        const synced = result.find(e => e.event === TUI_EVENTS.TASK_SYNCED);
        expect(synced?.payload.tasks[0]).toEqual({
          id: 'ctx-d-0',
          subject: 'Use JWT',
          completed: true,
        });
      });

      it('should mark progress as completed: false when section is in_progress', () => {
        const result = extractEventsFromResponse(
          'update_context',
          makeResponse({
            document: {
              sections: [
                { primaryAgent: 'agent-1', status: 'in_progress', progress: ['Impl auth'] },
              ],
            },
          }),
        );
        const synced = result.find(e => e.event === TUI_EVENTS.TASK_SYNCED);
        expect(synced?.payload.tasks[0]).toEqual({
          id: 'ctx-p-0',
          subject: 'Impl auth',
          completed: false,
        });
      });

      it('should mark progress as completed: true when section is completed', () => {
        const result = extractEventsFromResponse(
          'update_context',
          makeResponse({
            document: {
              sections: [{ primaryAgent: 'agent-1', status: 'completed', progress: ['Impl auth'] }],
            },
          }),
        );
        const synced = result.find(e => e.event === TUI_EVENTS.TASK_SYNCED);
        expect(synced?.payload.tasks[0]).toEqual({
          id: 'ctx-p-0',
          subject: 'Impl auth',
          completed: true,
        });
      });

      it('should mark notes as completed: false always', () => {
        const result = extractEventsFromResponse(
          'update_context',
          makeResponse({
            document: {
              sections: [
                {
                  primaryAgent: 'agent-1',
                  status: 'completed',
                  notes: ['Consider caching'],
                },
              ],
            },
          }),
        );
        const synced = result.find(e => e.event === TUI_EVENTS.TASK_SYNCED);
        expect(synced?.payload.tasks[0]).toEqual({
          id: 'ctx-n-0',
          subject: 'Consider caching',
          completed: false,
        });
      });

      it('should mark findings as completed: true always', () => {
        const result = extractEventsFromResponse(
          'update_context',
          makeResponse({
            document: {
              sections: [
                { primaryAgent: 'agent-1', status: 'in_progress', findings: ['No XSS found'] },
              ],
            },
          }),
        );
        const synced = result.find(e => e.event === TUI_EVENTS.TASK_SYNCED);
        expect(synced?.payload.tasks[0]).toEqual({
          id: 'ctx-f-0',
          subject: 'No XSS found',
          completed: true,
        });
      });

      it('should merge all source fields with correct completion per source', () => {
        const result = extractEventsFromResponse(
          'update_context',
          makeResponse({
            document: {
              sections: [
                {
                  primaryAgent: 'agent-1',
                  status: 'in_progress',
                  decisions: ['Use JWT'],
                  progress: ['Impl auth'],
                  findings: ['No XSS'],
                  notes: ['Consider caching'],
                },
              ],
            },
          }),
        );
        const synced = result.find(e => e.event === TUI_EVENTS.TASK_SYNCED);
        expect(synced?.payload.tasks).toEqual([
          { id: 'ctx-d-0', subject: 'Use JWT', completed: true },
          { id: 'ctx-p-0', subject: 'Impl auth', completed: false },
          { id: 'ctx-f-0', subject: 'No XSS', completed: true },
          { id: 'ctx-n-0', subject: 'Consider caching', completed: false },
        ]);
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
