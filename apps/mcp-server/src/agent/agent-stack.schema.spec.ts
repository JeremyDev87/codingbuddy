import { describe, it, expect } from 'vitest';
import { AgentStackSchema } from './agent-stack.schema';

describe('AgentStackSchema', () => {
  const validStack = {
    name: 'full-stack',
    description: 'Full-stack development team',
    category: 'development',
    tags: ['web', 'fullstack'],
    primary_agent: 'software-engineer',
    specialist_agents: ['frontend-developer', 'backend-developer'],
  };

  describe('valid data', () => {
    it('accepts a complete AgentStack with all required fields', () => {
      const result = AgentStackSchema.safeParse(validStack);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('full-stack');
        expect(result.data.specialist_agents).toHaveLength(2);
      }
    });

    it('accepts a stack with recommended_for', () => {
      const stackWithRecommended = {
        ...validStack,
        recommended_for: {
          file_patterns: ['*.tsx', '*.css'],
          modes: ['PLAN', 'ACT'],
        },
      };
      const result = AgentStackSchema.safeParse(stackWithRecommended);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.recommended_for?.file_patterns).toEqual(['*.tsx', '*.css']);
        expect(result.data.recommended_for?.modes).toEqual(['PLAN', 'ACT']);
      }
    });

    it('accepts a stack with partial recommended_for (file_patterns only)', () => {
      const stack = {
        ...validStack,
        recommended_for: {
          file_patterns: ['*.py'],
        },
      };
      const result = AgentStackSchema.safeParse(stack);
      expect(result.success).toBe(true);
    });

    it('accepts a stack with partial recommended_for (modes only)', () => {
      const stack = {
        ...validStack,
        recommended_for: {
          modes: ['EVAL'],
        },
      };
      const result = AgentStackSchema.safeParse(stack);
      expect(result.success).toBe(true);
    });

    it('accepts a stack with empty tags array', () => {
      const stack = { ...validStack, tags: [] };
      const result = AgentStackSchema.safeParse(stack);
      expect(result.success).toBe(true);
    });

    it('accepts a stack with empty specialist_agents array', () => {
      const stack = { ...validStack, specialist_agents: [] };
      const result = AgentStackSchema.safeParse(stack);
      expect(result.success).toBe(true);
    });
  });

  describe('missing required fields', () => {
    it('rejects when name is missing', () => {
      const { name: _, ...stack } = validStack;
      const result = AgentStackSchema.safeParse(stack);
      expect(result.success).toBe(false);
    });

    it('rejects when description is missing', () => {
      const { description: _, ...stack } = validStack;
      const result = AgentStackSchema.safeParse(stack);
      expect(result.success).toBe(false);
    });

    it('rejects when category is missing', () => {
      const { category: _, ...stack } = validStack;
      const result = AgentStackSchema.safeParse(stack);
      expect(result.success).toBe(false);
    });

    it('rejects when tags is missing', () => {
      const { tags: _, ...stack } = validStack;
      const result = AgentStackSchema.safeParse(stack);
      expect(result.success).toBe(false);
    });

    it('rejects when primary_agent is missing', () => {
      const { primary_agent: _, ...stack } = validStack;
      const result = AgentStackSchema.safeParse(stack);
      expect(result.success).toBe(false);
    });

    it('rejects when specialist_agents is missing', () => {
      const { specialist_agents: _, ...stack } = validStack;
      const result = AgentStackSchema.safeParse(stack);
      expect(result.success).toBe(false);
    });
  });

  describe('invalid types', () => {
    it('rejects when name is not a string', () => {
      const result = AgentStackSchema.safeParse({ ...validStack, name: 123 });
      expect(result.success).toBe(false);
    });

    it('rejects when tags is not an array', () => {
      const result = AgentStackSchema.safeParse({ ...validStack, tags: 'web' });
      expect(result.success).toBe(false);
    });

    it('rejects when specialist_agents contains non-strings', () => {
      const result = AgentStackSchema.safeParse({
        ...validStack,
        specialist_agents: [123, true],
      });
      expect(result.success).toBe(false);
    });
  });
});
