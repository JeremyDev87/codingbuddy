import type { AgentState } from '../types';

export const TREE_CHARS = {
  VERTICAL: '│',
  HORIZONTAL: '─',
  TOP_LEFT: '┌',
  TOP_RIGHT: '┐',
  TOP_TEE: '┬',
} as const;

export function buildVerticalConnector(): string {
  return TREE_CHARS.VERTICAL;
}

export function buildBranchLine(
  agentCount: number,
  cardWidth: number,
  gap: number,
): string {
  if (agentCount <= 1) return TREE_CHARS.VERTICAL;

  const totalWidth = agentCount * cardWidth + (agentCount - 1) * gap;
  const chars: string[] = new Array(totalWidth).fill(' ');
  const halfCard = Math.floor(cardWidth / 2);

  for (let i = 0; i < agentCount; i++) {
    const center = i * (cardWidth + gap) + halfCard;
    if (i === 0) chars[center] = TREE_CHARS.TOP_LEFT;
    else if (i === agentCount - 1) chars[center] = TREE_CHARS.TOP_RIGHT;
    else chars[center] = TREE_CHARS.TOP_TEE;
  }

  const firstCenter = halfCard;
  const lastCenter = (agentCount - 1) * (cardWidth + gap) + halfCard;
  for (let pos = firstCenter + 1; pos < lastCenter; pos++) {
    if (chars[pos] === ' ') chars[pos] = TREE_CHARS.HORIZONTAL;
  }

  return chars.join('');
}

export function buildDropLines(
  agentCount: number,
  cardWidth: number,
  gap: number,
): string {
  if (agentCount <= 1) return TREE_CHARS.VERTICAL;

  const totalWidth = agentCount * cardWidth + (agentCount - 1) * gap;
  const chars: string[] = new Array(totalWidth).fill(' ');
  const halfCard = Math.floor(cardWidth / 2);

  for (let i = 0; i < agentCount; i++) {
    const center = i * (cardWidth + gap) + halfCard;
    chars[center] = TREE_CHARS.VERTICAL;
  }

  return chars.join('');
}

export function shouldRenderTree(
  primaryAgent: AgentState | null,
): primaryAgent is AgentState {
  return primaryAgent !== null;
}
