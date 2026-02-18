import React from 'react';
import { Box, Text } from 'ink';
import { resolveChecklistTasks } from './checklist-panel.pure';
import { formatEnhancedChecklist } from './focused-agent.pure';
import { BORDER_COLORS } from '../utils/theme';
import type { TaskItem } from '../dashboard-types';

export interface ChecklistPanelProps {
  tasks: TaskItem[];
  contextDecisions?: string[];
  contextNotes?: string[];
  width?: number;
  height?: number;
}

export function ChecklistPanel({
  tasks,
  contextDecisions = [],
  contextNotes = [],
  width,
  height,
}: ChecklistPanelProps): React.ReactElement {
  const resolvedTasks = resolveChecklistTasks(tasks, contextDecisions, contextNotes);
  const checklist = formatEnhancedChecklist(resolvedTasks);

  return (
    <Box
      borderStyle="single"
      borderColor={BORDER_COLORS.panel}
      flexDirection="column"
      width={width}
      height={height}
    >
      <Text bold dimColor>
        ─── Checklist
      </Text>
      {checklist.split('\n').map((line, i) => {
        const isCompleted = line.includes('✔');
        return (
          <Text key={i} color={isCompleted ? 'green' : undefined}>
            {line}
          </Text>
        );
      })}
    </Box>
  );
}
