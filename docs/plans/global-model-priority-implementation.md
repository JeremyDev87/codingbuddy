# Implementation Guide: Global Model Priority System

> **Self-Contained Document** - 이 문서는 context 없이도 독립적으로 실행 가능합니다.

## 1. Overview

### 1.1 목표
Agent JSON 파일에 하드코딩된 모델 설정을 무시하고, `codingbuddy.config.js`의 `ai.defaultModel` 설정만 사용하도록 변경합니다.

### 1.2 요구사항
| 항목 | 선택 |
|------|------|
| 설정 방식 | Global 우선 적용 (Agent 하드코딩 무시) |
| 범위 | Agent만 (Skill 제외) |
| 호환성 | 새 방식 강제 (하드코딩 모델 제거) |

### 1.3 Breaking Change
- 이 변경은 **v4.0.0**으로 릴리스해야 합니다
- `ModelSource` 타입에서 `'agent'`, `'mode'` 제거
- `resolveForMode()`, `resolveForAgent()` 메서드 → `resolve()` 단일 메서드로 통합

---

## 2. 변경 전/후 비교

### 2.1 모델 해상도 우선순위

**변경 전 (v3.x)**:
```
1. Agent (highest) → frontend-developer.json의 model.preferred
2. Mode → plan-mode.json의 model.preferred
3. Global Config → codingbuddy.config.js의 ai.defaultModel
4. System Default (lowest) → CLAUDE_SONNET_4 상수
```

**변경 후 (v4.0.0)**:
```
1. Global Config (highest) → codingbuddy.config.js의 ai.defaultModel
2. System Default (lowest) → CLAUDE_SONNET_4 상수
```

---

## 3. 파일별 변경 사항

### 3.1 `apps/mcp-server/src/model/model.types.ts`

**파일 경로**: `apps/mcp-server/src/model/model.types.ts`

**변경 1**: ModelSource 타입 단순화 (Line 36)

```typescript
// BEFORE (Line 36)
export type ModelSource = 'agent' | 'mode' | 'global' | 'system';

// AFTER
export type ModelSource = 'global' | 'system';
```

**변경 2**: ResolveModelParams 인터페이스 단순화 (Line 53-62)

```typescript
// BEFORE (Line 53-62)
export interface ResolveModelParams {
  /** Agent profile model config (e.g., frontend-developer.json) */
  agentModel?: ModelConfig;
  /** Mode agent model config (e.g., plan-mode.json) */
  modeModel?: ModelConfig;
  /** Global config default model from codingbuddy.config.js */
  globalDefaultModel?: string;
  /** Additional model prefixes to recognize as valid (from config) */
  additionalPrefixes?: readonly string[];
}

// AFTER
export interface ResolveModelParams {
  /** Global config default model from codingbuddy.config.js */
  globalDefaultModel?: string;
  /** Additional model prefixes to recognize as valid (from config) */
  additionalPrefixes?: readonly string[];
}
```

---

### 3.2 `apps/mcp-server/src/model/model.resolver.ts`

**파일 경로**: `apps/mcp-server/src/model/model.resolver.ts`

**변경 1**: hasValidPreferred 함수 제거 (Line 85-89)

```typescript
// DELETE (Line 85-89)
function hasValidPreferred(
  model?: ModelConfig,
): model is ModelConfig & { preferred: string } {
  return Boolean(model?.preferred);
}
```

**변경 2**: resolveModel 함수 단순화 (Line 101-139)

```typescript
// BEFORE (Line 101-139)
export function resolveModel(params: ResolveModelParams): ResolvedModel {
  const { agentModel, modeModel, globalDefaultModel, additionalPrefixes } =
    params;

  let model: string;
  let source: ResolvedModel['source'];

  // 1. Agent model (highest priority)
  if (hasValidPreferred(agentModel)) {
    model = agentModel.preferred;
    source = 'agent';
  }
  // 2. Mode model
  else if (hasValidPreferred(modeModel)) {
    model = modeModel.preferred;
    source = 'mode';
  }
  // 3. Global config
  else if (globalDefaultModel) {
    model = globalDefaultModel;
    source = 'global';
  }
  // 4. System default
  else {
    return { model: SYSTEM_DEFAULT_MODEL, source: 'system' };
  }

  // Add warning if model is not recognized (but still use it)
  const result: ResolvedModel = { model, source };
  if (!isKnownModel(model, additionalPrefixes)) {
    result.warning = formatUnknownModelWarning(model, additionalPrefixes);
  }
  // Add deprecation warning for Haiku models (even though they're recognized)
  else if (isHaikuModel(model)) {
    result.warning = HAIKU_DEPRECATION_WARNING;
  }

  return result;
}

// AFTER
export function resolveModel(params: ResolveModelParams): ResolvedModel {
  const { globalDefaultModel, additionalPrefixes } = params;

  // 1. Global config (highest priority)
  if (globalDefaultModel) {
    const result: ResolvedModel = { model: globalDefaultModel, source: 'global' };

    // Add warning if model is not recognized (but still use it)
    if (!isKnownModel(globalDefaultModel, additionalPrefixes)) {
      result.warning = formatUnknownModelWarning(globalDefaultModel, additionalPrefixes);
    }
    // Add deprecation warning for Haiku models (even though they're recognized)
    else if (isHaikuModel(globalDefaultModel)) {
      result.warning = HAIKU_DEPRECATION_WARNING;
    }

    return result;
  }

  // 2. System default
  return { model: SYSTEM_DEFAULT_MODEL, source: 'system' };
}
```

---

### 3.3 `apps/mcp-server/src/model/model-resolver.service.ts`

**파일 경로**: `apps/mcp-server/src/model/model-resolver.service.ts`

**전체 파일 대체**:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { resolveModel } from './model.resolver';
import type { ResolvedModel } from './model.types';

/**
 * Service for resolving AI models based on global configuration.
 * Uses 2-level priority: global config > system default.
 *
 * @since v4.0.0 - Agent/Mode model configs are no longer supported.
 *                 Use codingbuddy.config.js ai.defaultModel instead.
 */
@Injectable()
export class ModelResolverService {
  private readonly logger = new Logger(ModelResolverService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Resolve AI model from global configuration.
   * Uses 2-level priority: global config > system default.
   *
   * @returns Resolved model with source information
   */
  async resolve(): Promise<ResolvedModel> {
    const globalDefaultModel = await this.loadGlobalDefaultModel();
    return resolveModel({ globalDefaultModel });
  }

  /**
   * Load global default model from project configuration.
   */
  private async loadGlobalDefaultModel(): Promise<string | undefined> {
    try {
      const globalConfig = await this.configService.getSettings();
      return globalConfig?.ai?.defaultModel;
    } catch (error) {
      this.logger.warn(
        `Failed to load global config for model resolution: ${error instanceof Error ? error.message : 'Unknown error'}. Using system default.`,
      );
      return undefined;
    }
  }
}
```

**제거 항목**:
- `RulesService` import 및 constructor 의존성
- `resolveForMode()` 메서드
- `resolveForAgent()` 메서드
- `loadModeModel()` private 메서드
- `isModelConfig` import

---

### 3.4 `apps/mcp-server/src/mcp/handlers/mode.handler.ts`

**파일 경로**: `apps/mcp-server/src/mcp/handlers/mode.handler.ts`

**변경**: Line 159-161

```typescript
// BEFORE (Line 159-161)
const resolvedModel = await this.modelResolverService.resolveForMode(
  result.agent,
);

// AFTER
const resolvedModel = await this.modelResolverService.resolve();
```

---

### 3.5 Agent JSON 파일들 (29개)

**위치**: `packages/rules/.ai-rules/agents/*.json`

**파일 목록**:
```
accessibility-specialist.json
act-mode.json
agent-architect.json
ai-ml-engineer.json
architecture-specialist.json
backend-developer.json
code-quality-specialist.json
code-reviewer.json
data-engineer.json
devops-engineer.json
design-system-specialist.json
documentation-specialist.json
eval-mode.json
event-architecture-specialist.json
frontend-developer.json
fullstack-developer.json
integration-specialist.json
llm-engineer.json
migration-specialist.json
mobile-developer.json
observability-specialist.json
performance-specialist.json
plan-mode.json
security-specialist.json
seo-specialist.json
site-reliability-engineer.json
test-strategy-specialist.json
ux-engineer.json
auto-mode.json
```

**변경 내용**: 각 파일에서 `model` 필드 제거

```json
// BEFORE
{
  "name": "Frontend Developer",
  "description": "...",
  "model": {
    "preferred": "claude-sonnet-4-20250514",
    "reason": "Suitable model for frontend development tasks"
  },
  "role": { ... }
}

// AFTER
{
  "name": "Frontend Developer",
  "description": "...",
  "role": { ... }
}
```

**자동화 스크립트** (프로젝트 루트에서 실행):

```bash
#!/bin/bash
# remove-model-fields.sh

AGENTS_DIR="packages/rules/.ai-rules/agents"

for file in "$AGENTS_DIR"/*.json; do
  if [ -f "$file" ]; then
    # jq를 사용하여 model 필드 제거
    jq 'del(.model)' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
    echo "Processed: $file"
  fi
done

echo "Done! Removed 'model' field from all agent JSON files."
```

---

## 4. 테스트 파일 변경

### 4.1 `apps/mcp-server/src/model/model.resolver.spec.ts`

**파일 경로**: `apps/mcp-server/src/model/model.resolver.spec.ts`

**전체 파일 대체**:

```typescript
import { describe, it, expect } from 'vitest';
import {
  resolveModel,
  SYSTEM_DEFAULT_MODEL,
  isKnownModel,
  KNOWN_MODEL_PREFIXES,
  getAllPrefixes,
  formatUnknownModelWarning,
} from './model.resolver';

describe('formatUnknownModelWarning', () => {
  it('should format warning message with model and default prefixes', () => {
    const result = formatUnknownModelWarning('unknown-model');

    expect(result).toContain('Unknown model ID');
    expect(result).toContain('unknown-model');
    expect(result).toContain('claude-opus-4');
    expect(result).toContain('Known prefixes');
  });

  it('should include additional prefixes in warning', () => {
    const result = formatUnknownModelWarning('unknown-model', [
      'gpt-4',
      'gemini',
    ]);

    expect(result).toContain('gpt-4');
    expect(result).toContain('gemini');
  });
});

describe('getAllPrefixes', () => {
  it('should return KNOWN_MODEL_PREFIXES when no additional provided', () => {
    expect(getAllPrefixes()).toEqual(KNOWN_MODEL_PREFIXES);
  });

  it('should return KNOWN_MODEL_PREFIXES when undefined provided', () => {
    expect(getAllPrefixes(undefined)).toEqual(KNOWN_MODEL_PREFIXES);
  });

  it('should merge additional prefixes with known prefixes', () => {
    const additional = ['gpt-4', 'gemini'];
    const result = getAllPrefixes(additional);

    expect(result).toContain('claude-opus-4');
    expect(result).toContain('gpt-4');
    expect(result).toContain('gemini');
    expect(result.length).toBe(KNOWN_MODEL_PREFIXES.length + 2);
  });

  it('should handle empty additional prefixes array', () => {
    expect(getAllPrefixes([])).toEqual(KNOWN_MODEL_PREFIXES);
  });
});

describe('isKnownModel', () => {
  it('should return true for known Claude models', () => {
    expect(isKnownModel('claude-opus-4-20250514')).toBe(true);
    expect(isKnownModel('claude-sonnet-4-20250514')).toBe(true);
    expect(isKnownModel('claude-sonnet-3-5-20240620')).toBe(true);
    expect(isKnownModel('claude-haiku-3-5-20241022')).toBe(true);
  });

  it('should return false for unknown models', () => {
    expect(isKnownModel('gpt-4')).toBe(false);
    expect(isKnownModel('unknown-model')).toBe(false);
    expect(isKnownModel('claude-unknown')).toBe(false);
  });

  it('should have at least 4 known prefixes', () => {
    expect(KNOWN_MODEL_PREFIXES.length).toBeGreaterThanOrEqual(4);
  });

  it('should return false for empty string', () => {
    expect(isKnownModel('')).toBe(false);
  });

  describe('additionalPrefixes', () => {
    it('should recognize models with additional prefixes', () => {
      expect(isKnownModel('gpt-4-turbo', ['gpt-4'])).toBe(true);
      expect(isKnownModel('gemini-pro', ['gemini'])).toBe(true);
    });

    it('should still recognize default prefixes when additional prefixes provided', () => {
      expect(isKnownModel('claude-opus-4-20250514', ['gpt-4'])).toBe(true);
    });

    it('should handle empty additional prefixes array', () => {
      expect(isKnownModel('claude-opus-4-20250514', [])).toBe(true);
      expect(isKnownModel('gpt-4', [])).toBe(false);
    });
  });
});

describe('resolveModel', () => {
  describe('priority order', () => {
    it('should return global model when provided', () => {
      const result = resolveModel({
        globalDefaultModel: 'claude-opus-4-20250514',
      });

      expect(result.model).toBe('claude-opus-4-20250514');
      expect(result.source).toBe('global');
    });

    it('should return system default when nothing is provided', () => {
      const result = resolveModel({});

      expect(result.model).toBe(SYSTEM_DEFAULT_MODEL);
      expect(result.source).toBe('system');
    });

    it('should return system default when global is empty string', () => {
      const result = resolveModel({
        globalDefaultModel: '',
      });

      expect(result.model).toBe(SYSTEM_DEFAULT_MODEL);
      expect(result.source).toBe('system');
    });
  });

  describe('SYSTEM_DEFAULT_MODEL', () => {
    it('should be claude-sonnet-4-20250514', () => {
      expect(SYSTEM_DEFAULT_MODEL).toBe('claude-sonnet-4-20250514');
    });
  });

  describe('model validation warning', () => {
    it('should not include warning for known models', () => {
      const result = resolveModel({
        globalDefaultModel: 'claude-sonnet-4-20250514',
      });

      expect(result.model).toBe('claude-sonnet-4-20250514');
      expect(result.warning).toBeUndefined();
    });

    it('should include warning for unknown models', () => {
      const result = resolveModel({
        globalDefaultModel: 'unknown-model',
      });

      expect(result.model).toBe('unknown-model');
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('Unknown model ID');
      expect(result.warning).toContain('unknown-model');
    });

    it('should not include warning for system default', () => {
      const result = resolveModel({});

      expect(result.model).toBe(SYSTEM_DEFAULT_MODEL);
      expect(result.warning).toBeUndefined();
    });

    it('should not include warning when model matches additionalPrefixes', () => {
      const result = resolveModel({
        globalDefaultModel: 'gpt-4-turbo',
        additionalPrefixes: ['gpt-4'],
      });

      expect(result.model).toBe('gpt-4-turbo');
      expect(result.source).toBe('global');
      expect(result.warning).toBeUndefined();
    });

    it('should include additionalPrefixes in warning message', () => {
      const result = resolveModel({
        globalDefaultModel: 'unknown-model',
        additionalPrefixes: ['gpt-4', 'gemini'],
      });

      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('gpt-4');
      expect(result.warning).toContain('gemini');
    });
  });

  describe('haiku deprecation warning', () => {
    it('should include deprecation warning for haiku models', () => {
      const result = resolveModel({
        globalDefaultModel: 'claude-haiku-3-5-20241022',
      });

      expect(result.model).toBe('claude-haiku-3-5-20241022');
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('not recommended');
    });

    it('should include deprecation warning for any haiku variant', () => {
      const result = resolveModel({
        globalDefaultModel: 'claude-haiku-3-20250101',
      });

      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('not recommended');
    });

    it('should not include deprecation warning for opus models', () => {
      const result = resolveModel({
        globalDefaultModel: 'claude-opus-4-20250514',
      });

      expect(result.warning).toBeUndefined();
    });

    it('should not include deprecation warning for sonnet models', () => {
      const result = resolveModel({
        globalDefaultModel: 'claude-sonnet-4-20250514',
      });

      expect(result.warning).toBeUndefined();
    });
  });
});
```

---

### 4.2 `apps/mcp-server/src/model/model-resolver.service.spec.ts`

**파일 경로**: `apps/mcp-server/src/model/model-resolver.service.spec.ts`

**전체 파일 대체**:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModelResolverService } from './model-resolver.service';
import { ConfigService } from '../config/config.service';

describe('ModelResolverService', () => {
  let service: ModelResolverService;
  let mockConfigService: ConfigService;

  beforeEach(() => {
    mockConfigService = {
      getSettings: vi.fn().mockResolvedValue({
        ai: { defaultModel: 'claude-opus-4-20250514' },
      }),
    } as unknown as ConfigService;

    service = new ModelResolverService(mockConfigService);
  });

  describe('resolve', () => {
    it('should return global default when available', async () => {
      const result = await service.resolve();

      expect(result.model).toBe('claude-opus-4-20250514');
      expect(result.source).toBe('global');
    });

    it('should return system default when no global config', async () => {
      mockConfigService.getSettings = vi.fn().mockResolvedValue(null);

      const result = await service.resolve();

      expect(result.source).toBe('system');
    });

    it('should return system default when ai config is undefined', async () => {
      mockConfigService.getSettings = vi.fn().mockResolvedValue({});

      const result = await service.resolve();

      expect(result.source).toBe('system');
    });

    it('should return system default when defaultModel is undefined', async () => {
      mockConfigService.getSettings = vi.fn().mockResolvedValue({
        ai: {},
      });

      const result = await service.resolve();

      expect(result.source).toBe('system');
    });

    it('should handle config service failure gracefully', async () => {
      mockConfigService.getSettings = vi
        .fn()
        .mockRejectedValue(new Error('Config error'));

      const result = await service.resolve();

      expect(result.source).toBe('system');
    });

    it('should include warning for unknown model', async () => {
      mockConfigService.getSettings = vi.fn().mockResolvedValue({
        ai: { defaultModel: 'unknown-model-id' },
      });

      const result = await service.resolve();

      expect(result.model).toBe('unknown-model-id');
      expect(result.warning).toContain('Unknown model ID');
    });

    it('should include deprecation warning for haiku models', async () => {
      mockConfigService.getSettings = vi.fn().mockResolvedValue({
        ai: { defaultModel: 'claude-haiku-3-5-20241022' },
      });

      const result = await service.resolve();

      expect(result.model).toBe('claude-haiku-3-5-20241022');
      expect(result.warning).toContain('not recommended');
    });
  });
});
```

---

### 4.3 `apps/mcp-server/src/mcp/mcp.service.spec.ts` Mock 업데이트

**파일 경로**: `apps/mcp-server/src/mcp/mcp.service.spec.ts`

**검색 및 교체**: 모든 `resolveForMode`, `resolveForAgent` mock을 `resolve`로 변경

```typescript
// BEFORE (여러 위치)
resolveForMode: vi.fn().mockResolvedValue({
  model: 'claude-sonnet-4-20250514',
  source: 'global',
}),
resolveForAgent: vi.fn().mockResolvedValue({
  model: 'claude-sonnet-4-20250514',
  source: 'global',
}),

// AFTER
resolve: vi.fn().mockResolvedValue({
  model: 'claude-sonnet-4-20250514',
  source: 'global',
}),
```

---

### 4.4 `apps/mcp-server/src/mcp/handlers/mode.handler.spec.ts` Mock 업데이트

**파일 경로**: `apps/mcp-server/src/mcp/handlers/mode.handler.spec.ts`

**변경**: Line 52

```typescript
// BEFORE (Line 52)
resolveForMode: vi.fn().mockResolvedValue({
  model: 'claude-sonnet-4-20250514',
  source: 'global',
}),

// AFTER
resolve: vi.fn().mockResolvedValue({
  model: 'claude-sonnet-4-20250514',
  source: 'global',
}),
```

---

## 5. 실행 순서

### Step 1: 타입 변경
```bash
# model.types.ts 수정
```

### Step 2: 핵심 함수 변경
```bash
# model.resolver.ts 수정
```

### Step 3: 서비스 변경
```bash
# model-resolver.service.ts 수정
```

### Step 4: 호출부 변경
```bash
# mode.handler.ts 수정
```

### Step 5: 테스트 수정
```bash
# 모든 테스트 파일 수정
```

### Step 6: Agent JSON 정리
```bash
# 프로젝트 루트에서 실행
chmod +x remove-model-fields.sh
./remove-model-fields.sh
```

### Step 7: 빌드 및 테스트
```bash
yarn build
yarn test
```

---

## 6. 검증 체크리스트

### 6.1 빌드 검증
```bash
cd apps/mcp-server
yarn build
# ✅ 에러 없이 완료되어야 함
```

### 6.2 테스트 검증
```bash
cd apps/mcp-server
yarn test
# ✅ 모든 테스트 통과해야 함
```

### 6.3 TypeScript 컴파일 검증
```bash
cd apps/mcp-server
yarn tsc --noEmit
# ✅ 타입 에러 없어야 함
```

### 6.4 Agent JSON 검증
```bash
# model 필드가 없어야 함
grep -l '"model"' packages/rules/.ai-rules/agents/*.json
# ✅ 결과가 없어야 함 (0 files)
```

### 6.5 기능 검증
```bash
# MCP 서버 시작
yarn workspace codingbuddy start:dev

# codingbuddy.config.js의 ai.defaultModel 값이 반환되는지 확인
# parse_mode 호출 시 resolvedModel.source가 'global'이어야 함
```

---

## 7. 롤백 방법

문제 발생 시 롤백:

```bash
# Git으로 변경 사항 되돌리기
git checkout -- apps/mcp-server/src/model/
git checkout -- apps/mcp-server/src/mcp/handlers/mode.handler.ts
git checkout -- packages/rules/.ai-rules/agents/
```

---

## 8. 릴리스 노트 (v4.0.0)

```markdown
## Breaking Changes

### Model Resolution Priority Changed

**이전 (v3.x)**:
1. Agent JSON → `model.preferred`
2. Mode Agent → `model.preferred`
3. Global Config → `ai.defaultModel`
4. System Default

**이후 (v4.0.0)**:
1. Global Config → `ai.defaultModel` (최우선)
2. System Default

### 마이그레이션 가이드

1. Agent JSON 파일의 `model` 필드는 더 이상 사용되지 않습니다
2. 프로젝트의 AI 모델은 `codingbuddy.config.js`에서 설정하세요:

```javascript
// codingbuddy.config.js
module.exports = {
  ai: {
    defaultModel: 'claude-opus-4-20250514', // 프로젝트 전체에 적용
  }
}
```

### 제거된 API

- `ModelResolverService.resolveForMode()` → `resolve()` 사용
- `ModelResolverService.resolveForAgent()` → `resolve()` 사용
- `ModelSource` 타입에서 `'agent'`, `'mode'` 제거
- `ResolveModelParams`에서 `agentModel`, `modeModel` 파라미터 제거
```

---

## 9. 관련 파일 요약

| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| `model.types.ts` | 수정 | 타입 단순화 |
| `model.resolver.ts` | 수정 | 함수 단순화 |
| `model-resolver.service.ts` | 전체 재작성 | 단일 `resolve()` 메서드 |
| `mode.handler.ts` | 수정 | 호출부 변경 |
| `model.resolver.spec.ts` | 전체 재작성 | agent/mode 테스트 제거 |
| `model-resolver.service.spec.ts` | 전체 재작성 | 새 API 테스트 |
| `mcp.service.spec.ts` | 수정 | Mock 업데이트 |
| `mode.handler.spec.ts` | 수정 | Mock 업데이트 |
| `agents/*.json` (29개) | 수정 | `model` 필드 제거 |

---

**문서 작성일**: 2026-02-03
**대상 버전**: v4.0.0
**작성자**: Claude (Planning Session)
