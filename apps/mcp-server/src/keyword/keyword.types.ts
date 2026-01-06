export const KEYWORDS = ['PLAN', 'ACT', 'EVAL'] as const;

export type Mode = (typeof KEYWORDS)[number];

/** Mode Agent names in priority order */
export const MODE_AGENTS = ['plan-mode', 'act-mode', 'eval-mode'] as const;

export type ModeAgent = (typeof MODE_AGENTS)[number];

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
export type PrimaryAgentSource = 'explicit' | 'config' | 'context' | 'default';

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
