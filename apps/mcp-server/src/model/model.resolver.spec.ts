import { describe, it, expect } from 'vitest';
import {
  resolveModel,
  SYSTEM_DEFAULT_MODEL,
  isKnownModel,
  KNOWN_MODEL_PREFIXES,
  getAllPrefixes,
  formatUnknownModelWarning,
} from './model.resolver';
import { isModelConfig } from './model.types';

describe('formatUnknownModelWarning', () => {
  it('should format warning message with model and default prefixes', () => {
    const result = formatUnknownModelWarning('unknown-model');

    expect(result).toContain('Unknown model ID');
    expect(result).toContain('unknown-model');
    expect(result).toContain('claude-opus-4');
    expect(result).toContain('Known prefixes');
  });

  it('should include additional prefixes in warning', () => {
    const result = formatUnknownModelWarning('unknown-model', [
      'gpt-4',
      'gemini',
    ]);

    expect(result).toContain('gpt-4');
    expect(result).toContain('gemini');
  });
});

describe('getAllPrefixes', () => {
  it('should return KNOWN_MODEL_PREFIXES when no additional provided', () => {
    expect(getAllPrefixes()).toEqual(KNOWN_MODEL_PREFIXES);
  });

  it('should return KNOWN_MODEL_PREFIXES when undefined provided', () => {
    expect(getAllPrefixes(undefined)).toEqual(KNOWN_MODEL_PREFIXES);
  });

  it('should merge additional prefixes with known prefixes', () => {
    const additional = ['gpt-4', 'gemini'];
    const result = getAllPrefixes(additional);

    expect(result).toContain('claude-opus-4');
    expect(result).toContain('gpt-4');
    expect(result).toContain('gemini');
    expect(result.length).toBe(KNOWN_MODEL_PREFIXES.length + 2);
  });

  it('should handle empty additional prefixes array', () => {
    expect(getAllPrefixes([])).toEqual(KNOWN_MODEL_PREFIXES);
  });
});

describe('isKnownModel', () => {
  it('should return true for known Claude models', () => {
    expect(isKnownModel('claude-opus-4-20250514')).toBe(true);
    expect(isKnownModel('claude-sonnet-4-20250514')).toBe(true);
    expect(isKnownModel('claude-sonnet-3-5-20240620')).toBe(true);
    expect(isKnownModel('claude-haiku-3-5-20241022')).toBe(true);
  });

  it('should return false for unknown models', () => {
    expect(isKnownModel('gpt-4')).toBe(false);
    expect(isKnownModel('unknown-model')).toBe(false);
    expect(isKnownModel('claude-unknown')).toBe(false);
  });

  it('should have at least 4 known prefixes', () => {
    expect(KNOWN_MODEL_PREFIXES.length).toBeGreaterThanOrEqual(4);
  });

  it('should return false for empty string', () => {
    expect(isKnownModel('')).toBe(false);
  });

  describe('additionalPrefixes', () => {
    it('should recognize models with additional prefixes', () => {
      expect(isKnownModel('gpt-4-turbo', ['gpt-4'])).toBe(true);
      expect(isKnownModel('gemini-pro', ['gemini'])).toBe(true);
    });

    it('should still recognize default prefixes when additional prefixes provided', () => {
      expect(isKnownModel('claude-opus-4-20250514', ['gpt-4'])).toBe(true);
    });

    it('should handle empty additional prefixes array', () => {
      expect(isKnownModel('claude-opus-4-20250514', [])).toBe(true);
      expect(isKnownModel('gpt-4', [])).toBe(false);
    });
  });
});

describe('resolveModel', () => {
  describe('priority order', () => {
    it('should return agent model when all levels are provided', () => {
      const result = resolveModel({
        agentModel: { preferred: 'agent-model' },
        modeModel: { preferred: 'mode-model' },
        globalDefaultModel: 'global-model',
      });

      expect(result.model).toBe('agent-model');
      expect(result.source).toBe('agent');
    });

    it('should return mode model when agent is not provided', () => {
      const result = resolveModel({
        modeModel: { preferred: 'mode-model' },
        globalDefaultModel: 'global-model',
      });

      expect(result.model).toBe('mode-model');
      expect(result.source).toBe('mode');
    });

    it('should return global model when agent and mode are not provided', () => {
      const result = resolveModel({
        globalDefaultModel: 'global-model',
      });

      expect(result.model).toBe('global-model');
      expect(result.source).toBe('global');
    });

    it('should return system default when nothing is provided', () => {
      const result = resolveModel({});

      expect(result.model).toBe(SYSTEM_DEFAULT_MODEL);
      expect(result.source).toBe('system');
    });
  });

  describe('edge cases', () => {
    it('should skip agent with undefined preferred', () => {
      const result = resolveModel({
        agentModel: { preferred: undefined as unknown as string },
        modeModel: { preferred: 'mode-model' },
      });

      expect(result.model).toBe('mode-model');
      expect(result.source).toBe('mode');
    });

    it('should skip agent with empty string preferred', () => {
      const result = resolveModel({
        agentModel: { preferred: '' },
        modeModel: { preferred: 'mode-model' },
      });

      expect(result.model).toBe('mode-model');
      expect(result.source).toBe('mode');
    });

    it('should skip mode with empty string preferred', () => {
      const result = resolveModel({
        modeModel: { preferred: '' },
        globalDefaultModel: 'global-model',
      });

      expect(result.model).toBe('global-model');
      expect(result.source).toBe('global');
    });

    it('should skip empty global default', () => {
      const result = resolveModel({
        globalDefaultModel: '',
      });

      expect(result.model).toBe(SYSTEM_DEFAULT_MODEL);
      expect(result.source).toBe('system');
    });
  });

  describe('SYSTEM_DEFAULT_MODEL', () => {
    it('should be claude-sonnet-4-20250514', () => {
      expect(SYSTEM_DEFAULT_MODEL).toBe('claude-sonnet-4-20250514');
    });
  });

  describe('model validation warning', () => {
    it('should not include warning for known models', () => {
      const result = resolveModel({
        agentModel: { preferred: 'claude-sonnet-4-20250514' },
      });

      expect(result.model).toBe('claude-sonnet-4-20250514');
      expect(result.warning).toBeUndefined();
    });

    it('should include warning for unknown models', () => {
      const result = resolveModel({
        agentModel: { preferred: 'unknown-model' },
      });

      expect(result.model).toBe('unknown-model');
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('Unknown model ID');
      expect(result.warning).toContain('unknown-model');
    });

    it('should not include warning for system default', () => {
      const result = resolveModel({});

      expect(result.model).toBe(SYSTEM_DEFAULT_MODEL);
      expect(result.warning).toBeUndefined();
    });

    it('should include warning for unknown global config model', () => {
      const result = resolveModel({
        globalDefaultModel: 'gpt-4-turbo',
      });

      expect(result.model).toBe('gpt-4-turbo');
      expect(result.source).toBe('global');
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('gpt-4-turbo');
    });

    it('should not include warning when model matches additionalPrefixes', () => {
      const result = resolveModel({
        globalDefaultModel: 'gpt-4-turbo',
        additionalPrefixes: ['gpt-4'],
      });

      expect(result.model).toBe('gpt-4-turbo');
      expect(result.source).toBe('global');
      expect(result.warning).toBeUndefined();
    });

    it('should include additionalPrefixes in warning message', () => {
      const result = resolveModel({
        globalDefaultModel: 'unknown-model',
        additionalPrefixes: ['gpt-4', 'gemini'],
      });

      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('gpt-4');
      expect(result.warning).toContain('gemini');
    });
  });
});

describe('isModelConfig', () => {
  it('should return true for valid ModelConfig with preferred string', () => {
    expect(isModelConfig({ preferred: 'claude-sonnet-4-20250514' })).toBe(true);
    expect(isModelConfig({ preferred: 'gpt-4', reason: 'test' })).toBe(true);
  });

  it('should return false for null or undefined', () => {
    expect(isModelConfig(null)).toBe(false);
    expect(isModelConfig(undefined)).toBe(false);
  });

  it('should return false for non-object values', () => {
    expect(isModelConfig('string')).toBe(false);
    expect(isModelConfig(123)).toBe(false);
    expect(isModelConfig(true)).toBe(false);
  });

  it('should return false for object without preferred property', () => {
    expect(isModelConfig({})).toBe(false);
    expect(isModelConfig({ model: 'claude-sonnet-4' })).toBe(false);
  });

  it('should return false for object with non-string preferred', () => {
    expect(isModelConfig({ preferred: 123 })).toBe(false);
    expect(isModelConfig({ preferred: null })).toBe(false);
    expect(isModelConfig({ preferred: undefined })).toBe(false);
  });

  it('should return false for object with empty string preferred', () => {
    expect(isModelConfig({ preferred: '' })).toBe(false);
  });
});
