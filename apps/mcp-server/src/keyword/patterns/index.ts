/**
 * Patterns Module
 *
 * This module exports all pattern definitions used by PrimaryAgentResolver
 * for intent-based and context-based agent resolution.
 *
 * Pattern Categories:
 * - Explicit patterns: Direct agent requests in prompts
 * - Intent patterns: Keywords and phrases for specific domains
 * - Context patterns: File path-based agent suggestions
 * - Meta-discussion patterns: Filters out discussions about agents
 */

// Types
export type {
  IntentPattern,
  IntentPatternCheck,
  ContextPattern,
} from './intent-patterns.types';

// Explicit patterns
export { EXPLICIT_PATTERNS } from './explicit.patterns';

// Intent patterns by domain
export { AGENT_INTENT_PATTERNS } from './agent.patterns';
export { AI_ML_INTENT_PATTERNS } from './ai-ml.patterns';
export { BACKEND_INTENT_PATTERNS } from './backend.patterns';
export { DATA_INTENT_PATTERNS } from './data.patterns';
export { MOBILE_INTENT_PATTERNS } from './mobile.patterns';
export { PLATFORM_INTENT_PATTERNS } from './platform.patterns';
export { TOOLING_INTENT_PATTERNS } from './tooling.patterns';

// Aggregated intent pattern checks
export { INTENT_PATTERN_CHECKS } from './intent-pattern-checks';

// Context patterns
export { CONTEXT_PATTERNS } from './context.patterns';

// Meta-discussion patterns
export { META_AGENT_DISCUSSION_PATTERNS } from './meta-discussion.patterns';
