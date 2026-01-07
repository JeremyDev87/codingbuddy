/* eslint-disable no-control-regex */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createConsoleUtils, type ConsoleUtils } from './console';

describe('console utils', () => {
  let consoleUtils: ConsoleUtils;
  let stdoutWrite: ReturnType<typeof vi.spyOn>;
  let stderrWrite: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdoutWrite = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    stderrWrite = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    consoleUtils = createConsoleUtils();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('log', () => {
    it('should output info message', () => {
      consoleUtils.log.info('Test message');

      expect(stdoutWrite).toHaveBeenCalled();
      const output = stdoutWrite.mock.calls[0][0] as string;
      expect(output).toContain('Test message');
    });

    it('should output success message with checkmark', () => {
      consoleUtils.log.success('Success message');

      expect(stdoutWrite).toHaveBeenCalled();
      const output = stdoutWrite.mock.calls[0][0] as string;
      expect(output).toContain('Success message');
      expect(output).toContain('✓');
    });

    it('should output warning message', () => {
      consoleUtils.log.warn('Warning message');

      expect(stdoutWrite).toHaveBeenCalled();
      const output = stdoutWrite.mock.calls[0][0] as string;
      expect(output).toContain('Warning message');
      expect(output).toContain('⚠');
    });

    it('should output error message to stderr', () => {
      consoleUtils.log.error('Error message');

      expect(stderrWrite).toHaveBeenCalled();
      const output = stderrWrite.mock.calls[0][0] as string;
      expect(output).toContain('Error message');
      expect(output).toContain('✗');
    });

    it('should output step with custom emoji', () => {
      consoleUtils.log.step('🔍', 'Analyzing project...');

      expect(stdoutWrite).toHaveBeenCalled();
      const output = stdoutWrite.mock.calls[0][0] as string;
      expect(output).toContain('🔍');
      expect(output).toContain('Analyzing project...');
    });
  });

  describe('NO_COLOR support', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should not include ANSI color codes when NO_COLOR is set', () => {
      process.env.NO_COLOR = '1';
      const noColorConsole = createConsoleUtils();

      noColorConsole.log.success('Test message');

      const output = stdoutWrite.mock.calls[0][0] as string;
      // Should not contain ANSI escape codes (e.g., \x1b[32m)
      expect(output).not.toMatch(/\x1b\[\d+m/);
      expect(output).toContain('✓');
      expect(output).toContain('Test message');
    });

    it('should not include ANSI color codes for error when NO_COLOR is set', () => {
      process.env.NO_COLOR = '1';
      const noColorConsole = createConsoleUtils();

      noColorConsole.log.error('Error message');

      const output = stderrWrite.mock.calls[0][0] as string;
      expect(output).not.toMatch(/\x1b\[\d+m/);
      expect(output).toContain('✗');
    });

    it('should include colors when NO_COLOR is not set', () => {
      delete process.env.NO_COLOR;
      const colorConsole = createConsoleUtils();

      colorConsole.log.success('Test message');

      const output = stdoutWrite.mock.calls[0][0] as string;
      // Should contain ANSI escape codes
      expect(output).toMatch(/\x1b\[\d+m/);
    });
  });

  describe('FORCE_COLOR support', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should include colors when FORCE_COLOR is set', () => {
      process.env.FORCE_COLOR = '1';
      delete process.env.NO_COLOR;
      const forceColorConsole = createConsoleUtils();

      forceColorConsole.log.success('Test message');

      const output = stdoutWrite.mock.calls[0][0] as string;
      expect(output).toMatch(/\x1b\[\d+m/);
    });

    it('should include colors when FORCE_COLOR overrides NO_COLOR', () => {
      // FORCE_COLOR should take precedence over NO_COLOR
      process.env.FORCE_COLOR = '1';
      process.env.NO_COLOR = '1';
      const forceColorConsole = createConsoleUtils();

      forceColorConsole.log.success('Test message');

      const output = stdoutWrite.mock.calls[0][0] as string;
      // FORCE_COLOR wins - should have colors
      expect(output).toMatch(/\x1b\[\d+m/);
    });

    it('should not include colors when FORCE_COLOR is "0"', () => {
      process.env.FORCE_COLOR = '0';
      delete process.env.NO_COLOR;
      const noForceConsole = createConsoleUtils();

      noForceConsole.log.success('Test message');

      const output = stdoutWrite.mock.calls[0][0] as string;
      // FORCE_COLOR=0 disables colors
      expect(output).not.toMatch(/\x1b\[\d+m/);
    });
  });
});
