import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AbstractHandler } from './abstract-handler';
import type { ToolDefinition } from './base.handler';
import type { ToolResponse } from '../response.utils';
import { createJsonResponse } from '../response.utils';

/**
 * Concrete implementation of AbstractHandler for testing Template Method pattern
 */
class TestHandler extends AbstractHandler {
  // Mock function to track handleTool calls
  public handleToolMock = vi.fn();

  constructor(private readonly handledTools: string[] = ['test_tool']) {
    super();
  }

  protected getHandledTools(): string[] {
    return this.handledTools;
  }

  protected async handleTool(
    toolName: string,
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    return this.handleToolMock(toolName, args);
  }

  // Public methods for testing protected methods
  public testGetHandledTools(): string[] {
    return this.getHandledTools();
  }

  public async testHandleTool(
    toolName: string,
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    return this.handleTool(toolName, args);
  }

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'test_tool',
        description: 'Test tool for unit testing',
        inputSchema: {
          type: 'object',
          properties: {
            param: { type: 'string' },
          },
          required: [],
        },
      },
    ];
  }
}

describe('AbstractHandler', () => {
  let handler: TestHandler;

  beforeEach(() => {
    handler = new TestHandler(['test_tool', 'another_tool']);
    handler.handleToolMock.mockResolvedValue(
      createJsonResponse({ result: 'success' }),
    );
  });

  describe('Template Method - handle()', () => {
    describe('Step 1: Tool name validation', () => {
      it('should return null when tool name is not handled by this handler', async () => {
        const result = await handler.handle('unknown_tool', { param: 'value' });

        expect(result).toBeNull();
        expect(handler.handleToolMock).not.toHaveBeenCalled();
      });

      it('should proceed to validation when tool name matches', async () => {
        const result = await handler.handle('test_tool', { param: 'value' });

        expect(result).not.toBeNull();
        expect(handler.handleToolMock).toHaveBeenCalledWith('test_tool', {
          param: 'value',
        });
      });

      it('should handle multiple tool names from getHandledTools', async () => {
        const result1 = await handler.handle('test_tool', {});
        const result2 = await handler.handle('another_tool', {});

        expect(result1).not.toBeNull();
        expect(result2).not.toBeNull();
        expect(handler.handleToolMock).toHaveBeenCalledTimes(2);
      });
    });

    describe('Step 2: Prototype pollution protection', () => {
      it('should reject args with __proto__ key', async () => {
        // Use Object.defineProperty to create actual __proto__ property
        const maliciousArgs: Record<string, unknown> = { normalParam: 'value' };
        Object.defineProperty(maliciousArgs, '__proto__', {
          value: { polluted: true },
          enumerable: true,
        });

        const result = await handler.handle('test_tool', maliciousArgs);

        expect(result).not.toBeNull();
        expect(result!.isError).toBe(true);
        expect(result!.content[0].text).toContain('dangerous key detected');
        expect(result!.content[0].text).toContain('__proto__');
        expect(handler.handleToolMock).not.toHaveBeenCalled();
      });

      it('should reject args with constructor key', async () => {
        const maliciousArgs = {
          constructor: { polluted: true },
          normalParam: 'value',
        };

        const result = await handler.handle('test_tool', maliciousArgs);

        expect(result).not.toBeNull();
        expect(result!.isError).toBe(true);
        expect(result!.content[0].text).toContain('dangerous key detected');
        expect(result!.content[0].text).toContain('constructor');
        expect(handler.handleToolMock).not.toHaveBeenCalled();
      });

      it('should reject args with prototype key', async () => {
        const maliciousArgs = {
          prototype: { polluted: true },
          normalParam: 'value',
        };

        const result = await handler.handle('test_tool', maliciousArgs);

        expect(result).not.toBeNull();
        expect(result!.isError).toBe(true);
        expect(result!.content[0].text).toContain('dangerous key detected');
        expect(result!.content[0].text).toContain('prototype');
        expect(handler.handleToolMock).not.toHaveBeenCalled();
      });

      it('should reject nested dangerous keys in args', async () => {
        const deepNested: Record<string, unknown> = {};
        Object.defineProperty(deepNested, '__proto__', {
          value: { polluted: true },
          enumerable: true,
        });

        const maliciousArgs = {
          normalParam: 'value',
          nested: {
            deepNested,
          },
        };

        const result = await handler.handle('test_tool', maliciousArgs);

        expect(result).not.toBeNull();
        expect(result!.isError).toBe(true);
        expect(result!.content[0].text).toContain('dangerous key detected');
        expect(result!.content[0].text).toContain(
          'nested.deepNested.__proto__',
        );
        expect(handler.handleToolMock).not.toHaveBeenCalled();
      });

      it('should accept undefined args without error', async () => {
        const result = await handler.handle('test_tool', undefined);

        expect(result).not.toBeNull();
        expect(result!.isError).toBeUndefined();
        expect(handler.handleToolMock).toHaveBeenCalledWith(
          'test_tool',
          undefined,
        );
      });

      it('should accept safe args and proceed to handleTool', async () => {
        const safeArgs = {
          param1: 'value1',
          param2: 42,
          nested: { safe: 'data' },
        };

        const result = await handler.handle('test_tool', safeArgs);

        expect(result).not.toBeNull();
        expect(result!.isError).toBeUndefined();
        expect(handler.handleToolMock).toHaveBeenCalledWith(
          'test_tool',
          safeArgs,
        );
      });
    });

    describe('Step 3: Delegation to concrete handler', () => {
      it('should delegate to handleTool after successful validation', async () => {
        const args = { param: 'test-value' };

        await handler.handle('test_tool', args);

        expect(handler.handleToolMock).toHaveBeenCalledTimes(1);
        expect(handler.handleToolMock).toHaveBeenCalledWith('test_tool', args);
      });

      it('should return the result from handleTool', async () => {
        const expectedResponse = createJsonResponse({ custom: 'response' });
        handler.handleToolMock.mockResolvedValue(expectedResponse);

        const result = await handler.handle('test_tool', { param: 'value' });

        expect(result).toEqual(expectedResponse);
      });

      it('should propagate errors from handleTool', async () => {
        const error = new Error('Handler implementation error');
        handler.handleToolMock.mockRejectedValue(error);

        await expect(
          handler.handle('test_tool', { param: 'value' }),
        ).rejects.toThrow('Handler implementation error');
      });
    });

    describe('Template Method workflow order', () => {
      it('should execute validation steps in correct order: tool name → security → delegation', async () => {
        const executionOrder: string[] = [];

        // Create a handler that tracks execution order
        class OrderTrackingHandler extends AbstractHandler {
          protected getHandledTools(): string[] {
            executionOrder.push('getHandledTools');
            return ['test_tool'];
          }

          protected async handleTool(): Promise<ToolResponse> {
            executionOrder.push('handleTool');
            return createJsonResponse({ result: 'success' });
          }

          getToolDefinitions(): ToolDefinition[] {
            return [];
          }
        }

        const orderHandler = new OrderTrackingHandler();
        await orderHandler.handle('test_tool', { param: 'value' });

        expect(executionOrder).toEqual(['getHandledTools', 'handleTool']);
      });

      it('should stop at tool name check if tool not handled', async () => {
        const executionOrder: string[] = [];

        class OrderTrackingHandler extends AbstractHandler {
          protected getHandledTools(): string[] {
            executionOrder.push('getHandledTools');
            return ['other_tool'];
          }

          protected async handleTool(): Promise<ToolResponse> {
            executionOrder.push('handleTool');
            return createJsonResponse({ result: 'success' });
          }

          getToolDefinitions(): ToolDefinition[] {
            return [];
          }
        }

        const orderHandler = new OrderTrackingHandler();
        const result = await orderHandler.handle('test_tool', {
          param: 'value',
        });

        expect(result).toBeNull();
        expect(executionOrder).toEqual(['getHandledTools']); // Should not reach handleTool
      });

      it('should stop at security validation if args contain dangerous keys', async () => {
        const maliciousArgs: Record<string, unknown> = {};
        Object.defineProperty(maliciousArgs, '__proto__', {
          value: { polluted: true },
          enumerable: true,
        });

        const result = await handler.handle('test_tool', maliciousArgs);

        expect(result!.isError).toBe(true);
        expect(handler.handleToolMock).not.toHaveBeenCalled(); // Should not reach handleTool
      });
    });
  });

  describe('Abstract method contracts', () => {
    it('should require concrete handler to implement getHandledTools', () => {
      // This is verified by TypeScript compilation
      // If a concrete class doesn't implement getHandledTools, it won't compile
      expect(handler.testGetHandledTools()).toEqual([
        'test_tool',
        'another_tool',
      ]);
    });

    it('should require concrete handler to implement handleTool', () => {
      // This is verified by TypeScript compilation
      expect(typeof handler.testHandleTool).toBe('function');
    });

    it('should require concrete handler to implement getToolDefinitions', () => {
      // This is verified by TypeScript compilation
      const definitions = handler.getToolDefinitions();
      expect(definitions).toHaveLength(1);
      expect(definitions[0].name).toBe('test_tool');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string tool name', async () => {
      const result = await handler.handle('', { param: 'value' });

      expect(result).toBeNull();
      expect(handler.handleToolMock).not.toHaveBeenCalled();
    });

    it('should handle empty handledTools array', async () => {
      const emptyHandler = new TestHandler([]);

      const result = await emptyHandler.handle('test_tool', { param: 'value' });

      expect(result).toBeNull();
      expect(emptyHandler.handleToolMock).not.toHaveBeenCalled();
    });

    it('should handle empty args object', async () => {
      const result = await handler.handle('test_tool', {});

      expect(result).not.toBeNull();
      expect(result!.isError).toBeUndefined();
      expect(handler.handleToolMock).toHaveBeenCalledWith('test_tool', {});
    });

    it('should handle args with array values', async () => {
      const argsWithArray = {
        items: ['item1', 'item2'],
        count: 2,
      };

      const result = await handler.handle('test_tool', argsWithArray);

      expect(result).not.toBeNull();
      expect(result!.isError).toBeUndefined();
      expect(handler.handleToolMock).toHaveBeenCalledWith(
        'test_tool',
        argsWithArray,
      );
    });

    it('should reject dangerous keys in array elements', async () => {
      const arrayElement: Record<string, unknown> = {};
      Object.defineProperty(arrayElement, '__proto__', {
        value: { polluted: true },
        enumerable: true,
      });

      const maliciousArgs = {
        items: [arrayElement],
      };

      const result = await handler.handle('test_tool', maliciousArgs);

      expect(result!.isError).toBe(true);
      expect(result!.content[0].text).toContain('dangerous key detected');
      expect(handler.handleToolMock).not.toHaveBeenCalled();
    });
  });
});
