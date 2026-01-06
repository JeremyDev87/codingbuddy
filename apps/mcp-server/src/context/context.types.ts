import type {
  DomainChecklist,
  ChecklistSummary,
  MatchedTrigger,
} from '../checklist/checklist.types';

/**
 * Intent categories detected from task analysis
 */
export type TaskIntent =
  | 'feature_development'
  | 'bug_fix'
  | 'refactoring'
  | 'code_review'
  | 'testing'
  | 'documentation'
  | 'performance_optimization'
  | 'security_hardening'
  | 'unknown';

/**
 * Risk level for a task
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Complexity level for a task
 */
export type ComplexityLevel = 'low' | 'medium' | 'high';

/**
 * Analysis of the task intent and category
 */
export interface TaskAnalysis {
  intent: TaskIntent;
  category: string;
  complexity: ComplexityLevel;
  keywords: string[];
}

/**
 * Risk assessment for the task
 */
export interface RiskAssessment {
  level: RiskLevel;
  reason: string;
  attentionAreas: string[];
}

/**
 * Recommended specialist agent
 */
export interface RecommendedSpecialist {
  name: string;
  reason: string;
  priority: number;
}

/**
 * Single phase in the suggested workflow
 */
export interface WorkflowPhase {
  phase: string;
  focus: string[];
}

/**
 * Suggested workflow for the task
 */
export interface SuggestedWorkflow {
  phases: WorkflowPhase[];
}

/**
 * Context hints for AI to consider
 */
export interface ContextHints {
  projectType?: string;
  securityLevel?: RiskLevel;
  mustConsider: string[];
}

/**
 * Input parameters for analyze_task tool
 */
export interface AnalyzeTaskInput {
  /** User's task description */
  prompt: string;
  /** Optional file paths related to the task */
  files?: string[];
  /** Current workflow mode */
  mode?: 'PLAN' | 'ACT' | 'EVAL';
}

/**
 * Output of analyze_task tool
 */
export interface AnalyzeTaskOutput {
  /** Intent analysis */
  analysis: TaskAnalysis;
  /** Risk assessment */
  riskAssessment: RiskAssessment;
  /** Generated checklists from ChecklistService */
  checklists: DomainChecklist[];
  /** Checklist summary */
  checklistSummary: ChecklistSummary;
  /** Matched triggers (for transparency) */
  matchedTriggers: MatchedTrigger[];
  /** Recommended specialist agents */
  recommendedSpecialists: RecommendedSpecialist[];
  /** Suggested workflow */
  suggestedWorkflow: SuggestedWorkflow;
  /** Context hints for AI */
  contextHints: ContextHints;
}

/**
 * File pattern to category mapping
 */
export const FILE_CATEGORY_PATTERNS: Record<string, string[]> = {
  authentication: [
    '**/auth/**',
    '**/login/**',
    '**/session/**',
    '**/password/**',
  ],
  payment: [
    '**/payment/**',
    '**/checkout/**',
    '**/billing/**',
    '**/subscription/**',
  ],
  api: ['**/api/**', '**/handler/**', '**/route/**', '**/endpoint/**'],
  ui: ['**/components/**', '**/features/**', '**/widgets/**', '**/page/**'],
  data: ['**/model/**', '**/entity/**', '**/schema/**', '**/database/**'],
  testing: ['**/*.spec.*', '**/*.test.*', '**/test/**', '**/__tests__/**'],
};

/**
 * Category to risk level mapping
 */
export const CATEGORY_RISK_LEVELS: Record<string, RiskLevel> = {
  authentication: 'critical',
  payment: 'critical',
  api: 'high',
  data: 'high',
  ui: 'medium',
  testing: 'low',
};

/**
 * Category to specialist mapping
 */
export const CATEGORY_SPECIALISTS: Record<string, string[]> = {
  authentication: ['security-specialist', 'test-strategy-specialist'],
  payment: ['security-specialist', 'test-strategy-specialist'],
  api: [
    'security-specialist',
    'performance-specialist',
    'test-strategy-specialist',
  ],
  ui: ['accessibility-specialist', 'ui-ux-designer', 'performance-specialist'],
  data: ['architecture-specialist', 'security-specialist'],
  testing: ['test-strategy-specialist', 'code-quality-specialist'],
};
