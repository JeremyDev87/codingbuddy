/**
 * Tooling Engineer Intent Patterns
 *
 * These patterns detect prompts related to configuration, build tools, and package management.
 * They are checked BEFORE context patterns (file path inference) but AFTER explicit agent requests.
 *
 * Resolution Priority Order:
 * 1. Explicit request in prompt ("backend-developer로 작업해") - highest
 * 2. recommended_agent from PLAN mode (PLAN→ACT context passing)
 * 3. **TOOLING_INTENT_PATTERNS** ← checked here
 * 4. PLATFORM_INTENT_PATTERNS
 * 5. DATA_INTENT_PATTERNS
 * 6. MOBILE_INTENT_PATTERNS
 * 7. CONTEXT_PATTERNS (file path/extension inference)
 * 8. Project config (primaryAgent setting)
 * 9. Default fallback (frontend-developer) - lowest
 *
 * Confidence Levels:
 * - 0.95-0.98: Highly specific config file names (tsconfig, vite.config, etc.)
 * - 0.85-0.90: Generic patterns, lock files, Korean keywords
 *
 * @example
 * // English patterns
 * "Fix tsconfig.json error" → tooling-engineer (0.95 confidence)
 * "Update vite.config.ts"   → tooling-engineer (0.95 confidence)
 *
 * // Korean patterns
 * "eslint 설정 변경해줘"    → tooling-engineer (0.85 confidence)
 * "빌드 설정 수정"          → tooling-engineer (0.85 confidence)
 */

import type { IntentPattern } from './intent-patterns.types';

export const TOOLING_INTENT_PATTERNS: ReadonlyArray<IntentPattern> = [
  // Config files with high confidence (0.95-0.98)
  {
    pattern: /codingbuddy\.config/i,
    confidence: 0.98,
    description: 'CodingBuddy config',
  },
  {
    pattern: /tsconfig.*\.json/i,
    confidence: 0.95,
    description: 'TypeScript config',
  },
  { pattern: /eslint/i, confidence: 0.95, description: 'ESLint config' },
  {
    pattern: /prettier/i,
    confidence: 0.95,
    description: 'Prettier config',
  },
  {
    pattern: /stylelint/i,
    confidence: 0.95,
    description: 'Stylelint config',
  },
  // Build tools (0.90-0.95)
  {
    pattern: /vite\.config/i,
    confidence: 0.95,
    description: 'Vite config',
  },
  {
    pattern: /next\.config/i,
    confidence: 0.95,
    description: 'Next.js config',
  },
  { pattern: /webpack/i, confidence: 0.9, description: 'Webpack config' },
  {
    pattern: /rollup\.config/i,
    confidence: 0.9,
    description: 'Rollup config',
  },
  // Package management (0.85-0.90)
  {
    pattern: /package\.json/i,
    confidence: 0.9,
    description: 'Package.json',
  },
  {
    pattern: /yarn\.lock|pnpm-lock|package-lock/i,
    confidence: 0.85,
    description: 'Lock files',
  },
  // Generic config patterns (0.85)
  {
    pattern: /\.config\.(js|ts|mjs|cjs|json)$/i,
    confidence: 0.85,
    description: 'Config file extension',
  },
  // Korean patterns (0.85) - for Korean-speaking users
  {
    pattern: /설정\s*(파일|변경|수정)/i,
    confidence: 0.85,
    description: 'Korean: config file',
  },
  {
    pattern: /빌드\s*(설정|도구|환경)/i,
    confidence: 0.85,
    description: 'Korean: build config',
  },
  {
    pattern: /패키지\s*(관리|설치|업데이트|의존성)/i,
    confidence: 0.85,
    description: 'Korean: package management',
  },
  {
    pattern: /린터|린트\s*설정/i,
    confidence: 0.85,
    description: 'Korean: linter config',
  },
];
