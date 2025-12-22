import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseArgs, printUsage, printVersion } from './cli';

describe('cli', () => {
  describe('parseArgs', () => {
    it('should parse init command', () => {
      const result = parseArgs(['init']);

      expect(result.command).toBe('init');
    });

    it('should parse mcp command', () => {
      const result = parseArgs(['mcp']);

      expect(result.command).toBe('mcp');
    });

    it('should parse init with --force flag', () => {
      const result = parseArgs(['init', '--force']);

      expect(result.command).toBe('init');
      expect(result.options.force).toBe(true);
    });

    it('should parse init with --format option', () => {
      const result = parseArgs(['init', '--format', 'json']);

      expect(result.command).toBe('init');
      expect(result.options.format).toBe('json');
    });

    it('should parse init with --api-key option', () => {
      const result = parseArgs(['init', '--api-key', 'test-key']);

      expect(result.command).toBe('init');
      expect(result.options.apiKey).toBe('test-key');
    });

    it('should parse help command', () => {
      const result = parseArgs(['--help']);

      expect(result.command).toBe('help');
    });

    it('should parse version command', () => {
      const result = parseArgs(['--version']);

      expect(result.command).toBe('version');
    });

    it('should return help for empty args', () => {
      const result = parseArgs([]);

      expect(result.command).toBe('help');
    });

    it('should return help for unknown command', () => {
      const result = parseArgs(['unknown']);

      expect(result.command).toBe('help');
    });

    it('should use current directory as default projectRoot', () => {
      const result = parseArgs(['init']);

      expect(result.options.projectRoot).toBe(process.cwd());
    });

    it('should parse custom project root', () => {
      const result = parseArgs(['init', '/custom/path']);

      expect(result.options.projectRoot).toBe('/custom/path');
    });
  });

  describe('printUsage', () => {
    let stdoutWrite: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      stdoutWrite = vi
        .spyOn(process.stdout, 'write')
        .mockImplementation(() => true);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should print usage information', () => {
      printUsage();

      expect(stdoutWrite).toHaveBeenCalled();
      const output = stdoutWrite.mock.calls
        .map((c: unknown[]) => c[0])
        .join('');
      expect(output).toContain('codingbuddy');
      expect(output).toContain('init');
      expect(output).toContain('mcp');
      expect(output).toContain('--help');
    });
  });

  describe('printVersion', () => {
    let stdoutWrite: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      stdoutWrite = vi
        .spyOn(process.stdout, 'write')
        .mockImplementation(() => true);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should print version', () => {
      printVersion();

      expect(stdoutWrite).toHaveBeenCalled();
      const output = stdoutWrite.mock.calls
        .map((c: unknown[]) => c[0])
        .join('');
      expect(output).toMatch(/\d+\.\d+\.\d+/);
    });
  });
});
