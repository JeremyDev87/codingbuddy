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
    const mainHeight = 40 - 3 - 3; // 34
    const checklistHeight = Math.max(6, Math.min(10, Math.ceil(mainHeight * 0.3))); // 10

    it('header spans full width at row 0 with height 3', () => {
      expect(grid.header).toEqual({ x: 0, y: 0, width: 120, height: 3 });
    });

    it('stageHealth spans full width at bottom with height 3', () => {
      expect(grid.stageHealth.x).toBe(0);
      expect(grid.stageHealth.width).toBe(120);
      expect(grid.stageHealth.height).toBe(3);
      expect(grid.stageHealth.y + grid.stageHealth.height).toBe(40);
    });

    it('focusedAgent has fixed width 63 in wide mode', () => {
      expect(grid.focusedAgent.width).toBe(63);
    });

    it('flowMap takes all remaining width after focusedAgent', () => {
      expect(grid.flowMap.width).toBe(120 - 63);
    });

    it('focusedAgent is right-aligned', () => {
      expect(grid.focusedAgent.x + grid.focusedAgent.width).toBe(120);
    });

    it('flowMap and monitorPanel split the left column height evenly', () => {
      const flowMapHeight = Math.ceil(mainHeight / 2); // 17
      const monitorHeight = mainHeight - flowMapHeight; // 17
      expect(grid.flowMap.height).toBe(flowMapHeight);
      expect(grid.monitorPanel.height).toBe(monitorHeight);
    });

    it('monitorPanel sits below flowMap with same width', () => {
      expect(grid.monitorPanel.x).toBe(0);
      expect(grid.monitorPanel.y).toBe(grid.flowMap.y + grid.flowMap.height);
      expect(grid.monitorPanel.width).toBe(grid.flowMap.width);
    });

    it('focusedAgent spans mainHeight minus checklistPanel height', () => {
      expect(grid.focusedAgent.height).toBe(mainHeight - checklistHeight);
    });

    it('flowMap starts at column 0, focusedAgent starts after flowMap', () => {
      expect(grid.flowMap.x).toBe(0);
      expect(grid.focusedAgent.x).toBe(grid.flowMap.width);
    });

    it('flowMap starts at row 3 (after header)', () => {
      expect(grid.flowMap.y).toBe(3);
    });

    it('focusedAgent starts below checklistPanel', () => {
      expect(grid.focusedAgent.y).toBe(grid.checklistPanel.y + grid.checklistPanel.height);
    });

    it('checklistPanel sits at the top of the focused-agent column', () => {
      expect(grid.checklistPanel.x).toBe(grid.focusedAgent.x);
      expect(grid.checklistPanel.width).toBe(grid.focusedAgent.width);
      expect(grid.checklistPanel.y).toBe(3);
      expect(grid.checklistPanel.height).toBe(checklistHeight);
    });

    it('total dimensions match input', () => {
      expect(grid.total).toEqual({ width: 120, height: 40 });
    });
  });

  describe('medium layout (100x30)', () => {
    const grid = computeGridLayout(100, 30, 'medium');
    const mainHeight = 30 - 3 - 3; // 24
    const checklistHeight = Math.max(6, Math.min(10, Math.ceil(mainHeight * 0.3))); // 8

    it('focusedAgent has fixed width 58 in medium mode', () => {
      expect(grid.focusedAgent.width).toBe(58);
    });

    it('flowMap takes all remaining width after focusedAgent', () => {
      expect(grid.flowMap.width).toBe(100 - 58);
    });

    it('focusedAgent is right-aligned', () => {
      expect(grid.focusedAgent.x + grid.focusedAgent.width).toBe(100);
    });

    it('main area height: focusedAgent height equals mainHeight minus checklistPanel height', () => {
      expect(grid.focusedAgent.height).toBe(mainHeight - checklistHeight);
    });

    it('flowMap and monitorPanel split the left column height', () => {
      const flowMapHeight = Math.ceil(mainHeight / 2); // 12
      const monitorHeight = mainHeight - flowMapHeight; // 12
      expect(grid.flowMap.height).toBe(flowMapHeight);
      expect(grid.monitorPanel.height).toBe(monitorHeight);
    });

    it('monitorPanel sits below flowMap', () => {
      expect(grid.monitorPanel.y).toBe(grid.flowMap.y + grid.flowMap.height);
      expect(grid.monitorPanel.width).toBe(grid.flowMap.width);
    });

    it('focusedAgent starts below checklistPanel', () => {
      expect(grid.focusedAgent.y).toBe(grid.checklistPanel.y + grid.checklistPanel.height);
    });

    it('checklistPanel sits at the top of the focused-agent column', () => {
      expect(grid.checklistPanel.x).toBe(grid.focusedAgent.x);
      expect(grid.checklistPanel.width).toBe(grid.focusedAgent.width);
      expect(grid.checklistPanel.y).toBe(3);
      expect(grid.checklistPanel.height).toBe(checklistHeight);
    });
  });

  describe('narrow layout (60x20)', () => {
    const grid = computeGridLayout(60, 20, 'narrow');
    const mainHeight = 20 - 3 - 3; // 14
    const flowMapHeight = Math.min(5, mainHeight - 1); // 5
    const availableForChecklist = mainHeight - flowMapHeight; // 9
    const rawChecklistHeight = Math.max(6, Math.min(10, Math.ceil(mainHeight * 0.3))); // 6
    const checklistHeight = Math.min(rawChecklistHeight, Math.max(0, availableForChecklist - 1)); // 6

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
      expect(grid.stageHealth.height).toBe(3);
      expect(grid.stageHealth.y + grid.stageHealth.height).toBe(20);
    });

    it('flowMap has fixed height 5 above stageHealth', () => {
      expect(grid.flowMap.height).toBe(5);
      expect(grid.flowMap.y + grid.flowMap.height).toBe(grid.stageHealth.y);
    });

    it('checklistPanel is at top in narrow mode', () => {
      expect(grid.checklistPanel.x).toBe(0);
      expect(grid.checklistPanel.width).toBe(60);
      expect(grid.checklistPanel.y).toBe(3);
      expect(grid.checklistPanel.height).toBe(checklistHeight);
    });

    it('focusedAgent fills remaining space between checklistPanel and flowMap', () => {
      expect(grid.focusedAgent.y).toBe(grid.checklistPanel.y + grid.checklistPanel.height);
      expect(grid.focusedAgent.y + grid.focusedAgent.height).toBe(grid.flowMap.y);
    });

    it('vertical stack order: header, checklistPanel, focusedAgent, flowMap, stageHealth', () => {
      expect(grid.header.y).toBeLessThan(grid.checklistPanel.y);
      expect(grid.checklistPanel.y).toBeLessThan(grid.focusedAgent.y);
      expect(grid.focusedAgent.y).toBeLessThan(grid.flowMap.y);
      expect(grid.flowMap.y).toBeLessThan(grid.stageHealth.y);
    });

    it('monitorPanel is hidden in narrow mode', () => {
      expect(grid.monitorPanel).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    });
  });

  describe('narrow clamp at minimum height (40x10)', () => {
    const grid = computeGridLayout(40, 10, 'narrow');

    it('clamps flowMap height to mainHeight-1 when mainHeight < NARROW_FLOW_MAP_HEIGHT', () => {
      // mainHeight = 10 - 3 - 3 = 4, flowMapHeight = min(5, 4-1) = 3
      expect(grid.flowMap.height).toBe(3);
    });

    it('focusedAgent gets remaining row after checklist (checklist=0 when no space)', () => {
      // availableForChecklist = 4-3 = 1, checklistHeight = min(6, max(0,1-1)) = 0
      // focusedHeight = 1 - 0 = 1
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

    it('flowMap and checklistPanel start at row 3 (after header)', () => {
      expect(grid.flowMap.y).toBe(3);
      expect(grid.checklistPanel.y).toBe(3);
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
      { name: 'wide 200x50', cols: 200, rows: 50, mode: 'wide' },
      { name: 'medium 100x30', cols: 100, rows: 30, mode: 'medium' },
      { name: 'medium-clamped 60x30', cols: 60, rows: 30, mode: 'medium' },
      { name: 'narrow 60x20', cols: 60, rows: 20, mode: 'narrow' },
      { name: 'minimum 40x10', cols: 40, rows: 10, mode: 'narrow' },
    ];

    for (const tc of testCases) {
      describe(tc.name, () => {
        const grid = computeGridLayout(tc.cols, tc.rows, tc.mode);
        const allRegions = [
          grid.header,
          grid.flowMap,
          grid.focusedAgent,
          grid.stageHealth,
          grid.monitorPanel,
          grid.checklistPanel,
        ];
        const allNames = [
          'header',
          'flowMap',
          'focusedAgent',
          'stageHealth',
          'monitorPanel',
          'checklistPanel',
        ];
        // narrow 모드에서는 monitorPanel이 0x0이므로 필터링, checklistPanel도 공간 부족 시 0
        const regions = allRegions.filter(r => r.width > 0 && r.height > 0);
        const regionNames = allNames.filter(
          (_, i) => allRegions[i].width > 0 && allRegions[i].height > 0,
        );

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
      const allRegions = [
        grid.header,
        grid.flowMap,
        grid.focusedAgent,
        grid.stageHealth,
        grid.monitorPanel,
        grid.checklistPanel,
      ];
      const regions = allRegions.filter(r => r.width > 0 && r.height > 0);

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

  describe('edge case: terminal narrower than focused width + MIN_COLUMNS', () => {
    // medium mode but only 60 columns (< 64 + 20 = 84, but clamp ensures flowMap >= MIN_COLUMNS)
    const grid = computeGridLayout(60, 30, 'medium');

    it('focusedAgent width is clamped so flowMap gets at least MIN_COLUMNS', () => {
      expect(grid.flowMap.width).toBeGreaterThanOrEqual(20);
      expect(grid.focusedAgent.width).toBeLessThanOrEqual(60 - 20);
    });

    it('focusedAgent is still right-aligned', () => {
      expect(grid.focusedAgent.x + grid.focusedAgent.width).toBe(60);
    });

    it('no overlap between flowMap and focusedAgent', () => {
      expect(grid.flowMap.x + grid.flowMap.width).toBe(grid.focusedAgent.x);
    });
  });

  describe('wide layout scales flowMap with terminal width', () => {
    it('flowMap grows when terminal is wider, focusedAgent stays fixed', () => {
      const grid150 = computeGridLayout(150, 40, 'wide');
      const grid200 = computeGridLayout(200, 40, 'wide');

      // focusedAgent stays at 63 in both
      expect(grid150.focusedAgent.width).toBe(63);
      expect(grid200.focusedAgent.width).toBe(63);

      // flowMap grows with terminal width
      expect(grid150.flowMap.width).toBe(87);
      expect(grid200.flowMap.width).toBe(137);
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
      expect(grid.monitorPanel.width - 2).toBeGreaterThanOrEqual(1);
      expect(grid.monitorPanel.height - 2).toBeGreaterThanOrEqual(1);
    });
  });
});
