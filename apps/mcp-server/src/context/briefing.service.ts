import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { ConfigService } from '../config/config.service';
import { withTimeout } from '../shared/async.utils';
import { CONTEXT_FILE_TIMEOUT_MS } from './context-document.types';
import { parseContextDocument } from './context-parser.utils';
import { BRIEFING_DIR, DEFAULT_CONTEXT_PATH, generateBriefingFilename } from './briefing.types';
import type { BriefingInput, BriefingResult } from './briefing.types';

/**
 * Service for creating session briefing documents.
 *
 * Captures current session state (decisions, pending tasks, changed files)
 * into a structured briefing document for cross-session recovery.
 */
@Injectable()
export class BriefingService {
  private readonly logger = new Logger(BriefingService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Create a briefing document from current session state.
   *
   * 1. Read context.md and parse decisions, notes, tasks
   * 2. Run git diff --stat to extract changed files
   * 3. Determine resume command based on pending work
   * 4. Write briefing to docs/codingbuddy/briefings/
   *
   * @param input - Optional input parameters
   * @returns BriefingResult with file path and extracted data
   */
  async createBriefing(input?: BriefingInput): Promise<BriefingResult> {
    const projectRoot = input?.projectRoot ?? this.configService.getProjectRoot();
    const contextPath = input?.contextPath ?? DEFAULT_CONTEXT_PATH;
    const fullContextPath = path.join(projectRoot, contextPath);

    // Step 1: Parse context document
    const { decisions, pendingTasks, currentMode } = await this.parseContext(fullContextPath);

    // Step 2: Get changed files from git
    const changedFiles = this.getChangedFiles(projectRoot);

    // Step 3: Generate resume command
    const resumeCommand = this.generateResumeCommand(currentMode, pendingTasks, decisions);

    // Step 4: Generate and write briefing
    const markdown = this.generateBriefingMarkdown({
      decisions,
      pendingTasks,
      changedFiles,
      resumeCommand,
    });

    const filePath = await this.writeBriefing(projectRoot, markdown);

    return {
      filePath,
      decisions,
      pendingTasks,
      changedFiles,
      resumeCommand,
    };
  }

  /**
   * Parse git diff --stat output to extract file paths.
   *
   * @param diffOutput - Raw output from git diff --stat
   * @returns Array of file paths
   */
  parseGitDiffStat(diffOutput: string): string[] {
    if (!diffOutput || diffOutput.trim().length === 0) {
      return [];
    }

    const lines = diffOutput.split('\n');
    const files: string[] = [];

    for (const line of lines) {
      // Each file line has format: " path/to/file | N +++---"
      // Summary line has format: " N files changed, ..."
      const match = line.match(/^\s+(.+?)\s+\|\s+\d/);
      if (match) {
        files.push(match[1].trim());
      }
    }

    return files;
  }

  /**
   * Parse context.md and extract decisions, pending tasks, and current mode.
   */
  private async parseContext(contextPath: string): Promise<{
    decisions: string[];
    pendingTasks: string[];
    currentMode: string;
  }> {
    if (!existsSync(contextPath)) {
      return { decisions: [], pendingTasks: [], currentMode: 'PLAN' };
    }

    try {
      const content = await withTimeout(fs.readFile(contextPath, 'utf-8'), {
        timeoutMs: CONTEXT_FILE_TIMEOUT_MS,
        operationName: 'read context for briefing',
      });

      if (!content || content.trim().length === 0) {
        return { decisions: [], pendingTasks: [], currentMode: 'PLAN' };
      }

      const doc = parseContextDocument(content);

      // Collect all decisions across sections
      const decisions = doc.sections.flatMap(s => s.decisions ?? []);

      // Collect pending tasks: progress items from ACT sections with in_progress status
      const pendingTasks = doc.sections
        .filter(s => s.mode === 'ACT' && s.status === 'in_progress')
        .flatMap(s => s.progress ?? []);

      return {
        decisions,
        pendingTasks,
        currentMode: doc.metadata.currentMode,
      };
    } catch (error) {
      this.logger.debug(
        `Failed to parse context: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return { decisions: [], pendingTasks: [], currentMode: 'PLAN' };
    }
  }

  /**
   * Get changed files from git diff --stat.
   */
  private getChangedFiles(projectRoot: string): string[] {
    try {
      const output = execSync('git diff --stat', {
        cwd: projectRoot,
        encoding: 'buffer',
      });
      return this.parseGitDiffStat(output.toString('utf-8'));
    } catch {
      this.logger.debug('Failed to get git diff, possibly not a git repository');
      return [];
    }
  }

  /**
   * Generate a resume command based on current session state.
   */
  private generateResumeCommand(
    currentMode: string,
    pendingTasks: string[],
    decisions: string[],
  ): string {
    if (pendingTasks.length > 0) {
      return `ACT continue implementing — ${pendingTasks.length} task(s) in progress`;
    }
    if (decisions.length > 0 && currentMode === 'PLAN') {
      return `ACT execute the plan — ${decisions.length} decision(s) made`;
    }
    if (currentMode === 'ACT') {
      return 'EVAL review the implementation';
    }
    return 'PLAN start a new task';
  }

  /**
   * Generate briefing markdown content.
   */
  private generateBriefingMarkdown(data: {
    decisions: string[];
    pendingTasks: string[];
    changedFiles: string[];
    resumeCommand: string;
  }): string {
    const lines: string[] = [
      '# Session Briefing',
      '',
      `> Generated: ${new Date().toISOString()}`,
      '',
    ];

    // Decisions
    lines.push('## Decisions');
    lines.push('');
    if (data.decisions.length > 0) {
      for (const decision of data.decisions) {
        lines.push(`- ${decision}`);
      }
    } else {
      lines.push('No decisions recorded.');
    }
    lines.push('');

    // Changed Files
    lines.push('## Changed Files');
    lines.push('');
    if (data.changedFiles.length > 0) {
      for (const file of data.changedFiles) {
        lines.push(`- \`${file}\``);
      }
    } else {
      lines.push('No changed files.');
    }
    lines.push('');

    // Pending Tasks
    lines.push('## Pending Tasks');
    lines.push('');
    if (data.pendingTasks.length > 0) {
      for (const task of data.pendingTasks) {
        lines.push(`- [ ] ${task}`);
      }
    } else {
      lines.push('No pending tasks.');
    }
    lines.push('');

    // Resume Command
    lines.push('## Resume Command');
    lines.push('');
    lines.push(`\`\`\`\n${data.resumeCommand}\n\`\`\``);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Write briefing content to the briefings directory.
   */
  private async writeBriefing(projectRoot: string, content: string): Promise<string> {
    const briefingDir = path.join(projectRoot, BRIEFING_DIR);

    if (!existsSync(briefingDir)) {
      mkdirSync(briefingDir, { recursive: true });
      this.logger.log(`Created briefing directory: ${briefingDir}`);
    }

    const filename = generateBriefingFilename();
    const filePath = path.join(briefingDir, filename);

    await withTimeout(fs.writeFile(filePath, content, 'utf-8'), {
      timeoutMs: CONTEXT_FILE_TIMEOUT_MS,
      operationName: 'write briefing file',
    });

    this.logger.log(`Created briefing: ${BRIEFING_DIR}/${filename}`);
    return `${BRIEFING_DIR}/${filename}`;
  }
}
