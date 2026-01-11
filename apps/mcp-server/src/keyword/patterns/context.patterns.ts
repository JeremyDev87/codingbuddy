/**
 * Context Patterns
 *
 * These patterns match file paths to suggest appropriate agents.
 * Used for file path-based agent resolution when no explicit request
 * or intent patterns match.
 *
 * @example
 * "src/components/Button.tsx" → frontend-developer (0.7)
 * "schema.prisma" → data-engineer (0.95)
 * "main.tf" → platform-engineer (0.95)
 */

import type { ContextPattern } from './intent-patterns.types';

export const CONTEXT_PATTERNS: ReadonlyArray<ContextPattern> = [
  // Mobile patterns (highest priority for mobile projects)
  {
    pattern: /react-native\.config\.js$/i,
    agent: 'mobile-developer',
    confidence: 0.95,
  },
  {
    pattern: /metro\.config\.js$/i,
    agent: 'mobile-developer',
    confidence: 0.95,
  },
  { pattern: /app\.json$/i, agent: 'mobile-developer', confidence: 0.85 },
  { pattern: /pubspec\.yaml$/i, agent: 'mobile-developer', confidence: 0.95 },
  { pattern: /\.dart$/i, agent: 'mobile-developer', confidence: 0.9 },
  { pattern: /Podfile$/i, agent: 'mobile-developer', confidence: 0.9 },
  { pattern: /\.swift$/i, agent: 'mobile-developer', confidence: 0.9 },
  {
    pattern: /build\.gradle(\.kts)?$/i,
    agent: 'mobile-developer',
    confidence: 0.85,
  },
  {
    pattern: /AndroidManifest\.xml$/i,
    agent: 'mobile-developer',
    confidence: 0.9,
  },
  { pattern: /\.kt$/i, agent: 'mobile-developer', confidence: 0.85 },
  // Data patterns
  { pattern: /\.sql$/i, agent: 'data-engineer', confidence: 0.9 },
  { pattern: /schema\.prisma$/i, agent: 'data-engineer', confidence: 0.95 },
  { pattern: /migrations?\//i, agent: 'data-engineer', confidence: 0.9 },
  { pattern: /\.entity\.ts$/i, agent: 'data-engineer', confidence: 0.85 },
  // Platform Engineering / IaC patterns (highest priority for infra files)
  { pattern: /\.tf$/i, agent: 'platform-engineer', confidence: 0.95 },
  { pattern: /\.tfvars$/i, agent: 'platform-engineer', confidence: 0.95 },
  {
    pattern: /terragrunt\.hcl$/i,
    agent: 'platform-engineer',
    confidence: 0.95,
  },
  { pattern: /Chart\.yaml$/i, agent: 'platform-engineer', confidence: 0.95 },
  { pattern: /values\.yaml$/i, agent: 'platform-engineer', confidence: 0.75 },
  {
    pattern: /helm.*templates\/|charts\/.*templates\//i,
    agent: 'platform-engineer',
    confidence: 0.9,
  },
  {
    pattern: /kustomization\.ya?ml$/i,
    agent: 'platform-engineer',
    confidence: 0.95,
  },
  {
    pattern: /Pulumi\.ya?ml$/i,
    agent: 'platform-engineer',
    confidence: 0.95,
  },
  {
    pattern: /argocd\/|argo-cd\//i,
    agent: 'platform-engineer',
    confidence: 0.9,
  },
  {
    pattern: /flux-system\//i,
    agent: 'platform-engineer',
    confidence: 0.9,
  },
  // DevOps patterns (CI/CD, containers)
  {
    pattern: /Dockerfile|docker-compose/i,
    agent: 'devops-engineer',
    confidence: 0.9,
  },
  // Backend patterns
  { pattern: /\.go$/i, agent: 'backend-developer', confidence: 0.85 },
  { pattern: /\.py$/i, agent: 'backend-developer', confidence: 0.85 },
  { pattern: /\.java$/i, agent: 'backend-developer', confidence: 0.85 },
  { pattern: /\.rs$/i, agent: 'backend-developer', confidence: 0.85 },
  // Frontend patterns (lower priority)
  { pattern: /\.tsx?$/i, agent: 'frontend-developer', confidence: 0.7 },
  { pattern: /\.jsx?$/i, agent: 'frontend-developer', confidence: 0.7 },
  // Agent patterns
  { pattern: /agents?.*\.json$/i, agent: 'agent-architect', confidence: 0.8 },
];
