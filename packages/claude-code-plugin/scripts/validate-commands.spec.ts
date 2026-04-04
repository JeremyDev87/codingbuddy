/**
 * Tests for validate-commands script
 *
 * Verifies collision guardrails for reserved slash commands:
 * 1. Reserved denylist includes known Claude Code commands
 * 2. Command extraction from commands/ directory
 * 3. Legacy allowlist prevents false positives
 * 4. Forbidden bare commands trigger failure
 * 5. Namespaced commands pass validation
 * 6. Collision detection works correctly
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

import {
  RESERVED_COMMANDS,
  KNOWN_BARE_COMMANDS,
  LEGACY_ALLOWLIST,
  extractCommandsFromDirectory,
  getBaseCommandName,
  isNamespaced,
  isReservedCommand,
  validateCommands,
} from './validate-commands';

// ============================================================================
// Reserved Denylist
// ============================================================================

describe('reserved command denylist', () => {
  it('includes known Claude Code built-in commands', () => {
    const knownBuiltins = [
      'help',
      'clear',
      'exit',
      'memory',
      'status',
      'doctor',
      'model',
      'vim',
      'review',
      'config',
      'init',
      'mcp',
      'login',
      'logout',
      'cost',
      'compact',
      'permissions',
      'listen',
      'bug',
      'terminal-setup',
    ];

    for (const cmd of knownBuiltins) {
      expect(RESERVED_COMMANDS.has(cmd)).toBe(true);
    }
  });

  it('is a non-empty set', () => {
    expect(RESERVED_COMMANDS.size).toBeGreaterThan(20);
  });

  it('does not include plugin-specific commands', () => {
    expect(RESERVED_COMMANDS.has('plan')).toBe(false);
    expect(RESERVED_COMMANDS.has('act')).toBe(false);
    expect(RESERVED_COMMANDS.has('eval')).toBe(false);
    expect(RESERVED_COMMANDS.has('buddy')).toBe(false);
  });
});

// ============================================================================
// Known Bare Commands
// ============================================================================

describe('known bare commands', () => {
  it('contains current bare command filenames', () => {
    const expected = ['plan', 'act', 'eval', 'auto', 'buddy', 'checklist'];
    for (const cmd of expected) {
      expect(KNOWN_BARE_COMMANDS.has(cmd)).toBe(true);
    }
  });

  it('does not overlap with reserved commands', () => {
    for (const cmd of KNOWN_BARE_COMMANDS) {
      expect(RESERVED_COMMANDS.has(cmd)).toBe(false);
    }
  });

  it('LEGACY_ALLOWLIST alias points to the same set', () => {
    expect(LEGACY_ALLOWLIST).toBe(KNOWN_BARE_COMMANDS);
  });
});

// ============================================================================
// Command Extraction
// ============================================================================

describe('extractCommandsFromDirectory', () => {
  const tmpDir = path.join(__dirname, '..', '__test_commands_tmp__');

  beforeEach(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('extracts command names from .md files', () => {
    fs.writeFileSync(path.join(tmpDir, 'plan.md'), '# Plan');
    fs.writeFileSync(path.join(tmpDir, 'act.md'), '# Act');

    const commands = extractCommandsFromDirectory(tmpDir);
    expect(commands).toContain('plan');
    expect(commands).toContain('act');
    expect(commands).toHaveLength(2);
  });

  it('ignores non-.md files', () => {
    fs.writeFileSync(path.join(tmpDir, 'plan.md'), '# Plan');
    fs.writeFileSync(path.join(tmpDir, 'notes.txt'), 'notes');
    fs.writeFileSync(path.join(tmpDir, 'config.json'), '{}');

    const commands = extractCommandsFromDirectory(tmpDir);
    expect(commands).toEqual(['plan']);
  });

  it('returns empty array for non-existent directory', () => {
    const commands = extractCommandsFromDirectory('/nonexistent/path');
    expect(commands).toEqual([]);
  });

  it('returns empty array for empty directory', () => {
    const commands = extractCommandsFromDirectory(tmpDir);
    expect(commands).toEqual([]);
  });

  it('detects the real commands/ directory', () => {
    const realCommandsDir = path.resolve(__dirname, '..', 'commands');
    const commands = extractCommandsFromDirectory(realCommandsDir);

    expect(commands).toContain('plan');
    expect(commands).toContain('act');
    expect(commands).toContain('eval');
    expect(commands).toContain('auto');
    expect(commands).toContain('buddy');
    expect(commands).toContain('checklist');
    expect(commands.length).toBeGreaterThanOrEqual(6);
  });
});

// ============================================================================
// Namespace Helpers
// ============================================================================

describe('getBaseCommandName', () => {
  it('strips namespace prefix', () => {
    expect(getBaseCommandName('codingbuddy:plan')).toBe('plan');
  });

  it('returns bare name as-is', () => {
    expect(getBaseCommandName('plan')).toBe('plan');
  });

  it('handles nested colons', () => {
    expect(getBaseCommandName('codingbuddy:sub:cmd')).toBe('sub:cmd');
  });
});

describe('isNamespaced', () => {
  it('returns true for namespaced commands', () => {
    expect(isNamespaced('codingbuddy:plan')).toBe(true);
  });

  it('returns false for bare commands', () => {
    expect(isNamespaced('plan')).toBe(false);
  });

  it('returns false for other namespaces', () => {
    expect(isNamespaced('other:plan')).toBe(false);
  });
});

// ============================================================================
// Collision Detection
// ============================================================================

describe('isReservedCommand', () => {
  it('detects reserved bare commands', () => {
    expect(isReservedCommand('help')).toBe(true);
    expect(isReservedCommand('mcp')).toBe(true);
    expect(isReservedCommand('config')).toBe(true);
  });

  it('detects reserved commands even with namespace', () => {
    expect(isReservedCommand('codingbuddy:help')).toBe(true);
    expect(isReservedCommand('codingbuddy:mcp')).toBe(true);
  });

  it('returns false for non-reserved commands', () => {
    expect(isReservedCommand('plan')).toBe(false);
    expect(isReservedCommand('buddy')).toBe(false);
    expect(isReservedCommand('codingbuddy:plan')).toBe(false);
  });
});

// ============================================================================
// Full Validation
// ============================================================================

describe('validateCommands', () => {
  const tmpDir = path.join(__dirname, '..', '__test_validate_tmp__');

  beforeEach(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('passes with current legacy commands', () => {
    for (const cmd of KNOWN_BARE_COMMANDS) {
      fs.writeFileSync(path.join(tmpDir, `${cmd}.md`), `# ${cmd}`);
    }

    const result = validateCommands(tmpDir);
    expect(result.valid).toBe(true);
    expect(result.collisions).toHaveLength(0);
    expect(result.namespaceViolations).toHaveLength(0);
  });

  it('fails when a reserved command is introduced', () => {
    fs.writeFileSync(path.join(tmpDir, 'help.md'), '# Help');

    const result = validateCommands(tmpDir);
    expect(result.valid).toBe(false);
    expect(result.collisions).toContain('help');
  });

  it('fails when a bare command is not in known bare commands', () => {
    fs.writeFileSync(path.join(tmpDir, 'my-new-command.md'), '# New');

    const result = validateCommands(tmpDir);
    expect(result.valid).toBe(false);
    expect(result.namespaceViolations).toContain('my-new-command');
  });

  it('reports both collision and namespace violation for reserved bare command', () => {
    fs.writeFileSync(path.join(tmpDir, 'mcp.md'), '# MCP');

    const result = validateCommands(tmpDir);
    expect(result.valid).toBe(false);
    expect(result.collisions).toContain('mcp');
    expect(result.namespaceViolations).toContain('mcp');
  });

  it('handles empty commands directory', () => {
    const result = validateCommands(tmpDir);
    expect(result.valid).toBe(true);
    expect(result.commands).toHaveLength(0);
  });

  it('handles non-existent directory', () => {
    const result = validateCommands('/nonexistent/path');
    expect(result.valid).toBe(true);
    expect(result.commands).toHaveLength(0);
  });

  it('validates the real commands/ directory passes', () => {
    const realCommandsDir = path.resolve(__dirname, '..', 'commands');
    const result = validateCommands(realCommandsDir);
    expect(result.valid).toBe(true);
    expect(result.collisions).toHaveLength(0);
    expect(result.namespaceViolations).toHaveLength(0);
  });
});
