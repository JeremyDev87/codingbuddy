import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import * as path from 'path';
import { ConfigService } from '../config/config.service';
import {
  LOG_DIR_PATH,
  LOG_FILE_NAME,
  LOG_SCHEMA_VERSION,
  MAX_LOG_ENTRIES,
  type DiagnosticLogEntry,
  type DiagnosticLogFile,
  type LogOperationResult,
} from './diagnostic.types';

/**
 * DiagnosticLogService - File-based diagnostic logging
 *
 * Logs diagnostic information to docs/codingbuddy/log/ for debugging
 * config loading and language resolution issues.
 */
@Injectable()
export class DiagnosticLogService {
  private readonly logger = new Logger(DiagnosticLogService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Get the log directory path
   */
  getLogDir(): string {
    const projectRoot = this.configService.getProjectRoot();
    return path.join(projectRoot, LOG_DIR_PATH);
  }

  /**
   * Get the log file path
   */
  getLogFilePath(): string {
    return path.join(this.getLogDir(), LOG_FILE_NAME);
  }

  /**
   * Ensure log directory exists
   */
  private ensureLogDir(): void {
    const logDir = this.getLogDir();
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
      this.logger.log(`Created log directory: ${logDir}`);
    }
  }

  /**
   * Load existing log file or create new one
   */
  private async loadOrCreateLogFile(): Promise<DiagnosticLogFile> {
    const filePath = this.getLogFilePath();

    if (existsSync(filePath)) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const logFile = JSON.parse(content) as DiagnosticLogFile;

        // Version check
        if (logFile.version === LOG_SCHEMA_VERSION) {
          return logFile;
        }

        // Version mismatch - create new file
        this.logger.warn(`Log schema version mismatch, creating new log file`);
      } catch {
        this.logger.warn(`Failed to parse log file, creating new one`);
      }
    }

    return {
      version: LOG_SCHEMA_VERSION,
      createdAt: new Date().toISOString(),
      entries: [],
    };
  }

  /**
   * Write log entry to file
   */
  async log(
    level: DiagnosticLogEntry['level'],
    category: string,
    message: string,
    context?: Record<string, unknown>,
  ): Promise<LogOperationResult> {
    try {
      this.ensureLogDir();

      const logFile = await this.loadOrCreateLogFile();

      const entry: DiagnosticLogEntry = {
        timestamp: new Date().toISOString(),
        level,
        category,
        message,
        context,
      };

      logFile.entries.push(entry);

      // Trim old entries if exceeds max
      if (logFile.entries.length > MAX_LOG_ENTRIES) {
        logFile.entries = logFile.entries.slice(-MAX_LOG_ENTRIES);
      }

      const filePath = this.getLogFilePath();
      await fs.writeFile(filePath, JSON.stringify(logFile, null, 2), 'utf-8');

      return { success: true, filePath };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to write diagnostic log: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Log debug message
   */
  async debug(
    category: string,
    message: string,
    context?: Record<string, unknown>,
  ): Promise<LogOperationResult> {
    return this.log('debug', category, message, context);
  }

  /**
   * Log info message
   */
  async info(
    category: string,
    message: string,
    context?: Record<string, unknown>,
  ): Promise<LogOperationResult> {
    return this.log('info', category, message, context);
  }

  /**
   * Log warning message
   */
  async warn(
    category: string,
    message: string,
    context?: Record<string, unknown>,
  ): Promise<LogOperationResult> {
    return this.log('warn', category, message, context);
  }

  /**
   * Log error message
   */
  async error(
    category: string,
    message: string,
    context?: Record<string, unknown>,
  ): Promise<LogOperationResult> {
    return this.log('error', category, message, context);
  }

  /**
   * Log config loading event
   */
  async logConfigLoading(
    success: boolean,
    projectRoot: string,
    configLanguage?: string,
    error?: string,
  ): Promise<LogOperationResult> {
    const level = success ? 'info' : 'warn';
    const message = success ? `Config loaded successfully` : `Config loading failed or incomplete`;

    return this.log(level, 'config', message, {
      projectRoot,
      configLanguage: configLanguage || null,
      error: error || null,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Read all log entries
   */
  async readLogs(): Promise<DiagnosticLogEntry[]> {
    try {
      const filePath = this.getLogFilePath();

      if (!existsSync(filePath)) {
        return [];
      }

      const content = await fs.readFile(filePath, 'utf-8');
      const logFile = JSON.parse(content) as DiagnosticLogFile;

      return logFile.entries;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to read diagnostic logs: ${errorMessage}`);
      return [];
    }
  }

  /**
   * Clear all log entries
   */
  async clearLogs(): Promise<LogOperationResult> {
    try {
      const filePath = this.getLogFilePath();

      if (existsSync(filePath)) {
        await fs.unlink(filePath);
        this.logger.log(`Cleared diagnostic log file: ${filePath}`);
      }

      return { success: true, filePath };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to clear diagnostic logs: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }
}
