export interface TuiConfigInput {
  readonly transportMode: 'stdio' | 'sse';
  readonly tuiEnabled: boolean;
  readonly stderrIsTTY: boolean;
}

export interface TuiConfig {
  readonly shouldRender: boolean;
  readonly target: 'stdout' | 'stderr' | null;
  readonly reason: string;
}

export function resolveTuiConfig(input: TuiConfigInput): TuiConfig {
  if (!input.tuiEnabled) {
    return {
      shouldRender: false,
      target: null,
      reason: 'TUI not enabled (--tui flag not present)',
    };
  }

  if (input.transportMode === 'sse') {
    return {
      shouldRender: true,
      target: 'stdout',
      reason: 'SSE mode: TUI renders to stdout',
    };
  }

  // stdio mode
  if (!input.stderrIsTTY) {
    return {
      shouldRender: false,
      target: null,
      reason: 'stderr is not a TTY; skipping TUI render',
    };
  }

  return {
    shouldRender: true,
    target: 'stderr',
    reason: 'stdio mode: TUI renders to stderr to protect stdout for MCP JSON-RPC',
  };
}
