import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import * as path from 'path';
import type { Mode } from '../keyword/keyword.types';
import type {
  ContextSection,
  ResetContextData,
  AppendContextData,
  ContextOperationResult,
  ContextReadResult,
  ContextLimits,
  ContextReadOptions,
} from './context-document.types';
import {
  CONTEXT_FILE_PATH,
  CONTEXT_FILE_TIMEOUT_MS,
  truncateArray,
  DEFAULT_CONTEXT_LIMITS,
  CONTEXT_SIZE_THRESHOLDS,
} from './context-document.types';
import { parseContextDocument } from './context-parser.utils';
import {
  serializeContextDocument,
  createNewContextDocument,
  createPlanSection,
  mergeSection,
  generateTimestamp,
  estimateDocumentSize,
  cleanupContextDocument,
} from './context-serializer.utils';
import { ConfigService } from '../config/config.service';
import { withTimeout } from '../shared/async.utils';

/**
 * Service for managing the single context document.
 *
 * Key behaviors:
 * - PLAN mode: Resets the document (fresh start)
 * - ACT/EVAL modes: Appends to existing document
 * - Always uses fixed path: docs/codingbuddy/context.md
 */
@Injectable()
export class ContextDocumentService {
  private readonly logger = new Logger(ContextDocumentService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Handle context operation errors uniformly.
   * Extracts error message, logs, and returns failure result.
   *
   * @param error - Error object
   * @param operation - Operation name for logging
   * @returns Failure result with error message
   */
  private handleContextError(
    error: unknown,
    operation: string,
  ): ContextOperationResult {
    const message = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Failed to ${operation}: ${message}`);
    return {
      success: false,
      error: message,
    };
  }

  /**
   * Get the full path to the context document.
   */
  private getContextPath(): string {
    const projectRoot = this.configService.getProjectRoot();
    return path.join(projectRoot, CONTEXT_FILE_PATH);
  }

  /**
   * Get context limits from configuration.
   * Falls back to default limits if not configured.
   */
  private async getContextLimits(): Promise<ContextLimits> {
    try {
      return await this.configService.getContextLimits();
    } catch (error) {
      // Fall back to defaults if config unavailable
      this.logger.debug(
        `Failed to load context limits: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return DEFAULT_CONTEXT_LIMITS;
    }
  }

  /**
   * Ensure the context document directory exists.
   */
  private ensureContextDir(): void {
    const contextPath = this.getContextPath();
    const contextDir = path.dirname(contextPath);

    if (!existsSync(contextDir)) {
      mkdirSync(contextDir, { recursive: true });
      this.logger.log(`Created context directory: ${contextDir}`);
    }
  }

  /**
   * Check if context document exists.
   */
  async contextExists(): Promise<boolean> {
    const contextPath = this.getContextPath();
    return existsSync(contextPath);
  }

  /**
   * Read the current context document.
   * Returns null if document doesn't exist.
   *
   * @param options - Read options for controlling returned data size
   */
  async readContext(options?: ContextReadOptions): Promise<ContextReadResult> {
    try {
      const contextPath = this.getContextPath();

      if (!existsSync(contextPath)) {
        this.logger.debug('Context document does not exist');
        return { exists: false };
      }

      const content = await withTimeout(fs.readFile(contextPath, 'utf-8'), {
        timeoutMs: CONTEXT_FILE_TIMEOUT_MS,
        operationName: 'read context file',
      });

      let document = parseContextDocument(content);

      // Apply section truncation if requested
      let truncatedSections = 0;
      if (options?.maxSections && options.maxSections > 0) {
        const totalSections = document.sections.length;
        if (totalSections > options.maxSections) {
          // Keep the most recent N sections
          document = {
            ...document,
            sections: document.sections.slice(-options.maxSections),
          };
          truncatedSections = totalSections - options.maxSections;
          this.logger.debug(
            `Truncated ${truncatedSections} sections (keeping ${options.maxSections} most recent)`,
          );
        }
      }

      return {
        exists: true,
        document,
        truncatedSections:
          truncatedSections > 0 ? truncatedSections : undefined,
      };
    } catch (error) {
      const result = this.handleContextError(error, 'read context');
      return {
        exists: false,
        error: result.error,
      };
    }
  }

  /**
   * Reset context document (PLAN mode).
   * Deletes existing content and creates fresh document.
   */
  async resetContext(data: ResetContextData): Promise<ContextOperationResult> {
    try {
      this.ensureContextDir();
      const contextPath = this.getContextPath();
      const timestamp = generateTimestamp();
      const limits = await this.getContextLimits();

      // Create PLAN section (with DoS protection via truncation)
      const planSection = createPlanSection(
        {
          task: data.task,
          primaryAgent: data.primaryAgent,
          recommendedActAgent: data.recommendedActAgent,
          recommendedActAgentConfidence: data.recommendedActAgentConfidence,
          decisions: truncateArray(data.decisions, limits),
          notes: truncateArray(data.notes, limits),
        },
        timestamp,
      );

      // Create new document with explicit timestamp (pure function)
      const isoTimestamp = new Date().toISOString();
      const document = createNewContextDocument(
        data.title,
        planSection,
        isoTimestamp,
      );

      // Serialize and write
      const content = serializeContextDocument(document);
      await withTimeout(fs.writeFile(contextPath, content, 'utf-8'), {
        timeoutMs: CONTEXT_FILE_TIMEOUT_MS,
        operationName: 'write context file',
      });

      this.logger.log(`Reset context document: ${CONTEXT_FILE_PATH}`);

      return {
        success: true,
        filePath: contextPath,
        message: 'Context document reset successfully',
        document,
      };
    } catch (error) {
      return this.handleContextError(error, 'reset context');
    }
  }

  /**
   * Append to context document (ACT/EVAL modes).
   * Requires existing document (created by PLAN).
   */
  async appendContext(
    data: AppendContextData,
  ): Promise<ContextOperationResult> {
    try {
      const readResult = await this.readContext();

      if (!readResult.exists || !readResult.document) {
        return {
          success: false,
          error:
            'No context document found. Run PLAN mode first to create context.',
        };
      }

      const document = readResult.document;
      const contextPath = this.getContextPath();
      const timestamp = generateTimestamp();
      const limits = await this.getContextLimits();

      // Find existing section for this mode
      const existingIndex = document.sections.findIndex(
        s => s.mode === data.mode,
      );

      // Build new section (with DoS protection via truncation)
      const newSection: ContextSection = {
        mode: data.mode,
        timestamp,
        task: data.task,
        primaryAgent: data.primaryAgent,
        decisions: truncateArray(data.decisions, limits),
        notes: truncateArray(data.notes, limits),
        progress: truncateArray(data.progress, limits),
        findings: truncateArray(data.findings, limits),
        recommendations: truncateArray(data.recommendations, limits),
        status: data.status,
      };

      if (existingIndex >= 0) {
        // Merge with existing section (accumulation)
        document.sections[existingIndex] = mergeSection(
          document.sections[existingIndex],
          newSection,
          timestamp,
        );
      } else {
        // Add new section
        document.sections.push(newSection);
      }

      // Update metadata
      document.metadata.lastUpdatedAt = new Date().toISOString();
      document.metadata.currentMode = data.mode;

      // Serialize and write
      const content = serializeContextDocument(document);
      await withTimeout(fs.writeFile(contextPath, content, 'utf-8'), {
        timeoutMs: CONTEXT_FILE_TIMEOUT_MS,
        operationName: 'write context file',
      });

      this.logger.log(`Appended ${data.mode} section to context document`);

      // Check for automatic cleanup after append
      await this.autoCleanupIfNeeded();

      return {
        success: true,
        filePath: contextPath,
        message: `${data.mode} section appended successfully`,
        document,
      };
    } catch (error) {
      return this.handleContextError(error, 'append context');
    }
  }

  /**
   * Update context based on mode.
   * PLAN: Resets document
   * ACT/EVAL/AUTO: Appends to document
   */
  async updateContext(
    mode: Mode,
    data: Omit<ResetContextData, 'title'> & { title?: string },
  ): Promise<ContextOperationResult> {
    if (mode === 'PLAN') {
      return this.resetContext({
        title: data.title || 'Untitled Task',
        task: data.task,
        primaryAgent: data.primaryAgent,
        recommendedActAgent: data.recommendedActAgent,
        recommendedActAgentConfidence: data.recommendedActAgentConfidence,
        decisions: data.decisions,
        notes: data.notes,
      });
    }

    return this.appendContext({
      mode,
      task: data.task,
      primaryAgent: data.primaryAgent,
      decisions: data.decisions,
      notes: data.notes,
    });
  }

  /**
   * Get recommended ACT agent from context.
   * Returns null if no context or no recommendation.
   */
  async getRecommendedActAgent(): Promise<{
    agent: string;
    confidence: number;
  } | null> {
    const readResult = await this.readContext();

    if (!readResult.exists || !readResult.document) {
      return null;
    }

    const planSection = readResult.document.sections.find(
      s => s.mode === 'PLAN',
    );

    if (planSection?.recommendedActAgent) {
      return {
        agent: planSection.recommendedActAgent,
        confidence: planSection.recommendedActAgentConfidence || 0,
      };
    }

    return null;
  }

  /**
   * Get the fixed context file path constant.
   */
  getContextFilePath(): string {
    return CONTEXT_FILE_PATH;
  }

  /**
   * Check if automatic cleanup is needed based on document size.
   * Returns cleanup recommendation with size info.
   */
  async shouldCleanup(): Promise<{
    needed: boolean;
    currentSize: number;
    threshold: number;
    level: 'none' | 'warn' | 'cleanup';
  }> {
    const readResult = await this.readContext();

    if (!readResult.exists || !readResult.document) {
      return {
        needed: false,
        currentSize: 0,
        threshold: CONTEXT_SIZE_THRESHOLDS.CLEANUP,
        level: 'none',
      };
    }

    const currentSize = estimateDocumentSize(readResult.document);

    if (currentSize >= CONTEXT_SIZE_THRESHOLDS.CLEANUP) {
      return {
        needed: true,
        currentSize,
        threshold: CONTEXT_SIZE_THRESHOLDS.CLEANUP,
        level: 'cleanup',
      };
    }

    if (currentSize >= CONTEXT_SIZE_THRESHOLDS.WARN) {
      return {
        needed: false,
        currentSize,
        threshold: CONTEXT_SIZE_THRESHOLDS.WARN,
        level: 'warn',
      };
    }

    return {
      needed: false,
      currentSize,
      threshold: CONTEXT_SIZE_THRESHOLDS.CLEANUP,
      level: 'none',
    };
  }

  /**
   * Perform automatic cleanup on the context document.
   * Summarizes older sections to reduce size while preserving recent history.
   *
   * @param keepRecentSectionsFull - Number of recent sections to keep full (default: 2)
   * @param keepRecentItems - Number of items to keep in summarized sections (default: 5)
   */
  async performCleanup(
    keepRecentSectionsFull: number = 2,
    keepRecentItems: number = 5,
  ): Promise<ContextOperationResult> {
    try {
      const readResult = await this.readContext();

      if (!readResult.exists || !readResult.document) {
        return {
          success: false,
          error: 'No context document found to cleanup',
        };
      }

      const {
        document: cleanedDocument,
        originalSize,
        newSize,
      } = cleanupContextDocument(
        readResult.document,
        keepRecentSectionsFull,
        keepRecentItems,
      );

      // Write cleaned document
      const contextPath = this.getContextPath();
      const content = serializeContextDocument(cleanedDocument);
      await withTimeout(fs.writeFile(contextPath, content, 'utf-8'), {
        timeoutMs: CONTEXT_FILE_TIMEOUT_MS,
        operationName: 'write context file',
      });

      const reduction = originalSize - newSize;
      const reductionPercent = ((reduction / originalSize) * 100).toFixed(1);

      this.logger.log(
        `Cleaned up context document: ${originalSize} → ${newSize} chars (${reductionPercent}% reduction)`,
      );

      return {
        success: true,
        filePath: contextPath,
        message: `Context cleaned up successfully. Size reduced by ${reductionPercent}% (${reduction} chars)`,
        document: cleanedDocument,
      };
    } catch (error) {
      return this.handleContextError(error, 'cleanup context');
    }
  }

  /**
   * Check and perform automatic cleanup if needed.
   * Called after append operations to maintain document size.
   */
  private async autoCleanupIfNeeded(): Promise<void> {
    const check = await this.shouldCleanup();

    if (check.level === 'warn') {
      this.logger.warn(
        `Context document size approaching limit: ${check.currentSize} chars (threshold: ${check.threshold})`,
      );
    }

    if (check.needed) {
      this.logger.log(
        'Context document size exceeded threshold, performing automatic cleanup...',
      );
      await this.performCleanup();
    }
  }
}
