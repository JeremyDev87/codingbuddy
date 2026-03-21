import { describe, it, expect, beforeEach } from 'vitest';
import { ParallelValidationHandler } from './parallel-validation.handler';

describe('ParallelValidationHandler', () => {
  let handler: ParallelValidationHandler;

  beforeEach(() => {
    handler = new ParallelValidationHandler();
  });

  describe('getToolDefinitions', () => {
    it('should return validate_parallel_issues tool definition', () => {
      const defs = handler.getToolDefinitions();
      expect(defs).toHaveLength(1);
      expect(defs[0].name).toBe('validate_parallel_issues');
      expect(defs[0].inputSchema.properties).toHaveProperty('issues');
      expect(defs[0].inputSchema.properties).toHaveProperty('issueContents');
      expect(defs[0].inputSchema.required).toContain('issues');
    });
  });

  describe('handle', () => {
    it('should return null for unhandled tools', async () => {
      const result = await handler.handle('unknown_tool', {});
      expect(result).toBeNull();
    });

    it('should return error when issues param is missing', async () => {
      const result = await handler.handle('validate_parallel_issues', {});
      expect(result?.isError).toBe(true);
    });

    it('should return error when issues is not an array', async () => {
      const result = await handler.handle('validate_parallel_issues', {
        issues: 'not-array',
      });
      expect(result?.isError).toBe(true);
    });

    it('should return OK when no overlaps exist', async () => {
      const result = await handler.handle('validate_parallel_issues', {
        issues: [732, 733],
        issueContents: {
          '732': '## Target Files\n- src/a.ts',
          '733': '## Target Files\n- src/b.ts',
        },
      });
      expect(result?.isError).toBeFalsy();
      const content = JSON.parse(
        (result?.content as Array<{ type: string; text: string }>)[0].text,
      );
      expect(content.hasOverlap).toBe(false);
      expect(content.severity).toBe('OK');
      expect(content.suggestedWaves).toHaveLength(1);
    });

    it('should return WARNING when overlaps exist', async () => {
      const result = await handler.handle('validate_parallel_issues', {
        issues: [733, 734],
        issueContents: {
          '733': '## Target Files\n- apps/mcp-server/src/config.yaml\n- src/a.ts',
          '734': '## Target Files\n- apps/mcp-server/src/config.yaml\n- src/b.ts',
        },
      });
      expect(result?.isError).toBeFalsy();
      const content = JSON.parse(
        (result?.content as Array<{ type: string; text: string }>)[0].text,
      );
      expect(content.hasOverlap).toBe(true);
      expect(content.severity).toBe('WARNING');
      expect(content.overlapMatrix).toHaveLength(1);
      expect(content.overlapMatrix[0].overlappingFiles).toContain(
        'apps/mcp-server/src/config.yaml',
      );
      expect(content.suggestedWaves.length).toBeGreaterThanOrEqual(2);
      expect(content.message).toContain('WARNING');
    });

    it('should handle issueContents with multiple issues', async () => {
      const result = await handler.handle('validate_parallel_issues', {
        issues: [1, 2, 3],
        issueContents: {
          '1': 'Modify src/shared.ts and src/a.ts',
          '2': 'Change src/b.ts only',
          '3': 'Update src/shared.ts and src/c.ts',
        },
      });
      const content = JSON.parse(
        (result?.content as Array<{ type: string; text: string }>)[0].text,
      );
      expect(content.hasOverlap).toBe(true);
      expect(content.suggestedWaves.length).toBeGreaterThanOrEqual(2);
      // Issue 2 should be in same wave as 1 or 3 (no overlap with either)
      const waveWith2 = content.suggestedWaves.find((w: number[]) => w.includes(2));
      expect(waveWith2).toBeDefined();
    });
  });
});
