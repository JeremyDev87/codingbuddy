import * as os from 'os';

/**
 * Poll-based async wait utility for socket tests.
 * Replaces fragile setTimeout-based waits with predicate checking.
 * Use in tests: await waitFor(() => received.length > 0);
 */
export async function waitFor(
  predicate: () => boolean,
  timeoutMs = 2000,
  intervalMs = 10,
): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`waitFor timeout after ${timeoutMs}ms`);
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
}

/**
 * Generate a unique socket path for test isolation.
 * Prevents vitest parallel execution conflicts.
 */
let counter = 0;
export function uniqueSocketPath(prefix: string): string {
  const tmpDir = os.tmpdir();
  return `${tmpDir}/codingbuddy-${prefix}-${process.pid}-${Date.now()}-${++counter}.sock`;
}
