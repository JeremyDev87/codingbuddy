import React from 'react';
import { Box, Text } from 'ink';
import type { LayoutMode, GlobalRunState } from '../dashboard-types';
import type { Mode } from '../types';
import { getModeColor, GLOBAL_STATE_ICONS, GLOBAL_STATE_COLORS } from '../utils/theme';

export interface HeaderBarProps {
  workspace: string;
  sessionId: string;
  currentMode: Mode | null;
  globalState: GlobalRunState;
  layoutMode: LayoutMode;
  width: number;
}

const ALL_MODES: Mode[] = ['PLAN', 'ACT', 'EVAL', 'AUTO'];

/** Characters reserved for border (4), title (~32), mode flow (~30), state (~8), gaps (~8). */
const HEADER_RESERVED_CHARS = 82;

function ModeFlow({ currentMode }: { currentMode: Mode | null }): React.ReactElement {
  return (
    <Box>
      {ALL_MODES.map((mode, i) => {
        const isActive = mode === currentMode;
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

function StateIndicator({ globalState }: { globalState: GlobalRunState }): React.ReactElement {
  const icon = GLOBAL_STATE_ICONS[globalState];
  const color = GLOBAL_STATE_COLORS[globalState];
  return (
    <Text color={color} bold={globalState === 'RUNNING' || globalState === 'ERROR'}>
      {icon} {globalState}
    </Text>
  );
}

function truncateWorkspace(ws: string, maxLen: number): string {
  if (ws.length <= maxLen) return ws;
  const segments = ws.split('/').filter(Boolean);
  if (segments.length <= 1) return '…' + ws.slice(-(maxLen - 1));
  // Show last 2 path segments
  const short = segments.slice(-2).join('/');
  return short.length <= maxLen ? short : '…' + ws.slice(-(maxLen - 1));
}

export function HeaderBar({
  workspace,
  sessionId,
  currentMode,
  globalState,
  layoutMode,
  width,
}: HeaderBarProps): React.ReactElement {
  if (layoutMode === 'narrow') {
    return (
      <Box borderStyle="double" borderColor="cyan" width={width} flexDirection="row">
        <Text color="cyan" bold>
          ⟨⟩ CODINGBUDDY
        </Text>
        <Box flexGrow={1} />
        <ModeFlow currentMode={currentMode} />
        <Box flexGrow={1} />
        <StateIndicator globalState={globalState} />
      </Box>
    );
  }

  const reservedChars = HEADER_RESERVED_CHARS;
  const maxWsLen = Math.max(8, width - reservedChars - 16);
  const displayWs = truncateWorkspace(workspace, maxWsLen);
  const sessDisplay = sessionId.length > 8 ? sessionId.slice(0, 8) : sessionId;

  return (
    <Box borderStyle="double" borderColor="cyan" width={width} flexDirection="row">
      <Box gap={2}>
        <Text color="cyan" bold>
          ⟨⟩ CODINGBUDDY AGENT DASHBOARD
        </Text>
        <ModeFlow currentMode={currentMode} />
        <StateIndicator globalState={globalState} />
      </Box>
      <Box flexGrow={1} />
      <Box gap={2}>
        <Text dimColor>{displayWs}</Text>
        <Text dimColor>sess:{sessDisplay}</Text>
      </Box>
    </Box>
  );
}
