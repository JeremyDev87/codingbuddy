/**
 * State persistence types for Option C (Hybrid approach)
 * - Document files for important state
 * - Memory cache for performance-sensitive data
 */

import type { Mode, KeywordModesConfig } from '../keyword/keyword.types';

/**
 * Mode configuration snapshot for persistence
 */
export interface ModeConfigSnapshot {
  /** Last loaded mode configuration */
  config: KeywordModesConfig;
  /** Timestamp when config was captured */
  capturedAt: string;
  /** Source file path if loaded from file */
  source?: string;
}

/**
 * Project metadata for state persistence
 */
export interface ProjectMetadata {
  /** Detected project root path */
  projectRoot: string;
  /** Timestamp when project was detected */
  detectedAt: string;
  /** Config file path if found */
  configFile?: string;
  /** Last active mode */
  lastMode?: Mode;
  /** Last active session ID */
  lastSessionId?: string;
}

/**
 * Complete state document structure
 */
export interface StateDocument {
  /** Version for schema migration */
  version: number;
  /** Project metadata */
  project: ProjectMetadata;
  /** Mode configuration snapshot (optional, for complex configs) */
  modeConfig?: ModeConfigSnapshot;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * State file metadata for cache invalidation
 */
export interface StateFileMeta {
  /** File path */
  path: string;
  /** Last modification time (ms since epoch) */
  mtime: number;
}

/**
 * Result of state operations
 */
export interface StateOperationResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Current state schema version
 */
export const STATE_SCHEMA_VERSION = 1;

/**
 * State directory name (relative to project root)
 */
export const STATE_DIR_NAME = '.codingbuddy/state';

/**
 * State file names
 */
export const STATE_FILES = {
  PROJECT_METADATA: 'project-metadata.json',
  MODE_CONFIG: 'mode-config-snapshot.json',
} as const;
