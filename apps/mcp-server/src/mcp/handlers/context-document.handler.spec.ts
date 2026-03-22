import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContextDocumentHandler } from './context-document.handler';
import { ContextDocumentService } from '../../context/context-document.service';
import { CONTEXT_FILE_PATH, getSessionContextFilePath } from '../../context/context-document.types';

describe('ContextDocumentHandler', () => {
  let handler: ContextDocumentHandler;
  let mockContextDocService: ContextDocumentService;

  const mockReadResult = {
    exists: true,
    document: {
      metadata: {
        title: 'Test',
        createdAt: '2024-01-01',
        lastUpdatedAt: '2024-01-01',
        currentMode: 'PLAN' as const,
        status: 'active' as const,
      },
      sections: [],
    },
  };

  beforeEach(() => {
    mockContextDocService = {
      readContext: vi.fn().mockResolvedValue(mockReadResult),
      resetContext: vi.fn().mockResolvedValue({
        success: true,
        document: mockReadResult.document,
      }),
      appendContext: vi.fn().mockResolvedValue({
        success: true,
        document: mockReadResult.document,
      }),
      performCleanup: vi.fn().mockResolvedValue({
        success: true,
        message: 'Cleaned up',
        document: mockReadResult.document,
      }),
    } as unknown as ContextDocumentService;

    handler = new ContextDocumentHandler(mockContextDocService);
  });

  describe('handle', () => {
    it('should return null for unhandled tools', async () => {
      const result = await handler.handle('unknown_tool', {});
      expect(result).toBeNull();
    });

    describe('read_context', () => {
      it('should fallback to standard for invalid verbosity', async () => {
        const result = await handler.handle('read_context', {
          verbosity: 'INVALID',
        });

        expect(result?.isError).toBeFalsy();
        expect(mockContextDocService.readContext).toHaveBeenCalled();
        // Verify the response includes verbosityApplied as 'standard' (fallback)
        const responseData = JSON.parse(result!.content[0].text);
        expect(responseData.summary.verbosityApplied).toBe('standard');
      });

      it('should accept valid verbosity levels', async () => {
        const result = await handler.handle('read_context', {
          verbosity: 'minimal',
        });

        expect(result?.isError).toBeFalsy();
        expect(mockContextDocService.readContext).toHaveBeenCalledWith({
          maxSections: 1,
        });
        const responseData = JSON.parse(result!.content[0].text);
        expect(responseData.summary.verbosityApplied).toBe('minimal');
      });

      it('should accept full verbosity level', async () => {
        const result = await handler.handle('read_context', {
          verbosity: 'full',
        });

        expect(result?.isError).toBeFalsy();
        // full verbosity has maxContextSections: -1, so readOptions should be undefined
        expect(mockContextDocService.readContext).toHaveBeenCalledWith(undefined);
        const responseData = JSON.parse(result!.content[0].text);
        expect(responseData.summary.verbosityApplied).toBe('full');
      });

      it('should use standard as default when no verbosity provided', async () => {
        const result = await handler.handle('read_context', {});

        expect(result?.isError).toBeFalsy();
        expect(mockContextDocService.readContext).toHaveBeenCalledWith({
          maxSections: 2,
        });
        const responseData = JSON.parse(result!.content[0].text);
        expect(responseData.summary.verbosityApplied).toBe('standard');
      });

      it('should use standard as default when args is undefined', async () => {
        const result = await handler.handle('read_context', undefined);

        expect(result?.isError).toBeFalsy();
        expect(mockContextDocService.readContext).toHaveBeenCalledWith({
          maxSections: 2,
        });
        const responseData = JSON.parse(result!.content[0].text);
        expect(responseData.summary.verbosityApplied).toBe('standard');
      });

      it('should handle non-string verbosity gracefully', async () => {
        const result = await handler.handle('read_context', {
          verbosity: 123,
        });

        expect(result?.isError).toBeFalsy();
        // Non-string should fallback to standard
        const responseData = JSON.parse(result!.content[0].text);
        expect(responseData.summary.verbosityApplied).toBe('standard');
      });

      it('should return not-found message when context does not exist', async () => {
        mockContextDocService.readContext = vi.fn().mockResolvedValue({ exists: false });

        const result = await handler.handle('read_context', {});

        expect(result?.isError).toBeFalsy();
        const responseData = JSON.parse(result!.content[0].text);
        expect(responseData.exists).toBe(false);
        expect(responseData.message).toContain('No context document found');
      });

      it('should return error when service returns error', async () => {
        mockContextDocService.readContext = vi.fn().mockResolvedValue({
          exists: true,
          error: 'File read failed',
          document: mockReadResult.document,
        });

        const result = await handler.handle('read_context', {});

        expect(result?.isError).toBe(true);
        expect(result?.content[0].text).toContain('File read failed');
      });
    });

    describe('update_context', () => {
      it('should return error when mode is missing', async () => {
        const result = await handler.handle('update_context', {});
        expect(result?.isError).toBe(true);
        expect(result?.content[0].text).toContain('Missing required parameter: mode');
      });

      it('should return error when mode is invalid', async () => {
        const result = await handler.handle('update_context', {
          mode: 'INVALID',
        });
        expect(result?.isError).toBe(true);
        expect(result?.content[0].text).toContain('Invalid mode: INVALID');
      });

      it('should return error when args is undefined', async () => {
        const result = await handler.handle('update_context', undefined);
        expect(result?.isError).toBe(true);
        expect(result?.content[0].text).toContain('Missing required parameter: mode');
      });

      it('should reset context in PLAN mode', async () => {
        const result = await handler.handle('update_context', {
          mode: 'PLAN',
          title: 'Test Task',
          task: 'Implement feature',
          primaryAgent: 'plan-mode',
        });

        expect(result?.isError).toBeFalsy();
        expect(mockContextDocService.resetContext).toHaveBeenCalledWith({
          title: 'Test Task',
          task: 'Implement feature',
          primaryAgent: 'plan-mode',
          recommendedActAgent: undefined,
          recommendedActAgentConfidence: undefined,
          decisions: undefined,
          notes: undefined,
        });
        const responseData = JSON.parse(result!.content[0].text);
        expect(responseData.success).toBe(true);
        expect(responseData.message).toContain('PLAN mode');
      });

      it('should use "Untitled Task" as default title in PLAN mode', async () => {
        await handler.handle('update_context', { mode: 'PLAN' });
        expect(mockContextDocService.resetContext).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Untitled Task' }),
        );
      });

      it('should pass all optional params in PLAN mode', async () => {
        await handler.handle('update_context', {
          mode: 'PLAN',
          title: 'Full Test',
          task: 'Full task',
          primaryAgent: 'agent',
          recommendedActAgent: 'agent-architect',
          recommendedActAgentConfidence: 0.9,
          decisions: ['Decision 1'],
          notes: ['Note 1'],
        });
        expect(mockContextDocService.resetContext).toHaveBeenCalledWith({
          title: 'Full Test',
          task: 'Full task',
          primaryAgent: 'agent',
          recommendedActAgent: 'agent-architect',
          recommendedActAgentConfidence: 0.9,
          decisions: ['Decision 1'],
          notes: ['Note 1'],
        });
      });

      it('should ignore non-number recommendedActAgentConfidence', async () => {
        await handler.handle('update_context', {
          mode: 'PLAN',
          title: 'Type Test',
          recommendedActAgentConfidence: '0.9',
        });

        expect(mockContextDocService.resetContext).toHaveBeenCalledWith(
          expect.objectContaining({
            recommendedActAgentConfidence: undefined,
          }),
        );
      });

      it('should ignore non-array decisions and notes', async () => {
        await handler.handle('update_context', {
          mode: 'PLAN',
          title: 'Type Test',
          decisions: 'not-an-array',
          notes: 42,
        });

        expect(mockContextDocService.resetContext).toHaveBeenCalledWith(
          expect.objectContaining({
            decisions: undefined,
            notes: undefined,
          }),
        );
      });

      it('should return error when resetContext fails', async () => {
        mockContextDocService.resetContext = vi.fn().mockResolvedValue({
          success: false,
          error: 'Reset failed',
        });
        const result = await handler.handle('update_context', {
          mode: 'PLAN',
          title: 'Test',
        });
        expect(result?.isError).toBe(true);
        expect(result?.content[0].text).toContain('Reset failed');
      });

      it('should append context in ACT mode', async () => {
        const result = await handler.handle('update_context', {
          mode: 'ACT',
          task: 'Implementing feature',
          progress: ['Step 1 done'],
          status: 'in_progress',
        });

        expect(result?.isError).toBeFalsy();
        expect(mockContextDocService.appendContext).toHaveBeenCalledWith({
          mode: 'ACT',
          task: 'Implementing feature',
          primaryAgent: undefined,
          recommendedActAgent: undefined,
          recommendedActAgentConfidence: undefined,
          decisions: undefined,
          notes: undefined,
          progress: ['Step 1 done'],
          findings: undefined,
          recommendations: undefined,
          status: 'in_progress',
        });
        const responseData = JSON.parse(result!.content[0].text);
        expect(responseData.message).toContain('ACT mode');
      });

      it('should append context in EVAL mode with findings', async () => {
        const result = await handler.handle('update_context', {
          mode: 'EVAL',
          findings: ['Finding 1'],
          recommendations: ['Rec 1'],
          status: 'completed',
        });

        expect(result?.isError).toBeFalsy();
        expect(mockContextDocService.appendContext).toHaveBeenCalledWith(
          expect.objectContaining({
            mode: 'EVAL',
            findings: ['Finding 1'],
            recommendations: ['Rec 1'],
            status: 'completed',
          }),
        );
      });

      it('should append context in AUTO mode', async () => {
        const result = await handler.handle('update_context', {
          mode: 'AUTO',
          decisions: ['Auto decision'],
          notes: ['Auto note'],
        });

        expect(result?.isError).toBeFalsy();
        expect(mockContextDocService.appendContext).toHaveBeenCalledWith(
          expect.objectContaining({
            mode: 'AUTO',
            decisions: ['Auto decision'],
            notes: ['Auto note'],
          }),
        );
      });

      it('should return error when appendContext fails', async () => {
        mockContextDocService.appendContext = vi.fn().mockResolvedValue({
          success: false,
          error: 'Append failed',
        });
        const result = await handler.handle('update_context', { mode: 'ACT' });
        expect(result?.isError).toBe(true);
        expect(result?.content[0].text).toContain('Append failed');
      });
    });

    describe('cleanup_context', () => {
      it('should cleanup with default parameters', async () => {
        const result = await handler.handle('cleanup_context', {});

        expect(result?.isError).toBeFalsy();
        expect(mockContextDocService.performCleanup).toHaveBeenCalledWith(2, 5, undefined);
        const responseData = JSON.parse(result!.content[0].text);
        expect(responseData.success).toBe(true);
      });

      it('should cleanup with custom parameters', async () => {
        const result = await handler.handle('cleanup_context', {
          keepRecentSectionsFull: 3,
          keepRecentItems: 10,
        });

        expect(result?.isError).toBeFalsy();
        expect(mockContextDocService.performCleanup).toHaveBeenCalledWith(3, 10, undefined);
      });

      it('should cleanup with undefined args using defaults', async () => {
        const result = await handler.handle('cleanup_context', undefined);

        expect(result?.isError).toBeFalsy();
        expect(mockContextDocService.performCleanup).toHaveBeenCalledWith(2, 5, undefined);
      });

      it('should accept keepRecentSectionsFull of 0 as valid boundary', async () => {
        const result = await handler.handle('cleanup_context', {
          keepRecentSectionsFull: 0,
          keepRecentItems: 1,
        });

        expect(result?.isError).toBeFalsy();
        expect(mockContextDocService.performCleanup).toHaveBeenCalledWith(0, 1, undefined);
      });

      it('should return error for negative keepRecentSectionsFull', async () => {
        const result = await handler.handle('cleanup_context', {
          keepRecentSectionsFull: -1,
        });
        expect(result?.isError).toBe(true);
        expect(result?.content[0].text).toContain('keepRecentSectionsFull must be >= 0');
      });

      it('should return error for keepRecentItems less than 1', async () => {
        const result = await handler.handle('cleanup_context', {
          keepRecentItems: 0,
        });
        expect(result?.isError).toBe(true);
        expect(result?.content[0].text).toContain('keepRecentItems must be >= 1');
      });

      it('should return error when performCleanup fails', async () => {
        mockContextDocService.performCleanup = vi.fn().mockResolvedValue({
          success: false,
          error: 'Cleanup failed',
        });
        const result = await handler.handle('cleanup_context', {});
        expect(result?.isError).toBe(true);
        expect(result?.content[0].text).toContain('Cleanup failed');
      });
    });
  });

  describe('getToolDefinitions', () => {
    it('should return tool definitions', () => {
      const definitions = handler.getToolDefinitions();

      expect(definitions).toHaveLength(3);
      expect(definitions.map(d => d.name)).toEqual([
        'read_context',
        'update_context',
        'cleanup_context',
      ]);
    });

    it('should have correct required parameters for update_context', () => {
      const definitions = handler.getToolDefinitions();
      const updateContext = definitions.find(d => d.name === 'update_context');
      expect(updateContext?.inputSchema.required).toEqual(['mode']);
    });

    it('should have no required parameters for read_context', () => {
      const definitions = handler.getToolDefinitions();
      const readContext = definitions.find(d => d.name === 'read_context');
      expect(readContext?.inputSchema.required).toEqual([]);
    });

    it('should include sessionId in update_context schema', () => {
      const definitions = handler.getToolDefinitions();
      const updateContext = definitions.find(d => d.name === 'update_context');
      expect(updateContext?.inputSchema.properties.sessionId).toBeDefined();
      const sessionIdProp = updateContext?.inputSchema.properties.sessionId as { type: string };
      expect(sessionIdProp.type).toBe('string');
    });

    it('should include sessionId in read_context schema', () => {
      const definitions = handler.getToolDefinitions();
      const readContext = definitions.find(d => d.name === 'read_context');
      expect(readContext?.inputSchema.properties.sessionId).toBeDefined();
    });

    it('should include sessionId in cleanup_context schema', () => {
      const definitions = handler.getToolDefinitions();
      const cleanupContext = definitions.find(d => d.name === 'cleanup_context');
      expect(cleanupContext?.inputSchema.properties.sessionId).toBeDefined();
    });
  });

  describe('session isolation', () => {
    describe('update_context with sessionId', () => {
      it('should pass sessionId to resetContext in PLAN mode', async () => {
        const result = await handler.handle('update_context', {
          mode: 'PLAN',
          title: 'Session Test',
          sessionId: 'session-abc-123',
        });

        expect(result?.isError).toBeFalsy();
        expect(mockContextDocService.resetContext).toHaveBeenCalledWith(
          expect.objectContaining({ sessionId: 'session-abc-123' }),
        );
        const responseData = JSON.parse(result!.content[0].text);
        expect(responseData.filePath).toBe(getSessionContextFilePath('session-abc-123'));
      });

      it('should pass sessionId to appendContext in ACT mode', async () => {
        const result = await handler.handle('update_context', {
          mode: 'ACT',
          sessionId: 'session-abc-123',
          progress: ['Step 1'],
        });

        expect(result?.isError).toBeFalsy();
        expect(mockContextDocService.appendContext).toHaveBeenCalledWith(
          expect.objectContaining({ sessionId: 'session-abc-123' }),
        );
        const responseData = JSON.parse(result!.content[0].text);
        expect(responseData.filePath).toBe(getSessionContextFilePath('session-abc-123'));
      });

      it('should reject invalid sessionId with path traversal', async () => {
        const result = await handler.handle('update_context', {
          mode: 'PLAN',
          title: 'Attack Test',
          sessionId: '../../../etc/passwd',
        });

        expect(result?.isError).toBe(true);
        expect(result?.content[0].text).toContain('Invalid sessionId');
      });

      it('should reject sessionId with dots', async () => {
        const result = await handler.handle('update_context', {
          mode: 'PLAN',
          title: 'Dot Test',
          sessionId: 'session.evil',
        });

        expect(result?.isError).toBe(true);
        expect(result?.content[0].text).toContain('Invalid sessionId');
      });

      it('should reject sessionId with slashes', async () => {
        const result = await handler.handle('update_context', {
          mode: 'PLAN',
          title: 'Slash Test',
          sessionId: 'path/traversal',
        });

        expect(result?.isError).toBe(true);
        expect(result?.content[0].text).toContain('Invalid sessionId');
      });

      it('should reject sessionId exceeding 64 characters', async () => {
        const result = await handler.handle('update_context', {
          mode: 'PLAN',
          title: 'Long Test',
          sessionId: 'a'.repeat(65),
        });

        expect(result?.isError).toBe(true);
        expect(result?.content[0].text).toContain('Invalid sessionId');
      });
    });

    describe('read_context with sessionId', () => {
      it('should pass sessionId in read options', async () => {
        const result = await handler.handle('read_context', {
          sessionId: 'my-session',
        });

        expect(result?.isError).toBeFalsy();
        expect(mockContextDocService.readContext).toHaveBeenCalledWith(
          expect.objectContaining({ sessionId: 'my-session' }),
        );
        const responseData = JSON.parse(result!.content[0].text);
        expect(responseData.filePath).toBe(getSessionContextFilePath('my-session'));
      });

      it('should reject invalid sessionId in read', async () => {
        const result = await handler.handle('read_context', {
          sessionId: '../malicious',
        });

        expect(result?.isError).toBe(true);
        expect(result?.content[0].text).toContain('Invalid sessionId');
      });

      it('should combine sessionId with verbosity options', async () => {
        const result = await handler.handle('read_context', {
          sessionId: 'my-session',
          verbosity: 'full',
        });

        expect(result?.isError).toBeFalsy();
        expect(mockContextDocService.readContext).toHaveBeenCalledWith(
          expect.objectContaining({ sessionId: 'my-session' }),
        );
      });
    });

    describe('cleanup_context with sessionId', () => {
      it('should pass sessionId to performCleanup', async () => {
        const result = await handler.handle('cleanup_context', {
          sessionId: 'cleanup-session',
        });

        expect(result?.isError).toBeFalsy();
        expect(mockContextDocService.performCleanup).toHaveBeenCalledWith(2, 5, 'cleanup-session');
        const responseData = JSON.parse(result!.content[0].text);
        expect(responseData.filePath).toBe(getSessionContextFilePath('cleanup-session'));
      });

      it('should reject invalid sessionId in cleanup', async () => {
        const result = await handler.handle('cleanup_context', {
          sessionId: 'bad..id',
        });

        expect(result?.isError).toBe(true);
        expect(result?.content[0].text).toContain('Invalid sessionId');
      });
    });

    describe('backward compatibility', () => {
      it('should use legacy path when no sessionId in update_context PLAN', async () => {
        const result = await handler.handle('update_context', {
          mode: 'PLAN',
          title: 'Legacy Test',
        });

        expect(result?.isError).toBeFalsy();
        expect(mockContextDocService.resetContext).toHaveBeenCalledWith(
          expect.not.objectContaining({ sessionId: expect.anything() }),
        );
        const responseData = JSON.parse(result!.content[0].text);
        expect(responseData.filePath).toBe(CONTEXT_FILE_PATH);
      });

      it('should use legacy path when no sessionId in update_context ACT', async () => {
        const result = await handler.handle('update_context', {
          mode: 'ACT',
          progress: ['Step 1'],
        });

        expect(result?.isError).toBeFalsy();
        const responseData = JSON.parse(result!.content[0].text);
        expect(responseData.filePath).toBe(CONTEXT_FILE_PATH);
      });

      it('should use legacy path when no sessionId in read_context', async () => {
        const result = await handler.handle('read_context', {});

        expect(result?.isError).toBeFalsy();
        const responseData = JSON.parse(result!.content[0].text);
        expect(responseData.filePath).toBe(CONTEXT_FILE_PATH);
      });

      it('should use legacy path when no sessionId in cleanup_context', async () => {
        const result = await handler.handle('cleanup_context', {});

        expect(result?.isError).toBeFalsy();
        expect(mockContextDocService.performCleanup).toHaveBeenCalledWith(2, 5, undefined);
        const responseData = JSON.parse(result!.content[0].text);
        expect(responseData.filePath).toBe(CONTEXT_FILE_PATH);
      });
    });
  });
});
