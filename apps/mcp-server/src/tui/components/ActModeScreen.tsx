/**
 * ACT Mode Screen — Ink/React TUI component.
 *
 * Shows TDD phase progress, step-by-step status, and overall progress.
 */
import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import type { TddPhase, TddStep, DashboardNode } from '../dashboard-types';
import { BORDER_COLORS } from '../utils/theme';
import { renderActScreen, PHASE_COLORS, type ActScreenLine } from './act-screen.pure';

export interface ActModeScreenProps {
  currentPhase: TddPhase | null;
  steps: readonly TddStep[];
  agents: ReadonlyMap<string, DashboardNode>;
  width: number;
  height: number;
}

function getLineColor(line: ActScreenLine, currentPhase: TddPhase | null): string {
  if (line.type === 'header') return 'magenta';
  if (line.type === 'phase-bar' && currentPhase) return PHASE_COLORS[currentPhase];
  if (line.type === 'progress') return 'cyan';
  if (line.type === 'empty') return 'gray';
  return 'white';
}

export function ActModeScreen({
  currentPhase,
  steps,
  agents,
  width,
  height,
}: ActModeScreenProps): React.ReactElement {
  const lines = useMemo(
    () => renderActScreen(currentPhase, steps, agents, width - 2),
    [currentPhase, steps, agents, width],
  );

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
          color={getLineColor(line, currentPhase)}
          bold={line.type === 'header' || line.type === 'phase-bar'}
          dimColor={line.type === 'empty'}
          wrap="truncate"
        >
          {line.text}
        </Text>
      ))}
    </Box>
  );
}
