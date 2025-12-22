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
});
