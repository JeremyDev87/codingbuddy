import { describe, it, expect, beforeEach } from 'vitest';
import * as path from 'path';
import { McpServerlessService } from './mcp-serverless';

// ============================================================================
// Test Fixtures
// ============================================================================

const TEST_RULES_DIR = path.resolve(
  __dirname,
  '../../../../packages/rules/.ai-rules',
);

const TEST_PROJECT_ROOT = path.resolve(__dirname, '../../../../');

// ============================================================================
// Test Suite
// ============================================================================

describe('McpServerlessService', () => {
  let service: McpServerlessService;

  beforeEach(() => {
    service = new McpServerlessService(TEST_RULES_DIR, TEST_PROJECT_ROOT);
  });

  // ==========================================================================
  // Construction Tests
  // ==========================================================================

  describe('constructor', () => {
    it('should create MCP server instance', () => {
      expect(service).toBeDefined();
      expect(service.getServer()).toBeDefined();
    });

    it('should accept custom rulesDir and projectRoot', () => {
      const customService = new McpServerlessService(
        '/custom/rules',
        '/custom/project',
      );
      expect(customService.getServer()).toBeDefined();
    });

    it('should use default paths when not provided', () => {
      const defaultService = new McpServerlessService();
      expect(defaultService.getServer()).toBeDefined();
    });
  });

  // ==========================================================================
  // Public Method Tests
  // ==========================================================================

  describe('setRulesDir', () => {
    it('should update rules directory', () => {
      const newDir = '/new/rules/dir';
      service.setRulesDir(newDir);
      // The service should accept the new directory
      expect(service.getServer()).toBeDefined();
    });
  });

  describe('setProjectRoot', () => {
    it('should update project root', () => {
      const newRoot = '/new/project/root';
      service.setProjectRoot(newRoot);
      // The service should accept the new root
      expect(service.getServer()).toBeDefined();
    });
  });

  // ==========================================================================
  // Tool Handler Tests (via direct invocation through server)
  // ==========================================================================

  describe('search_rules tool', () => {
    it('should search rules and return results', async () => {
      // Access the internal handler through reflection for testing
      const result = await invokeToolHandler(service, 'searchRules', 'TDD');
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const data = JSON.parse(result.content[0].text);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should return empty array for non-matching query', async () => {
      const result = await invokeToolHandler(
        service,
        'searchRules',
        'xyznonexistentquery123',
      );
      const data = JSON.parse(result.content[0].text);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0);
    });

    it('should return results sorted by score', async () => {
      const result = await invokeToolHandler(service, 'searchRules', 'code');
      const data = JSON.parse(result.content[0].text);

      if (data.length > 1) {
        // Verify results are sorted by score (descending)
        for (let i = 0; i < data.length - 1; i++) {
          expect(data[i].score).toBeGreaterThanOrEqual(data[i + 1].score);
        }
      }
    });
  });

  describe('get_agent_details tool', () => {
    it('should return agent details for valid agent', async () => {
      const result = await invokeToolHandler(
        service,
        'getAgentDetails',
        'frontend-developer',
      );
      expect(result.isError).toBeUndefined();

      const agent = JSON.parse(result.content[0].text);
      // Agent JSON has a nested structure
      expect(agent.name).toBeDefined();
      expect(agent.role).toBeDefined();
      // The role is an object containing title and expertise
      expect(agent.role.title).toBeDefined();
      expect(agent.role.expertise).toBeDefined();
    });

    it('should return error for non-existent agent', async () => {
      const result = await invokeToolHandler(
        service,
        'getAgentDetails',
        'nonexistent-agent',
      );
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not found');
    });
  });

  describe('parse_mode tool', () => {
    it('should parse PLAN mode', async () => {
      const result = await invokeToolHandler(
        service,
        'parseMode',
        'PLAN design the authentication flow',
      );
      const data = JSON.parse(result.content[0].text);

      expect(data.mode).toBe('PLAN');
      expect(data.originalPrompt).toBe('design the authentication flow');
      expect(data.instructions).toBeDefined();
      expect(Array.isArray(data.rules)).toBe(true);
    });

    it('should parse ACT mode', async () => {
      const result = await invokeToolHandler(
        service,
        'parseMode',
        'ACT implement the login function',
      );
      const data = JSON.parse(result.content[0].text);

      expect(data.mode).toBe('ACT');
      expect(data.originalPrompt).toBe('implement the login function');
    });

    it('should parse EVAL mode', async () => {
      const result = await invokeToolHandler(
        service,
        'parseMode',
        'EVAL review the code quality',
      );
      const data = JSON.parse(result.content[0].text);

      expect(data.mode).toBe('EVAL');
      expect(data.originalPrompt).toBe('review the code quality');
    });

    it('should default to PLAN for no keyword', async () => {
      const result = await invokeToolHandler(
        service,
        'parseMode',
        'do something without keyword',
      );
      const data = JSON.parse(result.content[0].text);

      expect(data.mode).toBe('PLAN');
      expect(data.warnings).toContain('No keyword found, defaulting to PLAN');
    });

    it('should handle case-insensitive keywords', async () => {
      const result = await invokeToolHandler(
        service,
        'parseMode',
        'plan lowercase keyword',
      );
      const data = JSON.parse(result.content[0].text);

      expect(data.mode).toBe('PLAN');
    });

    it('should warn about multiple keywords', async () => {
      const result = await invokeToolHandler(
        service,
        'parseMode',
        'PLAN ACT something',
      );
      const data = JSON.parse(result.content[0].text);

      expect(data.mode).toBe('PLAN');
      expect(data.warnings).toContain('Multiple keywords found, using first');
    });

    it('should warn about empty content after keyword', async () => {
      const result = await invokeToolHandler(service, 'parseMode', 'PLAN');
      const data = JSON.parse(result.content[0].text);

      expect(data.mode).toBe('PLAN');
      expect(data.warnings).toContain('No prompt content after keyword');
    });
  });

  describe('get_project_config tool', () => {
    it('should return project configuration', async () => {
      const result = await invokeToolHandler(service, 'getProjectConfig');
      expect(result.isError).toBeUndefined();

      const data = JSON.parse(result.content[0].text);
      // Config can be empty or have values
      expect(typeof data).toBe('object');
    });
  });

  describe('suggest_config_updates tool', () => {
    it('should analyze project and return suggestions', async () => {
      const result = await invokeToolHandler(
        service,
        'suggestConfigUpdates',
        TEST_PROJECT_ROOT,
      );
      expect(result.isError).toBeUndefined();

      const data = JSON.parse(result.content[0].text);
      expect(data.detectedStack).toBeDefined();
      expect(Array.isArray(data.detectedStack)).toBe(true);
      expect(data.suggestions).toBeDefined();
      expect(typeof data.needsUpdate).toBe('boolean');
    });

    it('should detect common frameworks from package.json', async () => {
      // Use the mcp-server directory which has the actual package.json with NestJS
      const mcpServerRoot = path.resolve(__dirname, '../../');
      const result = await invokeToolHandler(
        service,
        'suggestConfigUpdates',
        mcpServerRoot,
      );
      const data = JSON.parse(result.content[0].text);

      // The mcp-server project should have NestJS detected
      expect(data.detectedStack).toContain('NestJS');
    });

    it('should handle missing package.json gracefully', async () => {
      const result = await invokeToolHandler(
        service,
        'suggestConfigUpdates',
        '/nonexistent/path',
      );
      const data = JSON.parse(result.content[0].text);

      expect(data.detectedStack).toEqual([]);
    });
  });

  // ==========================================================================
  // Path Traversal Protection Tests
  // ==========================================================================

  describe('path traversal protection', () => {
    it('should reject path traversal with ../', async () => {
      const result = await invokeToolHandler(
        service,
        'getAgentDetails',
        '../../../etc/passwd',
      );
      expect(result.isError).toBe(true);
      // Blocked by either input validation or path safety check
    });

    it('should reject hidden path traversal', async () => {
      const result = await invokeToolHandler(
        service,
        'getAgentDetails',
        'frontend-developer/../../secret',
      );
      expect(result.isError).toBe(true);
      // Blocked by either input validation or path safety check
    });

    it('should reject absolute paths', async () => {
      const result = await invokeToolHandler(
        service,
        'getAgentDetails',
        '/etc/passwd',
      );
      expect(result.isError).toBe(true);
      // Blocked by either input validation or path safety check
    });

    it('should reject Windows-style path traversal', async () => {
      const result = await invokeToolHandler(
        service,
        'getAgentDetails',
        '..\\..\\etc\\passwd',
      );
      expect(result.isError).toBe(true);
      // Blocked by either input validation or path safety check
    });

    it('should reject null byte injection', async () => {
      const result = await invokeToolHandler(
        service,
        'getAgentDetails',
        'frontend-developer\x00.txt',
      );
      expect(result.isError).toBe(true);
      // Blocked by either input validation or path safety check
    });

    it('should allow valid agent names', async () => {
      const result = await invokeToolHandler(
        service,
        'getAgentDetails',
        'frontend-developer',
      );
      expect(result.isError).toBeUndefined();
    });
  });

  // ==========================================================================
  // Input Validation Tests
  // ==========================================================================

  describe('input validation', () => {
    describe('search_rules', () => {
      it('should reject empty query', async () => {
        const result = await invokeToolHandler(service, 'searchRules', '');
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('empty');
      });

      it('should reject query exceeding max length', async () => {
        const longQuery = 'a'.repeat(1001);
        const result = await invokeToolHandler(
          service,
          'searchRules',
          longQuery,
        );
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('maximum length');
      });
    });

    describe('get_agent_details', () => {
      it('should reject agent name with uppercase', async () => {
        const result = await invokeToolHandler(
          service,
          'getAgentDetails',
          'Frontend-Developer',
        );
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('lowercase');
      });

      it('should reject agent name with special characters', async () => {
        const result = await invokeToolHandler(
          service,
          'getAgentDetails',
          'frontend_developer',
        );
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('lowercase');
      });

      it('should reject empty agent name', async () => {
        const result = await invokeToolHandler(service, 'getAgentDetails', '');
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('empty');
      });
    });

    describe('parse_mode', () => {
      it('should reject empty prompt', async () => {
        const result = await invokeToolHandler(service, 'parseMode', '');
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('empty');
      });

      it('should reject prompt exceeding max length', async () => {
        const longPrompt = 'a'.repeat(10001);
        const result = await invokeToolHandler(
          service,
          'parseMode',
          longPrompt,
        );
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('maximum length');
      });
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('error handling', () => {
    it('should return error response for invalid agent', async () => {
      const result = await invokeToolHandler(
        service,
        'getAgentDetails',
        'invalid-agent-name',
      );
      expect(result.isError).toBe(true);
    });

    it('should handle file system errors gracefully', async () => {
      // Create service with invalid rules directory
      const invalidService = new McpServerlessService(
        '/nonexistent/rules/dir',
        TEST_PROJECT_ROOT,
      );

      const result = await invokeToolHandler(
        invalidService,
        'searchRules',
        'test',
      );
      // Should return empty results, not throw
      const data = JSON.parse(result.content[0].text);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should sanitize error messages (not expose internal paths)', async () => {
      // Create service with path that will cause file system error
      const invalidService = new McpServerlessService(
        '/Users/secret/path/that/does/not/exist',
        TEST_PROJECT_ROOT,
      );

      const result = await invokeToolHandler(
        invalidService,
        'getAgentDetails',
        'test-agent',
      );

      // Error should be returned but not contain internal paths
      expect(result.isError).toBe(true);
      expect(result.content[0].text).not.toContain('/Users/secret');
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('integration', () => {
    it('should load rules for parsed mode', async () => {
      const result = await invokeToolHandler(
        service,
        'parseMode',
        'ACT implement feature',
      );
      const data = JSON.parse(result.content[0].text);

      // ACT mode should include all three rule files
      expect(data.rules.length).toBeGreaterThan(0);

      // Each rule should have name and content
      for (const rule of data.rules) {
        expect(rule.name).toBeDefined();
        expect(rule.content).toBeDefined();
        expect(typeof rule.content).toBe('string');
      }
    });

    it('should search across all rule files and agents', async () => {
      const result = await invokeToolHandler(
        service,
        'searchRules',
        'workflow',
      );
      const data = JSON.parse(result.content[0].text);

      // Should find matches in multiple files
      expect(data.length).toBeGreaterThan(0);

      // Each result should have file, matches, and score
      for (const item of data) {
        expect(item.file).toBeDefined();
        expect(Array.isArray(item.matches)).toBe(true);
        expect(typeof item.score).toBe('number');
      }
    });
  });
});

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Helper to invoke tool handlers directly for testing
 */
async function invokeToolHandler(
  service: McpServerlessService,
  handlerName: string,
  ...args: unknown[]
): Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}> {
  // Access private methods through reflection
  const privateService = service as unknown as Record<
    string,
    (...args: unknown[]) => Promise<unknown>
  >;

  const methodMap: Record<string, string> = {
    searchRules: 'handleSearchRules',
    getAgentDetails: 'handleGetAgentDetails',
    parseMode: 'handleParseMode',
    getProjectConfig: 'handleGetProjectConfig',
    suggestConfigUpdates: 'handleSuggestConfigUpdates',
  };

  const methodName = methodMap[handlerName];
  if (!methodName) {
    throw new Error(`Unknown handler: ${handlerName}`);
  }

  const method = privateService[methodName].bind(service);
  return (await method(...args)) as {
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  };
}
