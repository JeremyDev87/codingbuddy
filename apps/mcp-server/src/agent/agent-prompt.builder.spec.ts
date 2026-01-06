import { describe, it, expect } from 'vitest';
import {
  buildAgentSystemPrompt,
  buildTaskDescription,
  buildParallelExecutionHint,
} from './agent-prompt.builder';
import type { AgentProfile } from '../rules/rules.types';
import type { AgentContext } from './agent.types';

describe('agent-prompt.builder', () => {
  const mockAgentProfile: AgentProfile = {
    name: 'Security Specialist',
    description:
      'OAuth 2.0/OIDC, JWT security, web security vulnerabilities specialist',
    role: {
      title: 'Security Specialist',
      expertise: [
        'OAuth 2.0/OIDC',
        'JWT security',
        'XSS/CSRF protection',
        'OWASP compliance',
      ],
      responsibilities: [
        'Review authentication and authorization code',
        'Identify security vulnerabilities',
        'Provide remediation recommendations',
      ],
    },
  };

  const mockContext: AgentContext = {
    mode: 'EVAL',
    targetFiles: ['src/auth/login.ts', 'src/auth/oauth.ts'],
    taskDescription: 'Review OAuth implementation for security vulnerabilities',
  };

  describe('buildAgentSystemPrompt', () => {
    it('should include agent name in prompt', () => {
      const result = buildAgentSystemPrompt(mockAgentProfile, mockContext);

      expect(result).toContain('Security Specialist');
    });

    it('should include agent expertise from profile', () => {
      const result = buildAgentSystemPrompt(mockAgentProfile, mockContext);

      expect(result).toContain('OAuth 2.0/OIDC');
      expect(result).toContain('JWT security');
      expect(result).toContain('XSS/CSRF protection');
    });

    it('should include agent responsibilities', () => {
      const result = buildAgentSystemPrompt(mockAgentProfile, mockContext);

      expect(result).toContain('Review authentication and authorization code');
      expect(result).toContain('Identify security vulnerabilities');
    });

    it('should include mode-specific instructions for EVAL', () => {
      const result = buildAgentSystemPrompt(mockAgentProfile, mockContext);

      expect(result).toContain('EVAL');
      expect(result).toMatch(/evaluat|review|assess/i);
    });

    it('should include mode-specific instructions for PLAN', () => {
      const planContext: AgentContext = {
        ...mockContext,
        mode: 'PLAN',
      };
      const result = buildAgentSystemPrompt(mockAgentProfile, planContext);

      expect(result).toContain('PLAN');
      expect(result).toMatch(/plan|design|architect/i);
    });

    it('should include mode-specific instructions for ACT', () => {
      const actContext: AgentContext = {
        ...mockContext,
        mode: 'ACT',
      };
      const result = buildAgentSystemPrompt(mockAgentProfile, actContext);

      expect(result).toContain('ACT');
      expect(result).toMatch(/implement|verify|check/i);
    });

    it('should include target files in context', () => {
      const result = buildAgentSystemPrompt(mockAgentProfile, mockContext);

      expect(result).toContain('src/auth/login.ts');
      expect(result).toContain('src/auth/oauth.ts');
    });

    it('should include task description', () => {
      const result = buildAgentSystemPrompt(mockAgentProfile, mockContext);

      expect(result).toContain(
        'Review OAuth implementation for security vulnerabilities',
      );
    });

    it('should handle missing target files gracefully', () => {
      const contextWithoutFiles: AgentContext = {
        mode: 'EVAL',
      };
      const result = buildAgentSystemPrompt(
        mockAgentProfile,
        contextWithoutFiles,
      );

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle missing task description gracefully', () => {
      const contextWithoutTask: AgentContext = {
        mode: 'EVAL',
        targetFiles: ['src/file.ts'],
      };
      const result = buildAgentSystemPrompt(
        mockAgentProfile,
        contextWithoutTask,
      );

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should include structured output format instructions', () => {
      const result = buildAgentSystemPrompt(mockAgentProfile, mockContext);

      expect(result).toMatch(/output|format|json|structured/i);
    });
  });

  describe('buildTaskDescription', () => {
    it('should create short description with agent name', () => {
      const result = buildTaskDescription(mockAgentProfile, mockContext);

      expect(result).toContain('Security');
    });

    it('should include mode in description', () => {
      const result = buildTaskDescription(mockAgentProfile, mockContext);

      expect(result.toLowerCase()).toMatch(/review|eval|assessment/);
    });

    it('should be concise (under 50 characters)', () => {
      const result = buildTaskDescription(mockAgentProfile, mockContext);

      expect(result.length).toBeLessThanOrEqual(50);
    });

    it('should vary by mode', () => {
      const evalResult = buildTaskDescription(mockAgentProfile, {
        ...mockContext,
        mode: 'EVAL',
      });
      const planResult = buildTaskDescription(mockAgentProfile, {
        ...mockContext,
        mode: 'PLAN',
      });
      const actResult = buildTaskDescription(mockAgentProfile, {
        ...mockContext,
        mode: 'ACT',
      });

      // Each mode should produce different description
      expect(evalResult).not.toEqual(planResult);
      expect(evalResult).not.toEqual(actResult);
    });
  });

  describe('buildParallelExecutionHint', () => {
    it('should include Task tool reference', () => {
      const result = buildParallelExecutionHint();

      expect(result).toContain('Task');
    });

    it('should mention run_in_background', () => {
      const result = buildParallelExecutionHint();

      expect(result).toContain('run_in_background');
    });

    it('should mention parallel execution', () => {
      const result = buildParallelExecutionHint();

      expect(result.toLowerCase()).toContain('parallel');
    });

    it('should mention general-purpose subagent type', () => {
      const result = buildParallelExecutionHint();

      expect(result).toContain('general-purpose');
    });
  });
});
