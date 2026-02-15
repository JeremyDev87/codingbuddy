import { describe, it, expect } from 'vitest';
import { waitFor, uniqueSocketPath } from './test-utils';

describe('waitFor', () => {
  it('should resolve when predicate becomes true', async () => {
    let flag = false;
    setTimeout(() => {
      flag = true;
    }, 50);

    await waitFor(() => flag, 2000);
    expect(flag).toBe(true);
  });

  it('should throw on timeout', async () => {
    await expect(waitFor(() => false, 100)).rejects.toThrow('waitFor timeout');
  });
});

describe('uniqueSocketPath', () => {
  it('should generate unique paths', () => {
    const p1 = uniqueSocketPath('test');
    const p2 = uniqueSocketPath('test');
    expect(p1).not.toBe(p2);
    expect(p1).toContain('codingbuddy-test-');
    expect(p1).toContain('.sock');
  });
});
