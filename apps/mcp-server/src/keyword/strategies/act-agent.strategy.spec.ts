/**
 * ACT Agent Strategy Tests
 *
 * Tests for the ActAgentStrategy class including:
 * - Explicit agent request handling
 * - Recommended agent from PLAN mode
 * - Project configuration
 * - Meta-discussion detection
 * - Intent pattern matching
 * - Context-based inference
 * - Default fallback behavior
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActAgentStrategy } from './act-agent.strategy';
import type { GetProjectConfigFn } from './resolution-strategy.interface';
import { DEFAULT_ACT_AGENT } from '../keyword.types';
import { createActContext } from './__tests__/strategy-test.utils';

describe('ActAgentStrategy', () => {
  const mockGetProjectConfig: GetProjectConfigFn = vi.fn().mockResolvedValue(null);

  let strategy: ActAgentStrategy;

  beforeEach(() => {
    vi.clearAllMocks();
    strategy = new ActAgentStrategy(mockGetProjectConfig);
  });

  describe('explicit agent request', () => {
    it('should return explicitly requested agent', async () => {
      const result = await strategy.resolve(
        createActContext({
          prompt: 'Use backend-developer for this API implementation',
        }),
      );

      expect(result.agentName).toBe('backend-developer');
      expect(result.source).toBe('explicit');
      expect(result.confidence).toBe(1.0);
    });

    it('should handle Korean explicit request', async () => {
      const result = await strategy.resolve(
        createActContext({
          prompt: 'backend-developer로 작업해',
        }),
      );

      expect(result.agentName).toBe('backend-developer');
      expect(result.source).toBe('explicit');
    });

    it('should ignore explicit request for unavailable agent', async () => {
      const result = await strategy.resolve(
        createActContext({
          prompt: 'Use mobile-developer for this task',
          availableAgents: ['frontend-developer', 'backend-developer'],
        }),
      );

      expect(result.agentName).not.toBe('mobile-developer');
    });
  });

  describe('recommended agent from PLAN mode', () => {
    it('should use recommended agent when available', async () => {
      const result = await strategy.resolve(
        createActContext({
          prompt: 'Implement the feature',
          recommendedActAgent: 'backend-developer',
        }),
      );

      expect(result.agentName).toBe('backend-developer');
      expect(result.source).toBe('config');
      expect(result.confidence).toBe(1.0);
      expect(result.reason).toContain('PLAN mode');
    });

    it('should ignore recommended agent if not available', async () => {
      const result = await strategy.resolve(
        createActContext({
          prompt: 'Implement the feature',
          recommendedActAgent: 'mobile-developer',
          availableAgents: ['frontend-developer', 'backend-developer'],
        }),
      );

      expect(result.agentName).not.toBe('mobile-developer');
    });

    it('should prefer explicit request over recommended agent', async () => {
      const result = await strategy.resolve(
        createActContext({
          prompt: 'Use frontend-developer for this task',
          recommendedActAgent: 'backend-developer',
        }),
      );

      expect(result.agentName).toBe('frontend-developer');
      expect(result.source).toBe('explicit');
    });
  });

  describe('project configuration', () => {
    it('should use agent from project config', async () => {
      vi.mocked(mockGetProjectConfig).mockResolvedValueOnce({
        primaryAgent: 'backend-developer',
      });

      const result = await strategy.resolve(
        createActContext({
          prompt: 'Implement the feature',
        }),
      );

      expect(result.agentName).toBe('backend-developer');
      expect(result.source).toBe('config');
    });

    it('should ignore config agent if not available', async () => {
      vi.mocked(mockGetProjectConfig).mockResolvedValueOnce({
        primaryAgent: 'non-existent-agent',
      });

      const result = await strategy.resolve(createActContext());

      expect(result.agentName).not.toBe('non-existent-agent');
    });

    it('should handle config load failure gracefully', async () => {
      vi.mocked(mockGetProjectConfig).mockRejectedValueOnce(new Error('Config load failed'));

      const result = await strategy.resolve(createActContext());

      // Should continue with pattern matching
      expect(result.agentName).toBeDefined();
    });
  });

  describe('meta-discussion detection', () => {
    // Meta-discussion patterns from meta-discussion.patterns.ts:
    // - /(?:mobile|frontend|backend|data|platform|devops|ai-?ml).?(?:developer|engineer)\s*(?:가|이|를|은|는|로|에|의|와|과)/i
    // - /(?:agent|에이전트)\s*(?:매칭|호출|선택|resolution|matching|selection|추천|recommendation)/i
    // - /primary\s*agent\s*(?:선택|매칭|시스템|system)/i
    // - /(?:agent|에이전트)\s*(?:활성화|activation|호출|invocation|파이프라인|pipeline)/i
    // - /(?:agent|에이전트).{0,20}(?:버그|bug|문제|issue|오류|error|잘못|wrong)/i
    const metaPrompts = [
      '에이전트 매칭이 안되는데요', // matches /에이전트\s*매칭/i
      'The agent selection is wrong', // matches /agent.{0,20}wrong/i
      'Primary Agent system 점검해줘', // matches /primary\s*agent\s*system/i
      'backend-developer가 선택되는 이유가 뭐야?', // matches /backend.?developer\s*가/i
    ];

    it.each(metaPrompts)('should skip intent patterns for meta-discussion: "%s"', async prompt => {
      const result = await strategy.resolve(createActContext({ prompt }));

      // Should fall through to default, not match intent patterns
      // because meta-discussions shouldn't trigger intent patterns
      expect(result.source).not.toBe('intent');
    });
  });

  describe('intent pattern matching', () => {
    describe('frontend-developer patterns', () => {
      const frontendPrompts = [
        'React 컴포넌트 만들어줘', // matches /react\s*(컴포넌트|component)/i
        'Build a Vue.js component', // matches /vue\.?js/i
        'UI 컴포넌트 개발해줘', // matches /UI\s*(컴포넌트|component)/i
        'Add tailwind styling', // matches /tailwind/i
        '프론트엔드 개발해줘', // matches /프론트엔드\s*(개발)/i
      ];

      it.each(frontendPrompts)('should detect frontend-developer intent: "%s"', async prompt => {
        const result = await strategy.resolve(createActContext({ prompt }));

        expect(result.agentName).toBe('frontend-developer');
        expect(result.source).toBe('intent');
      });
    });

    describe('devops-engineer patterns', () => {
      const devopsPrompts = [
        'Set up GitHub Actions workflow', // matches /github\s*actions/i
        'Configure Jenkins pipeline', // matches /jenkins/i
        'CI/CD 파이프라인 설계해줘', // matches /CI\s*\/?\s*CD\s*(파이프라인)/i
        'Docker compose 설정해줘', // matches /docker\s*(compose)/i
        '데브옵스 구축해줘', // matches /데브옵스/i
      ];

      it.each(devopsPrompts)('should detect devops-engineer intent: "%s"', async prompt => {
        const result = await strategy.resolve(createActContext({ prompt }));

        expect(result.agentName).toBe('devops-engineer');
        expect(result.source).toBe('intent');
      });
    });

    describe('agent-architect patterns', () => {
      // Patterns that match agent.patterns.ts:
      // - /MCP\s*(서버|server|tool|도구)/i
      // - /agent\s*(design|develop|architect|framework)/i
      // - /workflow\s*(automat|design|orchestrat)/i
      const agentPrompts = [
        'MCP 서버 만들어줘', // matches /MCP\s*(서버|server|tool|도구)/i
        'Create an agent framework', // matches /agent\s*(design|develop|architect|framework)/i
        'Design a workflow automation', // matches /workflow\s*(automat|design|orchestrat)/i
      ];

      it.each(agentPrompts)('should detect agent-architect intent: "%s"', async prompt => {
        const result = await strategy.resolve(createActContext({ prompt }));

        expect(result.agentName).toBe('agent-architect');
        expect(result.source).toBe('intent');
      });
    });

    describe('backend-developer patterns', () => {
      // Patterns that match backend.patterns.ts:
      // - /REST\s*API|RESTful/i
      // - /nestjs|nest\.js/i
      // - /GraphQL\s*(API|서버|server|스키마|schema)/i
      const backendPrompts = [
        'Create a REST API endpoint', // matches /REST\s*API|RESTful/i
        'Build a NestJS service', // matches /nestjs|nest\.js/i
        'Implement a GraphQL API', // matches /GraphQL\s*(API|서버|server|스키마|schema)/i
      ];

      it.each(backendPrompts)('should detect backend-developer intent: "%s"', async prompt => {
        const result = await strategy.resolve(createActContext({ prompt }));

        expect(result.agentName).toBe('backend-developer');
        expect(result.source).toBe('intent');
      });
    });

    describe('tooling-engineer patterns', () => {
      // Patterns that match tooling.patterns.ts:
      // - /webpack/i
      // - /eslint/i
      // - /vite\.config/i
      const toolingPrompts = [
        'Configure webpack for the project', // matches /webpack/i
        'Set up ESLint rules', // matches /eslint/i
        'Fix vite.config.ts', // matches /vite\.config/i
      ];

      it.each(toolingPrompts)('should detect tooling-engineer intent: "%s"', async prompt => {
        const result = await strategy.resolve(createActContext({ prompt }));

        expect(result.agentName).toBe('tooling-engineer');
        expect(result.source).toBe('intent');
      });
    });

    describe('data-engineer patterns', () => {
      // Patterns that match data.patterns.ts:
      // - /database|데이터베이스|DB\s*(설계|스키마|마이그레이션)/i
      // - /migration/i
      // - /스키마|schema\s*design/i
      const dataPrompts = [
        'Design the database schema', // matches /database.../i
        'Create a migration script', // matches /migration/i
        '데이터베이스 스키마를 설계해줘', // matches /데이터베이스/i
      ];

      it.each(dataPrompts)('should detect data-engineer intent: "%s"', async prompt => {
        const result = await strategy.resolve(createActContext({ prompt }));

        expect(result.agentName).toBe('data-engineer');
        expect(result.source).toBe('intent');
      });
    });

    describe('platform-engineer patterns', () => {
      // Need to check platform.patterns.ts for actual patterns
      const platformPrompts = [
        'Set up Kubernetes deployment', // Should match k8s/kubernetes patterns
        'Configure Terraform for AWS', // Should match terraform patterns
        'Create Helm charts', // Should match helm patterns
      ];

      it.each(platformPrompts)('should detect platform-engineer intent: "%s"', async prompt => {
        const result = await strategy.resolve(createActContext({ prompt }));

        expect(result.agentName).toBe('platform-engineer');
        expect(result.source).toBe('intent');
      });
    });

    describe('ai-ml-engineer patterns', () => {
      // Patterns that match ai-ml.patterns.ts:
      // - /pytorch|tensorflow|keras|jax/i (0.95)
      // - /hugging\s*face|transformers|diffusers/i (0.95)
      // - /langchain|llama.?index|llamaindex/i (0.95)
      // - /machine\s*learning|ML\s*(모델|model|파이프라인|pipeline)/i (0.90)
      // - /임베딩|embedding|벡터\s*(DB|database|저장)/i (0.85)
      const aiMlPrompts = [
        'Train a PyTorch model', // matches /pytorch/i
        'Implement with TensorFlow', // matches /tensorflow/i
        'Use HuggingFace transformers', // matches /hugging\s*face|transformers/i
        'Build a LangChain RAG pipeline', // matches /langchain/i
        'Create embeddings for vector search', // matches /embedding/i
        '딥러닝 모델 학습시켜줘', // matches /딥\s*러닝|deep\s*learning/i
        'Fine-tune the LLM model', // matches /fine.?tun/i
        'LLM 파인튜닝해줘', // matches /파인.?튜닝|fine.?tun/i (Korean)
        '임베딩 모델 구현', // matches /임베딩|embedding/i (Korean)
      ];

      it.each(aiMlPrompts)('should detect ai-ml-engineer intent: "%s"', async prompt => {
        const result = await strategy.resolve(
          createActContext({
            prompt,
            availableAgents: ['frontend-developer', 'backend-developer', 'ai-ml-engineer'],
          }),
        );

        expect(result.agentName).toBe('ai-ml-engineer');
        expect(result.source).toBe('intent');
      });
    });

    describe('mobile-developer patterns', () => {
      // Patterns that match mobile.patterns.ts:
      // - /react.?native/i (0.95)
      // - /flutter/i (0.95)
      // - /swiftui/i (0.95)
      // - /jetpack\s*compose/i (0.95)
      // - /모바일\s*(앱|개발|화면)/i (0.90)
      const mobilePrompts = [
        'Build a React Native component', // matches /react.?native/i
        'Create a Flutter widget', // matches /flutter/i
        'Implement SwiftUI view', // matches /swiftui/i
        'Design Jetpack Compose UI', // matches /jetpack\s*compose/i
        '모바일 앱 화면 개발해줘', // matches /모바일\s*(앱|개발|화면)/i
        'iOS 앱 개발해줘', // matches /iOS\s*(앱|개발)/i (Korean)
      ];

      it.each(mobilePrompts)('should detect mobile-developer intent: "%s"', async prompt => {
        const result = await strategy.resolve(
          createActContext({
            prompt,
            availableAgents: ['frontend-developer', 'backend-developer', 'mobile-developer'],
          }),
        );

        expect(result.agentName).toBe('mobile-developer');
        expect(result.source).toBe('intent');
      });
    });
  });

  describe('context-based inference', () => {
    it('should infer agent from file path with high confidence', async () => {
      // .go files have confidence 0.85 (>= 0.8 threshold) for backend-developer
      const result = await strategy.resolve(
        createActContext({
          prompt: 'Fix this file',
          context: { filePath: '/src/api/users.go' },
        }),
      );

      expect(result.agentName).toBe('backend-developer');
      expect(result.source).toBe('context');
    });

    it('should infer devops-engineer from infrastructure project type', async () => {
      const result = await strategy.resolve(
        createActContext({
          prompt: 'Help with this',
          context: { projectType: 'infrastructure' },
          availableAgents: ['devops-engineer', 'frontend-developer'],
        }),
      );

      expect(result.agentName).toBe('devops-engineer');
      expect(result.source).toBe('context');
    });

    it('should skip context inference below confidence threshold', async () => {
      // .ts files have confidence 0.7 (below 0.8 threshold), should fall through to default
      const result = await strategy.resolve(
        createActContext({
          prompt: 'Help with this',
          context: { filePath: '/src/components/Button.tsx' },
        }),
      );

      // Should fall through to default since .tsx has 0.7 confidence (below 0.8)
      expect(result.source).toBe('default');
    });
  });

  describe('default fallback', () => {
    it('should return frontend-developer by default', async () => {
      const result = await strategy.resolve(
        createActContext({
          prompt: 'Help me with this feature',
        }),
      );

      expect(result.agentName).toBe(DEFAULT_ACT_AGENT);
      expect(result.agentName).toBe('frontend-developer');
      expect(result.source).toBe('default');
      expect(result.confidence).toBe(1.0);
    });

    it('should fallback to first available agent if default unavailable', async () => {
      const result = await strategy.resolve(
        createActContext({
          prompt: 'Help me',
          availableAgents: ['backend-developer', 'devops-engineer'],
        }),
      );

      expect(result.agentName).toBe('backend-developer');
      expect(result.source).toBe('default');
      expect(result.confidence).toBe(0.8);
    });

    it('should return DEFAULT_ACT_AGENT even with empty available agents', async () => {
      const result = await strategy.resolve(
        createActContext({
          prompt: 'Help me',
          availableAgents: [],
        }),
      );

      expect(result.agentName).toBe('frontend-developer');
      expect(result.source).toBe('default');
      expect(result.confidence).toBe(0.5);
    });
  });

  describe('result structure', () => {
    it('should return PrimaryAgentResolutionResult interface', async () => {
      const result = await strategy.resolve(createActContext());

      expect(result).toHaveProperty('agentName');
      expect(result).toHaveProperty('source');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('reason');
      expect(typeof result.agentName).toBe('string');
      expect(typeof result.source).toBe('string');
      expect(typeof result.confidence).toBe('number');
      expect(typeof result.reason).toBe('string');
    });
  });

  describe('priority order', () => {
    it('should follow documented priority: explicit > recommended > config > intent > context > default', async () => {
      // Test that explicit wins over everything
      vi.mocked(mockGetProjectConfig).mockResolvedValueOnce({
        primaryAgent: 'backend-developer',
      });

      const result = await strategy.resolve(
        createActContext({
          prompt: 'Use frontend-developer to build the API',
          recommendedActAgent: 'devops-engineer',
          context: { filePath: '/src/api/users.ts' },
        }),
      );

      expect(result.agentName).toBe('frontend-developer');
      expect(result.source).toBe('explicit');
    });
  });

  describe('recommendation mode (isRecommendation)', () => {
    it('should skip project config when isRecommendation is true', async () => {
      const configStrategy = new ActAgentStrategy(
        vi.fn().mockResolvedValue({ primaryAgent: 'agent-architect' }),
      );

      const result = await configStrategy.resolve(
        createActContext({
          prompt: 'REST API 설계해줘',
          isRecommendation: true,
        }),
      );

      // Intent pattern should match backend-developer, not project config
      expect(result.agentName).toBe('backend-developer');
      expect(result.source).toBe('intent');
    });

    it('should still use project config when isRecommendation is false', async () => {
      const configStrategy = new ActAgentStrategy(
        vi.fn().mockResolvedValue({ primaryAgent: 'agent-architect' }),
      );

      const result = await configStrategy.resolve(
        createActContext({
          prompt: 'REST API 설계해줘',
        }),
      );

      expect(result.agentName).toBe('agent-architect');
      expect(result.source).toBe('config');
    });

    it('should fall back to project config when no intent matches in recommendation mode', async () => {
      const configStrategy = new ActAgentStrategy(
        vi.fn().mockResolvedValue({ primaryAgent: 'agent-architect' }),
      );

      const result = await configStrategy.resolve(
        createActContext({
          prompt: 'do something generic',
          isRecommendation: true,
        }),
      );

      // No intent match → falls through to project config as late fallback
      expect(result.agentName).toBe('agent-architect');
      expect(result.source).toBe('config');
    });

    it('should still respect explicit request in recommendation mode', async () => {
      const configStrategy = new ActAgentStrategy(
        vi.fn().mockResolvedValue({ primaryAgent: 'agent-architect' }),
      );

      const result = await configStrategy.resolve(
        createActContext({
          prompt: 'Use backend-developer for this task',
          isRecommendation: true,
        }),
      );

      expect(result.agentName).toBe('backend-developer');
      expect(result.source).toBe('explicit');
    });

    it('should still respect recommendedActAgent in recommendation mode', async () => {
      const configStrategy = new ActAgentStrategy(
        vi.fn().mockResolvedValue({ primaryAgent: 'agent-architect' }),
      );

      const result = await configStrategy.resolve(
        createActContext({
          prompt: 'Implement the feature',
          isRecommendation: true,
          recommendedActAgent: 'data-engineer',
        }),
      );

      expect(result.agentName).toBe('data-engineer');
      expect(result.source).toBe('config');
    });

    describe('issue #360 scenarios', () => {
      it('"design API" should recommend backend-developer, not project config', async () => {
        const configStrategy = new ActAgentStrategy(
          vi.fn().mockResolvedValue({ primaryAgent: 'agent-architect' }),
        );

        const result = await configStrategy.resolve(
          createActContext({
            prompt: 'design REST API',
            isRecommendation: true,
          }),
        );

        expect(result.agentName).toBe('backend-developer');
        expect(result.source).toBe('intent');
      });

      it('"build UI" should recommend frontend-developer', async () => {
        const configStrategy = new ActAgentStrategy(
          vi.fn().mockResolvedValue({ primaryAgent: 'agent-architect' }),
        );

        const result = await configStrategy.resolve(
          createActContext({
            prompt: 'build UI component with React',
            isRecommendation: true,
          }),
        );

        expect(result.agentName).toBe('frontend-developer');
        expect(result.source).toBe('intent');
      });

      it('"setup CI/CD" should recommend devops-engineer', async () => {
        const configStrategy = new ActAgentStrategy(
          vi.fn().mockResolvedValue({ primaryAgent: 'agent-architect' }),
        );

        const result = await configStrategy.resolve(
          createActContext({
            prompt: 'setup CI/CD pipeline',
            isRecommendation: true,
          }),
        );

        expect(result.agentName).toBe('devops-engineer');
        expect(result.source).toBe('intent');
      });
    });
  });
});
