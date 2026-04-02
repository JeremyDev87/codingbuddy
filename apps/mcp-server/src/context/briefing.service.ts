import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { ConfigService } from '../config/config.service';
import { ContextDocumentService } from './context-document.service';
import type { BriefingInput, BriefingResult } from './briefing.types';
import { BRIEFING_OUTPUT_DIR, GIT_DIFF_TIMEOUT_MS } from './briefing.types';

/**
 * Service for generating session briefing documents.
 *
 * Briefings capture the current session state (decisions, changed files,
 * pending tasks) into a structured markdown document that can be used
 * to resume work in a new session.
 */
@Injectable()
export class BriefingService {
  private readonly logger = new Logger(BriefingService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly contextDocumentService: ContextDocumentService,
  ) {}

  /**
   * Generate a briefing document from current session state.
   *
   * 1. Reads context.md and parses decisions, notes, tasks
   * 2. Runs `git diff --stat` to extract changed files
   * 3. Determines current mode from context metadata
   * 4. Generates resumeCommand based on pending work
   * 5. Writes to docs/codingbuddy/briefings/{ISO-timestamp}.md
   */
  async createBriefing(input?: BriefingInput): Promise<BriefingResult> {
    const projectRoot = input?.projectRoot ?? this.configService.getProjectRoot();

    // 1. Parse context document
    const { decisions, pendingTasks, currentMode, title } = await this.parseContext();

    // 2. Get changed files from git
    const changedFiles = this.getChangedFiles(projectRoot);

    // 3. Generate resume command
    const resumeCommand = this.generateResumeCommand(currentMode, pendingTasks, title);

    // 4. Generate and write briefing
    const filePath = await this.writeBriefing(projectRoot, {
      decisions,
      pendingTasks,
      changedFiles,
      resumeCommand,
      currentMode,
      title,
    });

    return {
      filePath,
      decisions,
      pendingTasks,
      changedFiles,
      resumeCommand,
    };
  }

  /**
   * Parse the context document to extract decisions, pending tasks, and mode.
   */
  async parseContext(): Promise<{
    decisions: string[];
    pendingTasks: string[];
    currentMode: string;
    title: string;
  }> {
    const readResult = await this.contextDocumentService.readContext();

    if (!readResult.exists || !readResult.document) {
      return {
        decisions: [],
        pendingTasks: [],
        currentMode: 'PLAN',
        title: 'Untitled',
      };
    }

    const doc = readResult.document;
    const decisions: string[] = [];
    const pendingTasks: string[] = [];

    for (const section of doc.sections) {
      if (section.decisions) {
        decisions.push(...section.decisions);
      }
      if (section.notes) {
        pendingTasks.push(...section.notes);
      }
      if (section.progress) {
        // Filter progress items that look incomplete (not marked done)
        for (const item of section.progress) {
          if (!item.toLowerCase().includes('completed') && !item.toLowerCase().includes('done')) {
            pendingTasks.push(item);
          }
        }
      }
    }

    return {
      decisions,
      pendingTasks,
      currentMode: doc.metadata.currentMode ?? 'PLAN',
      title: doc.metadata.title ?? 'Untitled',
    };
  }

  /**
   * Get list of changed files from `git diff --stat`.
   * Returns empty array if git is not available or no changes exist.
   */
  getChangedFiles(projectRoot: string): string[] {
    try {
      const output = execSync('git diff --stat --name-only', {
        cwd: projectRoot,
        timeout: GIT_DIFF_TIMEOUT_MS,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      return output
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    } catch (error) {
      this.logger.warn(
        `Failed to get git diff: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  /**
   * Generate a resume command based on current state.
   */
  generateResumeCommand(currentMode: string, pendingTasks: string[], title: string): string {
    if (pendingTasks.length === 0) {
      return `PLAN continue "${title}"`;
    }

    switch (currentMode) {
      case 'PLAN':
        return `ACT execute the plan for "${title}"`;
      case 'ACT':
        return `ACT continue implementation of "${title}"`;
      case 'EVAL':
        return `ACT apply fixes from evaluation of "${title}"`;
      default:
        return `AUTO continue "${title}"`;
    }
  }

  /**
   * Write the briefing markdown file.
   */
  private async writeBriefing(
    projectRoot: string,
    data: {
      decisions: string[];
      pendingTasks: string[];
      changedFiles: string[];
      resumeCommand: string;
      currentMode: string;
      title: string;
    },
  ): Promise<string> {
    const briefingDir = path.join(projectRoot, BRIEFING_OUTPUT_DIR);

    // Ensure directory exists
    if (!existsSync(briefingDir)) {
      mkdirSync(briefingDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${timestamp}.md`;
    const filePath = path.join(briefingDir, fileName);

    const content = this.formatBriefingMarkdown(data);
    await fs.writeFile(filePath, content, 'utf-8');

    this.logger.log(`Briefing written to ${filePath}`);
    return filePath;
  }

  /**
   * Format briefing data as markdown.
   * Pure function - no side effects.
   */
  formatBriefingMarkdown(data: {
    decisions: string[];
    pendingTasks: string[];
    changedFiles: string[];
    resumeCommand: string;
    currentMode: string;
    title: string;
  }): string {
    const lines: string[] = [];

    lines.push(`# Briefing: ${data.title}`);
    lines.push('');
    lines.push(`**Mode**: ${data.currentMode}`);
    lines.push(`**Created**: ${new Date().toISOString()}`);
    lines.push('');

    // Decisions
    lines.push('## Decisions');
    if (data.decisions.length > 0) {
      for (const decision of data.decisions) {
        lines.push(`- ${decision}`);
      }
    } else {
      lines.push('_No decisions recorded._');
    }
    lines.push('');

    // Changed Files
    lines.push('## Changed Files');
    if (data.changedFiles.length > 0) {
      for (const file of data.changedFiles) {
        lines.push(`- ${file}`);
      }
    } else {
      lines.push('_No files changed._');
    }
    lines.push('');

    // Pending Tasks
    lines.push('## Pending Tasks');
    if (data.pendingTasks.length > 0) {
      for (const task of data.pendingTasks) {
        lines.push(`- ${task}`);
      }
    } else {
      lines.push('_No pending tasks._');
    }
    lines.push('');

    // Resume Command
    lines.push('## Resume Command');
    lines.push('```');
    lines.push(data.resumeCommand);
    lines.push('```');
    lines.push('');

    return lines.join('\n');
  }
}
