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

      expect(result.role.responsibilities).toEqual([
        'Write code',
        'Review code',
      ]);
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
        expect((error as AgentSchemaError).message).toContain(
          'Invalid agent profile',
        );
      }
    });
  });
});
