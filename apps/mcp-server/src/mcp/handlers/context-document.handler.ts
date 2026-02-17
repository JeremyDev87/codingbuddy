import { Injectable } from '@nestjs/common';
import type { ToolDefinition } from './base.handler';
import type { ToolResponse } from '../response.utils';
import { AbstractHandler } from './abstract-handler';
import { ContextDocumentService } from '../../context/context-document.service';
import { createJsonResponse, createErrorResponse } from '../response.utils';
import { extractRequiredString, extractOptionalString } from '../../shared/validation.constants';
import { CONTEXT_FILE_PATH } from '../../context/context-document.types';
import type { Mode } from '../../keyword/keyword.types';
import { isValidVerbosity, getVerbosityConfig } from '../../shared/verbosity.types';

/**
 * Handler for context document tools.
 *
 * Tools:
 * - read_context: Read the current context document
 * - update_context: Update context (PLAN resets, ACT/EVAL appends)
 *
 * These replace the session tools (create_session, update_session, get_session)
 * with a simpler, mandatory approach using a fixed file path.
 */
@Injectable()
export class ContextDocumentHandler extends AbstractHandler {
  constructor(private readonly contextDocService: ContextDocumentService) {
    super();
  }

  protected getHandledTools(): string[] {
    return ['read_context', 'update_context', 'cleanup_context'];
  }

  protected async handleTool(
    toolName: string,
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    switch (toolName) {
      case 'read_context':
        return this.handleReadContext(args);
      case 'update_context':
        return this.handleUpdateContext(args);
      case 'cleanup_context':
        return this.handleCleanupContext(args);
      default:
        return createErrorResponse(`Unknown tool: ${toolName}`);
    }
  }

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'read_context',
        description: `Read the current context document from ${CONTEXT_FILE_PATH}. Returns all accumulated context from PLAN/ACT/EVAL modes including decisions, notes, and recommended agents. Supports verbosity levels for controlling returned data size.`,
        inputSchema: {
          type: 'object',
          properties: {
            verbosity: {
              type: 'string',
              enum: ['minimal', 'standard', 'full'],
              description:
                'Control response size: minimal (most recent section only), standard (2 most recent), full (all sections). Default: standard',
            },
          },
          required: [],
        },
      },
      {
        name: 'update_context',
        description: `MANDATORY: Update the context document at ${CONTEXT_FILE_PATH}.
- PLAN mode: Resets (clears) existing content and starts fresh.
- ACT/EVAL modes: Appends new section to existing content (requires PLAN first).
- Automatic cleanup: If document exceeds size threshold, older sections are automatically summarized.
Call this at the end of each mode to persist decisions and notes.`,
        inputSchema: {
          type: 'object',
          properties: {
            mode: {
              type: 'string',
              enum: ['PLAN', 'ACT', 'EVAL', 'AUTO'],
              description: 'Current workflow mode. PLAN resets document, others append.',
            },
            title: {
              type: 'string',
              description: 'Task title (required for PLAN mode, ignored for others)',
            },
            task: {
              type: 'string',
              description: 'Task description or summary of work done',
            },
            primaryAgent: {
              type: 'string',
              description: 'Primary agent used in this mode',
            },
            recommendedActAgent: {
              type: 'string',
              description: 'Agent recommended for ACT phase (PLAN/EVAL mode)',
            },
            recommendedActAgentConfidence: {
              type: 'number',
              description: 'Confidence score for recommendation (0-1)',
            },
            decisions: {
              type: 'array',
              items: { type: 'string' },
              description: 'Key decisions made (appended to existing)',
            },
            notes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Implementation notes (appended to existing)',
            },
            progress: {
              type: 'array',
              items: { type: 'string' },
              description: 'Progress items (ACT mode)',
            },
            findings: {
              type: 'array',
              items: { type: 'string' },
              description: 'Evaluation findings (EVAL mode)',
            },
            recommendations: {
              type: 'array',
              items: { type: 'string' },
              description: 'Evaluation recommendations (EVAL mode)',
            },
            status: {
              type: 'string',
              enum: ['in_progress', 'completed', 'blocked'],
              description: 'Status of this mode section',
            },
          },
          required: ['mode'],
        },
      },
      {
        name: 'cleanup_context',
        description: `Manually trigger context document cleanup at ${CONTEXT_FILE_PATH}. Summarizes older sections to reduce document size while preserving recent history. Normally happens automatically when size thresholds are exceeded, but can be called manually if needed.`,
        inputSchema: {
          type: 'object',
          properties: {
            keepRecentSectionsFull: {
              type: 'number',
              description: 'Number of recent sections to keep full (default: 2)',
            },
            keepRecentItems: {
              type: 'number',
              description:
                'Number of recent items to keep in summarized section arrays (default: 5)',
            },
          },
          required: [],
        },
      },
    ];
  }

  private async handleReadContext(
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    // Extract verbosity level (defaults to 'standard')
    const verbosityStr = extractOptionalString(args, 'verbosity') || 'standard';
    const verbosity = isValidVerbosity(verbosityStr) ? verbosityStr : 'standard';
    const verbosityConfig = getVerbosityConfig(verbosity);

    // Apply verbosity settings to read options
    const readOptions =
      verbosityConfig.maxContextSections === -1
        ? undefined
        : { maxSections: verbosityConfig.maxContextSections };

    const result = await this.contextDocService.readContext(readOptions);

    if (!result.exists) {
      return createJsonResponse({
        exists: false,
        filePath: CONTEXT_FILE_PATH,
        message: 'No context document found. Run PLAN mode to create one.',
        hint: 'Start with PLAN keyword to initialize context.',
      });
    }

    if (result.error) {
      return createErrorResponse(`Failed to read context: ${result.error}`);
    }

    // Extract useful summary data
    const document = result.document!;
    const planSection = document.sections.find(s => s.mode === 'PLAN');
    const allDecisions: string[] = [];
    const allNotes: string[] = [];

    for (const section of document.sections) {
      if (section.decisions) allDecisions.push(...section.decisions);
      if (section.notes) allNotes.push(...section.notes);
    }

    return createJsonResponse({
      exists: true,
      filePath: CONTEXT_FILE_PATH,
      document,
      summary: {
        title: document.metadata.title,
        currentMode: document.metadata.currentMode,
        status: document.metadata.status,
        sectionCount: document.sections.length,
        truncatedSections: result.truncatedSections,
        verbosityApplied: verbosity,
        recommendedActAgent: planSection?.recommendedActAgent
          ? {
              agent: planSection.recommendedActAgent,
              confidence: planSection.recommendedActAgentConfidence,
            }
          : null,
        allDecisions,
        allNotes,
      },
    });
  }

  private async handleUpdateContext(
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    const mode = extractRequiredString(args, 'mode');
    if (mode === null) {
      return createErrorResponse('Missing required parameter: mode');
    }

    if (!['PLAN', 'ACT', 'EVAL', 'AUTO'].includes(mode)) {
      return createErrorResponse(`Invalid mode: ${mode}. Must be PLAN, ACT, EVAL, or AUTO`);
    }

    const typedMode = mode as Mode;

    // For PLAN mode, title is required
    if (typedMode === 'PLAN') {
      const title = extractOptionalString(args, 'title') || 'Untitled Task';
      const result = await this.contextDocService.resetContext({
        title,
        task: extractOptionalString(args, 'task') ?? undefined,
        primaryAgent: extractOptionalString(args, 'primaryAgent') ?? undefined,
        recommendedActAgent: extractOptionalString(args, 'recommendedActAgent') ?? undefined,
        recommendedActAgentConfidence:
          typeof args?.recommendedActAgentConfidence === 'number'
            ? args.recommendedActAgentConfidence
            : undefined,
        decisions: Array.isArray(args?.decisions) ? (args.decisions as string[]) : undefined,
        notes: Array.isArray(args?.notes) ? (args.notes as string[]) : undefined,
      });

      if (!result.success) {
        return createErrorResponse(result.error || 'Failed to reset context');
      }

      return createJsonResponse({
        success: true,
        filePath: CONTEXT_FILE_PATH,
        message: 'Context document reset (PLAN mode)',
        document: result.document,
      });
    }

    // For ACT/EVAL/AUTO modes, append to existing
    const result = await this.contextDocService.appendContext({
      mode: typedMode,
      task: extractOptionalString(args, 'task') ?? undefined,
      primaryAgent: extractOptionalString(args, 'primaryAgent') ?? undefined,
      recommendedActAgent: extractOptionalString(args, 'recommendedActAgent') ?? undefined,
      recommendedActAgentConfidence:
        typeof args?.recommendedActAgentConfidence === 'number'
          ? args.recommendedActAgentConfidence
          : undefined,
      decisions: Array.isArray(args?.decisions) ? (args.decisions as string[]) : undefined,
      notes: Array.isArray(args?.notes) ? (args.notes as string[]) : undefined,
      progress: Array.isArray(args?.progress) ? (args.progress as string[]) : undefined,
      findings: Array.isArray(args?.findings) ? (args.findings as string[]) : undefined,
      recommendations: Array.isArray(args?.recommendations)
        ? (args.recommendations as string[])
        : undefined,
      status:
        (extractOptionalString(args, 'status') as 'in_progress' | 'completed' | 'blocked') ??
        undefined,
    });

    if (!result.success) {
      return createErrorResponse(result.error || 'Failed to update context');
    }

    return createJsonResponse({
      success: true,
      filePath: CONTEXT_FILE_PATH,
      message: `Context document updated (${typedMode} mode)`,
      document: result.document,
    });
  }

  private async handleCleanupContext(
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    // Extract optional parameters
    const keepRecentSectionsFull =
      typeof args?.keepRecentSectionsFull === 'number' ? args.keepRecentSectionsFull : 2;
    const keepRecentItems = typeof args?.keepRecentItems === 'number' ? args.keepRecentItems : 5;

    // Validate parameters
    if (keepRecentSectionsFull < 0) {
      return createErrorResponse('keepRecentSectionsFull must be >= 0');
    }
    if (keepRecentItems < 1) {
      return createErrorResponse('keepRecentItems must be >= 1');
    }

    const result = await this.contextDocService.performCleanup(
      keepRecentSectionsFull,
      keepRecentItems,
    );

    if (!result.success) {
      return createErrorResponse(result.error || 'Failed to cleanup context');
    }

    return createJsonResponse({
      success: true,
      filePath: CONTEXT_FILE_PATH,
      message: result.message,
      document: result.document,
    });
  }
}
