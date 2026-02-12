/**
 * Frontend Developer Intent Patterns
 *
 * These patterns detect prompts related to UI development,
 * frontend frameworks, and client-side implementation.
 * Priority: 8th (after backend patterns, before devops).
 *
 * Confidence Levels:
 * - 0.95: Frontend frameworks (React, Vue, Angular, Svelte, Next.js)
 * - 0.90: UI patterns (component, CSS, styling, layout)
 * - 0.85: Generic frontend keywords
 *
 * @example
 * "React 컴포넌트 만들어줘" → frontend-developer (0.95)
 * "UI 컴포넌트 개발해줘" → frontend-developer (0.90)
 * "프론트엔드 개발" → frontend-developer (0.85)
 */

import type { IntentPattern } from './intent-patterns.types';

export const FRONTEND_INTENT_PATTERNS: ReadonlyArray<IntentPattern> = [
  // Frontend Frameworks (0.95)
  {
    pattern: /react\s*(컴포넌트|component|개발|앱|app)/i,
    confidence: 0.95,
    description: 'React',
  },
  {
    pattern: /vue\.?js|vue\s*(컴포넌트|component)/i,
    confidence: 0.95,
    description: 'Vue.js',
  },
  {
    pattern: /angular\s*(컴포넌트|component|모듈|module)/i,
    confidence: 0.95,
    description: 'Angular',
  },
  {
    pattern: /svelte|sveltekit/i,
    confidence: 0.95,
    description: 'Svelte',
  },
  {
    pattern: /next\.?js\s*(페이지|page|라우팅|routing|컴포넌트|component)/i,
    confidence: 0.95,
    description: 'Next.js',
  },
  {
    pattern: /nuxt\.?js/i,
    confidence: 0.95,
    description: 'Nuxt.js',
  },
  // UI Patterns (0.90)
  {
    pattern: /UI\s*(컴포넌트|component)/i,
    confidence: 0.9,
    description: 'UI Component',
  },
  {
    pattern: /(?:웹|web)\s*UI\s*(개발|develop|구현|implement)/i,
    confidence: 0.9,
    description: 'Web UI Development',
  },
  {
    pattern: /CSS\s*(모듈|module|스타일|style)|tailwind|styled.?component/i,
    confidence: 0.9,
    description: 'CSS/Styling',
  },
  {
    pattern: /레이아웃\s*(설계|구현)|layout\s*(design|implement)/i,
    confidence: 0.9,
    description: 'Layout',
  },
  {
    pattern: /반응형|responsive\s*(design|UI|web)/i,
    confidence: 0.9,
    description: 'Responsive Design',
  },
  // Generic frontend (0.85)
  {
    pattern: /프론트엔드\s*(개발|구현)|frontend\s*(develop|implement)/i,
    confidence: 0.85,
    description: 'Frontend Development',
  },
  {
    pattern: /웹\s*페이지\s*(개발|구현|설계)|페이지\s*(개발|구현|설계)/i,
    confidence: 0.85,
    description: 'Web Page Development',
  },
  {
    pattern: /상태\s*관리|state\s*management/i,
    confidence: 0.85,
    description: 'State Management',
  },
];
