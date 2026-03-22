# Task: Issue #840 - wire plan-reviewer as automatic gate after PLAN completion

## Objective
Modify `apps/mcp-server/src/mcp/handlers/mode.handler.ts` to automatically recommend plan-reviewer dispatch after PLAN completion.

## Requirements
- When parse_mode returns PLAN mode response, include plan-reviewer in specialist recommendations
- Add `planReviewGate` field to PLAN response: { enabled: true, agent: "plan-reviewer", dispatch: "recommend" }
- Configurable via project config (can be disabled)
- TDD: write tests FIRST in mode.handler.spec.ts
- DO NOT modify agent.handler.ts or context-document.handler.ts

## Read First
- `apps/mcp-server/src/mcp/handlers/mode.handler.ts` (current PLAN response)
- `apps/mcp-server/src/mcp/handlers/mode.handler.spec.ts` (existing tests)
- `packages/rules/.ai-rules/agents/plan-reviewer.json` (agent definition)

## Methodology — MANDATORY
Use codingbuddy PLAN→ACT→EVAL. Use /ship to create PR closing #840. Write RESULT.json after completion.

## RESULT.json Protocol
```json
{"status":"success|failure|error","issue":"#840","pr_number":null,"pr_url":null,"timestamp":"<ISO>","cost":null,"error":null}
```
