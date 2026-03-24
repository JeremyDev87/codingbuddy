/**
 * Tests for explicit-pattern-matcher
 *
 * Validates matching of user prompts against agents' activation.explicit_patterns.
 */

import { matchExplicitPatterns, type ExplicitPatternsMap } from './explicit-pattern-matcher';

describe('matchExplicitPatterns', () => {
  const patternsMap: ExplicitPatternsMap = new Map([
    ['agent-architect', ['create agent', 'new agent', 'validate agent', 'agent creation']],
    [
      'parallel-orchestrator',
      ['parallel issues', 'parallel execution', 'taskMaestro', 'wave execution'],
    ],
    ['test-engineer', ['write test code', 'unit test', 'with TDD', 'as test-engineer']],
    ['tooling-engineer', ['config file', 'tsconfig', 'eslint', 'prettier', 'webpack']],
    [
      'security-engineer',
      ['fix security vulnerability', 'implement JWT', 'implement authentication'],
    ],
  ]);

  const availableAgents = [
    'agent-architect',
    'parallel-orchestrator',
    'test-engineer',
    'tooling-engineer',
    'security-engineer',
    'software-engineer',
  ];

  describe('basic matching', () => {
    it('returns null when no patterns match', () => {
      const result = matchExplicitPatterns('refactor the login page', patternsMap, availableAgents);
      expect(result).toBeNull();
    });

    it('matches a simple pattern case-insensitively', () => {
      const result = matchExplicitPatterns(
        'I need to CREATE AGENT for the new workflow',
        patternsMap,
        availableAgents,
      );
      expect(result).not.toBeNull();
      expect(result!.agentName).toBe('agent-architect');
      expect(result!.source).toBe('explicit_patterns');
      expect(result!.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('matches pattern as substring of prompt', () => {
      const result = matchExplicitPatterns(
        'please help me with parallel issues in our project',
        patternsMap,
        availableAgents,
      );
      expect(result).not.toBeNull();
      expect(result!.agentName).toBe('parallel-orchestrator');
    });

    it('matches TDD-related prompt to test-engineer', () => {
      const result = matchExplicitPatterns(
        'let us proceed with TDD for the auth module',
        patternsMap,
        availableAgents,
      );
      expect(result).not.toBeNull();
      expect(result!.agentName).toBe('test-engineer');
    });
  });

  describe('longest match wins', () => {
    it('prefers longer matching pattern when multiple agents match', () => {
      // "implement authentication" (23 chars) from security-engineer
      // vs shorter matches from other agents
      const result = matchExplicitPatterns(
        'we need to implement authentication for the API',
        patternsMap,
        availableAgents,
      );
      expect(result).not.toBeNull();
      expect(result!.agentName).toBe('security-engineer');
    });

    it('uses longest pattern when same agent has multiple matches', () => {
      // Both "create agent" and "agent creation" match
      const result = matchExplicitPatterns(
        'agent creation process needs improvement',
        patternsMap,
        availableAgents,
      );
      expect(result).not.toBeNull();
      expect(result!.agentName).toBe('agent-architect');
    });
  });

  describe('availability filtering', () => {
    it('skips agents not in availableAgents list', () => {
      const limitedAgents = ['software-engineer', 'tooling-engineer'];
      const result = matchExplicitPatterns(
        'create agent for the new workflow',
        patternsMap,
        limitedAgents,
      );
      // agent-architect is not in limitedAgents, so no match
      expect(result).toBeNull();
    });

    it('falls through to next matching agent when first is unavailable', () => {
      // Only test-engineer available, not agent-architect
      const limitedAgents = ['test-engineer', 'software-engineer'];
      const result = matchExplicitPatterns(
        'write test code for the new feature',
        patternsMap,
        limitedAgents,
      );
      expect(result).not.toBeNull();
      expect(result!.agentName).toBe('test-engineer');
    });
  });

  describe('edge cases', () => {
    it('handles empty patterns map', () => {
      const result = matchExplicitPatterns('create agent for workflow', new Map(), availableAgents);
      expect(result).toBeNull();
    });

    it('handles empty available agents', () => {
      const result = matchExplicitPatterns('create agent for workflow', patternsMap, []);
      expect(result).toBeNull();
    });

    it('handles empty prompt', () => {
      const result = matchExplicitPatterns('', patternsMap, availableAgents);
      expect(result).toBeNull();
    });

    it('handles agent with empty patterns array', () => {
      const mapWithEmpty = new Map([['some-agent', []]]);
      const result = matchExplicitPatterns('anything', mapWithEmpty, ['some-agent']);
      expect(result).toBeNull();
    });

    it('does not match partial words by default', () => {
      // "test" should not match "unit test" pattern partially
      // But "unit test" as a full phrase should match
      const result = matchExplicitPatterns(
        'unit testing is important',
        patternsMap,
        availableAgents,
      );
      // "unit test" is a substring of "unit testing" — this should still match
      expect(result).not.toBeNull();
      expect(result!.agentName).toBe('test-engineer');
    });
  });

  describe('result shape', () => {
    it('returns correct result structure', () => {
      const result = matchExplicitPatterns(
        'configure eslint for the project',
        patternsMap,
        availableAgents,
      );
      expect(result).toEqual({
        agentName: 'tooling-engineer',
        source: 'explicit_patterns',
        confidence: expect.any(Number),
        reason: expect.stringContaining('eslint'),
      });
    });

    it('includes matched pattern in reason', () => {
      const result = matchExplicitPatterns('setup webpack bundler', patternsMap, availableAgents);
      expect(result).not.toBeNull();
      expect(result!.reason).toContain('webpack');
    });
  });
});
