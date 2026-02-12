import React, { act } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import { Text } from 'ink';

import { useClock } from './use-clock';

function TestComponent() {
  const time = useClock();
  return <Text>{time}</Text>;
}

describe('tui/hooks/useClock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial formatted time', () => {
    vi.setSystemTime(new Date(2026, 0, 1, 14, 30, 0));
    const { lastFrame } = render(<TestComponent />);
    expect(lastFrame()).toBe('14:30');
  });

  it('should update time every second', () => {
    vi.setSystemTime(new Date(2026, 0, 1, 14, 30, 0));
    const { lastFrame } = render(<TestComponent />);
    expect(lastFrame()).toBe('14:30');

    vi.setSystemTime(new Date(2026, 0, 1, 14, 31, 0));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(lastFrame()).toBe('14:31');
  });

  it('should cleanup interval on unmount', () => {
    vi.setSystemTime(new Date(2026, 0, 1, 14, 30, 0));
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    const { unmount } = render(<TestComponent />);

    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});
