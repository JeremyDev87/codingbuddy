/**
 * Supported languages for skill keyword matching
 */
export type SupportedLanguage = 'en' | 'ko' | 'ja' | 'zh' | 'es';

/**
 * Keywords for a single concept across all supported languages
 */
export type ConceptKeywords = {
  [lang in SupportedLanguage]: string[];
};

/**
 * Skill keyword configuration
 */
export interface SkillKeywordConfig {
  skillName: string;
  priority: number;
  description: string;
  concepts: {
    [conceptName: string]: ConceptKeywords;
  };
}

/**
 * Language-specific pattern options
 */
export const LANGUAGE_OPTIONS: Record<
  SupportedLanguage,
  { useWordBoundary: boolean }
> = {
  en: { useWordBoundary: true },
  ko: { useWordBoundary: false }, // 교착어
  ja: { useWordBoundary: false }, // 교착어
  zh: { useWordBoundary: false }, // 고립어
  es: { useWordBoundary: true },
};
