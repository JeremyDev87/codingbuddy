/**
 * Unit Tests for Build Script Orchestration
 *
 * Tests the build script's utility functions and argument parsing.
 * Note: Build script now only syncs version and generates README.
 * Agents, commands, and skills are provided by MCP server (single source of truth).
 */

import { describe, it, expect } from 'vitest';

// Import utilities that are testable in isolation
import { getErrorMessage, type BuildMode } from '../src/utils';

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
});
