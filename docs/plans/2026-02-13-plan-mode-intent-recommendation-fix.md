# PLAN Mode Intent-Based Recommendation Fix

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** PLAN 모드에서 `recommended_act_agent`가 프로젝트 설정값만 반환하지 않고, 프롬프트 의도(intent) 분석을 기반으로 적절한 에이전트를 추천하도록 수정

**Architecture:** `StrategyContext`에 `isRecommendation` 플래그를 추가하고, `ActAgentStrategy.resolve()`에서 이 플래그가 `true`일 때 프로젝트 설정 대신 intent 패턴 분석을 우선하도록 변경. 또한 누락된 `frontend-developer`와 `devops-engineer` intent 패턴을 추가.

**Tech Stack:** TypeScript, NestJS, Vitest

**Issue:** https://github.com/JeremyDev87/codingbuddy/issues/360

---

## Task 1: `StrategyContext`에 `isRecommendation` 플래그 추가

**Files:**
- Modify: `apps/mcp-server/src/keyword/strategies/resolution-strategy.interface.ts:33-38`

**Step 1: 실패하는 테스트 작성**

`apps/mcp-server/src/keyword/strategies/act-agent.strategy.spec.ts`에 recommendation 모드 테스트 추가:

```typescript
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

  it('should fall back to project config when no intent pattern matches in recommendation mode', async () => {
    const configStrategy = new ActAgentStrategy(
      vi.fn().mockResolvedValue({ primaryAgent: 'agent-architect' }),
    );

    const result = await configStrategy.resolve(
      createActContext({
        prompt: 'do something generic',
        isRecommendation: true,
      }),
    );

    // No intent match → falls through to project config as final fallback
    expect(result.agentName).toBe('agent-architect');
    expect(result.source).toBe('config');
  });
});
```

**Step 2: 테스트 실행하여 실패 확인**

Run: `yarn workspace codingbuddy test -- --run apps/mcp-server/src/keyword/strategies/act-agent.strategy.spec.ts`
Expected: FAIL (isRecommendation property does not exist on StrategyContext)

**Step 3: `StrategyContext` 인터페이스에 `isRecommendation` 추가**

`apps/mcp-server/src/keyword/strategies/resolution-strategy.interface.ts`:

```typescript
export interface StrategyContext {
  readonly prompt: string;
  readonly availableAgents: string[];
  readonly context?: ResolutionContext;
  readonly recommendedActAgent?: string;
  readonly isRecommendation?: boolean;
}
```

**Step 4: 테스트 실행 (아직 실패 예상)**

Run: `yarn workspace codingbuddy test -- --run apps/mcp-server/src/keyword/strategies/act-agent.strategy.spec.ts`
Expected: FAIL (resolve 로직은 아직 isRecommendation을 처리하지 않음)

**Step 5: Commit**

```bash
git add apps/mcp-server/src/keyword/strategies/resolution-strategy.interface.ts apps/mcp-server/src/keyword/strategies/act-agent.strategy.spec.ts
git commit -m "test: add isRecommendation flag to StrategyContext and failing tests

Part of #360 - PLAN mode intent recommendation fix"
```

---

## Task 2: `ActAgentStrategy.resolve()`에서 recommendation 모드 처리

**Files:**
- Modify: `apps/mcp-server/src/keyword/strategies/act-agent.strategy.ts:156-225`

**Step 1: `resolve()` 메서드 수정**

`isRecommendation`이 `true`일 때 우선순위 변경:
1. Explicit request (유지)
2. PLAN mode recommended agent (유지)
3. ~~Project config~~ → **skip**
4. Meta-discussion → Intent patterns (유지, **핵심**)
5. Context-based (유지)
6. **Project config** (recommendation 모드에서는 여기로 이동)
7. Default fallback (유지)

```typescript
async resolve(ctx: StrategyContext): Promise<PrimaryAgentResolutionResult> {
    const { prompt, availableAgents, context, recommendedActAgent, isRecommendation } = ctx;

    // 1. Check explicit request in prompt
    const explicit = parseExplicitRequest(prompt, availableAgents);
    if (explicit) {
      this.logger.debug(`Explicit ACT agent request: ${explicit.agentName}`);
      return explicit;
    }

    // 2. Use recommended agent from PLAN mode if provided
    if (recommendedActAgent && availableAgents.includes(recommendedActAgent)) {
      this.logger.debug(
        `Using recommended agent from PLAN: ${recommendedActAgent}`,
      );
      return createResult(
        recommendedActAgent,
        'config',
        1.0,
        `Using recommended agent from PLAN mode: ${recommendedActAgent}`,
      );
    }

    // 3. Check project configuration (skip in recommendation mode)
    if (!isRecommendation) {
      const fromConfig = await this.getFromProjectConfig(availableAgents);
      if (fromConfig) {
        this.logger.debug(`Agent from project config: ${fromConfig.agentName}`);
        return fromConfig;
      }
    }

    // 4. Meta-discussion detection
    if (isMetaAgentDiscussion(prompt)) {
      this.logger.debug(
        'Meta-agent discussion detected, skipping intent patterns',
      );
    } else {
      // 5-11. Check intent patterns in priority order
      for (const { agent, patterns, category } of INTENT_PATTERN_CHECKS) {
        const result = inferFromIntentPatterns(
          prompt,
          availableAgents,
          agent,
          patterns,
          category,
        );
        if (result) {
          this.logger.debug(
            `Intent pattern match: ${result.agentName} (${result.reason})`,
          );
          return result;
        }
      }
    }

    // 12. Check context-based suggestion
    if (context) {
      const fromContext = inferFromContext(
        context.filePath,
        context.projectType,
        availableAgents,
      );
      if (fromContext && fromContext.confidence >= 0.8) {
        this.logger.debug(`Context-based agent: ${fromContext.agentName}`);
        return fromContext;
      }
    }

    // 12.5. In recommendation mode, try project config as late fallback
    if (isRecommendation) {
      const fromConfig = await this.getFromProjectConfig(availableAgents);
      if (fromConfig) {
        this.logger.debug(`Agent from project config (recommendation fallback): ${fromConfig.agentName}`);
        return fromConfig;
      }
    }

    // 13. Default fallback
    return this.getDefaultFallback(availableAgents);
  }
```

**Step 2: 테스트 실행하여 통과 확인**

Run: `yarn workspace codingbuddy test -- --run apps/mcp-server/src/keyword/strategies/act-agent.strategy.spec.ts`
Expected: PASS

**Step 3: 기존 테스트 전체 실행하여 regression 확인**

Run: `yarn workspace codingbuddy test -- --run apps/mcp-server/src/keyword/strategies/`
Expected: ALL PASS

**Step 4: Commit**

```bash
git add apps/mcp-server/src/keyword/strategies/act-agent.strategy.ts
git commit -m "fix: skip project config in recommendation mode for intent-based resolution

When isRecommendation is true, intent pattern analysis takes priority
over project config. Project config becomes a late fallback.

Fixes #360"
```

---

## Task 3: `KeywordService.getActAgentRecommendation()`에서 `isRecommendation` 전달

**Files:**
- Modify: `apps/mcp-server/src/keyword/keyword.service.ts:900-922`
- Modify: `apps/mcp-server/src/keyword/primary-agent-resolver.ts:72-99`

**Step 1: 실패하는 테스트 작성**

`apps/mcp-server/src/keyword/keyword.service.spec.ts`에서 recommendation 동작 테스트:

```typescript
it('should pass isRecommendation flag when getting ACT recommendation in PLAN mode', async () => {
  // 프로젝트 설정에 agent-architect가 있어도 "REST API" 프롬프트에서는
  // backend-developer를 추천해야 함
  // (구체적인 테스트 내용은 기존 테스트 패턴에 맞춰 조정)
});
```

**Step 2: `PrimaryAgentResolver.resolve()`에 `isRecommendation` 파라미터 추가**

```typescript
async resolve(
    mode: Mode,
    prompt: string,
    context?: ResolutionContext,
    recommendedActAgent?: string,
    isRecommendation?: boolean,
  ): Promise<PrimaryAgentResolutionResult> {
    const allAgents = await this.safeListPrimaryAgents();
    const availableAgents = await this.filterExcludedAgents(allAgents);

    const strategyContext: StrategyContext = {
      prompt,
      availableAgents,
      context,
      recommendedActAgent,
      isRecommendation,
    };

    const strategy = this.getStrategy(mode);
    const result = await strategy.resolve(strategyContext);

    this.logger.debug(
      `[${mode}] Resolved agent: ${result.agentName} (source: ${result.source}, confidence: ${result.confidence})`,
    );

    return result;
  }
```

**Step 3: `KeywordService.getActAgentRecommendation()`에서 `isRecommendation: true` 전달**

```typescript
private async getActAgentRecommendation(
    prompt: string,
  ): Promise<ActAgentRecommendation | undefined> {
    if (!this.primaryAgentResolver) {
      return undefined;
    }

    return asyncWithFallback({
      fn: async () => {
        const result = await this.primaryAgentResolver!.resolve(
          'ACT',
          prompt,
          undefined,
          undefined,
          true,  // isRecommendation
        );

        return {
          agentName: result.agentName,
          reason: result.reason,
          confidence: result.confidence,
        };
      },
      fallback: undefined,
      errorMessage: 'Failed to get ACT agent recommendation: ${error}',
      logger: this.logger,
    });
  }
```

**Step 4: 테스트 실행**

Run: `yarn workspace codingbuddy test -- --run apps/mcp-server/src/keyword/keyword.service.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/mcp-server/src/keyword/keyword.service.ts apps/mcp-server/src/keyword/primary-agent-resolver.ts
git commit -m "fix: pass isRecommendation flag through resolver chain

getActAgentRecommendation now passes isRecommendation=true to
PrimaryAgentResolver, which forwards it via StrategyContext.

Fixes #360"
```

---

## Task 4: `frontend-developer`와 `devops-engineer` intent 패턴 추가

**Files:**
- Create: `apps/mcp-server/src/keyword/patterns/frontend.patterns.ts`
- Create: `apps/mcp-server/src/keyword/patterns/devops.patterns.ts`
- Modify: `apps/mcp-server/src/keyword/patterns/intent-pattern-checks.ts`

**Step 1: `frontend.patterns.ts` 작성**

```typescript
/**
 * Frontend Developer Intent Patterns
 *
 * Detect prompts related to UI development, components, and frontend frameworks.
 *
 * Confidence Levels:
 * - 0.95: Frontend frameworks (React, Vue, Angular, Svelte, Next.js)
 * - 0.90: UI patterns (component, CSS, styling, layout)
 * - 0.85: Generic frontend keywords
 */

import type { IntentPattern } from './intent-patterns.types';

export const FRONTEND_INTENT_PATTERNS: ReadonlyArray<IntentPattern> = [
  // Frontend Frameworks (0.95)
  { pattern: /react\s*(컴포넌트|component|개발|앱|app)/i, confidence: 0.95, description: 'React' },
  { pattern: /vue\.?js|vue\s*(컴포넌트|component)/i, confidence: 0.95, description: 'Vue.js' },
  { pattern: /angular\s*(컴포넌트|component|모듈|module)/i, confidence: 0.95, description: 'Angular' },
  { pattern: /svelte|sveltekit/i, confidence: 0.95, description: 'Svelte' },
  { pattern: /next\.?js|nuxt\.?js/i, confidence: 0.95, description: 'Meta Framework' },
  // UI Patterns (0.90)
  { pattern: /UI\s*(컴포넌트|component|개발|develop|구현|implement)/i, confidence: 0.9, description: 'UI Component' },
  { pattern: /CSS\s*(모듈|module|스타일|style)|tailwind|styled.?component/i, confidence: 0.9, description: 'CSS/Styling' },
  { pattern: /레이아웃\s*(설계|구현)|layout\s*(design|implement)/i, confidence: 0.9, description: 'Layout' },
  { pattern: /반응형|responsive\s*(design|UI|web)/i, confidence: 0.9, description: 'Responsive Design' },
  // Generic frontend (0.85)
  { pattern: /프론트엔드\s*(개발|구현)|frontend\s*(develop|implement)/i, confidence: 0.85, description: 'Frontend Development' },
  { pattern: /화면\s*(개발|구현|설계)|페이지\s*(개발|구현|설계)/i, confidence: 0.85, description: 'Page/Screen Development' },
  { pattern: /상태\s*관리|state\s*management/i, confidence: 0.85, description: 'State Management' },
];
```

**Step 2: `devops.patterns.ts` 작성**

```typescript
/**
 * DevOps Engineer Intent Patterns
 *
 * Detect prompts related to CI/CD, deployment, containers, and infrastructure.
 *
 * Confidence Levels:
 * - 0.95: CI/CD tools (GitHub Actions, Jenkins, ArgoCD)
 * - 0.90: Container/deployment (Docker, K8s deployment, pipeline)
 * - 0.85: Generic devops keywords
 */

import type { IntentPattern } from './intent-patterns.types';

export const DEVOPS_INTENT_PATTERNS: ReadonlyArray<IntentPattern> = [
  // CI/CD Tools (0.95)
  { pattern: /github\s*actions|jenkins|circleci|gitlab\s*ci/i, confidence: 0.95, description: 'CI/CD Tool' },
  { pattern: /argocd|argo\s*cd|flux\s*cd/i, confidence: 0.95, description: 'GitOps Tool' },
  // Container/Deployment (0.90)
  { pattern: /docker\s*(compose|file|image|빌드|build)/i, confidence: 0.9, description: 'Docker' },
  { pattern: /CI\s*\/?\s*CD\s*(파이프라인|pipeline|설정|설계|구축)/i, confidence: 0.9, description: 'CI/CD Pipeline' },
  { pattern: /배포\s*(파이프라인|전략|자동화)|deploy\s*(pipeline|strateg|automat)/i, confidence: 0.9, description: 'Deployment' },
  { pattern: /모니터링\s*(설정|구축|시스템)|monitoring\s*(setup|system)/i, confidence: 0.9, description: 'Monitoring' },
  // Generic devops (0.85)
  { pattern: /데브옵스|devops/i, confidence: 0.85, description: 'DevOps' },
  { pattern: /인프라\s*(자동화|코드)|infrastructure\s*as\s*code/i, confidence: 0.85, description: 'IaC' },
  { pattern: /로그\s*(수집|분석|관리)|log\s*(collect|aggregat|manag)/i, confidence: 0.85, description: 'Log Management' },
];
```

**Step 3: `intent-pattern-checks.ts`에 새 패턴 등록**

```typescript
import { FRONTEND_INTENT_PATTERNS } from './frontend.patterns';
import { DEVOPS_INTENT_PATTERNS } from './devops.patterns';

// 배열에 추가 (mobile 바로 앞에):
  {
    agent: 'frontend-developer',
    patterns: FRONTEND_INTENT_PATTERNS,
    category: 'Frontend',
  },
  {
    agent: 'devops-engineer',
    patterns: DEVOPS_INTENT_PATTERNS,
    category: 'DevOps',
  },
```

**Step 4: 테스트 실행**

Run: `yarn workspace codingbuddy test -- --run apps/mcp-server/src/keyword/strategies/act-agent.strategy.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/mcp-server/src/keyword/patterns/frontend.patterns.ts apps/mcp-server/src/keyword/patterns/devops.patterns.ts apps/mcp-server/src/keyword/patterns/intent-pattern-checks.ts
git commit -m "feat: add intent patterns for frontend-developer and devops-engineer

Previously these agents were unreachable via intent analysis.

Fixes #360"
```

---

## Task 5: 통합 테스트 및 E2E 검증

**Files:**
- Modify: `apps/mcp-server/src/keyword/strategies/act-agent.strategy.spec.ts`
- Modify: `apps/mcp-server/src/keyword/primary-agent-resolver.spec.ts`

**Step 1: 이슈에 명시된 시나리오별 통합 테스트 추가**

```typescript
describe('PLAN mode recommendation scenarios (issue #360)', () => {
  it('"PLAN design API" should recommend backend-developer, not project config', async () => {
    const configStrategy = new ActAgentStrategy(
      vi.fn().mockResolvedValue({ primaryAgent: 'agent-architect' }),
    );
    const result = await configStrategy.resolve(
      createActContext({
        prompt: 'PLAN design API',
        isRecommendation: true,
      }),
    );
    expect(result.agentName).not.toBe('agent-architect');
  });

  it('"PLAN build UI" should recommend frontend-developer', async () => {
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

  it('"PLAN setup CI/CD" should recommend devops-engineer', async () => {
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
```

**Step 2: 전체 테스트 실행**

Run: `yarn workspace codingbuddy test`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add apps/mcp-server/src/keyword/strategies/act-agent.strategy.spec.ts apps/mcp-server/src/keyword/primary-agent-resolver.spec.ts
git commit -m "test: add integration tests for PLAN mode intent recommendation

Verifies issue #360 scenarios are all resolved."
```

---

## Summary

| Task | 파일 | 변경 내용 |
|------|------|----------|
| 1 | `resolution-strategy.interface.ts` | `isRecommendation` 플래그 추가 |
| 2 | `act-agent.strategy.ts` | recommendation 모드에서 project config skip |
| 3 | `keyword.service.ts`, `primary-agent-resolver.ts` | `isRecommendation: true` 전달 |
| 4 | `frontend.patterns.ts`, `devops.patterns.ts`, `intent-pattern-checks.ts` | 누락 패턴 추가 |
| 5 | `*.spec.ts` | 통합 테스트 추가 |

**영향 범위:** ACT 모드 직접 사용 시 기존 동작 유지 (isRecommendation 기본값 undefined/falsy). PLAN 모드의 추천만 변경.
