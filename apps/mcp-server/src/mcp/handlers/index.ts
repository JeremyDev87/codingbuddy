/**
 * MCP Tool Handlers Module
 *
 * This module exports all tool handlers and related types for the MCP server.
 * Handlers follow the Chain of Responsibility pattern and are responsible for
 * processing tool calls within their domain.
 *
 * @module handlers
 *
 * @example
 * ```typescript
 * // Import handler types
 * import type { ToolHandler, ToolDefinition } from './handlers';
 *
 * // Import specific handlers
 * import { RulesHandler, TOOL_HANDLERS } from './handlers';
 *
 * // Use in NestJS module
 * @Module({
 *   providers: [
 *     RulesHandler,
 *     ConfigHandler,
 *     {
 *       provide: TOOL_HANDLERS,
 *       useFactory: (...handlers) => handlers,
 *       inject: [RulesHandler, ConfigHandler],
 *     },
 *   ],
 * })
 * export class McpModule {}
 * ```
 */

// Base types
export type { ToolHandler, ToolDefinition, ToolResult } from './base.handler';

// Handlers
/**
 * Handler for rules-related tools (search_rules, get_agent_details)
 * @see {@link RulesHandler}
 */
export { RulesHandler } from './rules.handler';

/**
 * Handler for configuration tools (get_project_config, suggest_config_updates)
 * @see {@link ConfigHandler}
 */
export { ConfigHandler } from './config.handler';

/**
 * Handler for skill tools (recommend_skills, list_skills)
 * @see {@link SkillHandler}
 */
export { SkillHandler } from './skill.handler';

/**
 * Handler for agent tools (get_agent_system_prompt, prepare_parallel_agents)
 * @see {@link AgentHandler}
 */
export { AgentHandler } from './agent.handler';

/**
 * Handler for mode-related tools (parse_mode)
 * @see {@link ModeHandler}
 */
export { ModeHandler } from './mode.handler';

/**
 * Handler for checklist and context tools (generate_checklist, analyze_task)
 * @see {@link ChecklistContextHandler}
 */
export { ChecklistContextHandler } from './checklist-context.handler';

/**
 * Injection token for the array of all tool handlers.
 *
 * Use this token to inject all handlers into a service that needs to
 * dispatch tool calls to the appropriate handler.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class McpService {
 *   constructor(
 *     @Inject(TOOL_HANDLERS) private handlers: ToolHandler[],
 *   ) {}
 *
 *   async handleToolCall(name: string, args: unknown) {
 *     for (const handler of this.handlers) {
 *       const result = await handler.handle(name, args);
 *       if (result !== null) return result;
 *     }
 *     throw new Error(`Unknown tool: ${name}`);
 *   }
 * }
 * ```
 */
export const TOOL_HANDLERS = 'TOOL_HANDLERS';
