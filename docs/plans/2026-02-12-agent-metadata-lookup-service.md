# Agent Metadata Lookup Service Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Agent ID로 메타데이터(name, category, icon, expertise)를 조회하는 서비스를 구현하여 TuiInterceptor가 Agent를 식별할 수 있도록 한다.

**Architecture:** `AgentMetadataService`는 NestJS Injectable 서비스로, `RulesService.listAgents()` + `getAgent()`를 활용해 Agent 메타데이터를 로드하고 캐시한다. 카테고리 분류는 정적 매핑으로 관리하며, `parseAgentFromToolName`을 확장하여 `parse_mode`와 `prepare_parallel_agents` 툴도 처리한다.

**Tech Stack:** NestJS, TypeScript, Vitest

**Issue:** [#336](https://github.com/JeremyDev87/codingbuddy/issues/336)

---

## Task 1: AgentCategory 타입 및 카테고리 매핑 정의

**Files:**
- Create: `apps/mcp-server/src/tui/events/agent-metadata.types.ts`
- Test: `apps/mcp-server/src/tui/events/agent-metadata.types.spec.ts`

**Step 1: 실패하는 테스트 작성**

```typescript
// agent-metadata.types.spec.ts
import { describe, it, expect } from 'vitest';
import {
  AgentCategory,
  AgentMetadata,
  AGENT_CATEGORY_MAP,
  AGENT_ICONS,
} from './agent-metadata.types';

describe('AGENT_CATEGORY_MAP', () => {
  it('should have category for all known agents', () => {
    const knownAgents = [
      'solution-architect', 'architecture-specialist', 'agent-architect',
      'test-strategy-specialist',
      'security-specialist',
      'frontend-developer', 'ui-ux-designer',
      'backend-developer',
      'code-quality-specialist', 'code-reviewer',
      'performance-specialist',
      'devops-engineer', 'platform-engineer', 'tooling-engineer',
      'accessibility-specialist',
      'seo-specialist',
      'documentation-specialist',
      'data-engineer',
      'mobile-developer',
      'ai-ml-engineer',
      'i18n-specialist',
      'observability-specialist',
      'event-architecture-specialist',
      'integration-specialist',
      'migration-specialist',
      'technical-planner',
      'plan-mode', 'act-mode', 'eval-mode',
    ];
    for (const agent of knownAgents) {
      expect(AGENT_CATEGORY_MAP[agent]).toBeDefined();
    }
  });

  it('should return valid AgentCategory values', () => {
    const validCategories: AgentCategory[] = [
      'Architecture', 'Testing', 'Security', 'Frontend', 'Backend',
      'CodeQuality', 'Performance', 'DevOps', 'Accessibility', 'SEO',
      'Documentation', 'Data', 'Mobile', 'AI/ML', 'i18n',
      'Observability', 'EventArchitecture', 'Integration', 'Migration',
      'Planning', 'Mode',
    ];
    for (const category of Object.values(AGENT_CATEGORY_MAP)) {
      expect(validCategories).toContain(category);
    }
  });
});

describe('AGENT_ICONS', () => {
  it('should have icon for every category', () => {
    const categories: AgentCategory[] = [
      'Architecture', 'Testing', 'Security', 'Frontend', 'Backend',
      'CodeQuality', 'Performance', 'DevOps', 'Accessibility', 'SEO',
      'Documentation', 'Data', 'Mobile', 'AI/ML', 'i18n',
      'Observability', 'EventArchitecture', 'Integration', 'Migration',
      'Planning', 'Mode',
    ];
    for (const cat of categories) {
      expect(AGENT_ICONS[cat]).toBeDefined();
    }
  });
});
```

**Step 2: 테스트 실패 확인**

Run: `yarn workspace codingbuddy test -- --run apps/mcp-server/src/tui/events/agent-metadata.types.spec.ts`
Expected: FAIL - 모듈을 찾을 수 없음

**Step 3: 최소한의 구현**

```typescript
// agent-metadata.types.ts
export type AgentCategory =
  | 'Architecture'
  | 'Testing'
  | 'Security'
  | 'Frontend'
  | 'Backend'
  | 'CodeQuality'
  | 'Performance'
  | 'DevOps'
  | 'Accessibility'
  | 'SEO'
  | 'Documentation'
  | 'Data'
  | 'Mobile'
  | 'AI/ML'
  | 'i18n'
  | 'Observability'
  | 'EventArchitecture'
  | 'Integration'
  | 'Migration'
  | 'Planning'
  | 'Mode';

export interface AgentMetadata {
  id: string;
  name: string;
  description: string;
  category: AgentCategory;
  icon: string;
  expertise: string[];
}

export const AGENT_CATEGORY_MAP: Record<string, AgentCategory> = {
  // Architecture
  'solution-architect': 'Architecture',
  'architecture-specialist': 'Architecture',
  'agent-architect': 'Architecture',
  // Testing
  'test-strategy-specialist': 'Testing',
  // Security
  'security-specialist': 'Security',
  // Frontend
  'frontend-developer': 'Frontend',
  'ui-ux-designer': 'Frontend',
  // Backend
  'backend-developer': 'Backend',
  // Code Quality
  'code-quality-specialist': 'CodeQuality',
  'code-reviewer': 'CodeQuality',
  // Performance
  'performance-specialist': 'Performance',
  // DevOps
  'devops-engineer': 'DevOps',
  'platform-engineer': 'DevOps',
  'tooling-engineer': 'DevOps',
  // Accessibility
  'accessibility-specialist': 'Accessibility',
  // SEO
  'seo-specialist': 'SEO',
  // Documentation
  'documentation-specialist': 'Documentation',
  // Data
  'data-engineer': 'Data',
  // Mobile
  'mobile-developer': 'Mobile',
  // AI/ML
  'ai-ml-engineer': 'AI/ML',
  // i18n
  'i18n-specialist': 'i18n',
  // Observability
  'observability-specialist': 'Observability',
  // Event Architecture
  'event-architecture-specialist': 'EventArchitecture',
  // Integration
  'integration-specialist': 'Integration',
  // Migration
  'migration-specialist': 'Migration',
  // Planning
  'technical-planner': 'Planning',
  // Mode
  'plan-mode': 'Mode',
  'act-mode': 'Mode',
  'eval-mode': 'Mode',
};

export const AGENT_ICONS: Record<AgentCategory, string> = {
  Architecture: '🏛️',
  Testing: '🧪',
  Security: '🔒',
  Frontend: '🎨',
  Backend: '⚙️',
  CodeQuality: '📏',
  Performance: '⚡',
  DevOps: '🔧',
  Accessibility: '♿',
  SEO: '🔍',
  Documentation: '📝',
  Data: '💾',
  Mobile: '📱',
  'AI/ML': '🤖',
  i18n: '🌐',
  Observability: '📊',
  EventArchitecture: '📨',
  Integration: '🔗',
  Migration: '🔄',
  Planning: '📋',
  Mode: '🔀',
};
```

**Step 4: 테스트 통과 확인**

Run: `yarn workspace codingbuddy test -- --run apps/mcp-server/src/tui/events/agent-metadata.types.spec.ts`
Expected: PASS

**Step 5: 커밋**

```bash
git add apps/mcp-server/src/tui/events/agent-metadata.types.ts apps/mcp-server/src/tui/events/agent-metadata.types.spec.ts
git commit -m "feat(tui): add AgentCategory types and category mapping (#336)"
```

---

## Task 2: AgentMetadataService 구현

**Files:**
- Create: `apps/mcp-server/src/tui/events/agent-metadata.service.ts`
- Test: `apps/mcp-server/src/tui/events/agent-metadata.service.spec.ts`

**Step 1: 실패하는 테스트 작성**

```typescript
// agent-metadata.service.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentMetadataService } from './agent-metadata.service';

describe('AgentMetadataService', () => {
  let service: AgentMetadataService;
  let mockRulesService: {
    listAgents: ReturnType<typeof vi.fn>;
    getAgent: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRulesService = {
      listAgents: vi.fn().mockResolvedValue([
        'plan-mode', 'act-mode', 'eval-mode',
        'frontend-developer', 'security-specialist',
      ]),
      getAgent: vi.fn().mockImplementation((name: string) => {
        const agents: Record<string, unknown> = {
          'plan-mode': {
            name: 'Plan Mode Agent',
            description: 'PLAN mode agent',
            role: { title: 'Plan Mode Agent', expertise: ['Work planning'] },
          },
          'act-mode': {
            name: 'Act Mode Agent',
            description: 'ACT mode agent',
            role: { title: 'Act Mode Agent', expertise: ['TDD'] },
          },
          'eval-mode': {
            name: 'Eval Mode Agent',
            description: 'EVAL mode agent',
            role: { title: 'Eval Mode Agent', expertise: ['Review'] },
          },
          'frontend-developer': {
            name: 'Frontend Developer',
            description: 'React specialist',
            role: { title: 'Senior Frontend Developer', expertise: ['React', 'TypeScript'] },
          },
          'security-specialist': {
            name: 'Security Specialist',
            description: 'Security expert',
            role: { title: 'Security Specialist', expertise: ['OWASP', 'Pen Testing'] },
          },
        };
        return Promise.resolve(agents[name]);
      }),
    };
    service = new AgentMetadataService(mockRulesService as any);
  });

  describe('initialize', () => {
    it('should load all agent metadata into cache', async () => {
      await service.initialize();
      expect(mockRulesService.listAgents).toHaveBeenCalledOnce();
      expect(mockRulesService.getAgent).toHaveBeenCalledTimes(5);
    });

    it('should not reload if already initialized', async () => {
      await service.initialize();
      await service.initialize();
      expect(mockRulesService.listAgents).toHaveBeenCalledOnce();
    });
  });

  describe('getMetadata', () => {
    it('should return metadata for a known agent', async () => {
      await service.initialize();
      const metadata = service.getMetadata('frontend-developer');
      expect(metadata).toEqual({
        id: 'frontend-developer',
        name: 'Frontend Developer',
        description: 'React specialist',
        category: 'Frontend',
        icon: '🎨',
        expertise: ['React', 'TypeScript'],
      });
    });

    it('should return null for unknown agent', async () => {
      await service.initialize();
      expect(service.getMetadata('unknown-agent')).toBeNull();
    });

    it('should auto-initialize on first getMetadata call', async () => {
      const metadata = await service.getMetadataAsync('frontend-developer');
      expect(metadata).not.toBeNull();
      expect(mockRulesService.listAgents).toHaveBeenCalledOnce();
    });
  });

  describe('getAllMetadata', () => {
    it('should return all cached metadata', async () => {
      await service.initialize();
      const all = service.getAllMetadata();
      expect(all).toHaveLength(5);
    });
  });

  describe('graceful degradation', () => {
    it('should handle individual agent load failure gracefully', async () => {
      mockRulesService.getAgent.mockRejectedValueOnce(new Error('parse error'));
      await service.initialize();
      // Should still load remaining agents
      const all = service.getAllMetadata();
      expect(all.length).toBeGreaterThanOrEqual(4);
    });
  });
});
```

**Step 2: 테스트 실패 확인**

Run: `yarn workspace codingbuddy test -- --run apps/mcp-server/src/tui/events/agent-metadata.service.spec.ts`
Expected: FAIL

**Step 3: 최소한의 구현**

```typescript
// agent-metadata.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { RulesService } from '../../rules/rules.service';
import {
  AgentMetadata,
  AGENT_CATEGORY_MAP,
  AGENT_ICONS,
} from './agent-metadata.types';

@Injectable()
export class AgentMetadataService {
  private readonly logger = new Logger(AgentMetadataService.name);
  private readonly cache = new Map<string, AgentMetadata>();
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(private readonly rulesService: RulesService) {}

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.loadAllAgents();
    await this.initPromise;
    this.initialized = true;
  }

  getMetadata(agentId: string): AgentMetadata | null {
    return this.cache.get(agentId) ?? null;
  }

  async getMetadataAsync(agentId: string): Promise<AgentMetadata | null> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.getMetadata(agentId);
  }

  getAllMetadata(): AgentMetadata[] {
    return Array.from(this.cache.values());
  }

  private async loadAllAgents(): Promise<void> {
    try {
      const agentIds = await this.rulesService.listAgents();

      await Promise.allSettled(
        agentIds.map(id => this.loadAgent(id)),
      );

      this.logger.log(`Loaded metadata for ${this.cache.size} agents`);
    } catch (error) {
      this.logger.error('Failed to load agent list', error);
    }
  }

  private async loadAgent(agentId: string): Promise<void> {
    try {
      const profile = await this.rulesService.getAgent(agentId);
      const category = AGENT_CATEGORY_MAP[agentId] ?? 'Architecture';
      const icon = AGENT_ICONS[category];

      this.cache.set(agentId, {
        id: agentId,
        name: profile.name,
        description: profile.description,
        category,
        icon,
        expertise: profile.role.expertise ?? [],
      });
    } catch (error) {
      this.logger.warn(`Failed to load agent: ${agentId}`, error);
    }
  }
}
```

**Step 4: 테스트 통과 확인**

Run: `yarn workspace codingbuddy test -- --run apps/mcp-server/src/tui/events/agent-metadata.service.spec.ts`
Expected: PASS

**Step 5: 커밋**

```bash
git add apps/mcp-server/src/tui/events/agent-metadata.service.ts apps/mcp-server/src/tui/events/agent-metadata.service.spec.ts
git commit -m "feat(tui): implement AgentMetadataService with cache (#336)"
```

---

## Task 3: parseAgentFromToolName 확장

**Files:**
- Modify: `apps/mcp-server/src/tui/events/parse-agent.ts`
- Modify: `apps/mcp-server/src/tui/events/parse-agent.spec.ts`

현재 `parseAgentFromToolName`은 `get_agent_system_prompt`만 처리한다. 이슈 요구사항에 따라 다음을 추가:
- `parse_mode` → mode agent 식별
- `prepare_parallel_agents` → parallel 실행 감지

**Step 1: 실패하는 테스트 추가**

`parse-agent.spec.ts`에 다음 케이스 추가:

```typescript
describe('parse_mode tool', () => {
  it('should detect mode agent from parse_mode', () => {
    const result = parseAgentFromToolName('parse_mode', {
      prompt: 'PLAN design auth feature',
    });
    expect(result).toEqual({
      agentId: 'plan-mode',
      name: 'plan-mode',
      role: 'mode',
      isPrimary: false,
    });
  });

  it('should detect ACT mode', () => {
    const result = parseAgentFromToolName('parse_mode', {
      prompt: 'ACT implement feature',
    });
    expect(result).toEqual({
      agentId: 'act-mode',
      name: 'act-mode',
      role: 'mode',
      isPrimary: false,
    });
  });

  it('should detect EVAL mode', () => {
    const result = parseAgentFromToolName('parse_mode', {
      prompt: 'EVAL review code',
    });
    expect(result).toEqual({
      agentId: 'eval-mode',
      name: 'eval-mode',
      role: 'mode',
      isPrimary: false,
    });
  });

  it('should detect AUTO mode', () => {
    const result = parseAgentFromToolName('parse_mode', {
      prompt: 'AUTO build dashboard',
    });
    expect(result).toEqual({
      agentId: 'auto-mode',
      name: 'auto-mode',
      role: 'mode',
      isPrimary: false,
    });
  });

  it('should return null if prompt does not start with a mode keyword', () => {
    const result = parseAgentFromToolName('parse_mode', {
      prompt: 'hello world',
    });
    expect(result).toBeNull();
  });
});

describe('prepare_parallel_agents tool', () => {
  it('should return first specialist as activated agent', () => {
    const result = parseAgentFromToolName('prepare_parallel_agents', {
      specialists: ['security-specialist', 'performance-specialist'],
      mode: 'EVAL',
    });
    expect(result).toEqual({
      agentId: 'parallel-dispatch',
      name: 'parallel-dispatch',
      role: 'orchestrator',
      isPrimary: false,
    });
  });

  it('should return null if specialists is empty', () => {
    const result = parseAgentFromToolName('prepare_parallel_agents', {
      specialists: [],
      mode: 'EVAL',
    });
    expect(result).toBeNull();
  });
});
```

**Step 2: 테스트 실패 확인**

Run: `yarn workspace codingbuddy test -- --run apps/mcp-server/src/tui/events/parse-agent.spec.ts`
Expected: FAIL (새 케이스 실패)

**Step 3: parseAgentFromToolName 확장 구현**

```typescript
// parse-agent.ts
import { AgentActivatedEvent } from './types';

const MODE_KEYWORD_TO_AGENT: Record<string, string> = {
  PLAN: 'plan-mode',
  ACT: 'act-mode',
  EVAL: 'eval-mode',
  AUTO: 'auto-mode',
};

export function parseAgentFromToolName(
  toolName: string,
  args: Record<string, unknown> | undefined,
): AgentActivatedEvent | null {
  if (toolName === 'get_agent_system_prompt') {
    return parseGetAgentSystemPrompt(args);
  }

  if (toolName === 'parse_mode') {
    return parseParseMode(args);
  }

  if (toolName === 'prepare_parallel_agents') {
    return parseParallelAgents(args);
  }

  return null;
}

function parseGetAgentSystemPrompt(
  args: Record<string, unknown> | undefined,
): AgentActivatedEvent | null {
  const agentName = typeof args?.agentName === 'string' ? args.agentName : null;
  if (!agentName) return null;

  return {
    agentId: agentName,
    name: agentName,
    role: 'specialist',
    isPrimary: true,
  };
}

function parseParseMode(
  args: Record<string, unknown> | undefined,
): AgentActivatedEvent | null {
  const prompt = typeof args?.prompt === 'string' ? args.prompt : null;
  if (!prompt) return null;

  const firstWord = prompt.trimStart().split(/\s+/)[0]?.toUpperCase();
  const agentId = firstWord ? MODE_KEYWORD_TO_AGENT[firstWord] : undefined;
  if (!agentId) return null;

  return {
    agentId,
    name: agentId,
    role: 'mode',
    isPrimary: false,
  };
}

function parseParallelAgents(
  args: Record<string, unknown> | undefined,
): AgentActivatedEvent | null {
  const specialists = args?.specialists;
  if (!Array.isArray(specialists) || specialists.length === 0) return null;

  return {
    agentId: 'parallel-dispatch',
    name: 'parallel-dispatch',
    role: 'orchestrator',
    isPrimary: false,
  };
}
```

**Step 4: 기존 + 새 테스트 모두 통과 확인**

Run: `yarn workspace codingbuddy test -- --run apps/mcp-server/src/tui/events/parse-agent.spec.ts`
Expected: ALL PASS

**Step 5: 기존 테스트 중 `parse_mode`에 대한 null 반환 테스트 수정**

기존 테스트에서 `parse_mode`가 null을 반환하도록 기대하는 케이스가 있으므로, 해당 테스트를 업데이트하여 prompt 값에 따라 올바른 결과를 기대하도록 수정한다.

**Step 6: 커밋**

```bash
git add apps/mcp-server/src/tui/events/parse-agent.ts apps/mcp-server/src/tui/events/parse-agent.spec.ts
git commit -m "feat(tui): extend parseAgentFromToolName for parse_mode and parallel agents (#336)"
```

---

## Task 4: TuiEventsModule에 AgentMetadataService 등록 및 export 업데이트

**Files:**
- Modify: `apps/mcp-server/src/tui/events/events.module.ts`
- Modify: `apps/mcp-server/src/tui/events/index.ts`

**Step 1: events.module.ts에 AgentMetadataService 추가**

```typescript
// events.module.ts
import { Module } from '@nestjs/common';
import { TuiEventBus } from './event-bus';
import { TuiInterceptor } from './tui-interceptor';
import { AgentMetadataService } from './agent-metadata.service';

@Module({
  providers: [TuiEventBus, TuiInterceptor, AgentMetadataService],
  exports: [TuiEventBus, TuiInterceptor, AgentMetadataService],
})
export class TuiEventsModule {}
```

**주의:** `AgentMetadataService`는 `RulesService`에 의존하므로, `RulesModule`이 `TuiEventsModule`에 import되어야 한다. 혹은 `RulesService`를 직접 제공하는 방식으로 처리. 이 부분은 기존 DI 구조를 확인하여 결정한다.

**Step 2: index.ts에 export 추가**

```typescript
export { AgentMetadataService } from './agent-metadata.service';
export {
  type AgentMetadata,
  type AgentCategory,
  AGENT_CATEGORY_MAP,
  AGENT_ICONS,
} from './agent-metadata.types';
```

**Step 3: 빌드 확인**

Run: `yarn workspace codingbuddy build`
Expected: BUILD SUCCESS

**Step 4: 커밋**

```bash
git add apps/mcp-server/src/tui/events/events.module.ts apps/mcp-server/src/tui/events/index.ts
git commit -m "feat(tui): register AgentMetadataService in TuiEventsModule (#336)"
```

---

## Task 5: 전체 테스트 실행 및 최종 검증

**Step 1: 전체 테스트 실행**

Run: `yarn workspace codingbuddy test`
Expected: ALL PASS

**Step 2: 빌드 확인**

Run: `yarn workspace codingbuddy build`
Expected: BUILD SUCCESS

**Step 3: 최종 커밋 (필요시)**

---

## 의존성 그래프

```
Task 1 (타입/매핑) ──┐
                     ├──▶ Task 2 (서비스) ──▶ Task 4 (모듈 등록) ──▶ Task 5 (검증)
Task 3 (parse 확장) ─┘
```

Task 1과 Task 3은 독립적으로 병렬 진행 가능.

---

## 핵심 설계 결정

1. **Lazy initialization**: `getMetadataAsync()`를 통해 첫 호출 시 자동 초기화
2. **Sync access**: `getMetadata()`는 캐시 hit만 처리 (초기화 후 사용)
3. **Graceful degradation**: 개별 Agent 로드 실패 시 나머지는 계속 로드
4. **정적 카테고리 매핑**: Agent JSON에 카테고리 필드 추가 대신 코드 내 매핑으로 관리 (기존 JSON 스키마 변경 불필요)
5. **parseAgentFromToolName 확장**: 기존 함수 시그니처 유지, 내부에서 tool별 분기 처리
