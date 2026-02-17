/**
 * Claude Settings Utilities
 *
 * Functions for manipulating ~/.claude/settings.json
 */

import { existsSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { homedir } from 'os';
import * as path from 'path';

export class ClaudeSettingsReadError extends Error {
  readonly cause: unknown;

  constructor(settingsPath: string, cause: unknown) {
    const message = `Failed to read Claude settings at ${settingsPath}`;
    super(message);
    this.name = 'ClaudeSettingsReadError';
    this.cause = cause;
  }
}

export class ClaudeSettingsWriteError extends Error {
  readonly cause: unknown;

  constructor(settingsPath: string, cause: unknown) {
    const message = `Failed to write Claude settings at ${settingsPath}`;
    super(message);
    this.name = 'ClaudeSettingsWriteError';
    this.cause = cause;
  }
}

export interface EnsureClaudeSettingsResult {
  /** Env keys that were added */
  added: string[];
  /** Env keys that already existed */
  alreadyExists: string[];
}

/**
 * Ensure env entries exist in ~/.claude/settings.json
 *
 * - Creates ~/.claude directory if it doesn't exist
 * - Creates settings.json if it doesn't exist
 * - Adds env entries that don't already exist
 * - Preserves all existing settings and env values
 *
 * @param envEntries - Key-value pairs to ensure in env section
 * @returns Result with added and already existing keys
 * @throws {ClaudeSettingsReadError} When settings.json contains invalid JSON
 * @throws {ClaudeSettingsWriteError} When settings.json cannot be written
 */
export async function ensureClaudeSettingsEnv(
  envEntries: Record<string, string>,
): Promise<EnsureClaudeSettingsResult> {
  const claudeDir = path.join(homedir(), '.claude');
  const settingsPath = path.join(claudeDir, 'settings.json');

  const result: EnsureClaudeSettingsResult = {
    added: [],
    alreadyExists: [],
  };

  // Read existing settings or start with empty object
  let settings: Record<string, unknown> = {};

  if (existsSync(settingsPath)) {
    try {
      const content = await readFile(settingsPath, 'utf-8');
      settings = JSON.parse(content);
    } catch (error) {
      throw new ClaudeSettingsReadError(settingsPath, error);
    }
  }

  // Ensure env section exists
  if (!settings.env || typeof settings.env !== 'object') {
    settings.env = {};
  }

  const env = settings.env as Record<string, string>;

  // Categorize entries
  for (const [key, value] of Object.entries(envEntries)) {
    if (key in env) {
      result.alreadyExists.push(key);
    } else {
      result.added.push(key);
      env[key] = value;
    }
  }

  // If nothing to add, return early
  if (result.added.length === 0) {
    return result;
  }

  // Ensure ~/.claude directory exists
  try {
    await mkdir(claudeDir, { recursive: true });
  } catch (error) {
    throw new ClaudeSettingsWriteError(settingsPath, error);
  }

  // Write settings
  try {
    await writeFile(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
  } catch (error) {
    throw new ClaudeSettingsWriteError(settingsPath, error);
  }

  return result;
}
