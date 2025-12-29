import type { SkillTrigger } from './skill-recommendation.types';
import { SKILL_KEYWORDS } from './i18n/keywords';
import {
  LANGUAGE_OPTIONS,
  type SupportedLanguage,
  type SkillKeywordConfig,
} from './i18n/keywords.types';

/**
 * Builds a RegExp pattern from keywords for a specific language
 *
 * Language-specific handling:
 * - EN, ES: Use word boundaries (\b) for accurate matching
 * - KO, JA, ZH: No word boundaries (agglutinative/isolating languages)
 */
export function buildPatternForLanguage(
  keywords: string[],
  language: SupportedLanguage,
): RegExp {
  const { useWordBoundary } = LANGUAGE_OPTIONS[language];

  // Escape special regex characters in keywords
  const escaped = keywords.map(
    kw => kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*'), // Allow flexible whitespace
  );

  if (useWordBoundary) {
    // EN, ES: use word boundaries for accurate word matching
    return new RegExp(`\\b(${escaped.join('|')})\\b`, 'i');
  } else {
    // KO, JA, ZH: no word boundaries needed
    return new RegExp(`(${escaped.join('|')})`, 'i');
  }
}

/**
 * Converts skill keyword configurations to SkillTrigger[] with RegExp patterns
 */
export function buildTriggersFromKeywords(
  config: SkillKeywordConfig[],
): SkillTrigger[] {
  return config.map(skill => {
    const patterns: RegExp[] = [];

    for (const conceptKeywords of Object.values(skill.concepts)) {
      for (const [lang, keywords] of Object.entries(conceptKeywords)) {
        if (Array.isArray(keywords) && keywords.length > 0) {
          patterns.push(
            buildPatternForLanguage(keywords, lang as SupportedLanguage),
          );
        }
      }
    }

    return {
      skillName: skill.skillName,
      patterns,
      priority: skill.priority,
    };
  });
}

let cachedTriggers: SkillTrigger[] | null = null;

/**
 * Gets cached skill triggers (builds on first call)
 */
export function getSkillTriggers(): SkillTrigger[] {
  if (!cachedTriggers) {
    cachedTriggers = buildTriggersFromKeywords(SKILL_KEYWORDS);
  }
  return cachedTriggers;
}

/**
 * Returns skill triggers sorted by priority (highest first)
 */
export function getSortedTriggers(): SkillTrigger[] {
  return [...getSkillTriggers()].sort((a, b) => b.priority - a.priority);
}

/**
 * Clears the trigger cache (useful for testing)
 */
export function clearTriggerCache(): void {
  cachedTriggers = null;
}
