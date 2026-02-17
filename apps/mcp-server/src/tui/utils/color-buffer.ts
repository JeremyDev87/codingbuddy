/**
 * ColorBuffer - 2D character buffer with per-cell color metadata.
 *
 * Replaces CharBuffer. Each cell stores a character and a CellStyle.
 * The toLines() method returns ColorCell[][] for Ink <Text> rendering.
 * Out-of-bounds writes are silently ignored; reads return default cell.
 */

export interface CellStyle {
  fg?: 'cyan' | 'magenta' | 'green' | 'yellow' | 'red' | 'white' | 'gray';
  bold?: boolean;
  dim?: boolean;
}

export interface ColorCell {
  char: string;
  style: CellStyle;
}

export interface StyledSegment {
  text: string;
  style: CellStyle;
}

const DEFAULT_CELL: ColorCell = Object.freeze({ char: ' ', style: Object.freeze({}) });

function stylesEqual(a: CellStyle, b: CellStyle): boolean {
  return a.fg === b.fg && a.bold === b.bold && a.dim === b.dim;
}

/**
 * Group consecutive cells with the same style into StyledSegments.
 * Used by Ink components to render row-by-row with <Text> spans.
 */
export function groupByStyle(cells: ReadonlyArray<ColorCell>): StyledSegment[] {
  if (cells.length === 0) return [];

  const segments: StyledSegment[] = [];
  let current: StyledSegment = { text: cells[0].char, style: cells[0].style };

  for (let i = 1; i < cells.length; i++) {
    const cell = cells[i];
    if (stylesEqual(current.style, cell.style)) {
      current.text += cell.char;
    } else {
      segments.push(current);
      current = { text: cell.char, style: cell.style };
    }
  }
  segments.push(current);

  return segments;
}

export class ColorBuffer {
  readonly width: number;
  readonly height: number;
  private readonly grid: ColorCell[][];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.grid = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => ({ char: ' ', style: {} })),
    );
  }

  setChar(x: number, y: number, ch: string, style: CellStyle = {}): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.grid[y][x] = { char: ch, style };
  }

  getCell(x: number, y: number): ColorCell {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return DEFAULT_CELL;
    }
    return this.grid[y][x];
  }

  writeText(x: number, y: number, text: string, style: CellStyle = {}): void {
    for (let i = 0; i < text.length; i++) {
      this.setChar(x + i, y, text[i], style);
    }
  }

  drawHLine(x: number, y: number, length: number, ch = '─', style: CellStyle = {}): void {
    for (let i = 0; i < length; i++) {
      this.setChar(x + i, y, ch, style);
    }
  }

  drawVLine(x: number, y: number, length: number, ch = '│', style: CellStyle = {}): void {
    for (let i = 0; i < length; i++) {
      this.setChar(x, y + i, ch, style);
    }
  }

  drawBox(x: number, y: number, w: number, h: number, style: CellStyle = {}): void {
    this.setChar(x, y, '┌', style);
    this.setChar(x + w - 1, y, '┐', style);
    this.setChar(x, y + h - 1, '└', style);
    this.setChar(x + w - 1, y + h - 1, '┘', style);
    this.drawHLine(x + 1, y, w - 2, '─', style);
    this.drawHLine(x + 1, y + h - 1, w - 2, '─', style);
    this.drawVLine(x, y + 1, h - 2, '│', style);
    this.drawVLine(x + w - 1, y + 1, h - 2, '│', style);
  }

  /**
   * Returns row-major ColorCell[][] for Ink rendering.
   * Each call returns a fresh copy to avoid mutation issues.
   */
  toLines(): ColorCell[][] {
    return this.grid.map(row => row.map(cell => ({ char: cell.char, style: { ...cell.style } })));
  }

  /**
   * Returns internal grid directly without copying.
   * Safe when the buffer is local/ephemeral and won't be mutated after read.
   * Avoids O(w*h) object allocations per render cycle.
   */
  toLinesDirect(): ReadonlyArray<ReadonlyArray<ColorCell>> {
    return this.grid;
  }
}
