/**
 * Explicit Agent Request Patterns
 *
 * These patterns detect when users explicitly request a specific agent.
 * They have the highest priority in agent resolution.
 *
 * @example
 * - "backend-developer로 작업해" → backend-developer
 * - "use frontend-developer agent" → frontend-developer
 * - "as data-engineer" → data-engineer
 */
export const EXPLICIT_PATTERNS: ReadonlyArray<RegExp> = [
  // Korean patterns: "~로 작업해", "~으로 해줘", "~로 해"
  /(\w+-\w+)(?:로|으로)\s*(?:작업|개발|해)/i,
  // English patterns: "use ~ agent", "using ~"
  /(?:use|using)\s+(\w+-\w+)(?:\s+agent)?/i,
  // English pattern: "as ~"
  /as\s+(\w+-\w+)/i,
  // Direct pattern: "~ agent로"
  /(\w+-\w+)\s+agent(?:로|으로)/i,
];
