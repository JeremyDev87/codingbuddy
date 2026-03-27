import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import * as path from 'path';
import { ConfigService } from '../config/config.service';
import { withTimeout } from '../shared/async.utils';
import { CONTEXT_FILE_TIMEOUT_MS } from './context-document.types';
import {
  ARCHIVE_DIR,
  MAX_ARCHIVE_RESULTS,
  ARCHIVE_MAX_AGE_DAYS,
  ARCHIVE_FILENAME_PATTERN,
  generateArchiveFilename,
  parseArchiveDate,
  validateSearchKeyword,
} from './context-archive.types';
import type {
  ArchiveEntry,
  ArchiveHistoryResult,
  ArchiveSearchResult,
  ArchiveCleanupResult,
} from './context-archive.types';
import { parseContextDocument } from './context-parser.utils';

/**
 * Service for archiving context documents before PLAN mode resets.
 *
 * Responsibilities:
 * - Save current context to archive before reset
 * - List recent archived contexts
 * - Search archives by keyword
 * - Auto-cleanup archives older than 30 days
 */
@Injectable()
export class ContextArchiveService {
  private readonly logger = new Logger(ContextArchiveService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Get the absolute path to the archive directory.
   */
  private getArchiveDir(): string {
    return path.join(this.configService.getProjectRoot(), ARCHIVE_DIR);
  }

  /**
   * Ensure the archive directory exists.
   */
  private ensureArchiveDir(): void {
    const archiveDir = this.getArchiveDir();
    if (!existsSync(archiveDir)) {
      mkdirSync(archiveDir, { recursive: true });
      this.logger.log(`Created archive directory: ${archiveDir}`);
    }
  }

  /**
   * Archive the current context document before PLAN mode reset.
   *
   * @param contextContent - Current context document content (markdown)
   * @returns Path to the archived file, or null if nothing to archive
   */
  async archiveContext(contextContent: string): Promise<string | null> {
    if (!contextContent || contextContent.trim().length === 0) {
      this.logger.debug('No content to archive');
      return null;
    }

    this.ensureArchiveDir();
    const filename = generateArchiveFilename();
    const archivePath = path.join(this.getArchiveDir(), filename);

    await withTimeout(fs.writeFile(archivePath, contextContent, 'utf-8'), {
      timeoutMs: CONTEXT_FILE_TIMEOUT_MS,
      operationName: 'write archive file',
    });

    this.logger.log(`Archived context to: ${ARCHIVE_DIR}/${filename}`);
    return `${ARCHIVE_DIR}/${filename}`;
  }

  /**
   * Get recent archived context documents.
   *
   * @param limit - Maximum number of entries to return (default: 10)
   * @returns Archive history with entries sorted newest first
   */
  async getHistory(limit: number = 10): Promise<ArchiveHistoryResult> {
    const effectiveLimit = Math.min(Math.max(1, limit), MAX_ARCHIVE_RESULTS);
    const archiveDir = this.getArchiveDir();

    if (!existsSync(archiveDir)) {
      return { entries: [], totalCount: 0, truncated: false };
    }

    const files = await withTimeout(fs.readdir(archiveDir), {
      timeoutMs: CONTEXT_FILE_TIMEOUT_MS,
      operationName: 'list archive directory',
    });

    // Filter valid archive files and sort newest first
    const archiveFiles = files
      .filter(f => ARCHIVE_FILENAME_PATTERN.test(f))
      .sort()
      .reverse();

    const totalCount = archiveFiles.length;
    const truncated = totalCount > effectiveLimit;
    const selected = archiveFiles.slice(0, effectiveLimit);

    const entries: ArchiveEntry[] = [];
    for (const filename of selected) {
      const entry = await this.buildArchiveEntry(filename);
      if (entry) {
        entries.push(entry);
      }
    }

    return { entries, totalCount, truncated };
  }

  /**
   * Search archived contexts by keyword.
   *
   * @param keyword - Search term (case-insensitive)
   * @param limit - Maximum archives to search (default: MAX_ARCHIVE_RESULTS)
   * @returns Search results with matching archives and lines
   */
  async searchArchives(
    keyword: string,
    limit: number = MAX_ARCHIVE_RESULTS,
  ): Promise<ArchiveSearchResult> {
    const validation = validateSearchKeyword(keyword);
    if (!validation.valid) {
      return {
        keyword,
        results: [],
        totalSearched: 0,
      };
    }

    const archiveDir = this.getArchiveDir();
    if (!existsSync(archiveDir)) {
      return { keyword, results: [], totalSearched: 0 };
    }

    const files = await withTimeout(fs.readdir(archiveDir), {
      timeoutMs: CONTEXT_FILE_TIMEOUT_MS,
      operationName: 'list archive directory for search',
    });

    const archiveFiles = files
      .filter(f => ARCHIVE_FILENAME_PATTERN.test(f))
      .sort()
      .reverse()
      .slice(0, Math.min(limit, MAX_ARCHIVE_RESULTS));

    const lowerKeyword = keyword.toLowerCase();
    const results: ArchiveSearchResult['results'] = [];

    for (const filename of archiveFiles) {
      const filePath = path.join(archiveDir, filename);
      try {
        const content = await withTimeout(fs.readFile(filePath, 'utf-8'), {
          timeoutMs: CONTEXT_FILE_TIMEOUT_MS,
          operationName: `read archive ${filename}`,
        });

        const lines = content.split('\n');
        const matchingLines: string[] = [];

        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(lowerKeyword)) {
            // Include surrounding context (1 line before and after)
            const start = Math.max(0, i - 1);
            const end = Math.min(lines.length - 1, i + 1);
            const contextLines = lines.slice(start, end + 1).join('\n');
            matchingLines.push(contextLines);
          }
        }

        if (matchingLines.length > 0) {
          const entry = await this.buildArchiveEntry(filename);
          if (entry) {
            // Deduplicate overlapping context windows
            const uniqueMatches = [...new Set(matchingLines)];
            results.push({ entry, matches: uniqueMatches.slice(0, 10) });
          }
        }
      } catch {
        this.logger.debug(`Failed to search archive: ${filename}`);
      }
    }

    return {
      keyword,
      results,
      totalSearched: archiveFiles.length,
    };
  }

  /**
   * Clean up old archives (older than maxAgeDays).
   * Keeps a summary line in a consolidated file, removes originals.
   *
   * @param maxAgeDays - Maximum age before cleanup (default: 30)
   * @returns Cleanup result with counts
   */
  async cleanupOldArchives(
    maxAgeDays: number = ARCHIVE_MAX_AGE_DAYS,
  ): Promise<ArchiveCleanupResult> {
    const archiveDir = this.getArchiveDir();

    if (!existsSync(archiveDir)) {
      return { summarizedCount: 0, deletedCount: 0, remainingCount: 0 };
    }

    const files = await withTimeout(fs.readdir(archiveDir), {
      timeoutMs: CONTEXT_FILE_TIMEOUT_MS,
      operationName: 'list archive directory for cleanup',
    });

    const archiveFiles = files.filter(f => ARCHIVE_FILENAME_PATTERN.test(f));
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

    const toCleanup: string[] = [];
    const toKeep: string[] = [];

    for (const filename of archiveFiles) {
      const archiveDate = parseArchiveDate(filename);
      if (archiveDate && archiveDate < cutoffDate) {
        toCleanup.push(filename);
      } else {
        toKeep.push(filename);
      }
    }

    if (toCleanup.length === 0) {
      return {
        summarizedCount: 0,
        deletedCount: 0,
        remainingCount: archiveFiles.length,
      };
    }

    // Build summary of old archives
    const summaryLines: string[] = [
      '# Archived Context Summary',
      '',
      `> Auto-generated on ${new Date().toISOString()}`,
      `> Summarized ${toCleanup.length} archives older than ${maxAgeDays} days`,
      '',
    ];

    for (const filename of toCleanup.sort()) {
      const filePath = path.join(archiveDir, filename);
      try {
        const content = await withTimeout(fs.readFile(filePath, 'utf-8'), {
          timeoutMs: CONTEXT_FILE_TIMEOUT_MS,
          operationName: `read archive for summary ${filename}`,
        });

        const doc = parseContextDocument(content);
        const title = doc.metadata.title || 'Untitled';
        const mode = doc.metadata.currentMode || 'PLAN';
        const decisions = doc.sections
          .flatMap(s => s.decisions || [])
          .slice(0, 3);

        summaryLines.push(`## ${filename.replace('.md', '')} — ${title}`);
        summaryLines.push(`- **Mode**: ${mode}`);
        if (decisions.length > 0) {
          summaryLines.push(`- **Key Decisions**: ${decisions.join('; ')}`);
        }
        summaryLines.push('');
      } catch {
        summaryLines.push(`## ${filename.replace('.md', '')} — (failed to parse)`);
        summaryLines.push('');
      }
    }

    // Write summary file
    const summaryPath = path.join(archiveDir, '_summary.md');
    let existingSummary = '';
    if (existsSync(summaryPath)) {
      existingSummary = await withTimeout(fs.readFile(summaryPath, 'utf-8'), {
        timeoutMs: CONTEXT_FILE_TIMEOUT_MS,
        operationName: 'read existing summary',
      });
      existingSummary += '\n\n---\n\n';
    }

    await withTimeout(
      fs.writeFile(summaryPath, existingSummary + summaryLines.join('\n'), 'utf-8'),
      {
        timeoutMs: CONTEXT_FILE_TIMEOUT_MS,
        operationName: 'write archive summary',
      },
    );

    // Delete old archive files
    let deletedCount = 0;
    for (const filename of toCleanup) {
      try {
        await fs.unlink(path.join(archiveDir, filename));
        deletedCount++;
      } catch {
        this.logger.debug(`Failed to delete archive: ${filename}`);
      }
    }

    this.logger.log(
      `Archive cleanup: summarized ${toCleanup.length}, deleted ${deletedCount}, remaining ${toKeep.length}`,
    );

    return {
      summarizedCount: toCleanup.length,
      deletedCount,
      remainingCount: toKeep.length,
    };
  }

  /**
   * Build an ArchiveEntry from a filename.
   */
  private async buildArchiveEntry(filename: string): Promise<ArchiveEntry | null> {
    const archiveDir = this.getArchiveDir();
    const filePath = path.join(archiveDir, filename);

    try {
      const stat = await fs.stat(filePath);
      const content = await withTimeout(fs.readFile(filePath, 'utf-8'), {
        timeoutMs: CONTEXT_FILE_TIMEOUT_MS,
        operationName: `read archive ${filename}`,
      });

      const doc = parseContextDocument(content);

      return {
        filename,
        path: `${ARCHIVE_DIR}/${filename}`,
        title: doc.metadata.title || 'Untitled',
        createdAt: doc.metadata.createdAt || '',
        sizeBytes: stat.size,
      };
    } catch {
      this.logger.debug(`Failed to read archive entry: ${filename}`);
      return null;
    }
  }
}
