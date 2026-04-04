import { describe, it, expect } from 'vitest';
import { CouncilPresetService } from './council-preset.service';

describe('CouncilPresetService', () => {
  let service: CouncilPresetService;

  beforeEach(() => {
    service = new CouncilPresetService();
  });

  describe('resolvePreset', () => {
    describe('PLAN mode', () => {
      it('should return technical-planner as primary agent', () => {
        const preset = service.resolvePreset('PLAN');
        expect(preset).not.toBeNull();
        expect(preset!.primary).toBe('technical-planner');
      });

      it('should include architecture, test-strategy, code-quality, and security specialists', () => {
        const preset = service.resolvePreset('PLAN');
        expect(preset).not.toBeNull();
        expect(preset!.specialists).toEqual([
          'architecture-specialist',
          'test-strategy-specialist',
          'code-quality-specialist',
          'security-specialist',
        ]);
      });

      it('should set mode to PLAN', () => {
        const preset = service.resolvePreset('PLAN');
        expect(preset).not.toBeNull();
        expect(preset!.mode).toBe('PLAN');
      });
    });

    describe('EVAL mode', () => {
      it('should return code-reviewer as primary agent', () => {
        const preset = service.resolvePreset('EVAL');
        expect(preset).not.toBeNull();
        expect(preset!.primary).toBe('code-reviewer');
      });

      it('should include security, performance, and accessibility specialists', () => {
        const preset = service.resolvePreset('EVAL');
        expect(preset).not.toBeNull();
        expect(preset!.specialists).toEqual([
          'security-specialist',
          'performance-specialist',
          'accessibility-specialist',
        ]);
      });

      it('should set mode to EVAL', () => {
        const preset = service.resolvePreset('EVAL');
        expect(preset).not.toBeNull();
        expect(preset!.mode).toBe('EVAL');
      });
    });

    describe('unsupported modes', () => {
      it('should return null for ACT mode', () => {
        const preset = service.resolvePreset('ACT');
        expect(preset).toBeNull();
      });

      it('should return null for AUTO mode', () => {
        const preset = service.resolvePreset('AUTO');
        expect(preset).toBeNull();
      });
    });

    describe('determinism', () => {
      it('should return the same PLAN preset on every call', () => {
        const first = service.resolvePreset('PLAN');
        const second = service.resolvePreset('PLAN');
        expect(first).not.toBeNull();
        expect(first).toEqual(second);
      });

      it('should return the same EVAL preset on every call', () => {
        const first = service.resolvePreset('EVAL');
        const second = service.resolvePreset('EVAL');
        expect(first).not.toBeNull();
        expect(first).toEqual(second);
      });
    });

    describe('catalog validation', () => {
      it('should only reference valid agent catalog names in PLAN preset', () => {
        const preset = service.resolvePreset('PLAN');
        const allAgents = [preset!.primary, ...preset!.specialists];
        for (const agent of allAgents) {
          expect(agent).toMatch(/^[a-z][a-z0-9-]*$/);
        }
      });

      it('should only reference valid agent catalog names in EVAL preset', () => {
        const preset = service.resolvePreset('EVAL');
        const allAgents = [preset!.primary, ...preset!.specialists];
        for (const agent of allAgents) {
          expect(agent).toMatch(/^[a-z][a-z0-9-]*$/);
        }
      });
    });
  });

  describe('listPresets', () => {
    it('should return both PLAN and EVAL presets', () => {
      const presets = service.listPresets();
      expect(presets).toHaveLength(2);
      expect(presets.map(p => p.mode)).toEqual(['PLAN', 'EVAL']);
    });
  });
});
