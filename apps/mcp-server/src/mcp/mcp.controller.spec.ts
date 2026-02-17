import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Response, Request } from 'express';

// Hoist mock variables and class
const { mockHandlePostMessage, mockServerClose, MockSSEServerTransport } = vi.hoisted(() => {
  const mockHandlePostMessage = vi.fn();
  const mockServerClose = vi.fn().mockResolvedValue(undefined);

  class MockSSEServerTransport {
    constructor(
      public endpoint: string,
      public response: unknown,
    ) {}
    handlePostMessage = mockHandlePostMessage;
  }

  return { mockHandlePostMessage, mockServerClose, MockSSEServerTransport };
});

vi.mock('@modelcontextprotocol/sdk/server/sse.js', () => ({
  SSEServerTransport: MockSSEServerTransport,
}));

// Import after mocks
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';
import { SseAuthGuard } from './sse-auth.guard';

/**
 * Type for accessing private connection property in tests.
 * Extracted to reduce code duplication in test assertions.
 */
type ConnectionAccessor = {
  connection: {
    server: unknown;
    transport: InstanceType<typeof MockSSEServerTransport>;
  } | null;
};

/**
 * Helper to access private connection property from controller.
 * Uses type assertion to access internal state for testing.
 *
 * @param ctrl - McpController instance
 * @returns The connection object or null
 */
const getConnection = (ctrl: McpController): ConnectionAccessor['connection'] =>
  (ctrl as unknown as ConnectionAccessor).connection;

/**
 * Helper to create a mock Response object for testing.
 *
 * @returns Partial<Response> with status and send mocked
 */
const createMockResponse = (): Partial<Response> => ({
  status: vi.fn().mockReturnThis(),
  send: vi.fn().mockReturnThis(),
});

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
        close: mockServerClose,
      }),
      // Return a NEW server instance on each call
      createServer: vi.fn().mockImplementation(() => ({
        connect: mockConnect,
        close: mockServerClose,
      })),
    };

    mockResponse = createMockResponse();

    mockRequest = {
      body: {},
      headers: {},
    };

    controller = new McpController(mockMcpService as McpService);
  });

  describe('handleSse', () => {
    it('should create SSEServerTransport with correct endpoint', async () => {
      await controller.handleSse(mockResponse as Response);

      const connection = getConnection(controller);
      expect(connection).toBeDefined();
      expect(connection!.transport).toBeInstanceOf(MockSSEServerTransport);
      expect(connection!.transport.endpoint).toBe('/messages');
      expect(connection!.transport.response).toBe(mockResponse);
    });

    it('should connect transport to MCP server', async () => {
      await controller.handleSse(mockResponse as Response);

      expect(mockMcpService.createServer).toHaveBeenCalled();
      expect(mockConnect).toHaveBeenCalled();
    });

    it('should replace existing transport on new connection', async () => {
      // First connection
      await controller.handleSse(mockResponse as Response);
      const firstConnection = getConnection(controller);

      // Second connection (should replace)
      const newMockResponse = createMockResponse();
      await controller.handleSse(newMockResponse as Response);

      const secondConnection = getConnection(controller);

      expect(secondConnection!.transport).not.toBe(firstConnection!.transport);
      expect(secondConnection!.transport.response).toBe(newMockResponse);
    });

    it('should close previous server before creating new connection', async () => {
      // First connection
      await controller.handleSse(mockResponse as Response);

      // Second connection - should close previous server first
      const newMockResponse = createMockResponse();
      await controller.handleSse(newMockResponse as Response);

      // server.close() should have been called once (for the first connection)
      expect(mockServerClose).toHaveBeenCalledTimes(1);
    });

    it('should handle server.close() error gracefully', async () => {
      // Make close throw an error
      mockServerClose.mockRejectedValueOnce(new Error('Close failed'));

      // First connection
      await controller.handleSse(mockResponse as Response);

      // Second connection - should handle close error gracefully
      const newMockResponse = createMockResponse();

      // Should not throw even if close fails
      await expect(controller.handleSse(newMockResponse as Response)).resolves.not.toThrow();

      // New connection should still be established
      expect(mockMcpService.createServer).toHaveBeenCalledTimes(2);
    });

    it('should return 500 when server creation fails', async () => {
      // Make createServer throw an error
      (mockMcpService.createServer as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
        throw new Error('Server creation failed');
      });

      await controller.handleSse(mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.send).toHaveBeenCalledWith('Failed to establish SSE connection');
    });

    it('should return 500 when server.connect fails', async () => {
      // Make connect throw an error
      mockConnect.mockRejectedValueOnce(new Error('Connection failed'));

      await controller.handleSse(mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.send).toHaveBeenCalledWith('Failed to establish SSE connection');
    });
  });

  describe('handleMessages', () => {
    it('should return 400 when no active SSE connection', async () => {
      // No SSE connection established
      await controller.handleMessages(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.send).toHaveBeenCalledWith('No active SSE connection');
    });

    it('should forward message to transport when connection exists', async () => {
      // First establish SSE connection
      await controller.handleSse(mockResponse as Response);

      // Then send message
      const messageRequest: Partial<Request> = {
        body: { method: 'tools/list' },
        headers: {},
      };
      const messageResponse = createMockResponse();

      await controller.handleMessages(messageRequest as Request, messageResponse as Response);

      expect(mockHandlePostMessage).toHaveBeenCalledWith(messageRequest, messageResponse);
    });

    it('should use the latest transport after reconnection', async () => {
      // First connection
      await controller.handleSse(mockResponse as Response);

      // Reconnect
      const newSseResponse = createMockResponse();
      await controller.handleSse(newSseResponse as Response);

      // Send message - should use the new transport
      const messageRequest: Partial<Request> = {
        body: { method: 'resources/list' },
        headers: {},
      };

      await controller.handleMessages(messageRequest as Request, mockResponse as Response);

      expect(mockHandlePostMessage).toHaveBeenCalled();
    });

    it('should not call handlePostMessage when transport is null', async () => {
      await controller.handleMessages(mockRequest as Request, mockResponse as Response);

      expect(mockHandlePostMessage).not.toHaveBeenCalled();
    });
  });

  describe('Security: Server instance isolation', () => {
    it('should NOT reuse the same Server instance for multiple connections', async () => {
      // This test verifies the security fix: each connection gets its own Server instance

      // First connection
      await controller.handleSse(mockResponse as Response);
      const firstServer = (mockMcpService.createServer as ReturnType<typeof vi.fn>).mock.results[0]
        .value;

      // Second connection
      const newMockResponse = createMockResponse();
      await controller.handleSse(newMockResponse as Response);
      const secondServer = (mockMcpService.createServer as ReturnType<typeof vi.fn>).mock.results[1]
        .value;

      // After fix: servers should be DIFFERENT instances (per-connection)
      expect(secondServer).not.toBe(firstServer);

      // Both connections should have called createServer()
      expect(mockMcpService.createServer).toHaveBeenCalledTimes(2);
    });

    it('should isolate transport instances between connections', async () => {
      // First connection
      await controller.handleSse(mockResponse as Response);
      const firstConnection = getConnection(controller);

      // Second connection
      const newMockResponse = createMockResponse();
      await controller.handleSse(newMockResponse as Response);
      const secondConnection = getConnection(controller);

      // Transports should be different instances
      expect(secondConnection!.transport).not.toBe(firstConnection!.transport);
      expect(secondConnection!.transport.response).toBe(newMockResponse);
    });
  });

  describe('Resource cleanup', () => {
    it('should close connection on module destroy', async () => {
      // Establish connection
      await controller.handleSse(mockResponse as Response);

      // Trigger module destroy
      await controller.onModuleDestroy();

      // Server should be closed
      expect(mockServerClose).toHaveBeenCalledTimes(1);

      // Connection should be null
      const connection = getConnection(controller);
      expect(connection).toBeNull();
    });

    it('should handle module destroy when no connection exists', async () => {
      // No connection established, should not throw
      await expect(controller.onModuleDestroy()).resolves.not.toThrow();

      // close should not have been called
      expect(mockServerClose).not.toHaveBeenCalled();
    });

    it('should handle close error on module destroy gracefully', async () => {
      // Establish connection
      await controller.handleSse(mockResponse as Response);

      // Make close throw an error
      mockServerClose.mockRejectedValueOnce(new Error('Close failed'));

      // Should not throw
      await expect(controller.onModuleDestroy()).resolves.not.toThrow();
    });
  });

  describe('Security: SseAuthGuard applied', () => {
    it('should have UseGuards decorator with SseAuthGuard', () => {
      const guards = Reflect.getMetadata('__guards__', McpController);
      expect(guards).toBeDefined();
      expect(guards).toContain(SseAuthGuard);
    });
  });
});
