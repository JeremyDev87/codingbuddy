/**
 * CharBuffer - 2D character buffer for TUI rendering.
 *
 * Provides a fixed-size grid of characters with methods for writing text,
 * drawing lines, and rendering box-drawing characters. Out-of-bounds
 * writes are silently ignored; out-of-bounds reads return a space.
 */
export class CharBuffer {
  readonly width: number;
  readonly height: number;
  private readonly grid: string[][];

  constructor(width: number, height: number, fill = ' ') {
    this.width = width;
    this.height = height;
    this.grid = Array.from({ length: height }, () => Array(width).fill(fill) as string[]);
  }

  setChar(x: number, y: number, ch: string): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.grid[y][x] = ch;
  }

  getChar(x: number, y: number): string {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return ' ';
    return this.grid[y][x];
  }

  writeText(x: number, y: number, text: string): void {
    for (let i = 0; i < text.length; i++) {
      this.setChar(x + i, y, text[i]);
    }
  }

  drawHLine(x: number, y: number, length: number, ch = '─'): void {
    for (let i = 0; i < length; i++) {
      this.setChar(x + i, y, ch);
    }
  }

  drawVLine(x: number, y: number, length: number, ch = '│'): void {
    for (let i = 0; i < length; i++) {
      this.setChar(x, y + i, ch);
    }
  }

  drawBox(x: number, y: number, w: number, h: number): void {
    this.setChar(x, y, '┌');
    this.setChar(x + w - 1, y, '┐');
    this.setChar(x, y + h - 1, '└');
    this.setChar(x + w - 1, y + h - 1, '┘');
    this.drawHLine(x + 1, y, w - 2, '─');
    this.drawHLine(x + 1, y + h - 1, w - 2, '─');
    this.drawVLine(x, y + 1, h - 2, '│');
    this.drawVLine(x + w - 1, y + 1, h - 2, '│');
  }

  toString(): string {
    return this.grid.map(row => row.join('')).join('\n');
  }
}
