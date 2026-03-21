/**
 * MCP Tool Implementation Example
 *
 * Demonstrates a complete Tool handler following the MCP specification.
 * Tools are functions the AI can call that may have side effects.
 *
 * Key patterns:
 * - Schema-first design with JSON Schema validation
 * - Structured error responses with isError flag
 * - Input validation before processing
 * - NestJS injectable service pattern
 */

import { Injectable } from '@nestjs/common';

// --- 1. Define the Tool Schema (JSON Schema) ---

export const fileAnalyzerToolSchema = {
  name: 'analyze_file',
  description:
    'Analyze a source file for code quality metrics including complexity, ' +
    'line count, and dependency analysis. Use when reviewing code quality ' +
    'or planning refactoring.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      filePath: {
        type: 'string',
        description: 'Relative path to the file from project root (e.g., "src/utils/parser.ts")',
        minLength: 1,
        maxLength: 500,
      },
      metrics: {
        type: 'array',
        description: 'Specific metrics to analyze (default: all)',
        items: {
          type: 'string',
          enum: ['complexity', 'lines', 'dependencies', 'exports'],
        },
        default: ['complexity', 'lines', 'dependencies', 'exports'],
      },
      includeSource: {
        type: 'boolean',
        description: 'Whether to include the source code in the response (default: false)',
        default: false,
      },
    },
    required: ['filePath'],
  },
};

// --- 2. Define Result Types ---

interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

interface FileAnalysis {
  filePath: string;
  lineCount: number;
  complexity: number;
  dependencies: string[];
  exports: string[];
}

// --- 3. Implement the Tool Handler ---

@Injectable()
export class FileAnalyzerHandler {
  constructor(private readonly fileService: FileService) {}

  async handle(params: {
    filePath: string;
    metrics?: string[];
    includeSource?: boolean;
  }): Promise<ToolResult> {
    // Step 1: Validate input
    if (!params.filePath?.trim()) {
      return this.errorResult('filePath is required and cannot be empty');
    }

    if (params.filePath.includes('..')) {
      return this.errorResult('filePath cannot contain path traversal (..)');
    }

    // Step 2: Check file exists
    const exists = await this.fileService.exists(params.filePath);
    if (!exists) {
      return this.errorResult(`File not found: ${params.filePath}`);
    }

    // Step 3: Perform analysis
    try {
      const analysis = await this.analyze(params.filePath, params.metrics);
      const output = this.formatAnalysis(analysis, params.includeSource);

      return {
        content: [{ type: 'text', text: output }],
      };
    } catch (error) {
      return this.errorResult(
        `Analysis failed for ${params.filePath}: ${(error as Error).message}`,
      );
    }
  }

  private async analyze(
    filePath: string,
    metrics?: string[],
  ): Promise<FileAnalysis> {
    const content = await this.fileService.read(filePath);
    const lines = content.split('\n');
    const selected = new Set(metrics ?? ['complexity', 'lines', 'dependencies', 'exports']);

    return {
      filePath,
      lineCount: selected.has('lines') ? lines.length : -1,
      complexity: selected.has('complexity') ? this.calculateComplexity(lines) : -1,
      dependencies: selected.has('dependencies') ? this.extractDependencies(lines) : [],
      exports: selected.has('exports') ? this.extractExports(lines) : [],
    };
  }

  private calculateComplexity(lines: string[]): number {
    const complexityKeywords = /\b(if|else|for|while|switch|case|catch|&&|\|\||\?)\b/g;
    return lines.reduce((sum, line) => {
      const matches = line.match(complexityKeywords);
      return sum + (matches?.length ?? 0);
    }, 1); // Base complexity of 1
  }

  private extractDependencies(lines: string[]): string[] {
    const importPattern = /^import\s+.*from\s+['"]([^'"]+)['"]/;
    return lines
      .map((line) => line.match(importPattern)?.[1])
      .filter((dep): dep is string => dep !== undefined);
  }

  private extractExports(lines: string[]): string[] {
    const exportPattern = /^export\s+(?:default\s+)?(?:class|function|const|interface|type|enum)\s+(\w+)/;
    return lines
      .map((line) => line.match(exportPattern)?.[1])
      .filter((name): name is string => name !== undefined);
  }

  private formatAnalysis(analysis: FileAnalysis, includeSource?: boolean): string {
    const sections: string[] = [
      `## File Analysis: ${analysis.filePath}`,
      '',
    ];

    if (analysis.lineCount >= 0) {
      sections.push(`**Lines:** ${analysis.lineCount}`);
    }
    if (analysis.complexity >= 0) {
      sections.push(`**Cyclomatic Complexity:** ${analysis.complexity}`);
    }
    if (analysis.dependencies.length > 0) {
      sections.push('', '**Dependencies:**');
      analysis.dependencies.forEach((dep) => sections.push(`- \`${dep}\``));
    }
    if (analysis.exports.length > 0) {
      sections.push('', '**Exports:**');
      analysis.exports.forEach((exp) => sections.push(`- \`${exp}\``));
    }

    return sections.join('\n');
  }

  private errorResult(message: string): ToolResult {
    return {
      content: [{ type: 'text', text: `Error: ${message}` }],
      isError: true,
    };
  }
}

// --- 4. Register in MCP Service ---

/*
// In mcp.service.ts:
import { fileAnalyzerToolSchema, FileAnalyzerHandler } from './tools/file-analyzer';

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [fileAnalyzerToolSchema],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case 'analyze_file':
      return this.fileAnalyzerHandler.handle(request.params.arguments);
    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
  }
});
*/

// Placeholder for dependency injection
interface FileService {
  exists(path: string): Promise<boolean>;
  read(path: string): Promise<string>;
}
