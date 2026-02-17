import React from 'react';
import { Box, Text } from 'ink';
import type { DashboardNode, TaskItem, EventLogEntry } from '../dashboard-types';
import {
  formatAgentHeader,
  formatObjective,
  formatChecklist,
  formatToolIO,
  formatLogTail,
  type ToolIOData,
} from './focused-agent.pure';

export interface FocusedAgentPanelProps {
  agent: DashboardNode | null;
  objectives: string[];
  tasks: TaskItem[];
  tools: string[];
  inputs: string[];
  outputs: ToolIOData;
  eventLog: EventLogEntry[];
}

export function FocusedAgentPanel({
  agent,
  objectives,
  tasks,
  tools,
  inputs,
  outputs,
  eventLog,
}: FocusedAgentPanelProps): React.ReactElement {
  if (!agent) {
    return (
      <Box borderStyle="single" flexDirection="column">
        <Text dimColor>No agent focused</Text>
      </Box>
    );
  }

  const header = formatAgentHeader(agent.name, agent.id, agent.status, agent.stage, agent.progress);
  const objective = formatObjective(objectives);
  const checklist = formatChecklist(tasks);
  const toolIO = formatToolIO(tools, inputs, outputs);
  const logs = formatLogTail(eventLog);

  return (
    <Box flexDirection="column">
      <Box borderStyle="single" flexDirection="column">
        <Text bold>{header}</Text>
      </Box>
      <Box borderStyle="single" flexDirection="column">
        <Text bold>Objective</Text>
        <Text>{objective}</Text>
      </Box>
      <Box borderStyle="single" flexDirection="column">
        <Text bold>Checklist</Text>
        <Text>{checklist}</Text>
      </Box>
      <Box borderStyle="single" flexDirection="column">
        <Text bold>Tool / IO</Text>
        <Text>{toolIO}</Text>
      </Box>
      <Box borderStyle="single" flexDirection="column" flexGrow={1}>
        <Text bold>Logs (tail)</Text>
        <Text>{logs}</Text>
      </Box>
    </Box>
  );
}
