import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BriefingService } from './briefing.service';
import type { ConfigService } from '../config/config.service';
import type { ContextDocumentService } from './context-document.service';
import type { ContextDocument } from './context-document.types';

function createMockConfigService(projectRoot = '/tmp/test-project'): ConfigService {
  return {
    getProjectRoot: vi.fn().mockReturnValue(projectRoot),
  } as unknown as ConfigService;
}

function createMockContextDocumentService(document?: ContextDocument): ContextDocumentService {
  return {
    readContext: vi
      .fn()
      .mockResolvedValue(document ? { exists: true, document } : { exists: false }),
  } as unknown as ContextDocumentService;
}

function createTestDocument(overrides?: Partial<ContextDocument>): ContextDocument {
  return {
    metadata: {
      title: 'Test Task',
      createdAt: '2026-04-01T00:00:00.000Z',
      lastUpdatedAt: '2026-04-01T01:00:00.000Z',
      currentMode: 'ACT',
      status: 'active',
    },
    sections: [
      {
        mode: 'PLAN',
        timestamp: '2026-04-01 00:00',
        decisions: ['Use TypeScript strict mode', 'Follow TDD approach'],
        notes: ['Check existing patterns first'],
      },
      {
        mode: 'ACT',
        timestamp: '2026-04-01 01:00',
        progress: ['Implemented service layer', 'Tests passing'],
        notes: ['Need to add handler registration'],
      },
    ],
    ...overrides,
  };
}

describe('BriefingService', () => {
  let service: BriefingService;
  let mockConfigService: ConfigService;
  let mockContextDocService: ContextDocumentService;

  beforeEach(() => {
    mockConfigService = createMockConfigService();
    mockContextDocService = createMockContextDocumentService(createTestDocument());
    service = new BriefingService(mockConfigService, mockContextDocService);
  });

  describe('parseContext', () => {
    it('should extract decisions from all sections', async () => {
      const result = await service.parseContext();
      expect(result.decisions).toEqual(['Use TypeScript strict mode', 'Follow TDD approach']);
    });

    it('should extract pending tasks from notes and progress', async () => {
      const result = await service.parseContext();
      expect(result.pendingTasks).toContain('Check existing patterns first');
      expect(result.pendingTasks).toContain('Need to add handler registration');
    });

    it('should exclude completed progress items', async () => {
      const doc = createTestDocument({
        sections: [
          {
            mode: 'ACT',
            timestamp: '2026-04-01 01:00',
            progress: ['Step 1 completed', 'Step 2 in progress'],
          },
        ],
      });
      mockContextDocService = createMockContextDocumentService(doc);
      service = new BriefingService(mockConfigService, mockContextDocService);

      const result = await service.parseContext();
      expect(result.pendingTasks).toContain('Step 2 in progress');
      expect(result.pendingTasks).not.toContain('Step 1 completed');
    });

    it('should return current mode from metadata', async () => {
      const result = await service.parseContext();
      expect(result.currentMode).toBe('ACT');
    });

    it('should return title from metadata', async () => {
      const result = await service.parseContext();
      expect(result.title).toBe('Test Task');
    });

    it('should handle empty context gracefully', async () => {
      mockContextDocService = createMockContextDocumentService();
      service = new BriefingService(mockConfigService, mockContextDocService);

      const result = await service.parseContext();
      expect(result.decisions).toEqual([]);
      expect(result.pendingTasks).toEqual([]);
      expect(result.currentMode).toBe('PLAN');
      expect(result.title).toBe('Untitled');
    });
  });

  describe('getChangedFiles', () => {
    it('should return empty array when git fails', () => {
      // Non-existent directory will cause git to fail
      const result = service.getChangedFiles('/nonexistent/path');
      expect(result).toEqual([]);
    });
  });

  describe('generateResumeCommand', () => {
    it('should suggest ACT for PLAN mode with pending tasks', () => {
      const result = service.generateResumeCommand('PLAN', ['task1'], 'My Feature');
      expect(result).toContain('ACT');
      expect(result).toContain('My Feature');
    });

    it('should suggest continue ACT for ACT mode', () => {
      const result = service.generateResumeCommand('ACT', ['task1'], 'My Feature');
      expect(result).toContain('ACT continue');
      expect(result).toContain('My Feature');
    });

    it('should suggest ACT apply fixes for EVAL mode', () => {
      const result = service.generateResumeCommand('EVAL', ['fix1'], 'My Feature');
      expect(result).toContain('ACT apply fixes');
      expect(result).toContain('My Feature');
    });

    it('should suggest AUTO for unknown mode', () => {
      const result = service.generateResumeCommand('OTHER', ['task1'], 'My Feature');
      expect(result).toContain('AUTO');
    });

    it('should suggest PLAN when no pending tasks', () => {
      const result = service.generateResumeCommand('ACT', [], 'My Feature');
      expect(result).toContain('PLAN');
      expect(result).toContain('My Feature');
    });
  });

  describe('formatBriefingMarkdown', () => {
    it('should include title in header', () => {
      const md = service.formatBriefingMarkdown({
        decisions: [],
        pendingTasks: [],
        changedFiles: [],
        resumeCommand: 'PLAN continue',
        currentMode: 'PLAN',
        title: 'My Feature',
      });
      expect(md).toContain('# Briefing: My Feature');
    });

    it('should include mode', () => {
      const md = service.formatBriefingMarkdown({
        decisions: [],
        pendingTasks: [],
        changedFiles: [],
        resumeCommand: 'PLAN continue',
        currentMode: 'ACT',
        title: 'Test',
      });
      expect(md).toContain('**Mode**: ACT');
    });

    it('should list decisions', () => {
      const md = service.formatBriefingMarkdown({
        decisions: ['Decision A', 'Decision B'],
        pendingTasks: [],
        changedFiles: [],
        resumeCommand: 'PLAN continue',
        currentMode: 'PLAN',
        title: 'Test',
      });
      expect(md).toContain('- Decision A');
      expect(md).toContain('- Decision B');
    });

    it('should list changed files', () => {
      const md = service.formatBriefingMarkdown({
        decisions: [],
        pendingTasks: [],
        changedFiles: ['src/app.ts', 'src/main.ts'],
        resumeCommand: 'PLAN continue',
        currentMode: 'PLAN',
        title: 'Test',
      });
      expect(md).toContain('- src/app.ts');
      expect(md).toContain('- src/main.ts');
    });

    it('should list pending tasks', () => {
      const md = service.formatBriefingMarkdown({
        decisions: [],
        pendingTasks: ['Finish handler', 'Add tests'],
        changedFiles: [],
        resumeCommand: 'ACT continue',
        currentMode: 'ACT',
        title: 'Test',
      });
      expect(md).toContain('- Finish handler');
      expect(md).toContain('- Add tests');
    });

    it('should include resume command in code block', () => {
      const md = service.formatBriefingMarkdown({
        decisions: [],
        pendingTasks: [],
        changedFiles: [],
        resumeCommand: 'ACT continue "My Feature"',
        currentMode: 'ACT',
        title: 'Test',
      });
      expect(md).toContain('```\nACT continue "My Feature"\n```');
    });

    it('should show placeholder when no decisions', () => {
      const md = service.formatBriefingMarkdown({
        decisions: [],
        pendingTasks: [],
        changedFiles: [],
        resumeCommand: 'PLAN continue',
        currentMode: 'PLAN',
        title: 'Test',
      });
      expect(md).toContain('_No decisions recorded._');
    });

    it('should show placeholder when no changed files', () => {
      const md = service.formatBriefingMarkdown({
        decisions: [],
        pendingTasks: [],
        changedFiles: [],
        resumeCommand: 'PLAN continue',
        currentMode: 'PLAN',
        title: 'Test',
      });
      expect(md).toContain('_No files changed._');
    });

    it('should show placeholder when no pending tasks', () => {
      const md = service.formatBriefingMarkdown({
        decisions: [],
        pendingTasks: [],
        changedFiles: [],
        resumeCommand: 'PLAN continue',
        currentMode: 'PLAN',
        title: 'Test',
      });
      expect(md).toContain('_No pending tasks._');
    });
  });
});
