/**
 * Platform Engineer Intent Patterns
 *
 * These patterns detect prompts related to Infrastructure as Code, Kubernetes,
 * multi-cloud, GitOps, and platform engineering tasks.
 * Priority: 4th (after explicit, recommended, tooling patterns; before data, mobile, context).
 *
 * Confidence Levels:
 * - 0.95: Highly specific IaC tools (Terraform, Pulumi, Helm, Argo CD)
 * - 0.90: Kubernetes, cloud provider infrastructure, GitOps keywords
 * - 0.85: Generic infrastructure patterns, Korean keywords
 *
 * ## Pattern Overlap with Tooling Engineer
 *
 * Both agents deal with configuration files, but they serve different purposes:
 *
 * | Pattern Type | tooling-engineer | platform-engineer |
 * |--------------|------------------|-------------------|
 * | Config files | tsconfig, vite.config, eslint | terraform.tf, Chart.yaml |
 * | Focus area   | Build tools, bundlers, linters | IaC, K8s, cloud infra |
 * | Resolution   | Checked 3rd (higher priority) | Checked 4th (after tooling) |
 *
 * Conflict Resolution:
 * - tooling-engineer patterns are checked BEFORE platform-engineer
 * - If both could match, tooling-engineer wins by priority order
 * - Platform-specific keywords (terraform, helm, k8s) are unambiguous
 *
 * @example
 * "terraform 모듈 작성해줘" → platform-engineer (0.95)
 * "k8s 매니페스트 수정" → platform-engineer (0.90)
 * "인프라 코드 설정" → platform-engineer (0.85)
 */

import type { IntentPattern } from './intent-patterns.types';

export const PLATFORM_INTENT_PATTERNS: ReadonlyArray<IntentPattern> = [
  // IaC tools (0.95)
  { pattern: /terraform/i, confidence: 0.95, description: 'Terraform' },
  { pattern: /pulumi/i, confidence: 0.95, description: 'Pulumi' },
  { pattern: /aws.?cdk/i, confidence: 0.95, description: 'AWS CDK' },
  { pattern: /helm/i, confidence: 0.95, description: 'Helm chart' },
  {
    pattern: /argocd|argo.?cd/i,
    confidence: 0.95,
    description: 'Argo CD',
  },
  { pattern: /flux.?cd|fluxcd/i, confidence: 0.95, description: 'Flux CD' },
  // Kubernetes patterns (0.90-0.95)
  {
    pattern: /kubernetes|k8s/i,
    confidence: 0.9,
    description: 'Kubernetes',
  },
  {
    pattern: /kustomize|kustomization/i,
    confidence: 0.95,
    description: 'Kustomize',
  },
  {
    pattern: /kubectl|kubeconfig/i,
    confidence: 0.9,
    description: 'Kubectl',
  },
  {
    pattern: /k8s.*manifest|manifest.*k8s|kubernetes.*manifest/i,
    confidence: 0.9,
    description: 'K8s manifest',
  },
  // Cloud provider infrastructure (0.85-0.90)
  {
    pattern: /EKS|GKE|AKS/i,
    confidence: 0.9,
    description: 'Managed Kubernetes',
  },
  {
    pattern: /IRSA|workload.?identity/i,
    confidence: 0.9,
    description: 'Workload identity',
  },
  {
    pattern: /인프라\s*(코드|설정|관리|자동화)/i,
    confidence: 0.85,
    description: 'Korean: infrastructure',
  },
  {
    pattern: /infrastructure.?as.?code|IaC/i,
    confidence: 0.9,
    description: 'Infrastructure as Code',
  },
  // GitOps patterns (0.90)
  { pattern: /gitops/i, confidence: 0.9, description: 'GitOps' },
  // Multi-cloud patterns (0.85)
  {
    pattern: /multi.?cloud|hybrid.?cloud/i,
    confidence: 0.85,
    description: 'Multi-cloud',
  },
  // Cost optimization patterns (0.85)
  {
    pattern: /finops|cloud.?cost|비용\s*최적화/i,
    confidence: 0.85,
    description: 'Cloud cost optimization',
  },
  // Disaster recovery (0.85)
  {
    pattern: /disaster.?recovery|RTO|RPO/i,
    confidence: 0.85,
    description: 'Disaster recovery',
  },
];
