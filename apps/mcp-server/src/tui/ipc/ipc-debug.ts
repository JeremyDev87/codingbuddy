/**
 * Factory for creating debug loggers that only write when MCP_DEBUG=1.
 * Shared across IPC modules to avoid duplicating the same pattern.
 */
export function createIpcDebugLogger(prefix: string): (message: string) => void {
  return (message: string): void => {
    if (process.env.MCP_DEBUG === '1') {
      process.stderr.write(`[codingbuddy:${prefix}] ${message}\n`);
    }
  };
}
