import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BriefingLoaderService } from './briefing-loader.service';
import type { ConfigService } from '../config/config.service';
import type { ContextDocumentService } from './context-document.service';
import * as fs from 'fs/promises';
import { existsSync, readdirSync } from 'fs';

vi.mock('fs/promises');
vi.mock('fs', async importOriginal => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: vi.fn(),
    readdirSync: vi.fn(),
  };
});

function createMockConfigService(projectRoot = '/tmp/test-project'): ConfigService {
  return {
    getProjectRoot: vi.fn().mockReturnValue(projectRoot),
  } as unknown as ConfigService;
}

function createMockContextDocService(): ContextDocumentService {
  return {
    resetContext: vi.fn().mockResolvedValue({ success: true }),
  } as unknown as ContextDocumentService;
}

const SAMPLE_BRIEFING = `# Briefing: Auth Feature

**Mode**: ACT
**Created**: 2026-04-01T10:00:00.000Z

## Decisions
- Use JWT for authentication
- Store tokens in httpOnly cookies

## Changed Files
- src/auth/auth.service.ts
- src/auth/auth.controller.ts

## Pending Tasks
- Add refresh token logic
- Write integration tests

## Resume Command
\`\`\`
ACT continue implementation of "Auth Feature"
\`\`\`
`;

describe('BriefingLoaderService', () => {
  let service: BriefingLoaderService;
  let mockConfigService: ConfigService;
  let mockContextDocService: ContextDocumentService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfigService = createMockConfigService();
    mockContextDocService = createMockContextDocService();
    service = new BriefingLoaderService(mockConfigService, mockContextDocService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findMostRecentBriefing', () => {
    it('should return the most recent briefing file', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdirSync).mockReturnValue([
        '2026-03-31T09-00-00-000Z.md',
        '2026-04-01T10-00-00-000Z.md',
        '2026-03-30T08-00-00-000Z.md',
      ] as unknown as ReturnType<typeof readdirSync>);

      const result = service.findMostRecentBriefing();
      expect(result).toContain('2026-04-01T10-00-00-000Z.md');
    });

    it('should return null when briefings directory does not exist', () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = service.findMostRecentBriefing();
      expect(result).toBeNull();
    });

    it('should return null when directory is empty', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdirSync).mockReturnValue([]);

      const result = service.findMostRecentBriefing();
      expect(result).toBeNull();
    });

    it('should filter out non-markdown files', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdirSync).mockReturnValue([
        '.gitkeep',
        '2026-04-01T10-00-00-000Z.md',
        'README.txt',
      ] as unknown as ReturnType<typeof readdirSync>);

      const result = service.findMostRecentBriefing();
      expect(result).toContain('2026-04-01T10-00-00-000Z.md');
    });
  });

  describe('parseBriefingMarkdown', () => {
    it('should extract title from briefing', () => {
      const result = service.parseBriefingMarkdown(SAMPLE_BRIEFING);
      expect(result.title).toBe('Auth Feature');
    });

    it('should extract mode from briefing', () => {
      const result = service.parseBriefingMarkdown(SAMPLE_BRIEFING);
      expect(result.mode).toBe('ACT');
    });

    it('should extract decisions from briefing', () => {
      const result = service.parseBriefingMarkdown(SAMPLE_BRIEFING);
      expect(result.decisions).toEqual([
        'Use JWT for authentication',
        'Store tokens in httpOnly cookies',
      ]);
    });

    it('should extract pending tasks from briefing', () => {
      const result = service.parseBriefingMarkdown(SAMPLE_BRIEFING);
      expect(result.pendingTasks).toEqual(['Add refresh token logic', 'Write integration tests']);
    });

    it('should extract changed files from briefing', () => {
      const result = service.parseBriefingMarkdown(SAMPLE_BRIEFING);
      expect(result.changedFiles).toEqual([
        'src/auth/auth.service.ts',
        'src/auth/auth.controller.ts',
      ]);
    });

    it('should extract resume command from briefing', () => {
      const result = service.parseBriefingMarkdown(SAMPLE_BRIEFING);
      expect(result.resumeCommand).toBe('ACT continue implementation of "Auth Feature"');
    });

    it('should handle briefing with no decisions', () => {
      const md = `# Briefing: Test

**Mode**: PLAN
**Created**: 2026-04-01T00:00:00.000Z

## Decisions
_No decisions recorded._

## Changed Files
_No files changed._

## Pending Tasks
_No pending tasks._

## Resume Command
\`\`\`
PLAN continue "Test"
\`\`\`
`;
      const result = service.parseBriefingMarkdown(md);
      expect(result.decisions).toEqual([]);
      expect(result.changedFiles).toEqual([]);
      expect(result.pendingTasks).toEqual([]);
    });

    it('should handle empty content gracefully', () => {
      const result = service.parseBriefingMarkdown('');
      expect(result.title).toBe('Untitled');
      expect(result.decisions).toEqual([]);
      expect(result.pendingTasks).toEqual([]);
      expect(result.changedFiles).toEqual([]);
      expect(result.resumeCommand).toBe('');
    });
  });

  describe('loadBriefing', () => {
    it('should load briefing from explicit path', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(SAMPLE_BRIEFING);

      const result = await service.loadBriefing(
        '/tmp/test-project/docs/codingbuddy/briefings/test.md',
      );

      expect(result.title).toBe('Auth Feature');
      expect(result.decisions).toHaveLength(2);
      expect(fs.readFile).toHaveBeenCalledWith(
        '/tmp/test-project/docs/codingbuddy/briefings/test.md',
        'utf-8',
      );
    });

    it('should load most recent briefing when no path specified', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdirSync).mockReturnValue([
        '2026-04-01T10-00-00-000Z.md',
      ] as unknown as ReturnType<typeof readdirSync>);
      vi.mocked(fs.readFile).mockResolvedValue(SAMPLE_BRIEFING);

      const result = await service.loadBriefing();

      expect(result.title).toBe('Auth Feature');
    });

    it('should throw when no briefings exist and no path given', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      await expect(service.loadBriefing()).rejects.toThrow('No briefing files found');
    });

    it('should throw when specified file does not exist', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      await expect(service.loadBriefing('/nonexistent/path.md')).rejects.toThrow(
        'Briefing file not found',
      );
    });
  });

  describe('restoreContext', () => {
    it('should call resetContext with parsed briefing data', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdirSync).mockReturnValue([
        '2026-04-01T10-00-00-000Z.md',
      ] as unknown as ReturnType<typeof readdirSync>);
      vi.mocked(fs.readFile).mockResolvedValue(SAMPLE_BRIEFING);

      await service.restoreContext();

      expect(mockContextDocService.resetContext).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Auth Feature',
          decisions: ['Use JWT for authentication', 'Store tokens in httpOnly cookies'],
          notes: ['Add refresh token logic', 'Write integration tests'],
        }),
      );
    });

    it('should return briefing summary after restore', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdirSync).mockReturnValue([
        '2026-04-01T10-00-00-000Z.md',
      ] as unknown as ReturnType<typeof readdirSync>);
      vi.mocked(fs.readFile).mockResolvedValue(SAMPLE_BRIEFING);

      const result = await service.restoreContext();

      expect(result.title).toBe('Auth Feature');
      expect(result.resumeCommand).toBe('ACT continue implementation of "Auth Feature"');
      expect(result.contextRestored).toBe(true);
    });

    it('should accept explicit briefing path', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(SAMPLE_BRIEFING);

      const result = await service.restoreContext('/tmp/briefing.md');

      expect(result.contextRestored).toBe(true);
    });
  });
});
