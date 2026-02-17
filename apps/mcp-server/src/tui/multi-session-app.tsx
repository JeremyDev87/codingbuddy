import React, { useMemo, useCallback } from 'react';
import { Box, useInput } from 'ink';
import type { KeyInput } from 'ink';
import * as path from 'path';
import type { MultiSessionManager } from './ipc/multi-session-manager';
import { useTerminalSize } from './hooks/use-terminal-size';
import { useMultiSessionState } from './hooks/use-multi-session-state';
import { SessionTabBar } from './components/SessionTabBar';
import { DashboardApp } from './dashboard-app';
import type { SessionTab } from './components/session-tab-bar.pure';

export interface MultiSessionAppProps {
  manager: MultiSessionManager;
}

export function MultiSessionApp({ manager }: MultiSessionAppProps): React.ReactElement {
  const { columns, layoutMode } = useTerminalSize();
  const { sessions, activeSessionPid, switchNext, switchPrev, switchByIndex } =
    useMultiSessionState(manager);

  const tabs: SessionTab[] = useMemo(() => {
    let index = 0;
    const result: SessionTab[] = [];
    for (const [pid, sessionState] of sessions) {
      index += 1;
      result.push({
        pid,
        index,
        projectName: path.basename(sessionState.projectRoot),
        globalState: sessionState.dashboardState.globalState,
        isActive: pid === activeSessionPid,
      });
    }
    return result;
  }, [sessions, activeSessionPid]);

  const activeEventBus = useMemo(() => {
    if (activeSessionPid === null) return undefined;
    const managedSessions = manager.getSessions();
    const found = managedSessions.find(s => s.instance.pid === activeSessionPid);
    return found?.eventBus;
  }, [manager, activeSessionPid]);

  const handleInput = useCallback(
    (input: string, key: KeyInput) => {
      if (key.rightArrow) {
        switchNext();
        return;
      }
      if (key.leftArrow) {
        switchPrev();
        return;
      }
      // Digit keys 1-9 for direct session switching
      const num = parseInt(input, 10);
      if (num >= 1 && num <= 9) {
        switchByIndex(num);
      }
    },
    [switchNext, switchPrev, switchByIndex],
  );

  useInput(handleInput);

  return (
    <Box flexDirection="column">
      <SessionTabBar sessions={tabs} width={columns} layoutMode={layoutMode} />
      {/* key={pid} forces remount on session switch — intentional tradeoff:
          per-session widget state (scroll, focus) resets, but ensures clean isolation
          between sessions without cross-contamination of stale React state. */}
      <DashboardApp key={activeSessionPid ?? 'none'} eventBus={activeEventBus} />
    </Box>
  );
}
