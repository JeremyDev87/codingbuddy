// ============================================================================
// Constants - Single Source of Truth
// ============================================================================

/**
 * All valid checklist priority levels (ordered from highest to lowest)
 */
export const CHECKLIST_PRIORITIES = [
  'critical',
  'high',
  'medium',
  'low',
] as const;

/**
 * All valid checklist domains
 */
export const CHECKLIST_DOMAINS = [
  'security',
  'accessibility',
  'performance',
  'testing',
  'code-quality',
  'seo',
] as const;

/**
 * Priority numeric values for sorting (lower = higher priority)
 */
export const PRIORITY_VALUES: Record<ChecklistPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

// ============================================================================
// Types derived from constants
// ============================================================================

/**
 * Priority levels for checklist items
 */
export type ChecklistPriority = (typeof CHECKLIST_PRIORITIES)[number];

/**
 * Domain categories for checklists
 */
export type ChecklistDomain = (typeof CHECKLIST_DOMAINS)[number];

/**
 * Single checklist item
 */
export interface ChecklistItem {
  id: string;
  text: string;
  priority: ChecklistPriority;
  reason?: string;
  reference?: string;
}

/**
 * Category within a domain (e.g., "authentication" within "security")
 */
export interface ChecklistCategory {
  name: string;
  triggers: ChecklistTriggers;
  items: ChecklistItem[];
}

/**
 * Triggers that activate a checklist category
 */
export interface ChecklistTriggers {
  /** Glob patterns for file paths */
  files: string[];
  /** Package/import names to detect */
  imports?: string[];
  /** Code patterns (variable names, function names) */
  patterns?: string[];
}

/**
 * Complete checklist definition for a domain
 */
export interface ChecklistDefinition {
  domain: ChecklistDomain;
  icon: string;
  description: string;
  categories: ChecklistCategory[];
}

/**
 * Generated checklist result for a specific domain
 */
export interface DomainChecklist {
  domain: ChecklistDomain;
  icon: string;
  priority: ChecklistPriority;
  items: ChecklistItem[];
}

/**
 * Summary of generated checklists
 */
export interface ChecklistSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

/**
 * Input parameters for generate_checklist tool
 */
export interface GenerateChecklistInput {
  /** File paths to analyze */
  files?: string[];
  /** Explicitly specify domains */
  domains?: ChecklistDomain[];
}

/**
 * Output of generate_checklist tool
 */
export interface GenerateChecklistOutput {
  checklists: DomainChecklist[];
  summary: ChecklistSummary;
  /** Which triggers matched (for debugging/transparency) */
  matchedTriggers: MatchedTrigger[];
}

/**
 * Information about why a checklist was triggered
 */
export interface MatchedTrigger {
  domain: ChecklistDomain;
  category: string;
  reason: 'file_pattern' | 'import_detected' | 'code_pattern' | 'explicit';
  match: string;
}
