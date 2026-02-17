export { HeaderBar, type HeaderBarProps } from './HeaderBar';
/** @deprecated formatHeaderBar is no longer used by HeaderBar (now Ink-native). Kept for backward compatibility. */
export { formatHeaderBar, formatTime, type HeaderBarData } from './header-bar.pure';
export { FlowMap, type FlowMapProps } from './FlowMap';
export {
  renderFlowMap,
  renderFlowMapSimplified,
  renderFlowMapCompact,
  layoutStageColumns,
  layoutAgentNodes,
} from './flow-map.pure';
export { FocusedAgentPanel, type FocusedAgentPanelProps } from './FocusedAgentPanel';
/** @deprecated formatAgentHeader is no longer used by FocusedAgentPanel (now Ink-native). Kept for backward compatibility. */
export { formatAgentHeader } from './focused-agent.pure';
export {
  formatObjective,
  formatChecklist,
  formatToolIO,
  formatLogTail,
  formatSectionDivider,
  formatProgressBar,
  type ToolIOData,
} from './focused-agent.pure';
export { StageHealthBar, type StageHealthBarProps } from './StageHealthBar';
/** @deprecated formatStageHealthBar is no longer used by StageHealthBar (now Ink-native). Kept for backward compatibility. */
export { formatStageHealthBar } from './stage-health.pure';
export { computeStageHealth, detectBottlenecks } from './stage-health.pure';
export { computeGridLayout } from './grid-layout.pure';
export { ActivityVisualizer, type ActivityVisualizerProps } from './ActivityVisualizer';
export {
  aggregateToolCalls,
  getDensityChar,
  renderHeatmap,
  renderBubbles,
  type HeatmapData,
} from './activity-visualizer.pure';
export { SessionTabBar } from './SessionTabBar';
export type { SessionTabBarProps } from './SessionTabBar';
