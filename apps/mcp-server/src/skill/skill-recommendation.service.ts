import { Injectable } from '@nestjs/common';
import type {
  SkillRecommendation,
  RecommendSkillsResult,
} from './skill-recommendation.types';
import { getSortedTriggers } from './skill-triggers';

/**
 * Skill descriptions for recommendations
 */
const SKILL_DESCRIPTIONS: Record<string, string> = {
  'systematic-debugging': 'Systematic approach to debugging',
  'test-driven-development': 'Test-driven development workflow',
  brainstorming: 'Explore requirements before implementation',
  'executing-plans': 'Execute implementation plans with checkpoints',
  'writing-plans': 'Create implementation plans',
  'frontend-design': 'Build production-grade UI components',
  'subagent-driven-development': 'Execute plans in current session',
  'dispatching-parallel-agents': 'Handle parallel independent tasks',
};

/**
 * Service for recommending skills based on user prompts
 */
@Injectable()
export class SkillRecommendationService {
  /**
   * Recommends skills based on the given prompt
   * @param prompt User's input prompt
   * @returns RecommendSkillsResult with recommendations and original prompt
   */
  recommendSkills(prompt: string): RecommendSkillsResult {
    const trimmedPrompt = prompt.trim();

    // Handle empty or whitespace-only input
    if (trimmedPrompt.length === 0) {
      return {
        recommendations: [],
        originalPrompt: prompt,
      };
    }

    const triggers = getSortedTriggers();
    const skillMatches = new Map<
      string,
      { matchedPatterns: string[]; priority: number }
    >();

    // Test each trigger's patterns against the prompt
    for (const trigger of triggers) {
      const matchedPatterns: string[] = [];

      for (const pattern of trigger.patterns) {
        if (pattern.test(trimmedPrompt)) {
          // Extract the matched keyword from the pattern source
          const patternSource = pattern.source;
          matchedPatterns.push(patternSource);
        }
      }

      // Only add if there are matches and skill not already added
      if (matchedPatterns.length > 0 && !skillMatches.has(trigger.skillName)) {
        skillMatches.set(trigger.skillName, {
          matchedPatterns,
          priority: trigger.priority,
        });
      }
    }

    // Convert to SkillRecommendation array
    const recommendations: SkillRecommendation[] = [];

    for (const [skillName, { matchedPatterns }] of skillMatches) {
      const confidence = this.determineConfidence(matchedPatterns.length);

      recommendations.push({
        skillName,
        confidence,
        matchedPatterns,
        description: SKILL_DESCRIPTIONS[skillName] || `Skill: ${skillName}`,
      });
    }

    // Sort by priority (triggers are already sorted, but we need to maintain order from Map)
    recommendations.sort((a, b) => {
      const aPriority = skillMatches.get(a.skillName)?.priority ?? 0;
      const bPriority = skillMatches.get(b.skillName)?.priority ?? 0;
      return bPriority - aPriority;
    });

    return {
      recommendations,
      originalPrompt: prompt,
    };
  }

  /**
   * Determines confidence level based on number of matched patterns
   */
  private determineConfidence(matchCount: number): 'high' | 'medium' | 'low' {
    if (matchCount >= 3) {
      return 'high';
    }
    return 'medium';
  }
}
