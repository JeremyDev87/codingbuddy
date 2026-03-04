# Codex Adapter Audit — MCP Integration Patterns 검증

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** `codex.md` adapter 문서와 `.codex/rules/system-prompt.md`를 코드 수준에서 검증하고, 미검증 패턴을 명확히 표기하며, Claude Code 전용 참조를 수정한다.

**Architecture:** 서버 측 코드 분석을 통해 MCP 도구 목록의 정확성을 확인하고, 런타임 검증이 필요한 패턴은 별도 체크리스트로 분리한다. 문서 수정은 기존 구조를 유지하면서 정확도를 높인다.

**Tech Stack:** Markdown 문서, TypeScript (MCP handlers 참조용)

**Issue:** https://github.com/JeremyDev87/codingbuddy/issues/626

---

## 현재 상태 분석

`codex.md` (718줄)는 이슈 생성 이후 상당 부분 업데이트되어 있다. 이슈에서 "Missing"으로 표기된 MCP 도구들(parse_mode, dispatch_agents 등)은 이미 문서에 추가되어 있다. 하지만 핵심 문제는 여전히 유효하다:

**문서가 설계 의도 기반이며, 실제 Codex 런타임 동작 검증이 없다.**

### 발견된 문제점

| # | 문제 | 위치 | 심각도 |
|---|------|------|--------|
| 1 | PR All-in-One 섹션이 `.claude/pr-config.json` 참조 (Claude Code 전용 경로) | codex.md:535 | High |
| 2 | Verification Status 테이블이 "서버 코드 검증"과 "런타임 검증"을 구분하지 않음 | codex.md:696-711 | High |
| 3 | system-prompt.md에 MCP 도구 목록 불완전 (analyze_task, generate_checklist 등 누락) | system-prompt.md | Medium |
| 4 | `dispatch_agents` 설명이 "Claude Code optimized"이지만 Codex 대안이 불명확 | codex.md:190 | Medium |
| 5 | `set_project_root` deprecated 도구가 여전히 목록에 포함 | codex.md:183 | Low |
| 6 | docs/codex-adapter-configuration.md와 codex.md 간 MCP 도구 목록 동기화 필요 | 양쪽 문서 | Medium |

---

## Task 1: MCP 도구 목록 코드 수준 검증

서버 핸들러 코드를 분석하여 실제 등록된 MCP 도구 목록을 확인하고, codex.md의 Available MCP Tools 테이블과 대조한다.

**Files:**
- Read: `apps/mcp-server/src/mcp/handlers/*.handler.ts` (도구 정의 확인)
- Modify: `packages/rules/.ai-rules/adapters/codex.md:172-197` (Available MCP Tools 테이블)

**Step 1: 각 핸들러에서 등록된 도구 이름 추출**

각 핸들러 파일의 `getToolDefinitions()` 메서드를 확인하여 실제 도구 목록 수집:
- `rules.handler.ts` → search_rules, get_agent_details
- `config.handler.ts` → get_project_config, set_project_root, suggest_config_updates
- `skill.handler.ts` → recommend_skills, list_skills, get_skill
- `agent.handler.ts` → get_agent_system_prompt, prepare_parallel_agents, dispatch_agents
- `mode.handler.ts` → parse_mode
- `checklist-context.handler.ts` → generate_checklist, analyze_task
- `conventions.handler.ts` → get_code_conventions
- `context-document.handler.ts` → read_context, update_context, cleanup_context
- `tui.handler.ts` → restart_tui

**Step 2: codex.md의 Available MCP Tools 테이블과 대조**

실제 도구 목록 vs 문서화된 도구 목록을 비교하여 누락/잘못된 항목 식별.

**Step 3: 테이블 업데이트**

- `set_project_root`에 deprecated 명시 유지 (이미 있음)
- `dispatch_agents` 설명을 Codex 관점으로 변경: "Get dispatch params for specialist agents (use `prepare_parallel_agents` in Codex)"
- `restart_tui` 항목에 "Claude Code only — not applicable in Codex" 추가 또는 제거

**Step 4: 변경 사항 확인**

Run: 변경된 테이블을 눈으로 확인하여 핸들러 코드와 일치하는지 검증.

**Step 5: Commit**

```bash
git add packages/rules/.ai-rules/adapters/codex.md
git commit -m "docs(codex): verify MCP tools table against handler code"
```

---

## Task 2: PR All-in-One 섹션의 Claude Code 전용 경로 수정

**Files:**
- Modify: `packages/rules/.ai-rules/adapters/codex.md:514-560`

**Step 1: Claude Code 전용 참조 식별**

현재 문제:
- 라인 535: "Create `.claude/pr-config.json` in your project root" → `.claude/`는 Claude Code 전용 디렉토리
- 라인 560: "Use `cat .ai-rules/skills/pr-all-in-one/SKILL.md`" → 이것은 monorepo only 접근

**Step 2: 경로를 플랫폼 중립적으로 수정**

`.claude/pr-config.json` → `.codingbuddy/pr-config.json` 또는 프로젝트 루트의 `pr-config.json`으로 변경.

실제 pr-all-in-one 스킬이 어디서 config를 읽는지 코드를 확인하여 정확한 경로 결정.

**Step 3: Platform-Specific Note 업데이트**

"Use `cat .ai-rules/skills/...`" → "Use `get_skill('pr-all-in-one')` MCP tool" 로 변경.

**Step 4: 변경 확인**

수정된 섹션이 Codex 사용자에게 정확한 정보를 제공하는지 확인.

**Step 5: Commit**

```bash
git add packages/rules/.ai-rules/adapters/codex.md
git commit -m "fix(codex): replace Claude Code-specific paths in PR All-in-One section"
```

---

## Task 3: Verification Status 테이블 재정의

검증 수준을 3단계로 분리하여 정확도를 높인다.

**Files:**
- Modify: `packages/rules/.ai-rules/adapters/codex.md:696-711`

**Step 1: 검증 수준 정의 추가**

```markdown
### Verification Levels

| Level | Meaning |
|-------|---------|
| ✅ Code-verified | Server-side code confirms the feature exists and returns expected data |
| ✅ Documented | Workflow documented based on design; runtime behavior not yet tested |
| ⚠️ Unconfirmed | Depends on Codex/Copilot capabilities not documented in public docs |
| ❌ Not supported | Feature confirmed unavailable in Codex environment |
```

**Step 2: 기존 테이블을 3단계 기준으로 재분류**

| Pattern | 기존 | 변경 |
|---------|------|------|
| MCP Tool Access | ✅ Verified | ✅ Code-verified |
| PLAN/ACT/EVAL Modes | ✅ Verified | ✅ Code-verified (server returns correct data) |
| Keyword Invocation | ✅ Verified | ⚠️ Depends on Copilot calling parse_mode |
| Skills (MCP Tools) | ✅ Verified | ✅ Code-verified |
| Specialist Agents Execution | ✅ Verified | ✅ Documented (sequential workflow) |
| AUTO Mode | ✅ Documented | ⚠️ Depends on Copilot voluntary looping |
| Context Document Management | ✅ Documented | ✅ Code-verified (tools exist) |
| `roots/list` MCP Capability | ⚠️ Unconfirmed | ⚠️ Unconfirmed |
| Known Limitations | ✅ Documented | ✅ Documented |
| Task Tool / Background Subagent | ❌ Not supported | ❌ Not supported |

**Step 3: 런타임 검증 체크리스트 추가**

Verification Status 섹션 하단에 "Runtime Verification Checklist" 서브섹션을 추가:

```markdown
### Runtime Verification Checklist

To fully verify these patterns, test in VS Code with GitHub Copilot + codingbuddy MCP:

- [ ] Type `PLAN design auth` → Copilot calls `parse_mode` (check MCP logs)
- [ ] Type `EVAL review code` → Copilot calls `parse_mode` with EVAL mode
- [ ] Type `/debug` → Copilot calls `get_skill("systematic-debugging")`
- [ ] Type `AUTO implement feature` → Copilot attempts PLAN→ACT→EVAL loop
- [ ] Verify `prepare_parallel_agents` returns specialist prompts correctly
- [ ] Verify `update_context` persists across mode transitions
- [ ] Test `CODINGBUDDY_PROJECT_ROOT` env var resolution

Enable MCP debug logging: `MCP_DEBUG=1`
```

**Step 4: 변경 확인**

**Step 5: Commit**

```bash
git add packages/rules/.ai-rules/adapters/codex.md
git commit -m "docs(codex): redefine verification status with 3-level classification"
```

---

## Task 4: system-prompt.md에 MCP 도구 종합 테이블 추가

**Files:**
- Modify: `.codex/rules/system-prompt.md`

**Step 1: 현재 system-prompt.md에서 누락된 도구 식별**

현재 system-prompt.md에는 간접적으로만 도구를 참조한다. 다음 도구들이 명시적으로 안내되지 않음:
- `analyze_task`
- `generate_checklist`
- `get_code_conventions`
- `suggest_config_updates`
- `read_context` / `update_context` / `cleanup_context`
- `dispatch_agents`
- `prepare_parallel_agents`
- `get_agent_system_prompt`

**Step 2: MCP Tools 섹션 추가**

system-prompt.md의 Skills 섹션 뒤에 MCP Tools 종합 테이블 추가:

```markdown
## 🔧 Available MCP Tools

| Tool | Description | When to Use |
|------|-------------|-------------|
| `parse_mode` | Parse PLAN/ACT/EVAL/AUTO keywords | Message starts with mode keyword |
| `search_rules` | Search rules and guidelines | Need project rules context |
| `get_agent_details` | Get specialist agent profile | Need agent expertise info |
| `get_agent_system_prompt` | Get specialist system prompt | Before specialist analysis |
| `prepare_parallel_agents` | Get specialist prompts for sequential execution | EVAL mode specialist analysis |
| `dispatch_agents` | Get dispatch params (Claude Code optimized) | Fallback: use prepare_parallel_agents |
| `analyze_task` | Task risk assessment and specialist recommendations | Start of PLAN mode |
| `generate_checklist` | Contextual checklists (security, a11y, etc.) | Before completing ACT/EVAL |
| `get_project_config` | Project tech stack and language settings | Need project context |
| `get_code_conventions` | Code conventions from tsconfig, eslint, prettier | Before implementing code |
| `suggest_config_updates` | Suggest config updates from detected changes | After project setup changes |
| `recommend_skills` | Recommend skills for user prompt | Detect skill-worthy intent |
| `get_skill` | Load skill content by name | After recommend_skills or slash-command |
| `list_skills` | List all available skills | Browse skill catalog |
| `read_context` | Read context document | Check previous mode decisions |
| `update_context` | Persist decisions, notes, progress | Before completing each mode |
| `cleanup_context` | Summarize older context sections | Context document too large |
| `set_project_root` | ~~Set project root~~ **(deprecated)** | Use CODINGBUDDY_PROJECT_ROOT env var |
```

**Step 3: Context Document Management 섹션 보강**

system-prompt.md에 이미 `parse_mode` 의무 호출 규칙이 있으나, `update_context` 의무 호출 규칙이 없음. 추가:

```markdown
## 🔴 MANDATORY: Context Document Persistence

Before completing any mode (PLAN/ACT/EVAL), call `update_context` to persist:
- `decisions[]` — Key decisions made
- `notes[]` — Implementation notes
- `progress[]` — (ACT) Progress items
- `findings[]` / `recommendations[]` — (EVAL) Review results
```

**Step 4: 변경 확인**

**Step 5: Commit**

```bash
git add .codex/rules/system-prompt.md
git commit -m "docs(codex): add comprehensive MCP tools table and context persistence rule"
```

---

## Task 5: docs/codex-adapter-configuration.md 동기화 확인

**Files:**
- Read: `docs/codex-adapter-configuration.md` (전체)
- Modify: `docs/codex-adapter-configuration.md` (필요 시)

**Step 1: 문서 전체 읽기**

Available MCP Tools 섹션이 codex.md와 일치하는지 확인.

**Step 2: 불일치 항목 수정**

codex.md의 업데이트된 도구 테이블과 동기화.

**Step 3: Claude Code 전용 참조 확인**

`.claude/` 경로나 Task tool 참조가 없는지 검증.

**Step 4: Commit** (변경이 있는 경우)

```bash
git add docs/codex-adapter-configuration.md
git commit -m "docs(codex): sync adapter configuration with updated codex.md"
```

---

## Task 6: Known Limitations 섹션 검증 및 보강

**Files:**
- Modify: `packages/rules/.ai-rules/adapters/codex.md:650-673`

**Step 1: 현재 Known Limitations 테이블 검토**

기존 9개 항목이 정확한지 확인.

**Step 2: 누락된 제한사항 추가**

추가 후보:
- `get_code_conventions`: Codex에서 tool 호출 시기를 자동 감지하지 못함 (Claude Code의 hook 없음)
- `analyze_task`: PLAN 시작 시 자동 호출 보장 없음
- 슬래시 커맨드: 네이티브 지원 없음 → `get_skill` 매핑 필요 (이미 Skills 섹션에 있으나 Limitations에 없음)

**Step 3: 테이블 업데이트**

**Step 4: Commit**

```bash
git add packages/rules/.ai-rules/adapters/codex.md
git commit -m "docs(codex): expand known limitations with missing constraints"
```

---

## Task 7: 최종 검증 및 이슈 Acceptance Criteria 점검

**Step 1: Acceptance Criteria 체크**

이슈의 6개 기준 대조:

- [ ] 각 문서화된 패턴에 ✅ Verified / ⚠️ Partial / ❌ Not working 표기 → Task 3
- [ ] `codex.md`가 실제 동작 반영 → Task 1, 2, 6
- [ ] Claude Code 전용 패턴 명확히 비적용 표기 → Task 2
- [ ] 누락된 MCP 도구 추가 → Task 1, 4
- [ ] Known limitations 섹션 갱신 → Task 6
- [ ] `.codex/rules/system-prompt.md` 업데이트 → Task 4

**Step 2: 전체 문서 일관성 확인**

codex.md, system-prompt.md, codex-adapter-configuration.md 세 문서 간 상호 참조가 정확한지 확인.

**Step 3: 최종 commit**

```bash
git add -A
git commit -m "docs(codex): complete adapter audit per issue #626"
```

---

## 실행 요약

| Task | 파일 | 예상 규모 |
|------|------|-----------|
| 1. MCP 도구 목록 코드 검증 | codex.md | 테이블 수정 (소) |
| 2. Claude Code 전용 경로 수정 | codex.md | 섹션 수정 (소) |
| 3. Verification Status 재정의 | codex.md | 섹션 재작성 (중) |
| 4. system-prompt.md 도구 테이블 추가 | system-prompt.md | 섹션 추가 (중) |
| 5. adapter-configuration.md 동기화 | codex-adapter-configuration.md | 확인 및 수정 (소) |
| 6. Known Limitations 보강 | codex.md | 테이블 추가 (소) |
| 7. 최종 검증 | 전체 | 확인 (소) |
