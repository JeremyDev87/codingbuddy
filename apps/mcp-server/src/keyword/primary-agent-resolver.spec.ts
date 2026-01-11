import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { PrimaryAgentResolver } from './primary-agent-resolver';
import { type ResolutionContext } from './keyword.types';

describe('PrimaryAgentResolver', () => {
  let resolver: PrimaryAgentResolver;
  let mockGetProjectConfig: Mock;
  let mockListPrimaryAgents: Mock;

  beforeEach(() => {
    mockGetProjectConfig = vi.fn().mockResolvedValue(null);
    mockListPrimaryAgents = vi
      .fn()
      .mockResolvedValue([
        'frontend-developer',
        'backend-developer',
        'agent-architect',
        'devops-engineer',
        'solution-architect',
        'technical-planner',
        'code-reviewer',
        'mobile-developer',
        'data-engineer',
        'platform-engineer',
        'tooling-engineer',
        'ai-ml-engineer',
      ]);

    resolver = new PrimaryAgentResolver(
      mockGetProjectConfig,
      mockListPrimaryAgents,
    );
  });

  describe('PLAN mode agent resolution', () => {
    describe('architecture-focused prompts', () => {
      it('returns solution-architect when prompt contains "아키텍처"', async () => {
        const result = await resolver.resolve(
          'PLAN',
          '인증 시스템 아키텍처를 설계해줘',
        );

        expect(result.agentName).toBe('solution-architect');
        expect(result.source).toBe('intent');
        expect(result.confidence).toBeGreaterThanOrEqual(0.8);
      });

      it('returns solution-architect when prompt contains "system design"', async () => {
        const result = await resolver.resolve(
          'PLAN',
          'Create a system design for the authentication module',
        );

        expect(result.agentName).toBe('solution-architect');
        expect(result.source).toBe('intent');
      });

      it('returns solution-architect when prompt contains "시스템 설계"', async () => {
        const result = await resolver.resolve(
          'PLAN',
          '새로운 결제 시스템 설계가 필요해',
        );

        expect(result.agentName).toBe('solution-architect');
        expect(result.source).toBe('intent');
      });

      it('returns solution-architect when prompt contains "API 설계"', async () => {
        const result = await resolver.resolve(
          'PLAN',
          'REST API 설계를 진행해줘',
        );

        expect(result.agentName).toBe('solution-architect');
        expect(result.source).toBe('intent');
      });

      it('returns solution-architect when prompt contains "microservice"', async () => {
        const result = await resolver.resolve(
          'PLAN',
          'Design a microservice architecture for the payment system',
        );

        expect(result.agentName).toBe('solution-architect');
        expect(result.source).toBe('intent');
      });
    });

    describe('planning-focused prompts', () => {
      it('returns technical-planner when prompt contains "구현 계획"', async () => {
        const result = await resolver.resolve(
          'PLAN',
          '로그인 기능 구현 계획을 작성해줘',
        );

        expect(result.agentName).toBe('technical-planner');
        expect(result.source).toBe('intent');
      });

      it('returns technical-planner when prompt contains "implementation plan"', async () => {
        const result = await resolver.resolve(
          'PLAN',
          'Write an implementation plan for the new feature',
        );

        expect(result.agentName).toBe('technical-planner');
        expect(result.source).toBe('intent');
      });

      it('returns technical-planner when prompt contains "TDD 계획"', async () => {
        const result = await resolver.resolve('PLAN', 'TDD 계획을 세워줘');

        expect(result.agentName).toBe('technical-planner');
        expect(result.source).toBe('intent');
      });

      it('returns technical-planner when prompt contains "step by step"', async () => {
        const result = await resolver.resolve(
          'PLAN',
          'Create a step-by-step plan for implementing the login feature',
        );

        expect(result.agentName).toBe('technical-planner');
        expect(result.source).toBe('intent');
      });

      it('returns technical-planner when prompt contains "개발 계획"', async () => {
        const result = await resolver.resolve(
          'PLAN',
          '새 기능 개발 계획을 세워줘',
        );

        expect(result.agentName).toBe('technical-planner');
        expect(result.source).toBe('intent');
      });

      it('returns technical-planner when prompt contains "refactoring plan"', async () => {
        const result = await resolver.resolve(
          'PLAN',
          'Create a refactoring plan for the authentication module',
        );

        expect(result.agentName).toBe('technical-planner');
        expect(result.source).toBe('intent');
      });
    });

    describe('mixed intent prompts (both patterns match)', () => {
      it('returns solution-architect when both architecture and planning keywords present', async () => {
        const result = await resolver.resolve(
          'PLAN',
          'Create an architecture plan for the microservice',
        );

        // Architecture takes precedence over planning
        expect(result.agentName).toBe('solution-architect');
        expect(result.source).toBe('intent');
        expect(result.confidence).toBe(0.85);
        expect(result.reason).toContain('architecture takes precedence');
      });

      it('returns solution-architect when both 아키텍처 and 계획 present', async () => {
        const result = await resolver.resolve(
          'PLAN',
          '시스템 아키텍처 설계 계획을 세워줘',
        );

        expect(result.agentName).toBe('solution-architect');
        expect(result.source).toBe('intent');
      });

      it('returns solution-architect when system design and step present', async () => {
        const result = await resolver.resolve(
          'PLAN',
          'Create a system design with step-by-step implementation',
        );

        expect(result.agentName).toBe('solution-architect');
        expect(result.source).toBe('intent');
      });
    });

    describe('explicit PLAN agent request', () => {
      it('returns solution-architect when explicitly requested', async () => {
        const result = await resolver.resolve(
          'PLAN',
          'solution-architect로 작업해 새 기능 설계',
        );

        expect(result.agentName).toBe('solution-architect');
        expect(result.source).toBe('explicit');
      });

      it('returns technical-planner when explicitly requested', async () => {
        const result = await resolver.resolve(
          'PLAN',
          'use technical-planner agent to plan this feature',
        );

        expect(result.agentName).toBe('technical-planner');
        expect(result.source).toBe('explicit');
      });

      it('ignores ACT agent explicit requests in PLAN mode', async () => {
        const result = await resolver.resolve(
          'PLAN',
          'backend-developer로 작업해 새 API 만들어',
        );

        // Should use PLAN agent, not backend-developer
        expect(['solution-architect', 'technical-planner']).toContain(
          result.agentName,
        );
        expect(result.source).not.toBe('explicit');
      });
    });

    describe('default PLAN agent', () => {
      it('returns solution-architect when no specific intent detected', async () => {
        const result = await resolver.resolve('PLAN', '새 기능 만들어');

        expect(result.agentName).toBe('solution-architect');
        expect(result.source).toBe('default');
      });

      it('returns solution-architect for empty prompt', async () => {
        const result = await resolver.resolve('PLAN', '');

        expect(result.agentName).toBe('solution-architect');
        expect(result.source).toBe('default');
      });

      it('returns technical-planner when solution-architect unavailable', async () => {
        mockListPrimaryAgents.mockResolvedValue([
          'frontend-developer',
          'technical-planner',
        ]);

        const result = await resolver.resolve('PLAN', '새 기능 만들어');

        expect(result.agentName).toBe('technical-planner');
      });
    });
  });

  describe('ACT mode agent resolution', () => {
    describe('tooling-engineer pattern matching', () => {
      beforeEach(() => {
        // Add tooling-engineer to the available agents list
        mockListPrimaryAgents.mockResolvedValue([
          'tooling-engineer',
          'frontend-developer',
          'backend-developer',
          'agent-architect',
          'devops-engineer',
          'solution-architect',
          'technical-planner',
          'code-reviewer',
        ]);
      });

      it('returns tooling-engineer for codingbuddy.config.js prompt', async () => {
        const result = await resolver.resolve(
          'ACT',
          'codingbuddy.config.js 수정해',
        );

        expect(result.agentName).toBe('tooling-engineer');
        expect(result.source).toBe('intent');
        expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      });

      it('returns tooling-engineer for tsconfig.json prompt', async () => {
        const result = await resolver.resolve(
          'ACT',
          'tsconfig.json 설정 변경해줘',
        );

        expect(result.agentName).toBe('tooling-engineer');
        expect(result.source).toBe('intent');
      });

      it('returns tooling-engineer for eslint config prompt', async () => {
        const result = await resolver.resolve('ACT', 'eslint 규칙 추가해줘');

        expect(result.agentName).toBe('tooling-engineer');
        expect(result.source).toBe('intent');
      });

      it('returns tooling-engineer for package.json prompt', async () => {
        const result = await resolver.resolve(
          'ACT',
          'package.json 의존성 업데이트해',
        );

        expect(result.agentName).toBe('tooling-engineer');
        expect(result.source).toBe('intent');
      });

      it('returns tooling-engineer for vite.config prompt', async () => {
        const result = await resolver.resolve(
          'ACT',
          'vite.config.ts 최적화해줘',
        );

        expect(result.agentName).toBe('tooling-engineer');
        expect(result.source).toBe('intent');
      });

      it('returns tooling-engineer for Korean "설정 파일" prompt', async () => {
        const result = await resolver.resolve('ACT', '설정 파일 수정이 필요해');

        expect(result.agentName).toBe('tooling-engineer');
        expect(result.source).toBe('intent');
      });

      it('returns tooling-engineer for Korean "빌드 설정" prompt', async () => {
        const result = await resolver.resolve('ACT', '빌드 설정 변경해줘');

        expect(result.agentName).toBe('tooling-engineer');
        expect(result.source).toBe('intent');
      });

      it('returns tooling-engineer for next.config.js prompt', async () => {
        const result = await resolver.resolve(
          'ACT',
          'next.config.js 설정 변경',
        );

        expect(result.agentName).toBe('tooling-engineer');
        expect(result.source).toBe('intent');
      });

      it('returns tooling-engineer for prettier config prompt', async () => {
        const result = await resolver.resolve('ACT', 'prettier 설정 변경해줘');

        expect(result.agentName).toBe('tooling-engineer');
        expect(result.source).toBe('intent');
      });

      it('prioritizes tooling-engineer over frontend-developer for config files', async () => {
        // eslint.config.ts는 .ts 파일이지만 tooling이 처리해야 함
        const result = await resolver.resolve(
          'ACT',
          'eslint.config.ts 수정해줘',
        );

        expect(result.agentName).toBe('tooling-engineer');
        expect(result.agentName).not.toBe('frontend-developer');
      });
    });

    describe('data-engineer pattern matching', () => {
      beforeEach(() => {
        mockListPrimaryAgents.mockResolvedValue([
          'tooling-engineer',
          'data-engineer',
          'mobile-developer',
          'frontend-developer',
          'backend-developer',
          'agent-architect',
          'devops-engineer',
          'solution-architect',
          'technical-planner',
          'code-reviewer',
        ]);
      });

      it('returns data-engineer for schema.prisma prompt', async () => {
        const result = await resolver.resolve('ACT', 'schema.prisma 수정해줘');

        expect(result.agentName).toBe('data-engineer');
        expect(result.source).toBe('intent');
        expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      });

      it('returns data-engineer for migration prompt', async () => {
        const result = await resolver.resolve('ACT', 'DB migration 만들어줘');

        expect(result.agentName).toBe('data-engineer');
        expect(result.source).toBe('intent');
      });

      it('returns data-engineer for Korean "데이터베이스 설계" prompt', async () => {
        const result = await resolver.resolve(
          'ACT',
          '데이터베이스 스키마 설계해줘',
        );

        expect(result.agentName).toBe('data-engineer');
        expect(result.source).toBe('intent');
      });

      it('returns data-engineer for ERD prompt', async () => {
        const result = await resolver.resolve('ACT', 'ERD 설계 도와줘');

        expect(result.agentName).toBe('data-engineer');
        expect(result.source).toBe('intent');
      });

      it('returns data-engineer for query optimization prompt', async () => {
        const result = await resolver.resolve('ACT', '쿼리 최적화 필요해');

        expect(result.agentName).toBe('data-engineer');
        expect(result.source).toBe('intent');
      });

      it('returns data-engineer for indexing prompt', async () => {
        const result = await resolver.resolve('ACT', 'Add database indexing');

        expect(result.agentName).toBe('data-engineer');
        expect(result.source).toBe('intent');
      });

      it('returns null when data-engineer not available', async () => {
        mockListPrimaryAgents.mockResolvedValue([
          'frontend-developer',
          'backend-developer',
        ]);

        const result = await resolver.resolve('ACT', 'schema.prisma 수정해');

        expect(result.agentName).not.toBe('data-engineer');
        expect(result.agentName).toBe('frontend-developer');
      });
    });

    describe('mobile-developer pattern matching', () => {
      beforeEach(() => {
        mockListPrimaryAgents.mockResolvedValue([
          'tooling-engineer',
          'data-engineer',
          'mobile-developer',
          'frontend-developer',
          'backend-developer',
          'agent-architect',
          'devops-engineer',
          'solution-architect',
          'technical-planner',
          'code-reviewer',
        ]);
      });

      it('returns mobile-developer for React Native prompt', async () => {
        const result = await resolver.resolve(
          'ACT',
          'React Native 컴포넌트 만들어줘',
        );

        expect(result.agentName).toBe('mobile-developer');
        expect(result.source).toBe('intent');
        expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      });

      it('returns mobile-developer for Flutter prompt', async () => {
        const result = await resolver.resolve('ACT', 'Flutter 위젯 구현해');

        expect(result.agentName).toBe('mobile-developer');
        expect(result.source).toBe('intent');
      });

      it('returns mobile-developer for Expo prompt', async () => {
        const result = await resolver.resolve('ACT', 'Expo 설정 업데이트해');

        expect(result.agentName).toBe('mobile-developer');
        expect(result.source).toBe('intent');
      });

      it('returns mobile-developer for Korean "모바일 앱" prompt', async () => {
        const result = await resolver.resolve('ACT', '모바일 앱 화면 개발해줘');

        expect(result.agentName).toBe('mobile-developer');
        expect(result.source).toBe('intent');
      });

      it('returns mobile-developer for iOS app prompt', async () => {
        const result = await resolver.resolve('ACT', 'iOS 앱 개발해');

        expect(result.agentName).toBe('mobile-developer');
        expect(result.source).toBe('intent');
      });

      it('returns mobile-developer for Android app prompt', async () => {
        const result = await resolver.resolve('ACT', 'android 앱 개발');

        expect(result.agentName).toBe('mobile-developer');
        expect(result.source).toBe('intent');
      });

      it('returns mobile-developer for SwiftUI prompt', async () => {
        const result = await resolver.resolve('ACT', 'SwiftUI view 만들어');

        expect(result.agentName).toBe('mobile-developer');
        expect(result.source).toBe('intent');
      });

      it('returns mobile-developer for Jetpack Compose prompt', async () => {
        const result = await resolver.resolve(
          'ACT',
          'Jetpack Compose UI 구현해',
        );

        expect(result.agentName).toBe('mobile-developer');
        expect(result.source).toBe('intent');
      });

      it('returns null when mobile-developer not available', async () => {
        mockListPrimaryAgents.mockResolvedValue([
          'frontend-developer',
          'backend-developer',
        ]);

        const result = await resolver.resolve(
          'ACT',
          'React Native 컴포넌트 만들어',
        );

        expect(result.agentName).not.toBe('mobile-developer');
        expect(result.agentName).toBe('frontend-developer');
      });
    });

    describe('platform-engineer pattern matching', () => {
      beforeEach(() => {
        mockListPrimaryAgents.mockResolvedValue([
          'tooling-engineer',
          'platform-engineer',
          'data-engineer',
          'mobile-developer',
          'frontend-developer',
          'backend-developer',
          'agent-architect',
          'devops-engineer',
          'solution-architect',
          'technical-planner',
          'code-reviewer',
        ]);
      });

      it('returns platform-engineer for Terraform prompt', async () => {
        const result = await resolver.resolve('ACT', 'terraform 모듈 작성해줘');

        expect(result.agentName).toBe('platform-engineer');
        expect(result.source).toBe('intent');
        expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      });

      it('returns platform-engineer for Pulumi prompt', async () => {
        const result = await resolver.resolve('ACT', 'Pulumi 스택 설정해');

        expect(result.agentName).toBe('platform-engineer');
        expect(result.source).toBe('intent');
      });

      it('returns platform-engineer for Helm prompt', async () => {
        const result = await resolver.resolve('ACT', 'helm chart 만들어줘');

        expect(result.agentName).toBe('platform-engineer');
        expect(result.source).toBe('intent');
      });

      it('returns platform-engineer for Kubernetes prompt', async () => {
        const result = await resolver.resolve(
          'ACT',
          'kubernetes 매니페스트 수정',
        );

        expect(result.agentName).toBe('platform-engineer');
        expect(result.source).toBe('intent');
      });

      it('returns platform-engineer for k8s shorthand prompt', async () => {
        const result = await resolver.resolve('ACT', 'k8s deployment 설정해');

        expect(result.agentName).toBe('platform-engineer');
        expect(result.source).toBe('intent');
      });

      it('returns platform-engineer for Argo CD prompt', async () => {
        const result = await resolver.resolve('ACT', 'ArgoCD application 설정');

        expect(result.agentName).toBe('platform-engineer');
        expect(result.source).toBe('intent');
      });

      it('returns platform-engineer for GitOps prompt', async () => {
        const result = await resolver.resolve('ACT', 'GitOps workflow 구성해');

        expect(result.agentName).toBe('platform-engineer');
        expect(result.source).toBe('intent');
      });

      it('returns platform-engineer for Korean "인프라 코드" prompt', async () => {
        const result = await resolver.resolve('ACT', '인프라 코드 작성해줘');

        expect(result.agentName).toBe('platform-engineer');
        expect(result.source).toBe('intent');
      });

      it('returns platform-engineer for AWS CDK prompt', async () => {
        const result = await resolver.resolve('ACT', 'AWS CDK 스택 만들어');

        expect(result.agentName).toBe('platform-engineer');
        expect(result.source).toBe('intent');
      });

      it('returns platform-engineer for EKS prompt', async () => {
        const result = await resolver.resolve('ACT', 'EKS 클러스터 설정');

        expect(result.agentName).toBe('platform-engineer');
        expect(result.source).toBe('intent');
      });

      it('returns platform-engineer for GKE prompt', async () => {
        const result = await resolver.resolve('ACT', 'GKE 노드풀 추가해');

        expect(result.agentName).toBe('platform-engineer');
        expect(result.source).toBe('intent');
      });

      it('returns platform-engineer for kustomize prompt', async () => {
        const result = await resolver.resolve('ACT', 'kustomization 설정해');

        expect(result.agentName).toBe('platform-engineer');
        expect(result.source).toBe('intent');
      });

      it('returns platform-engineer for FinOps prompt', async () => {
        const result = await resolver.resolve('ACT', 'FinOps 비용 분석해줘');

        expect(result.agentName).toBe('platform-engineer');
        expect(result.source).toBe('intent');
      });

      it('returns platform-engineer for disaster recovery prompt', async () => {
        const result = await resolver.resolve(
          'ACT',
          'disaster recovery 계획 세워줘',
        );

        expect(result.agentName).toBe('platform-engineer');
        expect(result.source).toBe('intent');
      });

      it('returns null when platform-engineer not available', async () => {
        mockListPrimaryAgents.mockResolvedValue([
          'frontend-developer',
          'backend-developer',
        ]);

        const result = await resolver.resolve('ACT', 'terraform 모듈 작성');

        expect(result.agentName).not.toBe('platform-engineer');
        expect(result.agentName).toBe('frontend-developer');
      });

      it('prioritizes tooling-engineer over platform-engineer for config files', async () => {
        // eslint.config.ts는 tooling이 처리해야 함
        const result = await resolver.resolve(
          'ACT',
          'eslint.config.ts 수정해줘',
        );

        expect(result.agentName).toBe('tooling-engineer');
        expect(result.agentName).not.toBe('platform-engineer');
      });
    });

    describe('platform-engineer context patterns', () => {
      beforeEach(() => {
        mockListPrimaryAgents.mockResolvedValue([
          'tooling-engineer',
          'platform-engineer',
          'data-engineer',
          'mobile-developer',
          'frontend-developer',
          'backend-developer',
          'agent-architect',
          'devops-engineer',
          'solution-architect',
          'technical-planner',
          'code-reviewer',
        ]);
      });

      it('suggests platform-engineer for .tf files', async () => {
        const context: ResolutionContext = {
          filePath: '/project/infra/main.tf',
        };

        const result = await resolver.resolve('ACT', '이 파일 수정해', context);

        expect(result.agentName).toBe('platform-engineer');
        expect(result.source).toBe('context');
        expect(result.confidence).toBe(0.95);
      });

      it('suggests platform-engineer for Chart.yaml files', async () => {
        const context: ResolutionContext = {
          filePath: '/project/charts/my-app/Chart.yaml',
        };

        const result = await resolver.resolve('ACT', '이 파일 수정해', context);

        expect(result.agentName).toBe('platform-engineer');
        expect(result.source).toBe('context');
      });

      it('suggests platform-engineer for kustomization.yaml files', async () => {
        const context: ResolutionContext = {
          filePath: '/project/k8s/kustomization.yaml',
        };

        const result = await resolver.resolve('ACT', '이 파일 수정해', context);

        expect(result.agentName).toBe('platform-engineer');
        expect(result.source).toBe('context');
      });

      it('suggests platform-engineer for Pulumi.yaml files', async () => {
        const context: ResolutionContext = {
          filePath: '/project/infra/Pulumi.yaml',
        };

        const result = await resolver.resolve('ACT', '이 파일 수정해', context);

        expect(result.agentName).toBe('platform-engineer');
        expect(result.source).toBe('context');
      });

      it('suggests platform-engineer for .tfvars files', async () => {
        const context: ResolutionContext = {
          filePath: '/project/infra/prod.tfvars',
        };

        const result = await resolver.resolve('ACT', '이 파일 수정해', context);

        expect(result.agentName).toBe('platform-engineer');
        expect(result.source).toBe('context');
      });

      it('suggests platform-engineer for argocd directory files', async () => {
        const context: ResolutionContext = {
          filePath: '/project/argocd/application.yaml',
        };

        const result = await resolver.resolve('ACT', '이 파일 수정해', context);

        expect(result.agentName).toBe('platform-engineer');
        expect(result.source).toBe('context');
      });

      it('suggests devops-engineer for Dockerfile (not platform-engineer)', async () => {
        const context: ResolutionContext = {
          filePath: '/project/Dockerfile',
        };

        const result = await resolver.resolve('ACT', '이 파일 수정해', context);

        expect(result.agentName).toBe('devops-engineer');
        expect(result.agentName).not.toBe('platform-engineer');
      });

      it('falls back to default when context pattern matches but agent unavailable', async () => {
        // Simulate platform-engineer not being in available agents
        mockListPrimaryAgents.mockResolvedValue([
          'frontend-developer',
          'backend-developer',
        ]);

        const context: ResolutionContext = {
          filePath: '/project/infra/main.tf', // Matches platform-engineer pattern
        };

        const result = await resolver.resolve('ACT', '이 파일 수정해', context);

        // Should fall back to default since platform-engineer is unavailable
        expect(result.agentName).toBe('frontend-developer');
        expect(result.source).toBe('default');
      });

      it('continues to next pattern when matched agent is unavailable', async () => {
        // Simulate only devops-engineer available (not platform-engineer)
        mockListPrimaryAgents.mockResolvedValue([
          'frontend-developer',
          'devops-engineer',
        ]);

        const context: ResolutionContext = {
          filePath: '/project/infra/main.tf', // Matches platform-engineer pattern
          projectType: 'infrastructure', // Also triggers devops-engineer fallback
        };

        const result = await resolver.resolve('ACT', '이 파일 수정해', context);

        // Should fall back to devops-engineer via projectType since platform-engineer unavailable
        expect(result.agentName).toBe('devops-engineer');
        expect(result.source).toBe('context');
      });
    });

    describe('ai-ml-engineer pattern matching', () => {
      beforeEach(() => {
        mockListPrimaryAgents.mockResolvedValue([
          'ai-ml-engineer',
          'tooling-engineer',
          'platform-engineer',
          'data-engineer',
          'mobile-developer',
          'frontend-developer',
          'backend-developer',
          'agent-architect',
          'devops-engineer',
          'solution-architect',
          'technical-planner',
          'code-reviewer',
        ]);
      });

      it('returns ai-ml-engineer for PyTorch prompt', async () => {
        const result = await resolver.resolve('ACT', 'PyTorch 모델 학습시켜줘');

        expect(result.agentName).toBe('ai-ml-engineer');
        expect(result.source).toBe('intent');
        expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      });

      it('returns ai-ml-engineer for TensorFlow prompt', async () => {
        const result = await resolver.resolve(
          'ACT',
          'TensorFlow로 이미지 분류 모델 만들어',
        );

        expect(result.agentName).toBe('ai-ml-engineer');
        expect(result.source).toBe('intent');
      });

      it('returns ai-ml-engineer for HuggingFace prompt', async () => {
        const result = await resolver.resolve(
          'ACT',
          'HuggingFace transformers 모델 파인튜닝해줘',
        );

        expect(result.agentName).toBe('ai-ml-engineer');
        expect(result.source).toBe('intent');
      });

      it('returns ai-ml-engineer for LangChain prompt', async () => {
        const result = await resolver.resolve(
          'ACT',
          'LangChain으로 RAG 파이프라인 구현해',
        );

        expect(result.agentName).toBe('ai-ml-engineer');
        expect(result.source).toBe('intent');
      });

      it('returns ai-ml-engineer for RAG prompt', async () => {
        const result = await resolver.resolve('ACT', 'RAG 시스템 구축해줘');

        expect(result.agentName).toBe('ai-ml-engineer');
        expect(result.source).toBe('intent');
      });

      it('returns ai-ml-engineer for Korean "딥러닝" prompt', async () => {
        const result = await resolver.resolve('ACT', '딥러닝 모델 개발해');

        expect(result.agentName).toBe('ai-ml-engineer');
        expect(result.source).toBe('intent');
      });

      it('returns ai-ml-engineer for LLM development prompt', async () => {
        const result = await resolver.resolve(
          'ACT',
          'LLM 개발 및 통합 작업해줘',
        );

        expect(result.agentName).toBe('ai-ml-engineer');
        expect(result.source).toBe('intent');
      });

      it('returns ai-ml-engineer for embedding prompt', async () => {
        const result = await resolver.resolve(
          'ACT',
          '임베딩 벡터 저장소 구현해',
        );

        expect(result.agentName).toBe('ai-ml-engineer');
        expect(result.source).toBe('intent');
      });

      it('returns ai-ml-engineer for prompt engineering prompt', async () => {
        const result = await resolver.resolve(
          'ACT',
          '프롬프트 엔지니어링 최적화해줘',
        );

        expect(result.agentName).toBe('ai-ml-engineer');
        expect(result.source).toBe('intent');
      });

      it('returns ai-ml-engineer for OpenAI API prompt', async () => {
        const result = await resolver.resolve('ACT', 'OpenAI API 연동해줘');

        expect(result.agentName).toBe('ai-ml-engineer');
        expect(result.source).toBe('intent');
      });

      it('returns null when ai-ml-engineer not available', async () => {
        mockListPrimaryAgents.mockResolvedValue([
          'frontend-developer',
          'backend-developer',
        ]);

        const result = await resolver.resolve('ACT', 'PyTorch 모델 학습시켜');

        expect(result.agentName).not.toBe('ai-ml-engineer');
        expect(result.agentName).toBe('frontend-developer');
      });
    });

    describe('backend-developer pattern matching', () => {
      beforeEach(() => {
        mockListPrimaryAgents.mockResolvedValue([
          'ai-ml-engineer',
          'tooling-engineer',
          'platform-engineer',
          'data-engineer',
          'mobile-developer',
          'frontend-developer',
          'backend-developer',
          'agent-architect',
          'devops-engineer',
          'solution-architect',
          'technical-planner',
          'code-reviewer',
        ]);
      });

      it('returns backend-developer for NestJS prompt', async () => {
        const result = await resolver.resolve('ACT', 'NestJS 서비스 만들어줘');

        expect(result.agentName).toBe('backend-developer');
        expect(result.source).toBe('intent');
        expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      });

      it('returns backend-developer for Express prompt', async () => {
        const result = await resolver.resolve('ACT', 'Express.js 서버 구현해');

        expect(result.agentName).toBe('backend-developer');
        expect(result.source).toBe('intent');
      });

      it('returns backend-developer for FastAPI prompt', async () => {
        const result = await resolver.resolve(
          'ACT',
          'FastAPI 엔드포인트 추가해',
        );

        expect(result.agentName).toBe('backend-developer');
        expect(result.source).toBe('intent');
      });

      it('returns backend-developer for Django prompt', async () => {
        const result = await resolver.resolve('ACT', 'Django 뷰 만들어줘');

        expect(result.agentName).toBe('backend-developer');
        expect(result.source).toBe('intent');
      });

      it('returns backend-developer for REST API prompt', async () => {
        const result = await resolver.resolve(
          'ACT',
          'REST API 설계 및 구현해줘',
        );

        expect(result.agentName).toBe('backend-developer');
        expect(result.source).toBe('intent');
      });

      it('returns backend-developer for GraphQL prompt', async () => {
        const result = await resolver.resolve('ACT', 'GraphQL 서버 구현해줘');

        expect(result.agentName).toBe('backend-developer');
        expect(result.source).toBe('intent');
      });

      it('returns backend-developer for Korean "백엔드 개발" prompt', async () => {
        const result = await resolver.resolve('ACT', '백엔드 로직 구현해줘');

        expect(result.agentName).toBe('backend-developer');
        expect(result.source).toBe('intent');
      });

      it('returns backend-developer for middleware prompt', async () => {
        const result = await resolver.resolve('ACT', '미들웨어 추가해줘');

        expect(result.agentName).toBe('backend-developer');
        expect(result.source).toBe('intent');
      });

      it('returns backend-developer for Spring Boot prompt', async () => {
        const result = await resolver.resolve(
          'ACT',
          'Spring Boot 컨트롤러 작성해',
        );

        expect(result.agentName).toBe('backend-developer');
        expect(result.source).toBe('intent');
      });

      it('returns backend-developer for WebSocket prompt', async () => {
        const result = await resolver.resolve('ACT', '웹소켓 서버 구현해');

        expect(result.agentName).toBe('backend-developer');
        expect(result.source).toBe('intent');
      });

      it('returns backend-developer for gRPC prompt', async () => {
        const result = await resolver.resolve('ACT', 'gRPC 서비스 만들어');

        expect(result.agentName).toBe('backend-developer');
        expect(result.source).toBe('intent');
      });
    });

    describe('agent-architect pattern matching', () => {
      beforeEach(() => {
        mockListPrimaryAgents.mockResolvedValue([
          'ai-ml-engineer',
          'tooling-engineer',
          'platform-engineer',
          'data-engineer',
          'mobile-developer',
          'frontend-developer',
          'backend-developer',
          'agent-architect',
          'devops-engineer',
          'solution-architect',
          'technical-planner',
          'code-reviewer',
        ]);
      });

      it('returns agent-architect for MCP server prompt', async () => {
        const result = await resolver.resolve('ACT', 'MCP 서버 만들어줘');

        expect(result.agentName).toBe('agent-architect');
        expect(result.source).toBe('intent');
        expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      });

      it('returns agent-architect for MCP tool prompt', async () => {
        const result = await resolver.resolve('ACT', 'MCP tool 구현해');

        expect(result.agentName).toBe('agent-architect');
        expect(result.source).toBe('intent');
      });

      it('returns agent-architect for Korean "에이전트 설계" prompt', async () => {
        const result = await resolver.resolve(
          'ACT',
          '에이전트 아키텍처 설계해줘',
        );

        expect(result.agentName).toBe('agent-architect');
        expect(result.source).toBe('intent');
      });

      it('returns agent-architect for agent development prompt', async () => {
        const result = await resolver.resolve('ACT', 'agent framework 개발해');

        expect(result.agentName).toBe('agent-architect');
        expect(result.source).toBe('intent');
      });

      it('returns agent-architect for Claude agent prompt', async () => {
        const result = await resolver.resolve(
          'ACT',
          'Claude Code 에이전트 만들어줘',
        );

        expect(result.agentName).toBe('agent-architect');
        expect(result.source).toBe('intent');
      });

      it('returns agent-architect for workflow automation prompt', async () => {
        const result = await resolver.resolve(
          'ACT',
          '워크플로우 자동화 시스템 구현해',
        );

        expect(result.agentName).toBe('agent-architect');
        expect(result.source).toBe('intent');
      });

      it('returns agent-architect for LLM orchestration prompt', async () => {
        const result = await resolver.resolve(
          'ACT',
          'LLM 오케스트레이션 구현해줘',
        );

        expect(result.agentName).toBe('agent-architect');
        expect(result.source).toBe('intent');
      });

      it('returns agent-architect for tool calling prompt', async () => {
        const result = await resolver.resolve('ACT', 'tool use 기능 추가해');

        expect(result.agentName).toBe('agent-architect');
        expect(result.source).toBe('intent');
      });

      it('returns agent-architect for multi-agent prompt', async () => {
        const result = await resolver.resolve(
          'ACT',
          '멀티 에이전트 시스템 설계해',
        );

        expect(result.agentName).toBe('agent-architect');
        expect(result.source).toBe('intent');
      });

      it('returns agent-architect for Model Context Protocol prompt', async () => {
        const result = await resolver.resolve(
          'ACT',
          'Model Context Protocol 구현해줘',
        );

        expect(result.agentName).toBe('agent-architect');
        expect(result.source).toBe('intent');
      });

      it('returns null when agent-architect not available', async () => {
        mockListPrimaryAgents.mockResolvedValue([
          'frontend-developer',
          'backend-developer',
        ]);

        const result = await resolver.resolve('ACT', 'MCP 서버 만들어');

        expect(result.agentName).not.toBe('agent-architect');
        expect(result.agentName).toBe('frontend-developer');
      });
    });

    describe('explicit request parsing', () => {
      it('returns explicit agent when prompt contains "backend-developer로 작업해"', async () => {
        const result = await resolver.resolve(
          'ACT',
          'backend-developer로 작업해 새 API 만들어',
        );

        expect(result.agentName).toBe('backend-developer');
        expect(result.source).toBe('explicit');
        expect(result.confidence).toBe(1.0);
      });

      it('returns explicit agent when prompt contains "use frontend-developer agent"', async () => {
        const result = await resolver.resolve(
          'ACT',
          'use frontend-developer agent to create component',
        );

        expect(result.agentName).toBe('frontend-developer');
        expect(result.source).toBe('explicit');
      });

      it('returns explicit agent when prompt contains "agent-architect로 해줘"', async () => {
        const result = await resolver.resolve(
          'ACT',
          'agent-architect로 해줘 새 에이전트 만들어',
        );

        expect(result.agentName).toBe('agent-architect');
        expect(result.source).toBe('explicit');
      });

      it('returns explicit agent when prompt contains "as devops-engineer"', async () => {
        const result = await resolver.resolve(
          'ACT',
          'implement this feature as devops-engineer',
        );

        expect(result.agentName).toBe('devops-engineer');
        expect(result.source).toBe('explicit');
      });

      it('ignores invalid explicit agent names not in registry', async () => {
        const result = await resolver.resolve(
          'ACT',
          'use invalid-agent agent to do something',
        );

        expect(result.agentName).not.toBe('invalid-agent');
      });

      it('ignores PLAN agents in ACT mode explicit requests', async () => {
        const result = await resolver.resolve(
          'ACT',
          'solution-architect로 작업해',
        );

        // Should fall through to default, not use solution-architect
        expect(result.agentName).toBe('frontend-developer');
        expect(result.source).toBe('default');
      });
    });

    describe('recommended agent from PLAN mode', () => {
      it('uses recommended agent when provided', async () => {
        const result = await resolver.resolve(
          'ACT',
          '이 기능 구현해',
          undefined,
          'backend-developer',
        );

        expect(result.agentName).toBe('backend-developer');
        expect(result.source).toBe('config');
        expect(result.reason).toContain('recommended');
      });

      it('ignores recommended agent if not in registry', async () => {
        const result = await resolver.resolve(
          'ACT',
          '이 기능 구현해',
          undefined,
          'non-existent-agent',
        );

        expect(result.agentName).not.toBe('non-existent-agent');
        expect(result.agentName).toBe('frontend-developer');
      });

      it('explicit request takes priority over recommended', async () => {
        const result = await resolver.resolve(
          'ACT',
          'devops-engineer로 작업해',
          undefined,
          'backend-developer',
        );

        expect(result.agentName).toBe('devops-engineer');
        expect(result.source).toBe('explicit');
      });
    });

    describe('project config resolution', () => {
      it('returns configured agent when project config specifies primaryAgent', async () => {
        mockGetProjectConfig.mockResolvedValue({
          primaryAgent: 'backend-developer',
        });

        const result = await resolver.resolve('ACT', '새 API 만들어');

        expect(result.agentName).toBe('backend-developer');
        expect(result.source).toBe('config');
      });

      it('ignores config if configured agent is not in registry', async () => {
        mockGetProjectConfig.mockResolvedValue({
          primaryAgent: 'non-existent-agent',
        });

        const result = await resolver.resolve('ACT', '새 기능 만들어');

        expect(result.agentName).toBe('frontend-developer');
        expect(result.source).toBe('default');
      });

      it('handles config loading errors gracefully', async () => {
        mockGetProjectConfig.mockRejectedValue(new Error('Config error'));

        const result = await resolver.resolve('ACT', '새 기능 만들어');

        expect(result.agentName).toBe('frontend-developer');
        expect(result.source).toBe('default');
      });
    });

    describe('context-based resolution', () => {
      beforeEach(() => {
        mockListPrimaryAgents.mockResolvedValue([
          'tooling-engineer',
          'data-engineer',
          'mobile-developer',
          'frontend-developer',
          'backend-developer',
          'agent-architect',
          'devops-engineer',
          'solution-architect',
          'technical-planner',
          'code-reviewer',
        ]);
      });

      it('suggests devops-engineer when context includes Dockerfile', async () => {
        const context: ResolutionContext = {
          filePath: '/project/Dockerfile',
        };

        const result = await resolver.resolve('ACT', '이 파일 수정해', context);

        expect(result.agentName).toBe('devops-engineer');
        expect(result.source).toBe('context');
        expect(result.confidence).toBeGreaterThanOrEqual(0.8);
      });

      it('suggests backend-developer when context includes .go files', async () => {
        const context: ResolutionContext = {
          filePath: '/project/main.go',
        };

        const result = await resolver.resolve('ACT', '이 파일 수정해', context);

        expect(result.agentName).toBe('backend-developer');
        expect(result.source).toBe('context');
      });

      it('suggests frontend-developer when context includes .tsx files', async () => {
        const context: ResolutionContext = {
          filePath: '/project/component.tsx',
        };

        const result = await resolver.resolve('ACT', '이 파일 수정해', context);

        // .tsx has lower confidence (0.7), so falls through to default
        expect(result.agentName).toBe('frontend-developer');
      });

      describe('mobile context patterns', () => {
        it('suggests mobile-developer for react-native.config.js', async () => {
          const context: ResolutionContext = {
            filePath: '/project/react-native.config.js',
          };

          const result = await resolver.resolve(
            'ACT',
            '이 파일 수정해',
            context,
          );

          expect(result.agentName).toBe('mobile-developer');
          expect(result.source).toBe('context');
          expect(result.confidence).toBe(0.95);
        });

        it('suggests mobile-developer for metro.config.js', async () => {
          const context: ResolutionContext = {
            filePath: '/project/metro.config.js',
          };

          const result = await resolver.resolve(
            'ACT',
            '이 파일 수정해',
            context,
          );

          expect(result.agentName).toBe('mobile-developer');
          expect(result.source).toBe('context');
        });

        it('suggests mobile-developer for pubspec.yaml (Flutter)', async () => {
          const context: ResolutionContext = {
            filePath: '/project/pubspec.yaml',
          };

          const result = await resolver.resolve(
            'ACT',
            '이 파일 수정해',
            context,
          );

          expect(result.agentName).toBe('mobile-developer');
          expect(result.source).toBe('context');
        });

        it('suggests mobile-developer for .dart files', async () => {
          const context: ResolutionContext = {
            filePath: '/project/lib/main.dart',
          };

          const result = await resolver.resolve(
            'ACT',
            '이 파일 수정해',
            context,
          );

          expect(result.agentName).toBe('mobile-developer');
          expect(result.source).toBe('context');
        });

        it('suggests mobile-developer for .swift files', async () => {
          const context: ResolutionContext = {
            filePath: '/project/App.swift',
          };

          const result = await resolver.resolve(
            'ACT',
            '이 파일 수정해',
            context,
          );

          expect(result.agentName).toBe('mobile-developer');
          expect(result.source).toBe('context');
        });

        it('suggests mobile-developer for Podfile', async () => {
          const context: ResolutionContext = {
            filePath: '/project/ios/Podfile',
          };

          const result = await resolver.resolve(
            'ACT',
            '이 파일 수정해',
            context,
          );

          expect(result.agentName).toBe('mobile-developer');
          expect(result.source).toBe('context');
        });

        it('suggests mobile-developer for AndroidManifest.xml', async () => {
          const context: ResolutionContext = {
            filePath: '/project/android/app/src/main/AndroidManifest.xml',
          };

          const result = await resolver.resolve(
            'ACT',
            '이 파일 수정해',
            context,
          );

          expect(result.agentName).toBe('mobile-developer');
          expect(result.source).toBe('context');
        });

        it('suggests mobile-developer for .kt files', async () => {
          const context: ResolutionContext = {
            filePath: '/project/android/MainActivity.kt',
          };

          const result = await resolver.resolve(
            'ACT',
            '이 파일 수정해',
            context,
          );

          expect(result.agentName).toBe('mobile-developer');
          expect(result.source).toBe('context');
        });
      });

      describe('data context patterns', () => {
        it('suggests data-engineer for .sql files', async () => {
          const context: ResolutionContext = {
            filePath: '/project/migrations/001_init.sql',
          };

          const result = await resolver.resolve(
            'ACT',
            '이 파일 수정해',
            context,
          );

          expect(result.agentName).toBe('data-engineer');
          expect(result.source).toBe('context');
        });

        it('suggests data-engineer for schema.prisma files', async () => {
          const context: ResolutionContext = {
            filePath: '/project/prisma/schema.prisma',
          };

          const result = await resolver.resolve(
            'ACT',
            '이 파일 수정해',
            context,
          );

          expect(result.agentName).toBe('data-engineer');
          expect(result.source).toBe('context');
        });

        it('suggests data-engineer for migrations directory', async () => {
          const context: ResolutionContext = {
            filePath: '/project/migrations/20240101_add_users.ts',
          };

          const result = await resolver.resolve(
            'ACT',
            '이 파일 수정해',
            context,
          );

          expect(result.agentName).toBe('data-engineer');
          expect(result.source).toBe('context');
        });

        it('suggests data-engineer for .entity.ts files', async () => {
          const context: ResolutionContext = {
            filePath: '/project/src/user/user.entity.ts',
          };

          const result = await resolver.resolve(
            'ACT',
            '이 파일 수정해',
            context,
          );

          expect(result.agentName).toBe('data-engineer');
          expect(result.source).toBe('context');
        });
      });

      describe('project type context', () => {
        it('suggests devops-engineer for infrastructure project type', async () => {
          const context: ResolutionContext = {
            projectType: 'infrastructure',
          };

          const result = await resolver.resolve(
            'ACT',
            '이 프로젝트 수정해',
            context,
          );

          expect(result.agentName).toBe('devops-engineer');
          expect(result.source).toBe('context');
          expect(result.confidence).toBe(0.85);
        });

        it('does not use project type if devops-engineer unavailable', async () => {
          mockListPrimaryAgents.mockResolvedValue([
            'frontend-developer',
            'backend-developer',
          ]);

          const context: ResolutionContext = {
            projectType: 'infrastructure',
          };

          const result = await resolver.resolve(
            'ACT',
            '이 프로젝트 수정해',
            context,
          );

          expect(result.agentName).toBe('frontend-developer');
          expect(result.source).toBe('default');
        });
      });

      describe('agent-architect context', () => {
        it('suggests agent-architect for agent JSON files', async () => {
          const context: ResolutionContext = {
            filePath: '/project/.ai-rules/agents/frontend-developer.json',
          };

          const result = await resolver.resolve(
            'ACT',
            '이 파일 수정해',
            context,
          );

          expect(result.agentName).toBe('agent-architect');
          expect(result.source).toBe('context');
        });
      });
    });

    describe('default fallback', () => {
      it('returns frontend-developer when no preference found', async () => {
        const result = await resolver.resolve('ACT', '새 기능 만들어');

        expect(result.agentName).toBe('frontend-developer');
        expect(result.source).toBe('default');
      });

      it('returns default even with empty prompt', async () => {
        const result = await resolver.resolve('ACT', '');

        expect(result.agentName).toBe('frontend-developer');
        expect(result.source).toBe('default');
      });
    });
  });

  describe('EVAL mode behavior', () => {
    it('always returns code-reviewer for EVAL mode regardless of explicit request', async () => {
      const result = await resolver.resolve(
        'EVAL',
        'backend-developer로 평가해',
      );

      expect(result.agentName).toBe('code-reviewer');
      expect(result.source).toBe('default');
      expect(result.reason).toContain('EVAL');
    });

    it('always returns code-reviewer for EVAL mode regardless of config', async () => {
      mockGetProjectConfig.mockResolvedValue({
        primaryAgent: 'backend-developer',
      });

      const result = await resolver.resolve('EVAL', '코드 평가해');

      expect(result.agentName).toBe('code-reviewer');
    });

    it('always returns code-reviewer for EVAL mode regardless of recommended agent', async () => {
      const result = await resolver.resolve(
        'EVAL',
        '코드 리뷰해',
        undefined,
        'backend-developer',
      );

      expect(result.agentName).toBe('code-reviewer');
    });
  });

  describe('priority order in ACT mode', () => {
    it('explicit request takes priority over config', async () => {
      mockGetProjectConfig.mockResolvedValue({
        primaryAgent: 'backend-developer',
      });

      const result = await resolver.resolve(
        'ACT',
        'frontend-developer로 작업해',
      );

      expect(result.agentName).toBe('frontend-developer');
      expect(result.source).toBe('explicit');
    });

    it('recommended agent takes priority over config', async () => {
      mockGetProjectConfig.mockResolvedValue({
        primaryAgent: 'frontend-developer',
      });

      const result = await resolver.resolve(
        'ACT',
        '이 기능 구현해',
        undefined,
        'backend-developer',
      );

      expect(result.agentName).toBe('backend-developer');
      expect(result.source).toBe('config'); // Source is 'config' as it comes from PLAN recommendation
    });

    it('config takes priority over context', async () => {
      mockGetProjectConfig.mockResolvedValue({
        primaryAgent: 'frontend-developer',
      });

      const context: ResolutionContext = {
        filePath: '/project/main.go',
      };

      const result = await resolver.resolve('ACT', '이 파일 수정해', context);

      expect(result.agentName).toBe('frontend-developer');
      expect(result.source).toBe('config');
    });

    it('context takes priority over default when confidence is high', async () => {
      const context: ResolutionContext = {
        filePath: '/project/Dockerfile',
      };

      // Use a generic prompt that doesn't match intent patterns
      // so context-based resolution can take priority
      const result = await resolver.resolve('ACT', '이 파일 수정해', context);

      expect(result.agentName).toBe('devops-engineer');
      expect(result.source).toBe('context');
    });
  });

  describe('parseExplicitRequest patterns', () => {
    it('extracts agent name from Korean pattern "~로 작업해"', async () => {
      const result = await resolver.resolve(
        'ACT',
        'backend-developer로 작업해줘',
      );
      expect(result.agentName).toBe('backend-developer');
    });

    it('extracts agent name from Korean pattern "~으로 해"', async () => {
      const result = await resolver.resolve('ACT', 'agent-architect으로 해줘');
      expect(result.agentName).toBe('agent-architect');
    });

    it('extracts agent name from English pattern "use ~ agent"', async () => {
      const result = await resolver.resolve(
        'ACT',
        'use frontend-developer agent',
      );
      expect(result.agentName).toBe('frontend-developer');
    });

    it('extracts agent name from English pattern "using ~"', async () => {
      const result = await resolver.resolve(
        'ACT',
        'using backend-developer create API',
      );
      expect(result.agentName).toBe('backend-developer');
    });

    it('handles mixed language prompts', async () => {
      const result = await resolver.resolve(
        'ACT',
        'backend-developer agent로 API 만들어',
      );
      expect(result.agentName).toBe('backend-developer');
    });
  });

  describe('safeListPrimaryAgents fallback behavior', () => {
    it('returns default fallback list when listPrimaryAgents returns empty array', async () => {
      mockListPrimaryAgents.mockResolvedValue([]);

      const result = await resolver.resolve('PLAN', 'build a feature');

      // Default PLAN agent from fallback list
      expect(result.agentName).toBe('solution-architect');
    });

    it('returns default fallback list when listPrimaryAgents throws error', async () => {
      mockListPrimaryAgents.mockRejectedValue(new Error('Network error'));

      const result = await resolver.resolve('PLAN', 'build a feature');

      expect(result.agentName).toBe('solution-architect');
    });

    it('uses fallback list for agent validation when listPrimaryAgents fails', async () => {
      mockListPrimaryAgents.mockRejectedValue(new Error('Network error'));

      // backend-developer is in fallback list, so it should be recognized
      const result = await resolver.resolve(
        'ACT',
        'backend-developer로 작업해',
      );

      expect(result.agentName).toBe('backend-developer');
      expect(result.source).toBe('explicit');
    });
  });

  describe('conflict resolution for multi-pattern matching', () => {
    beforeEach(() => {
      // Provide all agents to allow conflict scenarios
      mockListPrimaryAgents.mockResolvedValue([
        'frontend-developer',
        'backend-developer',
        'tooling-engineer',
        'platform-engineer',
        'data-engineer',
        'mobile-developer',
        'ai-ml-engineer',
        'agent-architect',
        'devops-engineer',
        'solution-architect',
        'technical-planner',
        'code-reviewer',
      ]);
    });

    describe('priority order verification', () => {
      it('tooling-engineer wins over platform-engineer for tsconfig.json', async () => {
        // tsconfig.json matches tooling patterns (higher priority in order)
        const result = await resolver.resolve('ACT', 'Fix tsconfig.json error');

        expect(result.agentName).toBe('tooling-engineer');
        expect(result.source).toBe('intent');
      });

      it('tooling-engineer wins over backend-developer for eslint config', async () => {
        // eslint matches tooling (priority 3) over backend patterns
        const result = await resolver.resolve(
          'ACT',
          'eslint 설정 파일 수정해줘',
        );

        expect(result.agentName).toBe('tooling-engineer');
      });

      it('platform-engineer wins over backend-developer for Kubernetes manifest', async () => {
        // k8s manifest should go to platform-engineer (priority 4) not backend
        const result = await resolver.resolve(
          'ACT',
          'kubernetes manifest 파일 작성해줘',
        );

        expect(result.agentName).toBe('platform-engineer');
      });

      it('data-engineer wins over backend-developer for schema.prisma', async () => {
        // schema.prisma is data-specific, should go to data-engineer (priority 5)
        const result = await resolver.resolve(
          'ACT',
          'schema.prisma 모델 추가해줘',
        );

        expect(result.agentName).toBe('data-engineer');
      });

      it('ai-ml-engineer wins over backend-developer for PyTorch code', async () => {
        // PyTorch is AI/ML specific, should go to ai-ml-engineer (priority 7)
        const result = await resolver.resolve(
          'ACT',
          'PyTorch 모델 학습 코드 작성해줘',
        );

        expect(result.agentName).toBe('ai-ml-engineer');
      });

      it('agent-architect wins over backend-developer for MCP server', async () => {
        // MCP server is agent-specific, should go to agent-architect (priority 9)
        const result = await resolver.resolve(
          'ACT',
          'MCP 서버 새로운 tool 추가해줘',
        );

        expect(result.agentName).toBe('agent-architect');
      });
    });

    describe('overlapping keyword scenarios', () => {
      it('prefers tooling for "vite.config" even with "server" keyword', async () => {
        // "vite.config server settings" - tooling should win
        const result = await resolver.resolve(
          'ACT',
          'vite.config server 설정 변경',
        );

        expect(result.agentName).toBe('tooling-engineer');
      });

      it('prefers platform for "terraform" even with "config" keyword', async () => {
        // terraform config should go to platform-engineer
        const result = await resolver.resolve(
          'ACT',
          'terraform config 파일 작성',
        );

        expect(result.agentName).toBe('platform-engineer');
      });

      it('prefers ai-ml for "LangChain API" over backend API patterns', async () => {
        // LangChain API development is AI/ML, not generic backend
        const result = await resolver.resolve(
          'ACT',
          'LangChain API 통합 구현해줘',
        );

        expect(result.agentName).toBe('ai-ml-engineer');
      });

      it('prefers backend for generic "REST API" without ML context', async () => {
        // Generic REST API should go to backend-developer
        const result = await resolver.resolve(
          'ACT',
          'REST API 엔드포인트 만들어줘',
        );

        expect(result.agentName).toBe('backend-developer');
      });

      it('prefers mobile for "React Native" over frontend for "React"', async () => {
        // React Native should go to mobile-developer, not frontend
        const result = await resolver.resolve(
          'ACT',
          'React Native 컴포넌트 만들어줘',
        );

        expect(result.agentName).toBe('mobile-developer');
      });
    });

    describe('explicit request overrides all patterns', () => {
      it('explicit "backend-developer로 작업해" overrides tooling patterns', async () => {
        // Even if tsconfig.json matches tooling, explicit request wins
        // Pattern requires "로 작업해" or "로 개발해" or "로 해"
        const result = await resolver.resolve(
          'ACT',
          'backend-developer로 작업해 tsconfig.json 수정',
        );

        expect(result.agentName).toBe('backend-developer');
        expect(result.source).toBe('explicit');
      });

      it('explicit "frontend-developer로 개발해" overrides AI/ML patterns', async () => {
        // Pattern requires "로 작업해" or "로 개발해" or "로 해"
        const result = await resolver.resolve(
          'ACT',
          'frontend-developer로 개발해 PyTorch 관련 UI',
        );

        expect(result.agentName).toBe('frontend-developer');
        expect(result.source).toBe('explicit');
      });

      it('explicit "using agent-architect" overrides backend patterns', async () => {
        const result = await resolver.resolve(
          'ACT',
          'using agent-architect create REST API workflow',
        );

        expect(result.agentName).toBe('agent-architect');
        expect(result.source).toBe('explicit');
      });
    });

    describe('no pattern match falls back to default', () => {
      it('returns frontend-developer for unmatched generic prompt', async () => {
        const result = await resolver.resolve(
          'ACT',
          'help me with this random task',
        );

        expect(result.agentName).toBe('frontend-developer');
        expect(result.source).toBe('default');
        expect(result.reason).toContain('no specific intent detected');
      });

      it('returns frontend-developer for Korean generic prompt', async () => {
        const result = await resolver.resolve('ACT', '이 작업 도와줘');

        expect(result.agentName).toBe('frontend-developer');
        expect(result.source).toBe('default');
      });
    });
  });

  describe('ReDoS vulnerability prevention', () => {
    /**
     * These tests verify that all regex patterns in the resolver are safe from
     * Regular Expression Denial of Service (ReDoS) attacks.
     *
     * ReDoS occurs when a regex pattern has catastrophic backtracking behavior
     * with specially crafted input strings, causing exponential time complexity.
     *
     * Test strategy:
     * 1. Verify all patterns complete within reasonable time bounds
     * 2. Test with common ReDoS attack vectors (repeated characters, nested patterns)
     * 3. Test with maximum length inputs near the MAX_PROMPT_LENGTH boundary
     */

    const TIMEOUT_MS = 100; // Patterns should complete well under 100ms

    describe('intent pattern safety', () => {
      // Common ReDoS attack patterns
      const REDOS_ATTACK_VECTORS = [
        'a'.repeat(1000), // Repeated single character
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaX', // Polynomial backtracking trigger
        'a]'.repeat(500), // Nested character class escape attempts
        '(a+)+'.repeat(100), // Nested quantifier simulation
        'aaaaaaaaaaaaaaa!'.repeat(50), // Alternation attack
        '\\'.repeat(500), // Escape character flood
        '.*'.repeat(200), // Wildcard flood
        '\t\n\r '.repeat(500), // Whitespace flood
        '가나다라마바사'.repeat(200), // Korean character flood
        '中文字符'.repeat(300), // Chinese character flood
      ];

      it('DATA_INTENT_PATTERNS are safe from ReDoS attacks', () => {
        for (const vector of REDOS_ATTACK_VECTORS) {
          const start = performance.now();
          // Access private static via any cast for testing
          const patterns = (PrimaryAgentResolver as any).DATA_INTENT_PATTERNS;
          for (const { pattern } of patterns) {
            pattern.test(vector);
          }
          const elapsed = performance.now() - start;
          expect(elapsed).toBeLessThan(TIMEOUT_MS);
        }
      });

      it('MOBILE_INTENT_PATTERNS are safe from ReDoS attacks', () => {
        for (const vector of REDOS_ATTACK_VECTORS) {
          const start = performance.now();
          const patterns = (PrimaryAgentResolver as any).MOBILE_INTENT_PATTERNS;
          for (const { pattern } of patterns) {
            pattern.test(vector);
          }
          const elapsed = performance.now() - start;
          expect(elapsed).toBeLessThan(TIMEOUT_MS);
        }
      });

      it('TOOLING_INTENT_PATTERNS are safe from ReDoS attacks', () => {
        for (const vector of REDOS_ATTACK_VECTORS) {
          const start = performance.now();
          const patterns = (PrimaryAgentResolver as any)
            .TOOLING_INTENT_PATTERNS;
          for (const { pattern } of patterns) {
            pattern.test(vector);
          }
          const elapsed = performance.now() - start;
          expect(elapsed).toBeLessThan(TIMEOUT_MS);
        }
      });

      it('PLATFORM_INTENT_PATTERNS are safe from ReDoS attacks', () => {
        for (const vector of REDOS_ATTACK_VECTORS) {
          const start = performance.now();
          const patterns = (PrimaryAgentResolver as any)
            .PLATFORM_INTENT_PATTERNS;
          for (const { pattern } of patterns) {
            pattern.test(vector);
          }
          const elapsed = performance.now() - start;
          expect(elapsed).toBeLessThan(TIMEOUT_MS);
        }
      });

      it('AI_ML_INTENT_PATTERNS are safe from ReDoS attacks', () => {
        for (const vector of REDOS_ATTACK_VECTORS) {
          const start = performance.now();
          const patterns = (PrimaryAgentResolver as any).AI_ML_INTENT_PATTERNS;
          for (const { pattern } of patterns) {
            pattern.test(vector);
          }
          const elapsed = performance.now() - start;
          expect(elapsed).toBeLessThan(TIMEOUT_MS);
        }
      });

      it('BACKEND_INTENT_PATTERNS are safe from ReDoS attacks', () => {
        for (const vector of REDOS_ATTACK_VECTORS) {
          const start = performance.now();
          const patterns = (PrimaryAgentResolver as any)
            .BACKEND_INTENT_PATTERNS;
          for (const { pattern } of patterns) {
            pattern.test(vector);
          }
          const elapsed = performance.now() - start;
          expect(elapsed).toBeLessThan(TIMEOUT_MS);
        }
      });

      it('AGENT_INTENT_PATTERNS are safe from ReDoS attacks', () => {
        for (const vector of REDOS_ATTACK_VECTORS) {
          const start = performance.now();
          const patterns = (PrimaryAgentResolver as any).AGENT_INTENT_PATTERNS;
          for (const { pattern } of patterns) {
            pattern.test(vector);
          }
          const elapsed = performance.now() - start;
          expect(elapsed).toBeLessThan(TIMEOUT_MS);
        }
      });
    });

    describe('explicit pattern safety', () => {
      it('EXPLICIT_PATTERNS are safe from ReDoS attacks', () => {
        const vectors = [
          '-'.repeat(1000) + 'developer', // Long prefix with hyphen
          'a-b'.repeat(500), // Repeated agent-like patterns
          'use '.repeat(200) + 'agent', // Repeated keywords
          'frontend-developer'.repeat(100), // Repeated valid agent names
        ];

        for (const vector of vectors) {
          const start = performance.now();
          const patterns = (PrimaryAgentResolver as any).EXPLICIT_PATTERNS;
          for (const pattern of patterns) {
            pattern.test(vector);
          }
          const elapsed = performance.now() - start;
          expect(elapsed).toBeLessThan(TIMEOUT_MS);
        }
      });
    });

    describe('context pattern safety', () => {
      it('CONTEXT_PATTERNS are safe from ReDoS attacks', () => {
        const vectors = [
          '/'.repeat(1000) + '.ts', // Deep path simulation
          'Dockerfile'.repeat(100), // Repeated file names
          '.tsx'.repeat(500), // Repeated extensions
          'kubernetes/'.repeat(200), // Repeated directory patterns
        ];

        for (const vector of vectors) {
          const start = performance.now();
          const patterns = (PrimaryAgentResolver as any).CONTEXT_PATTERNS;
          for (const { pattern } of patterns) {
            pattern.test(vector);
          }
          const elapsed = performance.now() - start;
          expect(elapsed).toBeLessThan(TIMEOUT_MS);
        }
      });
    });

    describe('boundary value testing', () => {
      it('handles prompts near MAX_PROMPT_LENGTH boundary efficiently', async () => {
        // Test with 49KB prompt (just under 50KB MAX_PROMPT_LENGTH)
        const largePrompt = 'a'.repeat(49000);

        const start = performance.now();
        const result = await resolver.resolve('ACT', largePrompt);
        const elapsed = performance.now() - start;

        // Should complete within reasonable time even for large inputs
        expect(elapsed).toBeLessThan(500); // 500ms is generous for large input
        expect(result.agentName).toBe('frontend-developer');
        expect(result.source).toBe('default');
      });

      it('handles mixed content large prompts efficiently', async () => {
        // Mixed Korean, English, and special characters
        const mixedPrompt = ('안녕하세요 hello 你好 ' + 'a'.repeat(100)).repeat(
          400,
        );

        const start = performance.now();
        const result = await resolver.resolve('ACT', mixedPrompt);
        const elapsed = performance.now() - start;

        expect(elapsed).toBeLessThan(500);
        expect(result).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // Bug Fix Tests - Priority Inversion, Meta-Discussion Detection, excludeAgents
  // ==========================================================================

  describe('Bug Fix: Project config priority over intent patterns', () => {
    it('uses project config primaryAgent over intent patterns', async () => {
      mockGetProjectConfig.mockResolvedValue({
        primaryAgent: 'agent-architect',
      });

      // This prompt contains "mobile develop" which would trigger mobile-developer
      // But project config should take priority
      const result = await resolver.resolve(
        'ACT',
        'mobile developer 관련 버그 수정해줘',
      );

      expect(result.agentName).toBe('agent-architect');
      expect(result.source).toBe('config');
    });

    it('uses project config over backend patterns', async () => {
      mockGetProjectConfig.mockResolvedValue({
        primaryAgent: 'frontend-developer',
      });

      // This prompt would normally match backend-developer patterns
      const result = await resolver.resolve(
        'ACT',
        'NestJS API 엔드포인트 추가해줘',
      );

      expect(result.agentName).toBe('frontend-developer');
      expect(result.source).toBe('config');
    });
  });

  describe('Bug Fix: Meta-discussion detection', () => {
    it('skips intent patterns when discussing agent matching issues', async () => {
      // This prompt discusses "Mobile Developer가 매칭되었어" - meta-discussion
      // Should NOT trigger mobile-developer pattern
      const result = await resolver.resolve(
        'ACT',
        'Mobile Developer가 잘못 매칭되는 버그가 있어',
      );

      // Should fall through to default since it's meta-discussion
      expect(result.agentName).toBe('frontend-developer');
      expect(result.source).toBe('default');
    });

    it('skips intent patterns when discussing Primary Agent system', async () => {
      const result = await resolver.resolve(
        'ACT',
        'Primary Agent 선택 로직을 점검해야해',
      );

      expect(result.agentName).toBe('frontend-developer');
      expect(result.source).toBe('default');
    });

    it('skips intent patterns when discussing agent activation issues', async () => {
      const result = await resolver.resolve(
        'ACT',
        '에이전트 활성화 파이프라인에 문제가 있어',
      );

      expect(result.agentName).toBe('frontend-developer');
      expect(result.source).toBe('default');
    });

    it('skips intent patterns when debugging agent behavior', async () => {
      const result = await resolver.resolve(
        'ACT',
        'Frontend Developer 에이전트 버그 분석해줘',
      );

      expect(result.agentName).toBe('frontend-developer');
      expect(result.source).toBe('default');
    });

    it('still matches actual work requests (not meta-discussion)', async () => {
      // This is actual mobile work, not discussion about mobile-developer agent
      const result = await resolver.resolve('ACT', 'React Native 앱 개발해줘');

      expect(result.agentName).toBe('mobile-developer');
      expect(result.source).toBe('intent');
    });
  });

  describe('Bug Fix: Agent-architect patterns now checked first', () => {
    it('matches agent creation patterns before mobile patterns', async () => {
      // "Agent를 만드는" should match agent-architect, not mobile
      const result = await resolver.resolve(
        'ACT',
        'Agent를 만드는 작업을 해야해',
      );

      expect(result.agentName).toBe('agent-architect');
      expect(result.source).toBe('intent');
    });

    it('matches Korean agent creation pattern', async () => {
      const result = await resolver.resolve('ACT', '새로운 에이전트 만들어줘');

      expect(result.agentName).toBe('agent-architect');
      expect(result.source).toBe('intent');
    });

    it('matches MCP server development', async () => {
      const result = await resolver.resolve('ACT', 'MCP 서버 코드 수정해줘');

      expect(result.agentName).toBe('agent-architect');
      expect(result.source).toBe('intent');
    });

    it('matches specialist agent patterns', async () => {
      const result = await resolver.resolve(
        'ACT',
        'specialist agent JSON 파일 수정해줘',
      );

      expect(result.agentName).toBe('agent-architect');
      expect(result.source).toBe('intent');
    });

    it('matches primary agent resolution patterns', async () => {
      // "primary agent resolver 코드" is implementation work, not meta-discussion
      const result = await resolver.resolve(
        'ACT',
        'PrimaryAgentResolver 코드 개선해줘',
      );

      expect(result.agentName).toBe('agent-architect');
      expect(result.source).toBe('intent');
    });
  });

  describe('Bug Fix: excludeAgents config support', () => {
    it('excludes specified agents from resolution', async () => {
      mockGetProjectConfig.mockResolvedValue({
        excludeAgents: ['mobile-developer', 'frontend-developer'],
      });

      // This would normally match mobile-developer, but it's excluded
      const result = await resolver.resolve('ACT', 'React Native 앱 개발해줘');

      // Should match next available agent or fall back to default
      // Since frontend-developer (default) is also excluded, should try others
      expect(result.agentName).not.toBe('mobile-developer');
      expect(result.agentName).not.toBe('frontend-developer');
    });

    it('uses primaryAgent even with excludeAgents set', async () => {
      mockGetProjectConfig.mockResolvedValue({
        primaryAgent: 'agent-architect',
        excludeAgents: ['mobile-developer', 'frontend-developer'],
      });

      const result = await resolver.resolve('ACT', '작업 시작해줘');

      expect(result.agentName).toBe('agent-architect');
      expect(result.source).toBe('config');
    });

    it('ignores excludeAgents when empty array', async () => {
      mockGetProjectConfig.mockResolvedValue({
        excludeAgents: [],
      });

      const result = await resolver.resolve('ACT', 'React Native 앱 개발해줘');

      expect(result.agentName).toBe('mobile-developer');
    });

    it('handles excludeAgents case-insensitively', async () => {
      mockGetProjectConfig.mockResolvedValue({
        excludeAgents: ['Mobile-Developer', 'FRONTEND-DEVELOPER'],
      });

      const result = await resolver.resolve('ACT', 'React Native 앱 개발해줘');

      expect(result.agentName).not.toBe('mobile-developer');
    });
  });
});
