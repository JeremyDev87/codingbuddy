import { describe, it, expect, beforeEach } from 'vitest';
import { ActivationMessageBuilder } from './activation-message.builder';

describe('ActivationMessageBuilder', () => {
  let builder: ActivationMessageBuilder;

  beforeEach(() => {
    builder = new ActivationMessageBuilder();
  });

  describe('addAgentActivation', () => {
    it('adds a primary agent activation', () => {
      const result = builder.addAgentActivation('solution-architect', 'primary').build();

      expect(result).toBeDefined();
      expect(result!.activations).toHaveLength(1);
      expect(result!.activations[0]).toMatchObject({
        type: 'agent',
        name: 'solution-architect',
        tier: 'primary',
      });
    });

    it('adds a specialist agent activation', () => {
      const result = builder.addAgentActivation('security-specialist', 'specialist').build();

      expect(result).toBeDefined();
      expect(result!.activations[0]).toMatchObject({
        type: 'agent',
        name: 'security-specialist',
        tier: 'specialist',
      });
    });

    it('includes activatedBy when provided', () => {
      const result = builder
        .addAgentActivation('security-specialist', 'specialist', 'solution-architect')
        .build();

      expect(result!.activations[0].activatedBy).toBe('solution-architect');
    });

    it('includes timestamp', () => {
      const result = builder.addAgentActivation('solution-architect', 'primary').build();

      expect(result!.activations[0].timestamp).toBeDefined();
      expect(new Date(result!.activations[0].timestamp).getTime()).not.toBeNaN();
    });
  });

  describe('addSkillActivation', () => {
    it('adds a skill activation', () => {
      const result = builder.addSkillActivation('test-driven-development').build();

      expect(result).toBeDefined();
      expect(result!.activations[0]).toMatchObject({
        type: 'skill',
        name: 'test-driven-development',
        tier: 'specialist', // Skills are always specialist tier
      });
    });

    it('includes activatedBy when provided', () => {
      const result = builder.addSkillActivation('brainstorming', 'technical-planner').build();

      expect(result!.activations[0].activatedBy).toBe('technical-planner');
    });
  });

  describe('build', () => {
    it('returns undefined when no activations', () => {
      const result = builder.build();

      expect(result).toBeUndefined();
    });

    it('returns ActivationMessage with formatted string', () => {
      const result = builder.addAgentActivation('solution-architect', 'primary').build();

      expect(result!.formatted).toBeDefined();
      expect(typeof result!.formatted).toBe('string');
    });
  });

  describe('formatted output', () => {
    it('formats primary agent with robot icon', () => {
      const result = builder.addAgentActivation('solution-architect', 'primary').build();

      expect(result!.formatted).toContain('🤖');
      expect(result!.formatted).toContain('solution-architect');
      expect(result!.formatted).toContain('[Primary Agent]');
    });

    it('formats specialist agent with person icon', () => {
      const result = builder.addAgentActivation('security-specialist', 'specialist').build();

      expect(result!.formatted).toContain('👤');
      expect(result!.formatted).toContain('security-specialist');
      expect(result!.formatted).toContain('[Specialist]');
    });

    it('formats skill with lightning icon', () => {
      const result = builder.addSkillActivation('test-driven-development').build();

      expect(result!.formatted).toContain('⚡');
      expect(result!.formatted).toContain('test-driven-development');
    });

    it('includes activatedBy in formatted output', () => {
      const result = builder
        .addAgentActivation('security-specialist', 'specialist', 'solution-architect')
        .build();

      expect(result!.formatted).toContain('(by solution-architect)');
    });

    it('formats multiple activations on separate lines', () => {
      const result = builder
        .addAgentActivation('solution-architect', 'primary')
        .addAgentActivation('security-specialist', 'specialist', 'solution-architect')
        .addSkillActivation('brainstorming', 'solution-architect')
        .build();

      const lines = result!.formatted.split('\n');
      expect(lines).toHaveLength(3);
    });
  });

  describe('reset', () => {
    it('clears all activations', () => {
      builder.addAgentActivation('solution-architect', 'primary');
      builder.reset();
      const result = builder.build();

      expect(result).toBeUndefined();
    });
  });

  describe('static helpers', () => {
    describe('forPrimaryAgent', () => {
      it('creates activation message for primary agent', () => {
        const result = ActivationMessageBuilder.forPrimaryAgent('solution-architect');

        expect(result.activations).toHaveLength(1);
        expect(result.activations[0].tier).toBe('primary');
        expect(result.formatted).toContain('🤖');
      });
    });

    describe('forSpecialistAgent', () => {
      it('creates activation message for specialist agent', () => {
        const result = ActivationMessageBuilder.forSpecialistAgent(
          'security-specialist',
          'solution-architect',
        );

        expect(result.activations).toHaveLength(1);
        expect(result.activations[0].tier).toBe('specialist');
        expect(result.formatted).toContain('👤');
        expect(result.formatted).toContain('(by solution-architect)');
      });
    });

    describe('forSkill', () => {
      it('creates activation message for skill', () => {
        const result = ActivationMessageBuilder.forSkill('brainstorming', 'technical-planner');

        expect(result.activations).toHaveLength(1);
        expect(result.activations[0].type).toBe('skill');
        expect(result.formatted).toContain('⚡');
      });
    });
  });
});
