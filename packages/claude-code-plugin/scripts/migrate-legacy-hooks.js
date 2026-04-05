#!/usr/bin/env node
'use strict';

/**
 * Legacy Hook Migration (#1381 + #1384)
 *
 * Cleans up a stale global hook left behind by plugin versions prior to the
 * self-contained hook refactor. Specifically:
 *
 *   1. Deletes `~/.claude/hooks/codingbuddy-mode-detect.py` when present.
 *   2. Removes `~/.claude/hooks/lib` only if it is a symlink (never a real dir).
 *   3. Filters any `UserPromptSubmit` entries in `~/.claude/settings.json`
 *      whose command string references the legacy script file name,
 *      preserving every unrelated entry.
 *   4. Drops the `hooks.UserPromptSubmit` key entirely when it becomes empty.
 *   5. Writes a timestamped backup (`settings.json.bak-codingbuddy-migration-<ts>`)
 *      whenever `settings.json` is rewritten.
 *
 * Runtime constraints:
 *   - Pure CommonJS, no external dependencies. It is required from
 *     `postinstall.js` which runs under the end-user's `node` without any
 *     build step.
 *   - Idempotent: a second invocation on a clean system is a no-op.
 *   - Graceful on malformed JSON / missing files / missing `~/.claude`.
 *   - Respects `CODINGBUDDY_POSTINSTALL_DRY_RUN=1` and the `dryRun` option.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const LEGACY_SCRIPT_NAME = 'codingbuddy-mode-detect.py';
const BACKUP_PREFIX = 'settings.json.bak-codingbuddy-migration-';

function defaultLogger(line) {
  // Prefix so users can recognise the migration output in their install log.
  // eslint-disable-next-line no-console
  console.log(`[CodingBuddy Plugin] ${line}`);
}

function isLegacyCommandString(command) {
  return typeof command === 'string' && command.includes(LEGACY_SCRIPT_NAME);
}

/**
 * Filter a single UserPromptSubmit group. A group has shape:
 *   { matcher?: string, hooks: [{ type: 'command', command: string, ... }] }
 * Returns either a new group with legacy sub-hooks stripped, or `null` when
 * the group becomes empty (and should therefore be dropped).
 */
function filterGroup(group) {
  if (!group || typeof group !== 'object' || !Array.isArray(group.hooks)) {
    // Unknown shape — leave it alone so we do not corrupt user settings.
    return { next: group, removed: 0 };
  }
  let removed = 0;
  const kept = [];
  for (const entry of group.hooks) {
    if (entry && isLegacyCommandString(entry.command)) {
      removed += 1;
      continue;
    }
    kept.push(entry);
  }
  if (kept.length === 0) {
    return { next: null, removed };
  }
  return { next: { ...group, hooks: kept }, removed };
}

/**
 * Strip legacy entries from `settings.hooks.UserPromptSubmit`. Returns
 * `{ changed, removedUserPromptSubmitKey, strippedEntries }` where
 * `strippedEntries` counts individual `{ type: 'command' }` hooks removed.
 */
function stripLegacyFromSettings(settings) {
  const result = {
    changed: false,
    removedUserPromptSubmitKey: false,
    strippedEntries: 0,
  };
  if (!settings || typeof settings !== 'object') return result;
  const hooks = settings.hooks;
  if (!hooks || typeof hooks !== 'object') return result;
  const ups = hooks.UserPromptSubmit;
  if (!Array.isArray(ups)) return result;

  const nextGroups = [];
  for (const group of ups) {
    const { next, removed } = filterGroup(group);
    if (removed > 0) {
      result.changed = true;
      result.strippedEntries += removed;
    }
    if (next !== null) nextGroups.push(next);
    else result.changed = true;
  }

  if (result.changed) {
    if (nextGroups.length === 0) {
      delete hooks.UserPromptSubmit;
      result.removedUserPromptSubmitKey = true;
    } else {
      hooks.UserPromptSubmit = nextGroups;
    }
  }

  return result;
}

function tryReadJson(filePath, warnings) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    if (err && err.code === 'ENOENT') return { raw: null, parsed: null };
    warnings.push(`could not read ${filePath}: ${err.message}`);
    return { raw: null, parsed: null };
  }
  try {
    return { raw, parsed: JSON.parse(raw) };
  } catch (err) {
    warnings.push(`settings.json is malformed, skipping migration: ${err.message}`);
    return { raw, parsed: null };
  }
}

function safeLstat(p) {
  try {
    return fs.lstatSync(p);
  } catch {
    return null;
  }
}

function migrateStaleScript({ hooksDir, dryRun, log, result }) {
  const scriptPath = path.join(hooksDir, LEGACY_SCRIPT_NAME);
  const stat = safeLstat(scriptPath);
  if (!stat) return;
  result.removedScript = true;
  log(`Migrated legacy hook: ${scriptPath}`);
  if (!dryRun) {
    try {
      fs.unlinkSync(scriptPath);
    } catch (err) {
      result.warnings.push(`failed to delete ${scriptPath}: ${err.message}`);
    }
  }
}

function migrateStaleSymlink({ hooksDir, dryRun, log, result }) {
  const linkPath = path.join(hooksDir, 'lib');
  const stat = safeLstat(linkPath);
  if (!stat || !stat.isSymbolicLink()) return;
  result.removedSymlink = true;
  log(`Removed legacy symlink: ${linkPath}`);
  if (!dryRun) {
    try {
      fs.unlinkSync(linkPath);
    } catch (err) {
      result.warnings.push(`failed to unlink ${linkPath}: ${err.message}`);
    }
  }
}

function migrateSettings({ claudeDir, dryRun, log, result }) {
  const settingsPath = path.join(claudeDir, 'settings.json');
  const { raw, parsed } = tryReadJson(settingsPath, result.warnings);
  if (raw === null || parsed === null) return;

  const strip = stripLegacyFromSettings(parsed);
  result.strippedSettingsEntries = strip.strippedEntries;
  result.removedUserPromptSubmitKey = strip.removedUserPromptSubmitKey;
  if (!strip.changed) return;

  log(
    `Migrated legacy UserPromptSubmit entries from settings.json ` +
      `(removed ${strip.strippedEntries} entry${strip.strippedEntries === 1 ? '' : 'ies'})`,
  );

  if (dryRun) return;

  const backupPath = `${settingsPath}.bak-codingbuddy-migration-${Date.now()}`;
  try {
    fs.writeFileSync(backupPath, raw);
    result.backupPath = backupPath;
    log(`Wrote settings.json backup: ${backupPath}`);
  } catch (err) {
    result.warnings.push(`failed to write backup ${backupPath}: ${err.message}`);
    return; // do not rewrite settings.json if we could not back it up
  }

  try {
    fs.writeFileSync(settingsPath, JSON.stringify(parsed, null, 2) + '\n');
  } catch (err) {
    result.warnings.push(`failed to rewrite ${settingsPath}: ${err.message}`);
  }
}

/**
 * Main entry point.
 *
 * @param {{ homeDir?: string, dryRun?: boolean, logger?: (line: string) => void }} [opts]
 */
function migrateLegacyHooks(opts = {}) {
  const homeDir = opts.homeDir || os.homedir();
  const dryRun =
    opts.dryRun === true ||
    process.env.CODINGBUDDY_POSTINSTALL_DRY_RUN === '1' ||
    process.env.CODINGBUDDY_POSTINSTALL_DRY_RUN === 'true';
  const logger = typeof opts.logger === 'function' ? opts.logger : defaultLogger;

  const result = {
    removedScript: false,
    removedSymlink: false,
    strippedSettingsEntries: 0,
    removedUserPromptSubmitKey: false,
    backupPath: null,
    dryRun,
    warnings: [],
  };

  const claudeDir = path.join(homeDir, '.claude');
  if (!fs.existsSync(claudeDir)) return result;

  const hooksDir = path.join(claudeDir, 'hooks');
  const log = (line) => logger(line);

  if (fs.existsSync(hooksDir)) {
    migrateStaleScript({ hooksDir, dryRun, log, result });
    migrateStaleSymlink({ hooksDir, dryRun, log, result });
  }

  migrateSettings({ claudeDir, dryRun, log, result });

  return result;
}

module.exports = {
  migrateLegacyHooks,
  LEGACY_SCRIPT_NAME,
};
