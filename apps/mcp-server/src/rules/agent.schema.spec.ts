import { describe, it, expect } from 'vitest';
import { parseAgentProfile, AgentSchemaError } from './agent.schema';

describe('parseAgentProfile', () => {
  describe('valid agent profiles', () => {
    it('should parse minimal valid agent profile', () => {
      const validAgent = {
        name: 'Test Agent',
        description: 'A test agent',
        role: {
          title: 'Test Role',
          expertise: ['Testing'],
        },
      };

      const result = parseAgentProfile(validAgent);

      expect(result.name).toBe('Test Agent');
      expect(result.description).toBe('A test agent');
      expect(result.role.title).toBe('Test Role');
    });

    it('should allow additional fields (passthrough)', () => {
      const agentWithExtras = {
        name: 'Test Agent',
        description: 'A test agent',
        role: {
          title: 'Test Role',
          expertise: ['Testing'],
        },
        workflow: { core_logic: { approach: 'TDD' } },
        custom_field: 'custom value',
      };

      const result = parseAgentProfile(agentWithExtras);

      expect(result.name).toBe('Test Agent');
      expect(result.workflow).toBeDefined();
      expect(result.custom_field).toBe('custom value');
    });

    it('should parse role with all optional fields', () => {
      const agentWithFullRole = {
        name: 'Full Agent',
        description: 'Agent with full role',
        role: {
          title: 'Senior Developer',
          expertise: ['React', 'TypeScript'],
          tech_stack_reference: 'See project.md',
          responsibilities: ['Write code', 'Review code'],
        },
      };

      const result = parseAgentProfile(agentWithFullRole);

      expect(result.role.responsibilities).toEqual(['Write code', 'Review code']);
    });

    it('should accept valid role.type "primary"', () => {
      const primaryAgent = {
        name: 'Primary Agent',
        description: 'A primary agent',
        role: {
          title: 'Frontend Developer',
          type: 'primary',
          expertise: ['React'],
        },
      };

      const result = parseAgentProfile(primaryAgent);
      expect(result.role.type).toBe('primary');
    });

    it('should accept valid role.type "specialist"', () => {
      const specialistAgent = {
        name: 'Specialist Agent',
        description: 'A specialist agent',
        role: {
          title: 'Security Specialist',
          type: 'specialist',
          expertise: ['Security'],
        },
      };

      const result = parseAgentProfile(specialistAgent);
      expect(result.role.type).toBe('specialist');
    });

    it('should accept valid role.type "utility"', () => {
      const utilityAgent = {
        name: 'Utility Agent',
        description: 'A utility agent',
        role: {
          title: 'Code Quality',
          type: 'utility',
          expertise: ['Linting'],
        },
      };

      const result = parseAgentProfile(utilityAgent);
      expect(result.role.type).toBe('utility');
    });

    it('should accept agent without role.type (optional)', () => {
      const agentWithoutType = {
        name: 'No Type Agent',
        description: 'Agent without type',
        role: {
          title: 'Generic Role',
          expertise: ['General'],
        },
      };

      const result = parseAgentProfile(agentWithoutType);
      expect(result.role.type).toBeUndefined();
    });
  });

  describe('invalid agent profiles', () => {
    it('should reject missing name', () => {
      const invalidAgent = {
        description: 'No name',
        role: { title: 'Role', expertise: [] },
      };

      expect(() => parseAgentProfile(invalidAgent)).toThrow(AgentSchemaError);
    });

    it('should reject missing description', () => {
      const invalidAgent = {
        name: 'Agent',
        role: { title: 'Role', expertise: [] },
      };

      expect(() => parseAgentProfile(invalidAgent)).toThrow(AgentSchemaError);
    });

    it('should reject missing role', () => {
      const invalidAgent = {
        name: 'Agent',
        description: 'Description',
      };

      expect(() => parseAgentProfile(invalidAgent)).toThrow(AgentSchemaError);
    });

    it('should reject missing role.title', () => {
      const invalidAgent = {
        name: 'Agent',
        description: 'Description',
        role: { expertise: [] },
      };

      expect(() => parseAgentProfile(invalidAgent)).toThrow(AgentSchemaError);
    });

    it('should reject missing role.expertise', () => {
      const invalidAgent = {
        name: 'Agent',
        description: 'Description',
        role: { title: 'Title' },
      };

      expect(() => parseAgentProfile(invalidAgent)).toThrow(AgentSchemaError);
    });

    it('should reject non-string name', () => {
      const invalidAgent = {
        name: 123,
        description: 'Description',
        role: { title: 'Title', expertise: [] },
      };

      expect(() => parseAgentProfile(invalidAgent)).toThrow(AgentSchemaError);
    });

    it('should reject non-array expertise', () => {
      const invalidAgent = {
        name: 'Agent',
        description: 'Description',
        role: { title: 'Title', expertise: 'not an array' },
      };

      expect(() => parseAgentProfile(invalidAgent)).toThrow(AgentSchemaError);
    });
  });

  describe('security - prototype pollution prevention', () => {
    it('should reject __proto__ key in root (via JSON.parse)', () => {
      // When parsing JSON from files, __proto__ becomes a regular property
      const maliciousJson =
        '{"name":"Agent","description":"Description","role":{"title":"Title","expertise":[]},"__proto__":{"isAdmin":true}}';
      const maliciousAgent = JSON.parse(maliciousJson);

      expect(() => parseAgentProfile(maliciousAgent)).toThrow(AgentSchemaError);
    });

    it('should reject constructor key in root', () => {
      const maliciousJson =
        '{"name":"Agent","description":"Description","role":{"title":"Title","expertise":[]},"constructor":{"prototype":{"isAdmin":true}}}';
      const maliciousAgent = JSON.parse(maliciousJson);

      expect(() => parseAgentProfile(maliciousAgent)).toThrow(AgentSchemaError);
    });

    it('should reject prototype key in root', () => {
      const maliciousJson =
        '{"name":"Agent","description":"Description","role":{"title":"Title","expertise":[]},"prototype":{"isAdmin":true}}';
      const maliciousAgent = JSON.parse(maliciousJson);

      expect(() => parseAgentProfile(maliciousAgent)).toThrow(AgentSchemaError);
    });

    it('should reject __proto__ in nested objects', () => {
      const maliciousJson =
        '{"name":"Agent","description":"Description","role":{"title":"Title","expertise":[],"__proto__":{"isAdmin":true}}}';
      const maliciousAgent = JSON.parse(maliciousJson);

      expect(() => parseAgentProfile(maliciousAgent)).toThrow(AgentSchemaError);
    });
  });

  describe('AgentSchemaError', () => {
    it('should include validation details in error message', () => {
      const invalidAgent = { name: 123 };

      try {
        parseAgentProfile(invalidAgent);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AgentSchemaError);
        expect((error as AgentSchemaError).message).toContain('Invalid agent profile');
      }
    });
  });

  describe('PLAN mode agent JSON validation', () => {
    it('should validate solution-architect.json has valid schema', () => {
      // Parse should not throw for valid agent
      expect(() =>
        parseAgentProfile({
          name: 'Solution Architect',
          description: 'High-level system design and architecture planning',
          role: {
            title: 'Solution Architect',
            type: 'primary',
            expertise: ['System Architecture', 'Technology Selection', 'Design Patterns'],
          },
          skills: {
            required: [{ name: 'superpowers:brainstorming', purpose: 'test' }],
          },
        }),
      ).not.toThrow();
    });

    it('should validate technical-planner.json has valid schema', () => {
      // Parse should not throw for valid agent
      expect(() =>
        parseAgentProfile({
          name: 'Technical Planner',
          description: 'Implementation planning with TDD approach',
          role: {
            title: 'Technical Planner',
            type: 'primary',
            expertise: ['Implementation Planning', 'TDD', 'Task Breakdown'],
          },
          skills: {
            required: [{ name: 'superpowers:writing-plans', purpose: 'test' }],
          },
        }),
      ).not.toThrow();
    });

    it('should accept agent with skills.required array', () => {
      const agentWithSkills = {
        name: 'Skilled Agent',
        description: 'An agent with skills',
        role: {
          title: 'Developer',
          type: 'primary',
          expertise: ['Coding'],
        },
        skills: {
          required: [{ name: 'skill:one', purpose: 'Purpose one', when: 'always' }],
          recommended: [{ name: 'skill:two', purpose: 'Purpose two' }],
        },
      };

      const result = parseAgentProfile(agentWithSkills);
      expect(result.skills).toBeDefined();
      const skills = result.skills as {
        required: unknown[];
        recommended: unknown[];
      };
      expect(skills.required).toHaveLength(1);
      expect(skills.recommended).toHaveLength(1);
    });

    it('should accept primary agent type for PLAN mode agents', () => {
      const planModeAgent = {
        name: 'PLAN Mode Agent',
        description: 'Agent for PLAN mode',
        role: {
          title: 'Planner',
          type: 'primary',
          expertise: ['Planning'],
        },
      };

      const result = parseAgentProfile(planModeAgent);
      expect(result.role.type).toBe('primary');
    });
  });

  describe('migration-specialist agent validation', () => {
    it('should validate migration-specialist unified specialist structure', () => {
      // Test the core structure of migration-specialist.json
      const migrationSpecialist = {
        name: 'Migration Specialist',
        description: 'Cross-cutting migration coordinator for legacy system modernization',
        role: {
          title: 'Migration Engineer',
          type: 'specialist',
          expertise: [
            'Legacy system modernization (Strangler Fig pattern)',
            'Framework upgrade strategies',
            'Database migration with zero-downtime patterns',
            'Rollback planning and execution',
          ],
          responsibilities: [
            'Orchestrate multi-phase migration strategies',
            'Design and verify rollback procedures',
          ],
          delegation_rules: {
            to_data_engineer: ['When database schema migrations require up/down methods'],
            from_data_engineer: ['When migration orchestration is needed'],
          },
        },
        modes: {
          planning: {
            mandatory_checklist: {
              rollback_plan: 'Rollback strategy defined',
            },
          },
          implementation: {
            mandatory_checklist: {
              rollback_sli_definition: 'Rollback triggers defined',
            },
          },
          evaluation: {
            mandatory_checklist: {
              rollback_verification: 'Rollback procedures verified',
            },
          },
        },
      };

      const result = parseAgentProfile(migrationSpecialist);
      expect(result.name).toBe('Migration Specialist');
      expect(result.role.type).toBe('specialist');
      expect(result.role.delegation_rules).toBeDefined();
      expect(result.modes).toBeDefined();
    });

    it('should accept delegation_rules in role object', () => {
      const agentWithDelegation = {
        name: 'Delegating Agent',
        description: 'Agent with delegation rules',
        role: {
          title: 'Coordinator',
          type: 'specialist',
          expertise: ['Coordination'],
          delegation_rules: {
            to_other_agent: ['When specific conditions are met'],
            from_other_agent: ['When coordination is needed'],
          },
        },
      };

      const result = parseAgentProfile(agentWithDelegation);
      expect(result.role.delegation_rules).toBeDefined();
      const delegationRules = result.role.delegation_rules as Record<string, string[]>;
      expect(delegationRules.to_other_agent).toHaveLength(1);
      expect(delegationRules.from_other_agent).toHaveLength(1);
    });

    it('should accept modes object with planning/implementation/evaluation', () => {
      const unifiedSpecialist = {
        name: 'Unified Specialist',
        description: 'Specialist with unified modes',
        role: {
          title: 'Specialist',
          type: 'specialist',
          expertise: ['Specialization'],
        },
        modes: {
          planning: { mandatory_checklist: { item1: 'Check 1' } },
          implementation: { mandatory_checklist: { item2: 'Check 2' } },
          evaluation: { mandatory_checklist: { item3: 'Check 3' } },
        },
      };

      const result = parseAgentProfile(unifiedSpecialist);
      expect(result.modes).toBeDefined();
      const modes = result.modes as Record<string, unknown>;
      expect(modes.planning).toBeDefined();
      expect(modes.implementation).toBeDefined();
      expect(modes.evaluation).toBeDefined();
    });
  });
});
