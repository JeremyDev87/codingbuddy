import type { ToolResponse } from '../response.utils';

/**
 * Base interface for MCP tool handlers.
 *
 * Each handler is responsible for a specific domain of tools within the MCP server.
 * Handlers follow the Chain of Responsibility pattern - when a tool call comes in,
 * each handler is given the opportunity to handle it. If a handler recognizes the
 * tool name, it processes the request and returns a result. Otherwise, it returns
 * `null` to allow the next handler to try.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class MyHandler implements ToolHandler {
 *   async handle(
 *     toolName: string,
 *     args: Record<string, unknown> | undefined,
 *   ): Promise<ToolResponse | null> {
 *     switch (toolName) {
 *       case 'my_tool':
 *         return this.handleMyTool(args);
 *       default:
 *         return null; // Not handled by this handler
 *     }
 *   }
 *
 *   getToolDefinitions(): ToolDefinition[] {
 *     return [{
 *       name: 'my_tool',
 *       description: 'Description of my tool',
 *       inputSchema: {
 *         type: 'object',
 *         properties: { query: { type: 'string' } },
 *         required: ['query'],
 *       },
 *     }];
 *   }
 * }
 * ```
 *
 * @see {@link ToolDefinition} for tool schema definition
 * @see {@link ToolResponse} for response format
 */
export interface ToolHandler {
  /**
   * Handle a tool call request.
   *
   * This method should:
   * 1. Check if `toolName` is one this handler is responsible for
   * 2. If not, return `null` immediately (don't throw)
   * 3. If yes, validate `args` and process the request
   * 4. Return a `ToolResponse` with the result or error
   *
   * @param toolName - Name of the tool being called (e.g., 'search_rules', 'parse_mode')
   * @param args - Arguments passed to the tool, may be undefined if no args provided.
   *               Values should be validated before use as they come from external input.
   * @returns Promise resolving to:
   *          - `ToolResponse` if this handler processed the request (success or error)
   *          - `null` if this handler doesn't handle the given tool name
   *
   * @example
   * ```typescript
   * async handle(toolName: string, args: Record<string, unknown> | undefined) {
   *   if (toolName !== 'my_tool') return null;
   *
   *   const query = args?.query;
   *   if (typeof query !== 'string') {
   *     return createErrorResponse('Missing required parameter: query');
   *   }
   *
   *   const result = await this.myService.process(query);
   *   return createJsonResponse(result);
   * }
   * ```
   */
  handle(
    toolName: string,
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse | null>;

  /**
   * Get the tool definitions that this handler provides.
   *
   * Tool definitions are used to:
   * - Register tools with the MCP server during initialization
   * - Provide schema information to clients for input validation
   * - Generate documentation for available tools
   *
   * @returns Array of tool definitions supported by this handler.
   *          Each definition includes the tool name, description, and input schema.
   *
   * @example
   * ```typescript
   * getToolDefinitions(): ToolDefinition[] {
   *   return [{
   *     name: 'search_rules',
   *     description: 'Search for rules and guidelines',
   *     inputSchema: {
   *       type: 'object',
   *       properties: {
   *         query: {
   *           type: 'string',
   *           description: 'Search query string',
   *         },
   *       },
   *       required: ['query'],
   *     },
   *   }];
   * }
   * ```
   */
  getToolDefinitions(): ToolDefinition[];
}

/**
 * Definition of an MCP tool.
 *
 * Tools are the primary way for AI assistants to interact with the MCP server.
 * Each tool has a unique name, a description that helps the AI understand when
 * to use it, and a JSON Schema that defines the expected input format.
 *
 * @example
 * ```typescript
 * const definition: ToolDefinition = {
 *   name: 'get_agent_details',
 *   description: 'Get detailed profile of a specific AI agent',
 *   inputSchema: {
 *     type: 'object',
 *     properties: {
 *       agentName: {
 *         type: 'string',
 *         description: 'Name of the agent (e.g., "security-specialist")',
 *       },
 *     },
 *     required: ['agentName'],
 *   },
 * };
 * ```
 */
export interface ToolDefinition {
  /**
   * Unique identifier for the tool.
   * Should be snake_case and descriptive (e.g., 'search_rules', 'get_agent_details').
   */
  name: string;

  /**
   * Human-readable description of what the tool does.
   * This is shown to AI assistants to help them decide when to use the tool.
   * Should be clear, concise, and action-oriented.
   */
  description: string;

  /**
   * JSON Schema defining the expected input format.
   * Used for input validation and documentation.
   */
  inputSchema: {
    /**
     * Must always be 'object' for MCP tools
     */
    type: 'object';

    /**
     * Map of parameter names to their JSON Schema definitions.
     * Each property should include 'type' and optionally 'description'.
     */
    properties: Record<string, unknown>;

    /**
     * List of required parameter names.
     * Parameters not in this list are considered optional.
     */
    required?: string[];
  };
}

/**
 * Alias for ToolResponse for backward compatibility.
 *
 * @deprecated Use {@link ToolResponse} from '../response.utils' instead
 */
export type ToolResult = ToolResponse;
