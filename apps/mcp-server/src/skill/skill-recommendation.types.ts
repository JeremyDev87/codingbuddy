/**
 * Skill Recommendation Types
 */

export interface SkillTrigger {
  skillName: string;
  patterns: RegExp[];
  priority: number; // Higher = more specific
}

export interface SkillRecommendation {
  skillName: string;
  confidence: 'high' | 'medium' | 'low';
  matchedPatterns: string[];
  description: string;
}

export interface RecommendSkillsResult {
  recommendations: SkillRecommendation[];
  originalPrompt: string;
}

/**
 * Skill information for listing
 */
export interface SkillInfo {
  /** Unique skill identifier */
  name: string;
  /** Priority level (higher = more specific/important) */
  priority: number;
  /** Human-readable skill description */
  description: string;
  /**
   * Concept category names (keys) for this skill.
   * Note: Returns concept names like ["error", "fix"], not the actual keywords.
   * Use recommend_skills to get matched keywords for a specific prompt.
   */
  concepts: string[];
}

/**
 * Result of list_skills tool
 */
export interface ListSkillsResult {
  skills: SkillInfo[];
  total: number;
}

/**
 * Options for filtering skills
 */
export interface ListSkillsOptions {
  minPriority?: number;
  maxPriority?: number;
}
