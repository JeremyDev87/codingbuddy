/**
 * Mobile Developer Intent Patterns
 *
 * These patterns detect prompts related to mobile app development.
 * Priority: 7th (after agent, tooling, platform, data, ai-ml, backend patterns).
 * Moved to last position because patterns are greedy and can match agent name mentions.
 *
 * Confidence Levels:
 * - 0.95: Platform-specific frameworks (React Native, Flutter, SwiftUI, Jetpack Compose)
 * - 0.90: Generic mobile keywords, platform names (iOS, Android), Expo
 *
 * @example
 * "React Native 컴포넌트 만들어줘" → mobile-developer (0.95)
 * "Flutter 위젯 구현해" → mobile-developer (0.95)
 * "모바일 앱 화면 개발" → mobile-developer (0.90)
 */

import type { IntentPattern } from './intent-patterns.types';

export const MOBILE_INTENT_PATTERNS: ReadonlyArray<IntentPattern> = [
  // Platform-specific patterns (0.95)
  {
    pattern: /react.?native/i,
    confidence: 0.95,
    description: 'React Native',
  },
  { pattern: /flutter/i, confidence: 0.95, description: 'Flutter' },
  { pattern: /expo/i, confidence: 0.9, description: 'Expo' },
  { pattern: /swiftui/i, confidence: 0.95, description: 'SwiftUI' },
  {
    pattern: /jetpack\s*compose/i,
    confidence: 0.95,
    description: 'Jetpack Compose',
  },
  // Generic mobile patterns (0.85-0.90)
  {
    pattern: /모바일\s*(앱|개발|화면)/i,
    confidence: 0.9,
    description: 'Korean: mobile app',
  },
  {
    pattern: /mobile\s*(app|develop|screen)/i,
    confidence: 0.9,
    description: 'Mobile app',
  },
  { pattern: /iOS\s*(앱|개발)/i, confidence: 0.9, description: 'iOS app' },
  {
    pattern: /android\s*(앱|개발)/i,
    confidence: 0.9,
    description: 'Android app',
  },
];
