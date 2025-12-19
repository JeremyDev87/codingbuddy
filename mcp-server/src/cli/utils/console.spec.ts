import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createConsoleUtils, type ConsoleUtils } from './console';

describe('console utils', () => {
  let consoleUtils: ConsoleUtils;
  let stdoutWrite: ReturnType<typeof vi.spyOn>;
  let stderrWrite: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
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

  describe('spinner', () => {
    it('should start spinner with message', () => {
      consoleUtils.spinner.start('Loading...');

      expect(stdoutWrite).toHaveBeenCalled();
      const output = stdoutWrite.mock.calls[0][0] as string;
      expect(output).toContain('Loading...');
    });

    it('should stop spinner and show success', () => {
      consoleUtils.spinner.start('Loading...');
      stdoutWrite.mockClear();

      consoleUtils.spinner.succeed('Done!');

      expect(stdoutWrite).toHaveBeenCalled();
      const output = stdoutWrite.mock.calls.map((c) => c[0]).join('');
      expect(output).toContain('Done!');
      expect(output).toContain('✓');
    });

    it('should stop spinner and show failure', () => {
      consoleUtils.spinner.start('Loading...');
      stderrWrite.mockClear();

      consoleUtils.spinner.fail('Failed!');

      expect(stderrWrite).toHaveBeenCalled();
      const output = stderrWrite.mock.calls.map((c) => c[0]).join('');
      expect(output).toContain('Failed!');
      expect(output).toContain('✗');
    });

    it('should stop spinner without message', () => {
      consoleUtils.spinner.start('Loading...');
      stdoutWrite.mockClear();

      consoleUtils.spinner.stop();

      // Should clear the spinner line
      expect(stdoutWrite).toHaveBeenCalled();
    });
  });

  describe('formatConfig', () => {
    it('should format config object as readable output', () => {
      const config = {
        projectName: 'my-app',
        techStack: {
          frontend: ['React'],
        },
      };

      const result = consoleUtils.formatConfig(config);

      expect(result).toContain('projectName');
      expect(result).toContain('my-app');
      expect(result).toContain('React');
    });
  });
});
