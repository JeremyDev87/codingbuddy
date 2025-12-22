export const KEYWORDS = ['PLAN', 'ACT', 'EVAL'] as const;

export type Mode = (typeof KEYWORDS)[number];

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
