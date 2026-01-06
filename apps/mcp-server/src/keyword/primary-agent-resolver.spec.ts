import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { PrimaryAgentResolver } from './primary-agent-resolver';
import { type ResolutionContext } from './keyword.types';

describe('PrimaryAgentResolver', () => {
  let resolver: PrimaryAgentResolver;
  let mockGetProjectConfig: Mock;
  let mockListPrimaryAgents: Mock;

  beforeEach(() => {
    mockGetProjectConfig = vi.fn().mockResolvedValue(null);
    mockListPrimaryAgents = vi
      .fn()
      .mockResolvedValue([
        'frontend-developer',
        'backend-developer',
        'agent-architect',
        'devops-engineer',
      ]);

    resolver = new PrimaryAgentResolver(
      mockGetProjectConfig,
      mockListPrimaryAgents,
    );
  });

  describe('resolve', () => {
    describe('explicit request parsing', () => {
      it('returns explicit agent when prompt contains "backend-developer로 작업해"', async () => {
        const result = await resolver.resolve(
          'PLAN',
          'backend-developer로 작업해 새 API 만들어',
        );

        expect(result.agentName).toBe('backend-developer');
        expect(result.source).toBe('explicit');
        expect(result.confidence).toBe(1.0);
      });

      it('returns explicit agent when prompt contains "use backend-developer agent"', async () => {
        const result = await resolver.resolve(
          'ACT',
          'use backend-developer agent to create API',
        );

        expect(result.agentName).toBe('backend-developer');
        expect(result.source).toBe('explicit');
      });

      it('returns explicit agent when prompt contains "agent-architect로 해줘"', async () => {
        const result = await resolver.resolve(
          'PLAN',
          'agent-architect로 해줘 새 에이전트 만들어',
        );

        expect(result.agentName).toBe('agent-architect');
        expect(result.source).toBe('explicit');
      });

      it('returns explicit agent when prompt contains "as frontend-developer"', async () => {
        const result = await resolver.resolve(
          'ACT',
          'implement this feature as frontend-developer',
        );

        expect(result.agentName).toBe('frontend-developer');
        expect(result.source).toBe('explicit');
      });

      it('ignores invalid explicit agent names not in registry', async () => {
        const result = await resolver.resolve(
          'PLAN',
          'use invalid-agent agent to do something',
        );

        // Should fall through to config/default, not return invalid agent
        expect(result.agentName).not.toBe('invalid-agent');
      });
    });

    describe('project config resolution', () => {
      it('returns configured agent when project config specifies primaryAgent', async () => {
        mockGetProjectConfig.mockResolvedValue({
          primaryAgent: 'backend-developer',
        });

        const result = await resolver.resolve('PLAN', '새 API 만들어');

        expect(result.agentName).toBe('backend-developer');
        expect(result.source).toBe('config');
        expect(result.confidence).toBe(1.0);
      });

      it('ignores config if configured agent is not in registry', async () => {
        mockGetProjectConfig.mockResolvedValue({
          primaryAgent: 'non-existent-agent',
        });

        const result = await resolver.resolve('PLAN', '새 기능 만들어');

        // Should fall through to default
        expect(result.agentName).toBe('frontend-developer');
        expect(result.source).toBe('default');
      });

      it('handles config loading errors gracefully', async () => {
        mockGetProjectConfig.mockRejectedValue(new Error('Config error'));

        const result = await resolver.resolve('PLAN', '새 기능 만들어');

        expect(result.agentName).toBe('frontend-developer');
        expect(result.source).toBe('default');
      });
    });

    describe('context-based resolution', () => {
      it('suggests devops-engineer when context includes Dockerfile', async () => {
        const context: ResolutionContext = {
          filePath: '/project/Dockerfile',
        };

        const result = await resolver.resolve(
          'PLAN',
          '이 파일 수정해',
          context,
        );

        // Context-based suggestions have lower confidence
        expect(result.source).toBe('context');
        expect(result.confidence).toBeLessThan(1.0);
      });

      it('suggests backend-developer when context includes .go or .py files', async () => {
        mockListPrimaryAgents.mockResolvedValue([
          'frontend-developer',
          'backend-developer',
        ]);

        const context: ResolutionContext = {
          filePath: '/project/main.go',
        };

        const result = await resolver.resolve(
          'PLAN',
          '이 파일 수정해',
          context,
        );

        expect(result.agentName).toBe('backend-developer');
        expect(result.source).toBe('context');
      });
    });

    describe('default fallback', () => {
      it('returns frontend-developer when no preference found', async () => {
        const result = await resolver.resolve('PLAN', '새 기능 만들어');

        expect(result.agentName).toBe('frontend-developer');
        expect(result.source).toBe('default');
        expect(result.confidence).toBe(1.0);
        expect(result.reason).toContain('default');
      });

      it('returns default even with empty prompt', async () => {
        const result = await resolver.resolve('ACT', '');

        expect(result.agentName).toBe('frontend-developer');
        expect(result.source).toBe('default');
      });
    });

    describe('EVAL mode behavior', () => {
      it('always returns code-reviewer for EVAL mode regardless of explicit request', async () => {
        const result = await resolver.resolve(
          'EVAL',
          'backend-developer로 평가해',
        );

        expect(result.agentName).toBe('code-reviewer');
        expect(result.source).toBe('default');
        expect(result.reason).toContain('EVAL');
      });

      it('always returns code-reviewer for EVAL mode regardless of config', async () => {
        mockGetProjectConfig.mockResolvedValue({
          primaryAgent: 'backend-developer',
        });

        const result = await resolver.resolve('EVAL', '코드 평가해');

        expect(result.agentName).toBe('code-reviewer');
      });
    });

    describe('priority order', () => {
      it('explicit request takes priority over config', async () => {
        mockGetProjectConfig.mockResolvedValue({
          primaryAgent: 'backend-developer',
        });

        const result = await resolver.resolve(
          'PLAN',
          'frontend-developer로 작업해',
        );

        expect(result.agentName).toBe('frontend-developer');
        expect(result.source).toBe('explicit');
      });

      it('config takes priority over context', async () => {
        mockGetProjectConfig.mockResolvedValue({
          primaryAgent: 'frontend-developer',
        });

        const context: ResolutionContext = {
          filePath: '/project/main.go', // Would suggest backend-developer
        };

        const result = await resolver.resolve(
          'PLAN',
          '이 파일 수정해',
          context,
        );

        expect(result.agentName).toBe('frontend-developer');
        expect(result.source).toBe('config');
      });

      it('context takes priority over default when confidence is high', async () => {
        const context: ResolutionContext = {
          filePath: '/project/Dockerfile',
          projectType: 'infrastructure',
        };

        mockListPrimaryAgents.mockResolvedValue([
          'frontend-developer',
          'devops-engineer',
        ]);

        const result = await resolver.resolve(
          'PLAN',
          'Docker 설정 수정해',
          context,
        );

        // High confidence context should override default
        expect(result.source).toBe('context');
      });
    });
  });

  describe('parseExplicitRequest', () => {
    it('extracts agent name from Korean pattern "~로 작업해"', async () => {
      const result = await resolver.resolve(
        'PLAN',
        'backend-developer로 작업해줘',
      );
      expect(result.agentName).toBe('backend-developer');
    });

    it('extracts agent name from Korean pattern "~으로 해"', async () => {
      const result = await resolver.resolve('PLAN', 'agent-architect으로 해줘');
      expect(result.agentName).toBe('agent-architect');
    });

    it('extracts agent name from English pattern "use ~ agent"', async () => {
      const result = await resolver.resolve(
        'PLAN',
        'use frontend-developer agent',
      );
      expect(result.agentName).toBe('frontend-developer');
    });

    it('extracts agent name from English pattern "using ~"', async () => {
      const result = await resolver.resolve(
        'PLAN',
        'using backend-developer create API',
      );
      expect(result.agentName).toBe('backend-developer');
    });

    it('handles mixed language prompts', async () => {
      const result = await resolver.resolve(
        'PLAN',
        'backend-developer agent로 API 만들어',
      );
      expect(result.agentName).toBe('backend-developer');
    });
  });

  describe('safeListPrimaryAgents fallback behavior', () => {
    it('returns default fallback list when listPrimaryAgents returns empty array', async () => {
      mockListPrimaryAgents.mockResolvedValue([]);

      const result = await resolver.resolve('PLAN', 'build a feature');

      // Default fallback should be used
      expect(result.agentName).toBe('frontend-developer');
      expect(result.source).toBe('default');
    });

    it('returns default fallback list when listPrimaryAgents throws error', async () => {
      mockListPrimaryAgents.mockRejectedValue(new Error('Network error'));

      const result = await resolver.resolve('PLAN', 'build a feature');

      // Default fallback should be used even on error
      expect(result.agentName).toBe('frontend-developer');
      expect(result.source).toBe('default');
    });

    it('uses fallback list for agent validation when listPrimaryAgents fails', async () => {
      mockListPrimaryAgents.mockRejectedValue(new Error('Network error'));

      // backend-developer is in fallback list, so it should be recognized
      const result = await resolver.resolve(
        'PLAN',
        'backend-developer로 작업해',
      );

      expect(result.agentName).toBe('backend-developer');
      expect(result.source).toBe('explicit');
    });
  });
});
