import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseArgs, printUsage, printVersion, main } from './cli';

// Mock dependencies
vi.mock('./init', () => ({
  runInit: vi.fn(),
}));

vi.mock('../main', () => ({
  bootstrap: vi.fn(),
}));

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

    it('should parse tui command with restart=false by default', () => {
      const result = parseArgs(['tui']);

      expect(result.command).toBe('tui');
      expect(result.options.restart).toBe(false);
    });

    it('should parse tui --restart flag', () => {
      const result = parseArgs(['tui', '--restart']);

      expect(result.command).toBe('tui');
      expect(result.options.restart).toBe(true);
    });

    it('should parse init with --force flag', () => {
      const result = parseArgs(['init', '--force']);

      expect(result.command).toBe('init');
      expect(result.options.force).toBe(true);
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

    it('should parse completion command with shell type', () => {
      const result = parseArgs(['completion', 'bash']);

      expect(result.command).toBe('completion');
      expect(result.options.shell).toBe('bash');
    });

    it('should parse completion command without shell type', () => {
      const result = parseArgs(['completion']);

      expect(result.command).toBe('completion');
      expect(result.options.shell).toBeUndefined();
    });

    it('should parse plugins command', () => {
      const result = parseArgs(['plugins']);

      expect(result.command).toBe('plugins');
    });

    it('should parse uninstall command with plugin name', () => {
      const result = parseArgs(['uninstall', 'my-plugin']);

      expect(result.command).toBe('uninstall');
      expect(result.options.uninstallName).toBe('my-plugin');
    });

    it('should parse uninstall with --yes flag', () => {
      const result = parseArgs(['uninstall', 'my-plugin', '--yes']);

      expect(result.command).toBe('uninstall');
      expect(result.options.uninstallYes).toBe(true);
    });

    it('should parse uninstall with -y short flag', () => {
      const result = parseArgs(['uninstall', 'my-plugin', '-y']);

      expect(result.command).toBe('uninstall');
      expect(result.options.uninstallYes).toBe(true);
    });

    it('should parse create-plugin command with name', () => {
      const result = parseArgs(['create-plugin', 'my-plugin']);

      expect(result.command).toBe('create-plugin');
      expect(result.options.createPluginName).toBe('my-plugin');
    });

    it('should parse create-plugin command with --template flag', () => {
      const result = parseArgs(['create-plugin', 'my-plugin', '--template', 'full']);

      expect(result.command).toBe('create-plugin');
      expect(result.options.createPluginName).toBe('my-plugin');
      expect(result.options.createPluginTemplate).toBe('full');
    });

    it('should parse create-plugin without template as undefined', () => {
      const result = parseArgs(['create-plugin', 'my-plugin']);

      expect(result.options.createPluginTemplate).toBeUndefined();
    });

    it('should parse init with --yes flag', () => {
      const result = parseArgs(['init', '--yes']);

      expect(result.command).toBe('init');
      expect(result.options.useDefaults).toBe(true);
    });

    it('should parse init with -y short flag', () => {
      const result = parseArgs(['init', '-y']);

      expect(result.command).toBe('init');
      expect(result.options.useDefaults).toBe(true);
    });

    it('should default useDefaults to false', () => {
      const result = parseArgs(['init']);

      expect(result.options.useDefaults).toBe(false);
    });
  });

  describe('printUsage', () => {
    let stdoutWrite: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should print usage information', () => {
      printUsage();

      expect(stdoutWrite).toHaveBeenCalled();
      const output = stdoutWrite.mock.calls.map((c: unknown[]) => c[0]).join('');
      expect(output).toContain('codingbuddy');
      expect(output).toContain('init');
      expect(output).toContain('mcp');
      expect(output).toContain('--help');
    });
  });

  describe('printVersion', () => {
    let stdoutWrite: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should print version', () => {
      printVersion();

      expect(stdoutWrite).toHaveBeenCalled();
      const output = stdoutWrite.mock.calls.map((c: unknown[]) => c[0]).join('');
      expect(output).toMatch(/\d+\.\d+\.\d+/);
    });
  });

  describe('main', () => {
    let runInitMock: ReturnType<typeof vi.fn>;
    let bootstrapMock: ReturnType<typeof vi.fn>;
    let stdoutWrite: ReturnType<typeof vi.spyOn>;
    let stderrWrite: ReturnType<typeof vi.spyOn>;

    beforeEach(async () => {
      // Import mocks
      const initModule = await import('./init');
      const mainModule = await import('../main');
      runInitMock = initModule.runInit as ReturnType<typeof vi.fn>;
      bootstrapMock = mainModule.bootstrap as ReturnType<typeof vi.fn>;

      // Setup spies
      stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
      stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      // Reset mocks
      vi.clearAllMocks();
      process.exitCode = 0;
    });

    afterEach(() => {
      vi.restoreAllMocks();
      process.exitCode = 0;
    });

    it('should handle help command', async () => {
      await main(['--help']);

      expect(stdoutWrite).toHaveBeenCalled();
      const output = stdoutWrite.mock.calls.map((c: unknown[]) => c[0]).join('');
      expect(output).toContain('codingbuddy');
      expect(output).toContain('Usage:');
    });

    it('should handle version command', async () => {
      await main(['--version']);

      expect(stdoutWrite).toHaveBeenCalled();
      const output = stdoutWrite.mock.calls.map((c: unknown[]) => c[0]).join('');
      expect(output).toMatch(/\d+\.\d+\.\d+/);
    });

    it('should handle mcp command', async () => {
      bootstrapMock.mockResolvedValue(undefined);

      await main(['mcp']);

      expect(bootstrapMock).toHaveBeenCalled();
    });

    it('should handle init command with success', async () => {
      runInitMock.mockResolvedValue({ success: true });

      await main(['init']);

      expect(runInitMock).toHaveBeenCalledWith(
        expect.objectContaining({ projectRoot: process.cwd() }),
      );
      expect(process.exitCode).toBe(0);
    });

    it('should handle init command with failure', async () => {
      runInitMock.mockResolvedValue({ success: false });

      await main(['init']);

      expect(runInitMock).toHaveBeenCalled();
      expect(process.exitCode).toBe(1);
    });

    it('should print API key warning when apiKey is provided', async () => {
      runInitMock.mockResolvedValue({ success: true });

      await main(['init', '--api-key', 'test-key']);

      expect(stderrWrite).toHaveBeenCalled();
      const output = stderrWrite.mock.calls.map((c: unknown[]) => c[0]).join('');
      expect(output).toContain('Security Warning');
    });

    it('should handle init command with all options', async () => {
      runInitMock.mockResolvedValue({ success: true });

      await main(['init', '/custom/path', '--force', '--yes']);

      expect(runInitMock).toHaveBeenCalledWith(
        expect.objectContaining({
          projectRoot: '/custom/path',
          force: true,
          useDefaults: true,
        }),
      );
    });

    it('should parse short flags correctly', async () => {
      runInitMock.mockResolvedValue({ success: true });

      await main(['init', '-f', '-y']);

      expect(runInitMock).toHaveBeenCalledWith(
        expect.objectContaining({
          force: true,
          useDefaults: true,
        }),
      );
    });

    it('should handle short version flag', async () => {
      await main(['-v']);

      expect(stdoutWrite).toHaveBeenCalled();
      const output = stdoutWrite.mock.calls.map((c: unknown[]) => c[0]).join('');
      expect(output).toMatch(/\d+\.\d+\.\d+/);
    });

    it('should handle short help flag', async () => {
      await main(['-h']);

      expect(stdoutWrite).toHaveBeenCalled();
      const output = stdoutWrite.mock.calls.map((c: unknown[]) => c[0]).join('');
      expect(output).toContain('Usage:');
    });

    it('should default to help for unknown commands', async () => {
      await main(['unknown-command']);

      expect(stdoutWrite).toHaveBeenCalled();
      const output = stdoutWrite.mock.calls.map((c: unknown[]) => c[0]).join('');
      expect(output).toContain('Usage:');
    });
  });
});
