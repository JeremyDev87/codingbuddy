/**
 * Security Engineer Intent Patterns
 *
 * These patterns detect prompts related to security feature implementation,
 * vulnerability remediation, authentication/authorization, and encryption.
 * Priority: 5th (after agent-architect/test-engineer/tooling-engineer/platform-engineer, before data-engineer).
 *
 * Confidence Levels:
 * - 0.95: Explicit security vulnerabilities (SQL injection, XSS, CSRF), auth protocols (JWT, OAuth)
 * - 0.90: Generic security implementation requests (EN + KO), encryption, RBAC
 *
 * NOTE: Patterns are scoped to *implementation* verbs (구현, 추가, 수정, fix, implement, add)
 * to avoid capturing EVAL-mode "보안 검토/감사" prompts.
 *
 * @example
 * "JWT 인증 구현해줘" → security-engineer (0.95)
 * "SQL injection 취약점 수정" → security-engineer (0.95)
 * "비밀번호 암호화 추가" → security-engineer (0.90)
 * "RBAC 구현해줘" → security-engineer (0.90)
 */

import type { IntentPattern } from './intent-patterns.types';

export const SECURITY_INTENT_PATTERNS: ReadonlyArray<IntentPattern> = [
  // Explicit vulnerability types (0.95)
  {
    pattern: /SQL\s*(injection|인젝션)/i,
    confidence: 0.95,
    description: 'SQL Injection vulnerability',
  },
  {
    pattern: /XSS\s*(방어|방지|수정|취약점|fix|prevent|vulnerabilit)/i, // "vulnerabilit" prefix matches both -y and -ies
    confidence: 0.95,
    description: 'XSS vulnerability',
  },
  {
    pattern: /CSRF\s*(방어|방지|토큰|fix|prevent|token)/i,
    confidence: 0.95,
    description: 'CSRF vulnerability',
  },
  // Auth protocols — implementation-scoped (0.95)
  {
    pattern: /JWT\s*(구현|인증|토큰\s*생성|implement|auth)/i,
    confidence: 0.95,
    description: 'JWT implementation',
  },
  {
    pattern: /OAuth\s*(구현|2\.0|플로우|implement|flow)/i,
    confidence: 0.95,
    description: 'OAuth implementation',
  },
  // Password hashing (0.95)
  {
    pattern: /bcrypt|argon2|password\s*hash(ing)?/i,
    confidence: 0.95,
    description: 'Password hashing',
  },
  // Security vulnerability fix (0.95)
  {
    pattern: /보안\s*(취약점|버그|이슈)\s*(수정|패치|fix|해결)/i,
    confidence: 0.95,
    description: 'Korean: Fix security vulnerability',
  },
  {
    pattern: /security\s*(vulnerabilit\w*|bug|issue)\s*(fix|patch|resolv)/i,
    confidence: 0.95,
    description: 'Fix security vulnerability (EN)',
  },
  // OWASP — implementation-scoped (0.90)
  {
    pattern: /OWASP\s*(구현|적용|준수\s*구현|implement|apply|remedi)/i, // "remedi" prefix matches remediate/remediation/remedy
    confidence: 0.9,
    description: 'OWASP guideline implementation',
  },
  // Authentication implementation — generic (0.90)
  {
    pattern: /인증\s*(구현|개발|시스템\s*(구현|개발))/i,
    confidence: 0.9,
    description: 'Korean: Auth implementation',
  },
  {
    pattern: /authentication\s*(implement|develop|system)/i,
    confidence: 0.9,
    description: 'Authentication implementation (EN)',
  },
  // Authorization / RBAC (0.90)
  {
    pattern: /인가\s*(구현|로직)|authorization\s*(implement|logic)/i,
    confidence: 0.9,
    description: 'Authorization implementation',
  },
  {
    pattern: /RBAC|role[-\s]?based\s*access(\s*control)?/i,
    confidence: 0.9,
    description: 'Role-based access control',
  },
  // Encryption (0.90)
  {
    pattern: /암호화\s*(구현|추가|적용)|encrypt(ion)?\s*(implement|add|apply)/i,
    confidence: 0.9,
    description: 'Encryption implementation',
  },
  // Secrets management (0.90)
  {
    pattern: /secrets?\s*(관리|management)/i,
    confidence: 0.9,
    description: 'Secrets management',
  },
  // Rate limiting — implementation-scoped (0.90)
  {
    pattern: /rate\s*limit\s*(구현|추가|implement|add)/i,
    confidence: 0.9,
    description: 'Rate limiting implementation',
  },
  // Input sanitization — implementation-scoped (0.78, lower to avoid false positives)
  {
    pattern: /sanitiz(e|ation)|입력\s*검증\s*(구현|추가)/i,
    confidence: 0.78,
    description: 'Input sanitization implementation',
  },
  // CORS configuration — implementation-scoped (0.90)
  {
    pattern: /CORS\s*(설정|구현|정책|configuration|policy|implement)/i,
    confidence: 0.9,
    description: 'CORS configuration',
  },
  // Security headers / CSP / HSTS — implementation-scoped (0.90)
  {
    pattern: /CSP|Content[-\s]Security[-\s]Policy|security\s*header/i,
    confidence: 0.9,
    description: 'Security headers / CSP',
  },
  {
    pattern: /HSTS|Strict[-\s]Transport[-\s]Security/i,
    confidence: 0.88,
    description: 'HSTS / Strict-Transport-Security',
  },
];
