import { Minimatch, type MinimatchOptions } from 'minimatch';

/**
 * Pre-compiled pattern matcher using minimatch.Minimatch
 * Provides better performance for frequently used patterns
 */
export interface CompiledPattern {
  pattern: string;
  matcher: Minimatch;
}

/**
 * Options for pattern matching (same as minimatch options)
 */
export type PatternMatcherOptions = MinimatchOptions;

const DEFAULT_OPTIONS: PatternMatcherOptions = {
  matchBase: true,
};

/**
 * Pre-compiles a single pattern
 */
export function compilePattern(
  pattern: string,
  options: PatternMatcherOptions = DEFAULT_OPTIONS,
): CompiledPattern {
  return {
    pattern,
    matcher: new Minimatch(pattern, options),
  };
}

/**
 * Pre-compiles multiple patterns
 */
export function compilePatterns(
  patterns: string[],
  options: PatternMatcherOptions = DEFAULT_OPTIONS,
): CompiledPattern[] {
  return patterns.map(pattern => compilePattern(pattern, options));
}

/**
 * Pre-compiles a category-to-patterns map
 * Returns a map of category to compiled patterns
 */
export function compileCategoryPatterns(
  categoryPatterns: Record<string, string[]>,
  options: PatternMatcherOptions = DEFAULT_OPTIONS,
): Map<string, CompiledPattern[]> {
  const compiled = new Map<string, CompiledPattern[]>();

  for (const [category, patterns] of Object.entries(categoryPatterns)) {
    compiled.set(category, compilePatterns(patterns, options));
  }

  return compiled;
}

/**
 * Checks if a file matches any of the compiled patterns
 */
export function matchesAnyPattern(
  file: string,
  compiledPatterns: CompiledPattern[],
): boolean {
  return compiledPatterns.some(cp => cp.matcher.match(file));
}

/**
 * Finds the first matching category for a file
 */
export function findMatchingCategory(
  file: string,
  categoryPatterns: Map<string, CompiledPattern[]>,
): string | null {
  for (const [category, patterns] of categoryPatterns) {
    if (matchesAnyPattern(file, patterns)) {
      return category;
    }
  }
  return null;
}
