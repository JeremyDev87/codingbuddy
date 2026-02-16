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
  isRecordObject,
  extractRequiredString,
  extractOptionalString,
  extractStringArray,
  extractMode,
  VALID_MODES,
  isIndentStyle,
  isEndOfLine,
  isCharset,
  parseIndentSize,
  parseTabWidth,
  parseMaxLineLength,
  AccessibleErrorResponse,
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
    expect(result.error).toBe(
      'Query cannot be empty. Please provide a search term. Example: "authentication flow"',
    );
  });

  it('should reject whitespace-only query', () => {
    const result = validateQuery('   ');
    expect(result.valid).toBe(false);
    expect(result.error).toBe(
      'Query cannot be empty. Please provide a search term. Example: "authentication flow"',
    );
  });

  it('should reject query exceeding max length', () => {
    const longQuery = 'a'.repeat(MAX_QUERY_LENGTH + 1);
    const result = validateQuery(longQuery);
    expect(result.valid).toBe(false);
    expect(result.error).toBe(
      `Query exceeds maximum length of ${MAX_QUERY_LENGTH} characters. Please shorten your query.`,
    );
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
    expect(result.error).toBe(
      'Prompt cannot be empty. Please provide a task description. Example: "PLAN design authentication flow"',
    );
  });

  it('should reject prompt exceeding max length', () => {
    const longPrompt = 'a'.repeat(MAX_PROMPT_LENGTH + 1);
    const result = validatePrompt(longPrompt);
    expect(result.valid).toBe(false);
    expect(result.error).toBe(
      `Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters. Please shorten your prompt.`,
    );
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
    expect(result.error).toBe(
      'Agent name cannot be empty. Please provide an agent name. Example: "frontend-developer"',
    );
  });

  it('should reject name exceeding max length', () => {
    const longName = 'a'.repeat(MAX_AGENT_NAME_LENGTH + 1);
    const result = validateAgentName(longName);
    expect(result.valid).toBe(false);
    expect(result.error).toBe(
      `Agent name exceeds maximum length of ${MAX_AGENT_NAME_LENGTH} characters. Please use a shorter name.`,
    );
  });

  it('should reject names with uppercase letters', () => {
    const result = validateAgentName('Frontend-Developer');
    expect(result.valid).toBe(false);
    expect(result.error).toBe(
      'Agent name must contain only lowercase letters, numbers, and hyphens. Example: "frontend-developer" or "code-reviewer"',
    );
  });

  it('should reject names with spaces', () => {
    const result = validateAgentName('frontend developer');
    expect(result.valid).toBe(false);
    expect(result.error).toBe(
      'Agent name must contain only lowercase letters, numbers, and hyphens. Example: "frontend-developer" or "code-reviewer"',
    );
  });

  it('should reject names with special characters', () => {
    const result = validateAgentName('frontend_developer');
    expect(result.valid).toBe(false);
    expect(result.error).toBe(
      'Agent name must contain only lowercase letters, numbers, and hyphens. Example: "frontend-developer" or "code-reviewer"',
    );
  });

  it('should reject names with path traversal attempts', () => {
    const result = validateAgentName('../../../etc/passwd');
    expect(result.valid).toBe(false);
    expect(result.error).toBe(
      'Agent name must contain only lowercase letters, numbers, and hyphens. Example: "frontend-developer" or "code-reviewer"',
    );
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

describe('isRecordObject', () => {
  it('should return true for plain objects', () => {
    expect(isRecordObject({ key: 'value' })).toBe(true);
    expect(isRecordObject({})).toBe(true);
  });
  it('should return false for arrays', () => {
    expect(isRecordObject([1, 2])).toBe(false);
  });
  it('should return false for null/undefined/primitives', () => {
    expect(isRecordObject(null)).toBe(false);
    expect(isRecordObject(undefined)).toBe(false);
    expect(isRecordObject('string')).toBe(false);
    expect(isRecordObject(123)).toBe(false);
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

// ============================================================================
// EditorConfig Type Guards
// ============================================================================

describe('isIndentStyle', () => {
  it('should accept valid indent styles', () => {
    expect(isIndentStyle('space')).toBe(true);
    expect(isIndentStyle('tab')).toBe(true);
  });

  it('should reject invalid indent styles', () => {
    expect(isIndentStyle('spaces')).toBe(false);
    expect(isIndentStyle('tabs')).toBe(false);
    expect(isIndentStyle('')).toBe(false);
    expect(isIndentStyle('SPACE')).toBe(false);
    expect(isIndentStyle(123)).toBe(false);
    expect(isIndentStyle(null)).toBe(false);
    expect(isIndentStyle(undefined)).toBe(false);
  });
});

describe('isEndOfLine', () => {
  it('should accept valid end of line values', () => {
    expect(isEndOfLine('lf')).toBe(true);
    expect(isEndOfLine('cr')).toBe(true);
    expect(isEndOfLine('crlf')).toBe(true);
  });

  it('should reject invalid end of line values', () => {
    expect(isEndOfLine('LF')).toBe(false);
    expect(isEndOfLine('crlf2')).toBe(false);
    expect(isEndOfLine('')).toBe(false);
    expect(isEndOfLine(123)).toBe(false);
    expect(isEndOfLine(null)).toBe(false);
    expect(isEndOfLine(undefined)).toBe(false);
  });
});

describe('isCharset', () => {
  it('should accept valid charsets', () => {
    expect(isCharset('utf-8')).toBe(true);
    expect(isCharset('utf-16be')).toBe(true);
    expect(isCharset('utf-16le')).toBe(true);
    expect(isCharset('latin1')).toBe(true);
  });

  it('should reject invalid charsets', () => {
    expect(isCharset('UTF-8')).toBe(false);
    expect(isCharset('utf8')).toBe(false);
    expect(isCharset('')).toBe(false);
    expect(isCharset(123)).toBe(false);
    expect(isCharset(null)).toBe(false);
    expect(isCharset(undefined)).toBe(false);
  });
});

describe('parseIndentSize', () => {
  it('should parse valid indent sizes', () => {
    expect(parseIndentSize('2')).toEqual({ success: true, value: 2 });
    expect(parseIndentSize('4')).toEqual({ success: true, value: 4 });
    expect(parseIndentSize('8')).toEqual({ success: true, value: 8 });
  });

  it('should reject invalid indent sizes', () => {
    expect(parseIndentSize('0')).toEqual({
      success: false,
      error: 'Indent size must be a positive integer (>= 1)',
    });
    expect(parseIndentSize('-1')).toEqual({
      success: false,
      error: 'Indent size must be a positive integer (>= 1)',
    });
    expect(parseIndentSize('abc')).toEqual({
      success: false,
      error: 'Indent size must be a positive integer (>= 1)',
    });
    expect(parseIndentSize('')).toEqual({
      success: false,
      error: 'Indent size must be a positive integer (>= 1)',
    });
    expect(parseIndentSize('2.5')).toEqual({
      success: false,
      error: 'Indent size must be an integer, decimals are not allowed',
    });
  });

  it('should handle edge cases', () => {
    expect(parseIndentSize('1')).toEqual({ success: true, value: 1 });
    expect(parseIndentSize('100')).toEqual({ success: true, value: 100 });
  });
});

describe('parseTabWidth', () => {
  it('should parse valid tab widths', () => {
    expect(parseTabWidth('2')).toEqual({ success: true, value: 2 });
    expect(parseTabWidth('4')).toEqual({ success: true, value: 4 });
    expect(parseTabWidth('8')).toEqual({ success: true, value: 8 });
  });

  it('should reject invalid tab widths', () => {
    expect(parseTabWidth('0')).toEqual({
      success: false,
      error: 'Tab width must be a positive integer (>= 1)',
    });
    expect(parseTabWidth('-1')).toEqual({
      success: false,
      error: 'Tab width must be a positive integer (>= 1)',
    });
    expect(parseTabWidth('abc')).toEqual({
      success: false,
      error: 'Tab width must be a positive integer (>= 1)',
    });
    expect(parseTabWidth('')).toEqual({
      success: false,
      error: 'Tab width must be a positive integer (>= 1)',
    });
  });

  it('should reject decimal numbers', () => {
    expect(parseTabWidth('2.5')).toEqual({
      success: false,
      error: 'Tab width must be an integer, decimals are not allowed',
    });
    expect(parseTabWidth('4.0')).toEqual({
      success: false,
      error: 'Tab width must be an integer, decimals are not allowed',
    });
    expect(parseTabWidth('3.14')).toEqual({
      success: false,
      error: 'Tab width must be an integer, decimals are not allowed',
    });
  });
});

describe('parseMaxLineLength', () => {
  it('should parse valid max line lengths', () => {
    expect(parseMaxLineLength('80')).toEqual({ success: true, value: 80 });
    expect(parseMaxLineLength('120')).toEqual({ success: true, value: 120 });
    expect(parseMaxLineLength('9999')).toEqual({ success: true, value: 9999 });
  });

  it('should reject invalid max line lengths', () => {
    expect(parseMaxLineLength('0')).toEqual({
      success: false,
      error: 'Max line length must be a positive integer (>= 1) or "off"',
    });
    expect(parseMaxLineLength('-1')).toEqual({
      success: false,
      error: 'Max line length must be a positive integer (>= 1) or "off"',
    });
    expect(parseMaxLineLength('abc')).toEqual({
      success: false,
      error: 'Max line length must be a positive integer (>= 1) or "off"',
    });
    expect(parseMaxLineLength('')).toEqual({
      success: false,
      error: 'Max line length must be a positive integer (>= 1) or "off"',
    });
  });

  it('should handle special value "off"', () => {
    expect(parseMaxLineLength('off')).toEqual({ success: true });
  });
});

describe('AccessibleErrorResponse', () => {
  it('should allow creating error with all fields', () => {
    const error: AccessibleErrorResponse = {
      code: 'FILE_SIZE_EXCEEDED',
      userMessage: 'The file is too large. Maximum size is 1 MB.',
      technicalMessage:
        'File size 2097152 bytes exceeds maximum of 1048576 bytes',
      accessibilityHints: {
        role: 'alert',
        live: 'assertive',
        level: 1,
        announce: true,
      },
      suggestions: [
        'Use a smaller file',
        'Compress the file',
        'Split into multiple files',
      ],
    };

    expect(error.code).toBe('FILE_SIZE_EXCEEDED');
    expect(error.userMessage).toBe(
      'The file is too large. Maximum size is 1 MB.',
    );
    expect(error.technicalMessage).toBe(
      'File size 2097152 bytes exceeds maximum of 1048576 bytes',
    );
    expect(error.accessibilityHints).toBeDefined();
    expect(error.accessibilityHints?.role).toBe('alert');
    expect(error.accessibilityHints?.live).toBe('assertive');
    expect(error.accessibilityHints?.level).toBe(1);
    expect(error.accessibilityHints?.announce).toBe(true);
    expect(error.suggestions).toHaveLength(3);
  });

  it('should allow creating minimal error without optional fields', () => {
    const error: AccessibleErrorResponse = {
      code: 'VALIDATION_FAILED',
      userMessage: 'The input is invalid.',
      technicalMessage: 'Validation failed: email field is required',
    };

    expect(error.code).toBe('VALIDATION_FAILED');
    expect(error.userMessage).toBe('The input is invalid.');
    expect(error.technicalMessage).toBe(
      'Validation failed: email field is required',
    );
    expect(error.accessibilityHints).toBeUndefined();
    expect(error.suggestions).toBeUndefined();
  });

  it('should allow creating error with status role', () => {
    const error: AccessibleErrorResponse = {
      code: 'INFO',
      userMessage: 'File uploaded successfully.',
      technicalMessage: 'File uploaded to /uploads/file.txt',
      accessibilityHints: {
        role: 'status',
        live: 'polite',
        announce: false,
      },
    };

    expect(error.accessibilityHints?.role).toBe('status');
    expect(error.accessibilityHints?.live).toBe('polite');
    expect(error.accessibilityHints?.announce).toBe(false);
  });

  it('should allow creating error with heading level', () => {
    const error: AccessibleErrorResponse = {
      code: 'SECTION_ERROR',
      userMessage: 'This section contains errors.',
      technicalMessage: 'Multiple validation errors in form section',
      accessibilityHints: {
        role: 'alert',
        level: 2,
      },
    };

    expect(error.accessibilityHints?.level).toBe(2);
  });

  it('should allow different heading levels (1-6)', () => {
    const levels: Array<1 | 2 | 3 | 4 | 5 | 6> = [1, 2, 3, 4, 5, 6];

    levels.forEach(level => {
      const error: AccessibleErrorResponse = {
        code: 'TEST',
        userMessage: 'Test message',
        technicalMessage: 'Test technical message',
        accessibilityHints: {
          role: 'alert',
          level,
        },
      };

      expect(error.accessibilityHints?.level).toBe(level);
    });
  });

  it('should allow error with suggestions array', () => {
    const error: AccessibleErrorResponse = {
      code: 'INVALID_FORMAT',
      userMessage: 'The file format is not supported.',
      technicalMessage: 'File extension .xyz is not in allowed list',
      suggestions: [
        'Use .txt, .md, or .json format',
        'Check the file extension',
        'Convert to a supported format',
      ],
    };

    expect(error.suggestions).toBeDefined();
    expect(error.suggestions).toHaveLength(3);
    expect(error.suggestions?.[0]).toBe('Use .txt, .md, or .json format');
  });

  it('should enforce type safety for ARIA role', () => {
    const alertError: AccessibleErrorResponse = {
      code: 'ERROR',
      userMessage: 'Error occurred',
      technicalMessage: 'Technical error details',
      accessibilityHints: {
        role: 'alert',
      },
    };

    const statusError: AccessibleErrorResponse = {
      code: 'INFO',
      userMessage: 'Info message',
      technicalMessage: 'Technical info',
      accessibilityHints: {
        role: 'status',
      },
    };

    expect(alertError.accessibilityHints?.role).toBe('alert');
    expect(statusError.accessibilityHints?.role).toBe('status');
  });

  it('should enforce type safety for ARIA live', () => {
    const assertiveError: AccessibleErrorResponse = {
      code: 'CRITICAL',
      userMessage: 'Critical error',
      technicalMessage: 'Critical error details',
      accessibilityHints: {
        role: 'alert',
        live: 'assertive',
      },
    };

    const politeError: AccessibleErrorResponse = {
      code: 'INFO',
      userMessage: 'Information',
      technicalMessage: 'Info details',
      accessibilityHints: {
        role: 'status',
        live: 'polite',
      },
    };

    expect(assertiveError.accessibilityHints?.live).toBe('assertive');
    expect(politeError.accessibilityHints?.live).toBe('polite');
  });
});
