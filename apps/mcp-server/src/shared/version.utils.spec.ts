import { describe, it, expect } from 'vitest';
import { getPackageVersion, FALLBACK_VERSION } from './version.utils';
import { VERSION } from './version';

describe('getPackageVersion', () => {
  it('should return a valid semver string', () => {
    expect(getPackageVersion()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('should not return the fallback version', () => {
    expect(getPackageVersion()).not.toBe(FALLBACK_VERSION);
  });

  it('should return the value from version.ts', () => {
    expect(getPackageVersion()).toBe(VERSION);
  });
});

describe('FALLBACK_VERSION constant', () => {
  it('should export FALLBACK_VERSION as 0.0.0', () => {
    expect(FALLBACK_VERSION).toBe('0.0.0');
  });
});
