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
    expect(result).toContain('claude-');
    expect(result).toContain('Known prefixes');
  });

  it('should include additional prefixes in warning', () => {
    const result = formatUnknownModelWarning('unknown-model', ['custom-1', 'experimental-']);

    expect(result).toContain('custom-1');
    expect(result).toContain('experimental-');
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
    const additional = ['llama-4', 'cohere-v2'];
    const result = getAllPrefixes(additional);

    expect(result).toContain('claude-');
    expect(result).toContain('llama-4');
    expect(result).toContain('cohere-v2');
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
    expect(isKnownModel('unknown-model')).toBe(false);
    expect(isKnownModel('totally-random')).toBe(false);
    expect(isKnownModel('some-other-model')).toBe(false);
  });

  it('should return true for known OpenAI models', () => {
    expect(isKnownModel('gpt-4o')).toBe(true);
    expect(isKnownModel('gpt-4o-mini')).toBe(true);
    expect(isKnownModel('gpt-3.5-turbo')).toBe(true);
    expect(isKnownModel('o1-mini')).toBe(true);
    expect(isKnownModel('o3-mini')).toBe(true);
  });

  it('should return true for known Google models', () => {
    expect(isKnownModel('gemini-2.5-pro')).toBe(true);
    expect(isKnownModel('gemini-2.5-flash')).toBe(true);
    expect(isKnownModel('gemini-1.5-pro')).toBe(true);
  });

  it('should have at least 14 known prefixes (multi-provider)', () => {
    expect(KNOWN_MODEL_PREFIXES.length).toBeGreaterThanOrEqual(14);
  });

  it('should return true for xAI Grok models', () => {
    expect(isKnownModel('grok-3')).toBe(true);
    expect(isKnownModel('grok-4.1')).toBe(true);
  });

  it('should return true for DeepSeek models', () => {
    expect(isKnownModel('deepseek-chat')).toBe(true);
    expect(isKnownModel('deepseek-reasoner')).toBe(true);
    expect(isKnownModel('deepseek-v3')).toBe(true);
  });

  it('should return true for Mistral models', () => {
    expect(isKnownModel('mistral-large-latest')).toBe(true);
    expect(isKnownModel('codestral-latest')).toBe(true);
  });

  it('should return true for Meta Llama models', () => {
    expect(isKnownModel('llama-3.3-70b')).toBe(true);
  });

  it('should return true for Cohere models', () => {
    expect(isKnownModel('command-r-plus')).toBe(true);
  });

  it('should return true for Alibaba Qwen models', () => {
    expect(isKnownModel('qwen-2.5-coder')).toBe(true);
  });

  it('should return true for Microsoft Phi models', () => {
    expect(isKnownModel('phi-4')).toBe(true);
  });

  it('should recognize future model versions automatically (provider-level prefix)', () => {
    expect(isKnownModel('claude-sonnet-5-20260101')).toBe(true);
    expect(isKnownModel('gpt-6-turbo')).toBe(true);
    expect(isKnownModel('gemini-4.0-ultra')).toBe(true);
    expect(isKnownModel('grok-5')).toBe(true);
    expect(isKnownModel('deepseek-v5')).toBe(true);
  });

  it('should return false for empty string', () => {
    expect(isKnownModel('')).toBe(false);
  });

  describe('additionalPrefixes', () => {
    it('should recognize models with additional prefixes', () => {
      expect(isKnownModel('cohere-v2-large', ['cohere-v2'])).toBe(true);
      expect(isKnownModel('inflection-3', ['inflection-'])).toBe(true);
    });

    it('should still recognize default prefixes when additional prefixes provided', () => {
      expect(isKnownModel('claude-opus-4-20250514', ['inflection-'])).toBe(true);
    });

    it('should handle empty additional prefixes array', () => {
      expect(isKnownModel('claude-opus-4-20250514', [])).toBe(true);
      expect(isKnownModel('unknown-model', [])).toBe(false);
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
        globalDefaultModel: 'inflection-3',
        additionalPrefixes: ['inflection-'],
      });

      expect(result.model).toBe('inflection-3');
      expect(result.source).toBe('global');
      expect(result.warning).toBeUndefined();
    });

    it('should include additionalPrefixes in warning message', () => {
      const result = resolveModel({
        globalDefaultModel: 'unknown-model',
        additionalPrefixes: ['custom-1', 'experimental-'],
      });

      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('custom-1');
      expect(result.warning).toContain('experimental-');
    });
  });

  describe('multi-provider models', () => {
    it('should resolve GPT model without warning', () => {
      const result = resolveModel({ globalDefaultModel: 'gpt-4o' });
      expect(result.model).toBe('gpt-4o');
      expect(result.source).toBe('global');
      expect(result.warning).toBeUndefined();
    });

    it('should resolve Gemini model without warning', () => {
      const result = resolveModel({ globalDefaultModel: 'gemini-2.5-pro' });
      expect(result.model).toBe('gemini-2.5-pro');
      expect(result.source).toBe('global');
      expect(result.warning).toBeUndefined();
    });

    it('should resolve o3-mini without warning', () => {
      const result = resolveModel({ globalDefaultModel: 'o3-mini' });
      expect(result.model).toBe('o3-mini');
      expect(result.source).toBe('global');
      expect(result.warning).toBeUndefined();
    });

    it('should resolve Grok model without warning', () => {
      const result = resolveModel({ globalDefaultModel: 'grok-3' });
      expect(result.model).toBe('grok-3');
      expect(result.source).toBe('global');
      expect(result.warning).toBeUndefined();
    });

    it('should resolve DeepSeek model without warning', () => {
      const result = resolveModel({ globalDefaultModel: 'deepseek-chat' });
      expect(result.model).toBe('deepseek-chat');
      expect(result.source).toBe('global');
      expect(result.warning).toBeUndefined();
    });

    it('should still warn for truly unknown models', () => {
      const result = resolveModel({ globalDefaultModel: 'truly-unknown-model' });
      expect(result.model).toBe('truly-unknown-model');
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('Unknown model ID');
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
