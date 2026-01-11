/**
 * Intent Pattern Checks Aggregation
 *
 * Static array of intent pattern checks for ACT mode agent resolution.
 * Priority is determined by array order (first match wins).
 *
 * Pattern check order (reordered to prevent false positives):
 * 1. agent-architect - MCP, AI agents, workflows (MOVED UP - prevents false positives from agent name mentions)
 * 2. tooling-engineer - Build tools, linters, bundlers
 * 3. platform-engineer - IaC, Kubernetes, cloud infrastructure
 * 4. data-engineer - Database, schema, migrations
 * 5. ai-ml-engineer - ML frameworks, LLM, embeddings
 * 6. backend-developer - APIs, servers, authentication
 * 7. mobile-developer - React Native, Flutter, iOS/Android (MOVED DOWN - "mobile develop" patterns are greedy)
 */

import type { IntentPatternCheck } from './intent-patterns.types';
import { AGENT_INTENT_PATTERNS } from './agent.patterns';
import { TOOLING_INTENT_PATTERNS } from './tooling.patterns';
import { PLATFORM_INTENT_PATTERNS } from './platform.patterns';
import { DATA_INTENT_PATTERNS } from './data.patterns';
import { AI_ML_INTENT_PATTERNS } from './ai-ml.patterns';
import { BACKEND_INTENT_PATTERNS } from './backend.patterns';
import { MOBILE_INTENT_PATTERNS } from './mobile.patterns';

export const INTENT_PATTERN_CHECKS: ReadonlyArray<IntentPatternCheck> = [
  // Agent-related patterns first (prevents "Mobile Developer" text triggering mobile patterns)
  {
    agent: 'agent-architect',
    patterns: AGENT_INTENT_PATTERNS,
    category: 'Agent',
  },
  {
    agent: 'tooling-engineer',
    patterns: TOOLING_INTENT_PATTERNS,
    category: 'Tooling',
  },
  {
    agent: 'platform-engineer',
    patterns: PLATFORM_INTENT_PATTERNS,
    category: 'Platform',
  },
  {
    agent: 'data-engineer',
    patterns: DATA_INTENT_PATTERNS,
    category: 'Data',
  },
  {
    agent: 'ai-ml-engineer',
    patterns: AI_ML_INTENT_PATTERNS,
    category: 'AI/ML',
  },
  {
    agent: 'backend-developer',
    patterns: BACKEND_INTENT_PATTERNS,
    category: 'Backend',
  },
  // Mobile patterns last (they are greedy and can match agent name mentions)
  {
    agent: 'mobile-developer',
    patterns: MOBILE_INTENT_PATTERNS,
    category: 'Mobile',
  },
];
