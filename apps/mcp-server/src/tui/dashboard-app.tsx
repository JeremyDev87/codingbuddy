import React, { useMemo } from 'react';
import { Box } from 'ink';
import type { TuiEventBus } from './events';
import { useTerminalSize } from './hooks/use-terminal-size';
import { useDashboardState } from './hooks/use-dashboard-state';
import { HeaderBar } from './components/HeaderBar';
import { FlowMap } from './components/FlowMap';
import { FocusedAgentPanel } from './components/FocusedAgentPanel';
import { StageHealthBar } from './components/StageHealthBar';
import { computeStageHealth, detectBottlenecks } from './components/stage-health.pure';

export interface DashboardAppProps {
  eventBus?: TuiEventBus;
}

export function DashboardApp({ eventBus }: DashboardAppProps): React.ReactElement {
  const { columns, rows, layoutMode } = useTerminalSize();
  const state = useDashboardState(eventBus);
  const focusedAgent = state.focusedAgentId
    ? (state.agents.get(state.focusedAgentId) ?? null)
    : null;

  const stageHealth = useMemo(() => computeStageHealth(state.agents), [state.agents]);

  const tools = useMemo(() => {
    const seen = new Set<string>();
    for (const e of state.eventLog) {
      seen.add(e.message.split(' [')[0]);
    }
    return [...seen];
  }, [state.eventLog]);

  const bottlenecks = useMemo(() => detectBottlenecks(state.eventLog), [state.eventLog]);

  const mainHeight = Math.max(rows - 6, 10);
  const flowMapWidth =
    layoutMode === 'wide'
      ? Math.floor(columns * 0.45)
      : layoutMode === 'medium'
        ? Math.floor(columns * 0.4)
        : columns;

  const focusedAgentPanel = (
    <FocusedAgentPanel
      agent={focusedAgent}
      objectives={[]}
      tasks={state.tasks}
      tools={tools}
      inputs={[]}
      outputs={{ files: 0, commits: 0 }}
      eventLog={state.eventLog}
    />
  );

  return (
    <Box flexDirection="column" width={columns}>
      <HeaderBar
        workspace={state.workspace}
        sessionId={state.sessionId}
        currentMode={state.currentMode}
        globalState={state.globalState}
        layoutMode={layoutMode}
        width={columns}
      />
      {layoutMode === 'narrow' ? (
        <Box flexDirection="column">
          {focusedAgentPanel}
          <FlowMap
            agents={state.agents}
            edges={state.edges}
            layoutMode={layoutMode}
            width={columns}
            height={5}
          />
        </Box>
      ) : (
        <Box flexDirection="row" height={mainHeight}>
          <Box width={flowMapWidth}>
            <FlowMap
              agents={state.agents}
              edges={state.edges}
              layoutMode={layoutMode}
              width={flowMapWidth}
              height={mainHeight}
            />
          </Box>
          <Box flexGrow={1}>{focusedAgentPanel}</Box>
        </Box>
      )}
      <StageHealthBar
        stageHealth={stageHealth}
        bottlenecks={bottlenecks}
        tokenCount={0}
        width={columns}
      />
    </Box>
  );
}
