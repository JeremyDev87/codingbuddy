import { describe, it, expect } from 'vitest';
import {
  resolveModel,
  SYSTEM_DEFAULT_MODEL,
  isKnownModel,
  KNOWN_MODEL_PREFIXES,
  getAllPrefixes,
  formatUnknownModelWarning,
} from './model.resolver';

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
    it('should return global model when provided', () => {
      const result = resolveModel({
        globalDefaultModel: 'claude-opus-4-20250514',
      });

      expect(result.model).toBe('claude-opus-4-20250514');
      expect(result.source).toBe('global');
    });

    it('should return system default when nothing is provided', () => {
      const result = resolveModel({});

      expect(result.model).toBe(SYSTEM_DEFAULT_MODEL);
      expect(result.source).toBe('system');
    });

    it('should return system default when global is empty string', () => {
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
        globalDefaultModel: 'claude-sonnet-4-20250514',
      });

      expect(result.model).toBe('claude-sonnet-4-20250514');
      expect(result.warning).toBeUndefined();
    });

    it('should include warning for unknown models', () => {
      const result = resolveModel({
        globalDefaultModel: 'unknown-model',
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

  describe('haiku deprecation warning', () => {
    it('should include deprecation warning for haiku models', () => {
      const result = resolveModel({
        globalDefaultModel: 'claude-haiku-3-5-20241022',
      });

      expect(result.model).toBe('claude-haiku-3-5-20241022');
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('not recommended');
    });

    it('should include deprecation warning for any haiku variant', () => {
      const result = resolveModel({
        globalDefaultModel: 'claude-haiku-3-20250101',
      });

      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('not recommended');
    });

    it('should not include deprecation warning for opus models', () => {
      const result = resolveModel({
        globalDefaultModel: 'claude-opus-4-20250514',
      });

      expect(result.warning).toBeUndefined();
    });

    it('should not include deprecation warning for sonnet models', () => {
      const result = resolveModel({
        globalDefaultModel: 'claude-sonnet-4-20250514',
      });

      expect(result.warning).toBeUndefined();
    });
  });
});
