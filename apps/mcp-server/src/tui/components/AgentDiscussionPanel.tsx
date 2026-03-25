/**
 * Agent Discussion Panel — Ink/React TUI component.
 *
 * Replaces FlowMap to visualize agent collaboration as structured debates.
 * Shows agent opinions, cross-reviews, stance changes, and consensus status.
 */
import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import type { DiscussionRound } from '../../collaboration/types';
import { BORDER_COLORS } from '../utils/theme';
import { renderDiscussionPanel, type DiscussionLine } from './agent-discussion-panel.pure';

export interface AgentDiscussionPanelProps {
  rounds: readonly DiscussionRound[];
  width: number;
  height: number;
}

/** Color map for discussion line types. */
const LINE_COLORS: Record<DiscussionLine['type'], string> = {
  opinion: 'white',
  'cross-review': 'cyan',
  consensus: 'green',
  header: 'magenta',
  empty: 'gray',
};

/**
 * Agent Discussion Panel — renders structured agent debates in the TUI dashboard.
 * Replaces the FlowMap component in the dashboard layout.
 */
export function AgentDiscussionPanel({
  rounds,
  width,
  height,
}: AgentDiscussionPanelProps): React.ReactElement {
  const lines = useMemo(
    () => renderDiscussionPanel(rounds, width),
    [rounds, width],
  );

  // Limit lines to available height (minus 2 for border)
  const maxLines = Math.max(0, height - 2);
  const visibleLines = lines.slice(0, maxLines);

  return (
    <Box
      flexDirection="column"
      width={width}
      height={height}
      borderStyle="round"
      borderColor={BORDER_COLORS.panel}
    >
      {visibleLines.map((line, i) => (
        <Text
          key={i}
          color={LINE_COLORS[line.type]}
          bold={line.type === 'header' || line.type === 'consensus'}
          dimColor={line.type === 'empty'}
          wrap="truncate"
        >
          {line.text}
        </Text>
      ))}
    </Box>
  );
}
