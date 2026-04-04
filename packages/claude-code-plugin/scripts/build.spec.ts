/**
 * Unit Tests for Build Script Orchestration
 *
 * Tests the build script's utility functions, argument parsing,
 * and namespace manifest generation for the codingbuddy:* command mapping.
 *
 * Note: Build script syncs version, generates README, and produces
 * namespace-manifest.json. Agents, commands, and skills are provided
 * by MCP server (single source of truth).
 */

import { describe, it, expect, beforeAll } from 'vitest';

// Import utilities that are testable in isolation
import { getErrorMessage, type BuildMode } from '../src/utils';
import { buildNamespaceManifest, type NamespaceManifest } from './build';
import { PLUGIN_NAMESPACE, NAMESPACE_SEPARATOR, LEGACY_ALLOWLIST } from './validate-commands';

describe('build script orchestration', () => {
  // ============================================================================
  // Argument Parsing Logic
  // ============================================================================
  describe('argument parsing logic', () => {
    function parseArgs(args: string[]): { mode: BuildMode; verbose: boolean } {
      let mode: BuildMode = 'development';
      let verbose = false;

      for (const arg of args) {
        if (arg.startsWith('--mode=')) {
          const value = arg.split('=')[1];
          if (value === 'production' || value === 'development') {
            mode = value;
          }
        }
        if (arg === '--verbose' || arg === '-v') {
          verbose = true;
        }
      }

      return { mode, verbose };
    }

    it('defaults to development mode', () => {
      const result = parseArgs([]);
      expect(result.mode).toBe('development');
      expect(result.verbose).toBe(false);
    });

    it('parses --mode=development', () => {
      const result = parseArgs(['--mode=development']);
      expect(result.mode).toBe('development');
    });

    it('parses --mode=production', () => {
      const result = parseArgs(['--mode=production']);
      expect(result.mode).toBe('production');
    });

    it('ignores invalid mode values', () => {
      const result = parseArgs(['--mode=invalid']);
      expect(result.mode).toBe('development');
    });

    it('parses --verbose flag', () => {
      const result = parseArgs(['--verbose']);
      expect(result.verbose).toBe(true);
    });

    it('parses -v shorthand', () => {
      const result = parseArgs(['-v']);
      expect(result.verbose).toBe(true);
    });

    it('parses multiple arguments', () => {
      const result = parseArgs(['--mode=production', '--verbose']);
      expect(result.mode).toBe('production');
      expect(result.verbose).toBe(true);
    });
  });

  // ============================================================================
  // Error Handling Integration
  // ============================================================================
  describe('error handling integration', () => {
    it('getErrorMessage handles Error instances', () => {
      const error = new Error('Test error message');
      expect(getErrorMessage(error)).toBe('Test error message');
    });

    it('getErrorMessage handles string errors', () => {
      expect(getErrorMessage('String error')).toBe('String error');
    });

    it('getErrorMessage handles other types', () => {
      expect(getErrorMessage(123)).toBe('123');
      expect(getErrorMessage(null)).toBe('null');
      expect(getErrorMessage(undefined)).toBe('undefined');
    });
  });

  // ============================================================================
  // BuildResult Interface
  // ============================================================================
  describe('BuildResult interface consistency', () => {
    interface BuildResult {
      step: string;
      success: boolean;
      details: string[];
      errors: string[];
    }

    it('has correct shape for README generation', () => {
      const buildResult: BuildResult = {
        step: 'README Generation',
        success: true,
        details: ['README.md created'],
        errors: [],
      };

      expect(buildResult.step).toBe('README Generation');
      expect(buildResult.success).toBe(true);
      expect(buildResult.details).toContain('README.md created');
      expect(buildResult.errors).toHaveLength(0);
    });

    it('captures errors correctly', () => {
      const buildResult: BuildResult = {
        step: 'README Generation',
        success: false,
        details: [],
        errors: ['Failed to write README.md'],
      };

      expect(buildResult.success).toBe(false);
      expect(buildResult.errors).toContain('Failed to write README.md');
    });
  });

  // ============================================================================
  // Namespace Manifest Generation
  // ============================================================================
  describe('namespace manifest generation', () => {
    let manifest: NamespaceManifest;

    // Build once — the manifest is deterministic for a given commands/ directory
    beforeAll(() => {
      manifest = buildNamespaceManifest();
    });

    it('uses the codingbuddy plugin namespace', () => {
      expect(manifest.pluginName).toBe(PLUGIN_NAMESPACE);
      expect(manifest.namespace).toBe(`${PLUGIN_NAMESPACE}${NAMESPACE_SEPARATOR}`);
      expect(manifest.separator).toBe(NAMESPACE_SEPARATOR);
    });

    it('includes all current command files', () => {
      const bareNames = manifest.commands.map(c => c.bare);
      for (const cmd of LEGACY_ALLOWLIST) {
        expect(bareNames).toContain(cmd);
      }
    });

    it('maps every command to its namespaced form', () => {
      for (const cmd of manifest.commands) {
        expect(cmd.namespaced).toBe(`${PLUGIN_NAMESPACE}${NAMESPACE_SEPARATOR}${cmd.bare}`);
      }
    });

    it('references valid file paths in commands/', () => {
      for (const cmd of manifest.commands) {
        expect(cmd.file).toBe(`commands/${cmd.bare}.md`);
      }
    });

    it('includes a generatedAt ISO timestamp', () => {
      expect(manifest.generatedAt).toBeTruthy();
      // ISO 8601 rough check
      expect(new Date(manifest.generatedAt).toISOString()).toBe(manifest.generatedAt);
    });

    it('produces at least 6 command entries', () => {
      expect(manifest.commands.length).toBeGreaterThanOrEqual(6);
    });
  });
});

// ============================================================================
// Packaging Integration — namespaced command assets
// ============================================================================
describe('packaging integration', () => {
  // Use a fresh import of path/fs to keep these tests self-contained
  const path = require('path');
  const fs = require('fs');

  const pluginRoot = path.resolve(__dirname, '..');
  const commandsDir = path.join(pluginRoot, 'commands');

  it('commands/ directory exists and contains .md files', () => {
    expect(fs.existsSync(commandsDir)).toBe(true);
    const files: string[] = fs.readdirSync(commandsDir).filter((f: string) => f.endsWith('.md'));
    expect(files.length).toBeGreaterThanOrEqual(6);
  });

  it('every command file maps to a codingbuddy:* namespaced slug', () => {
    const files: string[] = fs.readdirSync(commandsDir).filter((f: string) => f.endsWith('.md'));
    for (const file of files) {
      const bare = path.basename(file, '.md');
      const namespaced = `${PLUGIN_NAMESPACE}${NAMESPACE_SEPARATOR}${bare}`;
      expect(namespaced).toMatch(/^codingbuddy:.+$/);
    }
  });

  it('plugin.json name matches the namespace prefix', () => {
    const pluginJsonPath = path.join(pluginRoot, '.claude-plugin', 'plugin.json');
    const pluginJson = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));
    expect(pluginJson.name).toBe(PLUGIN_NAMESPACE);
  });

  it('buddy.md references namespaced commands in Quick Actions', () => {
    const buddyPath = path.join(commandsDir, 'buddy.md');
    const content = fs.readFileSync(buddyPath, 'utf8');
    expect(content).toContain('/codingbuddy:plan');
    expect(content).toContain('/codingbuddy:act');
    expect(content).toContain('/codingbuddy:buddy');
  });
});
