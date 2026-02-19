/**
 * Intent Pattern Checks Aggregation
 *
 * Static array of intent pattern checks for ACT mode agent resolution.
 * Priority is determined by array order (first match wins).
 *
 * Pattern check order (reordered to prevent false positives):
 * 1. agent-architect - MCP, AI agents, workflows (MOVED UP - prevents false positives from agent name mentions)
 * 2. test-engineer - TDD, unit/integration/e2e tests, coverage (before backend/frontend to prevent keyword theft)
 * 3. tooling-engineer - Build tools, linters, bundlers
 * 4. platform-engineer - IaC, Kubernetes, cloud infrastructure
 * 5. security-engineer - Security implementation, vulnerability fixes, auth/authz, encryption
 * 6. systems-developer - Rust, C, C++, FFI, WASM, embedded, low-level optimization
 * 7. data-engineer - Database, schema, migrations
 * 8. ai-ml-engineer - ML frameworks, LLM, embeddings
 * 9. backend-developer - APIs, servers, authentication
 * 10. frontend-developer - React, Vue, Angular, UI components, CSS
 * 11. devops-engineer - CI/CD, Docker, deployment, monitoring
 * 12. mobile-developer - React Native, Flutter, iOS/Android (MOVED DOWN - "mobile develop" patterns are greedy)
 */

import type { IntentPatternCheck } from './intent-patterns.types';
import { AGENT_INTENT_PATTERNS } from './agent.patterns';
import { TEST_INTENT_PATTERNS } from './test.patterns';
import { TOOLING_INTENT_PATTERNS } from './tooling.patterns';
import { PLATFORM_INTENT_PATTERNS } from './platform.patterns';
import { SECURITY_INTENT_PATTERNS } from './security.patterns';
import { SYSTEMS_INTENT_PATTERNS } from './systems.patterns';
import { DATA_INTENT_PATTERNS } from './data.patterns';
import { AI_ML_INTENT_PATTERNS } from './ai-ml.patterns';
import { BACKEND_INTENT_PATTERNS } from './backend.patterns';
import { FRONTEND_INTENT_PATTERNS } from './frontend.patterns';
import { DEVOPS_INTENT_PATTERNS } from './devops.patterns';
import { MOBILE_INTENT_PATTERNS } from './mobile.patterns';

export const INTENT_PATTERN_CHECKS: ReadonlyArray<IntentPatternCheck> = [
  // Agent-related patterns first (prevents "Mobile Developer" text triggering mobile patterns)
  {
    agent: 'agent-architect',
    patterns: AGENT_INTENT_PATTERNS,
    category: 'Agent',
  },
  // Test patterns second (before backend/frontend to prevent test keywords being stolen)
  {
    agent: 'test-engineer',
    patterns: TEST_INTENT_PATTERNS,
    category: 'Test',
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
    agent: 'security-engineer',
    patterns: SECURITY_INTENT_PATTERNS,
    category: 'Security',
  },
  {
    agent: 'systems-developer',
    patterns: SYSTEMS_INTENT_PATTERNS,
    category: 'Systems',
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
  {
    agent: 'frontend-developer',
    patterns: FRONTEND_INTENT_PATTERNS,
    category: 'Frontend',
  },
  {
    agent: 'devops-engineer',
    patterns: DEVOPS_INTENT_PATTERNS,
    category: 'DevOps',
  },
  // Mobile patterns last (they are greedy and can match agent name mentions)
  {
    agent: 'mobile-developer',
    patterns: MOBILE_INTENT_PATTERNS,
    category: 'Mobile',
  },
];
