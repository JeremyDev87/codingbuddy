# [Kiro] Parallel Specialist Agents Execution Pattern Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Kiro 어댑터에 parallel specialist agents 실행 패턴을 문서화하여 Cursor/OpenCode 어댑터와 패리티를 맞춘다.

**Architecture:** 기존 `kiro.md`의 "Specialist Agents Execution" 섹션(lines 191-253)을 확장하여 `dispatchReady` 소비 패턴, Visibility Pattern, Handling Failures, When to Use 섹션을 추가한다.

**Tech Stack:** Markdown documentation only

**Issue:** https://github.com/JeremyDev87/codingbuddy/issues/616

---

## Task 1: `dispatchReady` 소비 패턴 추가

**Files:**
- Modify: `packages/rules/.ai-rules/adapters/kiro.md` (line 234 뒤, "### Specialist Icons" 앞에 삽입)

**Step 1: `dispatchReady` 소비 섹션 추가**

기존 "### Example (EVAL mode)" 섹션(line 233) 뒤에 다음 내용을 삽입:

```markdown
### Consuming dispatchReady from parse_mode

When `parse_mode` returns `dispatchReady`, the specialist system prompts are pre-built. In Kiro, use the `dispatchParams.prompt` field as analysis context (ignore `subagent_type` — it is Claude Code specific):

```
parse_mode returns dispatchReady
  ↓
dispatchReady.primaryAgent
  → Use as the main analysis context
  ↓
dispatchReady.parallelAgents[] (if present)
  → For each: the dispatchParams.prompt field contains the specialist's system prompt.
    Apply the prompt as analysis context, analyze sequentially, record findings
  ↓
Consolidate all findings
```

> **Fallback:** If `dispatchReady` is not present in the `parse_mode` response, call `prepare_parallel_agents` MCP tool to retrieve specialist system prompts.
```

**Step 2: Verify the insertion**

Read the modified file around the insertion point to confirm correct placement.

**Step 3: Commit**

```bash
git add packages/rules/.ai-rules/adapters/kiro.md
git commit -m "docs(kiro): add dispatchReady consumption pattern for specialist agents"
```

---

## Task 2: Visibility Pattern 추가

**Files:**
- Modify: `packages/rules/.ai-rules/adapters/kiro.md` (Specialist Icons 섹션 뒤에 삽입)

**Step 1: Visibility Pattern 섹션 추가**

"### Specialist Icons" 테이블 뒤에 다음 내용을 삽입:

```markdown
### Visibility Pattern

When executing sequential specialists, display clear status messages:

**Start:**
```
🔄 Executing N specialist analyses sequentially...
   → 🔒 security-specialist
   → ♿ accessibility-specialist
   → ⚡ performance-specialist
```

**During:**
```
🔍 Analyzing from 🔒 security-specialist perspective... (1/3)
```

**Completion:**
```
📊 Specialist Analysis Complete:

🔒 Security:
   [findings summary]

♿ Accessibility:
   [findings summary]

⚡ Performance:
   [findings summary]
```
```

**Step 2: Verify the insertion**

Read the modified file to confirm correct placement.

**Step 3: Commit**

```bash
git add packages/rules/.ai-rules/adapters/kiro.md
git commit -m "docs(kiro): add visibility pattern for sequential specialist execution"
```

---

## Task 3: Handling Failures 추가

**Files:**
- Modify: `packages/rules/.ai-rules/adapters/kiro.md` (Visibility Pattern 뒤에 삽입)

**Step 1: Handling Failures 섹션 추가**

Visibility Pattern 섹션 뒤에 다음 내용을 삽입:

```markdown
### Handling Failures

When `prepare_parallel_agents` returns `failedAgents`:

```
⚠️ Some agents failed to load:
   ✗ performance-specialist: Profile not found

Continuing with 2/3 agents...
```

**Strategy:**
- Continue with successfully loaded agents
- Report failures clearly to user
- Document which agents couldn't be loaded in final report
```

**Step 2: Verify the insertion**

Read the modified file to confirm correct placement.

**Step 3: Commit**

```bash
git add packages/rules/.ai-rules/adapters/kiro.md
git commit -m "docs(kiro): add failure handling for specialist agent loading"
```

---

## Task 4: When to Use Parallel Execution 추가

**Files:**
- Modify: `packages/rules/.ai-rules/adapters/kiro.md` (Handling Failures 뒤에 삽입)

**Step 1: When to Use 섹션 추가**

Handling Failures 섹션 뒤에 다음 내용을 삽입:

```markdown
### When to Use Specialist Execution

Specialist execution is recommended when `parse_mode` returns a `parallelAgentsRecommendation` field:

| Mode | Default Specialists | Use Case |
|------|---------------------|----------|
| **PLAN** | architecture-specialist, test-strategy-specialist | Validate architecture and test approach |
| **ACT** | code-quality-specialist, test-strategy-specialist | Verify implementation quality |
| **EVAL** | security-specialist, accessibility-specialist, performance-specialist, code-quality-specialist | Comprehensive multi-dimensional review |

### Specialist Activation Scope

Each workflow mode activates different specialist agents:

- **PLAN mode**: Architecture and test strategy specialists validate design
- **ACT mode**: Code quality and test strategy specialists verify implementation
- **EVAL mode**: Security, accessibility, performance, and code quality specialists provide comprehensive review

**Important:** Specialists from one mode do NOT carry over to the next mode. Each mode has its own recommended specialist set.
```

**Step 2: Verify the insertion**

Read the modified file to confirm correct placement.

**Step 3: Commit**

```bash
git add packages/rules/.ai-rules/adapters/kiro.md
git commit -m "docs(kiro): add specialist activation scope and when-to-use guidance"
```

---

## Task 5: Verification Status 테이블 업데이트

**Files:**
- Modify: `packages/rules/.ai-rules/adapters/kiro.md` (Verification Status 테이블)

**Step 1: Verification Status 행 업데이트**

기존:
```
| Specialist Agents Execution | ✅ Documented | Sequential workflow with icons |
```

변경:
```
| Specialist Agents Execution | ✅ Documented | Sequential workflow, dispatchReady, visibility, failures, activation scope |
```

**Step 2: Verify the change**

Read the modified file to confirm correct update.

**Step 3: Commit**

```bash
git add packages/rules/.ai-rules/adapters/kiro.md
git commit -m "docs(kiro): update verification status for specialist agents section"
```

---

## Summary

| Task | Description | Lines Affected |
|------|-------------|----------------|
| 1 | `dispatchReady` 소비 패턴 | Insert after line 233 |
| 2 | Visibility Pattern | Insert after Specialist Icons |
| 3 | Handling Failures | Insert after Visibility Pattern |
| 4 | When to Use + Activation Scope | Insert after Handling Failures |
| 5 | Verification Status 업데이트 | Modify line 585 |

**Cross-Adapter Parity 달성:**
- ✅ Cursor 대비: +dispatchReady, +Visibility, +Failures, +Activation Scope (Cursor보다 상위)
- ✅ OpenCode 대비: 동일 수준 (dispatchReady, Visibility 포함)
- ✅ Claude Code 대비: 순차 실행 버전으로 동등 커버리지
