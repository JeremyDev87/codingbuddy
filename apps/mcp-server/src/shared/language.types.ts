/**
 * Language Service Types
 *
 * Defines types for language instruction generation based on config language setting
 */

type SupportedLanguage = 'ko' | 'en' | 'ja' | 'zh' | 'es' | 'de' | 'fr' | 'pt' | 'ru' | 'hi';

export interface LanguageInfo {
  /** Language code (ISO 639-1) */
  code: SupportedLanguage;
  /** Language name in English */
  name: string;
  /** Native language name (e.g., 한국어 for Korean) */
  nativeName?: string;
  /** AI instruction for this language */
  instruction: string;
}

export interface LanguageInstructionResult {
  /** Language code used */
  language: string;
  /** Generated instruction text */
  instruction: string;
  /** Whether fallback was used */
  fallback: boolean;
}
