import { describe, it, expect } from 'vitest';
import {
  parseImports,
  parseToolDefinitions,
  parseContextDecisions,
  buildModuleDependencyMap,
} from '../parsers';

describe('parseImports', () => {
  it('should extract relative import paths from TypeScript source', () => {
    const source = `
import { Injectable } from '@nestjs/common';
import { RulesService } from '../../rules/rules.service';
import { createJsonResponse } from '../response.utils';
import type { ToolDefinition } from './base.handler';
`;
    const result = parseImports(source);
    expect(result).toEqual([
      '../../rules/rules.service',
      '../response.utils',
      './base.handler',
    ]);
  });

  it('should handle dynamic imports', () => {
    const source = `const mod = await import('./dynamic-module');`;
    const result = parseImports(source);
    expect(result).toEqual(['./dynamic-module']);
  });

  it('should ignore external package imports', () => {
    const source = `
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { Injectable } from '@nestjs/common';
`;
    const result = parseImports(source);
    expect(result).toEqual([]);
  });

  it('should return empty array for source with no imports', () => {
    const source = `const x = 1;\nexport default x;`;
    const result = parseImports(source);
    expect(result).toEqual([]);
  });
});

describe('parseToolDefinitions', () => {
  it('should extract tool name and description from handler source', () => {
    const source = `
  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'search_rules',
        description: 'Search for rules and guidelines',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_agent_details',
        description: 'Get detailed profile of a specific AI agent',
        inputSchema: {
          type: 'object',
          properties: {
            agentName: { type: 'string' },
          },
          required: ['agentName'],
        },
      },
    ];
  }
`;
    const result = parseToolDefinitions(source);
    expect(result).toEqual([
      { name: 'search_rules', description: 'Search for rules and guidelines' },
      { name: 'get_agent_details', description: 'Get detailed profile of a specific AI agent' },
    ]);
  });

  it('should return empty array when no tool definitions found', () => {
    const source = `export class Foo { bar() {} }`;
    const result = parseToolDefinitions(source);
    expect(result).toEqual([]);
  });
});

describe('parseContextDecisions', () => {
  it('should extract decisions from context markdown', () => {
    const content = `---
title: Feature X
createdAt: 2026-03-20
---

## PLAN — 00:10

**Task:** Implement feature X

**Decisions:**
- Use Redis for caching
- Separate read/write models

**Notes:**
- Check existing cache layer

## ACT — 00:25

**Task:** Execute feature X

**Progress:**
- Implemented cache layer

**Decisions:**
- Switched to in-memory cache for simplicity
`;
    const result = parseContextDecisions(content);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      mode: 'PLAN',
      timestamp: '00:10',
      decision: 'Use Redis for caching',
    });
    expect(result[1]).toEqual({
      mode: 'PLAN',
      timestamp: '00:10',
      decision: 'Separate read/write models',
    });
    expect(result[2]).toEqual({
      mode: 'ACT',
      timestamp: '00:25',
      decision: 'Switched to in-memory cache for simplicity',
    });
  });

  it('should return empty array when no decisions found', () => {
    const content = `# Empty doc\nNo decisions here.`;
    const result = parseContextDecisions(content);
    expect(result).toEqual([]);
  });
});

describe('buildModuleDependencyMap', () => {
  it('should map file imports to module-level dependencies', () => {
    const fileImports: Record<string, string[]> = {
      'mcp/handlers/rules.handler.ts': ['../../rules/rules.service', '../response.utils'],
      'mcp/mcp.service.ts': ['../rules/rules.service', '../config/config.service'],
      'rules/rules.service.ts': ['../shared/file.utils'],
    };
    const result = buildModuleDependencyMap(fileImports);
    // mcp depends on rules, config, shared (via handlers and service)
    expect(result['mcp']).toContain('rules');
    expect(result['mcp']).toContain('config');
    expect(result['rules']).toContain('shared');
  });

  it('should exclude self-dependencies', () => {
    const fileImports: Record<string, string[]> = {
      'mcp/handlers/rules.handler.ts': ['../response.utils'],
    };
    const result = buildModuleDependencyMap(fileImports);
    // mcp -> mcp should not appear
    expect(result['mcp'] ?? []).not.toContain('mcp');
  });
});
