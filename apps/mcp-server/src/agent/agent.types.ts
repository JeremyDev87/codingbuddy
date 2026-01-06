import type { Mode } from '../keyword/keyword.types';

/**
 * Context for agent prompt generation
 */
export interface AgentContext {
  mode: Mode;
  targetFiles?: string[];
  taskDescription?: string;
}

/**
 * Complete system prompt for a single agent
 */
export interface AgentSystemPrompt {
  agentName: string;
  displayName: string;
  systemPrompt: string;
  description: string;
  outputSchema?: Record<string, unknown>;
}

/**
 * Prepared agent for parallel execution via Claude Code Task tool
 */
export interface PreparedAgent {
  id: string;
  displayName: string;
  taskPrompt: string;
  description: string;
}

/**
 * Information about an agent that failed to load
 */
export interface FailedAgent {
  id: string;
  reason: string;
}

/**
 * Set of agents prepared for parallel execution
 */
export interface ParallelAgentSet {
  agents: PreparedAgent[];
  parallelExecutionHint: string;
  /** Agents that failed to load (included for user feedback) */
  failedAgents?: FailedAgent[];
}

/**
 * File pattern to specialist mapping for recommendations
 */
export const FILE_PATTERN_SPECIALISTS: Record<string, string[]> = {
  // Security-related files
  auth: ['security-specialist'],
  login: ['security-specialist', 'accessibility-specialist'],
  password: ['security-specialist'],
  token: ['security-specialist'],
  oauth: ['security-specialist'],
  jwt: ['security-specialist'],

  // UI component files
  component: [
    'accessibility-specialist',
    'ui-ux-designer',
    'performance-specialist',
  ],
  button: ['accessibility-specialist', 'ui-ux-designer'],
  form: ['accessibility-specialist', 'security-specialist'],
  input: ['accessibility-specialist'],
  modal: ['accessibility-specialist', 'ui-ux-designer'],

  // Page files
  page: [
    'seo-specialist',
    'accessibility-specialist',
    'performance-specialist',
  ],
  layout: ['seo-specialist', 'accessibility-specialist'],

  // Data/API files
  api: ['security-specialist', 'performance-specialist'],
  hook: ['test-strategy-specialist', 'performance-specialist'],
  service: ['architecture-specialist', 'test-strategy-specialist'],
  util: ['test-strategy-specialist', 'code-quality-specialist'],
};
