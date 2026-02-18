import React, { useMemo } from 'react';
import { Box } from 'ink';
import type { TuiEventBus } from './events';
import type { DashboardState } from './dashboard-types';
import { useTerminalSize } from './hooks/use-terminal-size';
import { useDashboardState } from './hooks/use-dashboard-state';
import { HeaderBar } from './components/HeaderBar';
import { FlowMap } from './components/FlowMap';
import { FocusedAgentPanel } from './components/FocusedAgentPanel';
import { ChecklistPanel } from './components/ChecklistPanel';
import { StageHealthBar } from './components/StageHealthBar';
import { ActivityVisualizer } from './components/ActivityVisualizer';
import { computeStageHealth, detectBottlenecks } from './components/stage-health.pure';
import { computeGridLayout } from './components/grid-layout.pure';

export interface DashboardAppProps {
  eventBus?: TuiEventBus;
  externalState?: DashboardState;
  workspace?: string;
}

export function DashboardApp({
  eventBus,
  externalState,
  workspace: workspaceProp,
}: DashboardAppProps): React.ReactElement {
  const { columns, rows, layoutMode } = useTerminalSize();
  const internalState = useDashboardState(externalState ? undefined : eventBus);
  const state = externalState ?? internalState;
  const focusedAgent = state.focusedAgentId
    ? (state.agents.get(state.focusedAgentId) ?? null)
    : null;

  const stageHealth = useMemo(() => computeStageHealth(state.agents), [state.agents]);

  const bottlenecks = useMemo(() => detectBottlenecks(state.eventLog), [state.eventLog]);

  const grid = useMemo(
    () => computeGridLayout(columns, rows, layoutMode),
    [columns, rows, layoutMode],
  );

  return (
    <Box flexDirection="column" width={grid.total.width} height={grid.total.height}>
      <HeaderBar
        workspace={workspaceProp ?? state.workspace}
        currentMode={state.currentMode}
        globalState={state.globalState}
        layoutMode={layoutMode}
        width={grid.header.width}
      />
      {layoutMode === 'narrow' ? (
        <Box flexDirection="column">
          {grid.checklistPanel.height > 0 && (
            <ChecklistPanel
              tasks={state.tasks}
              contextDecisions={state.contextDecisions}
              contextNotes={state.contextNotes}
              width={grid.checklistPanel.width}
              height={grid.checklistPanel.height}
            />
          )}
          <FocusedAgentPanel
            agent={focusedAgent}
            objectives={state.objectives}
            activeSkills={state.activeSkills}
            eventLog={state.eventLog}
            contextDecisions={state.contextDecisions}
            contextNotes={state.contextNotes}
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
        <Box
          flexDirection="row"
          width={grid.total.width}
          height={grid.checklistPanel.height + grid.focusedAgent.height}
        >
          <Box flexDirection="column" width={grid.flowMap.width}>
            <FlowMap
              agents={state.agents}
              edges={state.edges}
              layoutMode={layoutMode}
              width={grid.flowMap.width}
              height={grid.flowMap.height}
            />
            <ActivityVisualizer
              currentMode={state.currentMode}
              focusedAgent={focusedAgent}
              agents={state.agents}
              edges={state.edges}
              activeSkills={state.activeSkills}
              objectives={state.objectives}
              width={grid.monitorPanel.width}
              height={grid.monitorPanel.height}
            />
          </Box>
          <Box flexDirection="column" width={grid.checklistPanel.width}>
            <ChecklistPanel
              tasks={state.tasks}
              contextDecisions={state.contextDecisions}
              contextNotes={state.contextNotes}
              width={grid.checklistPanel.width}
              height={grid.checklistPanel.height}
            />
            <FocusedAgentPanel
              agent={focusedAgent}
              objectives={state.objectives}
              activeSkills={state.activeSkills}
              eventLog={state.eventLog}
              contextDecisions={state.contextDecisions}
              contextNotes={state.contextNotes}
              width={grid.focusedAgent.width}
              height={grid.focusedAgent.height}
            />
          </Box>
        </Box>
      )}
      <StageHealthBar
        stageHealth={stageHealth}
        bottlenecks={bottlenecks}
        toolCount={state.toolInvokeCount}
        width={grid.stageHealth.width}
      />
    </Box>
  );
}
