import { describe, it, expect } from 'vitest';
import { CharBuffer } from './char-buffer';

describe('CharBuffer', () => {
  it('creates buffer with given dimensions', () => {
    const buf = new CharBuffer(10, 5);
    expect(buf.width).toBe(10);
    expect(buf.height).toBe(5);
  });

  it('fills with spaces by default', () => {
    const buf = new CharBuffer(3, 2);
    const output = buf.toString();
    expect(output).toBe('   \n   ');
  });

  it('fills with custom character when specified', () => {
    const buf = new CharBuffer(3, 2, '.');
    const output = buf.toString();
    expect(output).toBe('...\n...');
  });

  it('writes char at position', () => {
    const buf = new CharBuffer(5, 3);
    buf.setChar(2, 1, 'X');
    expect(buf.getChar(2, 1)).toBe('X');
  });

  it('ignores out-of-bounds writes', () => {
    const buf = new CharBuffer(5, 3);
    // These should not throw
    buf.setChar(-1, 0, 'X');
    buf.setChar(0, -1, 'X');
    buf.setChar(5, 0, 'X');
    buf.setChar(0, 3, 'X');
    // Buffer should remain unchanged (all spaces)
    expect(buf.toString()).toBe('     \n     \n     ');
  });

  it('reads char at position', () => {
    const buf = new CharBuffer(5, 3);
    buf.setChar(0, 0, 'A');
    buf.setChar(4, 2, 'Z');
    expect(buf.getChar(0, 0)).toBe('A');
    expect(buf.getChar(4, 2)).toBe('Z');
    // Unmodified cell returns space
    expect(buf.getChar(2, 1)).toBe(' ');
  });

  it('returns space for out-of-bounds reads', () => {
    const buf = new CharBuffer(5, 3);
    expect(buf.getChar(-1, 0)).toBe(' ');
    expect(buf.getChar(0, -1)).toBe(' ');
    expect(buf.getChar(5, 0)).toBe(' ');
    expect(buf.getChar(0, 3)).toBe(' ');
    expect(buf.getChar(100, 100)).toBe(' ');
  });

  it('writes text at position', () => {
    const buf = new CharBuffer(10, 1);
    buf.writeText(2, 0, 'hello');
    expect(buf.toString()).toBe('  hello   ');
  });

  it('clips text that exceeds width', () => {
    const buf = new CharBuffer(5, 1);
    buf.writeText(3, 0, 'abcdef');
    // Only 'ab' should fit at positions 3 and 4
    expect(buf.getChar(3, 0)).toBe('a');
    expect(buf.getChar(4, 0)).toBe('b');
    // Original spaces before the text are preserved
    expect(buf.toString()).toBe('   ab');
  });

  it('draws horizontal line', () => {
    const buf = new CharBuffer(10, 1);
    buf.drawHLine(2, 0, 5);
    expect(buf.toString()).toBe('  ─────   ');
  });

  it('draws horizontal line with custom character', () => {
    const buf = new CharBuffer(10, 1);
    buf.drawHLine(0, 0, 4, '=');
    expect(buf.toString()).toBe('====      ');
  });

  it('draws vertical line', () => {
    const buf = new CharBuffer(3, 5);
    buf.drawVLine(1, 1, 3);
    const lines = buf.toString().split('\n');
    expect(lines[0]).toBe('   ');
    expect(lines[1]).toBe(' │ ');
    expect(lines[2]).toBe(' │ ');
    expect(lines[3]).toBe(' │ ');
    expect(lines[4]).toBe('   ');
  });

  it('draws vertical line with custom character', () => {
    const buf = new CharBuffer(1, 3);
    buf.drawVLine(0, 0, 3, '|');
    expect(buf.toString()).toBe('|\n|\n|');
  });

  describe('drawBox', () => {
    it('draws box with correct corners and edges', () => {
      const buf = new CharBuffer(7, 4);
      buf.drawBox(0, 0, 7, 4);
      const lines = buf.toString().split('\n');

      // Top row: ┌─────┐
      expect(lines[0]).toBe('┌─────┐');
      // Middle rows: │     │
      expect(lines[1]).toBe('│     │');
      expect(lines[2]).toBe('│     │');
      // Bottom row: └─────┘
      expect(lines[3]).toBe('└─────┘');
    });

    it('draws minimum 2x2 box', () => {
      const buf = new CharBuffer(2, 2);
      buf.drawBox(0, 0, 2, 2);
      const lines = buf.toString().split('\n');
      expect(lines[0]).toBe('┌┐');
      expect(lines[1]).toBe('└┘');
    });

    it('draws box at offset position', () => {
      const buf = new CharBuffer(10, 6);
      buf.drawBox(2, 1, 5, 3);

      expect(buf.getChar(2, 1)).toBe('┌');
      expect(buf.getChar(6, 1)).toBe('┐');
      expect(buf.getChar(2, 3)).toBe('└');
      expect(buf.getChar(6, 3)).toBe('┘');
      expect(buf.getChar(3, 1)).toBe('─');
      expect(buf.getChar(2, 2)).toBe('│');
    });
  });

  it('toString joins rows with newlines', () => {
    const buf = new CharBuffer(3, 3);
    buf.setChar(0, 0, 'A');
    buf.setChar(1, 1, 'B');
    buf.setChar(2, 2, 'C');
    expect(buf.toString()).toBe('A  \n B \n  C');
  });
});
