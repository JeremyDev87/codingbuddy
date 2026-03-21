import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentService } from './agent.service';
import type { RulesService } from '../rules/rules.service';
import type { AgentProfile } from '../rules/rules.types';
import type { AgentContext, DispatchResult } from './agent.types';

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
      expertise: ['Bundle optimization', 'Core Web Vitals', 'Rendering performance'],
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
      vi.mocked(mockRulesService.getAgent!).mockResolvedValue(mockSecurityAgent);

      const result = await service.getAgentSystemPrompt('security-specialist', mockContext);

      expect(result.agentName).toBe('security-specialist');
      expect(result.displayName).toBe('Security Specialist');
      expect(result.systemPrompt).toContain('Security Specialist');
      expect(result.description).toBeDefined();
    });

    it('should include agent expertise in system prompt', async () => {
      vi.mocked(mockRulesService.getAgent!).mockResolvedValue(mockSecurityAgent);

      const result = await service.getAgentSystemPrompt('security-specialist', mockContext);

      expect(result.systemPrompt).toContain('OAuth 2.0');
      expect(result.systemPrompt).toContain('JWT security');
    });

    it('should throw error for unknown agent', async () => {
      vi.mocked(mockRulesService.getAgent!).mockRejectedValue(new Error('Agent not found'));

      await expect(service.getAgentSystemPrompt('unknown-agent', mockContext)).rejects.toThrow();
    });

    it('should apply context to prompt', async () => {
      vi.mocked(mockRulesService.getAgent!).mockResolvedValue(mockSecurityAgent);

      const result = await service.getAgentSystemPrompt('security-specialist', mockContext);

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
        ['security-specialist', 'accessibility-specialist', 'performance-specialist'],
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
      vi.mocked(mockRulesService.getAgent!).mockRejectedValueOnce('string error');

      const result = await service.prepareParallelAgents(
        'EVAL',
        ['invalid-agent'],
        ['src/file.ts'],
      );

      expect(result.failedAgents).toHaveLength(1);
      expect(result.failedAgents![0].reason).toBe('Unknown error');
    });

    it('should deduplicate specialist names', async () => {
      vi.mocked(mockRulesService.getAgent!).mockResolvedValue(mockSecurityAgent);

      const result = await service.prepareParallelAgents(
        'EVAL',
        ['security-specialist', 'security-specialist', 'security-specialist'],
        ['src/file.ts'],
      );

      expect(result.agents).toHaveLength(1);
      expect(mockRulesService.getAgent).toHaveBeenCalledTimes(1);
    });

    it('should include parallel execution hint', async () => {
      vi.mocked(mockRulesService.getAgent!).mockResolvedValue(mockSecurityAgent);

      const result = await service.prepareParallelAgents(
        'EVAL',
        ['security-specialist'],
        ['src/file.ts'],
      );

      expect(result.parallelExecutionHint).toContain('Task');
      expect(result.parallelExecutionHint).toContain('parallel');
    });

    it('should include task prompt for each agent with full verbosity', async () => {
      vi.mocked(mockRulesService.getAgent!).mockResolvedValue(mockSecurityAgent);

      const result = await service.prepareParallelAgents(
        'EVAL',
        ['security-specialist'],
        ['src/auth/login.ts'],
        'Security review task',
        'full',
      );

      expect(result.agents[0].taskPrompt).toBeDefined();
      expect(result.agents[0].taskPrompt).toContain('Security Specialist');
      expect(result.agents[0].taskPrompt).toContain('EVAL');
      expect(result.agents[0].taskPrompt).toContain('src/auth/login.ts');
    });

    it('should include short description for Task tool', async () => {
      vi.mocked(mockRulesService.getAgent!).mockResolvedValue(mockSecurityAgent);

      const result = await service.prepareParallelAgents(
        'EVAL',
        ['security-specialist'],
        ['src/file.ts'],
      );

      expect(result.agents[0].description).toBeDefined();
      expect(result.agents[0].description.length).toBeLessThanOrEqual(50);
    });

    describe('verbosity control', () => {
      it('should include summary only with standard verbosity (default)', async () => {
        vi.mocked(mockRulesService.getAgent!).mockResolvedValue(mockSecurityAgent);

        const result = await service.prepareParallelAgents(
          'EVAL',
          ['security-specialist'],
          ['src/file.ts'],
        );

        expect(result.agents[0].summary).toBeDefined();
        expect(result.agents[0].summary?.expertise).toBeDefined();
        expect(result.agents[0].summary?.primaryFocus).toBeDefined();
        expect(result.agents[0].taskPrompt).toBeUndefined();
      });

      it('should include summary only with minimal verbosity', async () => {
        vi.mocked(mockRulesService.getAgent!).mockResolvedValue(mockSecurityAgent);

        const result = await service.prepareParallelAgents(
          'EVAL',
          ['security-specialist'],
          ['src/file.ts'],
          undefined,
          'minimal',
        );

        expect(result.agents[0].summary).toBeDefined();
        expect(result.agents[0].taskPrompt).toBeUndefined();
      });

      it('should include full taskPrompt with full verbosity', async () => {
        vi.mocked(mockRulesService.getAgent!).mockResolvedValue(mockSecurityAgent);

        const result = await service.prepareParallelAgents(
          'EVAL',
          ['security-specialist'],
          ['src/file.ts'],
          undefined,
          'full',
        );

        expect(result.agents[0].taskPrompt).toBeDefined();
        expect(result.agents[0].taskPrompt).toContain('Security Specialist');
        expect(result.agents[0].summary).toBeUndefined();
      });

      it('should truncate expertise in summary to 5 items', async () => {
        const agentWithManyExpertise: typeof mockSecurityAgent = {
          ...mockSecurityAgent,
          role: {
            ...mockSecurityAgent.role,
            expertise: ['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5', 'Item 6', 'Item 7'],
          },
        };

        vi.mocked(mockRulesService.getAgent!).mockResolvedValue(agentWithManyExpertise);

        const result = await service.prepareParallelAgents(
          'EVAL',
          ['security-specialist'],
          ['src/file.ts'],
          undefined,
          'standard',
        );

        expect(result.agents[0].summary?.expertise).toHaveLength(5);
      });

      it('should include primaryFocus in summary', async () => {
        vi.mocked(mockRulesService.getAgent!).mockResolvedValue(mockSecurityAgent);

        const result = await service.prepareParallelAgents(
          'EVAL',
          ['security-specialist'],
          ['src/file.ts'],
          undefined,
          'standard',
        );

        expect(result.agents[0].summary?.primaryFocus).toBeDefined();
        expect(typeof result.agents[0].summary?.primaryFocus).toBe('string');
      });

      it('should indicate fullPromptAvailable in summary', async () => {
        vi.mocked(mockRulesService.getAgent!).mockResolvedValue(mockSecurityAgent);

        const result = await service.prepareParallelAgents(
          'EVAL',
          ['security-specialist'],
          ['src/file.ts'],
          undefined,
          'standard',
        );

        expect(result.agents[0].summary?.fullPromptAvailable).toBe(true);
      });
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
    const PLAN_DEFAULTS = ['architecture-specialist', 'test-strategy-specialist'];

    it('should recommend security for auth files', () => {
      const result = service.getRecommendedAgents([], ['src/auth/login.ts']);

      expect(result).toContain('security-specialist');
    });

    it('should recommend accessibility for UI components', () => {
      const result = service.getRecommendedAgents([], ['src/components/Button.tsx']);

      expect(result).toContain('accessibility-specialist');
    });

    it('should recommend performance for page files', () => {
      const result = service.getRecommendedAgents([], ['src/app/page.tsx']);

      expect(result).toContain('performance-specialist');
    });

    it('should return mode defaults when no file patterns match', () => {
      const result = service.getRecommendedAgents(EVAL_DEFAULTS, ['src/random/file.ts']);

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

      const securityCount = result.filter(a => a === 'security-specialist').length;
      expect(securityCount).toBe(1);
    });

    describe('migration file patterns', () => {
      it('should recommend migration-specialist for migration files', () => {
        const result = service.getRecommendedAgents([], ['src/migrations/001_init.ts']);

        expect(result).toContain('migration-specialist');
      });

      it('should recommend migration-specialist and data-engineer for migration files', () => {
        const result = service.getRecommendedAgents([], ['db/migration/add-users-table.ts']);

        expect(result).toContain('migration-specialist');
        expect(result).toContain('data-engineer');
      });

      it('should recommend migration-specialist for legacy files', () => {
        const result = service.getRecommendedAgents([], ['src/legacy/old-service.ts']);

        expect(result).toContain('migration-specialist');
        expect(result).toContain('architecture-specialist');
      });

      it('should recommend migration-specialist for upgrade scripts', () => {
        const result = service.getRecommendedAgents([], ['scripts/upgrade-v2.ts']);

        expect(result).toContain('migration-specialist');
      });

      it('should recommend migration-specialist for deprecation files', () => {
        const result = service.getRecommendedAgents([], ['src/deprecated/old-api.ts']);

        expect(result).toContain('migration-specialist');
      });

      it('should recommend migration-specialist for rollback scripts', () => {
        const result = service.getRecommendedAgents([], ['scripts/rollback-migration.ts']);

        expect(result).toContain('migration-specialist');
      });

      it('should recommend migration-specialist for cutover files', () => {
        const result = service.getRecommendedAgents([], ['scripts/cutover-to-new-system.ts']);

        expect(result).toContain('migration-specialist');
      });

      it('should recommend migration-specialist for versioning files', () => {
        const result = service.getRecommendedAgents([], ['src/api/versioning/v2-handler.ts']);

        expect(result).toContain('migration-specialist');
        expect(result).toContain('integration-specialist');
      });
    });
  });

  describe('dispatchAgents', () => {
    it('should dispatch primary agent with Task-tool-ready params', async () => {
      vi.mocked(mockRulesService.getAgent!).mockResolvedValue(mockSecurityAgent);

      const result: DispatchResult = await service.dispatchAgents({
        mode: 'EVAL',
        primaryAgent: 'security-specialist',
        taskDescription: 'Security review',
      });

      expect(result.primaryAgent).toBeDefined();
      expect(result.primaryAgent!.name).toBe('security-specialist');
      expect(result.primaryAgent!.displayName).toBe('Security Specialist');
      expect(result.primaryAgent!.dispatchParams.subagent_type).toBe('general-purpose');
      expect(result.primaryAgent!.dispatchParams.prompt).toContain('Security Specialist');
      expect(result.primaryAgent!.dispatchParams.description).toBeDefined();
    });

    it('should dispatch parallel agents with run_in_background', async () => {
      vi.mocked(mockRulesService.getAgent!)
        .mockResolvedValueOnce(mockSecurityAgent)
        .mockResolvedValueOnce(mockAccessibilityAgent);

      const result = await service.dispatchAgents({
        mode: 'EVAL',
        specialists: ['security-specialist', 'accessibility-specialist'],
        includeParallel: true,
        taskDescription: 'Code review',
      });

      expect(result.parallelAgents).toBeDefined();
      expect(result.parallelAgents).toHaveLength(2);
      expect(result.parallelAgents![0].dispatchParams.run_in_background).toBe(true);
      expect(result.parallelAgents![1].dispatchParams.run_in_background).toBe(true);
    });

    it('should dispatch both primary and parallel agents', async () => {
      vi.mocked(mockRulesService.getAgent!)
        .mockResolvedValueOnce(mockSecurityAgent) // primary
        .mockResolvedValueOnce(mockAccessibilityAgent) // parallel
        .mockResolvedValueOnce(mockPerformanceAgent); // parallel

      const result = await service.dispatchAgents({
        mode: 'EVAL',
        primaryAgent: 'security-specialist',
        specialists: ['accessibility-specialist', 'performance-specialist'],
        includeParallel: true,
      });

      expect(result.primaryAgent).toBeDefined();
      expect(result.primaryAgent!.name).toBe('security-specialist');
      expect(result.parallelAgents).toHaveLength(2);
    });

    it('should include executionHint', async () => {
      vi.mocked(mockRulesService.getAgent!).mockResolvedValue(mockSecurityAgent);

      const result = await service.dispatchAgents({
        mode: 'EVAL',
        primaryAgent: 'security-specialist',
      });

      expect(result.executionHint).toBeDefined();
      expect(result.executionHint).toContain('Task');
    });

    it('should handle failed parallel agents gracefully', async () => {
      vi.mocked(mockRulesService.getAgent!)
        .mockResolvedValueOnce(mockSecurityAgent)
        .mockRejectedValueOnce(new Error('Agent not found'));

      const result = await service.dispatchAgents({
        mode: 'EVAL',
        specialists: ['security-specialist', 'invalid-agent'],
        includeParallel: true,
      });

      expect(result.parallelAgents).toHaveLength(1);
      expect(result.failedAgents).toHaveLength(1);
      expect(result.failedAgents![0].id).toBe('invalid-agent');
    });

    it('should pass targetFiles to agent context', async () => {
      vi.mocked(mockRulesService.getAgent!).mockResolvedValue(mockSecurityAgent);

      const result = await service.dispatchAgents({
        mode: 'EVAL',
        primaryAgent: 'security-specialist',
        targetFiles: ['src/auth/login.ts'],
        taskDescription: 'Review auth',
      });

      expect(result.primaryAgent!.dispatchParams.prompt).toContain('src/auth/login.ts');
    });

    it('should return empty result when no agents specified', async () => {
      const result = await service.dispatchAgents({
        mode: 'EVAL',
      });

      expect(result.primaryAgent).toBeUndefined();
      expect(result.parallelAgents).toBeUndefined();
      expect(result.executionHint).toBeDefined();
    });

    it('should not include primary agent as run_in_background', async () => {
      vi.mocked(mockRulesService.getAgent!).mockResolvedValue(mockSecurityAgent);

      const result = await service.dispatchAgents({
        mode: 'EVAL',
        primaryAgent: 'security-specialist',
      });

      expect(result.primaryAgent!.dispatchParams.run_in_background).toBeUndefined();
    });

    it('should track failed primary agent in failedAgents', async () => {
      vi.mocked(mockRulesService.getAgent!).mockRejectedValue(new Error('Agent not found'));

      const result = await service.dispatchAgents({
        mode: 'EVAL',
        primaryAgent: 'nonexistent-agent',
      });

      expect(result.primaryAgent).toBeUndefined();
      expect(result.failedAgents).toBeDefined();
      expect(result.failedAgents).toHaveLength(1);
      expect(result.failedAgents![0].id).toBe('nonexistent-agent');
      expect(result.failedAgents![0].reason).toBe('Agent not found');
    });

    it('should deduplicate parallel specialists', async () => {
      vi.mocked(mockRulesService.getAgent!).mockResolvedValue(mockSecurityAgent);

      const result = await service.dispatchAgents({
        mode: 'EVAL',
        specialists: ['security-specialist', 'security-specialist'],
        includeParallel: true,
      });

      expect(result.parallelAgents).toHaveLength(1);
    });
  });

  describe('dispatchAgents with taskmaestro strategy', () => {
    it('should return taskmaestro field with assignments when strategy is taskmaestro', async () => {
      vi.mocked(mockRulesService.getAgent!)
        .mockResolvedValueOnce(mockSecurityAgent)
        .mockResolvedValueOnce(mockPerformanceAgent);

      const result = await service.dispatchAgents({
        mode: 'EVAL',
        specialists: ['security-specialist', 'performance-specialist'],
        executionStrategy: 'taskmaestro',
      });

      expect(result.taskmaestro).toBeDefined();
      expect(result.taskmaestro!.paneCount).toBe(2);
      expect(result.taskmaestro!.assignments).toHaveLength(2);
      expect(result.taskmaestro!.sessionName).toBe('eval-specialists');
      expect(result.executionStrategy).toBe('taskmaestro');
    });

    it('should not include parallelAgents when strategy is taskmaestro', async () => {
      vi.mocked(mockRulesService.getAgent!).mockResolvedValueOnce(mockSecurityAgent);

      const result = await service.dispatchAgents({
        mode: 'EVAL',
        specialists: ['security-specialist'],
        executionStrategy: 'taskmaestro',
      });

      expect(result.parallelAgents).toBeUndefined();
      expect(result.taskmaestro).toBeDefined();
    });

    it('should include task description and target files in taskmaestro prompt', async () => {
      vi.mocked(mockRulesService.getAgent!).mockResolvedValueOnce(mockSecurityAgent);

      const result = await service.dispatchAgents({
        mode: 'EVAL',
        specialists: ['security-specialist'],
        executionStrategy: 'taskmaestro',
        taskDescription: 'Review auth flow',
        targetFiles: ['src/auth.ts', 'src/middleware.ts'],
      });

      const prompt = result.taskmaestro!.assignments[0].prompt;
      expect(prompt).toContain('Review auth flow');
      expect(prompt).toContain('src/auth.ts');
      expect(prompt).toContain('src/middleware.ts');
    });

    it('should include execution hint with correct pane count', async () => {
      vi.mocked(mockRulesService.getAgent!)
        .mockResolvedValueOnce(mockSecurityAgent)
        .mockResolvedValueOnce(mockAccessibilityAgent)
        .mockResolvedValueOnce(mockPerformanceAgent);

      const result = await service.dispatchAgents({
        mode: 'PLAN',
        specialists: [
          'architecture-specialist',
          'test-strategy-specialist',
          'integration-specialist',
        ],
        executionStrategy: 'taskmaestro',
      });

      expect(result.executionHint).toContain('/taskmaestro start --panes 3');
      expect(result.executionHint).toContain('/taskmaestro assign');
    });

    it('should set sessionName based on mode', async () => {
      vi.mocked(mockRulesService.getAgent!).mockResolvedValueOnce(mockSecurityAgent);
      const planResult = await service.dispatchAgents({
        mode: 'PLAN',
        specialists: ['architecture-specialist'],
        executionStrategy: 'taskmaestro',
      });
      expect(planResult.taskmaestro!.sessionName).toBe('plan-specialists');

      vi.mocked(mockRulesService.getAgent!).mockResolvedValueOnce(mockSecurityAgent);
      const actResult = await service.dispatchAgents({
        mode: 'ACT',
        specialists: ['code-quality-specialist'],
        executionStrategy: 'taskmaestro',
      });
      expect(actResult.taskmaestro!.sessionName).toBe('act-specialists');
    });

    it('should still return subagent format when strategy is subagent', async () => {
      vi.mocked(mockRulesService.getAgent!).mockResolvedValueOnce(mockSecurityAgent);

      const result = await service.dispatchAgents({
        mode: 'EVAL',
        specialists: ['security-specialist'],
        executionStrategy: 'subagent',
        includeParallel: true,
      });

      expect(result.parallelAgents).toBeDefined();
      expect(result.taskmaestro).toBeUndefined();
      expect(result.executionStrategy).toBe('subagent');
    });
  });

  describe('execution strategy integration', () => {
    it('subagent strategy returns parallelAgents with dispatchParams and run_in_background', async () => {
      vi.mocked(mockRulesService.getAgent!)
        .mockResolvedValueOnce(mockSecurityAgent)
        .mockResolvedValueOnce(mockPerformanceAgent);

      const result = await service.dispatchAgents({
        mode: 'EVAL',
        specialists: ['security-specialist', 'performance-specialist'],
        executionStrategy: 'subagent',
        includeParallel: true,
      });

      expect(result.executionStrategy).toBe('subagent');
      expect(result.parallelAgents).toBeDefined();
      expect(result.parallelAgents!.length).toBe(2);
      result.parallelAgents!.forEach(agent => {
        expect(agent.dispatchParams).toBeDefined();
        expect(agent.dispatchParams.subagent_type).toBe('general-purpose');
        expect(agent.dispatchParams.run_in_background).toBe(true);
        expect(agent.dispatchParams.prompt).toBeTruthy();
      });
      expect(result.taskmaestro).toBeUndefined();
    });

    it('taskmaestro strategy returns assignments without dispatchParams', async () => {
      vi.mocked(mockRulesService.getAgent!)
        .mockResolvedValueOnce(mockSecurityAgent)
        .mockResolvedValueOnce(mockPerformanceAgent);

      const result = await service.dispatchAgents({
        mode: 'EVAL',
        specialists: ['security-specialist', 'performance-specialist'],
        executionStrategy: 'taskmaestro',
      });

      expect(result.executionStrategy).toBe('taskmaestro');
      expect(result.taskmaestro).toBeDefined();
      expect(result.taskmaestro!.paneCount).toBe(2);
      expect(result.taskmaestro!.assignments).toHaveLength(2);
      result.taskmaestro!.assignments.forEach(assignment => {
        expect(assignment.name).toBeTruthy();
        expect(assignment.displayName).toBeTruthy();
        expect(assignment.prompt).toBeTruthy();
      });
      expect(result.parallelAgents).toBeUndefined();
    });

    it('backward compatibility: no executionStrategy defaults to subagent behavior', async () => {
      vi.mocked(mockRulesService.getAgent!).mockResolvedValueOnce(mockSecurityAgent);

      const result = await service.dispatchAgents({
        mode: 'EVAL',
        specialists: ['security-specialist'],
        includeParallel: true,
        // NO executionStrategy — must default to subagent
      });

      expect(result.executionStrategy).toBe('subagent');
      expect(result.parallelAgents).toBeDefined();
      expect(result.taskmaestro).toBeUndefined();
    });

    it('taskmaestro sessionName reflects the mode', async () => {
      const modes = ['PLAN', 'ACT', 'EVAL', 'AUTO'] as const;
      for (const mode of modes) {
        vi.mocked(mockRulesService.getAgent!).mockResolvedValueOnce(mockSecurityAgent);
        const result = await service.dispatchAgents({
          mode,
          specialists: ['security-specialist'],
          executionStrategy: 'taskmaestro',
        });
        expect(result.taskmaestro!.sessionName).toBe(`${mode.toLowerCase()}-specialists`);
      }
    });

    it('taskmaestro prompt includes Output Format instructions', async () => {
      vi.mocked(mockRulesService.getAgent!).mockResolvedValueOnce(mockSecurityAgent);

      const result = await service.dispatchAgents({
        mode: 'EVAL',
        specialists: ['security-specialist'],
        executionStrategy: 'taskmaestro',
      });

      const prompt = result.taskmaestro!.assignments[0].prompt;
      expect(prompt).toContain('Severity: CRITICAL / HIGH / MEDIUM / LOW / INFO');
      expect(prompt).toContain('File reference');
      expect(prompt).toContain('Recommendation');
    });

    it('taskmaestro executionHint includes all required commands', async () => {
      vi.mocked(mockRulesService.getAgent!)
        .mockResolvedValueOnce(mockSecurityAgent)
        .mockResolvedValueOnce(mockPerformanceAgent);

      const result = await service.dispatchAgents({
        mode: 'EVAL',
        specialists: ['security-specialist', 'performance-specialist'],
        executionStrategy: 'taskmaestro',
      });

      expect(result.executionHint).toContain('/taskmaestro start --panes 2');
      expect(result.executionHint).toContain('/taskmaestro assign');
      expect(result.executionHint).toContain('/taskmaestro status');
      expect(result.executionHint).toContain('/taskmaestro stop all');
    });
  });
});
