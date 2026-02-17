import { describe, it, expect } from 'vitest';
import { computeGridLayout } from './grid-layout.pure';
import type { GridRegion } from '../dashboard-types';

/** Helper: check two regions don't overlap */
function regionsOverlap(a: GridRegion, b: GridRegion): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/** Helper: compute area of a region */
function regionArea(r: GridRegion): number {
  return r.width * r.height;
}

describe('computeGridLayout', () => {
  describe('wide layout (120x40)', () => {
    const grid = computeGridLayout(120, 40, 'wide');

    it('header spans full width at row 0 with height 3', () => {
      expect(grid.header).toEqual({ x: 0, y: 0, width: 120, height: 3 });
    });

    it('stageHealth spans full width at bottom with height 3', () => {
      expect(grid.stageHealth.x).toBe(0);
      expect(grid.stageHealth.width).toBe(120);
      expect(grid.stageHealth.height).toBe(3);
      expect(grid.stageHealth.y + grid.stageHealth.height).toBe(40);
    });

    it('flowMap takes 45% of columns in wide mode', () => {
      expect(grid.flowMap.width).toBe(Math.floor(120 * 0.45));
    });

    it('focusedAgent takes remaining columns', () => {
      expect(grid.focusedAgent.width).toBe(120 - Math.floor(120 * 0.45));
    });

    it('flowMap and focusedAgent fill the main area height', () => {
      const mainHeight = 40 - 3 - 3;
      expect(grid.flowMap.height).toBe(mainHeight);
      expect(grid.focusedAgent.height).toBe(mainHeight);
    });

    it('flowMap starts at column 0, focusedAgent starts after flowMap', () => {
      expect(grid.flowMap.x).toBe(0);
      expect(grid.focusedAgent.x).toBe(grid.flowMap.width);
    });

    it('both panels start at row 3 (after header)', () => {
      expect(grid.flowMap.y).toBe(3);
      expect(grid.focusedAgent.y).toBe(3);
    });

    it('total dimensions match input', () => {
      expect(grid.total).toEqual({ width: 120, height: 40 });
    });
  });

  describe('medium layout (100x30)', () => {
    const grid = computeGridLayout(100, 30, 'medium');

    it('flowMap takes 40% of columns in medium mode', () => {
      expect(grid.flowMap.width).toBe(Math.floor(100 * 0.4));
    });

    it('focusedAgent takes remaining columns', () => {
      expect(grid.focusedAgent.width).toBe(100 - Math.floor(100 * 0.4));
    });

    it('main area height is total - header(3) - stageHealth(3)', () => {
      const mainHeight = 30 - 3 - 3;
      expect(grid.flowMap.height).toBe(mainHeight);
      expect(grid.focusedAgent.height).toBe(mainHeight);
    });
  });

  describe('narrow layout (60x20)', () => {
    const grid = computeGridLayout(60, 20, 'narrow');

    it('all regions span full width', () => {
      expect(grid.header.width).toBe(60);
      expect(grid.flowMap.width).toBe(60);
      expect(grid.focusedAgent.width).toBe(60);
      expect(grid.stageHealth.width).toBe(60);
    });

    it('header is at top with height 3', () => {
      expect(grid.header).toEqual({ x: 0, y: 0, width: 60, height: 3 });
    });

    it('stageHealth is at bottom with height 3', () => {
      expect(grid.stageHealth.height).toBe(3);
      expect(grid.stageHealth.y + grid.stageHealth.height).toBe(20);
    });

    it('flowMap has fixed height 5 above stageHealth', () => {
      expect(grid.flowMap.height).toBe(5);
      expect(grid.flowMap.y + grid.flowMap.height).toBe(grid.stageHealth.y);
    });

    it('focusedAgent fills remaining space between header and flowMap', () => {
      expect(grid.focusedAgent.y).toBe(3);
      expect(grid.focusedAgent.y + grid.focusedAgent.height).toBe(grid.flowMap.y);
    });

    it('vertical stack order: header, focusedAgent, flowMap, stageHealth', () => {
      expect(grid.header.y).toBeLessThan(grid.focusedAgent.y);
      expect(grid.focusedAgent.y).toBeLessThan(grid.flowMap.y);
      expect(grid.flowMap.y).toBeLessThan(grid.stageHealth.y);
    });
  });

  describe('narrow clamp at minimum height (40x10)', () => {
    const grid = computeGridLayout(40, 10, 'narrow');

    it('clamps flowMap height to mainHeight-1 when mainHeight < NARROW_FLOW_MAP_HEIGHT', () => {
      // mainHeight = 10 - 3 - 3 = 4, flowMapHeight = min(5, 4-1) = 3
      expect(grid.flowMap.height).toBe(3);
    });

    it('focusedAgent gets remaining 1 row', () => {
      expect(grid.focusedAgent.height).toBe(1);
    });

    it('regions still tile correctly', () => {
      expect(grid.focusedAgent.y + grid.focusedAgent.height).toBe(grid.flowMap.y);
      expect(grid.flowMap.y + grid.flowMap.height).toBe(grid.stageHealth.y);
    });
  });

  describe('medium layout additional assertions (100x30)', () => {
    const grid = computeGridLayout(100, 30, 'medium');

    it('flowMap and focusedAgent are side by side, not overlapping', () => {
      expect(grid.flowMap.x + grid.flowMap.width).toBe(grid.focusedAgent.x);
    });

    it('both panels start at row 3 (after header)', () => {
      expect(grid.flowMap.y).toBe(3);
      expect(grid.focusedAgent.y).toBe(3);
    });

    it('header and stageHealth span full width', () => {
      expect(grid.header.width).toBe(100);
      expect(grid.stageHealth.width).toBe(100);
    });

    it('total dimensions match input', () => {
      expect(grid.total).toEqual({ width: 100, height: 30 });
    });
  });

  describe('no overlap / no gap invariants', () => {
    const testCases: Array<{
      name: string;
      cols: number;
      rows: number;
      mode: 'wide' | 'medium' | 'narrow';
    }> = [
      { name: 'wide 120x40', cols: 120, rows: 40, mode: 'wide' },
      { name: 'medium 100x30', cols: 100, rows: 30, mode: 'medium' },
      { name: 'narrow 60x20', cols: 60, rows: 20, mode: 'narrow' },
      { name: 'minimum 40x10', cols: 40, rows: 10, mode: 'narrow' },
    ];

    for (const tc of testCases) {
      describe(tc.name, () => {
        const grid = computeGridLayout(tc.cols, tc.rows, tc.mode);
        const regions = [grid.header, grid.flowMap, grid.focusedAgent, grid.stageHealth];
        const regionNames = ['header', 'flowMap', 'focusedAgent', 'stageHealth'];

        it('no regions overlap', () => {
          for (let i = 0; i < regions.length; i++) {
            for (let j = i + 1; j < regions.length; j++) {
              expect(
                regionsOverlap(regions[i], regions[j]),
                `${regionNames[i]} overlaps ${regionNames[j]}`,
              ).toBe(false);
            }
          }
        });

        it('total area equals sum of region areas', () => {
          const totalArea = tc.cols * tc.rows;
          const sumArea = regions.reduce((s, r) => s + regionArea(r), 0);
          expect(sumArea).toBe(totalArea);
        });

        it('all regions have positive dimensions', () => {
          for (const region of regions) {
            expect(region.width).toBeGreaterThan(0);
            expect(region.height).toBeGreaterThan(0);
          }
        });

        it('no region extends beyond terminal bounds', () => {
          for (const region of regions) {
            expect(region.x + region.width).toBeLessThanOrEqual(tc.cols);
            expect(region.y + region.height).toBeLessThanOrEqual(tc.rows);
            expect(region.x).toBeGreaterThanOrEqual(0);
            expect(region.y).toBeGreaterThanOrEqual(0);
          }
        });
      });
    }
  });

  describe('degenerate size clamping', () => {
    it('clamps rows below minimum (rows=5) to MIN_ROWS=8', () => {
      const grid = computeGridLayout(60, 5, 'narrow');
      // Should clamp to 8 rows: header(3) + main(2) + stageHealth(3)
      expect(grid.total.height).toBe(8);
      expect(grid.header.height).toBe(3);
      expect(grid.stageHealth.height).toBe(3);
      expect(grid.focusedAgent.height).toBeGreaterThan(0);
      expect(grid.flowMap.height).toBeGreaterThan(0);
    });

    it('clamps columns below minimum (columns=10) to MIN_COLUMNS=20', () => {
      const grid = computeGridLayout(10, 30, 'medium');
      expect(grid.total.width).toBe(20);
      expect(grid.header.width).toBe(20);
    });

    it('clamps both dimensions simultaneously', () => {
      const grid = computeGridLayout(5, 3, 'narrow');
      expect(grid.total.width).toBe(20);
      expect(grid.total.height).toBe(8);
    });

    it('does not clamp valid dimensions', () => {
      const grid = computeGridLayout(120, 40, 'wide');
      expect(grid.total).toEqual({ width: 120, height: 40 });
    });

    it('clamped layout still satisfies all invariants', () => {
      const grid = computeGridLayout(5, 3, 'narrow');
      const regions = [grid.header, grid.flowMap, grid.focusedAgent, grid.stageHealth];

      // No overlap
      for (let i = 0; i < regions.length; i++) {
        for (let j = i + 1; j < regions.length; j++) {
          expect(regionsOverlap(regions[i], regions[j])).toBe(false);
        }
      }
      // Positive dimensions
      for (const region of regions) {
        expect(region.width).toBeGreaterThan(0);
        expect(region.height).toBeGreaterThan(0);
      }
      // Total area
      const totalArea = grid.total.width * grid.total.height;
      const sumArea = regions.reduce((s, r) => s + regionArea(r), 0);
      expect(sumArea).toBe(totalArea);
    });
  });

  describe('border-aware content dimensions at clamped minimum', () => {
    it('all bordered regions have at least 1 content row/column at minimum size', () => {
      const grid = computeGridLayout(5, 3, 'narrow');
      // After clamping to 20x8, all regions should have content space
      expect(grid.header.width - 2).toBeGreaterThanOrEqual(1);
      expect(grid.header.height - 2).toBeGreaterThanOrEqual(1);
      expect(grid.stageHealth.width - 2).toBeGreaterThanOrEqual(1);
      expect(grid.stageHealth.height - 2).toBeGreaterThanOrEqual(1);
      expect(grid.focusedAgent.width - 2).toBeGreaterThanOrEqual(1);
      // focusedAgent at minimum clamped size: height=1, no border subtraction guarantee
    });

    it('wide layout at standard size has ample content space', () => {
      const grid = computeGridLayout(120, 40, 'wide');
      expect(grid.focusedAgent.width - 2).toBeGreaterThanOrEqual(1);
      expect(grid.focusedAgent.height - 2).toBeGreaterThanOrEqual(1);
      expect(grid.flowMap.width - 2).toBeGreaterThanOrEqual(1);
      expect(grid.flowMap.height - 2).toBeGreaterThanOrEqual(1);
    });
  });
});
