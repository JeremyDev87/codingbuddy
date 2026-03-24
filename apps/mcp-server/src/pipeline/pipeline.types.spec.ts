import { describe, it, expect } from 'vitest';
import {
  isValidStageType,
  isValidPipelineStage,
  isValidPipelineDefinition,
} from './pipeline.types';

describe('Pipeline Type Guards', () => {
  describe('isValidStageType', () => {
    it('should return true for "command"', () => {
      expect(isValidStageType('command')).toBe(true);
    });

    it('should return true for "agent"', () => {
      expect(isValidStageType('agent')).toBe(true);
    });

    it('should return true for "skill"', () => {
      expect(isValidStageType('skill')).toBe(true);
    });

    it('should return false for invalid string', () => {
      expect(isValidStageType('invalid')).toBe(false);
    });

    it('should return false for non-string', () => {
      expect(isValidStageType(123)).toBe(false);
      expect(isValidStageType(null)).toBe(false);
      expect(isValidStageType(undefined)).toBe(false);
    });
  });

  describe('isValidPipelineStage', () => {
    const validStage = {
      id: 'stage-1',
      name: 'Build',
      type: 'command',
      config: { command: 'yarn build' },
    };

    it('should return true for valid stage', () => {
      expect(isValidPipelineStage(validStage)).toBe(true);
    });

    it('should return false for missing id', () => {
      expect(isValidPipelineStage({ ...validStage, id: '' })).toBe(false);
    });

    it('should return false for missing name', () => {
      expect(isValidPipelineStage({ ...validStage, name: '' })).toBe(false);
    });

    it('should return false for invalid type', () => {
      expect(isValidPipelineStage({ ...validStage, type: 'invalid' })).toBe(false);
    });

    it('should return false for null config', () => {
      expect(isValidPipelineStage({ ...validStage, config: null })).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isValidPipelineStage(null)).toBe(false);
      expect(isValidPipelineStage('string')).toBe(false);
      expect(isValidPipelineStage(42)).toBe(false);
    });
  });

  describe('isValidPipelineDefinition', () => {
    const validDefinition = {
      id: 'pipeline-1',
      name: 'Deploy Pipeline',
      stages: [
        { id: 's1', name: 'Build', type: 'command', config: { command: 'yarn build' } },
        { id: 's2', name: 'Test', type: 'command', config: { command: 'yarn test' } },
      ],
    };

    it('should return true for valid definition', () => {
      expect(isValidPipelineDefinition(validDefinition)).toBe(true);
    });

    it('should return true for empty stages array', () => {
      expect(isValidPipelineDefinition({ ...validDefinition, stages: [] })).toBe(true);
    });

    it('should return false for missing id', () => {
      expect(isValidPipelineDefinition({ ...validDefinition, id: '' })).toBe(false);
    });

    it('should return false for missing name', () => {
      expect(isValidPipelineDefinition({ ...validDefinition, name: '' })).toBe(false);
    });

    it('should return false for non-array stages', () => {
      expect(isValidPipelineDefinition({ ...validDefinition, stages: 'not-array' })).toBe(false);
    });

    it('should return false if any stage is invalid', () => {
      const invalid = {
        ...validDefinition,
        stages: [{ id: '', name: 'Bad', type: 'command', config: {} }],
      };
      expect(isValidPipelineDefinition(invalid)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isValidPipelineDefinition(null)).toBe(false);
      expect(isValidPipelineDefinition(undefined)).toBe(false);
    });
  });
});
