import { describe, it, expect } from 'vitest';
import { resolveClientType, CLIENT_TYPE_MATCHERS } from './client-type';

describe('resolveClientType', () => {
  it('should return "cursor" for Cursor client', () => {
    expect(resolveClientType('Cursor')).toBe('cursor');
  });

  it('should return "cursor" for case-insensitive cursor name', () => {
    expect(resolveClientType('cursor-editor')).toBe('cursor');
  });

  it('should return "claude-code" for Claude Code client', () => {
    expect(resolveClientType('Claude Code')).toBe('claude-code');
  });

  it('should return "claude-code" for claude-code variant', () => {
    expect(resolveClientType('claude-code')).toBe('claude-code');
  });

  it('should return "unknown" for undefined', () => {
    expect(resolveClientType(undefined)).toBe('unknown');
  });

  it('should return "unknown" for empty string', () => {
    expect(resolveClientType('')).toBe('unknown');
  });

  it('should return "unknown" for unrecognized client', () => {
    expect(resolveClientType('some-other-client')).toBe('unknown');
  });

  it('should match first matching entry when multiple could match', () => {
    // Ensures deterministic ordering from the matchers array
    const result = resolveClientType('cursor');
    expect(result).toBe('cursor');
  });
});

describe('CLIENT_TYPE_MATCHERS', () => {
  it('should be an array of keyword-to-type mappings', () => {
    expect(Array.isArray(CLIENT_TYPE_MATCHERS)).toBe(true);
    expect(CLIENT_TYPE_MATCHERS.length).toBeGreaterThanOrEqual(2);
  });

  it('each entry should have keyword and clientType', () => {
    for (const matcher of CLIENT_TYPE_MATCHERS) {
      expect(matcher).toHaveProperty('keyword');
      expect(matcher).toHaveProperty('clientType');
      expect(typeof matcher.keyword).toBe('string');
      expect(typeof matcher.clientType).toBe('string');
    }
  });
});
