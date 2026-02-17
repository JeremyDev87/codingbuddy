/**
 * useTerminalSize - Hook for reactive terminal dimensions.
 *
 * Provides current terminal columns/rows and the derived LayoutMode.
 * Re-renders on terminal resize events. The pure `getTerminalSize`
 * helper is exported separately for testability without React.
 */
import { useState, useEffect } from 'react';
import { useStdout } from 'ink';
import { getLayoutMode, type LayoutMode } from '../dashboard-types';

export interface TerminalSize {
  columns: number;
  rows: number;
}

const DEFAULT_SIZE: TerminalSize = { columns: 120, rows: 40 };

/**
 * Pure helper: extract terminal size from stdout (testable without React).
 */
export function getTerminalSize(stdout: NodeJS.WriteStream | undefined): TerminalSize {
  if (!stdout) return DEFAULT_SIZE;
  return {
    columns: stdout.columns ?? DEFAULT_SIZE.columns,
    rows: stdout.rows ?? DEFAULT_SIZE.rows,
  };
}

/**
 * React hook: returns { columns, rows, layoutMode } and re-renders on resize.
 */
export function useTerminalSize(): TerminalSize & { layoutMode: LayoutMode } {
  const { stdout } = useStdout();
  const [size, setSize] = useState<TerminalSize>(() => getTerminalSize(stdout));

  useEffect(() => {
    if (!stdout) return;
    const onResize = () => setSize(getTerminalSize(stdout));
    stdout.on('resize', onResize);
    return () => {
      stdout.off('resize', onResize);
    };
  }, [stdout]);

  return { ...size, layoutMode: getLayoutMode(size.columns) };
}
