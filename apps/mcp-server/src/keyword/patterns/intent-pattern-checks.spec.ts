/**
 * Intent Pattern Checks Aggregation Tests
 *
 * Tests for INTENT_PATTERN_CHECKS including:
 * - All 13 domains are represented
 * - Priority ordering (first match wins)
 * - False positive prevention (agent name mentions vs domain)
 * - Each domain returns correct agent identifier
 */

import { describe, it, expect } from 'vitest';
import { INTENT_PATTERN_CHECKS } from './intent-pattern-checks';

describe('INTENT_PATTERN_CHECKS', () => {
  describe('structure and completeness', () => {
    it('should contain exactly 13 domain checks', () => {
      expect(INTENT_PATTERN_CHECKS).toHaveLength(13);
    });

    it('should be a readonly array', () => {
      // ReadonlyArray prevents push/pop at type level;
      // at runtime we verify it is a plain array
      expect(Array.isArray(INTENT_PATTERN_CHECKS)).toBe(true);
    });

    it('should have unique agent names', () => {
      const agents = INTENT_PATTERN_CHECKS.map(c => c.agent);
      expect(new Set(agents).size).toBe(agents.length);
    });

    it('should have unique categories', () => {
      const categories = INTENT_PATTERN_CHECKS.map(c => c.category);
      expect(new Set(categories).size).toBe(categories.length);
    });

    it.each([
      { agent: 'agent-architect', category: 'Agent' },
      { agent: 'test-engineer', category: 'Test' },
      { agent: 'tooling-engineer', category: 'Tooling' },
      { agent: 'platform-engineer', category: 'Platform' },
      { agent: 'security-engineer', category: 'Security' },
      { agent: 'systems-developer', category: 'Systems' },
      { agent: 'data-engineer', category: 'Data' },
      { agent: 'data-scientist', category: 'DataScience' },
      { agent: 'ai-ml-engineer', category: 'AI/ML' },
      { agent: 'backend-developer', category: 'Backend' },
      { agent: 'frontend-developer', category: 'Frontend' },
      { agent: 'devops-engineer', category: 'DevOps' },
      { agent: 'mobile-developer', category: 'Mobile' },
    ])('should include $agent with category $category', ({ agent, category }) => {
      const check = INTENT_PATTERN_CHECKS.find(c => c.agent === agent);
      expect(check).toBeDefined();
      expect(check!.category).toBe(category);
    });

    it('should have non-empty patterns array for every check', () => {
      for (const check of INTENT_PATTERN_CHECKS) {
        expect(check.patterns.length).toBeGreaterThan(0);
      }
    });

    it('should have valid IntentPattern items (pattern, confidence, description)', () => {
      for (const check of INTENT_PATTERN_CHECKS) {
        for (const p of check.patterns) {
          expect(p.pattern).toBeInstanceOf(RegExp);
          expect(typeof p.confidence).toBe('number');
          expect(p.confidence).toBeGreaterThan(0);
          expect(p.confidence).toBeLessThanOrEqual(1);
          expect(typeof p.description).toBe('string');
          expect(p.description.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('priority ordering', () => {
    const agentIndex = (agent: string): number =>
      INTENT_PATTERN_CHECKS.findIndex(c => c.agent === agent);

    it('should place agent-architect first (index 0)', () => {
      expect(agentIndex('agent-architect')).toBe(0);
    });

    it('should place test-engineer second (index 1)', () => {
      expect(agentIndex('test-engineer')).toBe(1);
    });

    it('should place mobile-developer last (index 12)', () => {
      expect(agentIndex('mobile-developer')).toBe(12);
    });

    it('should place agent-architect before backend-developer', () => {
      expect(agentIndex('agent-architect')).toBeLessThan(agentIndex('backend-developer'));
    });

    it('should place test-engineer before backend-developer', () => {
      expect(agentIndex('test-engineer')).toBeLessThan(agentIndex('backend-developer'));
    });

    it('should place test-engineer before frontend-developer', () => {
      expect(agentIndex('test-engineer')).toBeLessThan(agentIndex('frontend-developer'));
    });

    it('should place security-engineer before backend-developer', () => {
      expect(agentIndex('security-engineer')).toBeLessThan(agentIndex('backend-developer'));
    });

    it('should place data-engineer before backend-developer', () => {
      expect(agentIndex('data-engineer')).toBeLessThan(agentIndex('backend-developer'));
    });

    it('should place backend-developer before mobile-developer', () => {
      expect(agentIndex('backend-developer')).toBeLessThan(agentIndex('mobile-developer'));
    });

    it('should place frontend-developer before mobile-developer', () => {
      expect(agentIndex('frontend-developer')).toBeLessThan(agentIndex('mobile-developer'));
    });

    const EXPECTED_ORDER = [
      'agent-architect',
      'test-engineer',
      'tooling-engineer',
      'platform-engineer',
      'security-engineer',
      'systems-developer',
      'data-engineer',
      'data-scientist',
      'ai-ml-engineer',
      'backend-developer',
      'frontend-developer',
      'devops-engineer',
      'mobile-developer',
    ];

    it('should follow the exact documented priority order', () => {
      const actual = INTENT_PATTERN_CHECKS.map(c => c.agent);
      expect(actual).toEqual(EXPECTED_ORDER);
    });
  });

  describe('false positive prevention (first-match-wins simulation)', () => {
    /**
     * Simulates the for-of loop in act-agent.strategy.ts:
     * Iterates INTENT_PATTERN_CHECKS in order and returns the first match.
     */
    const firstMatchAgent = (prompt: string): string | null => {
      for (const { agent, patterns } of INTENT_PATTERN_CHECKS) {
        if (patterns.some(({ pattern }) => pattern.test(prompt))) {
          return agent;
        }
      }
      return null;
    };

    it('should match "에이전트 설계 for Mobile Developer" to agent-architect (agent patterns checked first)', () => {
      const result = firstMatchAgent('에이전트 설계 for Mobile Developer');
      expect(result).toBe('agent-architect');
    });

    it('should match "agent design for mobile" to agent-architect', () => {
      const result = firstMatchAgent('agent design for mobile platform');
      expect(result).toBe('agent-architect');
    });

    it('should match "implement Mobile Developer agent" to mobile-developer (greedy mobile pattern)', () => {
      // "Mobile Developer" matches /mobile\s*(app|develop|screen)/i before agent patterns
      const result = firstMatchAgent('implement Mobile Developer agent');
      expect(result).toBe('mobile-developer');
    });

    it('should match "write unit tests for API" to test-engineer, not backend-developer', () => {
      const result = firstMatchAgent('write unit tests for API endpoints');
      expect(result).toBe('test-engineer');
    });

    it('should match "TDD로 NestJS 서버 개발" to test-engineer (TDD keyword)', () => {
      const result = firstMatchAgent('TDD로 NestJS 서버 개발');
      expect(result).toBe('test-engineer');
    });

    it('should match "React Native 앱 만들어줘" to mobile-developer (no ambiguity)', () => {
      const result = firstMatchAgent('React Native 앱 만들어줘');
      expect(result).toBe('mobile-developer');
    });

    it('should match "MCP 서버 만들어줘" to agent-architect', () => {
      const result = firstMatchAgent('MCP 서버 만들어줘');
      expect(result).toBe('agent-architect');
    });

    it('should match "Docker compose 설정" to devops-engineer', () => {
      const result = firstMatchAgent('Docker compose 설정');
      expect(result).toBe('devops-engineer');
    });

    it('should match "Kubernetes 클러스터 설정" to platform-engineer', () => {
      const result = firstMatchAgent('Kubernetes 클러스터 설정');
      expect(result).toBe('platform-engineer');
    });

    it('should match "데이터베이스 마이그레이션" to data-engineer', () => {
      const result = firstMatchAgent('데이터베이스 마이그레이션');
      expect(result).toBe('data-engineer');
    });

    it('should match "React 컴포넌트 만들어줘" to frontend-developer', () => {
      const result = firstMatchAgent('React 컴포넌트 만들어줘');
      expect(result).toBe('frontend-developer');
    });

    it('should match "NestJS API 만들어줘" to backend-developer', () => {
      const result = firstMatchAgent('NestJS API 만들어줘');
      expect(result).toBe('backend-developer');
    });

    it('should match "webpack 설정 변경" to tooling-engineer', () => {
      const result = firstMatchAgent('webpack 설정 변경');
      expect(result).toBe('tooling-engineer');
    });

    it('should match "XSS 취약점 수정" to security-engineer', () => {
      const result = firstMatchAgent('XSS 취약점 수정');
      expect(result).toBe('security-engineer');
    });

    it('should match "Rust FFI 바인딩 구현" to systems-developer', () => {
      const result = firstMatchAgent('Rust FFI 바인딩 구현');
      expect(result).toBe('systems-developer');
    });

    it('should match "pandas 데이터 분석" to data-scientist', () => {
      const result = firstMatchAgent('pandas 데이터 분석');
      expect(result).toBe('data-scientist');
    });

    it('should match "LLM 파인튜닝 구현" to ai-ml-engineer', () => {
      const result = firstMatchAgent('LLM 파인튜닝 구현');
      expect(result).toBe('ai-ml-engineer');
    });

    it('should match "Flutter 위젯 구현" to mobile-developer', () => {
      const result = firstMatchAgent('Flutter 위젯 구현');
      expect(result).toBe('mobile-developer');
    });

    it('should return null for unrecognized prompt', () => {
      const result = firstMatchAgent('hello world');
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = firstMatchAgent('');
      expect(result).toBeNull();
    });
  });

  describe('individual domain pattern matching', () => {
    const matchesDomain = (agent: string, prompt: string): boolean => {
      const check = INTENT_PATTERN_CHECKS.find(c => c.agent === agent);
      if (!check) return false;
      return check.patterns.some(({ pattern }) => pattern.test(prompt));
    };

    describe('agent-architect patterns', () => {
      it('should match MCP server', () => {
        expect(matchesDomain('agent-architect', 'MCP 서버 만들어줘')).toBe(true);
      });

      it('should match agent development', () => {
        expect(matchesDomain('agent-architect', 'agent design for mobile')).toBe(true);
      });

      it('should match workflow automation', () => {
        expect(matchesDomain('agent-architect', 'workflow automation 구현')).toBe(true);
      });

      it('should not match plain backend prompt', () => {
        expect(matchesDomain('agent-architect', 'NestJS API 만들어줘')).toBe(false);
      });
    });

    describe('test-engineer patterns', () => {
      it('should match TDD keyword', () => {
        expect(matchesDomain('test-engineer', 'TDD로 개발해줘')).toBe(true);
      });

      it('should match unit test', () => {
        expect(matchesDomain('test-engineer', 'unit test 작성')).toBe(true);
      });

      it('should not match plain React prompt', () => {
        expect(matchesDomain('test-engineer', 'React 컴포넌트 개발')).toBe(false);
      });
    });

    describe('mobile-developer patterns', () => {
      it('should match React Native', () => {
        expect(matchesDomain('mobile-developer', 'React Native 앱')).toBe(true);
      });

      it('should match Flutter', () => {
        expect(matchesDomain('mobile-developer', 'Flutter 위젯')).toBe(true);
      });

      it('should match SwiftUI', () => {
        expect(matchesDomain('mobile-developer', 'SwiftUI 뷰 만들어줘')).toBe(true);
      });

      it('should match Jetpack Compose', () => {
        expect(matchesDomain('mobile-developer', 'Jetpack Compose UI')).toBe(true);
      });

      it('should match Korean mobile app pattern', () => {
        expect(matchesDomain('mobile-developer', '모바일 앱 개발')).toBe(true);
      });

      it('should not match plain agent prompt', () => {
        expect(matchesDomain('mobile-developer', 'agent 설계해줘')).toBe(false);
      });
    });

    describe('backend-developer patterns', () => {
      it('should match NestJS', () => {
        expect(matchesDomain('backend-developer', 'NestJS 서비스 개발')).toBe(true);
      });

      it('should match REST API', () => {
        expect(matchesDomain('backend-developer', 'REST API 설계')).toBe(true);
      });
    });

    describe('frontend-developer patterns', () => {
      it('should match React component', () => {
        expect(matchesDomain('frontend-developer', 'React 컴포넌트 만들어줘')).toBe(true);
      });
    });

    describe('devops-engineer patterns', () => {
      it('should match Docker compose', () => {
        expect(matchesDomain('devops-engineer', 'Docker compose 설정')).toBe(true);
      });

      it('should match CI/CD', () => {
        expect(matchesDomain('devops-engineer', 'CI/CD 파이프라인 구축')).toBe(true);
      });

      it('should match GitHub Actions', () => {
        expect(matchesDomain('devops-engineer', 'GitHub Actions 워크플로우')).toBe(true);
      });
    });

    describe('security-engineer patterns', () => {
      it('should match XSS', () => {
        expect(matchesDomain('security-engineer', 'XSS 취약점 방지')).toBe(true);
      });
    });

    describe('systems-developer patterns', () => {
      it('should match Rust', () => {
        expect(matchesDomain('systems-developer', 'Rust 코드 작성')).toBe(true);
      });
    });

    describe('data-engineer patterns', () => {
      it('should match database migration', () => {
        expect(matchesDomain('data-engineer', '데이터베이스 마이그레이션')).toBe(true);
      });
    });

    describe('data-scientist patterns', () => {
      it('should match pandas', () => {
        expect(matchesDomain('data-scientist', 'pandas 데이터 분석')).toBe(true);
      });
    });

    describe('ai-ml-engineer patterns', () => {
      it('should match LLM', () => {
        expect(matchesDomain('ai-ml-engineer', 'LLM 파인튜닝')).toBe(true);
      });
    });

    describe('tooling-engineer patterns', () => {
      it('should match webpack', () => {
        expect(matchesDomain('tooling-engineer', 'webpack 설정 변경')).toBe(true);
      });
    });

    describe('platform-engineer patterns', () => {
      it('should match Kubernetes', () => {
        expect(matchesDomain('platform-engineer', 'Kubernetes 클러스터 설정')).toBe(true);
      });
    });
  });
});
