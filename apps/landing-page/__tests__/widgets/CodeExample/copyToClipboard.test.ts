import { describe, it, expect, vi, beforeEach } from 'vitest';
import { copyToClipboard } from '@/widgets/CodeExample/lib/copyToClipboard';

describe('copyToClipboard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should copy text using clipboard API and return true', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    const result = await copyToClipboard('hello');
    expect(writeText).toHaveBeenCalledWith('hello');
    expect(result).toBe(true);
  });

  it('should return false when clipboard API fails', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('fail'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    const result = await copyToClipboard('hello');
    expect(result).toBe(false);
  });

  it('should return false when clipboard API is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const result = await copyToClipboard('hello');
    expect(result).toBe(false);
  });
});
