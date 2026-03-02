# Multi-Provider Model Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 멀티 프로바이더 모델 지원을 추가하여 모든 주요 AI 프로바이더(Anthropic, OpenAI, Google, xAI, DeepSeek, Mistral, Meta 등)의 모델을 인식하고, 프로바이더 수준 prefix로 미래 모델 출시에도 자동 호환되는 시스템을 구축한다.

**Architecture:** KNOWN_MODEL_PREFIXES를 모델-패밀리 수준에서 프로바이더 수준으로 전환하여 미래 호환성 확보. 상수는 최신 모델로 업데이트하고 CLI 선택지도 2026년 현실을 반영. EVAL 피드백(H1, M1, M2) 동시 수정.

**Tech Stack:** TypeScript, Vitest, @inquirer/prompts (select + input)

**Issue:** https://github.com/JeremyDev87/codingbuddy/issues/622

---

## Task 1~4: 이전 iteration (완료)

Task 1~4는 첫 번째 ACT에서 이미 구현 완료:
- Task 1: model.constants.ts 상수 추가 ✅
- Task 2: model.resolver.ts prefix 확장 ✅
- Task 3: model-prompt.ts CLI 선택지 ✅
- Task 4: 통합 검증 ✅

---

## Task 5: EVAL 수정 + KNOWN_MODEL_PREFIXES 프로바이더 수준 전환

**Files:**
- Modify: `apps/mcp-server/src/model/model.resolver.ts:14-31, 75`
- Modify: `apps/mcp-server/src/model/model.resolver.spec.ts`

### Step 1: 실패 테스트 작성

`model.resolver.spec.ts`에 새 프로바이더 인식 테스트 추가 및 기존 테스트 수정:

```typescript
// 기존 OpenAI/Google 테스트 유지 + 아래 추가

it('should return true for xAI Grok models', () => {
  expect(isKnownModel('grok-3')).toBe(true);
  expect(isKnownModel('grok-4.1')).toBe(true);
});

it('should return true for DeepSeek models', () => {
  expect(isKnownModel('deepseek-chat')).toBe(true);
  expect(isKnownModel('deepseek-reasoner')).toBe(true);
  expect(isKnownModel('deepseek-v3')).toBe(true);
});

it('should return true for Mistral models', () => {
  expect(isKnownModel('mistral-large-latest')).toBe(true);
  expect(isKnownModel('codestral-latest')).toBe(true);
});

it('should return true for Meta Llama models', () => {
  expect(isKnownModel('llama-3.3-70b')).toBe(true);
});

it('should return true for Cohere models', () => {
  expect(isKnownModel('command-r-plus')).toBe(true);
});

it('should return true for Alibaba Qwen models', () => {
  expect(isKnownModel('qwen-2.5-coder')).toBe(true);
});

it('should return true for Microsoft Phi models', () => {
  expect(isKnownModel('phi-4')).toBe(true);
});

// 미래 호환성 테스트
it('should recognize future model versions automatically (provider-level prefix)', () => {
  expect(isKnownModel('claude-sonnet-5-20260101')).toBe(true);
  expect(isKnownModel('gpt-6-turbo')).toBe(true);
  expect(isKnownModel('gemini-4.0-ultra')).toBe(true);
  expect(isKnownModel('grok-5')).toBe(true);
  expect(isKnownModel('deepseek-v5')).toBe(true);
});
```

prefix 개수 테스트 업데이트:
```typescript
it('should have at least 14 known prefixes (multi-provider)', () => {
  expect(KNOWN_MODEL_PREFIXES.length).toBeGreaterThanOrEqual(14);
});
```

resolveModel 멀티 프로바이더 테스트 추가:
```typescript
it('should resolve Grok model without warning', () => {
  const result = resolveModel({ globalDefaultModel: 'grok-3' });
  expect(result.model).toBe('grok-3');
  expect(result.source).toBe('global');
  expect(result.warning).toBeUndefined();
});

it('should resolve DeepSeek model without warning', () => {
  const result = resolveModel({ globalDefaultModel: 'deepseek-chat' });
  expect(result.model).toBe('deepseek-chat');
  expect(result.source).toBe('global');
  expect(result.warning).toBeUndefined();
});
```

EVAL M2 수정 — `getAllPrefixes` 테스트의 stale additional prefix:
```typescript
// BEFORE (stale — gpt-4가 이미 known)
const additional = ['gpt-4', 'gemini'];

// AFTER
const additional = ['llama-3', 'mistral'];
```

### Step 2: 테스트 실행하여 실패 확인

Run: `cd apps/mcp-server && npx vitest run src/model/model.resolver.spec.ts`
Expected: FAIL — Grok, DeepSeek, Mistral 등 미인식

### Step 3: 구현 — KNOWN_MODEL_PREFIXES 프로바이더 수준으로 전환

`model.resolver.ts` 수정:

```typescript
/**
 * Known model ID patterns for validation (multi-provider)
 *
 * Uses provider-level prefixes for automatic future model compatibility.
 * When a new model version is released (e.g., gpt-6, gemini-4),
 * it is automatically recognized without code changes.
 */
export const KNOWN_MODEL_PREFIXES = [
  // Anthropic
  'claude-',
  // OpenAI
  'gpt-',
  'o1', 'o3', 'o4',
  'chatgpt-',
  // Google
  'gemini-',
  // xAI
  'grok-',
  // DeepSeek
  'deepseek-',
  // Mistral
  'mistral-',
  'codestral-',
  // Meta
  'llama-',
  // Cohere
  'command-',
  // Alibaba
  'qwen-',
  // Microsoft
  'phi-',
] as const;
```

EVAL H1 수정 — `isKnownModel` JSDoc 업데이트:
```typescript
/**
 * Check if a model ID matches known model patterns (multi-provider)
 * @param modelId - Model ID to check
 * @param additionalPrefixes - Optional additional prefixes to recognize
 */
```

### Step 4: 테스트 실행하여 통과 확인

Run: `cd apps/mcp-server && npx vitest run src/model/model.resolver.spec.ts`
Expected: PASS

### Step 5: 커밋

```bash
git add apps/mcp-server/src/model/model.resolver.ts apps/mcp-server/src/model/model.resolver.spec.ts
git commit -m "feat(model): broaden KNOWN_MODEL_PREFIXES to provider-level for future compatibility (#622)"
```

---

## Task 6: model.constants.ts 최신 모델 추가 + 프로바이더 확장

**Files:**
- Modify: `apps/mcp-server/src/model/model.constants.ts`
- Modify: `apps/mcp-server/src/model/model.constants.spec.ts`

### Step 1: 실패 테스트 작성

```typescript
import {
  // 기존 imports...
  O4_MINI, GPT_5,
  GROK_3, DEEPSEEK_CHAT, DEEPSEEK_REASONER,
} from './model.constants';

describe('OpenAI model IDs', () => {
  // 기존 테스트 유지 + 아래 추가
  it('should have valid o4-mini model ID', () => {
    expect(O4_MINI).toBe('o4-mini');
  });

  it('should have valid GPT-5 model ID', () => {
    expect(GPT_5).toBe('gpt-5');
  });
});

describe('xAI model IDs', () => {
  it('should have valid Grok 3 model ID', () => {
    expect(GROK_3).toBe('grok-3');
  });
});

describe('DeepSeek model IDs', () => {
  it('should have valid DeepSeek Chat model ID', () => {
    expect(DEEPSEEK_CHAT).toBe('deepseek-chat');
  });

  it('should have valid DeepSeek Reasoner model ID', () => {
    expect(DEEPSEEK_REASONER).toBe('deepseek-reasoner');
  });
});

describe('consistency', () => {
  it('should have unique model IDs across all providers', () => {
    const models = [
      CLAUDE_OPUS_4, CLAUDE_SONNET_4, CLAUDE_HAIKU_35,
      GPT_4O, GPT_4O_MINI, O3_MINI, O1_MINI, O4_MINI, GPT_5,
      GEMINI_25_PRO, GEMINI_25_FLASH,
      GROK_3, DEEPSEEK_CHAT, DEEPSEEK_REASONER,
    ];
    const uniqueModels = new Set(models);
    expect(uniqueModels.size).toBe(models.length);
  });

  it('should have xAI models starting with grok-', () => {
    expect(GROK_3).toMatch(/^grok-/);
  });

  it('should have DeepSeek models starting with deepseek-', () => {
    expect(DEEPSEEK_CHAT).toMatch(/^deepseek-/);
    expect(DEEPSEEK_REASONER).toMatch(/^deepseek-/);
  });
});
```

### Step 2: 테스트 실행하여 실패 확인

Run: `cd apps/mcp-server && npx vitest run src/model/model.constants.spec.ts`
Expected: FAIL

### Step 3: 구현 — 상수 추가

`model.constants.ts`에 추가:

```typescript
// 기존 상수 유지 (GPT_4O, GPT_4O_MINI, O3_MINI, O1_MINI, GEMINI_25_PRO, GEMINI_25_FLASH)

/** OpenAI o4-mini reasoning model */
export const O4_MINI = 'o4-mini';

/** OpenAI GPT-5 model */
export const GPT_5 = 'gpt-5';

/** xAI Grok 3 model */
export const GROK_3 = 'grok-3';

/** DeepSeek Chat model */
export const DEEPSEEK_CHAT = 'deepseek-chat';

/** DeepSeek Reasoner model */
export const DEEPSEEK_REASONER = 'deepseek-reasoner';
```

### Step 4: 테스트 통과 확인

Run: `cd apps/mcp-server && npx vitest run src/model/model.constants.spec.ts`
Expected: PASS

### Step 5: 커밋

```bash
git add apps/mcp-server/src/model/model.constants.ts apps/mcp-server/src/model/model.constants.spec.ts
git commit -m "feat(model): add latest 2026 model constants (GPT-5, o4-mini, Grok, DeepSeek) (#622)"
```

---

## Task 7: model-prompt.ts CLI 선택지 업데이트

**Files:**
- Modify: `apps/mcp-server/src/cli/init/prompts/model-prompt.ts`
- Modify: `apps/mcp-server/src/cli/init/prompts/model-prompt.spec.ts`

### Step 1: 실패 테스트 작성

```typescript
it('should return at least 10 choices (multi-provider + custom)', () => {
  const choices = getModelChoices();
  expect(choices.length).toBeGreaterThanOrEqual(10);
});

it('should include at least one xAI model (grok- prefix)', () => {
  const choices = getModelChoices();
  const hasGrok = choices.some((c: ModelChoice) => c.value.startsWith('grok-'));
  expect(hasGrok).toBe(true);
});

it('should include at least one DeepSeek model (deepseek- prefix)', () => {
  const choices = getModelChoices();
  const hasDeepSeek = choices.some((c: ModelChoice) => c.value.startsWith('deepseek-'));
  expect(hasDeepSeek).toBe(true);
});
```

EVAL M1 수정 — 중복 테스트 정리:
- `'should return array of model choices'`의 count assertion (`>= 8`) 제거, array/type 검증만 유지
- `'should return at least 8 choices'` 테스트를 `>= 10`으로 업데이트하여 단일 count 테스트로 통합

### Step 2: 테스트 실행하여 실패 확인

Run: `cd apps/mcp-server && npx vitest run src/cli/init/prompts/model-prompt.spec.ts`
Expected: FAIL

### Step 3: 구현 — CLI 선택지 업데이트

```typescript
import {
  CLAUDE_OPUS_4, CLAUDE_SONNET_4, DEFAULT_MODEL,
  GPT_4O, GPT_5, O4_MINI,
  GEMINI_25_PRO, GEMINI_25_FLASH,
  GROK_3, DEEPSEEK_CHAT,
} from '../../../model';

export function getModelChoices(): ModelChoice[] {
  return [
    // Anthropic (default)
    {
      name: 'Claude Sonnet 4 (Recommended)',
      value: CLAUDE_SONNET_4,
      description: 'Balanced performance and cost · Anthropic',
    },
    {
      name: 'Claude Opus 4',
      value: CLAUDE_OPUS_4,
      description: 'Most capable · Anthropic',
    },
    // OpenAI
    {
      name: 'GPT-5',
      value: GPT_5,
      description: 'Latest flagship model · OpenAI',
    },
    {
      name: 'GPT-4o',
      value: GPT_4O,
      description: 'Multimodal model · OpenAI',
    },
    {
      name: 'o4-mini',
      value: O4_MINI,
      description: 'Fast reasoning model · OpenAI',
    },
    // Google
    {
      name: 'Gemini 2.5 Pro',
      value: GEMINI_25_PRO,
      description: 'Advanced reasoning · Google',
    },
    {
      name: 'Gemini 2.5 Flash',
      value: GEMINI_25_FLASH,
      description: 'Fast and efficient · Google',
    },
    // xAI
    {
      name: 'Grok 3',
      value: GROK_3,
      description: 'Multimodal reasoning · xAI',
    },
    // DeepSeek
    {
      name: 'DeepSeek Chat',
      value: DEEPSEEK_CHAT,
      description: 'Cost-efficient coding model · DeepSeek',
    },
    // Escape hatch
    {
      name: 'Other (enter manually)',
      value: '__custom__',
      description: 'Any model ID not listed above',
    },
  ];
}
```

### Step 4: 테스트 통과 확인

Run: `cd apps/mcp-server && npx vitest run src/cli/init/prompts/model-prompt.spec.ts`
Expected: PASS

### Step 5: 커밋

```bash
git add apps/mcp-server/src/cli/init/prompts/model-prompt.ts apps/mcp-server/src/cli/init/prompts/model-prompt.spec.ts
git commit -m "feat(model): update CLI choices with latest 2026 models and more providers (#622)"
```

---

## Task 8: 통합 검증

### Step 1: 전체 모델 모듈 테스트

Run: `cd apps/mcp-server && npx vitest run src/model/ src/cli/init/prompts/model-prompt.spec.ts`
Expected: ALL PASS

### Step 2: 전체 프로젝트 테스트

Run: `cd apps/mcp-server && npx vitest run`
Expected: ALL PASS

### Step 3: TypeScript 컴파일

Run: `npx tsc --noEmit`
Expected: 에러 없음

---

## 미래 호환성 매트릭스

| 시나리오 | 프로바이더 수준 prefix | 동작 |
|----------|----------------------|------|
| OpenAI `gpt-6` 출시 | `'gpt-'` | 자동 인식, 코드 변경 불필요 |
| Anthropic `claude-sonnet-5` 출시 | `'claude-'` | 자동 인식, 코드 변경 불필요 |
| Google `gemini-4.0` 출시 | `'gemini-'` | 자동 인식, 코드 변경 불필요 |
| xAI `grok-5` 출시 | `'grok-'` | 자동 인식, 코드 변경 불필요 |
| DeepSeek V5 출시 | `'deepseek-'` | 자동 인식, 코드 변경 불필요 |
| 완전히 새로운 프로바이더 | — | `__custom__`로 입력, 또는 prefix 추가 |

## EVAL 수정 포함 사항

| ID | 심각도 | 수정 위치 |
|----|--------|----------|
| H1 | High | Task 5 — `isKnownModel` JSDoc |
| M1 | Medium | Task 7 — 중복 테스트 정리 |
| M2 | Medium | Task 5 — `getAllPrefixes` stale test data |
