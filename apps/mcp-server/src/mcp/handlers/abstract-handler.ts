import type { ToolHandler, ToolDefinition } from './base.handler';
import type { ToolResponse } from '../response.utils';
import { createErrorResponse } from '../response.utils';
import { sanitizeHandlerArgs } from '../../shared/security.utils';

/**
 * Abstract base handler implementing the Template Method pattern.
 *
 * Provides common validation logic for all handlers:
 * 1. Tool name validation
 * 2. Prototype pollution protection
 * 3. Delegates to concrete handler implementation
 *
 * Concrete handlers must implement:
 * - `getHandledTools()`: List of tool names this handler processes
 * - `handleTool()`: Tool-specific processing logic
 * - `getToolDefinitions()`: Tool schema definitions
 *
 * @example
 * ```typescript
 * export class MyHandler extends AbstractHandler {
 *   protected getHandledTools(): string[] {
 *     return ['my_tool'];
 *   }
 *
 *   protected async handleTool(
 *     toolName: string,
 *     args: Record<string, unknown> | undefined,
 *   ): Promise<ToolResponse> {
 *     // Tool-specific logic here
 *     return createJsonResponse({ result: 'success' });
 *   }
 *
 *   getToolDefinitions(): ToolDefinition[] {
 *     return [{ name: 'my_tool', description: '...', inputSchema: {...} }];
 *   }
 * }
 * ```
 */
export abstract class AbstractHandler implements ToolHandler {
  /**
   * Template method implementing the validation workflow.
   *
   * This method:
   * 1. Checks if tool name is handled by this handler
   * 2. Validates args for prototype pollution
   * 3. Delegates to concrete implementation
   *
   * @param toolName - Name of the tool being called
   * @param args - Arguments passed to the tool
   * @returns ToolResponse if handled, null if not this handler's responsibility
   */
  async handle(
    toolName: string,
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse | null> {
    // Step 1: Check if this handler handles the tool
    if (!this.getHandledTools().includes(toolName)) {
      return null;
    }

    // Step 2: Validate args for prototype pollution
    const validation = sanitizeHandlerArgs(args);
    if (!validation.safe) {
      return createErrorResponse(validation.error!);
    }

    // Step 3: Delegate to concrete handler
    return this.handleTool(toolName, args);
  }

  /**
   * Get the list of tool names this handler processes.
   *
   * Concrete handlers must implement this to specify which tools they handle.
   *
   * @returns Array of tool names (e.g., ['search_rules', 'get_agent_details'])
   */
  protected abstract getHandledTools(): string[];

  /**
   * Handle the tool request after validation.
   *
   * This method is called after tool name and args validation.
   * Concrete handlers implement their tool-specific logic here.
   *
   * @param toolName - Name of the tool (guaranteed to be in getHandledTools())
   * @param args - Arguments (guaranteed to pass security validation)
   * @returns ToolResponse with the result or error
   */
  protected abstract handleTool(
    toolName: string,
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse>;

  /**
   * Get tool definitions for MCP server registration.
   *
   * Concrete handlers must implement this to provide tool schemas.
   *
   * @returns Array of tool definitions
   */
  abstract getToolDefinitions(): ToolDefinition[];
}
