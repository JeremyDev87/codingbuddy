import { Injectable } from '@nestjs/common';
import type {
  SkillRecommendation,
  RecommendSkillsResult,
  ListSkillsResult,
  ListSkillsOptions,
  SkillInfo,
} from './skill-recommendation.types';
import { getSortedTriggers } from './skill-triggers';
import { SKILL_KEYWORDS } from './i18n/keywords';
import { RulesService } from '../rules/rules.service';

const DEFAULT_PRIORITY = 0;

/**
 * Get skill description from SKILL_KEYWORDS (single source of truth)
 */
function getSkillDescription(skillName: string): string {
  const skill = SKILL_KEYWORDS.find(s => s.skillName === skillName);
  return skill?.description ?? `Skill: ${skillName}`;
}

/**
 * Service for recommending skills based on user prompts
 */
@Injectable()
export class SkillRecommendationService {
  constructor(private readonly rulesService: RulesService) {}
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
    const skillMatches = new Map<string, { matchedPatterns: string[]; priority: number }>();

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
        description: getSkillDescription(skillName),
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

  /**
   * Lists all available skills with optional filtering
   * @param options Optional filtering options
   * @returns ListSkillsResult with skills and total count
   * @example
   * // Get all skills
   * listSkills()
   * // => { skills: [...], total: 8 }
   *
   * @example
   * // Filter by minimum priority
   * listSkills({ minPriority: 20 })
   * // => { skills: [debugging, executing-plans, writing-plans], total: 3 }
   */
  async listSkills(options?: ListSkillsOptions): Promise<ListSkillsResult> {
    const fsSkills = await this.rulesService.listSkillsFromDir();

    let skills: SkillInfo[] = fsSkills.map(fsSkill => {
      const kwEntry = SKILL_KEYWORDS.find(k => k.skillName === fsSkill.name);
      return {
        name: fsSkill.name,
        priority: kwEntry?.priority ?? DEFAULT_PRIORITY,
        description: fsSkill.description,
        concepts: kwEntry ? Object.keys(kwEntry.concepts) : [],
      };
    });

    // Apply filters
    if (options?.minPriority !== undefined) {
      skills = skills.filter(s => s.priority >= options.minPriority!);
    }
    if (options?.maxPriority !== undefined) {
      skills = skills.filter(s => s.priority <= options.maxPriority!);
    }

    // Sort by priority descending
    skills.sort((a, b) => b.priority - a.priority);

    return {
      skills,
      total: skills.length,
    };
  }
}
