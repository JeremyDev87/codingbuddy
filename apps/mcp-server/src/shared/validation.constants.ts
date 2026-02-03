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
 * Maximum config file size (1MB)
 * SEC-004: DoS protection - prevents memory exhaustion from malicious config files
 */
export const MAX_CONFIG_FILE_SIZE = 1024 * 1024; // 1MB

/**
 * Maximum length for search queries
 * Prevents large queries from consuming excessive resources
 */
export const MAX_QUERY_LENGTH = 1000;

/**
 * Maximum length for prompts (PLAN/ACT/EVAL mode) - Business Logic Validation
 *
 * Used by validatePrompt() to return an error for overly long prompts.
 * This is a hard limit that rejects input with a user-friendly error message.
 *
 * @see MAX_PROMPT_LENGTH_REDOS_DEFENSE for the internal truncation limit
 */
export const MAX_PROMPT_LENGTH = 10000;

/**
 * Maximum prompt length for ReDoS defense - Internal Truncation Limit
 *
 * Used by KeywordService as defense-in-depth against regex denial-of-service attacks.
 * This is a soft limit that silently truncates (not rejects) extremely long input
 * before applying regex patterns.
 *
 * This value is intentionally higher than MAX_PROMPT_LENGTH (50KB vs 10KB) because:
 * 1. MAX_PROMPT_LENGTH is for business validation (returns error to user)
 * 2. This limit is for internal safety (truncates without user notification)
 * 3. Some internal operations may bypass validatePrompt() but still need protection
 *
 * @see MAX_PROMPT_LENGTH for the business logic validation limit
 */
export const MAX_PROMPT_LENGTH_REDOS_DEFENSE = 50_000;

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
 * Result of parsing operations
 * CQ-002: Standardized API to align with ValidationResult pattern
 */
export interface ParseResult<T> {
  success: boolean;
  value?: T;
  error?: string;
}

/**
 * Accessible error response with UI hints
 * ACC-003: Provides accessibility metadata for downstream UI components
 *
 * This interface follows WCAG 2.1 AA guidelines for accessible error messaging.
 * It provides structured metadata that UI frameworks can use to render errors
 * that are perceivable, operable, and understandable for all users.
 *
 * @example Basic Error Response
 * ```typescript
 * const error: AccessibleErrorResponse = {
 *   code: 'FILE_SIZE_EXCEEDED',
 *   userMessage: 'The file is too large. Maximum size is 1 MB.',
 *   technicalMessage: 'File size 2097152 bytes exceeds maximum of 1048576 bytes',
 *   accessibilityHints: {
 *     role: 'alert',
 *     live: 'assertive',
 *     announce: true
 *   },
 *   suggestions: [
 *     'Use a smaller file',
 *     'Compress the file before uploading',
 *     'Split file into chunks under 1 MB'
 *   ]
 * };
 * ```
 *
 * @example React Integration
 * ```tsx
 * function ErrorAlert({ error }: { error: AccessibleErrorResponse }) {
 *   const { userMessage, suggestions, accessibilityHints } = error;
 *   const { role, live, announce } = accessibilityHints || {};
 *
 *   return (
 *     <div
 *       role={role || 'alert'}
 *       aria-live={live || 'assertive'}
 *       aria-atomic={announce ?? true}
 *       className="error-alert"
 *     >
 *       <p className="error-message">{userMessage}</p>
 *       {suggestions && suggestions.length > 0 && (
 *         <ul className="error-suggestions" aria-label="Suggested solutions">
 *           {suggestions.map((suggestion, i) => (
 *             <li key={i}>{suggestion}</li>
 *           ))}
 *         </ul>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example Vue Integration
 * ```vue
 * <template>
 *   <div
 *     :role="error.accessibilityHints?.role || 'alert'"
 *     :aria-live="error.accessibilityHints?.live || 'assertive'"
 *     :aria-atomic="error.accessibilityHints?.announce ?? true"
 *     class="error-alert"
 *   >
 *     <p class="error-message">{{ error.userMessage }}</p>
 *     <ul
 *       v-if="error.suggestions?.length"
 *       class="error-suggestions"
 *       aria-label="Suggested solutions"
 *     >
 *       <li v-for="(suggestion, i) in error.suggestions" :key="i">
 *         {{ suggestion }}
 *       </li>
 *     </ul>
 *   </div>
 * </template>
 * ```
 *
 * @example Plain HTML/JavaScript
 * ```javascript
 * function renderAccessibleError(error, container) {
 *   const { userMessage, suggestions, accessibilityHints } = error;
 *   const { role, live, announce } = accessibilityHints || {};
 *
 *   const div = document.createElement('div');
 *   div.setAttribute('role', role || 'alert');
 *   div.setAttribute('aria-live', live || 'assertive');
 *   div.setAttribute('aria-atomic', announce ?? true);
 *   div.className = 'error-alert';
 *
 *   const message = document.createElement('p');
 *   message.className = 'error-message';
 *   message.textContent = userMessage;
 *   div.appendChild(message);
 *
 *   if (suggestions && suggestions.length > 0) {
 *     const list = document.createElement('ul');
 *     list.className = 'error-suggestions';
 *     list.setAttribute('aria-label', 'Suggested solutions');
 *     suggestions.forEach(suggestion => {
 *       const item = document.createElement('li');
 *       item.textContent = suggestion;
 *       list.appendChild(item);
 *     });
 *     div.appendChild(list);
 *   }
 *
 *   container.appendChild(div);
 * }
 * ```
 *
 * @example Logging Technical Details (Backend)
 * ```typescript
 * try {
 *   await safeReadFile(filePath, { maxSize: MAX_SIZE });
 * } catch (error) {
 *   if (error instanceof FileSizeError) {
 *     // Log technical details for debugging
 *     logger.error('File size violation', {
 *       code: error.code,
 *       technicalMessage: error.technicalMessage,
 *       stack: error.stack
 *     });
 *
 *     // Return user-friendly response to client
 *     return {
 *       error: {
 *         code: error.code,
 *         userMessage: error.userMessage,
 *         accessibilityHints: error.accessibilityHints,
 *         suggestions: error.suggestions
 *       }
 *     };
 *   }
 * }
 * ```
 */
export interface AccessibleErrorResponse {
  /**
   * Machine-readable error code for programmatic handling
   * Examples: 'FILE_SIZE_EXCEEDED', 'INVALID_FORMAT', 'VALIDATION_FAILED'
   */
  code: string;

  /**
   * User-friendly error message in plain language
   * Should be concise and actionable (e.g., "File too large. Maximum 1 MB.")
   */
  userMessage: string;

  /**
   * Technical error message for logging and debugging
   * Can include detailed information like stack traces, file paths, etc.
   */
  technicalMessage: string;

  /**
   * Optional accessibility hints for UI implementation
   * Provides semantic structure for screen readers and assistive technologies
   */
  accessibilityHints?: {
    /**
     * ARIA role for the error element
     * - 'alert': For critical errors requiring immediate attention
     * - 'status': For informational messages that don't require immediate action
     */
    role: 'alert' | 'status';

    /**
     * ARIA live region politeness setting
     * - 'assertive': Interrupts current screen reader announcement (for critical errors)
     * - 'polite': Waits for current announcement to finish (for non-critical messages)
     */
    live?: 'assertive' | 'polite';

    /**
     * Heading level for error message (1-6)
     * Used when error is displayed as a heading in the UI
     */
    level?: 1 | 2 | 3 | 4 | 5 | 6;

    /**
     * Whether the error should be announced to screen readers immediately
     * Default: true for role='alert', false for role='status'
     */
    announce?: boolean;
  };

  /**
   * Optional suggestions for resolving the error
   * Examples: ["Use a smaller file", "Check file format", "Contact support"]
   */
  suggestions?: string[];
}

/**
 * Validate search query input
 */
export function validateQuery(query: string): ValidationResult {
  if (!query || query.trim().length === 0) {
    return {
      valid: false,
      error:
        'Query cannot be empty. Please provide a search term. Example: "authentication flow"',
    };
  }
  if (query.length > MAX_QUERY_LENGTH) {
    return {
      valid: false,
      error: `Query exceeds maximum length of ${MAX_QUERY_LENGTH} characters. Please shorten your query.`,
    };
  }
  return { valid: true };
}

/**
 * Validate prompt input for mode parsing
 */
export function validatePrompt(prompt: string): ValidationResult {
  if (!prompt || prompt.trim().length === 0) {
    return {
      valid: false,
      error:
        'Prompt cannot be empty. Please provide a task description. Example: "PLAN design authentication flow"',
    };
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return {
      valid: false,
      error: `Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters. Please shorten your prompt.`,
    };
  }
  return { valid: true };
}

/**
 * Validate agent name format
 */
export function validateAgentName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return {
      valid: false,
      error:
        'Agent name cannot be empty. Please provide an agent name. Example: "frontend-developer"',
    };
  }
  if (name.length > MAX_AGENT_NAME_LENGTH) {
    return {
      valid: false,
      error: `Agent name exceeds maximum length of ${MAX_AGENT_NAME_LENGTH} characters. Please use a shorter name.`,
    };
  }
  if (!AGENT_NAME_PATTERN.test(name)) {
    return {
      valid: false,
      error:
        'Agent name must contain only lowercase letters, numbers, and hyphens. Example: "frontend-developer" or "code-reviewer"',
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
export const VALID_MODES = ['PLAN', 'ACT', 'EVAL', 'AUTO'] as const;
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
 * @returns True if value is PLAN, ACT, EVAL, or AUTO
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

// ============================================================================
// EditorConfig Type Guards
// ============================================================================

/**
 * Valid indent styles for EditorConfig
 */
const VALID_INDENT_STYLES = ['space', 'tab'] as const;
type IndentStyle = (typeof VALID_INDENT_STYLES)[number];

/**
 * Valid end of line values for EditorConfig
 */
const VALID_END_OF_LINE = ['lf', 'cr', 'crlf'] as const;
type EndOfLine = (typeof VALID_END_OF_LINE)[number];

/**
 * Valid charset values for EditorConfig
 */
const VALID_CHARSETS = ['utf-8', 'utf-16be', 'utf-16le', 'latin1'] as const;
type Charset = (typeof VALID_CHARSETS)[number];

/**
 * Check if a value is a valid indent style
 * @param value - Value to check
 * @returns True if value is 'space' or 'tab'
 */
export function isIndentStyle(value: unknown): value is IndentStyle {
  return (
    typeof value === 'string' &&
    VALID_INDENT_STYLES.includes(value as IndentStyle)
  );
}

/**
 * Check if a value is a valid end of line value
 * @param value - Value to check
 * @returns True if value is 'lf', 'cr', or 'crlf'
 */
export function isEndOfLine(value: unknown): value is EndOfLine {
  return (
    typeof value === 'string' && VALID_END_OF_LINE.includes(value as EndOfLine)
  );
}

/**
 * Check if a value is a valid charset
 * @param value - Value to check
 * @returns True if value is a valid charset string
 */
export function isCharset(value: unknown): value is Charset {
  return typeof value === 'string' && VALID_CHARSETS.includes(value as Charset);
}

/**
 * Parse and validate an indent size value
 * @param value - String value from EditorConfig
 * @returns ParseResult with parsed number if valid (>= 1)
 */
export function parseIndentSize(value: string): ParseResult<number> {
  // Reject decimal numbers by checking if the string contains a decimal point
  if (value.includes('.')) {
    return {
      success: false,
      error: 'Indent size must be an integer, decimals are not allowed',
    };
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 1 || !Number.isInteger(parsed)) {
    return {
      success: false,
      error: 'Indent size must be a positive integer (>= 1)',
    };
  }
  return { success: true, value: parsed };
}

/**
 * Parse and validate a tab width value
 * @param value - String value from EditorConfig
 * @returns ParseResult with parsed number if valid (>= 1)
 */
export function parseTabWidth(value: string): ParseResult<number> {
  // Reject decimal numbers by checking if the string contains a decimal point
  if (value.includes('.')) {
    return {
      success: false,
      error: 'Tab width must be an integer, decimals are not allowed',
    };
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 1 || !Number.isInteger(parsed)) {
    return {
      success: false,
      error: 'Tab width must be a positive integer (>= 1)',
    };
  }
  return { success: true, value: parsed };
}

/**
 * Parse and validate a max line length value
 * @param value - String value from EditorConfig
 * @returns ParseResult with parsed number if valid (>= 1), or success=true with no value for "off"
 */
export function parseMaxLineLength(value: string): ParseResult<number> {
  // "off" is a special value that means no limit
  if (value === 'off') {
    return { success: true }; // No value = no limit
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 1 || !Number.isInteger(parsed)) {
    return {
      success: false,
      error: 'Max line length must be a positive integer (>= 1) or "off"',
    };
  }
  return { success: true, value: parsed };
}
