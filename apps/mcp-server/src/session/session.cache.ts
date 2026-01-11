/**
 * Session Cache
 *
 * In-memory LRU cache for session documents.
 * Provides efficient caching with TTL and size limits.
 */

import type { SessionDocument } from './session.types';

/**
 * Cache TTL in milliseconds (30 seconds).
 * Short TTL balances performance with freshness.
 */
const CACHE_TTL_MS = 30_000;

/**
 * Maximum number of sessions to cache.
 * Prevents unbounded memory growth in long-running servers.
 */
const MAX_CACHE_SIZE = 100;

/**
 * Cache entry for session documents.
 */
interface SessionCacheEntry {
  session: SessionDocument;
  timestamp: number;
}

/**
 * Session cache with LRU eviction and TTL-based invalidation.
 */
export class SessionCache {
  private readonly cache = new Map<string, SessionCacheEntry>();
  private activeSessionId: string | null = null;
  private activeSessionTimestamp = 0;

  /**
   * Check if a cache entry is still valid (within TTL).
   */
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < CACHE_TTL_MS;
  }

  /**
   * Get session from cache if valid.
   *
   * @param sessionId - The session ID to retrieve
   * @returns Session document if cached and valid, null otherwise
   */
  get(sessionId: string): SessionDocument | null {
    const entry = this.cache.get(sessionId);
    if (entry && this.isCacheValid(entry.timestamp)) {
      return entry.session;
    }
    // Clean up stale entry
    if (entry) {
      this.cache.delete(sessionId);
    }
    return null;
  }

  /**
   * Add session to cache with LRU eviction when size limit reached.
   *
   * @param sessionId - The session ID to cache
   * @param session - The session document to cache
   */
  set(sessionId: string, session: SessionDocument): void {
    // If updating existing entry, delete first to refresh order (Map maintains insertion order)
    if (this.cache.has(sessionId)) {
      this.cache.delete(sessionId);
    }

    // Evict oldest entries if cache is at max size
    while (this.cache.size >= MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      } else {
        break;
      }
    }

    this.cache.set(sessionId, {
      session,
      timestamp: Date.now(),
    });
  }

  /**
   * Invalidate all caches.
   * Called on write operations that affect multiple sessions.
   */
  invalidateAll(): void {
    this.cache.clear();
    this.activeSessionId = null;
    this.activeSessionTimestamp = 0;
  }

  /**
   * Invalidate a specific session from cache.
   * More efficient than full cache invalidation for single-session updates.
   *
   * @param sessionId - The session ID to invalidate
   */
  invalidate(sessionId: string): void {
    this.cache.delete(sessionId);
    // Also invalidate active session cache if it matches
    if (this.activeSessionId === sessionId) {
      this.activeSessionId = null;
      this.activeSessionTimestamp = 0;
    }
  }

  /**
   * Get cached active session ID if still valid.
   *
   * @returns Active session ID if cached and valid, null otherwise
   */
  getActiveSessionId(): string | null {
    if (
      this.activeSessionId &&
      this.isCacheValid(this.activeSessionTimestamp)
    ) {
      return this.activeSessionId;
    }
    // Clear stale active session cache
    if (this.activeSessionId) {
      this.activeSessionId = null;
      this.activeSessionTimestamp = 0;
    }
    return null;
  }

  /**
   * Set cached active session ID.
   *
   * @param sessionId - The active session ID to cache
   */
  setActiveSessionId(sessionId: string): void {
    this.activeSessionId = sessionId;
    this.activeSessionTimestamp = Date.now();
  }

  /**
   * Invalidate active session cache only.
   * Used when creating a new session that may become active.
   */
  invalidateActiveSession(): void {
    this.activeSessionId = null;
    this.activeSessionTimestamp = 0;
  }

  /**
   * Get cache statistics for monitoring.
   */
  getStats(): { size: number; maxSize: number; hasActiveSession: boolean } {
    return {
      size: this.cache.size,
      maxSize: MAX_CACHE_SIZE,
      hasActiveSession: this.activeSessionId !== null,
    };
  }
}
