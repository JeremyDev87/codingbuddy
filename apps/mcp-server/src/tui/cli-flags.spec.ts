import { describe, it, expect } from 'vitest';
import { hasTuiFlag } from './cli-flags';

describe('hasTuiFlag', () => {
  it('should return true when --tui is present', () => {
    expect(hasTuiFlag(['node', 'main.ts', '--tui'])).toBe(true);
  });

  it('should return false when --tui is absent', () => {
    expect(hasTuiFlag(['node', 'main.ts'])).toBe(false);
  });

  it('should return false for empty argv', () => {
    expect(hasTuiFlag([])).toBe(false);
  });

  it('should not match partial flags like --tui-debug', () => {
    expect(hasTuiFlag(['node', 'main.ts', '--tui-debug'])).toBe(false);
  });
});
