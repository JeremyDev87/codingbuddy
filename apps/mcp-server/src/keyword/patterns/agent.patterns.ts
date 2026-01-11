/**
 * Agent Architect Intent Patterns
 *
 * These patterns detect prompts related to AI agent development,
 * workflow automation, and MCP server development.
 * Priority: 1st (moved up to prevent false positives from agent name mentions).
 *
 * Confidence Levels:
 * - 0.95: MCP-specific patterns, agent framework patterns
 * - 0.90: Workflow automation, LLM orchestration, agent creation (만들다)
 * - 0.85: Generic agent/automation keywords
 *
 * @example
 * "MCP 서버 만들어줘" → agent-architect (0.95)
 * "AI 에이전트 설계해줘" → agent-architect (0.90)
 * "워크플로우 자동화 구현" → agent-architect (0.90)
 * "Agent를 만드는 작업" → agent-architect (0.90)
 */

import type { IntentPattern } from './intent-patterns.types';

export const AGENT_INTENT_PATTERNS: ReadonlyArray<IntentPattern> = [
  // MCP-specific patterns (0.95)
  {
    pattern: /MCP\s*(서버|server|tool|도구)/i,
    confidence: 0.95,
    description: 'MCP Server',
  },
  {
    pattern: /model\s*context\s*protocol/i,
    confidence: 0.95,
    description: 'Model Context Protocol',
  },
  // Agent framework patterns (0.95)
  {
    pattern: /에이전트\s*(설계|개발|구현|아키텍처)/i,
    confidence: 0.95,
    description: 'Korean: Agent Development',
  },
  {
    pattern: /agent\s*(design|develop|architect|framework)/i,
    confidence: 0.95,
    description: 'Agent Development',
  },
  {
    pattern: /claude\s*(code|에이전트|agent|sdk)/i,
    confidence: 0.95,
    description: 'Claude Agent',
  },
  // Agent creation patterns using 만들다 verb (0.90)
  {
    pattern: /agent.?를?\s*만[들드]/i,
    confidence: 0.9,
    description: 'Korean: Creating Agent (with English)',
  },
  {
    pattern: /에이전트\s*만[들드]/i,
    confidence: 0.9,
    description: 'Korean: Creating Agent (native)',
  },
  // Agent JSON/schema patterns (0.90)
  {
    pattern: /\.json\s*(에이전트|agent)|agent.*\.json/i,
    confidence: 0.9,
    description: 'Agent JSON Definition',
  },
  {
    pattern: /specialist.*agent|agent.*specialist/i,
    confidence: 0.9,
    description: 'Specialist Agent',
  },
  {
    pattern: /primary.*agent|agent.*resolver|agent.*select/i,
    confidence: 0.9,
    description: 'Agent Resolution',
  },
  // Workflow automation (0.90)
  {
    pattern: /워크플로우\s*(자동화|설계|구현)/i,
    confidence: 0.9,
    description: 'Korean: Workflow Automation',
  },
  {
    pattern: /workflow\s*(automat|design|orchestrat)/i,
    confidence: 0.9,
    description: 'Workflow Automation',
  },
  {
    pattern: /LLM\s*(체인|chain|오케스트레이션|orchestrat)/i,
    confidence: 0.9,
    description: 'LLM Orchestration',
  },
  {
    pattern: /AI\s*에이전트\s*(설계|개발)|AI\s*agent\s*(design|develop)/i,
    confidence: 0.9,
    description: 'AI Agent Design',
  },
  // Generic patterns (0.85)
  {
    pattern: /자동화\s*(파이프라인|pipeline|시스템)/i,
    confidence: 0.85,
    description: 'Automation Pipeline',
  },
  {
    pattern: /tool\s*(use|calling|호출)|function\s*calling/i,
    confidence: 0.85,
    description: 'Tool Calling',
  },
  {
    pattern: /멀티\s*에이전트|multi.?agent/i,
    confidence: 0.85,
    description: 'Multi-Agent',
  },
];
