import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DiscussionHandler } from './discussion.handler';
import type {
  AgentOpinion,
  DisabledDiscussionResult,
  ExperimentalDiscussionResult,
} from './discussion.types';
import {
  DISABLED_DISCUSSION_REASON,
  EXPERIMENTAL_DISCUSSION_ENV,
  EXPERIMENTAL_DISCUSSION_WARNING,
} from './discussion.types';
import type { RuleEventCollector } from '../../rules/rule-event-collector';

describe('DiscussionHandler', () => {
  let handler: DiscussionHandler;
  let mockRuleEventCollector: Partial<RuleEventCollector>;
  let savedEnvValue: string | undefined;

  beforeEach(() => {
    savedEnvValue = process.env[EXPERIMENTAL_DISCUSSION_ENV];
    delete process.env[EXPERIMENTAL_DISCUSSION_ENV];
    mockRuleEventCollector = { record: vi.fn() };
    handler = new DiscussionHandler(mockRuleEventCollector as RuleEventCollector);
  });

  afterEach(() => {
    if (savedEnvValue === undefined) {
      delete process.env[EXPERIMENTAL_DISCUSSION_ENV];
    } else {
      process.env[EXPERIMENTAL_DISCUSSION_ENV] = savedEnvValue;
    }
  });

  describe('handle', () => {
    it('should return null for unhandled tools', async () => {
      const result = await handler.handle('unknown_tool', {});
      expect(result).toBeNull();
    });

    describe('agent_discussion (disabled by default)', () => {
      it('should return disabled result when experimental env is unset', async () => {
        const result = await handler.handle('agent_discussion', {
          topic: 'Authentication design review',
          specialists: ['security-specialist', 'performance-specialist'],
        });

        expect(result?.isError).toBeFalsy();
        const data = JSON.parse(result!.content[0].text) as DisabledDiscussionResult;
        expect(data.disabled).toBe(true);
        expect(data.reason).toBe(DISABLED_DISCUSSION_REASON);
        expect(data.experimentalFlag).toBe(EXPERIMENTAL_DISCUSSION_ENV);
      });

      it('should return disabled result even when args would otherwise be invalid', async () => {
        // Disabled path is the default short-circuit and should not leak
        // validation errors; callers just learn the feature is off.
        const result = await handler.handle('agent_discussion', undefined);

        expect(result?.isError).toBeFalsy();
        const data = JSON.parse(result!.content[0].text) as DisabledDiscussionResult;
        expect(data.disabled).toBe(true);
      });

      it('should not record specialist_dispatched events when disabled', async () => {
        await handler.handle('agent_discussion', {
          topic: 'Auth review',
          specialists: ['security-specialist', 'performance-specialist'],
        });

        expect(mockRuleEventCollector.record).not.toHaveBeenCalled();
      });

      it('should treat env values other than "1" as disabled', async () => {
        process.env[EXPERIMENTAL_DISCUSSION_ENV] = '0';
        const result = await handler.handle('agent_discussion', {
          topic: 'Review',
          specialists: ['security-specialist'],
        });
        const data = JSON.parse(result!.content[0].text) as DisabledDiscussionResult;
        expect(data.disabled).toBe(true);
      });
    });

    describe('agent_discussion (experimental flag enabled)', () => {
      beforeEach(() => {
        process.env[EXPERIMENTAL_DISCUSSION_ENV] = '1';
      });

      it('should return structured discussion result with valid args', async () => {
        const result = await handler.handle('agent_discussion', {
          topic: 'Authentication design review',
          specialists: ['security-specialist', 'performance-specialist'],
        });

        expect(result?.isError).toBeFalsy();
        const data = JSON.parse(result!.content[0].text) as ExperimentalDiscussionResult;
        expect(data.topic).toBe('Authentication design review');
        expect(data.specialists).toEqual(['security-specialist', 'performance-specialist']);
        expect(data.opinions).toHaveLength(2);
        expect(data.consensus).toBeDefined();
        expect(data.summary).toBeDefined();
        expect(data.maxSeverity).toBeDefined();
      });

      it('should include experimental flag and warning banner in enabled output', async () => {
        const result = await handler.handle('agent_discussion', {
          topic: 'Authentication design review',
          specialists: ['security-specialist'],
        });

        const data = JSON.parse(result!.content[0].text) as ExperimentalDiscussionResult;
        expect(data.experimental).toBe(true);
        expect(data.warning).toBe(EXPERIMENTAL_DISCUSSION_WARNING);
        expect(data.warning).toContain('experimental');
        expect(data.warning).toContain('templated synthesis');
        expect(data.warning).toContain('not real specialist execution');
      });

      it('should return error for missing topic', async () => {
        const result = await handler.handle('agent_discussion', {
          specialists: ['security-specialist'],
        });

        expect(result?.isError).toBe(true);
        expect(result?.content[0].text).toContain('Missing required parameter: topic');
      });

      it('should return error for non-string topic', async () => {
        const result = await handler.handle('agent_discussion', {
          topic: 123,
          specialists: ['security-specialist'],
        });

        expect(result?.isError).toBe(true);
        expect(result?.content[0].text).toContain('Missing required parameter: topic');
      });

      it('should return error for missing specialists', async () => {
        const result = await handler.handle('agent_discussion', {
          topic: 'Test topic',
        });

        expect(result?.isError).toBe(true);
        expect(result?.content[0].text).toContain('Missing required parameter: specialists');
      });

      it('should return error for empty specialists array', async () => {
        const result = await handler.handle('agent_discussion', {
          topic: 'Test topic',
          specialists: [],
        });

        expect(result?.isError).toBe(true);
        expect(result?.content[0].text).toContain('at least one specialist');
      });

      it('should generate one opinion per specialist', async () => {
        const specialists = [
          'security-specialist',
          'performance-specialist',
          'accessibility-specialist',
        ];
        const result = await handler.handle('agent_discussion', {
          topic: 'Code review',
          specialists,
        });

        const data = JSON.parse(result!.content[0].text) as ExperimentalDiscussionResult;
        expect(data.opinions).toHaveLength(3);
        expect(data.opinions.map((o: AgentOpinion) => o.agent)).toEqual(specialists);
      });

      it('should validate opinion structure', async () => {
        const result = await handler.handle('agent_discussion', {
          topic: 'Review topic',
          specialists: ['security-specialist'],
        });

        const data = JSON.parse(result!.content[0].text) as ExperimentalDiscussionResult;
        const opinion = data.opinions[0];
        expect(opinion).toHaveProperty('agent');
        expect(opinion).toHaveProperty('opinion');
        expect(opinion).toHaveProperty('severity');
        expect(opinion).toHaveProperty('evidence');
        expect(opinion).toHaveProperty('recommendation');
        expect(typeof opinion.agent).toBe('string');
        expect(typeof opinion.opinion).toBe('string');
        expect(typeof opinion.severity).toBe('string');
        expect(Array.isArray(opinion.evidence)).toBe(true);
        expect(typeof opinion.recommendation).toBe('string');
      });

      it('should have valid severity values', async () => {
        const result = await handler.handle('agent_discussion', {
          topic: 'Severity check',
          specialists: ['security-specialist', 'performance-specialist'],
        });

        const data = JSON.parse(result!.content[0].text) as ExperimentalDiscussionResult;
        const validSeverities = ['info', 'low', 'medium', 'high', 'critical'];
        for (const opinion of data.opinions) {
          expect(validSeverities).toContain(opinion.severity);
        }
        expect(validSeverities).toContain(data.maxSeverity);
      });

      it('should detect consensus when all opinions agree on severity', async () => {
        const result = await handler.handle('agent_discussion', {
          topic: 'Simple review',
          specialists: ['security-specialist'],
        });

        const data = JSON.parse(result!.content[0].text) as ExperimentalDiscussionResult;
        // Single specialist always has consensus
        expect(data.consensus).toBe('consensus');
      });

      it('should include context in opinions when provided', async () => {
        const result = await handler.handle('agent_discussion', {
          topic: 'Auth review',
          specialists: ['security-specialist'],
          context: 'Using JWT tokens with refresh rotation',
        });

        expect(result?.isError).toBeFalsy();
        const data = JSON.parse(result!.content[0].text) as ExperimentalDiscussionResult;
        expect(data.topic).toBe('Auth review');
      });

      it('should compute maxSeverity as highest across all opinions', async () => {
        const result = await handler.handle('agent_discussion', {
          topic: 'Max severity check',
          specialists: ['security-specialist', 'performance-specialist'],
        });

        const data = JSON.parse(result!.content[0].text) as ExperimentalDiscussionResult;
        const severityOrder = ['info', 'low', 'medium', 'high', 'critical'];
        const opinionSeverities = data.opinions.map((o: AgentOpinion) =>
          severityOrder.indexOf(o.severity),
        );
        const maxIndex = Math.max(...opinionSeverities);
        expect(data.maxSeverity).toBe(severityOrder[maxIndex]);
      });
    });
  });

  describe('rule event tracking (experimental enabled)', () => {
    beforeEach(() => {
      process.env[EXPERIMENTAL_DISCUSSION_ENV] = '1';
    });

    it('should record specialist_dispatched event for each specialist', async () => {
      await handler.handle('agent_discussion', {
        topic: 'Auth review',
        specialists: ['security-specialist', 'performance-specialist'],
      });

      expect(mockRuleEventCollector.record).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'specialist_dispatched',
          domain: 'security-specialist',
        }),
      );
      expect(mockRuleEventCollector.record).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'specialist_dispatched',
          domain: 'performance-specialist',
        }),
      );
    });

    it('should not record events when validation fails', async () => {
      await handler.handle('agent_discussion', {
        specialists: ['security-specialist'],
      });

      expect(mockRuleEventCollector.record).not.toHaveBeenCalled();
    });

    it('should not break handler when event recording throws', async () => {
      mockRuleEventCollector.record = vi.fn().mockImplementation(() => {
        throw new Error('record error');
      });

      const result = await handler.handle('agent_discussion', {
        topic: 'Auth review',
        specialists: ['security-specialist'],
      });

      expect(result?.isError).toBeFalsy();
    });
  });

  describe('getToolDefinitions', () => {
    it('should return tool definitions', () => {
      const definitions = handler.getToolDefinitions();

      expect(definitions).toHaveLength(1);
      expect(definitions[0].name).toBe('agent_discussion');
    });

    it('should mark tool description as experimental', () => {
      const definitions = handler.getToolDefinitions();
      const description = definitions[0].description.toLowerCase();

      expect(description).toContain('experimental');
      expect(description).toContain('templated synthesis');
      expect(description).toContain(EXPERIMENTAL_DISCUSSION_ENV.toLowerCase());
    });

    it('should have correct required parameters', () => {
      const definitions = handler.getToolDefinitions();
      const agentDiscussion = definitions[0];

      expect(agentDiscussion.inputSchema.required).toEqual(['topic', 'specialists']);
    });

    it('should define topic and specialists properties', () => {
      const definitions = handler.getToolDefinitions();
      const props = definitions[0].inputSchema.properties as Record<string, { type: string }>;

      expect(props.topic).toBeDefined();
      expect(props.topic.type).toBe('string');
      expect(props.specialists).toBeDefined();
    });
  });
});
