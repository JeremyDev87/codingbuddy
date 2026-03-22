import { describe, it, expect, beforeEach } from 'vitest';
import { DiscussionHandler } from './discussion.handler';
import type { AgentOpinion, DiscussionResult } from './discussion.types';

describe('DiscussionHandler', () => {
  let handler: DiscussionHandler;

  beforeEach(() => {
    handler = new DiscussionHandler();
  });

  describe('handle', () => {
    it('should return null for unhandled tools', async () => {
      const result = await handler.handle('unknown_tool', {});
      expect(result).toBeNull();
    });

    describe('agent_discussion', () => {
      it('should return structured discussion result with valid args', async () => {
        const result = await handler.handle('agent_discussion', {
          topic: 'Authentication design review',
          specialists: ['security-specialist', 'performance-specialist'],
        });

        expect(result?.isError).toBeFalsy();
        const data = JSON.parse(result!.content[0].text) as DiscussionResult;
        expect(data.topic).toBe('Authentication design review');
        expect(data.specialists).toEqual(['security-specialist', 'performance-specialist']);
        expect(data.opinions).toHaveLength(2);
        expect(data.consensus).toBeDefined();
        expect(data.summary).toBeDefined();
        expect(data.maxSeverity).toBeDefined();
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

        const data = JSON.parse(result!.content[0].text) as DiscussionResult;
        expect(data.opinions).toHaveLength(3);
        expect(data.opinions.map((o: AgentOpinion) => o.agent)).toEqual(specialists);
      });

      it('should validate opinion structure', async () => {
        const result = await handler.handle('agent_discussion', {
          topic: 'Review topic',
          specialists: ['security-specialist'],
        });

        const data = JSON.parse(result!.content[0].text) as DiscussionResult;
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

        const data = JSON.parse(result!.content[0].text) as DiscussionResult;
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

        const data = JSON.parse(result!.content[0].text) as DiscussionResult;
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
        const data = JSON.parse(result!.content[0].text) as DiscussionResult;
        expect(data.topic).toBe('Auth review');
      });

      it('should handle undefined args gracefully', async () => {
        const result = await handler.handle('agent_discussion', undefined);

        expect(result?.isError).toBe(true);
        expect(result?.content[0].text).toContain('Missing required parameter: topic');
      });

      it('should compute maxSeverity as highest across all opinions', async () => {
        const result = await handler.handle('agent_discussion', {
          topic: 'Max severity check',
          specialists: ['security-specialist', 'performance-specialist'],
        });

        const data = JSON.parse(result!.content[0].text) as DiscussionResult;
        const severityOrder = ['info', 'low', 'medium', 'high', 'critical'];
        const opinionSeverities = data.opinions.map((o: AgentOpinion) =>
          severityOrder.indexOf(o.severity),
        );
        const maxIndex = Math.max(...opinionSeverities);
        expect(data.maxSeverity).toBe(severityOrder[maxIndex]);
      });
    });
  });

  describe('getToolDefinitions', () => {
    it('should return tool definitions', () => {
      const definitions = handler.getToolDefinitions();

      expect(definitions).toHaveLength(1);
      expect(definitions[0].name).toBe('agent_discussion');
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
