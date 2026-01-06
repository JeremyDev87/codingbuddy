import { describe, it, expect } from 'vitest';
import { normalizeAgentName } from './agent.utils';

describe('normalizeAgentName', () => {
  it('should convert display name to kebab-case', () => {
    expect(normalizeAgentName('Frontend Developer')).toBe('frontend-developer');
    expect(normalizeAgentName('Backend Developer')).toBe('backend-developer');
  });

  it('should lowercase the name', () => {
    expect(normalizeAgentName('CODE REVIEWER')).toBe('code-reviewer');
    expect(normalizeAgentName('Agent Architect')).toBe('agent-architect');
  });

  it('should handle multiple spaces', () => {
    expect(normalizeAgentName('Code  Quality  Specialist')).toBe(
      'code-quality-specialist',
    );
  });

  it('should handle single word names', () => {
    expect(normalizeAgentName('Developer')).toBe('developer');
  });

  it('should handle already normalized names', () => {
    expect(normalizeAgentName('frontend-developer')).toBe('frontend-developer');
  });

  it('should handle mixed cases', () => {
    expect(normalizeAgentName('DevOps Engineer')).toBe('devops-engineer');
  });

  describe('edge cases', () => {
    it('should return empty string for empty input', () => {
      expect(normalizeAgentName('')).toBe('');
    });

    it('should return empty string for whitespace-only input', () => {
      expect(normalizeAgentName('   ')).toBe('');
    });

    it('should remove special characters', () => {
      expect(normalizeAgentName('Agent@123')).toBe('agent123');
      expect(normalizeAgentName('Test!Agent#Name')).toBe('testagentname');
    });

    it('should handle leading and trailing spaces', () => {
      expect(normalizeAgentName('  Frontend Developer  ')).toBe(
        'frontend-developer',
      );
    });

    it('should handle names with numbers', () => {
      expect(normalizeAgentName('Agent V2')).toBe('agent-v2');
    });

    it('should handle hyphens in input', () => {
      expect(normalizeAgentName('UI-UX Designer')).toBe('ui-ux-designer');
    });

    it('should collapse multiple hyphens', () => {
      expect(normalizeAgentName('Agent---Name')).toBe('agent-name');
    });

    it('should return empty string for null input', () => {
      expect(normalizeAgentName(null as unknown as string)).toBe('');
    });

    it('should return empty string for undefined input', () => {
      expect(normalizeAgentName(undefined as unknown as string)).toBe('');
    });
  });
});
