import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentService } from './agent.service';
import type { RulesService } from '../rules/rules.service';
import type { AgentProfile } from '../rules/rules.types';
import type { AgentContext } from './agent.types';

describe('AgentService', () => {
  let service: AgentService;
  let mockRulesService: Partial<RulesService>;

  const mockSecurityAgent: AgentProfile = {
    name: 'Security Specialist',
    description: 'Security expert for OAuth, JWT, and web vulnerabilities',
    role: {
      title: 'Security Specialist',
      expertise: ['OAuth 2.0', 'JWT security', 'XSS/CSRF protection'],
      responsibilities: ['Review security code', 'Identify vulnerabilities'],
    },
  };

  const mockAccessibilityAgent: AgentProfile = {
    name: 'Accessibility Specialist',
    description: 'WCAG 2.1 AA compliance expert',
    role: {
      title: 'Accessibility Specialist',
      expertise: ['WCAG 2.1', 'ARIA', 'Keyboard navigation'],
      responsibilities: ['Review accessibility', 'Ensure WCAG compliance'],
    },
  };

  const mockPerformanceAgent: AgentProfile = {
    name: 'Performance Specialist',
    description: 'Performance optimization expert',
    role: {
      title: 'Performance Specialist',
      expertise: [
        'Bundle optimization',
        'Core Web Vitals',
        'Rendering performance',
      ],
      responsibilities: ['Review performance', 'Optimize load times'],
    },
  };

  beforeEach(() => {
    mockRulesService = {
      getAgent: vi.fn(),
    };

    service = new AgentService(mockRulesService as RulesService);
  });

  describe('getAgentSystemPrompt', () => {
    const mockContext: AgentContext = {
      mode: 'EVAL',
      targetFiles: ['src/auth/login.ts'],
      taskDescription: 'Security review',
    };

    it('should return complete prompt for valid agent', async () => {
      vi.mocked(mockRulesService.getAgent!).mockResolvedValue(
        mockSecurityAgent,
      );

      const result = await service.getAgentSystemPrompt(
        'security-specialist',
        mockContext,
      );

      expect(result.agentName).toBe('security-specialist');
      expect(result.displayName).toBe('Security Specialist');
      expect(result.systemPrompt).toContain('Security Specialist');
      expect(result.description).toBeDefined();
    });

    it('should include agent expertise in system prompt', async () => {
      vi.mocked(mockRulesService.getAgent!).mockResolvedValue(
        mockSecurityAgent,
      );

      const result = await service.getAgentSystemPrompt(
        'security-specialist',
        mockContext,
      );

      expect(result.systemPrompt).toContain('OAuth 2.0');
      expect(result.systemPrompt).toContain('JWT security');
    });

    it('should throw error for unknown agent', async () => {
      vi.mocked(mockRulesService.getAgent!).mockRejectedValue(
        new Error('Agent not found'),
      );

      await expect(
        service.getAgentSystemPrompt('unknown-agent', mockContext),
      ).rejects.toThrow();
    });

    it('should apply context to prompt', async () => {
      vi.mocked(mockRulesService.getAgent!).mockResolvedValue(
        mockSecurityAgent,
      );

      const result = await service.getAgentSystemPrompt(
        'security-specialist',
        mockContext,
      );

      expect(result.systemPrompt).toContain('src/auth/login.ts');
      expect(result.systemPrompt).toContain('EVAL');
    });
  });

  describe('prepareParallelAgents', () => {
    it('should prepare multiple agents in single call', async () => {
      vi.mocked(mockRulesService.getAgent!)
        .mockResolvedValueOnce(mockSecurityAgent)
        .mockResolvedValueOnce(mockAccessibilityAgent)
        .mockResolvedValueOnce(mockPerformanceAgent);

      const result = await service.prepareParallelAgents(
        'EVAL',
        [
          'security-specialist',
          'accessibility-specialist',
          'performance-specialist',
        ],
        ['src/components/Form.tsx'],
        'Review form component',
      );

      expect(result.agents).toHaveLength(3);
      expect(result.agents[0].id).toBe('security-specialist');
      expect(result.agents[1].id).toBe('accessibility-specialist');
      expect(result.agents[2].id).toBe('performance-specialist');
    });

    it('should filter invalid agent names gracefully', async () => {
      vi.mocked(mockRulesService.getAgent!)
        .mockResolvedValueOnce(mockSecurityAgent)
        .mockRejectedValueOnce(new Error('Agent not found'))
        .mockResolvedValueOnce(mockPerformanceAgent);

      const result = await service.prepareParallelAgents(
        'EVAL',
        ['security-specialist', 'invalid-agent', 'performance-specialist'],
        ['src/file.ts'],
      );

      expect(result.agents).toHaveLength(2);
      expect(result.agents.map(a => a.id)).toContain('security-specialist');
      expect(result.agents.map(a => a.id)).toContain('performance-specialist');
    });

    it('should include failedAgents with id and reason when agent load fails', async () => {
      vi.mocked(mockRulesService.getAgent!)
        .mockResolvedValueOnce(mockSecurityAgent)
        .mockRejectedValueOnce(new Error('Agent not found'))
        .mockResolvedValueOnce(mockPerformanceAgent);

      const result = await service.prepareParallelAgents(
        'EVAL',
        ['security-specialist', 'invalid-agent', 'performance-specialist'],
        ['src/file.ts'],
      );

      expect(result.failedAgents).toBeDefined();
      expect(result.failedAgents).toHaveLength(1);
      expect(result.failedAgents![0].id).toBe('invalid-agent');
      expect(result.failedAgents![0].reason).toBe('Agent not found');
    });

    it('should not include failedAgents when all agents load successfully', async () => {
      vi.mocked(mockRulesService.getAgent!)
        .mockResolvedValueOnce(mockSecurityAgent)
        .mockResolvedValueOnce(mockAccessibilityAgent);

      const result = await service.prepareParallelAgents(
        'EVAL',
        ['security-specialist', 'accessibility-specialist'],
        ['src/file.ts'],
      );

      expect(result.failedAgents).toBeUndefined();
    });

    it('should handle unknown error type in failedAgents', async () => {
      vi.mocked(mockRulesService.getAgent!).mockRejectedValueOnce(
        'string error',
      );

      const result = await service.prepareParallelAgents(
        'EVAL',
        ['invalid-agent'],
        ['src/file.ts'],
      );

      expect(result.failedAgents).toHaveLength(1);
      expect(result.failedAgents![0].reason).toBe('Unknown error');
    });

    it('should deduplicate specialist names', async () => {
      vi.mocked(mockRulesService.getAgent!).mockResolvedValue(
        mockSecurityAgent,
      );

      const result = await service.prepareParallelAgents(
        'EVAL',
        ['security-specialist', 'security-specialist', 'security-specialist'],
        ['src/file.ts'],
      );

      expect(result.agents).toHaveLength(1);
      expect(mockRulesService.getAgent).toHaveBeenCalledTimes(1);
    });

    it('should include parallel execution hint', async () => {
      vi.mocked(mockRulesService.getAgent!).mockResolvedValue(
        mockSecurityAgent,
      );

      const result = await service.prepareParallelAgents(
        'EVAL',
        ['security-specialist'],
        ['src/file.ts'],
      );

      expect(result.parallelExecutionHint).toContain('Task');
      expect(result.parallelExecutionHint).toContain('parallel');
    });

    it('should include task prompt for each agent', async () => {
      vi.mocked(mockRulesService.getAgent!).mockResolvedValue(
        mockSecurityAgent,
      );

      const result = await service.prepareParallelAgents(
        'EVAL',
        ['security-specialist'],
        ['src/auth/login.ts'],
        'Security review task',
      );

      expect(result.agents[0].taskPrompt).toContain('Security Specialist');
      expect(result.agents[0].taskPrompt).toContain('EVAL');
      expect(result.agents[0].taskPrompt).toContain('src/auth/login.ts');
    });

    it('should include short description for Task tool', async () => {
      vi.mocked(mockRulesService.getAgent!).mockResolvedValue(
        mockSecurityAgent,
      );

      const result = await service.prepareParallelAgents(
        'EVAL',
        ['security-specialist'],
        ['src/file.ts'],
      );

      expect(result.agents[0].description).toBeDefined();
      expect(result.agents[0].description.length).toBeLessThanOrEqual(50);
    });
  });

  describe('getRecommendedAgents', () => {
    // Mode defaults (from config) - for testing
    const EVAL_DEFAULTS = [
      'security-specialist',
      'accessibility-specialist',
      'performance-specialist',
      'code-quality-specialist',
    ];
    const PLAN_DEFAULTS = [
      'architecture-specialist',
      'test-strategy-specialist',
    ];

    it('should recommend security for auth files', () => {
      const result = service.getRecommendedAgents([], ['src/auth/login.ts']);

      expect(result).toContain('security-specialist');
    });

    it('should recommend accessibility for UI components', () => {
      const result = service.getRecommendedAgents(
        [],
        ['src/components/Button.tsx'],
      );

      expect(result).toContain('accessibility-specialist');
    });

    it('should recommend performance for page files', () => {
      const result = service.getRecommendedAgents([], ['src/app/page.tsx']);

      expect(result).toContain('performance-specialist');
    });

    it('should return mode defaults when no file patterns match', () => {
      const result = service.getRecommendedAgents(EVAL_DEFAULTS, [
        'src/random/file.ts',
      ]);

      // Returns the mode defaults passed in
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('security-specialist');
    });

    it('should return different defaults for different modes', () => {
      const evalResult = service.getRecommendedAgents(EVAL_DEFAULTS, []);
      const planResult = service.getRecommendedAgents(PLAN_DEFAULTS, []);

      expect(evalResult).not.toEqual(planResult);
    });

    it('should deduplicate recommended agents', () => {
      // Files that match multiple patterns for same agent
      const result = service.getRecommendedAgents(EVAL_DEFAULTS, [
        'src/auth/login.tsx',
        'src/auth/oauth.ts',
      ]);

      const securityCount = result.filter(
        a => a === 'security-specialist',
      ).length;
      expect(securityCount).toBe(1);
    });
  });
});
