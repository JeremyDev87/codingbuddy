import type { IterationResult, EvalIssue } from './auto-executor.types';

/**
 * Prompt builder for AUTO mode autonomous execution cycles.
 *
 * Constructs prompts for each iteration in the PLAN → ACT → EVAL cycle,
 * incorporating feedback from previous iterations to guide improvements.
 *
 * @example
 * ```typescript
 * const builder = new AutoPromptBuilder();
 *
 * // First iteration - returns original prompt unchanged
 * const prompt1 = builder.buildIterationPrompt('Add auth', 1, []);
 *
 * // Second iteration - appends issues from previous EVAL
 * const prompt2 = builder.buildIterationPrompt('Add auth', 2, history);
 * // Returns: "Add auth\n\nPrevious issues to address:\n- [CRITICAL] ..."
 *
 * // Max iterations reached - request new approach
 * const fallback = builder.buildFallbackPrompt('Add auth', history);
 * ```
 */
export class AutoPromptBuilder {
  /**
   * Builds the prompt for a specific AUTO mode iteration.
   *
   * **Behavior by iteration:**
   * - **Iteration 1**: Returns the original prompt unchanged (initial attempt)
   * - **Iterations 2+**: Appends critical/high severity issues from previous EVAL
   *
   * **Defensive handling:**
   * - If history is empty or invalid, falls back to original prompt
   * - If last iteration has no evalSummary, falls back to original prompt
   *
   * @param originalPrompt - The user's original task description (e.g., "Add user authentication")
   * @param iteration - Current iteration number, 1-based (e.g., 1, 2, 3)
   * @param history - Array of previous iteration results, excluding current iteration
   *
   * @returns Formatted prompt string
   *   - Iteration 1: `originalPrompt`
   *   - Iteration 2+: `originalPrompt\n\nPrevious issues to address:\n- issue1\n- issue2...`
   *
   * @example
   * ```typescript
   * // First iteration
   * buildIterationPrompt('Add auth', 1, [])
   * // => "Add auth"
   *
   * // Second iteration with issues
   * buildIterationPrompt('Add auth', 2, [
   *   {
   *     iteration: 1,
   *     approach: 'JWT-based auth',
   *     evalSummary: {
   *       issues: [
   *         { severity: 'critical', description: 'Missing password hashing' },
   *         { severity: 'high', description: 'No rate limiting' },
   *         { severity: 'low', description: 'Missing JSDoc' }
   *       ]
   *     }
   *   }
   * ])
   * // => "Add auth\n\nPrevious issues to address:\n- Missing password hashing\n- No rate limiting"
   * ```
   */
  buildIterationPrompt(
    originalPrompt: string,
    iteration: number,
    history: IterationResult[],
  ): string {
    if (iteration === 1) {
      return originalPrompt;
    }

    // Defensive check: if history is empty or invalid, fall back to original prompt
    if (!history || history.length === 0) {
      return originalPrompt;
    }

    const lastIteration = history[history.length - 1];
    if (!lastIteration?.evalSummary) {
      return originalPrompt;
    }

    const issues = this.filterCriticalHighIssues(
      lastIteration.evalSummary.issues,
      false,
    );

    return `${originalPrompt}\n\nPrevious issues to address:\n${issues}`;
  }

  /**
   * Builds a fallback prompt when maximum AUTO mode iterations are reached.
   *
   * Used when the autonomous cycle hits maxIterations without resolving all
   * critical/high issues. Provides full context of all attempts and prompts
   * the user (or agent) to propose a different approach.
   *
   * **Format:**
   * ```
   * {originalPrompt}
   *
   * Previous attempts:
   * - Iteration 1: {approach1}
   * - Iteration 2: {approach2}
   * ...
   *
   * Remaining issues:
   * - [CRITICAL] {issue1}
   * - [HIGH] {issue2}
   * ...
   *
   * Please propose a new approach.
   * ```
   *
   * @param originalPrompt - The user's original task description (e.g., "Add user authentication")
   * @param history - Array of all iteration results, including their approaches and evaluation summaries
   *
   * @returns Formatted fallback prompt with complete iteration history and remaining critical/high issues
   *
   * @example
   * ```typescript
   * const fallback = buildFallbackPrompt('Add auth', [
   *   {
   *     iteration: 1,
   *     approach: 'JWT with bcrypt hashing',
   *     evalSummary: { issues: [{ severity: 'critical', description: 'No rate limiting' }] }
   *   },
   *   {
   *     iteration: 2,
   *     approach: 'Added express-rate-limit',
   *     evalSummary: { issues: [{ severity: 'high', description: 'Missing CSRF protection' }] }
   *   }
   * ]);
   *
   * // Returns:
   * // Add auth
   * //
   * // Previous attempts:
   * // - Iteration 1: JWT with bcrypt hashing
   * // - Iteration 2: Added express-rate-limit
   * //
   * // Remaining issues:
   * // - [HIGH] Missing CSRF protection
   * //
   * // Please propose a new approach.
   * ```
   */
  buildFallbackPrompt(
    originalPrompt: string,
    history: IterationResult[],
  ): string {
    const attempts = history
      .map(h => `- Iteration ${h.iteration}: ${h.approach}`)
      .join('\n');

    const lastIteration = history[history.length - 1];
    const remainingIssues = lastIteration?.evalSummary?.issues
      ? this.filterCriticalHighIssues(lastIteration.evalSummary.issues, true)
      : '(none)';

    return `${originalPrompt}

Previous attempts:
${attempts}

Remaining issues:
${remainingIssues}

Please propose a new approach.`;
  }

  /**
   * Filter issues to only critical and high severity
   *
   * @param issues - Array of evaluation issues
   * @param includeSeverityLabel - Whether to include [CRITICAL]/[HIGH] labels
   * @returns Formatted string of critical/high issues, one per line
   * @private
   */
  private filterCriticalHighIssues(
    issues: EvalIssue[],
    includeSeverityLabel: boolean,
  ): string {
    return issues
      .filter(i => i.severity === 'critical' || i.severity === 'high')
      .map(i =>
        includeSeverityLabel
          ? `- [${i.severity.toUpperCase()}] ${i.description}`
          : `- ${i.description}`,
      )
      .join('\n');
  }
}
