/**
 * Agent Discussion Panel — Ink/React TUI component.
 *
 * Real-time agent collaboration visualization with:
 * - Speech bubbles per agent (with face + color distinction)
 * - Consensus progress bar
 * - Conflict highlighting when opinions disagree
 *
 * @see https://github.com/JeremyDev87/codingbuddy/issues/994
 */
import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import type { DiscussionRound } from '../../collaboration/types';
import { BORDER_COLORS } from '../utils/theme';
import {
  renderCollaborationBlocks,
  estimateBlockHeight,
  type DiscussionBlock,
  type AgentBubbleBlock,
  type CrossReviewBlock,
  type ConsensusBarBlock,
} from './agent-discussion-panel.pure';

export interface AgentDiscussionPanelProps {
  rounds: readonly DiscussionRound[];
  width: number;
  height: number;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Speech bubble showing one agent's opinion with colored border. */
function SpeechBubble({
  block,
  maxWidth,
}: {
  block: AgentBubbleBlock;
  maxWidth: number;
}): React.ReactElement {
  const borderColor = block.isConflict ? 'red' : block.color;
  const bubbleWidth = Math.min(maxWidth, 60);

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={block.color} bold>
          {block.agentAvatar} {block.agentName}
        </Text>
        {block.isConflict && (
          <Text color="red" bold>
            {' '}
            ⚡
          </Text>
        )}
        {block.stanceHistoryText !== '' && <Text dimColor> ({block.stanceHistoryText})</Text>}
      </Box>
      <Box
        borderStyle="round"
        borderColor={borderColor}
        paddingLeft={1}
        paddingRight={1}
        width={bubbleWidth}
      >
        <Text wrap="truncate">
          {block.stanceIcon} {block.reasoning}
        </Text>
      </Box>
    </Box>
  );
}

/** Visual progress bar for consensus status. */
function ConsensusProgressBar({
  block,
  maxWidth,
}: {
  block: ConsensusBarBlock;
  maxWidth: number;
}): React.ReactElement {
  const barWidth = Math.min(20, Math.max(8, maxWidth - 30));
  const total = block.totalAgents || 1;

  const approveLen = Math.round((block.approveCount / total) * barWidth);
  const concernLen = Math.round((block.concernCount / total) * barWidth);
  const remaining = Math.max(0, barWidth - approveLen - concernLen);

  const filled = '\u2588'; // █
  const empty = '\u2591'; // ░

  const statusIcon = block.reached ? '\u2705' : '\u23F3'; // ✅ or ⏳

  return (
    <Box flexDirection="column">
      <Box>
        <Text bold>{statusIcon} Consensus </Text>
        <Text color="green">{filled.repeat(approveLen)}</Text>
        <Text color="yellow">{filled.repeat(concernLen)}</Text>
        {block.rejectCount > 0 ? (
          <Text color="red">{filled.repeat(remaining)}</Text>
        ) : (
          <Text color="gray">{empty.repeat(remaining)}</Text>
        )}
        <Text bold> {block.percentage}%</Text>
      </Box>
      <Box>
        <Text color="green">
          {'\u2705'} {block.approveCount}
        </Text>
        <Text> </Text>
        <Text color="yellow">
          {'\u26A0\uFE0F'} {block.concernCount}
        </Text>
        <Text> </Text>
        <Text color="red">
          {'\u274C'} {block.rejectCount}
        </Text>
      </Box>
    </Box>
  );
}

/** Cross-review line with colored agent names. */
function CrossReviewItem({ block }: { block: CrossReviewBlock }): React.ReactElement {
  return (
    <Box>
      <Text color={block.fromColor}>
        {block.fromAvatar} {block.fromName}
      </Text>
      <Text dimColor> → </Text>
      <Text color={block.toColor}>
        {block.toAvatar} {block.toName}
      </Text>
      <Text> {block.verb}: </Text>
      <Text dimColor>"{block.comment}"</Text>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Agent Discussion Panel — renders real-time agent collaboration
 * with speech bubbles, consensus progress bar, and conflict highlights.
 */
export function AgentDiscussionPanel({
  rounds,
  width,
  height,
}: AgentDiscussionPanelProps): React.ReactElement {
  const blocks = useMemo(() => renderCollaborationBlocks(rounds, width), [rounds, width]);

  // Truncate blocks to fit available height (minus 2 for outer border)
  const maxHeight = Math.max(0, height - 2);
  const visibleBlocks: DiscussionBlock[] = [];
  let usedHeight = 0;
  for (const block of blocks) {
    const h = estimateBlockHeight(block);
    if (usedHeight + h > maxHeight) break;
    visibleBlocks.push(block);
    usedHeight += h;
  }

  const innerWidth = Math.max(10, width - 4);

  return (
    <Box
      flexDirection="column"
      width={width}
      height={height}
      borderStyle="round"
      borderColor={BORDER_COLORS.panel}
    >
      {visibleBlocks.map((block, i) => {
        switch (block.type) {
          case 'header':
            return (
              <Text key={i} color="magenta" bold>
                {block.text}
              </Text>
            );
          case 'agent-bubble':
            return <SpeechBubble key={i} block={block} maxWidth={innerWidth} />;
          case 'cross-review-block':
            return <CrossReviewItem key={i} block={block} />;
          case 'consensus-bar':
            return <ConsensusProgressBar key={i} block={block} maxWidth={innerWidth} />;
          case 'empty':
            return (
              <Text key={i} color="gray" dimColor>
                {block.text}
              </Text>
            );
        }
      })}
    </Box>
  );
}
