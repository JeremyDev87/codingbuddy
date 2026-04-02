import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RegistryClient } from './registry-client';

describe('RegistryClient', () => {
  let client: RegistryClient;
  const mockIndex = {
    plugins: [
      {
        name: 'nextjs-app-router',
        version: '1.0.0',
        description: 'Next.js App Router best practices',
        tags: ['nextjs', 'react', 'frontend'],
        provides: {
          agents: ['nextjs-agent'],
          rules: ['routing', 'caching'],
          skills: ['app-router'],
        },
      },
      {
        name: 'nextjs-i18n',
        version: '0.2.0',
        description: 'Internationalization for Next.js',
        tags: ['nextjs', 'i18n'],
        provides: { agents: [], rules: ['i18n-rule'], skills: ['i18n-skill'] },
      },
      {
        name: 'python-fastapi',
        version: '1.2.0',
        description: 'FastAPI best practices',
        tags: ['python', 'fastapi', 'backend'],
        provides: { agents: ['fastapi-agent'], rules: [], skills: [] },
      },
    ],
  };

  beforeEach(() => {
    client = new RegistryClient();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('fetchIndex', () => {
    it('should fetch and return the registry index', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockIndex),
      } as Response);

      const result = await client.fetchIndex();

      expect(result).toEqual(mockIndex);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/JeremyDev87/codingbuddy-registry/main/index.json',
      );
    });

    it('should cache the result for 5 minutes', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockIndex),
      } as Response);

      await client.fetchIndex();
      await client.fetchIndex();

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('should refetch after cache expires (5 minutes)', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockIndex),
      } as Response);

      await client.fetchIndex();
      vi.advanceTimersByTime(5 * 60 * 1000 + 1);
      await client.fetchIndex();

      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it('should return empty index on network error', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

      const result = await client.fetchIndex();

      expect(result).toEqual({ plugins: [] });
    });

    it('should return empty index on non-ok response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      const result = await client.fetchIndex();

      expect(result).toEqual({ plugins: [] });
    });
  });

  describe('search', () => {
    beforeEach(() => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockIndex),
      } as Response);
    });

    it('should match plugins by name', async () => {
      const results = await client.search('nextjs-app-router');

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('nextjs-app-router');
    });

    it('should match plugins by description', async () => {
      const results = await client.search('FastAPI');

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('python-fastapi');
    });

    it('should match plugins by tags', async () => {
      const results = await client.search('nextjs');

      expect(results).toHaveLength(2);
      expect(results.map(r => r.name)).toEqual(['nextjs-app-router', 'nextjs-i18n']);
    });

    it('should be case-insensitive', async () => {
      const results = await client.search('NEXTJS');

      expect(results).toHaveLength(2);
    });

    it('should return empty array for no matches', async () => {
      const results = await client.search('nonexistent');

      expect(results).toEqual([]);
    });

    it('should return empty array on network error', async () => {
      vi.mocked(globalThis.fetch).mockRejectedValue(new Error('Network error'));

      const results = await client.search('nextjs');

      expect(results).toEqual([]);
    });
  });
});
