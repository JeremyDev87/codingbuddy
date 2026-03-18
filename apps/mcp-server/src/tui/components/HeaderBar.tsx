import React from 'react';
import { Box, Text } from 'ink';
import type { LayoutMode, GlobalRunState } from '../dashboard-types';
import type { Mode } from '../types';
import {
  getModeColor,
  GLOBAL_STATE_ICONS,
  GLOBAL_STATE_COLORS,
  BORDER_COLORS,
} from '../utils/theme';
import { spinnerFrame, formatTimeWithSeconds } from './live.pure';

export interface HeaderBarProps {
  workspace: string;
  currentMode: Mode | null;
  globalState: GlobalRunState;
  layoutMode: LayoutMode;
  width: number;
  tick?: number;
  now?: number;
}

const PROCESS_MODES: Mode[] = ['PLAN', 'ACT', 'EVAL'];

function ModeFlow({ currentMode }: { currentMode: Mode | null }): React.ReactElement {
  const isAutoMode = currentMode === 'AUTO';
  return (
    <Box>
      {isAutoMode && (
        <>
          <Text color={getModeColor('AUTO')} bold>
            [AUTO]
          </Text>
          <Text dimColor> </Text>
        </>
      )}
      {PROCESS_MODES.map((mode, i) => {
        const isActive = !isAutoMode && mode === currentMode;
        const color = getModeColor(mode);
        return (
          <React.Fragment key={mode}>
            {i > 0 && <Text dimColor> → </Text>}
            {isActive ? (
              <Text color={color} bold>
                [{mode}]
              </Text>
            ) : (
              <Text dimColor>{mode}</Text>
            )}
          </React.Fragment>
        );
      })}
    </Box>
  );
}

function StateIndicator({
  globalState,
  tick,
}: {
  globalState: GlobalRunState;
  tick?: number;
}): React.ReactElement {
  const isRunning = globalState === 'RUNNING';
  const icon =
    isRunning && tick !== undefined ? spinnerFrame(tick) : GLOBAL_STATE_ICONS[globalState];
  const color = GLOBAL_STATE_COLORS[globalState];
  return (
    <Text color={color} bold={isRunning || globalState === 'ERROR'}>
      {icon} {globalState}
    </Text>
  );
}

export function HeaderBar({
  workspace,
  currentMode,
  globalState,
  layoutMode,
  width,
  tick,
  now,
}: HeaderBarProps): React.ReactElement {
  if (layoutMode === 'narrow') {
    return (
      <Box
        borderStyle="double"
        borderColor={BORDER_COLORS.panel}
        width={width}
        overflowX="hidden"
        flexDirection="row"
      >
        <Text color="cyan" bold>
          ⟨⟩ CODINGBUDDY
        </Text>
        <Box flexGrow={1} />
        <ModeFlow currentMode={currentMode} />
        <Box flexGrow={1} />
        <StateIndicator globalState={globalState} tick={tick} />
        {now !== undefined && (
          <Text dimColor> {formatTimeWithSeconds(now)}</Text>
        )}
      </Box>
    );
  }

  return (
    <Box
      borderStyle="double"
      borderColor={BORDER_COLORS.panel}
      width={width}
      overflowX="hidden"
      flexDirection="row"
    >
      {/* flexShrink={1} prevents left content from overflowing the double-border in
          narrow terminals. Note: this visual overflow only occurs in real terminals —
          ink-testing-library clips content at the specified width, making unit test
          reproduction impossible. */}
      <Box gap={2} flexShrink={1} minWidth={0}>
        <Text color="cyan" bold>
          ⟨⟩ CODINGBUDDY AGENT DASHBOARD
        </Text>
        <ModeFlow currentMode={currentMode} />
        <StateIndicator globalState={globalState} tick={tick} />
        {now !== undefined && (
          <Text dimColor>{formatTimeWithSeconds(now)}</Text>
        )}
      </Box>
      <Box flexGrow={1} />
      <Box flexShrink={1} overflowX="hidden">
        <Text dimColor wrap="truncate">
          {workspace}
        </Text>
      </Box>
    </Box>
  );
}
