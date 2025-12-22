import { Controller, Get, Post, Res, Req } from '@nestjs/common';
import { Response, Request } from 'express';
import { McpService } from './mcp.service';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

@Controller()
export class McpController {
  // Single-client SSE implementation. New connections replace existing ones.
  // For multi-client support, implement session-based transport management.
  private transport: SSEServerTransport | null = null;

  constructor(private mcpService: McpService) {}

  @Get('/sse')
  async handleSse(@Res() res: Response) {
    console.log('New SSE connection request');
    this.transport = new SSEServerTransport('/messages', res);
    await this.mcpService.getServer().connect(this.transport);
  }

  @Post('/messages')
  async handleMessages(@Req() req: Request, @Res() res: Response) {
    if (!this.transport) {
      res.status(400).send('No active SSE connection');
      return;
    }
    await this.transport.handlePostMessage(req, res);
  }
}
