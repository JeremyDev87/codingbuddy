#!/usr/bin/env ts-node
/**
 * Validate Commands Script
 *
 * Collision guardrails for reserved slash commands.
 * Detects when a plugin command name collides with Claude Code built-in commands.
 *
 * Checks:
 * 1. Reserved command denylist (Claude Code built-ins)
 * 2. Command extraction from commands/ directory
 * 3. Collision detection against denylist
 * 4. Namespace validation (codingbuddy:* convention)
 *
 * Usage:
 *   npx tsx scripts/validate-commands.ts
 */

import * as path from 'path';
import * as fs from 'fs';

// ============================================================================
// Reserved Command Denylist
// ============================================================================

/**
 * Claude Code built-in / reserved slash command names.
 * Source: checked-in snapshot for deterministic, repo-local validation.
 *
 * Maintain this list when new Claude Code built-in commands are discovered.
 */
export const RESERVED_COMMANDS: ReadonlySet<string> = new Set([
  // Core session commands
  'help',
  'clear',
  'exit',
  'quit',
  'compact',
  'reset',

  // Configuration & settings
  'config',
  'model',
  'permissions',
  'vim',
  'terminal-setup',
  'init',
  'settings',

  // Authentication
  'login',
  'logout',

  // Diagnostics & info
  'status',
  'doctor',
  'cost',
  'bug',
  'version',

  // Memory & context
  'memory',
  'context',

  // MCP & tools
  'mcp',
  'tools',

  // Code review & tasks
  'review',

  // Session management
  'listen',
  'resume',
  'continue',

  // IDE integration
  'ide',

  // Other known built-ins
  'add-dir',
  'release-notes',
  'pr-review',
  'fast',
]);

// ============================================================================
// Legacy Allowlist
// ============================================================================

/**
 * Known legacy bare commands that are intentionally kept without namespace prefix.
 * These existed before the codingbuddy:* namespace convention.
 * New commands MUST use the codingbuddy:* namespace.
 */
export const LEGACY_ALLOWLIST: ReadonlySet<string> = new Set([
  'plan',
  'act',
  'eval',
  'auto',
  'buddy',
  'checklist',
]);

// ============================================================================
// Plugin Namespace
// ============================================================================

export const PLUGIN_NAMESPACE = 'codingbuddy';
export const NAMESPACE_SEPARATOR = ':';

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  commands: string[];
  collisions: string[];
  namespaceViolations: string[];
  errors: string[];
}

// ============================================================================
// Command Extraction
// ============================================================================

/**
 * Extracts command names from the commands/ directory.
 * Each .md file in commands/ represents a slash command.
 * Filename (without extension) is the command name.
 */
export function extractCommandsFromDirectory(commandsDir: string): string[] {
  if (!fs.existsSync(commandsDir)) {
    return [];
  }

  return fs
    .readdirSync(commandsDir)
    .filter(file => file.endsWith('.md'))
    .map(file => path.basename(file, '.md'));
}

/**
 * Extracts the base command name, stripping any namespace prefix.
 * e.g., "codingbuddy:plan" → "plan", "plan" → "plan"
 */
export function getBaseCommandName(command: string): string {
  const separatorIndex = command.indexOf(NAMESPACE_SEPARATOR);
  if (separatorIndex === -1) {
    return command;
  }
  return command.substring(separatorIndex + 1);
}

/**
 * Checks if a command uses the plugin namespace.
 * e.g., "codingbuddy:plan" → true, "plan" → false
 */
export function isNamespaced(command: string): boolean {
  return command.startsWith(`${PLUGIN_NAMESPACE}${NAMESPACE_SEPARATOR}`);
}

// ============================================================================
// Collision Detection
// ============================================================================

/**
 * Checks a single command name against the reserved denylist.
 * Returns true if the command collides with a reserved name.
 */
export function isReservedCommand(command: string): boolean {
  const baseName = getBaseCommandName(command);
  return RESERVED_COMMANDS.has(baseName);
}

// ============================================================================
// Main Validation
// ============================================================================

/**
 * Validates all commands for collisions and namespace compliance.
 *
 * Rules:
 * 1. No command may collide with a reserved Claude Code built-in
 * 2. Bare (non-namespaced) commands must be in the legacy allowlist
 * 3. New commands must use the codingbuddy:* namespace
 */
export function validateCommands(commandsDir: string): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    commands: [],
    collisions: [],
    namespaceViolations: [],
    errors: [],
  };

  try {
    const commands = extractCommandsFromDirectory(commandsDir);
    result.commands = commands;

    for (const cmd of commands) {
      // Check collision with reserved commands
      if (isReservedCommand(cmd)) {
        result.collisions.push(cmd);
        result.valid = false;
      }

      // Check namespace compliance: bare commands must be in legacy allowlist
      if (!isNamespaced(cmd) && !LEGACY_ALLOWLIST.has(cmd)) {
        result.namespaceViolations.push(cmd);
        result.valid = false;
      }
    }
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : String(error));
    result.valid = false;
  }

  return result;
}

// ============================================================================
// CLI Runner
// ============================================================================

function main(): void {
  const pluginRoot = path.resolve(__dirname, '..');
  const commandsDir = path.join(pluginRoot, 'commands');

  console.log('🔍 Validating plugin commands...\n');

  const result = validateCommands(commandsDir);

  console.log(`Commands found: ${result.commands.join(', ') || '(none)'}`);
  console.log(`Reserved denylist size: ${RESERVED_COMMANDS.size}`);
  console.log(`Legacy allowlist: ${[...LEGACY_ALLOWLIST].join(', ')}`);
  console.log('');

  if (result.collisions.length > 0) {
    console.error('❌ COLLISION DETECTED:');
    for (const cmd of result.collisions) {
      console.error(`   "${cmd}" collides with a reserved Claude Code command`);
    }
    console.error('');
  }

  if (result.namespaceViolations.length > 0) {
    console.error('❌ NAMESPACE VIOLATION:');
    for (const cmd of result.namespaceViolations) {
      console.error(
        `   "${cmd}" is a bare command not in the legacy allowlist. Use "${PLUGIN_NAMESPACE}:${cmd}" instead.`,
      );
    }
    console.error('');
  }

  if (result.errors.length > 0) {
    console.error('❌ ERRORS:');
    for (const err of result.errors) {
      console.error(`   ${err}`);
    }
    console.error('');
  }

  if (result.valid) {
    console.log('✅ All commands passed validation.');
  } else {
    console.error('❌ Command validation failed.');
    process.exit(1);
  }
}

// Only run CLI when executed directly (not imported)
if (require.main === module) {
  main();
}
