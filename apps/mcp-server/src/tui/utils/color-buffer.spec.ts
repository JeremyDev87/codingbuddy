import { describe, it, expect } from 'vitest';
import { ColorBuffer, groupByStyle, type ColorCell, type CellStyle } from './color-buffer';

describe('ColorBuffer', () => {
  it('creates buffer with given dimensions', () => {
    const buf = new ColorBuffer(10, 5);
    expect(buf.width).toBe(10);
    expect(buf.height).toBe(5);
  });

  it('fills with space and empty style by default', () => {
    const buf = new ColorBuffer(3, 2);
    const cell = buf.getCell(0, 0);
    expect(cell.char).toBe(' ');
    expect(cell.style).toEqual({});
  });

  describe('setChar / getCell', () => {
    it('sets char with style at position', () => {
      const buf = new ColorBuffer(5, 3);
      const style: CellStyle = { fg: 'cyan', bold: true };
      buf.setChar(2, 1, 'X', style);
      const cell = buf.getCell(2, 1);
      expect(cell.char).toBe('X');
      expect(cell.style).toEqual(style);
    });

    it('sets char without style', () => {
      const buf = new ColorBuffer(5, 3);
      buf.setChar(0, 0, 'A');
      const cell = buf.getCell(0, 0);
      expect(cell.char).toBe('A');
      expect(cell.style).toEqual({});
    });

    it('ignores out-of-bounds writes', () => {
      const buf = new ColorBuffer(5, 3);
      buf.setChar(-1, 0, 'X');
      buf.setChar(0, -1, 'X');
      buf.setChar(5, 0, 'X');
      buf.setChar(0, 3, 'X');
      // All cells should still be default
      expect(buf.getCell(0, 0).char).toBe(' ');
    });

    it('returns space with empty style for out-of-bounds reads', () => {
      const buf = new ColorBuffer(5, 3);
      const cell = buf.getCell(-1, 0);
      expect(cell.char).toBe(' ');
      expect(cell.style).toEqual({});
      expect(buf.getCell(100, 100).char).toBe(' ');
    });
  });

  describe('writeText', () => {
    it('writes text with style at position', () => {
      const buf = new ColorBuffer(10, 1);
      const style: CellStyle = { fg: 'magenta' };
      buf.writeText(2, 0, 'hello', style);
      expect(buf.getCell(2, 0)).toEqual({ char: 'h', style });
      expect(buf.getCell(3, 0)).toEqual({ char: 'e', style });
      expect(buf.getCell(6, 0)).toEqual({ char: 'o', style });
    });

    it('clips text that exceeds width', () => {
      const buf = new ColorBuffer(5, 1);
      buf.writeText(3, 0, 'abcdef');
      expect(buf.getCell(3, 0).char).toBe('a');
      expect(buf.getCell(4, 0).char).toBe('b');
      // Position 5 is out of bounds - should not crash
    });

    it('writes text without style', () => {
      const buf = new ColorBuffer(10, 1);
      buf.writeText(0, 0, 'hi');
      expect(buf.getCell(0, 0)).toEqual({ char: 'h', style: {} });
    });
  });

  describe('drawHLine', () => {
    it('draws horizontal line with default char', () => {
      const buf = new ColorBuffer(10, 1);
      const style: CellStyle = { fg: 'cyan' };
      buf.drawHLine(2, 0, 5, '─', style);
      expect(buf.getCell(2, 0)).toEqual({ char: '─', style });
      expect(buf.getCell(6, 0)).toEqual({ char: '─', style });
      expect(buf.getCell(1, 0).char).toBe(' ');
      expect(buf.getCell(7, 0).char).toBe(' ');
    });

    it('draws horizontal line with custom char', () => {
      const buf = new ColorBuffer(10, 1);
      buf.drawHLine(0, 0, 4, '=');
      expect(buf.getCell(0, 0).char).toBe('=');
      expect(buf.getCell(3, 0).char).toBe('=');
    });
  });

  describe('drawVLine', () => {
    it('draws vertical line', () => {
      const buf = new ColorBuffer(3, 5);
      const style: CellStyle = { fg: 'green' };
      buf.drawVLine(1, 1, 3, '│', style);
      expect(buf.getCell(1, 1)).toEqual({ char: '│', style });
      expect(buf.getCell(1, 2)).toEqual({ char: '│', style });
      expect(buf.getCell(1, 3)).toEqual({ char: '│', style });
      expect(buf.getCell(1, 0).char).toBe(' ');
      expect(buf.getCell(1, 4).char).toBe(' ');
    });
  });

  describe('drawBox', () => {
    it('draws box with correct corners and edges', () => {
      const buf = new ColorBuffer(7, 4);
      const style: CellStyle = { fg: 'cyan' };
      buf.drawBox(0, 0, 7, 4, style);

      expect(buf.getCell(0, 0)).toEqual({ char: '┌', style });
      expect(buf.getCell(6, 0)).toEqual({ char: '┐', style });
      expect(buf.getCell(0, 3)).toEqual({ char: '└', style });
      expect(buf.getCell(6, 3)).toEqual({ char: '┘', style });
      // Top edge
      expect(buf.getCell(3, 0)).toEqual({ char: '─', style });
      // Left edge
      expect(buf.getCell(0, 1)).toEqual({ char: '│', style });
      // Interior untouched
      expect(buf.getCell(3, 1).char).toBe(' ');
    });

    it('draws minimum 2x2 box', () => {
      const buf = new ColorBuffer(2, 2);
      buf.drawBox(0, 0, 2, 2);
      expect(buf.getCell(0, 0).char).toBe('┌');
      expect(buf.getCell(1, 0).char).toBe('┐');
      expect(buf.getCell(0, 1).char).toBe('└');
      expect(buf.getCell(1, 1).char).toBe('┘');
    });
  });

  describe('toLines', () => {
    it('returns row-major ColorCell[][] array', () => {
      const buf = new ColorBuffer(3, 2);
      const style: CellStyle = { fg: 'red', bold: true };
      buf.setChar(1, 0, 'X', style);

      const lines = buf.toLines();
      expect(lines).toHaveLength(2);
      expect(lines[0]).toHaveLength(3);
      expect(lines[0][1]).toEqual({ char: 'X', style });
      expect(lines[0][0]).toEqual({ char: ' ', style: {} });
      expect(lines[1][0]).toEqual({ char: ' ', style: {} });
    });

    it('returns independent copy (mutation-safe)', () => {
      const buf = new ColorBuffer(2, 1);
      buf.setChar(0, 0, 'A');
      const lines1 = buf.toLines();
      buf.setChar(0, 0, 'B');
      const lines2 = buf.toLines();
      expect(lines1[0][0].char).toBe('A');
      expect(lines2[0][0].char).toBe('B');
    });
  });

  describe('groupByStyle (static utility)', () => {
    it('groups consecutive cells with same style into segments', () => {
      const cells: ColorCell[] = [
        { char: 'H', style: { fg: 'cyan', bold: true } },
        { char: 'i', style: { fg: 'cyan', bold: true } },
        { char: ' ', style: {} },
        { char: 'X', style: { fg: 'red' } },
      ];

      const segments = groupByStyle(cells);
      expect(segments).toHaveLength(3);
      expect(segments[0]).toEqual({ text: 'Hi', style: { fg: 'cyan', bold: true } });
      expect(segments[1]).toEqual({ text: ' ', style: {} });
      expect(segments[2]).toEqual({ text: 'X', style: { fg: 'red' } });
    });

    it('handles empty array', () => {
      expect(groupByStyle([])).toEqual([]);
    });

    it('handles single cell', () => {
      const cells: ColorCell[] = [{ char: 'A', style: { fg: 'green' } }];
      expect(groupByStyle(cells)).toEqual([{ text: 'A', style: { fg: 'green' } }]);
    });
  });
});
