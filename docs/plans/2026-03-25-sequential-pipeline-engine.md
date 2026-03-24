# Sequential Task Pipeline Engine — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a sequential task pipeline engine that chains tasks with data passing — when task A completes, automatically start task B with A's output as context.

**Architecture:** New `pipeline/` module under `apps/mcp-server/src/` following existing NestJS patterns. Pure pipeline execution logic separated from MCP handler. Stage executors handle different stage types (command, agent, skill).

**Tech Stack:** TypeScript, NestJS, Vitest

## Alternatives

### Decision: Pipeline State Storage

| Criteria | Approach A: In-Memory Map | Approach B: File-Based Persistence |
|---|---|---|
| Performance | Fast, no I/O | Slower, disk I/O |
| Complexity | Low | Medium (serialization) |
| Maintainability | Simple | More code to maintain |
| Resilience | Lost on restart | Survives restart |

**Decision:** In-Memory Map — Pipeline executions are short-lived; persistence can be added later if needed. YAGNI.

### Decision: Stage Executor Pattern

| Criteria | Approach A: Strategy Pattern (classes) | Approach B: Pure Function Map |
|---|---|---|
| Performance | Same | Same |
| Complexity | Higher (class hierarchy) | Lower (simple functions) |
| Testability | Good | Better (no mocking needed) |
| Maintainability | More boilerplate | Less code |

**Decision:** Pure Function Map — Simpler, more testable, follows project's pure/impure separation principle.

---

## Tasks

### Task 1: Define Pipeline Types
**File:** `apps/mcp-server/src/pipeline/pipeline.types.ts`

1. Create the file with these interfaces:
   - `PipelineStageType = 'command' | 'agent' | 'skill'`
   - `PipelineStageConfig` — union type per stage type
   - `PipelineStage` — `{ id, name, type, config }`
   - `PipelineDefinition` — `{ id, name, stages[] }`
   - `PipelineStageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'`
   - `PipelineStageResult` — `{ stageId, status, output?, error?, startedAt, completedAt, durationMs }`
   - `PipelineExecutionStatus = 'running' | 'completed' | 'failed' | 'paused'`
   - `PipelineExecution` — `{ id, pipelineId, status, currentStageIndex, stageResults[], startedAt, completedAt? }`
2. Run `yarn workspace codingbuddy build` to verify types compile

### Task 2: Write Failing Tests for Pipeline Types Validation
**File:** `apps/mcp-server/src/pipeline/pipeline.types.spec.ts`

1. Write tests for type guard functions:
   - `isValidStageType(value)` — validates 'command' | 'agent' | 'skill'
   - `isValidPipelineDefinition(value)` — validates definition structure
   - `isValidPipelineStage(value)` — validates stage structure
2. Run tests — Expected: FAIL (functions don't exist yet)
3. Implement the type guards in `pipeline.types.ts`
4. Run tests — Expected: PASS

### Task 3: Write Failing Tests for Stage Executors
**File:** `apps/mcp-server/src/pipeline/pipeline.executors.spec.ts`

1. Write tests for `executeStage(stage, input)`:
   - Command stage: executes shell command with input as env var, returns stdout
   - Agent stage: returns formatted agent prompt with input context
   - Skill stage: returns formatted skill invocation with input context
   - Unknown stage type: throws error
   - Command stage failure: returns error result
2. Run tests — Expected: FAIL
3. Implement `pipeline.executors.ts` with `executeStage()` pure function
4. Run tests — Expected: PASS

### Task 4: Write Failing Tests for Pipeline Service
**File:** `apps/mcp-server/src/pipeline/pipeline.service.spec.ts`

1. Write tests for `PipelineService`:
   - `runPipeline()` — runs all stages sequentially, passes output between stages
   - `runPipeline()` — stops on stage failure, marks pipeline as 'failed'
   - `runPipeline()` — handles empty pipeline (no stages)
   - `runPipeline()` — handles single stage pipeline
   - `getStatus()` — returns execution status by ID
   - `getStatus()` — returns undefined for unknown ID
   - `resumePipeline()` — resumes from failed stage (not restart)
   - `resumePipeline()` — throws for unknown execution ID
   - `resumePipeline()` — throws for already completed pipeline
   - Data passing: output of stage N is input to stage N+1
   - Progress tracking: currentStageIndex updates during execution
2. Run tests — Expected: FAIL
3. Implement `pipeline.service.ts`
4. Run tests — Expected: PASS

### Task 5: Write Failing Tests for Pipeline Handler
**File:** `apps/mcp-server/src/mcp/handlers/pipeline.handler.spec.ts`

1. Write tests for `PipelineHandler`:
   - `handle('run_pipeline', ...)` — valid pipeline definition
   - `handle('run_pipeline', ...)` — missing required fields
   - `handle('pipeline_status', ...)` — valid execution ID
   - `handle('pipeline_status', ...)` — missing execution ID
   - `handle('pipeline_status', ...)` — unknown execution ID
   - `handle('unknown_tool', ...)` — returns null
   - `getToolDefinitions()` — returns correct definitions
2. Run tests — Expected: FAIL
3. Implement `pipeline.handler.ts` extending `AbstractHandler`
4. Run tests — Expected: PASS

### Task 6: Create Pipeline Module and Register
**Files:** `apps/mcp-server/src/pipeline/pipeline.module.ts`, `apps/mcp-server/src/pipeline/index.ts`

1. Create `PipelineModule` NestJS module
2. Export `PipelineService` from module
3. Create `index.ts` barrel export
4. Add `PipelineHandler` to `apps/mcp-server/src/mcp/handlers/index.ts`
5. Add `PipelineModule` to `McpModule` imports
6. Add `PipelineHandler` to handlers array in `mcp.module.ts`
7. Run `yarn workspace codingbuddy build` — verify compilation
8. Run `yarn workspace codingbuddy test` — verify all tests pass

### Task 7: Final CI Verification
1. Run `yarn workspace codingbuddy build` — zero errors
2. Run `yarn workspace codingbuddy test` — all tests pass
3. Verify no lint errors
