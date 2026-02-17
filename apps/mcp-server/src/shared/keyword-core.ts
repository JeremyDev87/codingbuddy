/**
 * Pure functions for keyword/mode extraction and configuration.
 *
 * These functions are the single source of truth for:
 * - Extracting a mode keyword from a user prompt
 * - Providing the default mode configuration
 * - Loading rule files for a given mode
 *
 * Both KeywordService (NestJS) and McpServerlessService (standalone)
 * delegate to these functions to eliminate duplication.
 */
import {
  KEYWORDS,
  LOCALIZED_KEYWORD_MAP,
  type Mode,
  type KeywordModesConfig,
  type RuleContent,
} from '../keyword/keyword.types';

// ============================================================================
// Types
// ============================================================================

/**
 * Result of extracting a mode keyword from a user prompt.
 */
interface ExtractModeResult {
  mode: Mode;
  originalPrompt: string;
  warnings: string[];
}

// ============================================================================
// extractModeFromPrompt
// ============================================================================

/**
 * Extract the mode keyword from the beginning of a prompt string.
 *
 * Supports English keywords (PLAN, ACT, EVAL, AUTO) case-insensitively,
 * as well as localized keywords (Korean, Japanese, Chinese, Spanish).
 * Colons after the keyword (including full-width ：) are stripped.
 *
 * @param prompt   - Raw user prompt, potentially prefixed with a keyword
 * @param defaultMode - Mode to use when no keyword is detected
 * @returns The resolved mode, the prompt text after the keyword, and any warnings
 */
export function extractModeFromPrompt(prompt: string, defaultMode: Mode): ExtractModeResult {
  const warnings: string[] = [];
  const trimmed = prompt.trim();

  // Regex: keyword (non-space, non-colon) + optional colon/full-width-colon + rest
  // Supports: "KEYWORD: task", "KEYWORD : task", "KEYWORD task", "KEYWORD：task"
  const keywordRegex = /^([^\s:：]+)\s*[:：]?\s*(.*)$/s;
  const match = trimmed.match(keywordRegex);

  if (!match || !match[1]) {
    warnings.push('No keyword found, defaulting to PLAN');
    return { mode: defaultMode, originalPrompt: trimmed, warnings };
  }

  const keywordCandidate = match[1];
  const keywordUpper = keywordCandidate.toUpperCase();
  const originalPrompt = (match[2] ?? '').trim();

  // Check English keywords (case-insensitive)
  const isEnglishKeyword = KEYWORDS.includes(keywordUpper as Mode);
  // Check localized keywords (exact match for CJK, case-insensitive for Spanish)
  const localizedMode =
    LOCALIZED_KEYWORD_MAP[keywordCandidate] ?? LOCALIZED_KEYWORD_MAP[keywordUpper];

  if (isEnglishKeyword) {
    const mode = keywordUpper as Mode;
    checkForMultipleKeywords(originalPrompt, warnings);
    checkForEmptyContent(originalPrompt, warnings);
    return { mode, originalPrompt, warnings };
  }

  if (localizedMode) {
    checkForMultipleKeywords(originalPrompt, warnings);
    checkForEmptyContent(originalPrompt, warnings);
    return { mode: localizedMode, originalPrompt, warnings };
  }

  // No keyword found — use default mode
  warnings.push('No keyword found, defaulting to PLAN');
  return { mode: defaultMode, originalPrompt: trimmed, warnings };
}

// ============================================================================
// getDefaultModeConfig
// ============================================================================

/**
 * Return the base mode configuration shared across all consumers.
 *
 * This is the single source of truth for the *minimum* mode definitions
 * (description, instructions, rules).  KeywordService overlays richer
 * fields (agent, delegates_to, defaultSpecialists) on top of this at
 * runtime.
 */
export function getDefaultModeConfig(): KeywordModesConfig {
  return {
    modes: {
      PLAN: {
        description: 'Task planning and design phase',
        instructions:
          'Design first approach. Define test cases from TDD perspective. Review architecture before implementation.',
        rules: ['rules/core.md', 'rules/augmented-coding.md'],
      },
      ACT: {
        description: 'Actual task execution phase',
        instructions:
          'Follow Red-Green-Refactor cycle. RED phase test failures are expected — do not stop, proceed to GREEN immediately. ' +
          'Treat RED→GREEN→REFACTOR as one atomic operation. ' +
          'Implement minimally then improve incrementally. Verify quality standards.',
        rules: ['rules/core.md', 'rules/project.md', 'rules/augmented-coding.md'],
      },
      EVAL: {
        description: 'Result review and assessment phase',
        instructions:
          'Review code quality. Verify SOLID principles. Check test coverage. Suggest improvements.',
        rules: ['rules/core.md', 'rules/augmented-coding.md'],
      },
      AUTO: {
        description: 'Autonomous PLAN → ACT → EVAL cycle',
        instructions:
          'Execute autonomous iteration cycle. Run PLAN → ACT → EVAL until quality achieved or max iterations reached. Self-correct based on EVAL feedback.',
        rules: ['rules/core.md', 'rules/project.md', 'rules/augmented-coding.md'],
      },
    },
    defaultMode: 'PLAN',
  };
}

// ============================================================================
// loadRulesForMode
// ============================================================================

/**
 * Load rule file contents for a given mode.
 *
 * Iterates over the rule paths declared in the mode's configuration,
 * reads each file via the supplied `readRuleFn`, and silently skips
 * any file that fails to load (e.g. missing on disk).
 *
 * @param mode       - The workflow mode whose rules should be loaded
 * @param config     - Full keyword-modes configuration
 * @param readRuleFn - Async function that reads a rule file by path
 * @returns Array of successfully loaded rule contents
 */
export async function loadRulesForMode(
  mode: Mode,
  config: KeywordModesConfig,
  readRuleFn: (path: string) => Promise<string>,
): Promise<RuleContent[]> {
  const modeConfig = config.modes[mode];
  const rules: RuleContent[] = [];

  for (const rulePath of modeConfig.rules) {
    try {
      const content = await readRuleFn(rulePath);
      rules.push({ name: rulePath, content });
    } catch {
      // Skip files that fail to load (missing, permission error, etc.)
    }
  }

  return rules;
}

// ============================================================================
// Internal helpers
// ============================================================================

/**
 * Check whether the first word of the remaining prompt is also a keyword.
 */
function checkForMultipleKeywords(originalPrompt: string, warnings: string[]): void {
  if (!originalPrompt) return;

  const firstWordMatch = originalPrompt.match(/^([^\s:：]+)/);
  if (!firstWordMatch) return;

  const firstWord = firstWordMatch[1];
  const firstWordUpper = firstWord.toUpperCase();

  const isSecondKeyword =
    KEYWORDS.includes(firstWordUpper as Mode) ||
    LOCALIZED_KEYWORD_MAP[firstWord] !== undefined ||
    LOCALIZED_KEYWORD_MAP[firstWordUpper] !== undefined;

  if (isSecondKeyword) {
    warnings.push('Multiple keywords found, using first');
  }
}

/**
 * Warn when the prompt body after the keyword is empty.
 */
function checkForEmptyContent(originalPrompt: string, warnings: string[]): void {
  if (originalPrompt === '') {
    warnings.push('No prompt content after keyword');
  }
}
