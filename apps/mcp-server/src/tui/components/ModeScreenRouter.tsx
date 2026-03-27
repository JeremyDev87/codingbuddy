/**
 * Mode Screen Router — Routes to the correct mode-specific screen.
 *
 * Switches content area based on currentMode:
 * - PLAN → PlanModeScreen (agent summoning + discussion)
 * - ACT → ActModeScreen (TDD progress + steps)
 * - EVAL → EvalModeScreen (review results + scores)
 * - AUTO → cycles through the above based on current phase
 * - null → FlowMap (default/idle)
 *
 * Also shows a disconnection banner when event bridge is disconnected.
 */
import React from 'react';
import { Box, Text } from 'ink';
import type { Mode } from '../types';
import type { DashboardState, ConnectionStatus, LayoutMode } from '../dashboard-types';
import { PlanModeScreen } from './PlanModeScreen';
import { ActModeScreen } from './ActModeScreen';
import { EvalModeScreen } from './EvalModeScreen';
import { FlowMap } from './FlowMap';

export interface ModeScreenRouterProps {
  state: DashboardState;
  layoutMode: LayoutMode;
  width: number;
  height: number;
  tick: number;
  now: number;
}

/**
 * Determine which mode screen to render.
 * AUTO mode delegates to PLAN/ACT/EVAL based on context.
 */
export function resolveModeScreen(
  mode: Mode | null,
  hasDiscussionRounds: boolean,
  hasTddSteps: boolean,
  hasReviewResults: boolean,
): 'plan' | 'act' | 'eval' | 'flow' {
  if (mode === null) return 'flow';

  if (mode === 'AUTO') {
    // AUTO: choose screen based on available data
    if (hasReviewResults) return 'eval';
    if (hasTddSteps) return 'act';
    if (hasDiscussionRounds) return 'plan';
    return 'plan'; // default AUTO starts with PLAN
  }

  switch (mode) {
    case 'PLAN':
      return 'plan';
    case 'ACT':
      return 'act';
    case 'EVAL':
      return 'eval';
  }
}

/**
 * Render disconnection banner when event bridge is disconnected.
 */
function DisconnectBanner({
  status,
  width,
}: {
  status: ConnectionStatus;
  width: number;
}): React.ReactElement | null {
  if (status === 'connected') return null;
  const icon = status === 'reconnecting' ? '🔄' : '⚠️';
  const msg = status === 'reconnecting' ? 'Reconnecting...' : 'Disconnected';
  return (
    <Box width={width} height={1}>
      <Text color="yellow" bold>
        {`${icon} Event Bridge: ${msg}`}
      </Text>
    </Box>
  );
}

export function ModeScreenRouter({
  state,
  layoutMode,
  width,
  height,
  tick,
  now,
}: ModeScreenRouterProps): React.ReactElement {
  const bannerHeight = state.connectionStatus !== 'connected' ? 1 : 0;
  const contentHeight = height - bannerHeight;

  const screen = resolveModeScreen(
    state.currentMode,
    state.discussionRounds.length > 0,
    state.tddSteps.length > 0,
    state.reviewResults.length > 0,
  );

  return (
    <Box flexDirection="column" width={width} height={height}>
      <DisconnectBanner status={state.connectionStatus} width={width} />
      {screen === 'plan' && (
        <PlanModeScreen
          agents={state.agents}
          rounds={state.discussionRounds}
          width={width}
          height={contentHeight}
        />
      )}
      {screen === 'act' && (
        <ActModeScreen
          currentPhase={state.tddCurrentPhase}
          steps={state.tddSteps}
          agents={state.agents}
          width={width}
          height={contentHeight}
        />
      )}
      {screen === 'eval' && (
        <EvalModeScreen
          results={state.reviewResults}
          width={width}
          height={contentHeight}
        />
      )}
      {screen === 'flow' && (
        <FlowMap
          agents={state.agents}
          edges={state.edges}
          layoutMode={layoutMode}
          width={width}
          height={contentHeight}
          activeStage={state.currentMode}
          tick={tick}
          now={now}
        />
      )}
    </Box>
  );
}
