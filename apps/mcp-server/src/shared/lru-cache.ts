/**
 * Simple LRU Cache with TTL support
 * PERF-003: Cache config parsing results to avoid redundant file I/O
 */

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  mtimes?: Map<string, number>; // File modification times for cache invalidation
}

interface LRUCacheOptions {
  maxSize?: number; // Maximum number of entries (default: 10)
  ttl?: number; // Time to live in milliseconds (default: 5 minutes)
}

export class LRUCache<K, V> {
  private cache = new Map<K, CacheEntry<V>>();
  private readonly maxSize: number;
  private readonly ttl: number;

  constructor(options: LRUCacheOptions = {}) {
    this.maxSize = options.maxSize ?? 10;
    this.ttl = options.ttl ?? 5 * 60 * 1000; // 5 minutes default
  }

  /**
   * Get value from cache
   * Returns undefined if key not found, expired, or file mtimes changed
   */
  get(key: K, currentMtimes?: Map<string, number>): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    // Check TTL
    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    // Check file mtimes if provided
    if (currentMtimes && entry.mtimes) {
      const mtimesChanged = this.haveMtimesChanged(entry.mtimes, currentMtimes);
      if (mtimesChanged) {
        this.cache.delete(key);
        return undefined;
      }
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * Set value in cache
   * Evicts least recently used entry if cache is full
   */
  set(key: K, value: V, mtimes?: Map<string, number>): void {
    // Remove if already exists (will be re-added at end)
    this.cache.delete(key);

    // Evict LRU entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    // Add new entry at end (most recently used)
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      mtimes,
    });
  }

  /**
   * Check if cache has valid entry
   */
  has(key: K, currentMtimes?: Map<string, number>): boolean {
    return this.get(key, currentMtimes) !== undefined;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get current cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Check if file mtimes have changed
   */
  private haveMtimesChanged(
    oldMtimes: Map<string, number>,
    newMtimes: Map<string, number>,
  ): boolean {
    // Check if any file was modified
    for (const [filePath, newMtime] of newMtimes) {
      const oldMtime = oldMtimes.get(filePath);
      if (oldMtime !== newMtime) {
        return true;
      }
    }

    // Check if any file was deleted
    for (const filePath of oldMtimes.keys()) {
      if (!newMtimes.has(filePath)) {
        return true;
      }
    }

    return false;
  }
}
