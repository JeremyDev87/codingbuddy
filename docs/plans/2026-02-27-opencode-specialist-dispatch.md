# OpenCode Specialist Agent Dispatch Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Connect OpenCode/Crush's subagent system to `parallelAgentsRecommendation` from `parse_mode`, enabling sequential specialist execution with proper client detection and documentation.

**Architecture:** Three-layer approach: (1) Add `opencode` client type detection in the MCP server so OpenCode/Crush clients are recognized, (2) Add OpenCode-specific sequential hint in `keyword.service.ts` using `/agent <name>` pattern, (3) Document the complete sequential specialist execution workflow in `opencode.md` adapter.

**Tech Stack:** TypeScript, NestJS, Vitest, MCP Protocol

**Reference Issue:** https://github.com/JeremyDev87/codingbuddy/issues/612

---

### Task 1: Add `opencode` to ClientType detection

**Files:**
- Modify: `apps/mcp-server/src/shared/client-type.ts:1-25`
- Modify: `apps/mcp-server/src/shared/client-type.spec.ts:1-54`

**Step 1: Write the failing tests for opencode/crush client detection**

Add to `apps/mcp-server/src/shared/client-type.spec.ts` inside `describe('resolveClientType')`:

```typescript
it('should return "opencode" for OpenCode client', () => {
  expect(resolveClientType('OpenCode')).toBe('opencode');
});

it('should return "opencode" for case-insensitive opencode name', () => {
  expect(resolveClientType('opencode-cli')).toBe('opencode');
});

it('should return "opencode" for Crush client', () => {
  expect(resolveClientType('Crush')).toBe('opencode');
});

it('should return "opencode" for case-insensitive crush name', () => {
  expect(resolveClientType('crush-terminal')).toBe('opencode');
});
```

Also update the `CLIENT_TYPE_MATCHERS` test:

```typescript
it('should be an array of keyword-to-type mappings', () => {
  expect(Array.isArray(CLIENT_TYPE_MATCHERS)).toBe(true);
  expect(CLIENT_TYPE_MATCHERS.length).toBeGreaterThanOrEqual(4);
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/pjw/workspace/codingbuddy && yarn workspace codingbuddy test -- --run apps/mcp-server/src/shared/client-type.spec.ts`
Expected: FAIL - `"unknown"` does not equal `"opencode"`

**Step 3: Implement opencode client type detection**

Modify `apps/mcp-server/src/shared/client-type.ts`:

```typescript
export type ClientType = 'claude-code' | 'cursor' | 'opencode' | 'unknown';

export const CLIENT_TYPE_MATCHERS: ReadonlyArray<{ keyword: string; clientType: ClientType }> = [
  { keyword: 'cursor', clientType: 'cursor' },
  { keyword: 'opencode', clientType: 'opencode' },
  { keyword: 'crush', clientType: 'opencode' },
  { keyword: 'claude', clientType: 'claude-code' },
];
```

Note: `opencode` and `crush` matchers must come BEFORE `claude` since first match wins.

**Step 4: Run tests to verify they pass**

Run: `cd /Users/pjw/workspace/codingbuddy && yarn workspace codingbuddy test -- --run apps/mcp-server/src/shared/client-type.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/mcp-server/src/shared/client-type.ts apps/mcp-server/src/shared/client-type.spec.ts
git commit -m "feat(mcp): add opencode/crush to client type detection (#612)"
```

---

### Task 2: Add OpenCode-specific sequential hint in keyword service

**Files:**
- Modify: `apps/mcp-server/src/keyword/keyword.service.ts:850-854`
- Modify: `apps/mcp-server/src/keyword/keyword.service.spec.ts:941-967`

**Step 1: Write the failing test for opencode hint**

Add to `apps/mcp-server/src/keyword/keyword.service.spec.ts` inside `describe('client-specific hint')`:

```typescript
it('should return OpenCode sequential hint when client type is opencode', async () => {
  const opencodeService = new KeywordService(mockLoadConfig, mockLoadRule, mockLoadAgentInfo, {
    getClientTypeFn: () => 'opencode',
  });
  const result = await opencodeService.parseMode('PLAN test');
  expect(result.parallelAgentsRecommendation?.hint).toContain('sequentially');
  expect(result.parallelAgentsRecommendation?.hint).toContain('/agent');
  expect(result.parallelAgentsRecommendation?.hint).not.toContain('Task tool');
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/pjw/workspace/codingbuddy && yarn workspace codingbuddy test -- --run apps/mcp-server/src/keyword/keyword.service.spec.ts -t "client-specific hint"`
Expected: FAIL - opencode gets Claude Code hint (contains "Task tool")

**Step 3: Update hint branching logic**

Modify `apps/mcp-server/src/keyword/keyword.service.ts` around line 850-854. Replace the existing hint logic:

```typescript
const clientType = this.getClientTypeFn?.() ?? 'unknown';
let hint: string;
if (clientType === 'cursor') {
  hint = `Execute specialists sequentially: call prepare_parallel_agents MCP tool to get specialist prompts, then analyze from each specialist's perspective one by one, consolidating findings at the end.`;
} else if (clientType === 'opencode') {
  hint = `Execute specialists sequentially using /agent <name> command: for each recommended specialist, switch to the specialist agent, perform the analysis, record findings, then switch back. Consolidate all findings at the end.`;
} else {
  hint = `Use Task tool with subagent_type="general-purpose" and run_in_background=true for each specialist. Call prepare_parallel_agents MCP tool to get ready-to-use prompts.`;
}
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/pjw/workspace/codingbuddy && yarn workspace codingbuddy test -- --run apps/mcp-server/src/keyword/keyword.service.spec.ts -t "client-specific hint"`
Expected: PASS (all 4 tests: cursor, claude-code, opencode, unknown)

**Step 5: Commit**

```bash
git add apps/mcp-server/src/keyword/keyword.service.ts apps/mcp-server/src/keyword/keyword.service.spec.ts
git commit -m "feat(mcp): add opencode-specific sequential specialist hint (#612)"
```

---

### Task 3: Add Specialist Agents Execution section to opencode.md

**Files:**
- Modify: `packages/rules/.ai-rules/adapters/opencode.md:511-527`

**Step 1: Replace the "Parallel Agent Workflows" section**

Replace the existing "Parallel Agent Workflows" section (lines 513-527) in `opencode.md` with a comprehensive "Specialist Agents Execution" section. This is a documentation-only change.

The current section:

```markdown
### Parallel Agent Workflows

\`\`\`bash
# Terminal 1: Planning
opencode --agent plan-mode
Create a plan for me

# Terminal 2: Implementation
opencode --agent act-mode
ACT

# Terminal 3: Review
opencode --agent eval-mode
EVAL
\`\`\`
```

Replace with:

```markdown
### Specialist Agents Execution

OpenCode/Crush does not have a `Task` tool for spawning background subagents like Claude Code. When `parse_mode` returns `parallelAgentsRecommendation`, execute specialists **sequentially** using the `/agent <name>` command.

#### Auto-Detection

The MCP server automatically detects OpenCode/Crush as the client and returns a sequential execution hint in `parallelAgentsRecommendation.hint`. No manual configuration is needed.

#### Sequential Workflow

\`\`\`
parse_mode returns parallelAgentsRecommendation
  ↓
For each recommended specialist (sequentially):
  /agent <specialist-name>
  Perform specialist analysis
  Record findings
  ↓
/agent <primary-mode>  (return to mode agent)
Consolidate all findings
\`\`\`

#### Example (EVAL mode)

\`\`\`
parse_mode({ prompt: "EVAL review auth implementation" })
→ parallelAgentsRecommendation:
    specialists: ["security-specialist", "accessibility-specialist", "performance-specialist"]

Sequential analysis:
  1. /agent security     → 🔒 Analyze from security perspective, record findings
  2. /agent a11y         → ♿ Analyze from accessibility perspective, record findings
  3. /agent performance  → ⚡ Analyze from performance perspective, record findings
  4. /agent eval-mode    → Return to EVAL mode

Present: Consolidated findings from all 3 specialists
\`\`\`

#### Consuming dispatchReady from parse_mode

When `parse_mode` returns `dispatchReady`, the specialist system prompts are pre-built. In OpenCode, use these prompts as analysis context when switching agents:

\`\`\`
parse_mode returns dispatchReady
  ↓
dispatchReady.primaryAgent
  → Use as the main analysis context
  ↓
dispatchReady.parallelAgents[] (if present)
  → For each: switch via /agent, analyze with provided prompt, record findings
  ↓
Consolidate all findings
\`\`\`

#### Specialist Agent Mapping

| parallelAgentsRecommendation | OpenCode Agent | Icon |
|------------------------------|----------------|------|
| security-specialist | `security` | 🔒 |
| accessibility-specialist | `a11y` | ♿ |
| performance-specialist | `performance` | ⚡ |
| architecture-specialist | `architect` | 🏛️ |
| test-strategy-specialist | `tester` | 🧪 |
| code-quality-specialist | N/A (inline) | 📏 |
| documentation-specialist | N/A (inline) | 📚 |

> **Note:** Specialists without a dedicated OpenCode agent (e.g., `code-quality-specialist`) should be analyzed inline within the current agent context using the specialist's system prompt from `prepare_parallel_agents`.

#### Visibility Pattern

When executing sequential specialists, display clear status messages:

**Start:**
\`\`\`
🔄 Executing N specialist analyses sequentially...
   → 🔒 security
   → ♿ a11y
   → ⚡ performance
\`\`\`

**During:**
\`\`\`
🔍 Analyzing from 🔒 security perspective... (1/3)
\`\`\`

**Completion:**
\`\`\`
📊 Specialist Analysis Complete:

🔒 Security:
   [findings summary]

♿ Accessibility:
   [findings summary]

⚡ Performance:
   [findings summary]
\`\`\`
```

**Step 2: Verify documentation renders correctly**

Run: `cd /Users/pjw/workspace/codingbuddy && head -5 packages/rules/.ai-rules/adapters/opencode.md`
Expected: File header still intact

**Step 3: Commit**

```bash
git add packages/rules/.ai-rules/adapters/opencode.md
git commit -m "docs(opencode): add sequential specialist execution workflow (#612)"
```

---

### Task 4: Run full test suite to verify no regressions

**Files:** None (verification only)

**Step 1: Run all MCP server tests**

Run: `cd /Users/pjw/workspace/codingbuddy && yarn workspace codingbuddy test -- --run`
Expected: All tests PASS

**Step 2: If any test fails, fix and re-run**

Check for type errors in files that import `ClientType`:

Run: `cd /Users/pjw/workspace/codingbuddy && yarn workspace codingbuddy build`
Expected: Build succeeds with no errors

**Step 3: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix(mcp): resolve type errors from ClientType union expansion (#612)"
```

---

## Acceptance Criteria Checklist

From the issue:

- [ ] **Verify whether OpenCode subagents can run in parallel or only sequentially** → Sequential only (one `/agent` switch at a time). Documented in Task 3.
- [ ] **Document the correct invocation pattern for specialist agents in OpenCode** → `/agent <name>` sequential pattern. Documented in Task 3.
- [ ] **Add sequential specialist execution pattern to `opencode.md`** → Task 3
- [ ] **Clarify how `dispatchReady.parallelAgents[]` from `parse_mode` should be consumed in OpenCode** → "Consuming dispatchReady" subsection in Task 3

## Files Changed Summary

| File | Change Type | Task |
|------|-------------|------|
| `apps/mcp-server/src/shared/client-type.ts` | Modify | Task 1 |
| `apps/mcp-server/src/shared/client-type.spec.ts` | Modify | Task 1 |
| `apps/mcp-server/src/keyword/keyword.service.ts` | Modify | Task 2 |
| `apps/mcp-server/src/keyword/keyword.service.spec.ts` | Modify | Task 2 |
| `packages/rules/.ai-rules/adapters/opencode.md` | Modify | Task 3 |
