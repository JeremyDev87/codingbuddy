import { describe, it, expect } from 'vitest';
import { computeEdgePath, computeLabelPosition, type PathSegment } from './edge-router';

describe('computeEdgePath', () => {
  describe('horizontal path (same row)', () => {
    it('produces horizontal segments left to right', () => {
      const path = computeEdgePath({ x: 0, y: 5 }, { x: 5, y: 5 });

      // All intermediate segments should be horizontal
      const intermediate = path.slice(0, -1);
      for (const seg of intermediate) {
        expect(seg.char).toBe('─');
        expect(seg.y).toBe(5);
      }

      // Segments should span from x=0 to x=4 (intermediate) + x=5 (arrow)
      expect(intermediate.map(s => s.x)).toEqual([0, 1, 2, 3, 4]);
    });

    it('produces horizontal segments right to left', () => {
      const path = computeEdgePath({ x: 5, y: 3 }, { x: 1, y: 3 });

      const intermediate = path.slice(0, -1);
      for (const seg of intermediate) {
        expect(seg.char).toBe('─');
        expect(seg.y).toBe(3);
      }
      expect(intermediate.map(s => s.x)).toEqual([5, 4, 3, 2]);
    });

    it('has right arrow at endpoint when going right', () => {
      const path = computeEdgePath({ x: 0, y: 0 }, { x: 3, y: 0 });
      const last = path[path.length - 1];
      expect(last).toEqual({ x: 3, y: 0, char: '▸' });
    });

    it('has left arrow at endpoint when going left', () => {
      const path = computeEdgePath({ x: 5, y: 0 }, { x: 1, y: 0 });
      const last = path[path.length - 1];
      expect(last).toEqual({ x: 1, y: 0, char: '◂' });
    });
  });

  describe('Manhattan path (different rows)', () => {
    it('produces only horizontal and vertical segments', () => {
      const path = computeEdgePath({ x: 2, y: 1 }, { x: 10, y: 5 });

      for (const seg of path) {
        expect(['─', '│', '╮', '╯', '╰', '╭', '▸', '◂']).toContain(seg.char);
      }
    });

    it('contains no diagonal moves', () => {
      const path = computeEdgePath({ x: 0, y: 0 }, { x: 8, y: 6 });

      for (let i = 1; i < path.length; i++) {
        const prev = path[i - 1];
        const curr = path[i];
        const dx = Math.abs(curr.x - prev.x);
        const dy = Math.abs(curr.y - prev.y);
        // Each step should move in exactly one axis
        expect(dx + dy).toBeLessThanOrEqual(1);
      }
    });

    it('routes through midpoint X', () => {
      const from = { x: 2, y: 0 };
      const to = { x: 10, y: 4 };
      const midX = Math.floor((from.x + to.x) / 2); // 6

      const path = computeEdgePath(from, to);

      // Vertical segments should be at midX
      const verticals = path.filter(s => s.char === '│');
      for (const seg of verticals) {
        expect(seg.x).toBe(midX);
      }
    });

    it('has arrow at endpoint going down-right', () => {
      const path = computeEdgePath({ x: 0, y: 0 }, { x: 10, y: 5 });
      const last = path[path.length - 1];
      expect(last.x).toBe(10);
      expect(last.y).toBe(5);
      expect(last.char).toBe('▸');
    });

    it('has arrow at endpoint going up-left', () => {
      const path = computeEdgePath({ x: 10, y: 5 }, { x: 0, y: 0 });
      const last = path[path.length - 1];
      expect(last.x).toBe(0);
      expect(last.y).toBe(0);
      expect(last.char).toBe('◂');
    });
  });

  describe('box-drawing characters for corners', () => {
    it('uses ╮ for top-right corner (going right then down)', () => {
      const path = computeEdgePath({ x: 0, y: 0 }, { x: 6, y: 4 });
      const corners = path.filter(s => s.char === '╮');
      expect(corners.length).toBeGreaterThanOrEqual(1);
    });

    it('uses ╰ for bottom-left corner (going down then right)', () => {
      const path = computeEdgePath({ x: 0, y: 0 }, { x: 6, y: 4 });
      const corners = path.filter(s => s.char === '╰');
      expect(corners.length).toBeGreaterThanOrEqual(1);
    });

    it('uses ╯ for corner going up', () => {
      const path = computeEdgePath({ x: 0, y: 4 }, { x: 6, y: 0 });
      const corners = path.filter(s => s.char === '╯');
      expect(corners.length).toBeGreaterThanOrEqual(1);
    });

    it('contains exactly two corner characters for a multi-row path', () => {
      const path = computeEdgePath({ x: 0, y: 0 }, { x: 10, y: 6 });
      const corners = path.filter(
        s => s.char === '╮' || s.char === '╯' || s.char === '╰' || s.char === '╭',
      );
      expect(corners).toHaveLength(2);
    });
  });

  describe('arrow char at endpoint', () => {
    it('uses ▸ for rightward endpoint (same row)', () => {
      const path = computeEdgePath({ x: 0, y: 0 }, { x: 5, y: 0 });
      expect(path[path.length - 1].char).toBe('▸');
    });

    it('uses ◂ for leftward endpoint (same row)', () => {
      const path = computeEdgePath({ x: 5, y: 0 }, { x: 0, y: 0 });
      expect(path[path.length - 1].char).toBe('◂');
    });

    it('uses ▸ for rightward endpoint (different rows)', () => {
      const path = computeEdgePath({ x: 0, y: 0 }, { x: 10, y: 5 });
      expect(path[path.length - 1].char).toBe('▸');
    });

    it('uses ◂ for leftward endpoint (different rows)', () => {
      const path = computeEdgePath({ x: 10, y: 5 }, { x: 0, y: 0 });
      expect(path[path.length - 1].char).toBe('◂');
    });
  });
});

describe('computeLabelPosition', () => {
  it('returns midpoint of horizontal segments', () => {
    // Create a simple horizontal path with 10 segments
    const path: PathSegment[] = [];
    for (let x = 0; x < 10; x++) {
      path.push({ x, y: 5, char: '─' });
    }
    path.push({ x: 10, y: 5, char: '▸' });

    const label = 'test'; // length 4
    const pos = computeLabelPosition(path, label);

    expect(pos).not.toBeNull();
    // 10 hSegments, label length 4, start = floor((10-4)/2) = 3
    expect(pos!.x).toBe(3);
    expect(pos!.y).toBe(5);
  });

  it('returns null when there is not enough room for the label', () => {
    // Only 2 horizontal segments, label needs 5 + 2 = 7
    const path: PathSegment[] = [
      { x: 0, y: 0, char: '─' },
      { x: 1, y: 0, char: '─' },
      { x: 2, y: 0, char: '▸' },
    ];

    const pos = computeLabelPosition(path, 'hello');
    expect(pos).toBeNull();
  });

  it('returns null when path has no horizontal segments', () => {
    const path: PathSegment[] = [
      { x: 5, y: 0, char: '╮' },
      { x: 5, y: 1, char: '│' },
      { x: 5, y: 2, char: '│' },
      { x: 5, y: 3, char: '╰' },
      { x: 6, y: 3, char: '▸' },
    ];

    const pos = computeLabelPosition(path, 'hi');
    expect(pos).toBeNull();
  });

  it('considers label.length + 2 as minimum horizontal space', () => {
    // label "ab" needs 2 + 2 = 4 horizontal segments
    const path: PathSegment[] = [
      { x: 0, y: 0, char: '─' },
      { x: 1, y: 0, char: '─' },
      { x: 2, y: 0, char: '─' },
      { x: 3, y: 0, char: '▸' },
    ];

    // Only 3 horizontal segments, need 4
    const pos = computeLabelPosition(path, 'ab');
    expect(pos).toBeNull();
  });

  it('returns position when exactly enough room', () => {
    // label "ab" needs 2 + 2 = 4 horizontal segments
    const path: PathSegment[] = [
      { x: 0, y: 2, char: '─' },
      { x: 1, y: 2, char: '─' },
      { x: 2, y: 2, char: '─' },
      { x: 3, y: 2, char: '─' },
      { x: 4, y: 2, char: '▸' },
    ];

    const pos = computeLabelPosition(path, 'ab');
    expect(pos).not.toBeNull();
    // 4 hSegments, label length 2, start = floor((4-2)/2) = 1
    expect(pos!.x).toBe(1);
    expect(pos!.y).toBe(2);
  });
});

describe('smooth corners (round box-drawing characters)', () => {
  it('uses ╮ for top-right corner (going right then down)', () => {
    const path = computeEdgePath({ x: 0, y: 0 }, { x: 6, y: 4 });
    const corners = path.filter(s => s.char === '╮');
    expect(corners.length).toBeGreaterThanOrEqual(1);
  });

  it('uses ╰ for bottom-left corner (going down then right)', () => {
    const path = computeEdgePath({ x: 0, y: 0 }, { x: 6, y: 4 });
    const corners = path.filter(s => s.char === '╰');
    expect(corners.length).toBeGreaterThanOrEqual(1);
  });

  it('uses ╯ for bottom-right corner', () => {
    const path = computeEdgePath({ x: 0, y: 4 }, { x: 6, y: 0 });
    const corners = path.filter(s => s.char === '╯');
    expect(corners.length).toBeGreaterThanOrEqual(1);
  });

  it('contains exactly two smooth corner characters for multi-row path', () => {
    const path = computeEdgePath({ x: 0, y: 0 }, { x: 10, y: 6 });
    const corners = path.filter(
      s => s.char === '╮' || s.char === '╯' || s.char === '╰' || s.char === '╭',
    );
    expect(corners).toHaveLength(2);
  });
});

describe('triangle arrow tips', () => {
  it('uses ▸ for rightward endpoint (same row)', () => {
    const path = computeEdgePath({ x: 0, y: 0 }, { x: 5, y: 0 });
    expect(path[path.length - 1].char).toBe('▸');
  });

  it('uses ◂ for leftward endpoint (same row)', () => {
    const path = computeEdgePath({ x: 5, y: 0 }, { x: 0, y: 0 });
    expect(path[path.length - 1].char).toBe('◂');
  });

  it('uses ▸ for rightward endpoint (different rows)', () => {
    const path = computeEdgePath({ x: 0, y: 0 }, { x: 10, y: 5 });
    expect(path[path.length - 1].char).toBe('▸');
  });

  it('uses ◂ for leftward endpoint (different rows)', () => {
    const path = computeEdgePath({ x: 10, y: 5 }, { x: 0, y: 0 });
    expect(path[path.length - 1].char).toBe('◂');
  });

  it('merges arrow with corner when to.x === midX (x differ by 1, going down)', () => {
    // from=(1,0) to=(0,4): midX = floor((1+0)/2) = 0 === to.x
    const path = computeEdgePath({ x: 1, y: 0 }, { x: 0, y: 4 });
    const last = path[path.length - 1];
    expect(last.x).toBe(0);
    expect(last.y).toBe(4);
    // Path arrives vertically, so use down arrow
    expect(last.char).toBe('▾');
    // No duplicate position — corner and arrow merged into one segment
    const atTarget = path.filter(s => s.x === 0 && s.y === 4);
    expect(atTarget).toHaveLength(1);
  });

  it('merges arrow with corner when to.x === midX (x differ by 1, going up)', () => {
    // from=(1,4) to=(0,0): midX = floor((1+0)/2) = 0 === to.x
    const path = computeEdgePath({ x: 1, y: 4 }, { x: 0, y: 0 });
    const last = path[path.length - 1];
    expect(last.x).toBe(0);
    expect(last.y).toBe(0);
    // Path arrives vertically, so use up arrow
    expect(last.char).toBe('▴');
    const atTarget = path.filter(s => s.x === 0 && s.y === 0);
    expect(atTarget).toHaveLength(1);
  });
});
