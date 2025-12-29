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
