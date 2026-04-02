/**
 * Flush multiple macrotask cycles so Ink completes its render pipeline.
 * Replaces the fragile single-setTimeout tick() used across TUI tests.
 */
export async function flushInk(cycles = 3): Promise<void> {
  for (let i = 0; i < cycles; i++) {
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}

/**
 * Retry an assertion until it passes or times out.
 * Use for frame content assertions that depend on Ink render timing.
 */
export async function waitForFrame(
  getFrame: () => string | undefined,
  assertion: (frame: string) => void,
  timeoutMs = 500,
): Promise<void> {
  const start = Date.now();
  let lastError: Error | undefined;
  while (Date.now() - start < timeoutMs) {
    try {
      assertion(getFrame() ?? '');
      return;
    } catch (err) {
      lastError = err as Error;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
  throw lastError ?? new Error('waitForFrame timeout');
}
