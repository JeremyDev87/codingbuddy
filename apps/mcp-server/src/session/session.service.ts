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
import type { Mode } from '../keyword/keyword.types';
import { ConfigService } from '../config/config.service';

/**
 * Session document file format:
 * - Markdown file with YAML-like frontmatter for metadata
 * - Sections separated by `---`
 * - Each section has mode, timestamp, and content
 */

const SESSIONS_DIR_NAME = 'docs/codingbuddy/sessions';

/**
 * Markdown format constants for session documents.
 */
const MARKDOWN = {
  SESSION_HEADER: '# Session:',
  CREATED_PREFIX: '**Created**:',
  UPDATED_PREFIX: '**Updated**:',
  STATUS_PREFIX: '**Status**:',
  PRIMARY_AGENT_PREFIX: '**Primary Agent**:',
  RECOMMENDED_ACT_AGENT_PREFIX: '**Recommended ACT Agent**:',
  SPECIALISTS_PREFIX: '**Specialists**:',
  SECTION_SEPARATOR: '---',
  TASK_HEADER: '### Task',
  DECISIONS_HEADER: '### Decisions',
  NOTES_HEADER: '### Notes',
} as const;

/**
 * Session ID validation pattern.
 * Allows: lowercase letters, numbers, Korean characters, hyphens.
 * Prevents: path traversal, special characters, null bytes.
 */
const SESSION_ID_PATTERN = /^[a-z0-9가-힣-]+$/;

/**
 * Maximum length for session title to prevent filesystem issues.
 */
const MAX_SESSION_TITLE_LENGTH = 200;

/**
 * Maximum length for slug in filename generation.
 */
const MAX_SLUG_LENGTH = 100;

/**
 * Maximum length for session ID to prevent DoS.
 */
const MAX_SESSION_ID_LENGTH = 150;

/**
 * Cache TTL in milliseconds (30 seconds).
 * Short TTL balances performance with freshness.
 */
const CACHE_TTL_MS = 30_000;

/**
 * Maximum number of sessions to cache.
 * Prevents unbounded memory growth in long-running servers.
 */
const MAX_CACHE_SIZE = 100;

/**
 * Valid session status values for type-safe parsing.
 */
const VALID_SESSION_STATUSES = ['active', 'completed', 'archived'] as const;
const VALID_SECTION_STATUSES = ['in_progress', 'completed', 'blocked'] as const;

/**
 * Pattern to match section headers: ## MODE (timestamp)
 */
const SECTION_HEADER_PATTERN = /^## (PLAN|ACT|EVAL|AUTO) \((.+)\)$/;

/**
 * Pattern to match recommended ACT agent line.
 */
const RECOMMENDED_AGENT_PATTERN =
  /\*\*Recommended ACT Agent\*\*: ([^\s(]+)(?:\s*\(confidence: ([\d.]+)\))?/;

/**
 * Type guard for session metadata status.
 */
function isValidSessionStatus(
  value: string,
): value is SessionMetadata['status'] {
  return VALID_SESSION_STATUSES.includes(value as SessionMetadata['status']);
}

/**
 * Type guard for section status.
 */
function isValidSectionStatus(
  value: string,
): value is NonNullable<SessionSection['status']> {
  return VALID_SECTION_STATUSES.includes(
    value as NonNullable<SessionSection['status']>,
  );
}

/**
 * Context for parsing session documents.
 * Extracted to reduce cyclomatic complexity.
 */
interface ParseContext {
  metadata: SessionMetadata;
  sections: SessionSection[];
  currentSection: Partial<SessionSection> | null;
  currentListType: 'decisions' | 'notes' | null;
}

/**
 * Parse metadata line (title, created, updated, status).
 * @returns true if line was handled as metadata
 */
function parseMetadataLine(line: string, ctx: ParseContext): boolean {
  if (line.startsWith(MARKDOWN.SESSION_HEADER)) {
    ctx.metadata.title = line.replace(MARKDOWN.SESSION_HEADER, '').trim();
    return true;
  }
  if (line.startsWith(MARKDOWN.CREATED_PREFIX)) {
    ctx.metadata.createdAt = line.replace(MARKDOWN.CREATED_PREFIX, '').trim();
    return true;
  }
  if (line.startsWith(MARKDOWN.UPDATED_PREFIX)) {
    ctx.metadata.updatedAt = line.replace(MARKDOWN.UPDATED_PREFIX, '').trim();
    return true;
  }
  if (line.startsWith(MARKDOWN.STATUS_PREFIX) && !ctx.currentSection) {
    const statusValue = line.replace(MARKDOWN.STATUS_PREFIX, '').trim();
    if (isValidSessionStatus(statusValue)) {
      ctx.metadata.status = statusValue;
    }
    return true;
  }
  return false;
}

/**
 * Parse section header line (## MODE (timestamp)).
 * @returns true if line was a section header
 */
function parseSectionHeader(line: string, ctx: ParseContext): boolean {
  const match = line.match(SECTION_HEADER_PATTERN);
  if (!match) return false;

  // Save previous section
  if (ctx.currentSection && ctx.currentSection.mode) {
    ctx.sections.push(ctx.currentSection as SessionSection);
  }

  ctx.currentSection = {
    mode: match[1] as Mode,
    timestamp: match[2],
  };
  ctx.currentListType = null;
  return true;
}

/**
 * Parse section field line (primary agent, recommended agent, specialists, status).
 * @returns true if line was handled as a section field
 */
function parseSectionField(
  line: string,
  section: Partial<SessionSection>,
): boolean {
  if (line.startsWith(MARKDOWN.PRIMARY_AGENT_PREFIX)) {
    section.primaryAgent = line
      .replace(MARKDOWN.PRIMARY_AGENT_PREFIX, '')
      .trim();
    return true;
  }
  if (line.startsWith(MARKDOWN.RECOMMENDED_ACT_AGENT_PREFIX)) {
    const match = line.match(RECOMMENDED_AGENT_PATTERN);
    if (match) {
      section.recommendedActAgent = match[1];
      if (match[2]) {
        section.recommendedActAgentConfidence = parseFloat(match[2]);
      }
    }
    return true;
  }
  if (line.startsWith(MARKDOWN.SPECIALISTS_PREFIX)) {
    section.specialists = line
      .replace(MARKDOWN.SPECIALISTS_PREFIX, '')
      .trim()
      .split(',')
      .map(s => s.trim());
    return true;
  }
  if (line.startsWith(MARKDOWN.STATUS_PREFIX)) {
    const statusValue = line.replace(MARKDOWN.STATUS_PREFIX, '').trim();
    if (isValidSectionStatus(statusValue)) {
      section.status = statusValue;
    }
    return true;
  }
  return false;
}

/**
 * Result of parsing a list header line.
 */
type ListHeaderResult =
  | { matched: true; listType: 'task' | 'decisions' | 'notes' }
  | { matched: false };

/**
 * Cache entry for session documents.
 */
interface SessionCacheEntry {
  session: SessionDocument;
  timestamp: number;
}

/**
 * Parse section list header (### Task, ### Decisions, ### Notes).
 * @returns parsed result with matched flag and list type
 */
function parseListHeader(
  line: string,
  section: Partial<SessionSection>,
): ListHeaderResult {
  if (line === MARKDOWN.TASK_HEADER) {
    return { matched: true, listType: 'task' };
  }
  if (line === MARKDOWN.DECISIONS_HEADER) {
    section.decisions = [];
    return { matched: true, listType: 'decisions' };
  }
  if (line === MARKDOWN.NOTES_HEADER) {
    section.notes = [];
    return { matched: true, listType: 'notes' };
  }
  return { matched: false };
}

/**
 * Check if line is content (not structural markdown).
 */
function isContentLine(line: string): boolean {
  return (
    !line.startsWith('#') &&
    !line.startsWith('**') &&
    !line.startsWith('-') &&
    !line.startsWith('---') &&
    line.trim().length > 0
  );
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  /** Session cache by ID */
  private readonly sessionCache = new Map<string, SessionCacheEntry>();

  /** Cached active session ID (invalidated on write operations) */
  private activeSessionId: string | null = null;
  private activeSessionTimestamp = 0;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Check if a cache entry is still valid (within TTL).
   */
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < CACHE_TTL_MS;
  }

  /**
   * Get session from cache if valid.
   */
  private getFromCache(sessionId: string): SessionDocument | null {
    const entry = this.sessionCache.get(sessionId);
    if (entry && this.isCacheValid(entry.timestamp)) {
      return entry.session;
    }
    // Clean up stale entry
    if (entry) {
      this.sessionCache.delete(sessionId);
    }
    return null;
  }

  /**
   * Add session to cache with LRU eviction when size limit reached.
   */
  private addToCache(sessionId: string, session: SessionDocument): void {
    // If updating existing entry, delete first to refresh order (Map maintains insertion order)
    if (this.sessionCache.has(sessionId)) {
      this.sessionCache.delete(sessionId);
    }

    // Evict oldest entries if cache is at max size
    while (this.sessionCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = this.sessionCache.keys().next().value;
      if (oldestKey !== undefined) {
        this.sessionCache.delete(oldestKey);
      } else {
        break;
      }
    }

    this.sessionCache.set(sessionId, {
      session,
      timestamp: Date.now(),
    });
  }

  /**
   * Invalidate all caches (called on write operations).
   */
  private invalidateCache(): void {
    this.sessionCache.clear();
    this.activeSessionId = null;
    this.activeSessionTimestamp = 0;
  }

  /**
   * Invalidate a specific session from cache.
   * More efficient than full cache invalidation for single-session updates.
   */
  private invalidateSession(sessionId: string): void {
    this.sessionCache.delete(sessionId);
    // Also invalidate active session cache if it matches
    if (this.activeSessionId === sessionId) {
      this.activeSessionId = null;
      this.activeSessionTimestamp = 0;
    }
  }

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
   * @param sessionId - The session ID to validate
   * @returns true if valid, false if potentially malicious
   */
  private validateSessionId(sessionId: string): boolean {
    // Reject empty session ID
    if (!sessionId || sessionId.length === 0) {
      this.logger.warn(`Session ID is empty: rejected`);
      return false;
    }

    // Reject excessively long session ID (DoS prevention)
    if (sessionId.length > MAX_SESSION_ID_LENGTH) {
      this.logger.warn(`Session ID exceeds maximum length: rejected`);
      return false;
    }

    // Reject null bytes (null byte injection)
    if (sessionId.includes('\x00')) {
      this.logger.warn(`Session ID contains null byte: rejected`);
      return false;
    }

    // Reject path traversal sequences
    if (
      sessionId.includes('..') ||
      sessionId.includes('/') ||
      sessionId.includes('\\')
    ) {
      this.logger.warn(`Session ID contains path traversal: rejected`);
      return false;
    }

    // Must match safe pattern
    if (!SESSION_ID_PATTERN.test(sessionId)) {
      this.logger.warn(`Session ID contains invalid characters: rejected`);
      return false;
    }

    return true;
  }

  /**
   * Get the file path for a session, with security validation.
   * @param sessionId - The session ID
   * @returns File path if valid, null if validation fails
   */
  private getSessionFilePath(sessionId: string): string | null {
    if (!this.validateSessionId(sessionId)) {
      return null;
    }

    const filePath = path.join(this.getSessionsDir(), `${sessionId}.md`);
    const resolvedPath = path.resolve(filePath);
    const resolvedSessionsDir = path.resolve(this.getSessionsDir());

    // Double-check: ensure resolved path is within sessions directory
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
   * @param title - The title to validate
   * @returns Error message if invalid, null if valid
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
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, MAX_SLUG_LENGTH);
    return `${date}-${slug}.md`;
  }

  /**
   * Create a new session document.
   */
  async createSession(
    options: CreateSessionOptions,
  ): Promise<SessionOperationResult> {
    try {
      // Validate title
      const titleError = this.validateTitle(options.title);
      if (titleError) {
        return { success: false, error: titleError };
      }

      this.ensureSessionsDir();

      const filename = this.generateFilename(options.title);
      const filePath = path.join(this.getSessionsDir(), filename);

      // Check if file already exists
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

      const content = this.serializeDocument(document);
      await fs.writeFile(filePath, content, 'utf-8');

      // Invalidate active session cache (new session may become active)
      // No need to clear session cache since no existing sessions are modified
      this.activeSessionId = null;
      this.activeSessionTimestamp = 0;

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
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Get a session document by ID.
   */
  async getSession(sessionId: string): Promise<SessionDocument | null> {
    try {
      // Check cache first
      const cached = this.getFromCache(sessionId);
      if (cached) {
        return cached;
      }

      // Security: validate session ID and get safe file path
      const filePath = this.getSessionFilePath(sessionId);
      if (!filePath) {
        this.logger.debug(`Invalid session ID: ${sessionId}`);
        return null;
      }

      if (!existsSync(filePath)) {
        this.logger.debug(`Session not found: ${sessionId}`);
        return null;
      }

      const content = await fs.readFile(filePath, 'utf-8');
      const session = this.parseDocument(content, sessionId);

      // Add to cache
      this.addToCache(sessionId, session);

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
   * Uses cached active session ID to avoid directory scan when possible.
   */
  async getActiveSession(): Promise<SessionDocument | null> {
    try {
      // Check if we have a cached active session ID that's still valid
      if (
        this.activeSessionId &&
        this.isCacheValid(this.activeSessionTimestamp)
      ) {
        const session = await this.getSession(this.activeSessionId);
        if (session && session.metadata.status === 'active') {
          return session;
        }
        // Cached ID is stale (session no longer active), clear it
        this.activeSessionId = null;
        this.activeSessionTimestamp = 0;
      }

      const sessionsDir = this.getSessionsDir();

      if (!existsSync(sessionsDir)) {
        return null;
      }

      const files = await fs.readdir(sessionsDir);
      const mdFiles = files
        .filter(f => f.endsWith('.md'))
        .sort()
        .reverse(); // Most recent first

      for (const file of mdFiles) {
        const sessionId = file.replace('.md', '');
        const session = await this.getSession(sessionId);

        if (session && session.metadata.status === 'active') {
          // Cache the active session ID
          this.activeSessionId = sessionId;
          this.activeSessionTimestamp = Date.now();
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
      const timestamp = new Date().toLocaleString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      // Find existing section for this mode or create new
      const existingIndex = session.sections.findIndex(
        s => s.mode === options.section.mode,
      );

      // Spread options.section first, then override timestamp if not provided
      const section: SessionSection = {
        ...options.section,
        timestamp: options.section.timestamp || timestamp,
      };

      if (existingIndex >= 0) {
        // Update existing section
        session.sections[existingIndex] = {
          ...session.sections[existingIndex],
          ...section,
        };
      } else {
        // Add new section
        session.sections.push(section);
      }

      // Update metadata
      session.metadata.updatedAt = now;

      // Write back (session ID already validated by getSession above)
      const filePath = this.getSessionFilePath(options.sessionId);
      if (!filePath) {
        return {
          success: false,
          error: `Invalid session ID: ${options.sessionId}`,
        };
      }

      const content = this.serializeDocument(session);
      await fs.writeFile(filePath, content, 'utf-8');

      // Invalidate only the updated session from cache
      this.invalidateSession(options.sessionId);

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
      return {
        success: false,
        error: message,
      };
    }
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

  /**
   * Serialize a session document to markdown.
   */
  private serializeDocument(doc: SessionDocument): string {
    const lines: string[] = [];

    // Header
    lines.push(`# Session: ${doc.metadata.title}`);
    lines.push('');
    lines.push(`**Created**: ${doc.metadata.createdAt}`);
    lines.push(`**Updated**: ${doc.metadata.updatedAt}`);
    lines.push(`**Status**: ${doc.metadata.status}`);
    lines.push('');
    lines.push('---');

    // Sections
    for (const section of doc.sections) {
      lines.push('');
      lines.push(`## ${section.mode} (${section.timestamp})`);
      lines.push('');

      if (section.primaryAgent) {
        lines.push(`**Primary Agent**: ${section.primaryAgent}`);
      }

      if (section.recommendedActAgent) {
        const confidence = section.recommendedActAgentConfidence
          ? ` (confidence: ${section.recommendedActAgentConfidence})`
          : '';
        lines.push(
          `**Recommended ACT Agent**: ${section.recommendedActAgent}${confidence}`,
        );
      }

      if (section.specialists && section.specialists.length > 0) {
        lines.push(`**Specialists**: ${section.specialists.join(', ')}`);
      }

      if (section.status) {
        lines.push(`**Status**: ${section.status}`);
      }

      lines.push('');

      if (section.task) {
        lines.push('### Task');
        lines.push(section.task);
        lines.push('');
      }

      if (section.decisions && section.decisions.length > 0) {
        lines.push('### Decisions');
        for (const decision of section.decisions) {
          lines.push(`- ${decision}`);
        }
        lines.push('');
      }

      if (section.notes && section.notes.length > 0) {
        lines.push('### Notes');
        for (const note of section.notes) {
          lines.push(`- ${note}`);
        }
        lines.push('');
      }

      lines.push('---');
    }

    return lines.join('\n');
  }

  /**
   * Parse a markdown session document.
   * Refactored to use helper functions for reduced cyclomatic complexity.
   */
  private parseDocument(content: string, sessionId: string): SessionDocument {
    const lines = content.split('\n');
    const ctx: ParseContext = {
      metadata: {
        id: sessionId,
        title: sessionId,
        createdAt: '',
        updatedAt: '',
        status: 'active',
      },
      sections: [],
      currentSection: null,
      currentListType: null,
    };

    for (const line of lines) {
      // Try parsing in order of precedence
      if (parseMetadataLine(line, ctx)) continue;
      if (parseSectionHeader(line, ctx)) continue;
      if (ctx.currentSection) {
        this.parseSectionContentLine(line, ctx);
      }
    }

    // Save last section
    if (ctx.currentSection && ctx.currentSection.mode) {
      ctx.sections.push(ctx.currentSection as SessionSection);
    }

    return { metadata: ctx.metadata, sections: ctx.sections };
  }

  /**
   * Parse a single line of section content.
   * Extracted to reduce cyclomatic complexity of parseDocument.
   */
  private parseSectionContentLine(line: string, ctx: ParseContext): void {
    if (!ctx.currentSection) return;
    const section = ctx.currentSection;

    // Try parsing as section field (primary agent, specialists, etc.)
    if (parseSectionField(line, section)) return;

    // Try parsing as list header
    const listResult = parseListHeader(line, section);
    if (listResult.matched) {
      // 'task' resets list type (content follows), 'decisions'/'notes' start list collection
      ctx.currentListType =
        listResult.listType === 'task' ? null : listResult.listType;
      return;
    }

    // Try parsing as list item
    if (line.startsWith('- ') && ctx.currentListType) {
      this.parseListItem(line, section, ctx.currentListType);
      return;
    }

    // Try parsing as task content
    if (isContentLine(line) && !ctx.currentListType) {
      section.task = section.task ? `${section.task}\n${line}` : line;
    }
  }

  /**
   * Parse a list item line.
   */
  private parseListItem(
    line: string,
    section: Partial<SessionSection>,
    listType: 'decisions' | 'notes',
  ): void {
    const item = line.replace('- ', '').trim();
    if (listType === 'decisions') {
      section.decisions = section.decisions || [];
      section.decisions.push(item);
    } else {
      section.notes = section.notes || [];
      section.notes.push(item);
    }
  }
}
