import React, { useMemo } from 'react';
import { Box } from 'ink';
import type { TuiEventBus } from './events';
import { useTerminalSize } from './hooks/use-terminal-size';
import { useDashboardState } from './hooks/use-dashboard-state';
import { HeaderBar } from './components/HeaderBar';
import { FlowMap } from './components/FlowMap';
import { FocusedAgentPanel } from './components/FocusedAgentPanel';
import { StageHealthBar } from './components/StageHealthBar';
import { MonitorPanel } from './components/MonitorPanel';
import { computeStageHealth, detectBottlenecks } from './components/stage-health.pure';
import { computeGridLayout } from './components/grid-layout.pure';

const EMPTY_OUTPUTS = { files: 0, commits: 0 } as const;

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

  const grid = useMemo(
    () => computeGridLayout(columns, rows, layoutMode),
    [columns, rows, layoutMode],
  );

  return (
    <Box flexDirection="column" width={grid.total.width} height={grid.total.height}>
      <HeaderBar
        workspace={state.workspace}
        sessionId={state.sessionId}
        currentMode={state.currentMode}
        globalState={state.globalState}
        layoutMode={layoutMode}
        width={grid.header.width}
      />
      {layoutMode === 'narrow' ? (
        <Box flexDirection="column">
          <FocusedAgentPanel
            agent={focusedAgent}
            objectives={state.objectives}
            activeSkills={state.activeSkills}
            tasks={state.tasks}
            tools={tools}
            inputs={tools}
            outputs={EMPTY_OUTPUTS}
            eventLog={state.eventLog}
            width={grid.focusedAgent.width}
            height={grid.focusedAgent.height}
          />
          <FlowMap
            agents={state.agents}
            edges={state.edges}
            layoutMode={layoutMode}
            width={grid.flowMap.width}
            height={grid.flowMap.height}
          />
        </Box>
      ) : (
        <Box flexDirection="row" width={grid.total.width} height={grid.focusedAgent.height}>
          <Box flexDirection="column" width={grid.flowMap.width}>
            <FlowMap
              agents={state.agents}
              edges={state.edges}
              layoutMode={layoutMode}
              width={grid.flowMap.width}
              height={grid.flowMap.height}
            />
            <MonitorPanel
              eventLog={state.eventLog}
              agents={state.agents}
              tasks={state.tasks}
              width={grid.monitorPanel.width}
              height={grid.monitorPanel.height}
            />
          </Box>
          <FocusedAgentPanel
            agent={focusedAgent}
            objectives={state.objectives}
            activeSkills={state.activeSkills}
            tasks={state.tasks}
            tools={tools}
            inputs={tools}
            outputs={EMPTY_OUTPUTS}
            eventLog={state.eventLog}
            width={grid.focusedAgent.width}
            height={grid.focusedAgent.height}
          />
        </Box>
      )}
      <StageHealthBar
        stageHealth={stageHealth}
        bottlenecks={bottlenecks}
        tokenCount={0}
        width={grid.stageHealth.width}
      />
    </Box>
  );
}
