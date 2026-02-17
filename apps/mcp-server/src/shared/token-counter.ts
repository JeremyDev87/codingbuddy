/**
 * Token counter utility for measuring response sizes
 * Provides simple token estimation without external dependencies
 */

/**
 * Token metrics for a component response
 */
export interface TokenMetrics {
  componentName: string;
  byteSize: number;
  estimatedTokens: number;
  timestamp: Date;
}

/**
 * Breakdown of total tokens across components
 */
export interface TokenBreakdown {
  total: number;
  breakdown: Record<string, number>;
}

/**
 * Estimate tokens for a given text content
 * Uses simplified estimation: ~4 characters = 1 token for English/ASCII
 * ~2 characters = 1 token for CJK (Chinese, Japanese, Korean)
 *
 * @param content - Text content to estimate tokens for
 * @returns Estimated token count
 *
 * @example
 * ```typescript
 * estimateTokens('Hello world')  // 3 tokens
 * estimateTokens('안녕하세요')     // 3 tokens (CJK: ~2 chars/token)
 * estimateTokens('')              // 0 tokens
 * ```
 */
export function estimateTokens(content: string): number {
  if (!content || content.length === 0) {
    return 0;
  }

  // Count CJK characters (more token-dense)
  const cjkRegex = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/g;
  const cjkMatches = content.match(cjkRegex);
  const cjkCount = cjkMatches ? cjkMatches.length : 0;

  // Count non-CJK characters
  const nonCjkCount = content.length - cjkCount;

  // CJK: ~2 chars per token, ASCII/Latin: ~4 chars per token
  const cjkTokens = Math.ceil(cjkCount / 2);
  const nonCjkTokens = Math.ceil(nonCjkCount / 4);

  return cjkTokens + nonCjkTokens;
}

/**
 * Measure response data and return token metrics
 *
 * @param componentName - Name of the component being measured
 * @param data - Response data to measure
 * @returns Token metrics with size and estimation
 *
 * @example
 * ```typescript
 * const metrics = measureResponse('RulesListResource', rulesData);
 * console.log(metrics.estimatedTokens); // ~150
 * ```
 */
export function measureResponse<T>(componentName: string, data: T): TokenMetrics {
  const serialized = JSON.stringify(data);
  const byteSize = Buffer.byteLength(serialized, 'utf8');
  const estimatedTokens = estimateTokens(serialized);

  return {
    componentName,
    byteSize,
    estimatedTokens,
    timestamp: new Date(),
  };
}

/**
 * Calculate total tokens from multiple component metrics
 *
 * @param metrics - Array of token metrics from different components
 * @returns Total tokens and breakdown by component
 *
 * @example
 * ```typescript
 * const metrics = [
 *   measureResponse('rules', rulesData),
 *   measureResponse('agents', agentsData)
 * ];
 * const total = calculateTotalTokens(metrics);
 * console.log(total.total);              // 500
 * console.log(total.breakdown.rules);    // 300
 * console.log(total.breakdown.agents);   // 200
 * ```
 */
export function calculateTotalTokens(metrics: TokenMetrics[]): TokenBreakdown {
  const breakdown: Record<string, number> = {};
  let total = 0;

  for (const metric of metrics) {
    breakdown[metric.componentName] = metric.estimatedTokens;
    total += metric.estimatedTokens;
  }

  return {
    total,
    breakdown,
  };
}
