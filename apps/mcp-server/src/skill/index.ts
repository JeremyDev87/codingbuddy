/**
 * Skill Recommendation Module
 *
 * Provides skill recommendation functionality based on user prompts.
 * Supports multilingual keyword matching (EN, KO, JA, ZH, ES).
 */

// Types
export * from './skill-recommendation.types';

// Service
export { SkillRecommendationService } from './skill-recommendation.service';

// Triggers (for direct access if needed)
export { getSkillTriggers, getSortedTriggers } from './skill-triggers';

// i18n
export * from './i18n';
