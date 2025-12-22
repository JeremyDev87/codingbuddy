import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Response, Request } from 'express';

// Hoist mock variables and class
const { mockHandlePostMessage, MockSSEServerTransport } = vi.hoisted(() => {
  const mockHandlePostMessage = vi.fn();

  class MockSSEServerTransport {
    constructor(
      public endpoint: string,
      public response: unknown,
    ) {}
    handlePostMessage = mockHandlePostMessage;
  }

  return { mockHandlePostMessage, MockSSEServerTransport };
});

vi.mock('@modelcontextprotocol/sdk/server/sse.js', () => ({
  SSEServerTransport: MockSSEServerTransport,
}));

// Import after mocks
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';

describe('McpController', () => {
  let controller: McpController;
  let mockMcpService: Partial<McpService>;
  let mockResponse: Partial<Response>;
  let mockRequest: Partial<Request>;
  let mockConnect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConnect = vi.fn().mockResolvedValue(undefined);
    mockMcpService = {
      getServer: vi.fn().mockReturnValue({
        connect: mockConnect,
      }),
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    mockRequest = {
      body: {},
      headers: {},
    };

    controller = new McpController(mockMcpService as McpService);
  });

  describe('handleSse', () => {
    it('should create SSEServerTransport with correct endpoint', async () => {
      await controller.handleSse(mockResponse as Response);

      // Access private transport via type assertion
      const transport = (
        controller as unknown as {
          transport: InstanceType<typeof MockSSEServerTransport>;
        }
      ).transport;
      expect(transport).toBeInstanceOf(MockSSEServerTransport);
      expect(transport.endpoint).toBe('/messages');
      expect(transport.response).toBe(mockResponse);
    });

    it('should connect transport to MCP server', async () => {
      await controller.handleSse(mockResponse as Response);

      expect(mockMcpService.getServer).toHaveBeenCalled();
      expect(mockConnect).toHaveBeenCalled();
    });

    it('should replace existing transport on new connection', async () => {
      // First connection
      await controller.handleSse(mockResponse as Response);
      const firstTransport = (
        controller as unknown as {
          transport: InstanceType<typeof MockSSEServerTransport>;
        }
      ).transport;

      // Second connection (should replace)
      const newMockResponse: Partial<Response> = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
      };
      await controller.handleSse(newMockResponse as Response);

      const secondTransport = (
        controller as unknown as {
          transport: InstanceType<typeof MockSSEServerTransport>;
        }
      ).transport;

      expect(secondTransport).not.toBe(firstTransport);
      expect(secondTransport.response).toBe(newMockResponse);
    });
  });

  describe('handleMessages', () => {
    it('should return 400 when no active SSE connection', async () => {
      // No SSE connection established
      await controller.handleMessages(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.send).toHaveBeenCalledWith(
        'No active SSE connection',
      );
    });

    it('should forward message to transport when connection exists', async () => {
      // First establish SSE connection
      await controller.handleSse(mockResponse as Response);

      // Then send message
      const messageRequest: Partial<Request> = {
        body: { method: 'tools/list' },
        headers: {},
      };
      const messageResponse: Partial<Response> = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
      };

      await controller.handleMessages(
        messageRequest as Request,
        messageResponse as Response,
      );

      expect(mockHandlePostMessage).toHaveBeenCalledWith(
        messageRequest,
        messageResponse,
      );
    });

    it('should use the latest transport after reconnection', async () => {
      // First connection
      await controller.handleSse(mockResponse as Response);

      // Reconnect
      const newSseResponse: Partial<Response> = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
      };
      await controller.handleSse(newSseResponse as Response);

      // Send message - should use the new transport
      const messageRequest: Partial<Request> = {
        body: { method: 'resources/list' },
        headers: {},
      };

      await controller.handleMessages(
        messageRequest as Request,
        mockResponse as Response,
      );

      expect(mockHandlePostMessage).toHaveBeenCalled();
    });

    it('should not call handlePostMessage when transport is null', async () => {
      await controller.handleMessages(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockHandlePostMessage).not.toHaveBeenCalled();
    });
  });
});
