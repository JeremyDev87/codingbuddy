/**
 * Input Validation Constants
 *
 * Defines limits and patterns for validating user input
 * to prevent resource exhaustion and injection attacks.
 */

// ============================================================================
// Length Limits
// ============================================================================

/**
 * Maximum length for search queries
 * Prevents large queries from consuming excessive resources
 */
export const MAX_QUERY_LENGTH = 1000;

/**
 * Maximum length for prompts (PLAN/ACT/EVAL mode)
 * Allows for detailed prompts while preventing abuse
 */
export const MAX_PROMPT_LENGTH = 10000;

/**
 * Maximum length for agent names
 * Agent names should be short identifiers
 */
export const MAX_AGENT_NAME_LENGTH = 100;

// ============================================================================
// Patterns
// ============================================================================

/**
 * Valid agent name pattern
 * Only allows lowercase letters, numbers, and hyphens
 * Examples: "frontend-developer", "code-reviewer", "devops-engineer"
 */
export const AGENT_NAME_PATTERN = /^[a-z0-9-]+$/;

// ============================================================================
// Validation Functions
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate search query input
 */
export function validateQuery(query: string): ValidationResult {
  if (!query || query.trim().length === 0) {
    return { valid: false, error: 'Query cannot be empty' };
  }
  if (query.length > MAX_QUERY_LENGTH) {
    return {
      valid: false,
      error: `Query exceeds maximum length of ${MAX_QUERY_LENGTH} characters`,
    };
  }
  return { valid: true };
}

/**
 * Validate prompt input for mode parsing
 */
export function validatePrompt(prompt: string): ValidationResult {
  if (!prompt || prompt.trim().length === 0) {
    return { valid: false, error: 'Prompt cannot be empty' };
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return {
      valid: false,
      error: `Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters`,
    };
  }
  return { valid: true };
}

/**
 * Validate agent name format
 */
export function validateAgentName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Agent name cannot be empty' };
  }
  if (name.length > MAX_AGENT_NAME_LENGTH) {
    return {
      valid: false,
      error: `Agent name exceeds maximum length of ${MAX_AGENT_NAME_LENGTH} characters`,
    };
  }
  if (!AGENT_NAME_PATTERN.test(name)) {
    return {
      valid: false,
      error:
        'Agent name must contain only lowercase letters, numbers, and hyphens',
    };
  }
  return { valid: true };
}

// ============================================================================
// Type Guards for Handler Arguments
// ============================================================================

/**
 * Valid workflow modes
 */
export const VALID_MODES = ['PLAN', 'ACT', 'EVAL'] as const;
export type ValidMode = (typeof VALID_MODES)[number];

/**
 * Check if a value is a non-empty string
 * @param value - Value to check
 * @returns True if value is a string with content
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Check if a value is a valid string (including empty strings)
 * @param value - Value to check
 * @returns True if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Check if a value is an array of strings
 * @param value - Value to check
 * @returns True if value is an array where every element is a string
 */
export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

/**
 * Check if a value is a valid workflow mode
 * @param value - Value to check
 * @returns True if value is PLAN, ACT, or EVAL
 */
export function isValidMode(value: unknown): value is ValidMode {
  return typeof value === 'string' && VALID_MODES.includes(value as ValidMode);
}

/**
 * Extract a required string parameter from handler args
 * @param args - Handler arguments
 * @param paramName - Parameter name to extract
 * @returns The string value or null if invalid/missing
 */
export function extractRequiredString(
  args: Record<string, unknown> | undefined,
  paramName: string,
): string | null {
  const value = args?.[paramName];
  return isNonEmptyString(value) ? value : null;
}

/**
 * Extract an optional string parameter from handler args
 * @param args - Handler arguments
 * @param paramName - Parameter name to extract
 * @returns The string value, or undefined if missing, or null if invalid type
 */
export function extractOptionalString(
  args: Record<string, unknown> | undefined,
  paramName: string,
): string | undefined {
  const value = args?.[paramName];
  if (value === undefined) return undefined;
  return isString(value) ? value : undefined;
}

/**
 * Extract an optional string array parameter from handler args
 * @param args - Handler arguments
 * @param paramName - Parameter name to extract
 * @returns The string array or undefined if missing/invalid
 */
export function extractStringArray(
  args: Record<string, unknown> | undefined,
  paramName: string,
): string[] | undefined {
  const value = args?.[paramName];
  if (value === undefined) return undefined;
  return isStringArray(value) ? value : undefined;
}

/**
 * Extract and validate a mode parameter from handler args
 * @param args - Handler arguments
 * @param paramName - Parameter name (default: 'mode')
 * @returns The validated mode or null if invalid
 */
export function extractMode(
  args: Record<string, unknown> | undefined,
  paramName = 'mode',
): ValidMode | null {
  const value = args?.[paramName];
  return isValidMode(value) ? value : null;
}
