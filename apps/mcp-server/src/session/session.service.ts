/**
 * Session Service
 *
 * Manages session documents for PLAN/ACT/EVAL workflow.
 * Uses extracted modules for parsing, serialization, and caching.
 */

import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import * as path from 'path';
import type {
  SessionDocument,
  SessionSection,
  SessionMetadata,
  CreateSessionOptions,
  UpdateSessionOptions,
  SessionOperationResult,
} from './session.types';
import { ConfigService } from '../config/config.service';
import { generateSlug } from '../shared/slug.utils';
import { withTimeout } from '../shared/async.utils';
import { parseDocument } from './session.parser';
import { serializeDocument, LANGUAGE_TO_LOCALE } from './session.serializer';
import { SessionCache } from './session.cache';

const SESSIONS_DIR_NAME = 'docs/codingbuddy/sessions';

/** Timeout for session file operations in milliseconds (5 seconds) */
const SESSION_FILE_TIMEOUT_MS = 5000;

/**
 * Session ID validation pattern.
 * Allows: lowercase letters, numbers, Korean characters, hyphens.
 * Prevents: path traversal, special characters, null bytes.
 */
const SESSION_ID_PATTERN = /^[a-z0-9가-힣-]+$/;

/** Maximum length for session title to prevent filesystem issues. */
const MAX_SESSION_TITLE_LENGTH = 200;

/** Maximum length for slug in filename generation. */
const MAX_SLUG_LENGTH = 100;

/** Maximum length for session ID to prevent DoS. */
const MAX_SESSION_ID_LENGTH = 150;

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly cache = new SessionCache();

  constructor(private readonly configService: ConfigService) {}

  /**
   * Get the sessions directory path.
   */
  private getSessionsDir(): string {
    const projectRoot = this.configService.getProjectRoot();
    return path.join(projectRoot, SESSIONS_DIR_NAME);
  }

  /**
   * Ensure sessions directory exists.
   */
  private ensureSessionsDir(): void {
    const sessionsDir = this.getSessionsDir();
    if (!existsSync(sessionsDir)) {
      mkdirSync(sessionsDir, { recursive: true });
      this.logger.log(`Created sessions directory: ${sessionsDir}`);
    }
  }

  /**
   * Validate session ID to prevent path traversal attacks and DoS.
   */
  private validateSessionId(sessionId: string): boolean {
    if (!sessionId || sessionId.length === 0) {
      this.logger.warn(`Session ID is empty: rejected`);
      return false;
    }

    if (sessionId.length > MAX_SESSION_ID_LENGTH) {
      this.logger.warn(`Session ID exceeds maximum length: rejected`);
      return false;
    }

    if (sessionId.includes('\x00')) {
      this.logger.warn(`Session ID contains null byte: rejected`);
      return false;
    }

    if (
      sessionId.includes('..') ||
      sessionId.includes('/') ||
      sessionId.includes('\\')
    ) {
      this.logger.warn(`Session ID contains path traversal: rejected`);
      return false;
    }

    if (!SESSION_ID_PATTERN.test(sessionId)) {
      this.logger.warn(`Session ID contains invalid characters: rejected`);
      return false;
    }

    return true;
  }

  /**
   * Get the file path for a session, with security validation.
   */
  private getSessionFilePath(sessionId: string): string | null {
    if (!this.validateSessionId(sessionId)) {
      return null;
    }

    const filePath = path.join(this.getSessionsDir(), `${sessionId}.md`);
    const resolvedPath = path.resolve(filePath);
    const resolvedSessionsDir = path.resolve(this.getSessionsDir());

    if (!resolvedPath.startsWith(resolvedSessionsDir + path.sep)) {
      this.logger.warn(
        `Session path escaped sessions directory: ${resolvedPath}`,
      );
      return null;
    }

    return filePath;
  }

  /**
   * Validate session title.
   */
  private validateTitle(title: string): string | null {
    if (!title || title.trim().length === 0) {
      return 'Title cannot be empty';
    }
    if (title.length > MAX_SESSION_TITLE_LENGTH) {
      return `Title exceeds maximum length of ${MAX_SESSION_TITLE_LENGTH} characters`;
    }
    return null;
  }

  /**
   * Generate session filename from title and date.
   */
  private generateFilename(title: string): string {
    const date = new Date().toISOString().split('T')[0];
    const slug = generateSlug(title, MAX_SLUG_LENGTH);
    return `${date}-${slug}.md`;
  }

  /**
   * Create a new session document.
   */
  async createSession(
    options: CreateSessionOptions,
  ): Promise<SessionOperationResult> {
    try {
      const titleError = this.validateTitle(options.title);
      if (titleError) {
        return { success: false, error: titleError };
      }

      this.ensureSessionsDir();

      const filename = this.generateFilename(options.title);
      const filePath = path.join(this.getSessionsDir(), filename);

      if (existsSync(filePath)) {
        return {
          success: true,
          sessionId: filename.replace('.md', ''),
          filePath,
          message: `Session already exists: ${filename}`,
        };
      }

      const now = new Date().toISOString();
      const metadata: SessionMetadata = {
        id: filename.replace('.md', ''),
        title: options.title,
        createdAt: now,
        updatedAt: now,
        status: 'active',
      };

      const document: SessionDocument = {
        metadata,
        sections: [],
      };

      const language = (await this.configService.getLanguage()) || 'en';
      const content = serializeDocument(document, language);
      await withTimeout(fs.writeFile(filePath, content, 'utf-8'), {
        timeoutMs: SESSION_FILE_TIMEOUT_MS,
        operationName: 'write session file',
      });

      this.cache.invalidateActiveSession();
      this.logger.log(`Created session: ${filename}`);

      return {
        success: true,
        sessionId: metadata.id,
        filePath,
        message: `Session created: ${filename}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create session: ${message}`);
      return { success: false, error: message };
    }
  }

  /**
   * Get a session document by ID.
   */
  async getSession(sessionId: string): Promise<SessionDocument | null> {
    try {
      const cached = this.cache.get(sessionId);
      if (cached) {
        return cached;
      }

      const filePath = this.getSessionFilePath(sessionId);
      if (!filePath) {
        this.logger.debug(`Invalid session ID: ${sessionId}`);
        return null;
      }

      if (!existsSync(filePath)) {
        this.logger.debug(`Session not found: ${sessionId}`);
        return null;
      }

      const content = await withTimeout(fs.readFile(filePath, 'utf-8'), {
        timeoutMs: SESSION_FILE_TIMEOUT_MS,
        operationName: 'read session file',
      });
      const session = parseDocument(content, sessionId);

      this.cache.set(sessionId, session);
      return session;
    } catch (error) {
      this.logger.error(
        `Failed to read session ${sessionId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  /**
   * Get the most recent active session.
   */
  async getActiveSession(): Promise<SessionDocument | null> {
    try {
      const cachedId = this.cache.getActiveSessionId();
      if (cachedId) {
        const session = await this.getSession(cachedId);
        if (session && session.metadata.status === 'active') {
          return session;
        }
        this.cache.invalidateActiveSession();
      }

      const sessionsDir = this.getSessionsDir();
      if (!existsSync(sessionsDir)) {
        return null;
      }

      const files = await fs.readdir(sessionsDir);
      const mdFiles = files
        .filter(f => f.endsWith('.md'))
        .sort()
        .reverse();

      for (const file of mdFiles) {
        const sessionId = file.replace('.md', '');
        const session = await this.getSession(sessionId);

        if (session && session.metadata.status === 'active') {
          this.cache.setActiveSessionId(sessionId);
          return session;
        }
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Failed to get active session: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  /**
   * Update a session with a new or updated section.
   */
  async updateSession(
    options: UpdateSessionOptions,
  ): Promise<SessionOperationResult> {
    try {
      const session = await this.getSession(options.sessionId);
      if (!session) {
        return {
          success: false,
          error: `Session not found: ${options.sessionId}`,
        };
      }

      const now = new Date().toISOString();
      const language = (await this.configService.getLanguage()) || 'en';
      const locale = LANGUAGE_TO_LOCALE[language] || 'en-US';
      const timestamp = new Date().toLocaleString(locale, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      const existingIndex = session.sections.findIndex(
        s => s.mode === options.section.mode,
      );

      const newSection: SessionSection = {
        ...options.section,
        timestamp: options.section.timestamp || timestamp,
      };

      if (existingIndex >= 0) {
        const existing = session.sections[existingIndex];
        session.sections[existingIndex] = this.mergeSection(
          existing,
          newSection,
        );
      } else {
        session.sections.push(newSection);
      }

      session.metadata.updatedAt = now;

      const filePath = this.getSessionFilePath(options.sessionId);
      if (!filePath) {
        return {
          success: false,
          error: `Invalid session ID: ${options.sessionId}`,
        };
      }

      const content = serializeDocument(session, language);
      await withTimeout(fs.writeFile(filePath, content, 'utf-8'), {
        timeoutMs: SESSION_FILE_TIMEOUT_MS,
        operationName: 'update session file',
      });

      this.cache.invalidate(options.sessionId);
      this.logger.log(
        `Updated session ${options.sessionId}: ${options.section.mode} section`,
      );

      return {
        success: true,
        sessionId: options.sessionId,
        filePath,
        message: `Session updated: ${options.section.mode} section`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update session: ${message}`);
      return { success: false, error: message };
    }
  }

  /**
   * Merge two sections with accumulation logic.
   */
  private mergeSection(
    existing: SessionSection,
    newSection: SessionSection,
  ): SessionSection {
    const mergedDecisions = this.mergeArrays(
      existing.decisions,
      newSection.decisions,
    );
    const mergedNotes = this.mergeArrays(existing.notes, newSection.notes);

    return {
      ...existing,
      ...newSection,
      decisions: mergedDecisions.length > 0 ? mergedDecisions : undefined,
      notes: mergedNotes.length > 0 ? mergedNotes : undefined,
    };
  }

  /**
   * Merge two arrays, deduplicating entries.
   */
  private mergeArrays(
    existing: string[] | undefined,
    newItems: string[] | undefined,
  ): string[] {
    const existingSet = new Set(existing || []);
    const newArray = [...existingSet];

    for (const item of newItems || []) {
      if (!existingSet.has(item)) {
        newArray.push(item);
        existingSet.add(item);
      }
    }

    return newArray;
  }

  /**
   * Get recommended ACT agent from PLAN section of a session.
   */
  async getRecommendedActAgent(
    sessionId: string,
  ): Promise<{ agent: string; confidence: number } | null> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }

    const planSection = session.sections.find(s => s.mode === 'PLAN');
    if (planSection?.recommendedActAgent) {
      return {
        agent: planSection.recommendedActAgent,
        confidence: planSection.recommendedActAgentConfidence || 0,
      };
    }

    return null;
  }
}
