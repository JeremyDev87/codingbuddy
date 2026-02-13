import React from 'react';
import { Box, Text } from 'ink';
import type { AgentState } from '../types';
import type { SkillRecommendedEvent } from '../events/types';
import { ProgressBar } from './ProgressBar';
import {
  countActiveAgents,
  getActiveSkillName,
  computeOverallProgress,
  resolvePhase,
  buildPhaseLabel,
} from './status-bar.pure';

export interface StatusBarProps {
  agents: AgentState[];
  skills: SkillRecommendedEvent[];
  isParallelPhase: boolean;
}

const PROGRESS_WIDTH = 10;

export function StatusBar({
  agents,
  skills,
  isParallelPhase,
}: StatusBarProps): React.ReactElement {
  const activeCount = countActiveAgents(agents);
  const skillName = getActiveSkillName(skills);
  const progress = computeOverallProgress(agents);
  const phase = resolvePhase(activeCount, isParallelPhase);
  const phaseLabel = buildPhaseLabel(phase);

  return (
    <Box
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
      justifyContent="space-between"
    >
      <Text>
        <Text bold>🤖 {activeCount} active</Text>
        {'  '}
        {skillName !== null && (
          <Text>
            🎹 <Text color="cyan">{skillName}</Text>
          </Text>
        )}
      </Text>
      <Box>
        <ProgressBar value={progress} width={PROGRESS_WIDTH} />
        <Text> {progress}%</Text>
        <Text dimColor> {phaseLabel}</Text>
      </Box>
    </Box>
  );
}
