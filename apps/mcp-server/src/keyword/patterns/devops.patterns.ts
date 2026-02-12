/**
 * DevOps Engineer Intent Patterns
 *
 * These patterns detect prompts related to CI/CD, deployment,
 * containers, monitoring, and infrastructure automation.
 * Priority: 9th (after frontend patterns, before mobile).
 *
 * Confidence Levels:
 * - 0.95: CI/CD tools (GitHub Actions, Jenkins, ArgoCD)
 * - 0.90: Container/deployment (Docker, pipeline, monitoring)
 * - 0.85: Generic devops keywords
 *
 * @example
 * "GitHub Actions 워크플로우 만들어줘" → devops-engineer (0.95)
 * "CI/CD 파이프라인 설계해줘" → devops-engineer (0.90)
 * "데브옵스 구축" → devops-engineer (0.85)
 */

import type { IntentPattern } from './intent-patterns.types';

export const DEVOPS_INTENT_PATTERNS: ReadonlyArray<IntentPattern> = [
  // CI/CD Tools (0.95)
  {
    pattern: /github\s*actions/i,
    confidence: 0.95,
    description: 'GitHub Actions',
  },
  {
    pattern: /jenkins|circleci|gitlab\s*ci/i,
    confidence: 0.95,
    description: 'CI/CD Tool',
  },
  {
    pattern: /argocd|argo\s*cd|flux\s*cd/i,
    confidence: 0.95,
    description: 'GitOps Tool',
  },
  // Container/Deployment (0.90)
  {
    pattern: /docker\s*(compose|file|image|빌드|build)/i,
    confidence: 0.9,
    description: 'Docker',
  },
  {
    pattern: /CI\s*\/?\s*CD\s*(파이프라인|pipeline|설정|설계|구축)/i,
    confidence: 0.9,
    description: 'CI/CD Pipeline',
  },
  {
    pattern:
      /배포\s*(파이프라인|전략|자동화)|deploy\s*(pipeline|strateg|automat)/i,
    confidence: 0.9,
    description: 'Deployment',
  },
  {
    pattern: /모니터링\s*(설정|구축|시스템)|monitoring\s*(setup|system)/i,
    confidence: 0.9,
    description: 'Monitoring',
  },
  // Generic devops (0.85)
  {
    pattern: /데브옵스|devops/i,
    confidence: 0.85,
    description: 'DevOps',
  },
  {
    pattern: /인프라\s*(자동화|코드)|infrastructure\s*as\s*code/i,
    confidence: 0.85,
    description: 'IaC',
  },
  {
    pattern: /로그\s*(수집|분석|관리)|log\s*(collect|aggregat|manag)/i,
    confidence: 0.85,
    description: 'Log Management',
  },
];
