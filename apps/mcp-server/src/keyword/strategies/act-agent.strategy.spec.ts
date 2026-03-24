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

  describe('explicit_patterns matching', () => {
    const explicitPatternsMap = new Map([
      ['agent-architect', ['create agent', 'new agent', 'agent creation']],
      ['test-engineer', ['write test code', 'unit test', 'with TDD']],
      ['security-engineer', ['fix security vulnerability', 'implement JWT']],
    ]);

    it('should match explicit_patterns from agent JSON', async () => {
      const result = await strategy.resolve(
        createActContext({
          prompt: 'We need to create agent for the new workflow',
          explicitPatternsMap,
        }),
      );

      expect(result.agentName).toBe('agent-architect');
      expect(result.source).toBe('explicit_patterns');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should prefer explicit request over explicit_patterns', async () => {
      const result = await strategy.resolve(
        createActContext({
          prompt: 'use backend-developer to create agent definitions',
          explicitPatternsMap,
        }),
      );

      expect(result.agentName).toBe('backend-developer');
      expect(result.source).toBe('explicit');
    });

    it('should prefer explicit_patterns over recommended agent', async () => {
      const result = await strategy.resolve(
        createActContext({
          prompt: 'implement JWT authentication for the API',
          recommendedActAgent: 'backend-developer',
          explicitPatternsMap,
        }),
      );

      expect(result.agentName).toBe('security-engineer');
      expect(result.source).toBe('explicit_patterns');
    });

    it('should skip unavailable agents in explicit_patterns', async () => {
      const result = await strategy.resolve(
        createActContext({
          prompt: 'create agent for the workflow',
          availableAgents: ['backend-developer', 'software-engineer'],
          explicitPatternsMap,
        }),
      );

      // agent-architect not available, should fall through
      expect(result.agentName).not.toBe('agent-architect');
    });

    it('should fall through when no explicit_patterns match', async () => {
      const result = await strategy.resolve(
        createActContext({
          prompt: 'refactor the login page',
          explicitPatternsMap,
        }),
      );

      // No pattern matches, should fall through to other resolution steps
      expect(result.source).not.toBe('explicit_patterns');
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

    describe('test-engineer patterns', () => {
      // Patterns that match test.patterns.ts:
      // - /TDD\s*(로|로\s*구현|cycle|approach)/i (0.95)
      // - /\b(jest|vitest|mocha|jasmine)\s*(unit|test|spec|설정|config)/i (0.95)
      // - /테스트\s*(코드|케이스|작성|추가|구현)/i (0.90)
      // - /단위\s*테스트|unit\s*test/i (0.90)
      const testPrompts = [
        '테스트 코드 작성해줘', // matches /테스트\s*(코드|케이스|작성|추가|구현)/i
        'Jest unit test 추가', // matches /\b(jest|vitest...)/ + unit test
        'TDD로 구현해줘', // matches /TDD\s*(로|로\s*구현|cycle|approach)/i
        '단위 테스트 추가해줘', // matches /단위\s*테스트|unit\s*test/i
        'Write Vitest unit tests', // matches /\b(jest|vitest...)/i
        'e2e 테스트 작성', // matches /e2e\s*(테스트|test)/i
      ];

      it.each(testPrompts)('should detect test-engineer intent: "%s"', async prompt => {
        const result = await strategy.resolve(
          createActContext({
            prompt,
          }),
        );

        expect(result.agentName).toBe('test-engineer');
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

    describe('data-scientist patterns', () => {
      // Patterns that match data-science.patterns.ts (13 patterns total):
      // - /pandas|numpy|matplotlib|seaborn|plotly/i (0.95)
      // - /jupyter|\.ipynb|주피터/i (0.95)
      // - /scikit.?learn|sklearn/i (0.95)
      // - /탐색적\s*분석|EDA|exploratory\s*data\s*analysis/i (0.95)
      // - /데이터\s*분석\s*(스크립트|코드|구현|작성)|data\s*analysis\s*(script|code|implement)/i (0.95)
      // - /데이터\s*시각화|data\s*visualization/i (0.90)
      // - /통계\s*(분석|모델|검정)|statistical\s*(analysis|model|test)/i (0.90)
      // - /상관관계\s*분석|correlation\s*analysis/i (0.90)
      // - /회귀\s*(분석|모델)|regression\s*(analysis|model)/i (0.90)
      // - /분류\s*(모델|알고리즘)|classification\s*(model|algorithm)/i (0.90)
      // - /피처\s*엔지니어링|feature\s*engineering/i (0.90)
      // - /scipy|statsmodels/i (0.90)
      // - /데이터\s*분석/i (0.85) - standalone Korean
      const dataScientistPrompts = [
        'Pandas로 데이터 분석해줘', // matches /pandas/i (0.95)
        'matplotlib 시각화 코드 작성', // matches /matplotlib/i (0.95)
        'EDA 스크립트 구현해줘', // matches /EDA/i (0.95)
        'sklearn 분류 모델 만들어줘', // matches /scikit.?learn|sklearn/i (0.95)
        '주피터 노트북 작성해줘', // matches /주피터/i (0.95)
        '데이터 분석 코드 작성해줘', // matches /데이터\s*분석\s*(코드)/i (0.95)
        '데이터 시각화 구현해줘', // matches /데이터\s*시각화/i (0.90)
        '통계 분석 코드 작성해줘', // matches /통계\s*(분석)/i (0.90)
        '상관관계 분석해줘', // matches /상관관계\s*분석/i (0.90)
        '회귀 모델 만들어줘', // matches /회귀\s*(모델)/i (0.90)
        '피처 엔지니어링 코드 작성', // matches /피처\s*엔지니어링/i (0.90)
        '분류 알고리즘 구현해줘', // matches /분류\s*(모델|알고리즘)/i (0.90)
      ];

      it.each(dataScientistPrompts)('should detect data-scientist intent: "%s"', async prompt => {
        const result = await strategy.resolve(
          createActContext({
            prompt,
            availableAgents: ['data-scientist', 'data-engineer', 'frontend-developer'],
          }),
        );

        expect(result.agentName).toBe('data-scientist');
        expect(result.source).toBe('intent');
      });
    });

    describe('data-scientist boundary cases', () => {
      it('should NOT route "Create a migration script" to data-scientist (→ data-engineer)', async () => {
        const result = await strategy.resolve(
          createActContext({ prompt: 'Create a migration script' }),
        );
        expect(result.agentName).toBe('data-engineer');
        expect(result.agentName).not.toBe('data-scientist');
      });

      it('should NOT route "데이터베이스 스키마 설계" to data-scientist (→ data-engineer)', async () => {
        const result = await strategy.resolve(
          createActContext({ prompt: '데이터베이스 스키마 설계해줘' }),
        );
        expect(result.agentName).toBe('data-engineer');
        expect(result.agentName).not.toBe('data-scientist');
      });

      it('should NOT route "Train a PyTorch model" to data-scientist (→ ai-ml-engineer)', async () => {
        const result = await strategy.resolve(
          createActContext({
            prompt: 'Train a PyTorch model',
            availableAgents: ['data-scientist', 'ai-ml-engineer', 'backend-developer'],
          }),
        );
        expect(result.agentName).toBe('ai-ml-engineer');
        expect(result.agentName).not.toBe('data-scientist');
      });

      it('should route "데이터 분석해줘" to data-scientist (standalone 0.85 pattern)', async () => {
        const result = await strategy.resolve(
          createActContext({
            prompt: '데이터 분석해줘',
            availableAgents: ['data-scientist', 'data-engineer', 'frontend-developer'],
          }),
        );
        expect(result.agentName).toBe('data-scientist');
        expect(result.source).toBe('intent');
      });

      it('should route "scipy 통계 분석 코드" to data-scientist (scipy 0.90 pattern)', async () => {
        const result = await strategy.resolve(
          createActContext({
            prompt: 'scipy 통계 분석 코드 작성해줘',
            availableAgents: ['data-scientist', 'data-engineer', 'backend-developer'],
          }),
        );
        expect(result.agentName).toBe('data-scientist');
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

    describe('security-engineer patterns', () => {
      // Patterns that match security.patterns.ts:
      // - /JWT\s*(구현|인증|토큰\s*생성)/i (0.95)
      // - /SQL\s*(injection|인젝션)/i (0.95)
      // - /XSS\s*(방어|방지|수정|취약점|fix|prevent|vulnerabilit)/i (0.95)
      // - /CSRF\s*(방어|방지|토큰|fix|prevent|token)/i (0.95)
      // - /OAuth\s*(구현|2\.0|플로우|implement|flow)/i (0.95)
      // - /암호화\s*(구현|추가|적용)|encrypt.*(implement|add)/i (0.90)
      // - /RBAC|role[-\s]?based\s*access/i (0.90)
      // - /CORS\s*(설정|구현|정책|configuration|policy|implement)/i (0.90)
      const securityPrompts = [
        'JWT 인증 구현해줘', // matches /JWT\s*(구현|인증)/i
        'SQL injection 취약점 수정', // matches /SQL\s*(injection|인젝션)/i
        '비밀번호 암호화 추가', // matches /암호화\s*(구현|추가|적용)/i
        'XSS 취약점 수정해줘', // matches /XSS\s*(취약점)/i
        'CSRF 방어 추가', // matches /CSRF\s*(방어)/i
        'OAuth 2.0 구현', // matches /OAuth\s*(2\.0)/i
        'RBAC 구현해줘', // matches /RBAC/i
        'CORS 설정 구현', // matches /CORS\s*(설정|구현)/i
        'security vulnerability fix', // matches /security\s*(vulnerabilit\w*|bug|issue)\s*(fix|patch|resolv)/i
        'OWASP 준수 구현해줘', // matches /OWASP\s*(구현|적용|준수\s*구현|implement|apply|remedi)/i
      ];

      it.each(securityPrompts)('should detect security-engineer intent: "%s"', async prompt => {
        const result = await strategy.resolve(
          createActContext({
            prompt,
          }),
        );

        expect(result.agentName).toBe('security-engineer');
        expect(result.source).toBe('intent');
      });
    });

    describe('systems-developer patterns', () => {
      // Patterns from systems.patterns.ts:
      // - /\brust\b/i (0.95)
      // - /c\+\+|\.cpp\b|\.hpp\b|\bcpp\b/i (0.95)
      // - /\bffi\b|foreign\s*function\s*interface/i (0.95)
      // - /ffi\s*(바인딩|binding)/i (0.95)
      // - /\bwasm\b|\bwebassembly\b/i (0.95)
      // - /시스템\s*프로그래밍|systems?\s*programming/i (0.90)
      // - /저수준\s*(구현|개발|최적화)|low[-\s]?level\s*(implement|develop|optim)/i (0.90)
      const systemsPrompts = [
        'Rust로 서버 구현해줘', // matches /\brust\b/i
        'C++ 메모리 최적화', // matches /c\+\+/i
        'FFI 바인딩 작성', // matches /ffi\s*(바인딩|binding)/i
        'WASM 모듈 구현해줘', // matches /\bwasm\b/i
        '시스템 프로그래밍 구현', // matches /시스템\s*프로그래밍/i
        '저수준 최적화해줘', // matches /저수준\s*(구현|개발|최적화)/i
      ];

      it.each(systemsPrompts)('should detect systems-developer intent: "%s"', async prompt => {
        const result = await strategy.resolve(
          createActContext({
            prompt,
            availableAgents: ['frontend-developer', 'backend-developer', 'systems-developer'],
          }),
        );

        expect(result.agentName).toBe('systems-developer');
        expect(result.source).toBe('intent');
      });
    });

    describe('systems-developer boundary cases', () => {
      it('should NOT route "React 바인딩 작성해줘" to systems-developer (→ frontend-developer)', async () => {
        const result = await strategy.resolve(
          createActContext({
            prompt: 'React 바인딩 작성해줘',
            availableAgents: ['frontend-developer', 'backend-developer', 'systems-developer'],
          }),
        );
        expect(result.agentName).toBe('frontend-developer');
        expect(result.agentName).not.toBe('systems-developer');
      });

      it('should NOT route "customer lifetime value 계산" to systems-developer (→ data-engineer)', async () => {
        const result = await strategy.resolve(
          createActContext({
            prompt: 'customer lifetime value 계산해줘',
            availableAgents: ['data-engineer', 'backend-developer', 'systems-developer'],
          }),
        );
        expect(result.agentName).not.toBe('systems-developer');
      });

      it('should NOT route "embedded 비디오 추가해줘" to systems-developer (→ frontend-developer)', async () => {
        const result = await strategy.resolve(
          createActContext({
            prompt: 'embedded 비디오 추가해줘',
            availableAgents: ['frontend-developer', 'backend-developer', 'systems-developer'],
          }),
        );
        expect(result.agentName).not.toBe('systems-developer');
      });

      it('should still route "Rust lifetime 오류 수정" to systems-developer', async () => {
        const result = await strategy.resolve(
          createActContext({
            prompt: 'Rust lifetime 오류 수정해줘',
            availableAgents: ['frontend-developer', 'backend-developer', 'systems-developer'],
          }),
        );
        expect(result.agentName).toBe('systems-developer');
        expect(result.source).toBe('intent');
      });

      it('should still route "embedded system 개발" to systems-developer', async () => {
        const result = await strategy.resolve(
          createActContext({
            prompt: 'embedded system 개발해줘',
            availableAgents: ['frontend-developer', 'backend-developer', 'systems-developer'],
          }),
        );
        expect(result.agentName).toBe('systems-developer');
        expect(result.source).toBe('intent');
      });
    });

    describe('security-engineer boundary cases', () => {
      it('should NOT route "인증 서버 개발해줘" to security-engineer (→ backend-developer)', async () => {
        const result = await strategy.resolve(createActContext({ prompt: '인증 서버 개발해줘' }));
        expect(result.agentName).toBe('backend-developer');
      });

      it('should route "인증 시스템 구현" to security-engineer (auth system = security domain)', async () => {
        const result = await strategy.resolve(createActContext({ prompt: '인증 시스템 구현' }));
        expect(result.agentName).toBe('security-engineer');
      });

      it('should NOT route "보안 검토해줘" to security-engineer (EVAL-type prompt, no implementation verb)', async () => {
        const result = await strategy.resolve(createActContext({ prompt: '보안 검토해줘' }));
        expect(result.agentName).not.toBe('security-engineer');
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
    it('should return software-engineer by default', async () => {
      const result = await strategy.resolve(
        createActContext({
          prompt: 'Help me with this feature',
        }),
      );

      expect(result.agentName).toBe(DEFAULT_ACT_AGENT);
      expect(result.agentName).toBe('software-engineer');
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

      expect(result.agentName).toBe('software-engineer');
      expect(result.source).toBe('default');
      expect(result.confidence).toBe(0.5);
    });

    it('should NOT select software-engineer via intent patterns', async () => {
      // software-engineer has no intent patterns — it must only appear as default fallback
      const result = await strategy.resolve(
        createActContext({
          prompt: 'Help me with this feature',
          availableAgents: ['software-engineer', 'backend-developer', 'frontend-developer'],
        }),
      );

      expect(result.agentName).toBe('software-engineer');
      expect(result.source).toBe('default'); // must NOT be 'intent'
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
