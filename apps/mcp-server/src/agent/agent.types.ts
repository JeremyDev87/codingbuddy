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
  taskPrompt?: string;
  description: string;
  summary?: {
    expertise: string[];
    primaryFocus: string;
    fullPromptAvailable: boolean;
  };
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
 * Dispatch parameters for a single agent, ready to use with Claude Code Task tool
 */
export interface DispatchParams {
  subagent_type: 'general-purpose';
  prompt: string;
  description: string;
  run_in_background?: true;
}

/**
 * A dispatched agent with metadata and Task-tool-ready parameters
 */
export interface DispatchedAgent {
  name: string;
  displayName: string;
  description: string;
  dispatchParams: DispatchParams;
}

/**
 * Result of dispatching agents for execution
 */
export interface DispatchResult {
  primaryAgent?: DispatchedAgent;
  parallelAgents?: DispatchedAgent[];
  executionHint: string;
  /** Agents that failed to load */
  failedAgents?: FailedAgent[];
}

/**
 * Input parameters for the dispatch_agents tool
 */
export interface DispatchAgentsInput {
  mode: Mode;
  taskDescription?: string;
  targetFiles?: string[];
  specialists?: string[];
  includeParallel?: boolean;
  primaryAgent?: string;
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

  // Observability-related files
  metrics: ['observability-specialist', 'performance-specialist'],
  tracing: ['observability-specialist'],
  monitoring: ['observability-specialist', 'devops-engineer'],
  telemetry: ['observability-specialist'],
  logging: ['observability-specialist'],
  alert: ['observability-specialist'],
  sli: ['observability-specialist'],
  slo: ['observability-specialist'],

  // Event architecture files
  event: ['event-architecture-specialist'],
  queue: ['event-architecture-specialist'],
  message: ['event-architecture-specialist'],
  saga: ['event-architecture-specialist'],
  websocket: ['event-architecture-specialist', 'performance-specialist'],
  consumer: ['event-architecture-specialist'],
  producer: ['event-architecture-specialist'],

  // Migration-related files
  migration: ['migration-specialist', 'data-engineer'],
  migrate: ['migration-specialist'],
  upgrade: ['migration-specialist'],
  legacy: ['migration-specialist', 'architecture-specialist'],
  deprecate: ['migration-specialist', 'documentation-specialist'],
  rollback: ['migration-specialist'],
  cutover: ['migration-specialist'],
  versioning: ['migration-specialist', 'integration-specialist'],
};
