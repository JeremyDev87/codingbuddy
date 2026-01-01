export const KEYWORDS = ['PLAN', 'ACT', 'EVAL'] as const;

export type Mode = (typeof KEYWORDS)[number];

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

export interface ParseModeResult {
  mode: Mode;
  originalPrompt: string;
  instructions: string;
  rules: RuleContent[];
  warnings?: string[];
}

export interface ModeConfig {
  description: string;
  instructions: string;
  rules: string[];
}

export interface KeywordModesConfig {
  modes: Record<Mode, ModeConfig>;
  defaultMode: Mode;
}
