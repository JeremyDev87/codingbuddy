/**
 * Test Engineer Intent Patterns
 *
 * These patterns detect prompts related to TDD, unit/integration/e2e testing,
 * coverage improvement, and test framework usage.
 * Priority: 2nd (after agent-architect, before tooling-engineer).
 *
 * Confidence Levels:
 * - 0.95: Explicit TDD keyword, test framework names (Jest, Vitest, Playwright, Cypress)
 * - 0.90: Generic test writing/adding requests (EN + KO), spec file patterns
 *
 * @example
 * "테스트 코드 작성해줘" → test-engineer (0.90)
 * "Jest unit test 추가" → test-engineer (0.95)
 * "TDD로 구현해줘" → test-engineer (0.95)
 * "e2e 테스트 작성" → test-engineer (0.90)
 */

import type { IntentPattern } from './intent-patterns.types';

export const TEST_INTENT_PATTERNS: ReadonlyArray<IntentPattern> = [
  // TDD explicit (0.95)
  {
    pattern: /TDD\s*(로|로\s*구현|cycle|approach)/i,
    confidence: 0.95,
    description: 'TDD approach',
  },
  {
    pattern: /red.?green.?refactor/i,
    confidence: 0.95,
    description: 'TDD Red-Green-Refactor cycle',
  },
  // Test framework names (0.95)
  {
    pattern: /\b(jest|vitest|mocha|jasmine)\s*(unit|test|spec|설정|config)/i,
    confidence: 0.95,
    description: 'Jest/Vitest/Mocha/Jasmine test',
  },
  {
    pattern: /\b(playwright|cypress|puppeteer)\s*(test|e2e|설정)/i,
    confidence: 0.95,
    description: 'E2E test framework',
  },
  // Test writing requests in Korean (0.90)
  {
    pattern: /테스트\s*(코드|케이스)\s*(작성|추가|구현)/i,
    confidence: 0.9,
    description: 'Korean: Write test code/cases',
  },
  {
    pattern: /단위\s*테스트\s*(작성|추가|구현)/i,
    confidence: 0.9,
    description: 'Korean: Write unit test',
  },
  {
    pattern: /통합\s*테스트\s*(작성|추가|구현)/i,
    confidence: 0.9,
    description: 'Korean: Write integration test',
  },
  {
    pattern: /e2e\s*(테스트|test)\s*(작성|추가|구현)/i,
    confidence: 0.9,
    description: 'E2E test writing (KO+EN)',
  },
  // Generic test terms (0.90)
  {
    pattern: /단위\s*테스트|unit\s*test/i,
    confidence: 0.9,
    description: 'Unit test',
  },
  {
    pattern: /통합\s*테스트|integration\s*test/i,
    confidence: 0.9,
    description: 'Integration test',
  },
  {
    pattern: /end.?to.?end\s*(test|테스트)/i,
    confidence: 0.9,
    description: 'End-to-end test',
  },
  // Coverage (0.90)
  {
    pattern: /커버리지\s*(개선|향상|추가|올려|높여)|test\s*coverage/i,
    confidence: 0.9,
    description: 'Test coverage improvement',
  },
  // Spec/test file creation (verb required to avoid false positives, 0.90)
  {
    pattern:
      /(?:작성|추가|구현|write|add|create).{0,15}\.(?:spec|test)\.\w+|\.(?:spec|test)\.\w+.{0,30}(?:작성|추가|구현|write|add|create)/i,
    confidence: 0.9,
    description: 'Create/write spec or test file',
  },
];
