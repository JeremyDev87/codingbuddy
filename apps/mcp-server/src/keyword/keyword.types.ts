export const KEYWORDS = ['PLAN', 'ACT', 'EVAL'] as const;

export type Mode = (typeof KEYWORDS)[number];

/** Mode Agent names in priority order */
export const MODE_AGENTS = ['plan-mode', 'act-mode', 'eval-mode'] as const;

export type ModeAgent = (typeof MODE_AGENTS)[number];

/** Primary Agents for PLAN mode - centralized definition */
export const PLAN_PRIMARY_AGENTS = [
  'solution-architect',
  'technical-planner',
] as const;

/** Primary Agents for ACT mode - centralized definition */
export const ACT_PRIMARY_AGENTS = [
  'tooling-engineer', // Config/build tools specialist - highest priority for pattern matching
  'data-engineer', // Database/schema specialist - high priority for data tasks
  'mobile-developer', // Mobile app specialist - detected by project files
  'frontend-developer',
  'backend-developer',
  'devops-engineer',
  'agent-architect',
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
export const DEFAULT_ACT_AGENT = 'frontend-developer' as const;

/** All Primary Agents (Tier 1) - combined list */
export const ALL_PRIMARY_AGENTS = [
  ...PLAN_PRIMARY_AGENTS,
  ...ACT_PRIMARY_AGENTS,
  EVAL_PRIMARY_AGENT,
] as const;

export type PlanPrimaryAgent = (typeof PLAN_PRIMARY_AGENTS)[number];
export type ActPrimaryAgent = (typeof ACT_PRIMARY_AGENTS)[number];
export type PrimaryAgent = (typeof ALL_PRIMARY_AGENTS)[number];

/**
 * Mutable string[] versions of Primary Agent constants.
 * Use these for runtime operations that require string[] type.
 * The readonly versions above provide compile-time type safety.
 */
export const PLAN_PRIMARY_AGENTS_LIST: string[] = [...PLAN_PRIMARY_AGENTS];
export const ACT_PRIMARY_AGENTS_LIST: string[] = [...ACT_PRIMARY_AGENTS];
export const ALL_PRIMARY_AGENTS_LIST: string[] = [...ALL_PRIMARY_AGENTS];

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
export const ACT_AGENT_DISPLAY_INFO: Record<ActPrimaryAgent, AgentDisplayInfo> =
  {
    'tooling-engineer': {
      name: 'Tooling Engineer',
      description: 'Config, build tools, bundlers (webpack, vite, eslint)',
    },
    'data-engineer': {
      name: 'Data Engineer',
      description: 'Database, schema design, migrations, analytics',
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
  };

/** Localized keywords mapped to their English equivalents */
export const LOCALIZED_KEYWORD_MAP: Record<string, Mode> = {
  // Korean (한국어)
  계획: 'PLAN',
  실행: 'ACT',
  평가: 'EVAL',
  // Japanese (日本語)
  計画: 'PLAN',
  実行: 'ACT',
  評価: 'EVAL',
  // Chinese Simplified (简体中文)
  计划: 'PLAN',
  执行: 'ACT',
  评估: 'EVAL',
  // Spanish (Español) - stored uppercase, matched case-insensitively
  PLANIFICAR: 'PLAN',
  ACTUAR: 'ACT',
  EVALUAR: 'EVAL',
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
  ko: {
    name: 'Korean',
    nativeName: '한국어',
    description: 'AI responses will be in Korean',
  },
  en: {
    name: 'English',
    nativeName: 'English',
    description: 'AI responses will be in English',
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
} as const;

/** Default language code */
export const DEFAULT_LANGUAGE_CODE = 'ko' as const;

/** List of supported language codes */
export const SUPPORTED_LANGUAGE_CODES = Object.keys(
  SUPPORTED_LANGUAGES,
) as (keyof typeof SUPPORTED_LANGUAGES)[];

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

export interface ParallelAgentRecommendation {
  specialists: string[];
  hint: string;
}

/** Source of Primary Agent selection */
export type PrimaryAgentSource =
  | 'explicit'
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

export interface ParseModeResult {
  mode: Mode;
  originalPrompt: string;
  instructions: string;
  rules: RuleContent[];
  warnings?: string[];
  agent?: string;
  delegates_to?: string;
  delegate_agent_info?: AgentInfo;
  /** Source of Primary Agent selection */
  primary_agent_source?: PrimaryAgentSource;
  parallelAgentsRecommendation?: ParallelAgentRecommendation;
  /** ACT mode agent recommendation (only in PLAN mode response) */
  recommended_act_agent?: ActAgentRecommendation;
  /** Available ACT agents for selection (only in PLAN mode response) */
  available_act_agents?: string[];
  /** Activation message for user visibility */
  activation_message?: ActivationMessage;
}

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
