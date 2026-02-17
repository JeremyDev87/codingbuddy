import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import type { LayoutMode, DashboardNode, Edge } from '../dashboard-types';
import type { Mode } from '../types';
import { groupByStyle, type ColorCell } from '../utils/color-buffer';
import { renderFlowMap, renderFlowMapSimplified, renderFlowMapCompact } from './flow-map.pure';

/**
 * Props for FlowMap component.
 *
 * Reference stability contract: `agents` and `edges` must be stable references
 * across renders (e.g. stored in useState/useRef) for React.memo on ColorRow
 * and useMemo on the ColorBuffer to be effective. Passing new Map/Array instances
 * on every render defeats memoization and triggers full buffer recomputation.
 */
export interface FlowMapProps {
  agents: Map<string, DashboardNode>;
  edges: Edge[];
  layoutMode: LayoutMode;
  width: number;
  height: number;
  activeStage?: Mode | null;
}

/**
 * Trim trailing empty-style space cells from a row.
 */
function trimTrailingSpaces(cells: ReadonlyArray<ColorCell>): ReadonlyArray<ColorCell> {
  let end = cells.length;
  while (end > 0) {
    const cell = cells[end - 1];
    if (cell.char !== ' ' || cell.style.fg || cell.style.bold || cell.style.dim) break;
    end--;
  }
  return end === cells.length ? cells : cells.slice(0, end);
}

/**
 * Render a row of ColorCells as grouped <Text> spans with styles.
 * Memoized to skip re-render when row cells reference is unchanged.
 */
const ColorRow = React.memo(function ColorRow({
  cells,
}: {
  cells: ReadonlyArray<ColorCell>;
}): React.ReactElement {
  const trimmed = trimTrailingSpaces(cells);
  if (trimmed.length === 0) return <Box />;
  const segments = groupByStyle(trimmed);
  return (
    <Box>
      {segments.map((seg, i) => (
        <Text key={i} color={seg.style.fg} bold={seg.style.bold} dimColor={seg.style.dim}>
          {seg.text}
        </Text>
      ))}
    </Box>
  );
});

export function FlowMap({
  agents,
  edges,
  layoutMode,
  width,
  height,
  activeStage = null,
}: FlowMapProps): React.ReactElement {
  const compactContent = useMemo(() => {
    if (layoutMode !== 'narrow') return null;
    return renderFlowMapCompact(agents);
  }, [agents, layoutMode]);

  const lines = useMemo(() => {
    if (layoutMode === 'narrow') return null;
    const buf =
      layoutMode === 'wide'
        ? renderFlowMap(agents, edges, width, height, activeStage)
        : renderFlowMapSimplified(agents, width, height);
    return buf.toLinesDirect();
  }, [agents, edges, width, height, layoutMode, activeStage]);

  if (layoutMode === 'narrow') {
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">
          FLOW MAP
        </Text>
        <Text>{compactContent}</Text>
      </Box>
    );
  }

  if (!lines) {
    return (
      <Box flexDirection="column" width={width}>
        <Text bold color="cyan">
          FLOW MAP
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width={width}>
      <Text bold color="cyan">
        FLOW MAP
      </Text>
      {lines.map((row, y) => (
        <ColorRow key={y} cells={row} />
      ))}
    </Box>
  );
}
