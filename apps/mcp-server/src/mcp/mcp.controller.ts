import {
  Controller,
  Get,
  Post,
  Res,
  Req,
  Logger,
  OnModuleDestroy,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { McpService } from './mcp.service';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SseAuthGuard } from './sse-auth.guard';

/**
 * MCP Controller for SSE-based communication.
 *
 * @remarks
 * **IMPORTANT: Single-client SSE implementation for development/testing use.**
 *
 * This controller supports only ONE active client at a time. When a new client
 * connects, the previous connection is gracefully closed and replaced.
 *
 * **For production multi-client support:**
 * - Use stdio mode with a process manager (recommended)
 * - Or implement session-based connection tracking with a Map<sessionId, connection>
 *
 * **Security:** Each SSE connection gets its own Server instance to prevent
 * cross-client data leaks and state contamination.
 *
 * **Authentication:** Set the `MCP_SSE_TOKEN` environment variable to enable
 * Bearer token authentication on all SSE endpoints. If unset, no authentication
 * is required (backward compatible).
 */
@UseGuards(SseAuthGuard)
@Controller()
export class McpController implements OnModuleDestroy {
  private readonly logger = new Logger(McpController.name);

  /**
   * Current active connection with per-connection Server isolation.
   * Each SSE connection gets its own Server instance to prevent cross-client data leaks.
   */
  private connection: {
    server: Server;
    transport: SSEServerTransport;
  } | null = null;

  constructor(private mcpService: McpService) {}

  /**
   * Cleanup resources when module is destroyed (app shutdown).
   * Implements NestJS OnModuleDestroy lifecycle hook.
   */
  async onModuleDestroy(): Promise<void> {
    await this.closeCurrentConnection();
  }

  /**
   * Close current connection gracefully.
   * Called before creating new connection or on module destroy.
   *
   * @remarks
   * Errors during close are logged but not rethrown to prevent
   * cascading failures during cleanup.
   */
  private async closeCurrentConnection(): Promise<void> {
    if (this.connection) {
      try {
        await this.connection.server.close();
        this.logger.log('Previous SSE connection closed');
      } catch (error: unknown) {
        this.logger.warn(
          'Failed to close previous server connection',
          error instanceof Error ? error.stack : String(error),
        );
      }
      this.connection = null;
    }
  }

  /**
   * Handle SSE connection request.
   *
   * Creates a new per-connection Server instance for security isolation.
   * Any existing connection is gracefully closed before the new one is established.
   *
   * @param res - Express response object used for SSE streaming
   * @returns void - Sets up SSE connection or sends 500 on error
   *
   * @example
   * ```
   * GET /sse
   * ```
   */
  @Get('/sse')
  async handleSse(@Res() res: Response): Promise<void> {
    this.logger.log('New SSE connection request');

    try {
      // Cleanup previous connection before creating new one (memory leak prevention)
      await this.closeCurrentConnection();

      // Create per-connection Server instance for security isolation
      const server = this.mcpService.createServer();
      const transport = new SSEServerTransport('/messages', res);

      this.connection = { server, transport };
      await server.connect(transport);

      this.logger.log('SSE connection established');
    } catch (error: unknown) {
      this.logger.error(
        'Failed to establish SSE connection',
        error instanceof Error ? error.stack : String(error),
      );
      res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .send('Failed to establish SSE connection');
    }
  }

  /**
   * Handle MCP JSON-RPC messages over HTTP POST.
   *
   * Forwards incoming messages to the active SSE transport for processing.
   * Returns 400 if no active SSE connection exists.
   *
   * @param req - Express request object containing the JSON-RPC message
   * @param res - Express response object for the JSON-RPC response
   * @returns void - Forwards to transport or sends 400 error
   *
   * @example
   * ```
   * POST /messages
   * Content-Type: application/json
   *
   * {"jsonrpc": "2.0", "method": "tools/list", "id": 1}
   * ```
   */
  @Post('/messages')
  async handleMessages(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    if (!this.connection) {
      res.status(HttpStatus.BAD_REQUEST).send('No active SSE connection');
      return;
    }
    await this.connection.transport.handlePostMessage(req, res);
  }
}
