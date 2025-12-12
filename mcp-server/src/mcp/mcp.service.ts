import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    ListResourcesRequestSchema,
    ReadResourceRequestSchema,
    ListToolsRequestSchema,
    CallToolRequestSchema,
    ListPromptsRequestSchema,
    GetPromptRequestSchema,
    ErrorCode,
    McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { RulesService } from '../rules/rules.service';

@Injectable()
export class McpService implements OnModuleInit {
    private server: Server;
    private readonly logger = new Logger(McpService.name);

    constructor(private rulesService: RulesService) {
        this.server = new Server(
            {
                name: 'codebuddy-rules-server',
                version: '1.0.0',
            },
            {
                capabilities: {
                    resources: {},
                    tools: {},
                    prompts: {},
                },
            },
        );
    }

    onModuleInit() {
        this.registerResources();
        this.registerTools();
        this.registerPrompts();
    }

    async startStdio() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        this.logger.log('MCP Server connected via Stdio');
    }

    getServer() {
        return this.server;
    }

    private registerResources() {
        this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
            const agents = await this.rulesService.listAgents();
            const coreRules = ['rules/core.md', 'rules/project.md', 'rules/augmented-coding.md'];

            return {
                resources: [
                    ...coreRules.map(rule => ({
                        uri: `rules://${rule}`,
                        name: rule,
                        mimeType: "text/markdown",
                        description: `Core rule file: ${rule}`
                    })),
                    ...agents.map(agent => ({
                        uri: `rules://agents/${agent}.json`,
                        name: `Agent: ${agent}`,
                        mimeType: "application/json",
                        description: `Agent definition for ${agent}`
                    }))
                ]
            };
        });

        this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
            const uri = request.params.uri;
            if (!uri.startsWith("rules://")) {
                throw new McpError(ErrorCode.InvalidRequest, "Invalid URI scheme");
            }

            const relativePath = uri.replace("rules://", "");
            try {
                const content = await this.rulesService.getRuleContent(relativePath);
                return {
                    contents: [{
                        uri: uri,
                        mimeType: relativePath.endsWith(".json") ? "application/json" : "text/markdown",
                        text: content
                    }]
                };
            } catch (error) {
                throw new McpError(ErrorCode.InvalidRequest, `Resource not found: ${uri}`);
            }
        });
    }

    private registerTools() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: "search_rules",
                        description: "Search for rules and guidelines",
                        inputSchema: {
                            type: "object",
                            properties: {
                                query: { type: "string", description: "Search query" }
                            },
                            required: ["query"]
                        }
                    },
                    {
                        name: "get_agent_details",
                        description: "Get detailed profile of a specific AI agent",
                        inputSchema: {
                            type: "object",
                            properties: {
                                agentName: { type: "string", description: "Name of the agent" }
                            },
                            required: ["agentName"]
                        }
                    }
                ]
            };
        });

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;

            if (name === "search_rules") {
                const query = String(args?.query);
                const results = await this.rulesService.searchRules(query);
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(results, null, 2)
                    }]
                };
            }

            if (name === "get_agent_details") {
                const agentName = String(args?.agentName);
                try {
                    const agent = await this.rulesService.getAgent(agentName);
                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify(agent, null, 2)
                        }]
                    };
                } catch (error) {
                    return {
                        isError: true,
                        content: [{ type: "text", text: `Agent '${agentName}' not found.` }]
                    };
                }
            }

            throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${name}`);
        });
    }

    private registerPrompts() {
        this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
            return {
                prompts: [
                    {
                        name: "activate_agent",
                        description: "Activate a specific specialist agent with context",
                        arguments: [
                            { name: "role", description: "Role name (e.g. frontend-developer)", required: true }
                        ]
                    }
                ]
            };
        });

        this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
            if (request.params.name === "activate_agent") {
                const role = String(request.params.arguments?.role);
                try {
                    const agent = await this.rulesService.getAgent(role);
                    const coreRules = await this.rulesService.getRuleContent('rules/core.md');

                    return {
                        messages: [
                            {
                                role: "user",
                                content: {
                                    type: "text",
                                    text: `Activate Agent: ${agent.name}\n\nRole: ${agent.role}\n\nGoals:\n${agent.goals.join('\n')}\n\nWorkflow:\n${agent.workflow.join('\n')}\n\nCore Rules Context:\n${coreRules.substring(0, 1000)}... (truncated)`
                                }
                            }
                        ]
                    };
                } catch (error) {
                    throw new McpError(ErrorCode.InvalidRequest, `Agent '${role}' not found.`);
                }
            }
            throw new McpError(ErrorCode.MethodNotFound, "Prompt not found");
        });
    }
}
