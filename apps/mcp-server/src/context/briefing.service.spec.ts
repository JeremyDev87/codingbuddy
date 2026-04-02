import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BriefingService } from './briefing.service';
import type { ConfigService } from '../config/config.service';
import * as fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { BRIEFING_DIR } from './briefing.types';

// Mock fs/promises
vi.mock('fs/promises');

// Mock fs sync functions
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
  };
});

// Mock child_process
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

import { execSync } from 'child_process';

// Sample context document for testing
const SAMPLE_CONTEXT = `# Context: Implement auth feature

**Created**: 2026-03-28T10:00:00.000Z
**Updated**: 2026-03-28T10:30:00.000Z
**Current Mode**: ACT
**Status**: active

---

## PLAN (10:00)

### Task
Implement JWT authentication

### Decisions
- Use JWT tokens for session management
- Store refresh tokens in HTTP-only cookies

### Notes
- Consider database migration for user table changes

---

## ACT (10:30)

### Task
Implementing JWT auth module

### Progress
- Created auth service
- Added login endpoint

**Status**: in_progress
`;

const _EMPTY_CONTEXT = '';

const MINIMAL_CONTEXT = `# Context: Quick fix

**Created**: 2026-04-01T08:00:00.000Z
**Updated**: 2026-04-01T08:00:00.000Z
**Current Mode**: PLAN
**Status**: active

---

## PLAN (08:00)

### Task
Fix a typo in README
`;

const SAMPLE_GIT_DIFF = ` src/auth/auth.service.ts  | 42 ++++++++++++
 src/auth/auth.module.ts   | 15 +++++
 src/auth/auth.guard.ts    | 28 ++++++++
 3 files changed, 85 insertions(+)
`;

describe('BriefingService', () => {
  let service: BriefingService;
  const mockProjectRoot = '/test/project';

  const mockConfigService = {
    getProjectRoot: () => mockProjectRoot,
  } as unknown as ConfigService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(existsSync).mockReturnValue(false);
    service = new BriefingService(mockConfigService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createBriefing', () => {
    it('should generate a briefing from context with decisions and pending tasks', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(SAMPLE_CONTEXT);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(execSync).mockReturnValue(Buffer.from(SAMPLE_GIT_DIFF));

      const result = await service.createBriefing();

      expect(result.decisions).toContain('Use JWT tokens for session management');
      expect(result.decisions).toContain('Store refresh tokens in HTTP-only cookies');
      expect(result.pendingTasks).toHaveLength(2);
      expect(result.pendingTasks).toContain('Created auth service');
      expect(result.pendingTasks).toContain('Added login endpoint');
      expect(result.changedFiles).toContain('src/auth/auth.service.ts');
      expect(result.changedFiles).toContain('src/auth/auth.module.ts');
      expect(result.changedFiles).toContain('src/auth/auth.guard.ts');
      expect(result.filePath).toContain(BRIEFING_DIR);
      expect(result.resumeCommand).toBeTruthy();
    });

    it('should parse git diff --stat output correctly', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(SAMPLE_CONTEXT);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(execSync).mockReturnValue(Buffer.from(SAMPLE_GIT_DIFF));

      const result = await service.createBriefing();

      expect(result.changedFiles).toEqual([
        'src/auth/auth.service.ts',
        'src/auth/auth.module.ts',
        'src/auth/auth.guard.ts',
      ]);
    });

    it('should handle empty context gracefully', async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(execSync).mockReturnValue(Buffer.from(''));
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await service.createBriefing();

      expect(result.decisions).toEqual([]);
      expect(result.pendingTasks).toEqual([]);
      expect(result.changedFiles).toEqual([]);
      expect(result.filePath).toContain(BRIEFING_DIR);
      expect(result.resumeCommand).toBeTruthy();
    });

    it('should handle no git changes gracefully', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(SAMPLE_CONTEXT);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(execSync).mockReturnValue(Buffer.from(''));

      const result = await service.createBriefing();

      expect(result.changedFiles).toEqual([]);
    });

    it('should handle git diff command failure gracefully', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(SAMPLE_CONTEXT);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('not a git repository');
      });

      const result = await service.createBriefing();

      expect(result.changedFiles).toEqual([]);
    });

    it('should create briefing directory if it does not exist', async () => {
      vi.mocked(existsSync).mockImplementation((p: Parameters<typeof existsSync>[0]) => {
        const pathStr = String(p);
        if (pathStr.includes('briefings')) return false;
        if (pathStr.includes('context.md')) return true;
        return false;
      });
      vi.mocked(fs.readFile).mockResolvedValue(MINIMAL_CONTEXT);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(execSync).mockReturnValue(Buffer.from(''));

      await service.createBriefing();

      expect(mkdirSync).toHaveBeenCalledWith(expect.stringContaining('briefings'), {
        recursive: true,
      });
    });

    it('should write briefing markdown to file', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(SAMPLE_CONTEXT);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(execSync).mockReturnValue(Buffer.from(SAMPLE_GIT_DIFF));

      await service.createBriefing();

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.md'),
        expect.stringContaining('# Session Briefing'),
        'utf-8',
      );
    });

    it('should use custom context path when provided', async () => {
      const customPath = 'custom/context.md';
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(MINIMAL_CONTEXT);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(execSync).mockReturnValue(Buffer.from(''));

      await service.createBriefing({ contextPath: customPath });

      expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining(customPath), 'utf-8');
    });

    it('should generate resume command based on pending work', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(SAMPLE_CONTEXT);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(execSync).mockReturnValue(Buffer.from(SAMPLE_GIT_DIFF));

      const result = await service.createBriefing();

      // ACT mode with in_progress status should suggest continuing ACT
      expect(result.resumeCommand).toContain('ACT');
    });

    it('should generate PLAN resume command when no pending progress', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(MINIMAL_CONTEXT);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(execSync).mockReturnValue(Buffer.from(''));

      const result = await service.createBriefing();

      expect(result.resumeCommand).toContain('PLAN');
    });
  });

  describe('generateBriefingMarkdown', () => {
    it('should include all sections in markdown output', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(SAMPLE_CONTEXT);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(execSync).mockReturnValue(Buffer.from(SAMPLE_GIT_DIFF));

      await service.createBriefing();

      const writtenContent = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
      expect(writtenContent).toContain('# Session Briefing');
      expect(writtenContent).toContain('## Decisions');
      expect(writtenContent).toContain('## Changed Files');
      expect(writtenContent).toContain('## Pending Tasks');
      expect(writtenContent).toContain('## Resume Command');
    });

    it('should produce valid markdown for empty state', async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(execSync).mockReturnValue(Buffer.from(''));

      await service.createBriefing();

      const writtenContent = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
      expect(writtenContent).toContain('# Session Briefing');
      expect(writtenContent).toContain('No decisions recorded');
      expect(writtenContent).toContain('No pending tasks');
      expect(writtenContent).toContain('No changed files');
    });
  });

  describe('parseGitDiffStat', () => {
    it('should extract file paths from git diff --stat output', () => {
      const files = service.parseGitDiffStat(SAMPLE_GIT_DIFF);

      expect(files).toEqual([
        'src/auth/auth.service.ts',
        'src/auth/auth.module.ts',
        'src/auth/auth.guard.ts',
      ]);
    });

    it('should handle empty diff output', () => {
      expect(service.parseGitDiffStat('')).toEqual([]);
    });

    it('should handle diff with summary line only', () => {
      const summaryOnly = ' 3 files changed, 85 insertions(+)\n';
      expect(service.parseGitDiffStat(summaryOnly)).toEqual([]);
    });

    it('should handle file paths with spaces', () => {
      const diffWithSpaces = ' src/my file.ts | 10 +++\n 1 file changed\n';
      const files = service.parseGitDiffStat(diffWithSpaces);
      expect(files).toEqual(['src/my file.ts']);
    });
  });
});
