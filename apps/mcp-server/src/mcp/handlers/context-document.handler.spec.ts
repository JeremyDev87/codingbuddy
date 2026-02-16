import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContextDocumentHandler } from './context-document.handler';
import { ContextDocumentService } from '../../context/context-document.service';

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
      resetContext: vi
        .fn()
        .mockResolvedValue({
          success: true,
          document: mockReadResult.document,
        }),
      appendContext: vi
        .fn()
        .mockResolvedValue({
          success: true,
          document: mockReadResult.document,
        }),
      performCleanup: vi
        .fn()
        .mockResolvedValue({
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
        expect(mockContextDocService.readContext).toHaveBeenCalledWith(
          undefined,
        );
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
        mockContextDocService.readContext = vi
          .fn()
          .mockResolvedValue({ exists: false });

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
  });
});
