import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SseAuthGuard } from './sse-auth.guard';

/**
 * Helper to create a mock ExecutionContext with the given Authorization header.
 */
const createMockContext = (authHeader?: string): ExecutionContext => {
  const request = {
    headers: authHeader !== undefined ? { authorization: authHeader } : {},
  };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
};

describe('SseAuthGuard', () => {
  let guard: SseAuthGuard;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    guard = new SseAuthGuard();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('when MCP_SSE_TOKEN is not set', () => {
    it('should allow request without any header', () => {
      delete process.env.MCP_SSE_TOKEN;
      const context = createMockContext();

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow request even with a random header', () => {
      delete process.env.MCP_SSE_TOKEN;
      const context = createMockContext('Bearer some-token');

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow request when MCP_SSE_TOKEN is empty string', () => {
      process.env.MCP_SSE_TOKEN = '';
      const context = createMockContext();

      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('when MCP_SSE_TOKEN is set', () => {
    beforeEach(() => {
      process.env.MCP_SSE_TOKEN = 'my-secret-token';
    });

    it('should allow request with correct Bearer token', () => {
      const context = createMockContext('Bearer my-secret-token');

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw UnauthorizedException when no Authorization header', () => {
      const context = createMockContext();

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token is wrong', () => {
      const context = createMockContext('Bearer wrong-token');

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when scheme is not Bearer', () => {
      const context = createMockContext('Basic my-secret-token');

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when header is malformed', () => {
      const context = createMockContext('my-secret-token');

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for Bearer with empty token', () => {
      const context = createMockContext('Bearer ');

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });
});
