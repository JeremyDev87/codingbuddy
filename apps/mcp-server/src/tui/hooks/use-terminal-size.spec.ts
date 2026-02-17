import { describe, it, expect } from 'vitest';
import { getTerminalSize, type TerminalSize } from './use-terminal-size';

/**
 * Tests for the pure getTerminalSize helper.
 * The React hook (useTerminalSize) is not tested here because it requires
 * an Ink rendering context; only the pure extraction logic is verified.
 */
describe('getTerminalSize', () => {
  it('returns columns and rows from stdout', () => {
    const mockStdout = { columns: 200, rows: 60 } as NodeJS.WriteStream;
    const result: TerminalSize = getTerminalSize(mockStdout);
    expect(result).toEqual({ columns: 200, rows: 60 });
  });

  it('returns defaults when stdout is undefined', () => {
    const result = getTerminalSize(undefined);
    expect(result).toEqual({ columns: 120, rows: 40 });
  });

  it('returns default columns when stdout.columns is undefined', () => {
    const mockStdout = {
      columns: undefined,
      rows: 50,
    } as unknown as NodeJS.WriteStream;
    const result = getTerminalSize(mockStdout);
    expect(result.columns).toBe(120);
    expect(result.rows).toBe(50);
  });

  it('returns default rows when stdout.rows is undefined', () => {
    const mockStdout = {
      columns: 80,
      rows: undefined,
    } as unknown as NodeJS.WriteStream;
    const result = getTerminalSize(mockStdout);
    expect(result.columns).toBe(80);
    expect(result.rows).toBe(40);
  });

  it('returns defaults when both columns and rows are undefined', () => {
    const mockStdout = {
      columns: undefined,
      rows: undefined,
    } as unknown as NodeJS.WriteStream;
    const result = getTerminalSize(mockStdout);
    expect(result).toEqual({ columns: 120, rows: 40 });
  });

  describe('integration with getLayoutMode', () => {
    it('maps narrow terminal (< 80 columns) correctly', () => {
      const mockStdout = { columns: 60, rows: 24 } as NodeJS.WriteStream;
      const result = getTerminalSize(mockStdout);
      expect(result.columns).toBe(60);
      // Verify the value would produce 'narrow' via getLayoutMode
      // (getLayoutMode is tested in dashboard-types.spec.ts; here we just
      // confirm the columns value is what we expect for the mapping)
      expect(result.columns).toBeLessThan(80);
    });

    it('maps medium terminal (80-119 columns) correctly', () => {
      const mockStdout = { columns: 100, rows: 30 } as NodeJS.WriteStream;
      const result = getTerminalSize(mockStdout);
      expect(result.columns).toBe(100);
      expect(result.columns).toBeGreaterThanOrEqual(80);
      expect(result.columns).toBeLessThan(120);
    });

    it('maps wide terminal (>= 120 columns) correctly', () => {
      const mockStdout = { columns: 200, rows: 50 } as NodeJS.WriteStream;
      const result = getTerminalSize(mockStdout);
      expect(result.columns).toBe(200);
      expect(result.columns).toBeGreaterThanOrEqual(120);
    });

    it('maps default size to wide layout', () => {
      // Default is 120x40, which is >= 120 -> wide
      const result = getTerminalSize(undefined);
      expect(result.columns).toBe(120);
      expect(result.columns).toBeGreaterThanOrEqual(120);
    });
  });
});
