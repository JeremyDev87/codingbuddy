import { describe, it, expect } from 'vitest';
import {
  validateQuery,
  validatePrompt,
  validateAgentName,
  MAX_QUERY_LENGTH,
  MAX_PROMPT_LENGTH,
  MAX_AGENT_NAME_LENGTH,
  isNonEmptyString,
  isString,
  isStringArray,
  isValidMode,
  extractRequiredString,
  extractOptionalString,
  extractStringArray,
  extractMode,
  VALID_MODES,
} from './validation.constants';

describe('validateQuery', () => {
  it('should accept valid query', () => {
    const result = validateQuery('search term');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject empty query', () => {
    const result = validateQuery('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Query cannot be empty');
  });

  it('should reject whitespace-only query', () => {
    const result = validateQuery('   ');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Query cannot be empty');
  });

  it('should reject query exceeding max length', () => {
    const longQuery = 'a'.repeat(MAX_QUERY_LENGTH + 1);
    const result = validateQuery(longQuery);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds maximum length');
  });

  it('should accept query at max length', () => {
    const maxQuery = 'a'.repeat(MAX_QUERY_LENGTH);
    const result = validateQuery(maxQuery);
    expect(result.valid).toBe(true);
  });
});

describe('validatePrompt', () => {
  it('should accept valid prompt', () => {
    const result = validatePrompt('PLAN design the authentication flow');
    expect(result.valid).toBe(true);
  });

  it('should reject empty prompt', () => {
    const result = validatePrompt('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Prompt cannot be empty');
  });

  it('should reject prompt exceeding max length', () => {
    const longPrompt = 'a'.repeat(MAX_PROMPT_LENGTH + 1);
    const result = validatePrompt(longPrompt);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds maximum length');
  });

  it('should accept prompt at max length', () => {
    const maxPrompt = 'a'.repeat(MAX_PROMPT_LENGTH);
    const result = validatePrompt(maxPrompt);
    expect(result.valid).toBe(true);
  });
});

describe('validateAgentName', () => {
  it('should accept valid agent names', () => {
    const validNames = [
      'frontend-developer',
      'code-reviewer',
      'devops-engineer',
      'seo-specialist',
      'test123',
    ];

    for (const name of validNames) {
      const result = validateAgentName(name);
      expect(result.valid).toBe(true);
    }
  });

  it('should reject empty name', () => {
    const result = validateAgentName('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Agent name cannot be empty');
  });

  it('should reject name exceeding max length', () => {
    const longName = 'a'.repeat(MAX_AGENT_NAME_LENGTH + 1);
    const result = validateAgentName(longName);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds maximum length');
  });

  it('should reject names with uppercase letters', () => {
    const result = validateAgentName('Frontend-Developer');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('lowercase letters');
  });

  it('should reject names with spaces', () => {
    const result = validateAgentName('frontend developer');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('lowercase letters');
  });

  it('should reject names with special characters', () => {
    const result = validateAgentName('frontend_developer');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('lowercase letters');
  });

  it('should reject names with path traversal attempts', () => {
    const result = validateAgentName('../../../etc/passwd');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('lowercase letters');
  });
});

describe('isNonEmptyString', () => {
  it('returns true for non-empty strings', () => {
    expect(isNonEmptyString('hello')).toBe(true);
    expect(isNonEmptyString('  hello  ')).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(isNonEmptyString('')).toBe(false);
  });

  it('returns false for whitespace-only string', () => {
    expect(isNonEmptyString('   ')).toBe(false);
  });

  it('returns false for non-string values', () => {
    expect(isNonEmptyString(null)).toBe(false);
    expect(isNonEmptyString(undefined)).toBe(false);
    expect(isNonEmptyString(123)).toBe(false);
    expect(isNonEmptyString({})).toBe(false);
    expect(isNonEmptyString([])).toBe(false);
  });
});

describe('isString', () => {
  it('returns true for any string', () => {
    expect(isString('')).toBe(true);
    expect(isString('hello')).toBe(true);
    expect(isString('   ')).toBe(true);
  });

  it('returns false for non-string values', () => {
    expect(isString(null)).toBe(false);
    expect(isString(undefined)).toBe(false);
    expect(isString(123)).toBe(false);
    expect(isString({})).toBe(false);
  });
});

describe('isStringArray', () => {
  it('returns true for array of strings', () => {
    expect(isStringArray(['a', 'b', 'c'])).toBe(true);
    expect(isStringArray([''])).toBe(true);
    expect(isStringArray([])).toBe(true);
  });

  it('returns false for non-array values', () => {
    expect(isStringArray('string')).toBe(false);
    expect(isStringArray(null)).toBe(false);
    expect(isStringArray(undefined)).toBe(false);
  });

  it('returns false for mixed arrays', () => {
    expect(isStringArray(['a', 123])).toBe(false);
    expect(isStringArray(['a', null])).toBe(false);
    expect(isStringArray(['a', {}])).toBe(false);
  });
});

describe('isValidMode', () => {
  it('returns true for valid modes', () => {
    for (const mode of VALID_MODES) {
      expect(isValidMode(mode)).toBe(true);
    }
  });

  it('returns false for invalid mode strings', () => {
    expect(isValidMode('plan')).toBe(false);
    expect(isValidMode('act')).toBe(false);
    expect(isValidMode('INVALID')).toBe(false);
  });

  it('returns false for non-string values', () => {
    expect(isValidMode(null)).toBe(false);
    expect(isValidMode(undefined)).toBe(false);
    expect(isValidMode(123)).toBe(false);
  });
});

describe('extractRequiredString', () => {
  it('extracts string parameter', () => {
    expect(extractRequiredString({ name: 'value' }, 'name')).toBe('value');
  });

  it('returns null for missing parameter', () => {
    expect(extractRequiredString({}, 'name')).toBe(null);
    expect(extractRequiredString(undefined, 'name')).toBe(null);
  });

  it('returns null for empty string', () => {
    expect(extractRequiredString({ name: '' }, 'name')).toBe(null);
    expect(extractRequiredString({ name: '   ' }, 'name')).toBe(null);
  });

  it('returns null for non-string values', () => {
    expect(extractRequiredString({ name: 123 }, 'name')).toBe(null);
    expect(extractRequiredString({ name: null }, 'name')).toBe(null);
  });
});

describe('extractOptionalString', () => {
  it('extracts string parameter', () => {
    expect(extractOptionalString({ name: 'value' }, 'name')).toBe('value');
    expect(extractOptionalString({ name: '' }, 'name')).toBe('');
  });

  it('returns undefined for missing parameter', () => {
    expect(extractOptionalString({}, 'name')).toBe(undefined);
    expect(extractOptionalString(undefined, 'name')).toBe(undefined);
  });

  it('returns undefined for non-string values', () => {
    expect(extractOptionalString({ name: 123 }, 'name')).toBe(undefined);
    expect(extractOptionalString({ name: null }, 'name')).toBe(undefined);
  });
});

describe('extractStringArray', () => {
  it('extracts string array', () => {
    expect(extractStringArray({ files: ['a', 'b'] }, 'files')).toEqual([
      'a',
      'b',
    ]);
    expect(extractStringArray({ files: [] }, 'files')).toEqual([]);
  });

  it('returns undefined for missing parameter', () => {
    expect(extractStringArray({}, 'files')).toBe(undefined);
    expect(extractStringArray(undefined, 'files')).toBe(undefined);
  });

  it('returns undefined for non-array values', () => {
    expect(extractStringArray({ files: 'string' }, 'files')).toBe(undefined);
    expect(extractStringArray({ files: ['a', 123] }, 'files')).toBe(undefined);
  });
});

describe('extractMode', () => {
  it('extracts valid mode', () => {
    expect(extractMode({ mode: 'PLAN' })).toBe('PLAN');
    expect(extractMode({ mode: 'ACT' })).toBe('ACT');
    expect(extractMode({ mode: 'EVAL' })).toBe('EVAL');
  });

  it('returns null for invalid mode', () => {
    expect(extractMode({ mode: 'plan' })).toBe(null);
    expect(extractMode({ mode: 'INVALID' })).toBe(null);
  });

  it('returns null for missing parameter', () => {
    expect(extractMode({})).toBe(null);
    expect(extractMode(undefined)).toBe(null);
  });

  it('supports custom parameter name', () => {
    expect(extractMode({ workflow: 'PLAN' }, 'workflow')).toBe('PLAN');
    expect(extractMode({ workflow: 'PLAN' }, 'mode')).toBe(null);
  });
});
