import React from 'react';
import { Box, Text } from 'ink';
import type { AgentState } from '../types';
import type { SkillRecommendedEvent } from '../events';
import {
  countActiveAgents,
  calculateOverallProgress,
  buildStatusProgressBar,
  determinePhase,
  buildSkillsDisplay,
  type Phase,
} from './status-bar.pure';

const PROGRESS_WIDTH = 10;

const PHASE_COLORS: Record<Phase, string> = {
  Parallel: 'cyan',
  Sequential: 'green',
  Waiting: 'gray',
};

export interface StatusBarProps {
  agents: AgentState[];
  skills: SkillRecommendedEvent[];
}

export function StatusBar({
  agents,
  skills,
}: StatusBarProps): React.ReactElement {
  const activeCount = countActiveAgents(agents);
  const progress = calculateOverallProgress(agents);
  const progressBar = buildStatusProgressBar(progress, PROGRESS_WIDTH);
  const phase = determinePhase(agents);
  const skillsText = buildSkillsDisplay(skills);
  const phaseColor = PHASE_COLORS[phase];

  return (
    <Box borderStyle="single" paddingX={1}>
      <Text>🤖 {activeCount} active</Text>
      <Text> 🎹 {skillsText}</Text>
      <Text>
        {' '}
        {progressBar} {progress}%
      </Text>
      <Text color={phaseColor}> ⚡ {phase}</Text>
    </Box>
  );
}
