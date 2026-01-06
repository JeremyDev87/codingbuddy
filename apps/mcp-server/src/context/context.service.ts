import { Injectable, Logger } from '@nestjs/common';
import { ChecklistService } from '../checklist/checklist.service';
import type { ChecklistDomain } from '../checklist/checklist.types';
import type {
  AnalyzeTaskInput,
  AnalyzeTaskOutput,
  TaskAnalysis,
  TaskIntent,
  RiskAssessment,
  RiskLevel,
  ComplexityLevel,
  RecommendedSpecialist,
  SuggestedWorkflow,
  ContextHints,
} from './context.types';
import {
  FILE_CATEGORY_PATTERNS,
  CATEGORY_RISK_LEVELS,
  CATEGORY_SPECIALISTS,
} from './context.types';
import { detectIntentFromPatterns } from './intent-patterns';
import {
  compileCategoryPatterns,
  findMatchingCategory,
} from '../shared/pattern-matcher';

/**
 * Pre-compiled file category patterns (initialized once at module load)
 */
const COMPILED_CATEGORY_PATTERNS = compileCategoryPatterns(
  FILE_CATEGORY_PATTERNS,
);

@Injectable()
export class ContextService {
  private readonly logger = new Logger(ContextService.name);

  constructor(private readonly checklistService: ChecklistService) {}

  async analyzeTask(input: AnalyzeTaskInput): Promise<AnalyzeTaskOutput> {
    const { prompt, files, mode: _mode } = input;

    // Detect category from files
    const category = this.detectCategory(files);

    // Analyze task
    const analysis = this.buildAnalysis(prompt, category, files);

    // Assess risk
    const riskAssessment = this.assessRisk(category);

    // Generate checklists
    const checklistResult = await this.checklistService.generateChecklist({
      files,
      domains: this.getRelevantDomains(category),
    });

    // Recommend specialists
    const recommendedSpecialists = this.recommendSpecialists(category);

    // Suggest workflow
    const suggestedWorkflow = this.suggestWorkflow(analysis.intent);

    // Build context hints
    const contextHints = this.buildContextHints(category, riskAssessment.level);

    return {
      analysis,
      riskAssessment,
      checklists: checklistResult.checklists,
      checklistSummary: checklistResult.summary,
      matchedTriggers: checklistResult.matchedTriggers,
      recommendedSpecialists,
      suggestedWorkflow,
      contextHints,
    };
  }

  private detectCategory(files?: string[]): string {
    if (!files || files.length === 0) {
      return 'general';
    }

    // Check each file against pre-compiled category patterns
    for (const file of files) {
      const matchedCategory = findMatchingCategory(
        file,
        COMPILED_CATEGORY_PATTERNS,
      );
      if (matchedCategory) {
        return matchedCategory;
      }
    }

    return 'general';
  }

  private buildAnalysis(
    prompt: string,
    category: string,
    files?: string[],
  ): TaskAnalysis {
    const intent = this.detectIntent(prompt);
    const complexity = this.assessComplexity(files);
    const keywords = this.extractKeywords(prompt);

    return {
      intent,
      category,
      complexity,
      keywords,
    };
  }

  private detectIntent(prompt: string): TaskIntent {
    return detectIntentFromPatterns(prompt);
  }

  private assessComplexity(files?: string[]): ComplexityLevel {
    if (!files || files.length === 0) return 'low';
    if (files.length <= 2) return 'low';
    if (files.length <= 5) return 'medium';
    return 'high';
  }

  private extractKeywords(prompt: string): string[] {
    // Extract meaningful words (longer than 3 chars, not common words)
    const commonWords = new Set([
      'the',
      'and',
      'for',
      'with',
      'that',
      'this',
      'from',
      'have',
      'will',
      'make',
    ]);
    const words = prompt.toLowerCase().split(/\s+/);

    return words.filter(w => w.length > 3 && !commonWords.has(w)).slice(0, 5);
  }

  private assessRisk(category: string): RiskAssessment {
    const level = CATEGORY_RISK_LEVELS[category] || 'low';
    const attentionAreas = this.getAttentionAreas(category);
    const reason = this.getRiskReason(category);

    return {
      level,
      reason,
      attentionAreas,
    };
  }

  private getAttentionAreas(category: string): string[] {
    const areas: Record<string, string[]> = {
      authentication: [
        'credential_handling',
        'session_management',
        'input_validation',
      ],
      payment: ['pci_compliance', 'transaction_integrity', 'error_handling'],
      api: ['input_validation', 'rate_limiting', 'error_handling'],
      ui: ['accessibility', 'responsive_design', 'user_feedback'],
      data: ['data_integrity', 'validation', 'migrations'],
      testing: ['coverage', 'edge_cases', 'integration'],
      general: ['code_quality', 'maintainability'],
    };

    return areas[category] || areas.general;
  }

  private getRiskReason(category: string): string {
    const reasons: Record<string, string> = {
      authentication:
        'Authentication is a critical security area. Vulnerabilities can compromise the entire system.',
      payment:
        'Payment processing requires strict security and compliance. Errors can cause financial loss.',
      api: 'API endpoints are public-facing and need proper validation and security measures.',
      ui: 'UI components affect user experience and accessibility compliance.',
      data: 'Data layer changes can affect data integrity and require careful migration.',
      testing: 'Test code has lower risk but affects quality assurance.',
      general: 'General code changes with standard risk profile.',
    };

    return reasons[category] || reasons.general;
  }

  private getRelevantDomains(category: string): ChecklistDomain[] {
    const domainMap: Record<string, ChecklistDomain[]> = {
      authentication: ['security', 'testing', 'accessibility'],
      payment: ['security', 'testing', 'performance'],
      api: ['security', 'performance', 'testing'],
      ui: ['accessibility', 'performance', 'seo'],
      data: ['security', 'testing', 'code-quality'],
      testing: ['testing', 'code-quality'],
      general: ['code-quality', 'testing'],
    };

    return domainMap[category] || domainMap.general;
  }

  private recommendSpecialists(category: string): RecommendedSpecialist[] {
    const specialists = CATEGORY_SPECIALISTS[category] || [
      'code-quality-specialist',
    ];

    return specialists.map((name, index) => ({
      name,
      reason: this.getSpecialistReason(name, category),
      priority: index + 1,
    }));
  }

  private getSpecialistReason(specialist: string, category: string): string {
    const reasons: Record<string, Record<string, string>> = {
      'security-specialist': {
        authentication:
          'Review authentication security and credential handling',
        payment: 'Ensure payment security and PCI compliance',
        api: 'Review API security and input validation',
        data: 'Review data protection and access controls',
        default: 'Review security aspects',
      },
      'accessibility-specialist': {
        ui: 'Ensure WCAG 2.1 AA compliance for UI components',
        authentication: 'Review login form accessibility',
        default: 'Review accessibility compliance',
      },
      'performance-specialist': {
        ui: 'Optimize rendering and bundle size',
        api: 'Review API response times and caching',
        payment: 'Ensure fast transaction processing',
        default: 'Review performance optimizations',
      },
      'test-strategy-specialist': {
        authentication: 'Ensure comprehensive auth flow testing',
        payment: 'Verify payment edge cases and error handling',
        testing: 'Review test coverage and quality',
        default: 'Review test strategy and coverage',
      },
      'code-quality-specialist': {
        default: 'Review code quality and maintainability',
      },
      'ui-ux-designer': {
        ui: 'Review user experience and interaction patterns',
        default: 'Review UI/UX design patterns',
      },
      'architecture-specialist': {
        data: 'Review data layer architecture',
        default: 'Review system architecture',
      },
    };

    const specialistReasons = reasons[specialist];
    if (!specialistReasons) return 'Provide specialized review';

    return (
      specialistReasons[category] ||
      specialistReasons.default ||
      'Provide specialized review'
    );
  }

  private suggestWorkflow(intent: TaskIntent): SuggestedWorkflow {
    const basePhases = [
      { phase: 'Design', focus: ['Define requirements', 'Plan approach'] },
      { phase: 'Implementation', focus: ['Write code', 'Follow TDD'] },
      { phase: 'Verification', focus: ['Run tests', 'Code review'] },
    ];

    // Adjust based on intent
    if (intent === 'bug_fix') {
      return {
        phases: [
          {
            phase: 'Analysis',
            focus: ['Reproduce bug', 'Identify root cause'],
          },
          { phase: 'Fix', focus: ['Write failing test', 'Implement fix'] },
          {
            phase: 'Verification',
            focus: ['Verify fix', 'Check for regressions'],
          },
        ],
      };
    }

    if (intent === 'refactoring') {
      return {
        phases: [
          {
            phase: 'Assessment',
            focus: ['Identify improvement areas', 'Ensure test coverage'],
          },
          {
            phase: 'Refactor',
            focus: ['Small incremental changes', 'Keep tests passing'],
          },
          {
            phase: 'Verification',
            focus: ['Verify behavior unchanged', 'Code review'],
          },
        ],
      };
    }

    if (intent === 'code_review') {
      return {
        phases: [
          {
            phase: 'Review',
            focus: [
              'Check code quality',
              'Security review',
              'Performance check',
            ],
          },
          {
            phase: 'Feedback',
            focus: ['Document issues', 'Suggest improvements'],
          },
        ],
      };
    }

    return { phases: basePhases };
  }

  private buildContextHints(
    category: string,
    riskLevel: RiskLevel,
  ): ContextHints {
    const mustConsider: string[] = [];

    // Add category-specific considerations
    if (category === 'authentication' || category === 'payment') {
      mustConsider.push('OWASP Top 10');
    }
    if (category === 'ui') {
      mustConsider.push('WCAG 2.1 AA');
    }
    if (riskLevel === 'critical' || riskLevel === 'high') {
      mustConsider.push('Security review required');
    }

    return {
      projectType: 'web_application', // Could be enhanced with actual project config
      securityLevel: riskLevel,
      mustConsider,
    };
  }
}
