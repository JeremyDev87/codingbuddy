import type { Mode, RuleContent } from './keyword.types';

/**
 * Path identifier for the core rules file that should be filtered.
 */
const CORE_RULES_PATH = 'rules/core.md';

/**
 * Section markers for filtering core.md content by mode.
 * Each mode only needs its own section plus common sections.
 * AUTO mode returns full content since it cycles through all modes.
 */
const MODE_SECTION_MARKERS: Record<
  Mode,
  { start: RegExp; end: RegExp } | null
> = {
  PLAN: {
    start: /^### Plan Mode$/m,
    end: /^### Act Mode$/m,
  },
  ACT: {
    start: /^### Act Mode$/m,
    end: /^### Eval Mode$/m,
  },
  EVAL: {
    start: /^### Eval Mode$/m,
    end: /^### Communication Rules$/m,
  },
  // AUTO mode cycles through PLAN → ACT → EVAL, so no filtering needed
  AUTO: null,
};

/**
 * Common sections that should be included for all modes.
 * These are at the beginning and end of core.md.
 */
const COMMON_SECTION_START = /^## Core Rules$/m;
const COMMON_SECTION_END = /^### Plan Mode$/m;

/**
 * Extracts the relevant section from core.md based on the current mode.
 * This significantly reduces token usage by only including mode-specific content.
 *
 * @param content - Full core.md content
 * @param mode - Current workflow mode (PLAN, ACT, EVAL)
 * @returns Filtered content with only relevant sections
 */
export function filterCoreRulesByMode(content: string, mode: Mode): string {
  const markers = MODE_SECTION_MARKERS[mode];
  if (!markers) {
    return content; // Fallback to full content if mode unknown
  }

  const lines = content.split('\n');
  const result: string[] = [];

  // Extract common header (Work Modes section)
  const commonHeader = extractSection(
    lines,
    COMMON_SECTION_START,
    COMMON_SECTION_END,
  );
  result.push(...commonHeader);

  // Extract mode-specific section
  const modeSection = extractSection(lines, markers.start, markers.end);
  result.push(...modeSection);

  // Add a note about filtered content
  result.push('');
  result.push(
    `<!-- Note: This is a filtered view for ${mode} mode. Full rules available in core.md -->`,
  );

  return result.join('\n');
}

/**
 * Extracts lines between start and end markers (exclusive of end).
 */
function extractSection(
  lines: string[],
  startMarker: RegExp,
  endMarker: RegExp,
): string[] {
  const result: string[] = [];
  let inSection = false;

  for (const line of lines) {
    if (startMarker.test(line)) {
      inSection = true;
    }
    if (inSection && endMarker.test(line)) {
      break;
    }
    if (inSection) {
      result.push(line);
    }
  }

  return result;
}

/**
 * Filters rule content based on mode.
 * Only core.md is filtered; other rules are returned as-is.
 *
 * @param rules - Array of rule content objects
 * @param mode - Current workflow mode
 * @returns Filtered rules with reduced token usage
 */
export function filterRulesByMode(
  rules: RuleContent[],
  mode: Mode,
): RuleContent[] {
  return rules.map(rule => {
    // Only filter core.md
    if (rule.name === CORE_RULES_PATH) {
      return {
        name: rule.name,
        content: filterCoreRulesByMode(rule.content, mode),
      };
    }
    return rule;
  });
}
