/**
 * EVAL Mode Screen — Pure rendering functions.
 *
 * Renders per-agent review results (progress bar),
 * category scores, and total score for the EVAL mode TUI screen.
 */
import type { AgentReviewResult } from '../dashboard-types';

export interface EvalScreenLine {
  type: 'header' | 'agent-result' | 'category' | 'total-score' | 'empty';
  text: string;
}

/**
 * Render a score bar (filled/empty) with percentage.
 */
export function renderScoreBar(score: number, maxScore: number, barWidth: number): string {
  const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const filled = Math.round((percent / 100) * barWidth);
  const empty = barWidth - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${score}/${maxScore}`;
}

/**
 * Render a single agent's review result.
 */
export function renderAgentResult(result: AgentReviewResult, width: number): EvalScreenLine[] {
  const lines: EvalScreenLine[] = [];
  const statusIcon = getResultStatusIcon(result.status);
  const barWidth = Math.max(8, Math.min(20, width - 30));

  lines.push({
    type: 'agent-result',
    text: `  ${statusIcon} ${result.agentName}`,
  });

  for (const cat of result.categories) {
    const bar = renderScoreBar(cat.score, cat.maxScore, barWidth);
    lines.push({
      type: 'category',
      text: `    ${padRight(cat.name, 16)} ${bar}`,
    });
  }

  const totalBar = renderScoreBar(result.totalScore, result.maxTotalScore, barWidth);
  lines.push({
    type: 'total-score',
    text: `    ${'Total'.padEnd(16)} ${totalBar}`,
  });

  return lines;
}

function getResultStatusIcon(status: AgentReviewResult['status']): string {
  switch (status) {
    case 'pending':
      return '⏳';
    case 'in-progress':
      return '🔄';
    case 'done':
      return '✅';
  }
}

function padRight(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len) : str + ' '.repeat(len - str.length);
}

/**
 * Calculate the aggregate score across all review results.
 */
export function calculateAggregateScore(results: readonly AgentReviewResult[]): {
  total: number;
  max: number;
  percent: number;
} {
  if (results.length === 0) return { total: 0, max: 0, percent: 0 };
  const total = results.reduce((sum, r) => sum + r.totalScore, 0);
  const max = results.reduce((sum, r) => sum + r.maxTotalScore, 0);
  const percent = max > 0 ? Math.round((total / max) * 100) : 0;
  return { total, max, percent };
}

/**
 * Render the complete EVAL mode screen.
 */
export function renderEvalScreen(
  results: readonly AgentReviewResult[],
  width: number,
): EvalScreenLine[] {
  const lines: EvalScreenLine[] = [];
  lines.push({ type: 'header', text: '📊 Review Results' });

  if (results.length === 0) {
    lines.push({ type: 'empty', text: '  (no review results yet)' });
    return lines;
  }

  for (const result of results) {
    lines.push(...renderAgentResult(result, width));
    lines.push({ type: 'empty', text: '' });
  }

  // Aggregate score
  const agg = calculateAggregateScore(results);
  const barWidth = Math.max(8, Math.min(20, width - 30));
  lines.push({ type: 'header', text: '🏆 Aggregate Score' });
  lines.push({
    type: 'total-score',
    text: `  ${renderScoreBar(agg.total, agg.max, barWidth)} (${agg.percent}%)`,
  });

  return lines;
}
