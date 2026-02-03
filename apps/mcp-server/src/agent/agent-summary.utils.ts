/**
 * Maximum expertise items for summary
 */
export const MAX_SUMMARY_EXPERTISE_ITEMS = 5;

/**
 * Maximum characters for primary focus description
 */
export const MAX_PRIMARY_FOCUS_LENGTH = 100;

/**
 * Agent summary for token-optimized responses
 */
export interface AgentSummary {
  name: string;
  displayName: string;
  expertise: string[];
  primaryFocus: string;
  fullPromptAvailable: boolean;
}

/**
 * Create agent summary from full profile
 * Reduces token usage by:
 * - Limiting expertise to top 5 items
 * - Truncating primary focus to 100 characters
 * - Removing full system prompt (available on demand)
 *
 * @param profile - Full agent profile with name, displayName, expertise, systemPrompt
 * @returns Summarized agent info
 *
 * @example
 * ```typescript
 * const profile = {
 *   name: 'architecture',
 *   displayName: 'Architecture Specialist',
 *   expertise: ['Design Patterns', 'System Architecture', 'SOLID', 'DDD', 'Clean Architecture', 'Microservices'],
 *   systemPrompt: 'You are an architecture specialist. Your role is to ensure system design follows best practices...'
 * };
 *
 * const summary = createAgentSummary(profile);
 * // {
 * //   name: 'architecture',
 * //   displayName: 'Architecture Specialist',
 * //   expertise: ['Design Patterns', 'System Architecture', 'SOLID', 'DDD', 'Clean Architecture'],
 * //   primaryFocus: 'You are an architecture specialist. Your role is to ensure system design follows best practices',
 * //   fullPromptAvailable: true
 * // }
 * ```
 */
export function createAgentSummary(profile: {
  name: string;
  displayName?: string;
  expertise?: string[];
  systemPrompt?: string;
}): AgentSummary {
  return {
    name: profile.name,
    displayName: profile.displayName || profile.name,
    expertise: (profile.expertise || []).slice(0, MAX_SUMMARY_EXPERTISE_ITEMS),
    primaryFocus: truncatePrimaryFocus(profile.systemPrompt || ''),
    fullPromptAvailable: true,
  };
}

/**
 * Extract and truncate primary focus from system prompt
 * Takes first sentence or first 100 characters, whichever is shorter
 *
 * @param systemPrompt - Full system prompt text
 * @returns Truncated primary focus string
 *
 * @example
 * ```typescript
 * truncatePrimaryFocus('You are an expert. This is detailed.')
 * // "You are an expert"
 *
 * truncatePrimaryFocus('Very long sentence that goes on and on and exceeds one hundred characters without any punctuation marks')
 * // "Very long sentence that goes on and on and exceeds one hundred characters without any punctuatio..."
 * ```
 */
function truncatePrimaryFocus(systemPrompt: string): string {
  if (!systemPrompt) return '';

  // Take first sentence or first 100 chars, whichever is shorter
  const firstSentence = systemPrompt.split(/[.!?]\s/)[0];
  const focus = firstSentence || systemPrompt;

  if (focus.length <= MAX_PRIMARY_FOCUS_LENGTH) {
    return focus;
  }
  return focus.slice(0, MAX_PRIMARY_FOCUS_LENGTH - 3) + '...';
}
