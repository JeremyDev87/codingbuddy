/**
 * Explicit Pattern Matcher
 *
 * Matches user prompts against agents' activation.explicit_patterns fields.
 * Used by PrimaryAgentResolver to select agents based on keyword matching.
 *
 * Priority in resolution chain: explicit request > explicit_patterns > recommended > config > intent > default
 */

import type { PrimaryAgentResolutionResult } from './keyword.types';

/** Map of agent name → explicit pattern strings from activation.explicit_patterns */
export type ExplicitPatternsMap = Map<string, string[]>;

/**
 * Match user prompt against agents' explicit_patterns.
 *
 * Performs case-insensitive substring matching. When multiple agents match,
 * the agent with the longest matching pattern wins (most specific match).
 *
 * @param prompt - User's prompt text
 * @param patternsMap - Map of agent name to their explicit_patterns arrays
 * @param availableAgents - List of agents available for selection
 * @returns Resolution result if a match is found, null otherwise
 */
export function matchExplicitPatterns(
  prompt: string,
  patternsMap: ExplicitPatternsMap,
  availableAgents: string[],
): PrimaryAgentResolutionResult | null {
  if (!prompt || patternsMap.size === 0 || availableAgents.length === 0) {
    return null;
  }

  const lowerPrompt = prompt.toLowerCase();
  const availableSet = new Set(availableAgents);

  let bestMatch: { agentName: string; pattern: string; length: number } | null = null;

  for (const [agentName, patterns] of patternsMap) {
    if (!availableSet.has(agentName)) {
      continue;
    }

    for (const pattern of patterns) {
      const lowerPattern = pattern.toLowerCase();
      if (lowerPrompt.includes(lowerPattern)) {
        if (!bestMatch || lowerPattern.length > bestMatch.length) {
          bestMatch = { agentName, pattern, length: lowerPattern.length };
        }
      }
    }
  }

  if (!bestMatch) {
    return null;
  }

  return {
    agentName: bestMatch.agentName,
    source: 'explicit_patterns',
    confidence: 0.95,
    reason: `Matched explicit pattern: "${bestMatch.pattern}"`,
  };
}
