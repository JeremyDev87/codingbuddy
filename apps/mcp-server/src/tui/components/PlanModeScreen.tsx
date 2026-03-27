/**
 * PLAN Mode Screen — Ink/React TUI component.
 *
 * Shows agent summoning list, discussion panel, and consensus.
 */
import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import type { DashboardNode } from '../dashboard-types';
import type { DiscussionRound } from '../../collaboration/types';
import { BORDER_COLORS } from '../utils/theme';
import { renderPlanScreen, type PlanScreenLine } from './plan-screen.pure';
import { AgentDiscussionPanel } from './AgentDiscussionPanel';

export interface PlanModeScreenProps {
  agents: ReadonlyMap<string, DashboardNode>;
  rounds: readonly DiscussionRound[];
  width: number;
  height: number;
}

const LINE_COLORS: Record<PlanScreenLine['type'], string> = {
  header: 'magenta',
  agent: 'white',
  discussion: 'cyan',
  consensus: 'green',
  empty: 'gray',
};

export function PlanModeScreen({
  agents,
  rounds,
  width,
  height,
}: PlanModeScreenProps): React.ReactElement {
  const summaryLines = useMemo(
    () => renderPlanScreen(agents, rounds, width - 2),
    [agents, rounds, width],
  );

  // Split height: summary panel gets ~40%, discussion gets ~60%
  const summaryHeight = Math.max(5, Math.floor(height * 0.4));
  const discussionHeight = height - summaryHeight;

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Box
        flexDirection="column"
        width={width}
        height={summaryHeight}
        borderStyle="round"
        borderColor={BORDER_COLORS.panel}
      >
        {summaryLines.slice(0, summaryHeight - 2).map((line, i) => (
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
      {rounds.length > 0 && discussionHeight > 3 && (
        <AgentDiscussionPanel rounds={rounds} width={width} height={discussionHeight} />
      )}
    </Box>
  );
}
