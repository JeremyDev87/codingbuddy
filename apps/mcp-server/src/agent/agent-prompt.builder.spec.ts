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
    description: 'OAuth 2.0/OIDC, JWT security, web security vulnerabilities specialist',
    role: {
      title: 'Security Specialist',
      expertise: ['OAuth 2.0/OIDC', 'JWT security', 'XSS/CSRF protection', 'OWASP compliance'],
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

      expect(result).toContain('Review OAuth implementation for security vulnerabilities');
    });

    it('should handle missing target files gracefully', () => {
      const contextWithoutFiles: AgentContext = {
        mode: 'EVAL',
      };
      const result = buildAgentSystemPrompt(mockAgentProfile, contextWithoutFiles);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle missing task description gracefully', () => {
      const contextWithoutTask: AgentContext = {
        mode: 'EVAL',
        targetFiles: ['src/file.ts'],
      };
      const result = buildAgentSystemPrompt(mockAgentProfile, contextWithoutTask);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should include structured output format instructions', () => {
      const result = buildAgentSystemPrompt(mockAgentProfile, mockContext);

      expect(result).toMatch(/output|format|json|structured/i);
    });

    it('should include mandatory_checklist from activation object format', () => {
      const profileWithActivation: AgentProfile = {
        ...mockAgentProfile,
        activation: {
          mandatory_checklist: {
            '🔴 language': {
              rule: 'MUST respond in Korean',
              verification_key: 'language',
            },
            '🔴 tdd': {
              rule: 'Follow TDD cycle',
              verification_key: 'tdd_cycle',
            },
          },
        },
      };
      const result = buildAgentSystemPrompt(profileWithActivation, mockContext);

      expect(result).toContain('## Mandatory Checklist');
      expect(result).toContain('- [ ] MUST respond in Korean');
      expect(result).toContain('- [ ] Follow TDD cycle');
    });

    it('should fall back to top-level array mandatory_checklist (backward compat)', () => {
      const profileWithChecklist: AgentProfile = {
        ...mockAgentProfile,
        mandatory_checklist: [
          'Type safety: no any usage',
          'Test coverage 90%+',
          'SOLID principles applied',
        ],
      };
      const result = buildAgentSystemPrompt(profileWithChecklist, mockContext);

      expect(result).toContain('## Mandatory Checklist');
      expect(result).toContain('- [ ] Type safety: no any usage');
      expect(result).toContain('- [ ] Test coverage 90%+');
      expect(result).toContain('- [ ] SOLID principles applied');
    });

    it('should prefer activation.mandatory_checklist over top-level array', () => {
      const profileWithBoth: AgentProfile = {
        ...mockAgentProfile,
        mandatory_checklist: ['Top-level item'],
        activation: {
          mandatory_checklist: {
            '🔴 check': { rule: 'Activation item', verification_key: 'check' },
          },
        },
      };
      const result = buildAgentSystemPrompt(profileWithBoth, mockContext);

      expect(result).toContain('- [ ] Activation item');
      expect(result).not.toContain('Top-level item');
    });

    it('should include communication language when present', () => {
      const profileWithLang: AgentProfile = {
        ...mockAgentProfile,
        communication: { language: 'Korean' },
      };
      const result = buildAgentSystemPrompt(profileWithLang, mockContext);

      expect(result).toContain('## Communication');
      expect(result).toContain('IMPORTANT: Always respond in Korean.');
    });

    it('should use agent-specific mode instructions when modes field present', () => {
      const profileWithModes: AgentProfile = {
        ...mockAgentProfile,
        modes: {
          eval: {
            focus: ['code quality', 'security'],
            output_format: 'structured review',
          },
        },
      };
      const result = buildAgentSystemPrompt(profileWithModes, mockContext);

      expect(result).toContain('## Mode-Specific Instructions');
      expect(result).toContain('code quality');
      expect(result).toContain('structured review');
      // Should NOT contain generic EVAL instructions
      expect(result).not.toContain('Evaluate and assess the implementation quality');
    });

    it('should fall back to generic mode instructions when agent modes not present', () => {
      const result = buildAgentSystemPrompt(mockAgentProfile, mockContext);

      expect(result).toContain('Evaluate and assess the implementation quality');
      expect(result).not.toContain('## Mode-Specific Instructions');
    });

    it('should include required skills when present', () => {
      const profileWithSkills: AgentProfile = {
        ...mockAgentProfile,
        skills: {
          required: [
            { name: 'todo_write', purpose: 'Track implementation', when: 'Creating plans' },
          ],
          recommended: [
            { name: 'web_search', purpose: 'Validate recommendations', when: 'Evaluating' },
          ],
        },
      };
      const result = buildAgentSystemPrompt(profileWithSkills, mockContext);

      expect(result).toContain('## Required Skills');
      expect(result).toContain('**todo_write**: Track implementation (when: Creating plans)');
      expect(result).toContain('## Recommended Skills');
      expect(result).toContain('**web_search**: Validate recommendations (when: Evaluating)');
    });

    it('should include verification_guide from activation', () => {
      const profileWithActivation: AgentProfile = {
        ...mockAgentProfile,
        activation: {
          verification_guide: {
            tdd_cycle: 'Check test file exists before implementation',
            server_components: 'Verify no use client directive',
          },
        },
      };
      const result = buildAgentSystemPrompt(profileWithActivation, mockContext);

      expect(result).toContain('## Verification Guide');
      expect(result).toContain('**tdd_cycle**: Check test file exists before implementation');
      expect(result).toContain('**server_components**: Verify no use client directive');
    });

    it('should fall back to top-level verification_guide (backward compat)', () => {
      const profileWithVerification: AgentProfile = {
        ...mockAgentProfile,
        verification_guide: {
          steps: 'Check type safety and run tests',
        },
      };
      const result = buildAgentSystemPrompt(profileWithVerification, mockContext);

      expect(result).toContain('## Verification Guide');
      expect(result).toContain('**steps**: Check type safety and run tests');
    });

    it('should include execution_order from activation (object format)', () => {
      const profileWithActivation: AgentProfile = {
        ...mockAgentProfile,
        activation: {
          execution_order: {
            plan_mode: ['1. Analyze requirements', '2. Create plan'],
            act_mode: ['1. Implement changes', '2. Run tests'],
          },
        },
      };
      const result = buildAgentSystemPrompt(profileWithActivation, mockContext);

      expect(result).toContain('## Execution Order');
      expect(result).toContain('### plan_mode');
      expect(result).toContain('1. Analyze requirements');
      expect(result).toContain('### act_mode');
      expect(result).toContain('1. Implement changes');
    });

    it('should include execution_order from activation (array format)', () => {
      const profileWithActivation: AgentProfile = {
        ...mockAgentProfile,
        activation: {
          execution_order: ['Step 1', 'Step 2', 'Step 3'],
        },
      };
      const result = buildAgentSystemPrompt(profileWithActivation, mockContext);

      expect(result).toContain('## Execution Order');
      expect(result).toContain('1. Step 1');
      expect(result).toContain('1. Step 2');
    });

    it('should handle agent without activation field gracefully', () => {
      const result = buildAgentSystemPrompt(mockAgentProfile, mockContext);

      expect(result).not.toContain('## Mandatory Checklist');
      expect(result).not.toContain('## Verification Guide');
      expect(result).not.toContain('## Execution Order');
    });

    it('should handle agent without optional rich metadata gracefully', () => {
      // mockAgentProfile has no mandatory_checklist, modes, skills, etc.
      const result = buildAgentSystemPrompt(mockAgentProfile, mockContext);

      expect(result).toBeDefined();
      expect(result).not.toContain('## Mandatory Checklist');
      expect(result).not.toContain('## Communication');
      expect(result).not.toContain('## Required Skills');
      expect(result).not.toContain('## Recommended Skills');
      expect(result).not.toContain('## Verification Guide');
      expect(result).not.toContain('## Mode-Specific Instructions');
      // Should still have generic mode instructions
      expect(result).toContain('Evaluate and assess the implementation quality');
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
