import { joinAgentTags } from './agent-mini-card.pure';
import {
  estimateDisplayWidth,
  truncateToDisplayWidth,
  padEndDisplayWidth,
} from '../utils/display-width';

export const LABEL_WIDTH = 18;
const ELLIPSIS = '\u2026';

export function buildCategoryLabel(icon: string, categoryName: string): string {
  return icon ? `${icon} ${categoryName}` : categoryName;
}

export function buildCompactCategoryRow(
  icon: string,
  categoryName: string,
  agentNames: string[],
  maxWidth: number = 80,
): string {
  const rawLabel = buildCategoryLabel(icon, categoryName);
  const label = padEndDisplayWidth(rawLabel, LABEL_WIDTH);
  // padEndDisplayWidth guarantees label is at least LABEL_WIDTH columns;
  // use Math.max to handle overflow when icon+name exceeds LABEL_WIDTH.
  const labelWidth = Math.max(LABEL_WIDTH, estimateDisplayWidth(rawLabel));
  const remainingWidth = maxWidth - labelWidth - 1;
  const fullTags = joinAgentTags(agentNames);
  if (remainingWidth <= 0) return label;
  const tags =
    estimateDisplayWidth(fullTags) <= remainingWidth
      ? fullTags
      : truncateToDisplayWidth(fullTags, remainingWidth - 1) + ELLIPSIS;
  return `${label} ${tags}`;
}
