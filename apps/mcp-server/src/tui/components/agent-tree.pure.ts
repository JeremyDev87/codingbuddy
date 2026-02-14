import { buildInlineCard } from './agent-card.pure';

export const TREE_CHARS = {
  VERTICAL: '│',
  HORIZONTAL: '─',
  TOP_LEFT: '┌',
  BOTTOM_LEFT: '└',
  TEE_RIGHT: '├',
} as const;

export interface CompactAgentLine {
  icon: string;
  name: string;
  progress: number;
  statusLabel: string;
}

export interface TreeLine {
  key: string;
  content: string;
}

export function buildCompactTree(
  primary: CompactAgentLine,
  parallel: CompactAgentLine[],
): TreeLine[] {
  const lines: TreeLine[] = [];
  const primaryCard = buildInlineCard(
    primary.icon,
    primary.name,
    primary.progress,
    primary.statusLabel,
  );

  const { TOP_LEFT, BOTTOM_LEFT, VERTICAL, TEE_RIGHT, HORIZONTAL } = TREE_CHARS;

  lines.push({ key: 'primary-header', content: `${TOP_LEFT} Primary` });

  if (parallel.length === 0) {
    lines.push({
      key: 'primary-card',
      content: `${BOTTOM_LEFT} ${primaryCard}`,
    });
    return lines;
  }

  lines.push({ key: 'primary-card', content: `${VERTICAL} ${primaryCard}` });
  lines.push({
    key: 'parallel-header',
    content: `${TEE_RIGHT}${HORIZONTAL} Parallel`,
  });
  for (let i = 0; i < parallel.length; i++) {
    const agent = parallel[i];
    const card = buildInlineCard(
      agent.icon,
      agent.name,
      agent.progress,
      agent.statusLabel,
    );
    lines.push({
      key: `parallel-${agent.name}`,
      content: `${VERTICAL}  ${card}`,
    });
  }
  lines.push({ key: 'footer', content: BOTTOM_LEFT });
  return lines;
}
