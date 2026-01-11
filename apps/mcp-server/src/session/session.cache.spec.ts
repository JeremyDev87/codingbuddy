/**
 * Session Cache Tests
 *
 * Tests for the SessionCache class including:
 * - Basic get/set operations
 * - TTL-based invalidation
 * - LRU eviction
 * - Active session tracking
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SessionCache } from './session.cache';
import type { SessionDocument } from './session.types';

describe('SessionCache', () => {
  let cache: SessionCache;

  const createMockSession = (id: string): SessionDocument => ({
    metadata: {
      id,
      title: `Test Session ${id}`,
      createdAt: '2026-01-11T00:00:00Z',
      updatedAt: '2026-01-11T00:00:00Z',
      status: 'active',
    },
    sections: [],
  });

  beforeEach(() => {
    cache = new SessionCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('get/set', () => {
    it('should return null for non-existent session', () => {
      expect(cache.get('non-existent')).toBeNull();
    });

    it('should return cached session', () => {
      const session = createMockSession('test-1');
      cache.set('test-1', session);
      expect(cache.get('test-1')).toEqual(session);
    });

    it('should return null for expired session', () => {
      const session = createMockSession('test-1');
      cache.set('test-1', session);

      // Advance time past TTL (30 seconds)
      vi.advanceTimersByTime(31_000);

      expect(cache.get('test-1')).toBeNull();
    });

    it('should clean up stale entry on get', () => {
      const session = createMockSession('test-1');
      cache.set('test-1', session);

      vi.advanceTimersByTime(31_000);

      // First get returns null and cleans up
      expect(cache.get('test-1')).toBeNull();
      // Stats should show empty cache
      expect(cache.getStats().size).toBe(0);
    });

    it('should refresh entry order on update', () => {
      cache.set('test-1', createMockSession('test-1'));
      cache.set('test-2', createMockSession('test-2'));
      cache.set('test-1', createMockSession('test-1-updated'));

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entries when max size reached', () => {
      // Fill cache to max size (100)
      for (let i = 0; i < 100; i++) {
        cache.set(`session-${i}`, createMockSession(`session-${i}`));
      }
      expect(cache.getStats().size).toBe(100);

      // Add one more - should evict oldest
      cache.set('session-100', createMockSession('session-100'));
      expect(cache.getStats().size).toBe(100);

      // Oldest should be evicted
      expect(cache.get('session-0')).toBeNull();
      // Newest should still be present
      expect(cache.get('session-100')).not.toBeNull();
    });

    it('should evict multiple entries if needed', () => {
      // Fill cache
      for (let i = 0; i < 100; i++) {
        cache.set(`session-${i}`, createMockSession(`session-${i}`));
      }

      // Add 5 more
      for (let i = 100; i < 105; i++) {
        cache.set(`session-${i}`, createMockSession(`session-${i}`));
      }

      expect(cache.getStats().size).toBe(100);
      // First 5 should be evicted
      for (let i = 0; i < 5; i++) {
        expect(cache.get(`session-${i}`)).toBeNull();
      }
      // session-5 and onwards should still exist
      expect(cache.get('session-5')).not.toBeNull();
    });
  });

  describe('invalidate', () => {
    it('should remove specific session from cache', () => {
      cache.set('test-1', createMockSession('test-1'));
      cache.set('test-2', createMockSession('test-2'));

      cache.invalidate('test-1');

      expect(cache.get('test-1')).toBeNull();
      expect(cache.get('test-2')).not.toBeNull();
    });

    it('should also invalidate active session if it matches', () => {
      cache.set('test-1', createMockSession('test-1'));
      cache.setActiveSessionId('test-1');

      expect(cache.getActiveSessionId()).toBe('test-1');

      cache.invalidate('test-1');

      expect(cache.getActiveSessionId()).toBeNull();
    });

    it('should not affect active session if it does not match', () => {
      cache.set('test-1', createMockSession('test-1'));
      cache.set('test-2', createMockSession('test-2'));
      cache.setActiveSessionId('test-2');

      cache.invalidate('test-1');

      expect(cache.getActiveSessionId()).toBe('test-2');
    });
  });

  describe('invalidateAll', () => {
    it('should clear all cached sessions', () => {
      cache.set('test-1', createMockSession('test-1'));
      cache.set('test-2', createMockSession('test-2'));
      cache.setActiveSessionId('test-1');

      cache.invalidateAll();

      expect(cache.get('test-1')).toBeNull();
      expect(cache.get('test-2')).toBeNull();
      expect(cache.getActiveSessionId()).toBeNull();
      expect(cache.getStats().size).toBe(0);
    });
  });

  describe('active session', () => {
    it('should return null when no active session set', () => {
      expect(cache.getActiveSessionId()).toBeNull();
    });

    it('should return active session ID', () => {
      cache.setActiveSessionId('test-1');
      expect(cache.getActiveSessionId()).toBe('test-1');
    });

    it('should return null for expired active session', () => {
      cache.setActiveSessionId('test-1');

      vi.advanceTimersByTime(31_000);

      expect(cache.getActiveSessionId()).toBeNull();
    });

    it('should clear stale active session on get', () => {
      cache.setActiveSessionId('test-1');

      vi.advanceTimersByTime(31_000);

      // First get returns null and clears
      expect(cache.getActiveSessionId()).toBeNull();
      // Second get should also be null (not throw)
      expect(cache.getActiveSessionId()).toBeNull();
    });
  });

  describe('invalidateActiveSession', () => {
    it('should clear only active session cache', () => {
      cache.set('test-1', createMockSession('test-1'));
      cache.setActiveSessionId('test-1');

      cache.invalidateActiveSession();

      expect(cache.getActiveSessionId()).toBeNull();
      // Session cache should still have the entry
      expect(cache.get('test-1')).not.toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return correct cache statistics', () => {
      expect(cache.getStats()).toEqual({
        size: 0,
        maxSize: 100,
        hasActiveSession: false,
      });

      cache.set('test-1', createMockSession('test-1'));
      cache.setActiveSessionId('test-1');

      expect(cache.getStats()).toEqual({
        size: 1,
        maxSize: 100,
        hasActiveSession: true,
      });
    });
  });
});
