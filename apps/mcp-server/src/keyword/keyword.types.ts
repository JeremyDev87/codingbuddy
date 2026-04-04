import type { DiffAnalysisResult } from './diff-analyzer';
import type { CouncilPreset } from '../agent/council-preset.types';
import type { CouncilSummary } from '../collaboration/council-summary.types';

export const KEYWORDS = ['PLAN', 'ACT', 'EVAL', 'AUTO'] as const;

export type Mode = (typeof KEYWORDS)[number];

/** Mode Agent names in priority order */
export const MODE_AGENTS = ['plan-mode', 'act-mode', 'eval-mode', 'auto-mode'] as const;

/** Primary Agents for PLAN mode - centralized definition */
export const PLAN_PRIMARY_AGENTS = ['solution-architect', 'technical-planner'] as const;

/**
 * Primary Agents for ACT mode - centralized definition.
 *
 * NOTE: Array order here does NOT reflect intent-pattern priority.
 * Intent matching priority is determined by INTENT_PATTERN_CHECKS in intent-pattern-checks.ts.
 * This array is used for type-safe validation and display info mapping only.
 */
export const ACT_PRIMARY_AGENTS = [
  'tooling-engineer', // Config/build tools specialist - highest priority for pattern matching
  'platform-engineer', // IaC, Kubernetes, multi-cloud specialist - high priority for infra tasks
  'data-engineer', // Database/schema specialist - high priority for data tasks
  'data-scientist', // EDA, statistical analysis, ML modeling, visualization, Jupyter notebooks
  'ai-ml-engineer', // ML frameworks, LLM integration, embeddings, fine-tuning
  'mobile-developer', // Mobile app specialist - detected by project files
  'frontend-developer',
  'backend-developer',
  'devops-engineer',
  'agent-architect',
  'test-engineer', // TDD, unit/integration/e2e test specialist
  'security-engineer', // Security features implementation & vulnerability remediation (intent priority: 5th)
  'systems-developer', // Rust, C, C++, FFI, WASM, embedded, low-level optimization (intent priority: 6th)
  'software-engineer', // fallback default — no intent patterns, language-agnostic generalist
] as const;

/** Primary Agent for EVAL mode - centralized definition */
export const EVAL_PRIMARY_AGENT = 'code-reviewer' as const;

/**
 * Default Primary Agent for ACT mode when no other source determines it.
 *
 * This is intentionally a separate constant rather than ACT_PRIMARY_AGENTS[0] to:
 * 1. Make the default explicit and discoverable
 * 2. Allow changing array order without affecting default behavior
 * 3. Provide clear documentation of the fallback agent
 *
 * @see ACT_PRIMARY_AGENTS for the full list of ACT mode agents
 */
export const DEFAULT_ACT_AGENT = 'software-engineer' as const;

/** All Primary Agents (Tier 1) - combined list */
export const ALL_PRIMARY_AGENTS = [
  ...PLAN_PRIMARY_AGENTS,
  ...ACT_PRIMARY_AGENTS,
  EVAL_PRIMARY_AGENT,
] as const;

export type ActPrimaryAgent = (typeof ACT_PRIMARY_AGENTS)[number];
export type PrimaryAgent = (typeof ALL_PRIMARY_AGENTS)[number];

/**
 * Agent display info for CLI prompts and UI.
 *
 * This is a lightweight summary derived from agent JSON files.
 * For full agent profiles, use RulesService.getAgentContent().
 *
 * NOTE: Keep in sync with packages/rules/.ai-rules/agents/*.json
 */
export interface AgentDisplayInfo {
  name: string;
  description: string;
}

/**
 * ACT mode agent display info for CLI prompts.
 *
 * This provides human-readable names and short descriptions for each ACT Primary Agent.
 * The data should match the 'name' and 'description' fields in agent JSON files.
 */
export const ACT_AGENT_DISPLAY_INFO: Record<ActPrimaryAgent, AgentDisplayInfo> = {
  'tooling-engineer': {
    name: 'Tooling Engineer',
    description: 'Config, build tools, bundlers (webpack, vite, eslint)',
  },
  'platform-engineer': {
    name: 'Platform Engineer',
    description: 'Terraform, Kubernetes, Helm, multi-cloud, GitOps',
  },
  'data-engineer': {
    name: 'Data Engineer',
    description: 'Database, schema design, migrations, analytics',
  },
  'data-scientist': {
    name: 'Data Scientist',
    description: 'EDA, statistical analysis, ML modeling, data visualization, Jupyter notebooks',
  },
  'ai-ml-engineer': {
    name: 'AI/ML Engineer',
    description: 'ML frameworks, LLM integration, embeddings, fine-tuning',
  },
  'mobile-developer': {
    name: 'Mobile Developer',
    description: 'React Native, Flutter, iOS, Android',
  },
  'frontend-developer': {
    name: 'Frontend Developer',
    description: 'React, Vue, Angular, Web UI development',
  },
  'backend-developer': {
    name: 'Backend Developer',
    description: 'Node.js, NestJS, Express, API development',
  },
  'devops-engineer': {
    name: 'DevOps Engineer',
    description: 'CI/CD, Docker, Kubernetes, infrastructure',
  },
  'agent-architect': {
    name: 'Agent Architect',
    description: 'AI agent systems, MCP servers, LLM integration',
  },
  'test-engineer': {
    name: 'Test Engineer',
    description: 'TDD, unit/integration/e2e testing, coverage improvement',
  },
  'security-engineer': {
    name: 'Security Engineer',
    description: 'Security implementation, vulnerability fixes, auth/authz, encryption',
  },
  'systems-developer': {
    name: 'Systems Developer',
    description: 'Rust, C, C++, FFI, WASM, embedded, low-level performance',
  },
  'software-engineer': {
    name: 'Software Engineer',
    description: 'General-purpose engineer — any language, any domain, TDD-first',
  },
};

/** Localized keywords mapped to their English equivalents */
export const LOCALIZED_KEYWORD_MAP: Record<string, Mode> = {
  // Korean (한국어)
  계획: 'PLAN',
  실행: 'ACT',
  평가: 'EVAL',
  자동: 'AUTO',
  // Japanese (日本語)
  計画: 'PLAN',
  実行: 'ACT',
  評価: 'EVAL',
  自動: 'AUTO',
  // Chinese Simplified (简体中文)
  计划: 'PLAN',
  执行: 'ACT',
  评估: 'EVAL',
  自动: 'AUTO',
  // Spanish (Español) - stored uppercase, matched case-insensitively
  PLANIFICAR: 'PLAN',
  ACTUAR: 'ACT',
  EVALUAR: 'EVAL',
  AUTOMÁTICO: 'AUTO',
  // Portuguese (Português) - stored uppercase, matched case-insensitively
  PLANEJAR: 'PLAN',
  EXECUTAR: 'ACT',
  AVALIAR: 'EVAL',
  AUTOMÁTICO_PT: 'AUTO',
  // German (Deutsch) - stored uppercase, matched case-insensitively
  PLANEN: 'PLAN',
  AUSFÜHREN: 'ACT',
  BEWERTEN: 'EVAL',
  AUTOMATISCH: 'AUTO',
  // French (Français) - stored uppercase, matched case-insensitively
  PLANIFIER: 'PLAN',
  EXÉCUTER: 'ACT',
  ÉVALUER: 'EVAL',
  AUTOMATIQUE: 'AUTO',
} as const;

/**
 * Language display info for CLI prompts and UI.
 *
 * This maps ISO 639-1 language codes to display names and descriptions.
 * Languages listed here are supported for localized keywords in LOCALIZED_KEYWORD_MAP.
 */
export interface LanguageDisplayInfo {
  name: string;
  nativeName: string;
  description: string;
}

/**
 * Supported languages for CLI prompts.
 *
 * Order matters - first entry is the default.
 * Language codes follow ISO 639-1 standard.
 */
export const SUPPORTED_LANGUAGES: Record<string, LanguageDisplayInfo> = {
  en: {
    name: 'English',
    nativeName: 'English',
    description: 'AI responses will be in English',
  },
  ko: {
    name: 'Korean',
    nativeName: '한국어',
    description: 'AI responses will be in Korean',
  },
  ja: {
    name: 'Japanese',
    nativeName: '日本語',
    description: 'AI responses will be in Japanese',
  },
  zh: {
    name: 'Chinese',
    nativeName: '中文',
    description: 'AI responses will be in Chinese',
  },
  es: {
    name: 'Spanish',
    nativeName: 'Español',
    description: 'AI responses will be in Spanish',
  },
  pt: {
    name: 'Portuguese',
    nativeName: 'Português',
    description: 'AI responses will be in Portuguese',
  },
  de: {
    name: 'German',
    nativeName: 'Deutsch',
    description: 'AI responses will be in German',
  },
  fr: {
    name: 'French',
    nativeName: 'Français',
    description: 'AI responses will be in French',
  },
} as const;

/** Default language code */
export const DEFAULT_LANGUAGE_CODE = 'en' as const;

/**
 * Type-safe language code type derived from SUPPORTED_LANGUAGES keys.
 * Use this type for function parameters and return types.
 */
export type SupportedLanguageCode = keyof typeof SUPPORTED_LANGUAGES;

/**
 * List of supported language codes.
 *
 * Note: Object.keys() returns string[] at runtime, but we use a type assertion
 * here because SUPPORTED_LANGUAGES is defined with `as const` and its shape
 * is guaranteed at compile time. The order matches SUPPORTED_LANGUAGES definition.
 */
export const SUPPORTED_LANGUAGE_CODES: SupportedLanguageCode[] = Object.keys(
  SUPPORTED_LANGUAGES,
) as SupportedLanguageCode[];

/**
 * Type guard to check if a string is a valid supported language code.
 *
 * @param code - The string to check
 * @returns True if the code is a valid SupportedLanguageCode
 *
 * @example
 * ```typescript
 * const userInput = getUserLanguagePreference(); // string
 *
 * if (isValidLanguageCode(userInput)) {
 *   // TypeScript narrows userInput to SupportedLanguageCode
 *   const langInfo = SUPPORTED_LANGUAGES[userInput];
 *   console.log(`Selected: ${langInfo.nativeName}`);
 * } else {
 *   console.log(`Invalid language code: ${userInput}`);
 * }
 * ```
 */
export const isValidLanguageCode = (code: string): code is SupportedLanguageCode => {
  return code in SUPPORTED_LANGUAGES;
};

/** @deprecated Use LOCALIZED_KEYWORD_MAP instead */
export const KOREAN_KEYWORD_MAP = LOCALIZED_KEYWORD_MAP;

export interface RuleContent {
  name: string;
  content: string;
}

export interface AgentInfo {
  name: string;
  description: string;
  expertise: string[];
}

/** Dispatch strength for parallel agent execution */
export type DispatchStrength = 'auto' | 'recommend' | 'skip';

/** Default dispatch strength by mode */
export const MODE_DISPATCH_DEFAULTS: Record<Mode, DispatchStrength> = {
  EVAL: 'auto',
  PLAN: 'recommend',
  ACT: 'recommend',
  AUTO: 'recommend',
};

export interface ParallelAgentRecommendation {
  specialists: string[];
  hint: string;
  /** Dispatch strength: "auto" (must dispatch), "recommend" (suggested), "skip" (do not dispatch) */
  dispatch?: DispatchStrength;
}

/**
 * Skill content included in parse_mode response for forced execution.
 * When AI clients receive this, they have the full skill content
 * without needing additional tool calls.
 */
export interface IncludedSkill {
  /** Skill name (e.g., 'brainstorming', 'test-driven-development') */
  name: string;
  /** Human-readable description */
  description: string;
  /** Full skill instructions content (markdown) */
  content: string;
  /** Why this skill was included */
  reason: string;
}

/**
 * Agent system prompt included in parse_mode response for forced execution.
 * When AI clients receive this, they have the full agent context
 * without needing additional tool calls.
 */
export interface IncludedAgent {
  /** Agent name (e.g., 'frontend-developer', 'code-reviewer') */
  name: string;
  /** Full system prompt for the agent */
  systemPrompt: string;
  /** Agent's areas of expertise */
  expertise: string[];
}

/** Source of Primary Agent selection */
export type PrimaryAgentSource =
  | 'explicit'
  | 'explicit_patterns'
  | 'config'
  | 'intent'
  | 'context'
  | 'default';

/** Result of Primary Agent resolution */
export interface PrimaryAgentResolutionResult {
  agentName: string;
  source: PrimaryAgentSource;
  confidence: number; // 0-1
  reason: string;
}

/** Context for Primary Agent resolution (optional) */
export interface ResolutionContext {
  filePath?: string;
  projectType?: string;
}

/** ACT mode agent recommendation from PLAN mode */
export interface ActAgentRecommendation {
  agentName: string;
  reason: string;
  confidence: number;
}

/** Agent/Skill activation record for transparency */
export interface AgentActivation {
  type: 'agent' | 'skill';
  name: string;
  tier: 'primary' | 'specialist';
  activatedBy?: string; // Parent agent that invoked this
  timestamp: string;
}

/** Activation message for user visibility */
export interface ActivationMessage {
  activations: AgentActivation[];
  formatted: string; // Pre-formatted message for display
}

/** AUTO mode configuration */
export interface AutoConfig {
  /** Maximum PLAN → ACT → EVAL iterations */
  maxIterations: number;
}

/**
 * Default maximum number of skills to auto-include in parse_mode response.
 * Limits response size while providing relevant skill content.
 * Can be overridden via project config `ai.maxIncludedSkills`.
 */
export const DEFAULT_MAX_INCLUDED_SKILLS = 3;

/**
 * Task complexity classification for SRP (Structured Reasoning Process).
 *
 * - SIMPLE: Direct answer without full SRP cycle
 * - COMPLEX: Full SRP cycle required (DECOMPOSE → SOLVE → VERIFY → SYNTHESIZE → REFLECT)
 */
export type TaskComplexity = 'SIMPLE' | 'COMPLEX';

/**
 * User override flags for SRP application.
 *
 * - --srp: Force SRP even for SIMPLE tasks
 * - --no-srp: Skip SRP even for COMPLEX tasks
 */
export type SrpOverride = 'force' | 'skip' | 'auto';

/**
 * Result of complexity classification.
 */
export interface ComplexityClassification {
  /** Classified complexity level */
  complexity: TaskComplexity;
  /** Human-readable reason for classification */
  reason: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Matched indicators that led to classification */
  matchedIndicators: string[];
  /** Whether SRP should be applied (considering overrides) */
  applySrp: boolean;
  /** User override if present */
  override?: SrpOverride;
}

/**
 * Result of parsing a workflow mode from user prompt.
 *
 * **Naming Convention Note:**
 * This interface uses mixed naming conventions intentionally:
 * - snake_case properties (delegates_to, primary_agent_source, etc.) are used for
 *   MCP protocol compatibility and external API responses consumed by AI tools.
 * - camelCase properties (originalPrompt, parallelAgentsRecommendation, etc.) are
 *   used for internal TypeScript usage and newer additions.
 *
 * Do not rename snake_case properties as they are part of the external API contract.
 */
export interface ParseModeResult {
  mode: Mode;
  originalPrompt: string;
  instructions: string;
  rules: RuleContent[];
  warnings?: string[];
  agent?: string;
  /** @apiProperty External API - do not rename */
  delegates_to?: string;
  /** @apiProperty External API - do not rename */
  delegate_agent_info?: AgentInfo;
  /** @apiProperty External API - do not rename. Source of Primary Agent selection */
  primary_agent_source?: PrimaryAgentSource;
  parallelAgentsRecommendation?: ParallelAgentRecommendation;
  /** @apiProperty External API - do not rename. ACT mode agent recommendation (only in PLAN mode response) */
  recommended_act_agent?: ActAgentRecommendation;
  /** @apiProperty External API - do not rename. Available ACT agents for selection (only in PLAN mode response) */
  available_act_agents?: string[];
  /** @apiProperty External API - do not rename. Activation message for user visibility */
  activation_message?: ActivationMessage;
  /** AUTO mode configuration (only in AUTO mode response) */
  autoConfig?: AutoConfig;
  /** @apiProperty External API - do not rename. Task complexity classification (only in PLAN mode response) */
  complexity?: ComplexityClassification;
  /** @apiProperty External API - do not rename. SRP instructions (only when complexity is COMPLEX) */
  srpInstructions?: string;
  /**
   * @apiProperty External API - do not rename.
   * Auto-included skills based on prompt analysis.
   * AI clients should execute these skills without additional tool calls.
   */
  included_skills?: IncludedSkill[];
  /**
   * @apiProperty External API - do not rename.
   * Auto-included primary agent with full system prompt.
   * AI clients should adopt this agent's persona without additional tool calls.
   */
  included_agent?: IncludedAgent;
  /**
   * @apiProperty External API - do not rename.
   * Pre-built dispatch data for Task tool execution.
   * When present, AI clients can directly use dispatchParams with the Task tool
   * without needing to call dispatch_agents or prepare_parallel_agents.
   */
  dispatchReady?: DispatchReady;
  /** @apiProperty External API - do not rename. Available execution strategies (e.g. ['subagent', 'taskmaestro']) */
  availableStrategies?: string[];
  /** @apiProperty External API - do not rename. Hint for installing TaskMaestro when not available */
  taskmaestroInstallHint?: string;
  /**
   * @apiProperty External API - do not rename.
   * Visual data for agent visualization (banner, agent faces, collaboration config).
   * When present, AI clients can render agent characters and collaboration format.
   */
  visual?: VisualData;
  /**
   * @apiProperty External API - do not rename.
   * Git diff-based analysis result used as secondary signal for agent recommendation.
   * Present when staged or unstaged changes exist in the working directory.
   */
  diffAnalysis?: DiffAnalysisResult;
  /**
   * @apiProperty External API - do not rename.
   * Deterministic council preset for the current mode.
   * Present in PLAN and EVAL modes — lists the primary agent and specialist reviewers
   * that form the council for that mode. Absent for ACT/AUTO modes.
   */
  councilPreset?: CouncilPreset;
  /**
   * @apiProperty External API - do not rename.
   * Structured consensus summary from specialist council outputs.
   * Present only when specialist results have been collected and aggregated.
   * Clients should treat this as read-only diagnostic data.
   */
  councilSummary?: CouncilSummary;
}

/**
 * Dispatch parameters for Task tool execution (keyword-module-local definition
 * to avoid circular dependency with agent.types).
 */
export interface DispatchReadyParams {
  subagent_type: 'general-purpose';
  prompt: string;
  description: string;
  run_in_background?: true;
}

/**
 * A dispatch-ready agent with metadata and Task-tool-ready parameters.
 */
export interface DispatchReadyAgent {
  name: string;
  displayName: string;
  description: string;
  dispatchParams: DispatchReadyParams;
}

/**
 * Pre-built dispatch data included in parse_mode response.
 * Eliminates the need for separate dispatch_agents or prepare_parallel_agents calls.
 */
export interface DispatchReady {
  primaryAgent?: DispatchReadyAgent;
  parallelAgents?: DispatchReadyAgent[];
}

// ============================================================================
// Visual Data Types (for parse_mode response agent visualization)
// ============================================================================

/** Raw visual data from agent JSON files */
export interface AgentVisualRaw {
  eye?: string;
  eyeFallback?: string;
  colorAnsi?: string;
  group?: string;
}

/** Visual information for an agent in parse_mode response */
export interface AgentVisualInfo {
  /** Agent display name */
  name: string;
  /** Face expression using eye symbols (e.g., "⬡‿⬡") */
  face: string;
  /** Display color name */
  color: string;
  /** Agent status in current mode */
  status: 'analyzing' | 'waiting' | 'active';
}

/** Collaboration display configuration */
export interface CollaborationConfig {
  /** Display format: "minimal" (eco) or "discussion" (full) */
  format: 'minimal' | 'discussion';
  /** Render hint for AI clients */
  renderHint: string;
}

/** Visual data included in parse_mode response for agent visualization */
export interface VisualData {
  /** ASCII art banner with mode character */
  banner: string;
  /** Agent visual information */
  agents: AgentVisualInfo[];
  /** Collaboration display configuration */
  collaboration: CollaborationConfig;
}

/** Re-export DiffAnalysisResult for consumers */
export type { DiffAnalysisResult, DiffAgentScore } from './diff-analyzer';

export interface ModeConfig {
  description: string;
  instructions: string;
  rules: string[];
  agent?: string;
  delegates_to?: string;
  defaultSpecialists?: string[];
}

export interface KeywordModesConfig {
  modes: Record<Mode, ModeConfig>;
  defaultMode: Mode;
}
