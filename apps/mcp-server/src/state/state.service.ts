import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import * as path from 'path';
import { ConfigService } from '../config/config.service';
import type { Mode } from '../keyword/keyword.types';
import {
  STATE_DIR_NAME,
  STATE_FILES,
  STATE_SCHEMA_VERSION,
  type ProjectMetadata,
  type StateDocument,
  type StateOperationResult,
  type ModeConfigSnapshot,
} from './state.types';

/**
 * StateService - File-based state persistence for context reliability
 *
 * This service implements Option C (Hybrid approach):
 * - Document files for important state (project metadata, last mode, last session)
 * - Memory cache remains for performance-sensitive data
 *
 * State is persisted to .codingbuddy/state/ directory
 */
@Injectable()
export class StateService {
  private readonly logger = new Logger(StateService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Get the state directory path
   */
  getStateDir(): string {
    const projectRoot = this.configService.getProjectRoot();
    return path.join(projectRoot, STATE_DIR_NAME);
  }

  /**
   * Ensure state directory exists
   */
  private ensureStateDir(): void {
    const stateDir = this.getStateDir();
    if (!existsSync(stateDir)) {
      mkdirSync(stateDir, { recursive: true });
      this.logger.log(`Created state directory: ${stateDir}`);
    }
  }

  /**
   * Get the file path for a state file
   */
  private getStateFilePath(fileName: string): string {
    return path.join(this.getStateDir(), fileName);
  }

  /**
   * Save project metadata to file
   */
  async saveProjectMetadata(
    metadata: ProjectMetadata,
  ): Promise<StateOperationResult> {
    try {
      this.ensureStateDir();

      const doc: StateDocument = {
        version: STATE_SCHEMA_VERSION,
        project: metadata,
        updatedAt: new Date().toISOString(),
      };

      const filePath = this.getStateFilePath(STATE_FILES.PROJECT_METADATA);
      await fs.writeFile(filePath, JSON.stringify(doc, null, 2), 'utf-8');

      this.logger.debug(`Saved project metadata to ${filePath}`);
      return { success: true, message: 'Project metadata saved' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to save project metadata: ${message}`);
      return { success: false, error: message };
    }
  }

  /**
   * Load project metadata from file
   * Returns null if file doesn't exist or is invalid
   */
  async loadProjectMetadata(): Promise<ProjectMetadata | null> {
    try {
      const filePath = this.getStateFilePath(STATE_FILES.PROJECT_METADATA);

      if (!existsSync(filePath)) {
        this.logger.debug('Project metadata file not found');
        return null;
      }

      const content = await fs.readFile(filePath, 'utf-8');
      const doc = JSON.parse(content) as StateDocument;

      // Version check for schema migration
      if (doc.version !== STATE_SCHEMA_VERSION) {
        this.logger.warn(
          `State schema version mismatch: expected ${STATE_SCHEMA_VERSION}, got ${doc.version}`,
        );
        return null;
      }

      return doc.project;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to load project metadata: ${message}`);
      return null;
    }
  }

  /**
   * Load the full state document
   * Returns null if file doesn't exist or is invalid
   */
  private async loadStateDocument(): Promise<StateDocument | null> {
    try {
      const filePath = this.getStateFilePath(STATE_FILES.PROJECT_METADATA);

      if (!existsSync(filePath)) {
        return null;
      }

      const content = await fs.readFile(filePath, 'utf-8');
      const doc = JSON.parse(content) as StateDocument;

      if (doc.version !== STATE_SCHEMA_VERSION) {
        return null;
      }

      return doc;
    } catch {
      return null;
    }
  }

  /**
   * Update last mode in project metadata
   */
  async updateLastMode(mode: Mode): Promise<StateOperationResult> {
    try {
      const existing = await this.loadStateDocument();

      if (existing) {
        existing.project.lastMode = mode;
        existing.updatedAt = new Date().toISOString();

        const filePath = this.getStateFilePath(STATE_FILES.PROJECT_METADATA);
        await fs.writeFile(
          filePath,
          JSON.stringify(existing, null, 2),
          'utf-8',
        );

        this.logger.debug(`Updated lastMode to ${mode}`);
        return { success: true, message: `Last mode updated to ${mode}` };
      }

      // Create new metadata if not exists
      const projectRoot = this.configService.getProjectRoot();
      return this.saveProjectMetadata({
        projectRoot,
        detectedAt: new Date().toISOString(),
        lastMode: mode,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update last mode: ${message}`);
      return { success: false, error: message };
    }
  }

  /**
   * Update last session ID in project metadata
   */
  async updateLastSession(sessionId: string): Promise<StateOperationResult> {
    try {
      const existing = await this.loadStateDocument();

      if (existing) {
        existing.project.lastSessionId = sessionId;
        existing.updatedAt = new Date().toISOString();

        const filePath = this.getStateFilePath(STATE_FILES.PROJECT_METADATA);
        await fs.writeFile(
          filePath,
          JSON.stringify(existing, null, 2),
          'utf-8',
        );

        this.logger.debug(`Updated lastSessionId to ${sessionId}`);
        return {
          success: true,
          message: `Last session updated to ${sessionId}`,
        };
      }

      // Create new metadata if not exists
      const projectRoot = this.configService.getProjectRoot();
      return this.saveProjectMetadata({
        projectRoot,
        detectedAt: new Date().toISOString(),
        lastSessionId: sessionId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update last session: ${message}`);
      return { success: false, error: message };
    }
  }

  /**
   * Save mode configuration snapshot
   */
  async saveModeConfigSnapshot(
    snapshot: ModeConfigSnapshot,
  ): Promise<StateOperationResult> {
    try {
      this.ensureStateDir();

      const filePath = this.getStateFilePath(STATE_FILES.MODE_CONFIG);
      await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');

      this.logger.debug(`Saved mode config snapshot to ${filePath}`);
      return { success: true, message: 'Mode config snapshot saved' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to save mode config snapshot: ${message}`);
      return { success: false, error: message };
    }
  }

  /**
   * Load mode configuration snapshot
   * Returns null if file doesn't exist or is invalid
   */
  async loadModeConfigSnapshot(): Promise<ModeConfigSnapshot | null> {
    try {
      const filePath = this.getStateFilePath(STATE_FILES.MODE_CONFIG);

      if (!existsSync(filePath)) {
        return null;
      }

      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as ModeConfigSnapshot;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to load mode config snapshot: ${message}`);
      return null;
    }
  }

  /**
   * Clear all state files
   */
  async clearState(): Promise<StateOperationResult> {
    try {
      const stateDir = this.getStateDir();
      const files = Object.values(STATE_FILES);

      for (const fileName of files) {
        const filePath = path.join(stateDir, fileName);
        try {
          await fs.unlink(filePath);
          this.logger.debug(`Deleted state file: ${filePath}`);
        } catch (error) {
          // Ignore ENOENT (file not found) errors
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw error;
          }
        }
      }

      return { success: true, message: 'State cleared' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to clear state: ${message}`);
      return { success: false, error: message };
    }
  }

  /**
   * Get last mode from persisted state
   * Useful for recovering context after context compaction
   */
  async getLastMode(): Promise<Mode | null> {
    const metadata = await this.loadProjectMetadata();
    return metadata?.lastMode ?? null;
  }

  /**
   * Get last session ID from persisted state
   * Useful for recovering context after context compaction
   */
  async getLastSessionId(): Promise<string | null> {
    const metadata = await this.loadProjectMetadata();
    return metadata?.lastSessionId ?? null;
  }
}
