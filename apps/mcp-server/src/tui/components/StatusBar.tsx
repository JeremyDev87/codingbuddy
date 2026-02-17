import React from 'react';
import { Text, useStdout } from 'ink';
import type { AgentState } from '../types';
import type { SkillRecommendedEvent } from '../events';
import {
  countActiveAgents,
  calculateOverallProgress,
  determinePhase,
  buildSkillsDisplay,
  buildCompactStatusParts,
  getPhaseColor,
} from './status-bar.pure';

export interface StatusBarProps {
  agents: AgentState[];
  skills: SkillRecommendedEvent[];
}

export function StatusBar({ agents, skills }: StatusBarProps): React.ReactElement {
  const { stdout } = useStdout();
  const terminalWidth = stdout?.columns ?? 80;
  const activeCount = countActiveAgents(agents);
  const progress = calculateOverallProgress(agents);
  const phase = determinePhase(agents);
  const skillsText = buildSkillsDisplay(skills);
  const parts = buildCompactStatusParts(activeCount, skillsText, progress, phase, terminalWidth);
  const phaseColor = getPhaseColor(phase);

  if (!parts.mainContent && !parts.phaseContent) {
    return <Text dimColor>{parts.leftDivider}</Text>;
  }

  // The spaces between dividers and content are accounted for in
  // buildCompactStatusParts (the -2 in remaining width calculation).
  return (
    <Text>
      <Text dimColor>
        {parts.leftDivider} {parts.mainContent}
      </Text>
      <Text color={phaseColor}>{parts.phaseContent}</Text>
      <Text dimColor> {parts.rightDivider}</Text>
    </Text>
  );
}
