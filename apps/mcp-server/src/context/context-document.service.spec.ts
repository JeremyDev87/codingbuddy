import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ContextDocumentService } from './context-document.service';
import type { ConfigService } from '../config/config.service';
import * as fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import {
  CONTEXT_FILE_PATH,
  DEFAULT_CONTEXT_LIMITS,
} from './context-document.types';
import type { ContextLimits } from './context-document.types';
import { TimeoutError } from '../shared/async.utils';

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

// Shared test fixtures to avoid duplication (DRY principle)
const TEST_FIXTURES = {
  // Base dates used across fixtures
  CREATED_DATE: '2024-01-01T00:00:00.000Z',
  UPDATED_DATE: '2024-01-01T01:00:00.000Z',

  // Basic PLAN context with task description
  BASIC_PLAN_CONTEXT: `# Context: Test Task

**Created**: 2024-01-01T00:00:00.000Z
**Updated**: 2024-01-01T01:00:00.000Z
**Current Mode**: PLAN
**Status**: active

---

## PLAN (10:00)

**Primary Agent**: technical-planner
**Status**: in_progress

### Task
Test task description

---`,

  // PLAN context marked as completed, ready for ACT/EVAL append
  PLAN_COMPLETED_CONTEXT: `# Context: Test Task

**Created**: 2024-01-01T00:00:00.000Z
**Updated**: 2024-01-01T01:00:00.000Z
**Current Mode**: PLAN
**Status**: active

---

## PLAN (10:00)

**Primary Agent**: solution-architect
**Status**: completed

### Task
Initial planning task

---`,

  // Context with ACT section in progress (for merge tests)
  ACT_IN_PROGRESS_CONTEXT: `# Context: Test Task

**Created**: 2024-01-01T00:00:00.000Z
**Updated**: 2024-01-01T01:00:00.000Z
**Current Mode**: ACT
**Status**: active

---

## PLAN (10:00)

**Status**: completed

### Task
Planning

---

## ACT (11:00)

**Status**: in_progress

### Task
Implementation

### Progress
- Initial step done

---`,

  // Minimal PLAN completed context (for updateContext tests)
  MINIMAL_PLAN_COMPLETED: `# Context: Test

**Created**: 2024-01-01T00:00:00.000Z
**Updated**: 2024-01-01T01:00:00.000Z
**Current Mode**: PLAN
**Status**: active

---

## PLAN (10:00)

**Status**: completed

---`,

  // Minimal ACT mode context (for EVAL mode test)
  MINIMAL_ACT_CONTEXT: `# Context: Test

**Created**: 2024-01-01T00:00:00.000Z
**Updated**: 2024-01-01T01:00:00.000Z
**Current Mode**: ACT
**Status**: active

---

## PLAN (10:00)

**Status**: completed

---`,

  // PLAN with recommended ACT agent and confidence
  PLAN_WITH_ACT_RECOMMENDATION: `# Context: Test Task

**Created**: 2024-01-01T00:00:00.000Z
**Updated**: 2024-01-01T01:00:00.000Z
**Current Mode**: PLAN
**Status**: active

---

## PLAN (10:00)

**Primary Agent**: solution-architect
**Recommended ACT Agent**: backend-developer (confidence: 0.9)
**Status**: completed

### Task
Design API

---`,

  // PLAN without ACT agent recommendation
  PLAN_WITHOUT_RECOMMENDATION: `# Context: Test Task

**Created**: 2024-01-01T00:00:00.000Z
**Updated**: 2024-01-01T01:00:00.000Z
**Current Mode**: PLAN
**Status**: active

---

## PLAN (10:00)

**Primary Agent**: solution-architect
**Status**: completed

### Task
Design API

---`,

  // PLAN with ACT recommendation but no confidence value
  PLAN_WITH_RECOMMENDATION_NO_CONFIDENCE: `# Context: Test Task

**Created**: 2024-01-01T00:00:00.000Z
**Updated**: 2024-01-01T01:00:00.000Z
**Current Mode**: PLAN
**Status**: active

---

## PLAN (10:00)

**Primary Agent**: solution-architect
**Recommended ACT Agent**: backend-developer
**Status**: completed

---`,
} as const;

describe('ContextDocumentService', () => {
  let service: ContextDocumentService;
  let mockConfigService: ConfigService;

  beforeEach(() => {
    // Create mock ConfigService
    mockConfigService = {
      getProjectRoot: vi.fn().mockReturnValue('/test/project'),
      getContextLimits: vi.fn().mockResolvedValue(DEFAULT_CONTEXT_LIMITS),
    } as unknown as ConfigService;

    service = new ContextDocumentService(mockConfigService);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('contextExists', () => {
    it('should return true when context file exists', async () => {
      vi.mocked(existsSync).mockReturnValue(true);

      const result = await service.contextExists();

      expect(result).toBe(true);
      expect(existsSync).toHaveBeenCalledWith(
        `/test/project/${CONTEXT_FILE_PATH}`,
      );
    });

    it('should return false when context file does not exist', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = await service.contextExists();

      expect(result).toBe(false);
    });
  });

  describe('getContextFilePath', () => {
    it('should return the fixed context file path constant', () => {
      const result = service.getContextFilePath();

      expect(result).toBe(CONTEXT_FILE_PATH);
    });
  });

  describe('readContext', () => {
    it('should return exists=false when context file does not exist', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = await service.readContext();

      expect(result.exists).toBe(false);
      expect(result.document).toBeUndefined();
    });

    it('should parse and return document when file exists', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(
        TEST_FIXTURES.BASIC_PLAN_CONTEXT,
      );

      const result = await service.readContext();

      expect(result.exists).toBe(true);
      expect(result.document).toBeDefined();
      expect(result.document?.metadata.title).toBe('Test Task');
      expect(result.document?.metadata.currentMode).toBe('PLAN');
      expect(result.document?.sections).toHaveLength(1);
    });

    it('should handle read errors gracefully', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockRejectedValue(new Error('Read failed'));

      const result = await service.readContext();

      expect(result.exists).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle timeout errors', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockImplementation(() => {
        return Promise.reject(
          new TimeoutError('Timed out', 'read context file', 5000),
        );
      });

      const result = await service.readContext();

      expect(result.exists).toBe(false);
      expect(result.error).toContain('Timed out');
    });
  });

  describe('resetContext', () => {
    it('should create new context document with PLAN section', async () => {
      vi.mocked(existsSync).mockReturnValue(true); // directory exists
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await service.resetContext({
        title: 'Test Task',
        task: 'Implement feature X',
        primaryAgent: 'frontend-developer',
      });

      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();
      expect(result.document?.sections).toHaveLength(1);
      expect(result.document?.sections[0].mode).toBe('PLAN');
      expect(result.document?.sections[0].task).toBe('Implement feature X');
      expect(result.document?.sections[0].primaryAgent).toBe(
        'frontend-developer',
      );
    });

    it('should create docs directory if not exists', async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await service.resetContext({
        title: 'Test',
        task: 'Test task',
      });

      expect(mkdirSync).toHaveBeenCalledWith(expect.any(String), {
        recursive: true,
      });
    });

    it('should include recommendedActAgent when provided', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await service.resetContext({
        title: 'Test',
        task: 'Test task',
        recommendedActAgent: 'backend-developer',
        recommendedActAgentConfidence: 0.95,
      });

      expect(result.document?.sections[0].recommendedActAgent).toBe(
        'backend-developer',
      );
      expect(result.document?.sections[0].recommendedActAgentConfidence).toBe(
        0.95,
      );
    });

    it('should include decisions and notes when provided', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await service.resetContext({
        title: 'Test',
        task: 'Test task',
        decisions: ['Decision 1', 'Decision 2'],
        notes: ['Note 1'],
      });

      expect(result.document?.sections[0].decisions).toEqual([
        'Decision 1',
        'Decision 2',
      ]);
      expect(result.document?.sections[0].notes).toEqual(['Note 1']);
    });

    it('should handle write errors gracefully', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.writeFile).mockRejectedValue(new Error('Write failed'));

      const result = await service.resetContext({
        title: 'Test',
        task: 'Test task',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should write to correct file path', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await service.resetContext({
        title: 'Test',
        task: 'Test task',
      });

      expect(fs.writeFile).toHaveBeenCalledWith(
        `/test/project/${CONTEXT_FILE_PATH}`,
        expect.any(String),
        'utf-8',
      );
    });

    it('should truncate long arrays for DoS prevention', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      // Create array larger than limit
      const largeDecisions = Array.from(
        { length: 150 },
        (_, i) => `Decision ${i}`,
      );

      const customLimits: ContextLimits = {
        maxArrayItems: 10,
        maxItemLength: 50,
      };
      vi.mocked(mockConfigService.getContextLimits).mockResolvedValue(
        customLimits,
      );

      const result = await service.resetContext({
        title: 'Test',
        task: 'Test task',
        decisions: largeDecisions,
      });

      expect(result.document?.sections[0].decisions).toHaveLength(10);
    });
  });

  describe('appendContext', () => {
    it('should append ACT section to existing document', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(
        TEST_FIXTURES.PLAN_COMPLETED_CONTEXT,
      );
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await service.appendContext({
        mode: 'ACT',
        task: 'Implementation',
        progress: ['Step 1 done', 'Step 2 done'],
        status: 'in_progress',
      });

      expect(result.success).toBe(true);
      expect(result.document?.sections).toHaveLength(2);
      expect(result.document?.sections[1].mode).toBe('ACT');
      expect(result.document?.sections[1].progress).toEqual([
        'Step 1 done',
        'Step 2 done',
      ]);
    });

    it('should append EVAL section with findings and recommendations', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(
        TEST_FIXTURES.PLAN_COMPLETED_CONTEXT,
      );
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await service.appendContext({
        mode: 'EVAL',
        task: 'Code review',
        findings: ['Finding 1', 'Finding 2'],
        recommendations: ['Fix issue 1'],
        status: 'completed',
      });

      expect(result.success).toBe(true);
      expect(result.document?.sections[1].mode).toBe('EVAL');
      expect(result.document?.sections[1].findings).toEqual([
        'Finding 1',
        'Finding 2',
      ]);
      expect(result.document?.sections[1].recommendations).toEqual([
        'Fix issue 1',
      ]);
    });

    it('should return error when no context exists', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = await service.appendContext({
        mode: 'ACT',
        task: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No context document found');
    });

    it('should merge with existing section of same mode', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(
        TEST_FIXTURES.ACT_IN_PROGRESS_CONTEXT,
      );
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await service.appendContext({
        mode: 'ACT',
        progress: ['Second step done'],
        status: 'in_progress',
      });

      expect(result.success).toBe(true);
      // Should still have 2 sections (PLAN + merged ACT)
      expect(result.document?.sections).toHaveLength(2);
      // Merged ACT section should have accumulated progress
      const actSection = result.document?.sections.find(s => s.mode === 'ACT');
      expect(actSection?.progress).toContain('Initial step done');
      expect(actSection?.progress).toContain('Second step done');
    });

    it('should update metadata lastUpdatedAt and currentMode', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(
        TEST_FIXTURES.PLAN_COMPLETED_CONTEXT,
      );
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await service.appendContext({
        mode: 'ACT',
        task: 'Implementation',
      });

      expect(result.document?.metadata.currentMode).toBe('ACT');
      expect(result.document?.metadata.lastUpdatedAt).toBeDefined();
    });

    it('should handle write errors gracefully', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(
        TEST_FIXTURES.PLAN_COMPLETED_CONTEXT,
      );
      vi.mocked(fs.writeFile).mockRejectedValue(new Error('Write failed'));

      const result = await service.appendContext({
        mode: 'ACT',
        task: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('updateContext', () => {
    it('should call resetContext for PLAN mode', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await service.updateContext('PLAN', {
        title: 'New Task',
        task: 'Plan something',
        primaryAgent: 'solution-architect',
      });

      expect(result.success).toBe(true);
      expect(result.document?.sections[0].mode).toBe('PLAN');
    });

    it('should call appendContext for ACT mode', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(
        TEST_FIXTURES.MINIMAL_PLAN_COMPLETED,
      );
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await service.updateContext('ACT', {
        task: 'Implement feature',
        primaryAgent: 'frontend-developer',
      });

      expect(result.success).toBe(true);
      expect(result.document?.sections).toHaveLength(2);
    });

    it('should call appendContext for EVAL mode', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(
        TEST_FIXTURES.MINIMAL_ACT_CONTEXT,
      );
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await service.updateContext('EVAL', {
        task: 'Review code',
      });

      expect(result.success).toBe(true);
      expect(result.document?.sections).toHaveLength(2);
    });

    it('should use default title for PLAN mode if not provided', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await service.updateContext('PLAN', {
        task: 'Some task',
      });

      expect(result.document?.metadata.title).toBe('Untitled Task');
    });
  });

  describe('getRecommendedActAgent', () => {
    it('should extract agent from PLAN section', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(
        TEST_FIXTURES.PLAN_WITH_ACT_RECOMMENDATION,
      );

      const result = await service.getRecommendedActAgent();

      expect(result).not.toBeNull();
      expect(result?.agent).toBe('backend-developer');
      expect(result?.confidence).toBe(0.9);
    });

    it('should return null when no context exists', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = await service.getRecommendedActAgent();

      expect(result).toBeNull();
    });

    it('should return null when PLAN section has no recommendation', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(
        TEST_FIXTURES.PLAN_WITHOUT_RECOMMENDATION,
      );

      const result = await service.getRecommendedActAgent();

      expect(result).toBeNull();
    });

    it('should return confidence 0 when not specified', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(
        TEST_FIXTURES.PLAN_WITH_RECOMMENDATION_NO_CONFIDENCE,
      );

      const result = await service.getRecommendedActAgent();

      expect(result?.agent).toBe('backend-developer');
      expect(result?.confidence).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty title in resetContext', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await service.resetContext({
        title: '',
        task: 'Task without title',
      });

      expect(result.success).toBe(true);
      expect(result.document?.metadata.title).toBe('');
    });

    it('should handle undefined optional fields', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await service.resetContext({
        title: 'Minimal',
      });

      expect(result.success).toBe(true);
      expect(result.document?.sections[0].task).toBeUndefined();
      expect(result.document?.sections[0].decisions).toBeUndefined();
    });

    it('should handle getContextLimits failure with default fallback', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(mockConfigService.getContextLimits).mockRejectedValue(
        new Error('Config error'),
      );

      const result = await service.resetContext({
        title: 'Test',
        task: 'Test task',
        decisions: ['Decision 1'],
      });

      // Should still succeed using default limits
      expect(result.success).toBe(true);
    });

    it('should truncate long strings in array items', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const customLimits: ContextLimits = {
        maxArrayItems: 10,
        maxItemLength: 20,
      };
      vi.mocked(mockConfigService.getContextLimits).mockResolvedValue(
        customLimits,
      );

      const longDecision = 'A'.repeat(100); // 100 chars

      const result = await service.resetContext({
        title: 'Test',
        decisions: [longDecision],
      });

      expect(result.document?.sections[0].decisions?.[0]).toHaveLength(20);
    });

    it('should handle concurrent write operations without data loss', async () => {
      // Track write order to verify all writes completed
      const writeOrder: string[] = [];

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(
        TEST_FIXTURES.PLAN_COMPLETED_CONTEXT,
      );
      vi.mocked(fs.writeFile).mockImplementation(async (_path, content) => {
        // Simulate async delay to increase chance of race condition
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
        writeOrder.push(
          typeof content === 'string' ? content.slice(0, 20) : 'buffer',
        );
        return undefined;
      });

      // Launch multiple concurrent operations
      const operations = [
        service.appendContext({
          mode: 'ACT',
          task: 'Task 1',
          progress: ['Progress 1'],
        }),
        service.appendContext({
          mode: 'ACT',
          task: 'Task 2',
          progress: ['Progress 2'],
        }),
        service.appendContext({
          mode: 'ACT',
          task: 'Task 3',
          progress: ['Progress 3'],
        }),
      ];

      const results = await Promise.all(operations);

      // All operations should succeed (though order may vary)
      expect(results.every(r => r.success)).toBe(true);
      // All writes should have been attempted
      expect(writeOrder).toHaveLength(3);
    });
  });

  describe('file path handling', () => {
    it('should use project root from config service', async () => {
      vi.mocked(mockConfigService.getProjectRoot).mockReturnValue(
        '/different/path',
      );
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await service.resetContext({
        title: 'Test',
      });

      expect(fs.writeFile).toHaveBeenCalledWith(
        `/different/path/${CONTEXT_FILE_PATH}`,
        expect.any(String),
        'utf-8',
      );
    });
  });

  describe('readContext with options', () => {
    const MULTI_SECTION_CONTEXT = `# Context: Multi Section
**Created**: 2024-01-01T00:00:00.000Z
**Updated**: 2024-01-01T03:00:00.000Z
**Current Mode**: EVAL
**Status**: active

---

## PLAN (10:00)
**Status**: completed
### Task
Planning task
---

## ACT (11:00)
**Status**: completed
### Task
Implementation task
---

## EVAL (12:00)
**Status**: in_progress
### Task
Evaluation task
---`;

    it('should return all sections when no maxSections specified', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(MULTI_SECTION_CONTEXT);

      const result = await service.readContext();

      expect(result.exists).toBe(true);
      expect(result.document?.sections).toHaveLength(3);
      expect(result.truncatedSections).toBeUndefined();
    });

    it('should return only maxSections most recent sections', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(MULTI_SECTION_CONTEXT);

      const result = await service.readContext({ maxSections: 2 });

      expect(result.exists).toBe(true);
      expect(result.document?.sections).toHaveLength(2);
      expect(result.document?.sections[0].mode).toBe('ACT');
      expect(result.document?.sections[1].mode).toBe('EVAL');
      expect(result.truncatedSections).toBe(1);
    });

    it('should return 1 section for minimal verbosity', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(MULTI_SECTION_CONTEXT);

      const result = await service.readContext({ maxSections: 1 });

      expect(result.exists).toBe(true);
      expect(result.document?.sections).toHaveLength(1);
      expect(result.document?.sections[0].mode).toBe('EVAL');
      expect(result.truncatedSections).toBe(2);
    });

    it('should handle maxSections larger than actual sections', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(MULTI_SECTION_CONTEXT);

      const result = await service.readContext({ maxSections: 10 });

      expect(result.exists).toBe(true);
      expect(result.document?.sections).toHaveLength(3);
      expect(result.truncatedSections).toBeUndefined();
    });
  });

  describe('shouldCleanup', () => {
    it('should return none when no context exists', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = await service.shouldCleanup();

      expect(result.needed).toBe(false);
      expect(result.level).toBe('none');
      expect(result.currentSize).toBe(0);
    });

    it('should return none for small documents', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(
        TEST_FIXTURES.BASIC_PLAN_CONTEXT,
      );

      const result = await service.shouldCleanup();

      expect(result.needed).toBe(false);
      expect(result.level).toBe('none');
      expect(result.currentSize).toBeLessThan(50_000);
    });

    it('should return warn for documents approaching limit', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      // Create large content (>50k but <100k chars)
      const largeContent = `# Context: Large
**Created**: 2024-01-01T00:00:00.000Z
**Updated**: 2024-01-01T01:00:00.000Z
**Current Mode**: PLAN
**Status**: active

---

## PLAN (10:00)
**Status**: completed
### Decisions
${Array.from({ length: 1000 }, (_, i) => `- Decision ${i}: ${'x'.repeat(50)}`).join('\n')}
---`;

      vi.mocked(fs.readFile).mockResolvedValue(largeContent);

      const result = await service.shouldCleanup();

      expect(result.level).toBe('warn');
      expect(result.currentSize).toBeGreaterThanOrEqual(50_000);
      expect(result.currentSize).toBeLessThan(100_000);
    });

    it('should return cleanup for documents exceeding limit', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      // Create very large content (>100k chars)
      const veryLargeContent = `# Context: Very Large
**Created**: 2024-01-01T00:00:00.000Z
**Updated**: 2024-01-01T01:00:00.000Z
**Current Mode**: PLAN
**Status**: active

---

## PLAN (10:00)
**Status**: completed
### Decisions
${Array.from({ length: 2000 }, (_, i) => `- Decision ${i}: ${'x'.repeat(50)}`).join('\n')}
---`;

      vi.mocked(fs.readFile).mockResolvedValue(veryLargeContent);

      const result = await service.shouldCleanup();

      expect(result.needed).toBe(true);
      expect(result.level).toBe('cleanup');
      expect(result.currentSize).toBeGreaterThanOrEqual(100_000);
    });
  });

  describe('performCleanup', () => {
    it('should return error when no context exists', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = await service.performCleanup();

      expect(result.success).toBe(false);
      expect(result.error).toContain('No context document found');
    });

    it('should summarize older sections and keep recent ones full', async () => {
      const contextWithMultipleSections = `# Context: Test
**Created**: 2024-01-01T00:00:00.000Z
**Updated**: 2024-01-01T03:00:00.000Z
**Current Mode**: EVAL
**Status**: active

---

## PLAN (10:00)
**Status**: completed
### Decisions
- Decision 1
- Decision 2
- Decision 3
- Decision 4
- Decision 5
- Decision 6
- Decision 7
- Decision 8
---

## ACT (11:00)
**Status**: completed
### Progress
- Progress 1
- Progress 2
- Progress 3
- Progress 4
- Progress 5
- Progress 6
---

## EVAL (12:00)
**Status**: in_progress
### Findings
- Finding 1
- Finding 2
---`;

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(contextWithMultipleSections);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await service.performCleanup(2, 3);

      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();

      // PLAN section should be summarized (kept last 3 items)
      const planSection = result.document?.sections.find(
        s => s.mode === 'PLAN',
      );
      expect(planSection?.summarized).toBe(true);
      expect(planSection?.decisions).toHaveLength(3);
      expect(planSection?.decisions).toEqual([
        'Decision 6',
        'Decision 7',
        'Decision 8',
      ]);
      expect(planSection?.originalCounts?.decisions).toBe(8);

      // ACT and EVAL sections should remain full (recent)
      const actSection = result.document?.sections.find(s => s.mode === 'ACT');
      expect(actSection?.summarized).toBeUndefined();
      expect(actSection?.progress).toHaveLength(6);

      const evalSection = result.document?.sections.find(
        s => s.mode === 'EVAL',
      );
      expect(evalSection?.summarized).toBeUndefined();
      expect(evalSection?.findings).toHaveLength(2);
    });

    it('should log size reduction', async () => {
      // Create a document with significant content to reduce
      const largeDocumentForCleanup = `# Context: Test
**Created**: 2024-01-01T00:00:00.000Z
**Updated**: 2024-01-01T02:00:00.000Z
**Current Mode**: ACT
**Status**: active

---

## PLAN (10:00)
**Status**: completed
### Decisions
${Array.from({ length: 50 }, (_, i) => `- Decision ${i}`).join('\n')}
---

## ACT (11:00)
**Status**: in_progress
### Progress
- Progress 1
---`;

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(largeDocumentForCleanup);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await service.performCleanup(1, 5);

      expect(result.success).toBe(true);
      expect(result.message).toContain('reduced');
      // Verify actual size reduction occurred
      expect(result.message).toMatch(/Size reduced by \d+\.\d+% \(\d+ chars\)/);
    });
  });

  describe('auto cleanup integration', () => {
    it('should trigger auto cleanup when appending to large document', async () => {
      // Create a document that exceeds cleanup threshold
      const largeDocument = `# Context: Large
**Created**: 2024-01-01T00:00:00.000Z
**Updated**: 2024-01-01T01:00:00.000Z
**Current Mode**: PLAN
**Status**: active

---

## PLAN (10:00)
**Status**: completed
### Decisions
${Array.from({ length: 2000 }, (_, i) => `- Decision ${i}: ${'x'.repeat(50)}`).join('\n')}
---`;

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(largeDocument);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      // Mock to track if cleanup was called
      const performCleanupSpy = vi.spyOn(service, 'performCleanup');

      await service.appendContext({
        mode: 'ACT',
        task: 'New task',
      });

      // Auto cleanup should have been triggered
      expect(performCleanupSpy).toHaveBeenCalled();
    });

    it('should not trigger auto cleanup for small documents', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(
        TEST_FIXTURES.PLAN_COMPLETED_CONTEXT,
      );
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const performCleanupSpy = vi.spyOn(service, 'performCleanup');

      await service.appendContext({
        mode: 'ACT',
        task: 'New task',
      });

      // Auto cleanup should NOT have been triggered
      expect(performCleanupSpy).not.toHaveBeenCalled();
    });
  });
});
