import React, { act } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import { Text } from 'ink';

import { useTick } from './use-tick';

function TestComponent({ intervalMs }: { intervalMs?: number }) {
  const tick = useTick(intervalMs);
  return <Text>{String(tick)}</Text>;
}

describe('tui/hooks/useTick', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start at 0', () => {
    const { lastFrame } = render(<TestComponent />);
    expect(lastFrame()).toBe('0');
  });

  it('should increment after default interval (1000ms)', () => {
    const { lastFrame } = render(<TestComponent />);
    expect(lastFrame()).toBe('0');

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(lastFrame()).toBe('1');

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(lastFrame()).toBe('2');
  });

  it('should support custom interval', () => {
    const { lastFrame } = render(<TestComponent intervalMs={500} />);
    expect(lastFrame()).toBe('0');

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(lastFrame()).toBe('1');

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(lastFrame()).toBe('2');
  });

  it('should cleanup interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    const { unmount } = render(<TestComponent />);

    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});
