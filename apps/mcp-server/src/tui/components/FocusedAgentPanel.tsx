import React from 'react';
import { Box, Text } from 'ink';
import type { DashboardNode, EventLogEntry } from '../dashboard-types';
import { STATUS_ICONS, getNodeStatusColor, BORDER_COLORS, getAgentAvatar } from '../utils/theme';
import {
  formatObjective,
  formatLogTail,
  formatLogTailRelative,
  formatSectionDivider,
  formatEnhancedProgressBar,
} from './focused-agent.pure';
import { spinnerFrame, formatElapsed } from './live.pure';
import { ContextSection } from './ContextSection';

export interface FocusedAgentPanelProps {
  agent: DashboardNode | null;
  objectives: string[];
  activeSkills: string[];
  eventLog: EventLogEntry[];
  contextDecisions?: string[];
  contextNotes?: string[];
  tick?: number;
  now?: number;
  width?: number;
  height?: number;
}

function SectionDivider({ title }: { title: string }): React.ReactElement {
  return <Text color="magenta">{formatSectionDivider(title)}</Text>;
}

function LogSection({
  logs,
  eventLog,
}: {
  logs: string | null;
  eventLog: EventLogEntry[];
}): React.ReactElement {
  if (!logs) return <Text dimColor>No events</Text>;
  const logLines = logs.split('\n');
  const offset = eventLog.length - logLines.length;
  return (
    <>
      {logLines.map((line, i) => {
        const ev = eventLog[offset + i];
        const isError = ev?.level === 'error';
        const spaceIdx = line.indexOf(' ');
        const timestamp = spaceIdx > 0 ? line.slice(0, spaceIdx) : line;
        const message = spaceIdx > 0 ? line.slice(spaceIdx + 1) : '';
        return (
          <Box key={i} gap={1}>
            <Text dimColor>{timestamp}</Text>
            <Text color={isError ? 'red' : undefined}>{message}</Text>
          </Box>
        );
      })}
    </>
  );
}

export function FocusedAgentPanel({
  agent,
  objectives,
  activeSkills,
  eventLog,
  contextDecisions = [],
  contextNotes = [],
  tick,
  now,
  width,
  height,
}: FocusedAgentPanelProps): React.ReactElement {
  if (!agent) {
    return (
      <Box
        borderStyle="single"
        borderColor={BORDER_COLORS.panel}
        flexDirection="column"
        width={width}
        height={height}
      >
        <Text dimColor>No agent focused</Text>
      </Box>
    );
  }

  const avatar = getAgentAvatar(agent.name);
  const icon = STATUS_ICONS[agent.status] ?? '?';
  const statusColor = getNodeStatusColor(agent.status);
  const statusLabel = agent.status.toUpperCase();
  const progressBar = formatEnhancedProgressBar(agent.progress);
  const objective = formatObjective(objectives);
  const logs = now != null ? formatLogTailRelative(eventLog, now) : formatLogTail(eventLog);
  const isRunning = agent.status === 'running';
  const showSpinner = isRunning && tick != null;
  const showElapsed = isRunning && now != null && agent.startedAt != null;

  return (
    <Box
      borderStyle="single"
      borderColor={BORDER_COLORS.panel}
      flexDirection="column"
      width={width}
      height={height}
    >
      {/* Agent Header */}
      <Box gap={2}>
        <Text>{avatar}</Text>
        <Text bold>{agent.name}</Text>
        {showSpinner ? (
          <Text color="cyan">{spinnerFrame(tick!)}</Text>
        ) : (
          <Text color={statusColor} bold>
            {icon}
          </Text>
        )}
        <Text color={statusColor}>{statusLabel}</Text>
        {showElapsed && (
          <Text dimColor>{formatElapsed(agent.startedAt!, now!)}</Text>
        )}
        <Text dimColor>{agent.stage}</Text>
      </Box>

      {/* Progress Bar */}
      <Box gap={1}>
        <Text color="magenta">{progressBar.bar}</Text>
        <Text dimColor>{progressBar.label}</Text>
      </Box>

      {/* Objective Section */}
      <SectionDivider title="Objective" />
      {objective ? <Text>{objective}</Text> : <Text dimColor>No objectives</Text>}

      {/* Skills Section */}
      <SectionDivider title="Skills" />
      {activeSkills.length > 0 ? (
        activeSkills.map((s, i) => <Text key={i}> {s}</Text>)
      ) : (
        <Text dimColor>No skills</Text>
      )}

      {/* Context Section */}
      <SectionDivider title="Context" />
      {contextDecisions.length > 0 || contextNotes.length > 0 ? (
        <ContextSection decisions={contextDecisions} notes={contextNotes} width={width} />
      ) : (
        <Text dimColor>No context</Text>
      )}

      {/* Event Log Section */}
      <SectionDivider title="Event Log" />
      <LogSection logs={logs} eventLog={eventLog} />
    </Box>
  );
}
