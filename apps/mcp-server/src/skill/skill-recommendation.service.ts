import { Injectable, type OnModuleInit } from '@nestjs/common';
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

const CONFIDENCE_RANK: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

interface CachedFrontmatterTrigger {
  pattern: RegExp;
  confidence: 'high' | 'medium' | 'low';
}

interface FrontmatterTriggerEntry {
  description: string;
  triggers: CachedFrontmatterTrigger[];
  userInvocable?: boolean;
}

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
export class SkillRecommendationService implements OnModuleInit {
  private frontmatterTriggerCache = new Map<string, FrontmatterTriggerEntry>();
  private skillMetadataCache = new Map<
    string,
    { userInvocable?: boolean; disableModelInvocation?: boolean }
  >();

  constructor(private readonly rulesService: RulesService) {}

  async onModuleInit(): Promise<void> {
    await this.loadFrontmatterTriggers();
  }

  /**
   * Loads and caches frontmatter triggers from SKILL.md files.
   * Called at module init and can be called manually for testing.
   */
  async loadFrontmatterTriggers(): Promise<void> {
    const skills = await this.rulesService.listSkillsFromDir();
    this.frontmatterTriggerCache.clear();
    this.skillMetadataCache.clear();

    for (const skill of skills) {
      if (skill.userInvocable !== undefined || skill.disableModelInvocation !== undefined) {
        this.skillMetadataCache.set(skill.name, {
          userInvocable: skill.userInvocable,
          disableModelInvocation: skill.disableModelInvocation,
        });
      }
      if (skill.triggers && skill.triggers.length > 0) {
        const compiled: CachedFrontmatterTrigger[] = [];
        for (const t of skill.triggers) {
          try {
            compiled.push({ pattern: new RegExp(t.pattern, 'i'), confidence: t.confidence });
          } catch {
            // Skip invalid regex patterns
          }
        }
        if (compiled.length > 0) {
          this.frontmatterTriggerCache.set(skill.name, {
            description: skill.description,
            triggers: compiled,
          });
        }
      }
    }
  }

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
      {
        matchedPatterns: string[];
        priority: number;
        confidence: 'high' | 'medium' | 'low';
        description: string;
      }
    >();

    // Step 1: Test keyword triggers against the prompt
    for (const trigger of triggers) {
      const matchedPatterns: string[] = [];

      for (const pattern of trigger.patterns) {
        if (pattern.test(trimmedPrompt)) {
          matchedPatterns.push(pattern.source);
        }
      }

      if (matchedPatterns.length > 0 && !skillMatches.has(trigger.skillName)) {
        skillMatches.set(trigger.skillName, {
          matchedPatterns,
          priority: trigger.priority,
          confidence: this.determineConfidence(matchedPatterns.length),
          description: getSkillDescription(trigger.skillName),
        });
      }
    }

    // Step 2: Check frontmatter triggers and merge
    for (const [skillName, entry] of this.frontmatterTriggerCache) {
      const fmMatchedPatterns: string[] = [];
      let bestConfidence: 'high' | 'medium' | 'low' = 'low';

      for (const trigger of entry.triggers) {
        if (trigger.pattern.test(trimmedPrompt)) {
          fmMatchedPatterns.push(trigger.pattern.source);
          if ((CONFIDENCE_RANK[trigger.confidence] ?? 0) > (CONFIDENCE_RANK[bestConfidence] ?? 0)) {
            bestConfidence = trigger.confidence;
          }
        }
      }

      if (fmMatchedPatterns.length > 0) {
        const existing = skillMatches.get(skillName);
        if (existing) {
          // Merge: add frontmatter patterns, use higher confidence
          const mergedPatterns = [...new Set([...existing.matchedPatterns, ...fmMatchedPatterns])];
          const existingRank = CONFIDENCE_RANK[existing.confidence] ?? 0;
          const newRank = CONFIDENCE_RANK[bestConfidence] ?? 0;
          existing.matchedPatterns = mergedPatterns;
          if (newRank > existingRank) {
            existing.confidence = bestConfidence;
          }
        } else {
          skillMatches.set(skillName, {
            matchedPatterns: fmMatchedPatterns,
            priority: 0,
            confidence: bestConfidence,
            description: entry.description,
          });
        }
      }
    }

    // Step 3: Convert to SkillRecommendation array, filter non-invocable, and sort
    const recommendations: SkillRecommendation[] = [];

    for (const [skillName, match] of skillMatches) {
      // Filter out skills explicitly marked as non-invocable
      const metadata = this.skillMetadataCache.get(skillName);
      if (metadata?.userInvocable === false) {
        continue;
      }
      if (metadata?.disableModelInvocation === true) {
        continue;
      }

      recommendations.push({
        skillName,
        confidence: match.confidence,
        matchedPatterns: match.matchedPatterns,
        description: match.description,
      });
    }

    // Sort by priority descending, then by confidence descending
    recommendations.sort((a, b) => {
      const aPriority = skillMatches.get(a.skillName)?.priority ?? 0;
      const bPriority = skillMatches.get(b.skillName)?.priority ?? 0;
      if (bPriority !== aPriority) return bPriority - aPriority;
      return (CONFIDENCE_RANK[b.confidence] ?? 0) - (CONFIDENCE_RANK[a.confidence] ?? 0);
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
      const info: SkillInfo = {
        name: fsSkill.name,
        priority: kwEntry?.priority ?? DEFAULT_PRIORITY,
        description: fsSkill.description,
        concepts: kwEntry ? Object.keys(kwEntry.concepts) : [],
      };

      // Include execution metadata only when present (backward compat)
      if (fsSkill.userInvocable !== undefined) info.userInvocable = fsSkill.userInvocable;
      if (fsSkill.disableModelInvocation !== undefined)
        info.disableModelInvocation = fsSkill.disableModelInvocation;
      if (fsSkill.context !== undefined) info.context = fsSkill.context;
      if (fsSkill.agent !== undefined) info.agent = fsSkill.agent;
      if (fsSkill.allowedTools !== undefined) info.allowedTools = fsSkill.allowedTools;

      return info;
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
