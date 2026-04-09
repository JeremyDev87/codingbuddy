import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActivateHandler } from './activate.handler';
import type { AgentService } from '../../agent/agent.service';
import type { TeamsCapabilityService } from '../../agent/teams-capability.service';
import type { KeywordService } from '../../keyword/keyword.service';
import type { RulesService } from '../../rules/rules.service';

function createMockKeywordService(): KeywordService {
  return {
    getRulesForMode: vi.fn().mockResolvedValue([
      { name: 'rules/core.md', content: '# Core rules' },
      { name: 'rules/augmented-coding.md', content: '# Augmented coding' },
    ]),
  } as unknown as KeywordService;
}

function createMockAgentService(): AgentService {
  return {
    getAgentSystemPrompt: vi.fn().mockResolvedValue({
      agentName: 'plan-mode-agent',
      displayName: 'Plan Mode Agent',
      systemPrompt: 'You are a planning agent...',
      description: 'Planning specialist',
    }),
    prepareParallelAgents: vi.fn().mockResolvedValue({
      agents: [
        {
          id: 'security-specialist',
          displayName: 'Security Specialist',
          taskPrompt: 'Analyze security...',
          description: 'Security analysis',
        },
        {
          id: 'architecture-specialist',
          displayName: 'Architecture Specialist',
          taskPrompt: 'Review architecture...',
          description: 'Architecture review',
        },
      ],
      parallelExecutionHint: 'Use Task tool...',
    }),
  } as unknown as AgentService;
}

function createMockRulesService(): RulesService {
  return {
    getRuleContent: vi.fn().mockResolvedValue(
      JSON.stringify({
        modes: {
          PLAN: {
            defaultSpecialists: ['architecture-specialist', 'test-strategy-specialist'],
          },
          ACT: { defaultSpecialists: ['code-quality-specialist'] },
          EVAL: {
            defaultSpecialists: ['security-specialist', 'performance-specialist'],
          },
          AUTO: { defaultSpecialists: ['architecture-specialist'] },
        },
      }),
    ),
  } as unknown as RulesService;
}

function createMockTeamsCapability(available = true): TeamsCapabilityService {
  return {
    getStatus: vi.fn().mockResolvedValue({
      available,
      reason: available ? 'Auto-enabled: Claude Code environment detected' : 'Disabled by default',
      source: available ? 'claude-native' : 'default',
    }),
  } as unknown as TeamsCapabilityService;
}

describe('ActivateHandler', () => {
  let handler: ActivateHandler;
  let keywordService: KeywordService;
  let agentService: AgentService;
  let rulesService: RulesService;
  let teamsCapability: TeamsCapabilityService;

  beforeEach(() => {
    keywordService = createMockKeywordService();
    agentService = createMockAgentService();
    rulesService = createMockRulesService();
    teamsCapability = createMockTeamsCapability();
    handler = new ActivateHandler(keywordService, agentService, rulesService, teamsCapability);
  });

  describe('getToolDefinitions', () => {
    it('should define the activate tool', () => {
      const definitions = handler.getToolDefinitions();
      expect(definitions).toHaveLength(1);
      expect(definitions[0].name).toBe('activate');
    });

    it('should require prompt parameter', () => {
      const definitions = handler.getToolDefinitions();
      expect(definitions[0].inputSchema.required).toEqual(['prompt']);
    });

    it('should have mode and primaryAgent as optional', () => {
      const definitions = handler.getToolDefinitions();
      const props = definitions[0].inputSchema.properties;
      expect(props).toHaveProperty('prompt');
      expect(props).toHaveProperty('mode');
      expect(props).toHaveProperty('primaryAgent');
    });
  });

  describe('handle', () => {
    it('should return null for unknown tools', async () => {
      const result = await handler.handle('unknown_tool', {});
      expect(result).toBeNull();
    });

    it('should return error for missing prompt', async () => {
      const result = await handler.handle('activate', {});
      expect(result?.isError).toBe(true);
      expect(result?.content[0].text).toContain('Missing required parameter: prompt');
    });

    it('should return complete response for valid prompt', async () => {
      const result = await handler.handle('activate', {
        prompt: 'PLAN design auth feature',
      });

      expect(result).not.toBeNull();
      expect(result?.isError).toBeFalsy();

      const data = JSON.parse(result!.content[0].text);
      expect(data.mode).toBe('PLAN');
      expect(data.rules).toBeDefined();
      expect(data.primaryAgent).toBeDefined();
      expect(data.specialists).toBeDefined();
      expect(data.discussion).toBeDefined();
      expect(data.nativeIntegration).toBeDefined();
    });
  });

  describe('mode resolution', () => {
    it('should auto-detect PLAN from prompt', async () => {
      const result = await handler.handle('activate', { prompt: 'PLAN design auth' });
      const data = JSON.parse(result!.content[0].text);
      expect(data.mode).toBe('PLAN');
    });

    it('should auto-detect ACT from prompt', async () => {
      const result = await handler.handle('activate', { prompt: 'ACT implement the feature' });
      const data = JSON.parse(result!.content[0].text);
      expect(data.mode).toBe('ACT');
    });

    it('should auto-detect EVAL from prompt', async () => {
      const result = await handler.handle('activate', { prompt: 'EVAL review the code' });
      const data = JSON.parse(result!.content[0].text);
      expect(data.mode).toBe('EVAL');
    });

    it('should use explicit mode parameter over prompt keyword', async () => {
      const result = await handler.handle('activate', {
        prompt: 'PLAN some task',
        mode: 'EVAL',
      });
      const data = JSON.parse(result!.content[0].text);
      expect(data.mode).toBe('EVAL');
    });

    it('should default to PLAN when no keyword found', async () => {
      const result = await handler.handle('activate', { prompt: 'design auth feature' });
      const data = JSON.parse(result!.content[0].text);
      expect(data.mode).toBe('PLAN');
    });

    it('should support Korean keywords', async () => {
      const result = await handler.handle('activate', { prompt: '실행 인증 기능 구현' });
      const data = JSON.parse(result!.content[0].text);
      expect(data.mode).toBe('ACT');
    });
  });

  describe('rules loading', () => {
    it('should call getRulesForMode with detected mode', async () => {
      await handler.handle('activate', { prompt: 'EVAL review code' });
      expect(keywordService.getRulesForMode).toHaveBeenCalledWith('EVAL', 'standard');
    });

    it('should include rules in response', async () => {
      const result = await handler.handle('activate', { prompt: 'PLAN task' });
      const data = JSON.parse(result!.content[0].text);
      expect(data.rules).toHaveLength(2);
      expect(data.rules[0]).toHaveProperty('name');
      expect(data.rules[0]).toHaveProperty('content');
    });
  });

  describe('primary agent resolution', () => {
    it('should resolve default primary agent for mode', async () => {
      await handler.handle('activate', { prompt: 'PLAN task' });
      expect(agentService.getAgentSystemPrompt).toHaveBeenCalledWith(
        'plan-mode-agent',
        expect.objectContaining({ mode: 'PLAN' }),
      );
    });

    it('should use explicit primaryAgent parameter', async () => {
      await handler.handle('activate', {
        prompt: 'PLAN task',
        primaryAgent: 'solution-architect',
      });
      expect(agentService.getAgentSystemPrompt).toHaveBeenCalledWith(
        'solution-architect',
        expect.objectContaining({ mode: 'PLAN' }),
      );
    });

    it('should include primaryAgent in response', async () => {
      const result = await handler.handle('activate', { prompt: 'PLAN task' });
      const data = JSON.parse(result!.content[0].text);
      expect(data.primaryAgent).toEqual({
        name: 'plan-mode-agent',
        displayName: 'Plan Mode Agent',
        systemPrompt: 'You are a planning agent...',
      });
    });

    it('should handle primary agent resolution failure gracefully', async () => {
      (agentService.getAgentSystemPrompt as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Agent not found'),
      );
      const result = await handler.handle('activate', { prompt: 'PLAN task' });
      const data = JSON.parse(result!.content[0].text);
      expect(data.primaryAgent).toBeNull();
    });
  });

  describe('specialist resolution', () => {
    it('should load default specialists from keyword-modes.json', async () => {
      await handler.handle('activate', { prompt: 'PLAN task' });
      expect(rulesService.getRuleContent).toHaveBeenCalledWith('keyword-modes.json');
    });

    it('should merge mode defaults with context-aware patterns', async () => {
      const result = await handler.handle('activate', {
        prompt: 'PLAN design authentication with JWT security',
      });
      const data = JSON.parse(result!.content[0].text);
      // Should include both mode defaults (architecture, test-strategy)
      // and context-detected (security from "authentication" + "security")
      const specialistNames = data.specialists.map((s: { name: string }) => s.name);
      expect(specialistNames.length).toBeGreaterThan(0);
    });

    it('should prepare specialists with full verbosity', async () => {
      await handler.handle('activate', { prompt: 'PLAN task' });
      expect(agentService.prepareParallelAgents).toHaveBeenCalledWith(
        'PLAN',
        expect.any(Array),
        undefined,
        expect.any(String),
        'full',
      );
    });

    it('should include specialist prompts and domains in response', async () => {
      const result = await handler.handle('activate', { prompt: 'PLAN task' });
      const data = JSON.parse(result!.content[0].text);
      expect(data.specialists.length).toBeGreaterThan(0);
      for (const specialist of data.specialists) {
        expect(specialist).toHaveProperty('name');
        expect(specialist).toHaveProperty('displayName');
        expect(specialist).toHaveProperty('prompt');
        expect(specialist).toHaveProperty('domain');
      }
    });
  });

  describe('discussion format', () => {
    it('should include discussion guide in response', async () => {
      const result = await handler.handle('activate', { prompt: 'PLAN task' });
      const data = JSON.parse(result!.content[0].text);
      expect(data.discussion).toEqual({
        format: 'Each specialist: approve|concern|reject + reasoning + suggestedChanges',
        consensus: 'No rejections = consensus reached',
        crossReview: "Specialists review each other's opinions",
      });
    });
  });

  describe('native integration', () => {
    it('should indicate Teams available when enabled', async () => {
      const result = await handler.handle('activate', { prompt: 'PLAN task' });
      const data = JSON.parse(result!.content[0].text);
      expect(data.nativeIntegration.teams).toContain('native Teams');
    });

    it('should indicate how to enable Teams when disabled', async () => {
      handler = new ActivateHandler(
        keywordService,
        agentService,
        rulesService,
        createMockTeamsCapability(false),
      );
      const result = await handler.handle('activate', { prompt: 'PLAN task' });
      const data = JSON.parse(result!.content[0].text);
      expect(data.nativeIntegration.teams).toContain('CODINGBUDDY_TEAMS_ENABLED');
    });

    it('should include Memory and orchestration guidance', async () => {
      const result = await handler.handle('activate', { prompt: 'PLAN task' });
      const data = JSON.parse(result!.content[0].text);
      expect(data.nativeIntegration.memory).toContain('Memory');
      expect(data.nativeIntegration.orchestration).toContain('natively');
    });
  });
});
