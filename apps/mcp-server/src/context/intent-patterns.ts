import type { TaskIntent } from './context.types';

/**
 * Intent detection pattern configuration
 * Each intent has a list of keywords that trigger it
 * Patterns are checked in order - first match wins
 */
export interface IntentPattern {
  intent: TaskIntent;
  keywords: readonly string[];
}

/**
 * Intent detection patterns in priority order
 * More specific patterns should come first
 */
export const INTENT_PATTERNS: readonly IntentPattern[] = [
  {
    intent: 'bug_fix',
    keywords: ['fix', 'bug', 'error', 'issue', 'broken'],
  },
  {
    intent: 'refactoring',
    keywords: ['refactor', 'clean', 'improve', 'restructure'],
  },
  {
    intent: 'code_review',
    keywords: ['review', 'check', 'audit', 'inspect'],
  },
  {
    intent: 'testing',
    keywords: ['test', 'spec', 'coverage', 'unit test'],
  },
  {
    intent: 'documentation',
    keywords: ['doc', 'readme', 'comment', 'jsdoc'],
  },
  {
    intent: 'performance_optimization',
    keywords: ['performance', 'optimize', 'speed', 'fast', 'slow', 'latency'],
  },
  {
    intent: 'security_hardening',
    keywords: ['security', 'vulnerability', 'auth', 'secure', 'xss', 'csrf'],
  },
  {
    intent: 'feature_development',
    keywords: ['add', 'create', 'implement', 'build', 'new', 'feature'],
  },
] as const;

/**
 * Detect intent from prompt using configured patterns
 * @param prompt - User's task description
 * @returns Detected intent or 'unknown'
 */
export function detectIntentFromPatterns(prompt: string): TaskIntent {
  const promptLower = prompt.toLowerCase();

  for (const pattern of INTENT_PATTERNS) {
    for (const keyword of pattern.keywords) {
      if (promptLower.includes(keyword)) {
        return pattern.intent;
      }
    }
  }

  return 'unknown';
}
