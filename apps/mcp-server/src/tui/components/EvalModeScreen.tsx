/**
 * EVAL Mode Screen — Ink/React TUI component.
 *
 * Shows per-agent review results, category scores, and aggregate score.
 */
import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import type { AgentReviewResult } from '../dashboard-types';
import { BORDER_COLORS } from '../utils/theme';
import { renderEvalScreen, type EvalScreenLine } from './eval-screen.pure';

export interface EvalModeScreenProps {
  results: readonly AgentReviewResult[];
  width: number;
  height: number;
}

const LINE_COLORS: Record<EvalScreenLine['type'], string> = {
  header: 'magenta',
  'agent-result': 'white',
  category: 'cyan',
  'total-score': 'green',
  empty: 'gray',
};

export function EvalModeScreen({
  results,
  width,
  height,
}: EvalModeScreenProps): React.ReactElement {
  const lines = useMemo(() => renderEvalScreen(results, width - 2), [results, width]);

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
          bold={line.type === 'header' || line.type === 'total-score'}
          dimColor={line.type === 'empty'}
          wrap="truncate"
        >
          {line.text}
        </Text>
      ))}
    </Box>
  );
}
