import { describe, it, expect } from 'vitest';
import {
  layoutStageColumns,
  layoutAgentNodes,
  renderFlowMap,
  renderFlowMapSimplified,
  renderFlowMapCompact,
  renderPipelineHeader,
  buildProgressBar,
} from './flow-map.pure';
import { ColorBuffer } from '../utils/color-buffer';
import type { DashboardNode, Edge } from '../dashboard-types';
import type { Mode } from '../types';

/** Extract plain text from ColorBuffer for assertion convenience. */
function bufferToString(buf: ColorBuffer): string {
  return buf
    .toLines()
    .map(row => row.map(cell => cell.char).join(''))
    .join('\n');
}

function makeAgent(
  overrides: Partial<DashboardNode> & { id: string; name: string; stage: Mode },
): DashboardNode {
  return {
    status: 'idle',
    isPrimary: false,
    progress: 0,
    ...overrides,
  };
}

function createTestAgents(): Map<string, DashboardNode> {
  return new Map<string, DashboardNode>([
    [
      'arch-1',
      makeAgent({
        id: 'arch-1',
        name: 'Architect',
        stage: 'PLAN',
        status: 'running',
        isPrimary: true,
      }),
    ],
    [
      'dev-1',
      makeAgent({
        id: 'dev-1',
        name: 'Developer',
        stage: 'ACT',
        status: 'running',
        isPrimary: true,
      }),
    ],
    [
      'rev-1',
      makeAgent({
        id: 'rev-1',
        name: 'Reviewer',
        stage: 'EVAL',
        status: 'idle',
        isPrimary: false,
      }),
    ],
  ]);
}

function createTestEdges(): Edge[] {
  return [{ from: 'arch-1', to: 'dev-1', label: 'delegate', type: 'delegation' }];
}

describe('tui/components/flow-map.pure', () => {
  describe('layoutStageColumns', () => {
    it('should divide width into 3 stage columns', () => {
      const columns = layoutStageColumns(120);
      expect(columns.PLAN).toBeDefined();
      expect(columns.ACT).toBeDefined();
      expect(columns.EVAL).toBeDefined();
    });

    it('should start PLAN at 0', () => {
      const columns = layoutStageColumns(120);
      expect(columns.PLAN.startX).toBe(0);
    });

    it('should start ACT at approximately 1/3 width', () => {
      const columns = layoutStageColumns(120);
      expect(columns.ACT.startX).toBe(40);
    });

    it('should start EVAL at approximately 2/3 width', () => {
      const columns = layoutStageColumns(120);
      expect(columns.EVAL.startX).toBe(80);
    });

    it('should give AUTO the full width', () => {
      const columns = layoutStageColumns(120);
      expect(columns.AUTO.startX).toBe(0);
      expect(columns.AUTO.width).toBe(120);
    });

    it('should handle odd widths without losing pixels', () => {
      const columns = layoutStageColumns(100);
      const totalCovered = columns.PLAN.width + columns.ACT.width + columns.EVAL.width;
      expect(totalCovered).toBe(100);
    });
  });

  describe('layoutAgentNodes', () => {
    it('should position agents vertically within their stage column', () => {
      const agents = createTestAgents();
      const columns = layoutStageColumns(120);
      const positions = layoutAgentNodes(agents, columns);

      expect(positions.size).toBe(3);

      const archPos = positions.get('arch-1');
      const devPos = positions.get('dev-1');
      const revPos = positions.get('rev-1');

      expect(archPos).toBeDefined();
      expect(devPos).toBeDefined();
      expect(revPos).toBeDefined();

      expect(archPos!.x).toBeGreaterThanOrEqual(columns.PLAN.startX);
      expect(archPos!.x).toBeLessThan(columns.PLAN.startX + columns.PLAN.width);

      expect(devPos!.x).toBeGreaterThanOrEqual(columns.ACT.startX);
      expect(devPos!.x).toBeLessThan(columns.ACT.startX + columns.ACT.width);

      expect(revPos!.x).toBeGreaterThanOrEqual(columns.EVAL.startX);
      expect(revPos!.x).toBeLessThan(columns.EVAL.startX + columns.EVAL.width);
    });

    it('should place primary agents first', () => {
      const agents = new Map<string, DashboardNode>([
        [
          'secondary',
          makeAgent({
            id: 'secondary',
            name: 'Beta',
            stage: 'PLAN',
            isPrimary: false,
          }),
        ],
        [
          'primary',
          makeAgent({
            id: 'primary',
            name: 'Alpha',
            stage: 'PLAN',
            isPrimary: true,
          }),
        ],
      ]);

      const columns = layoutStageColumns(120);
      const positions = layoutAgentNodes(agents, columns);

      const primaryPos = positions.get('primary');
      const secondaryPos = positions.get('secondary');

      expect(primaryPos).toBeDefined();
      expect(secondaryPos).toBeDefined();
      expect(primaryPos!.y).toBeLessThan(secondaryPos!.y);
    });

    it('should handle empty agents map', () => {
      const agents = new Map<string, DashboardNode>();
      const columns = layoutStageColumns(120);
      const positions = layoutAgentNodes(agents, columns);
      expect(positions.size).toBe(0);
    });
  });

  describe('buildProgressBar', () => {
    it('should return filled and empty segments for 50%', () => {
      const result = buildProgressBar(50, 10);
      expect(result).toEqual({ filled: 5, empty: 5, label: '50%' });
    });

    it('should clamp value to 0-100', () => {
      expect(buildProgressBar(-10, 10).filled).toBe(0);
      expect(buildProgressBar(150, 10).filled).toBe(10);
    });

    it('should handle 0%', () => {
      const result = buildProgressBar(0, 10);
      expect(result).toEqual({ filled: 0, empty: 10, label: ' 0%' });
    });

    it('should handle 100%', () => {
      const result = buildProgressBar(100, 8);
      expect(result).toEqual({ filled: 8, empty: 0, label: '100' });
    });

    it('should round filled blocks correctly', () => {
      const result = buildProgressBar(33, 10);
      expect(result.filled).toBe(3);
      expect(result.empty).toBe(7);
    });
  });

  describe('renderPipelineHeader', () => {
    it('should render pipeline header with arrow connectors', () => {
      const buf = new ColorBuffer(80, 2);
      renderPipelineHeader(buf, 80, 'ACT');

      const text = buf
        .toLines()
        .map(row => row.map(c => c.char).join(''))
        .join('\n');
      expect(text).toContain('PLAN');
      expect(text).toContain('ACT');
      expect(text).toContain('EVAL');
      expect(text).toContain('▸');
      expect(text).toContain('═');
    });

    it('should highlight the active stage with bold', () => {
      const buf = new ColorBuffer(80, 2);
      renderPipelineHeader(buf, 80, 'ACT');

      const lines = buf.toLines();
      // Find the 'A' of 'ACT' and check its style is bold
      let actFound = false;
      for (let x = 0; x < 80; x++) {
        if (
          lines[0][x].char === 'A' &&
          x + 2 < 80 &&
          lines[0][x + 1]?.char === 'C' &&
          lines[0][x + 2]?.char === 'T'
        ) {
          if (lines[0][x].style.bold === true) {
            actFound = true;
          }
          break;
        }
      }
      expect(actFound).toBe(true);
    });

    it('should include AUTO stage when hasAutoAgents is true', () => {
      const buf = new ColorBuffer(120, 2);
      renderPipelineHeader(buf, 120, 'PLAN', true);

      const text = buf
        .toLines()
        .map(row => row.map(c => c.char).join(''))
        .join('\n');
      expect(text).toContain('AUTO');
    });

    it('should render decorative underline on row 1', () => {
      const buf = new ColorBuffer(80, 2);
      renderPipelineHeader(buf, 80, null);

      const text = buf
        .toLines()
        .map(row => row.map(c => c.char).join(''))
        .join('\n');
      expect(text).toContain('┄');
    });
  });

  describe('renderFlowMap (wide)', () => {
    it('should return a ColorBuffer', () => {
      const agents = createTestAgents();
      const buf = renderFlowMap(agents, [], 120, 30);
      expect(buf.width).toBe(120);
      expect(buf.height).toBe(30);
      expect(typeof buf.toLines).toBe('function');
    });

    it('should render agents as boxes with status icons', () => {
      const agents = createTestAgents();
      const edges = createTestEdges();
      const result = bufferToString(renderFlowMap(agents, edges, 120, 30));

      expect(result).toContain('Architect');
      expect(result).toContain('Developer');
      expect(result).toContain('Reviewer');
      expect(result).toContain('●');
      expect(result).toContain('○');
    });

    it('should render edges between agents', () => {
      const agents = createTestAgents();
      const edges = createTestEdges();
      const result = bufferToString(renderFlowMap(agents, edges, 120, 30));

      expect(result).toContain('─');
    });

    it('should render pipeline header instead of flat stage labels', () => {
      const agents = createTestAgents();
      const result = bufferToString(renderFlowMap(agents, [], 120, 30));

      expect(result).toContain('▸');
      expect(result).toContain('═');
      expect(result).toContain('PLAN');
      expect(result).toContain('ACT');
      expect(result).toContain('EVAL');
    });

    it('should apply neon colors to stage labels', () => {
      const agents = createTestAgents();
      const buf = renderFlowMap(agents, [], 120, 30);
      const lines = buf.toLines();
      // Find 'P' of 'PLAN' in pipeline header (row 0, after ▸ and space)
      let planCell = null;
      for (let x = 0; x < 120; x++) {
        if (
          lines[0][x].char === 'P' &&
          x + 3 < 120 &&
          lines[0][x + 1]?.char === 'L' &&
          lines[0][x + 2]?.char === 'A' &&
          lines[0][x + 3]?.char === 'N'
        ) {
          planCell = lines[0][x];
          break;
        }
      }
      expect(planCell).not.toBeNull();
      expect(planCell!.style.fg).toBe('cyan');
    });

    it('should render primary agents with double border ╔═╗', () => {
      const agents = createTestAgents();
      const result = bufferToString(renderFlowMap(agents, [], 120, 30));

      expect(result).toContain('╔');
      expect(result).toContain('╗');
      expect(result).toContain('║');
    });

    it('should render secondary agents with round corners ╭─╮', () => {
      const agents = createTestAgents();
      const result = bufferToString(renderFlowMap(agents, [], 120, 30));

      expect(result).toContain('╭');
      expect(result).toContain('╮');
      expect(result).toContain('╰');
      expect(result).toContain('╯');
    });

    it('should render progress bar inside agent nodes', () => {
      const agents = new Map<string, DashboardNode>([
        [
          'a1',
          makeAgent({
            id: 'a1',
            name: 'Builder',
            stage: 'ACT',
            status: 'running',
            isPrimary: true,
            progress: 50,
          }),
        ],
      ]);
      const result = bufferToString(renderFlowMap(agents, [], 120, 30));

      expect(result).toContain('█');
      expect(result).toContain('░');
    });

    it('should render glow effect around running primary agents', () => {
      const agents = new Map<string, DashboardNode>([
        [
          'a1',
          makeAgent({
            id: 'a1',
            name: 'Builder',
            stage: 'ACT',
            status: 'running',
            isPrimary: true,
          }),
        ],
      ]);
      const buf = renderFlowMap(agents, [], 120, 30);
      const lines = buf.toLines();

      // Glow uses ░ characters - find at least one with GLOW_STYLE
      let hasGlow = false;
      for (const row of lines) {
        for (const cell of row) {
          if (cell.char === '░' && cell.style.fg === 'green' && cell.style.dim === true) {
            hasGlow = true;
            break;
          }
        }
        if (hasGlow) break;
      }
      expect(hasGlow).toBe(true);
    });

    it('should not render glow for non-running agents', () => {
      const agents = new Map<string, DashboardNode>([
        [
          'a1',
          makeAgent({
            id: 'a1',
            name: 'Idle',
            stage: 'PLAN',
            status: 'idle',
            isPrimary: true,
          }),
        ],
      ]);
      const buf = renderFlowMap(agents, [], 120, 30);
      const lines = buf.toLines();

      let hasGlow = false;
      for (const row of lines) {
        for (const cell of row) {
          if (cell.char === '░' && cell.style.fg === 'green') hasGlow = true;
        }
      }
      expect(hasGlow).toBe(false);
    });

    it('should render edges with smooth curves and triangle arrows', () => {
      const agents = createTestAgents();
      const edges = createTestEdges();
      const result = bufferToString(renderFlowMap(agents, edges, 120, 30));

      expect(result).toContain('─');
      expect(result).toContain('▸');
    });

    it('should render real-time counter legend', () => {
      const agents = createTestAgents(); // 2 running, 1 idle
      const result = bufferToString(renderFlowMap(agents, [], 120, 30));

      expect(result).toContain('● 2 active');
      expect(result).toContain('○ 1 idle');
    });

    it('should handle empty agents and edges', () => {
      const agents = new Map<string, DashboardNode>();
      const result = bufferToString(renderFlowMap(agents, [], 120, 30));

      expect(result).toContain('PLAN');
      expect(result).toContain('● 0 active');
    });
  });

  describe('renderFlowMapSimplified (medium)', () => {
    it('should return a ColorBuffer', () => {
      const agents = createTestAgents();
      const buf = renderFlowMapSimplified(agents, 100, 30);
      expect(buf.width).toBe(100);
      expect(typeof buf.toLines).toBe('function');
    });

    it('should render agent boxes grouped by stage', () => {
      const agents = createTestAgents();
      const result = bufferToString(renderFlowMapSimplified(agents, 100, 30));

      expect(result).toContain('Architect');
      expect(result).toContain('Developer');
      expect(result).toContain('Reviewer');
    });

    it('should contain stage labels', () => {
      const agents = createTestAgents();
      const result = bufferToString(renderFlowMapSimplified(agents, 100, 30));

      expect(result).toContain('PLAN');
      expect(result).toContain('ACT');
      expect(result).toContain('EVAL');
    });

    it('should use double borders for primary agents', () => {
      const agents = createTestAgents();
      const result = bufferToString(renderFlowMapSimplified(agents, 100, 30));

      expect(result).toContain('╔');
      expect(result).toContain('╗');
    });

    it('should use round corners for secondary agents', () => {
      const agents = createTestAgents();
      const result = bufferToString(renderFlowMapSimplified(agents, 100, 30));

      expect(result).toContain('╭');
      expect(result).toContain('╯');
    });

    it('should render progress bars inside nodes', () => {
      const agents = new Map<string, DashboardNode>([
        [
          'a1',
          makeAgent({
            id: 'a1',
            name: 'Builder',
            stage: 'ACT',
            status: 'running',
            isPrimary: true,
            progress: 75,
          }),
        ],
      ]);
      const result = bufferToString(renderFlowMapSimplified(agents, 100, 30));

      expect(result).toContain('█');
      expect(result).toContain('░');
    });

    it('should handle empty agents', () => {
      const agents = new Map<string, DashboardNode>();
      const result = bufferToString(renderFlowMapSimplified(agents, 100, 30));
      expect(result.trim()).toBe('');
    });
  });

  describe('renderFlowMapCompact (narrow)', () => {
    it('should render as flat list with icon, name, and stage', () => {
      const agents = new Map<string, DashboardNode>([
        [
          'arch-1',
          makeAgent({
            id: 'arch-1',
            name: 'Architect',
            stage: 'PLAN',
            status: 'running',
            isPrimary: true,
          }),
        ],
      ]);

      const result = renderFlowMapCompact(agents);
      expect(result).toBe('● ★ Architect (PLAN)');
    });

    it('should group by stage: PLAN before ACT before EVAL', () => {
      const agents = createTestAgents();
      const result = renderFlowMapCompact(agents);
      const lines = result.split('\n');

      const planIdx = lines.findIndex(l => l.includes('(PLAN)'));
      const actIdx = lines.findIndex(l => l.includes('(ACT)'));
      const evalIdx = lines.findIndex(l => l.includes('(EVAL)'));

      expect(planIdx).toBeLessThan(actIdx);
      expect(actIdx).toBeLessThan(evalIdx);
    });

    it('should place primary agents first within a stage', () => {
      const agents = new Map<string, DashboardNode>([
        [
          'sec',
          makeAgent({
            id: 'sec',
            name: 'Secondary',
            stage: 'ACT',
            status: 'idle',
            isPrimary: false,
          }),
        ],
        [
          'pri',
          makeAgent({
            id: 'pri',
            name: 'Primary',
            stage: 'ACT',
            status: 'running',
            isPrimary: true,
          }),
        ],
      ]);

      const result = renderFlowMapCompact(agents);
      const lines = result.split('\n');
      expect(lines[0]).toContain('Primary');
      expect(lines[1]).toContain('Secondary');
    });

    it('should use correct status icons', () => {
      const agents = new Map<string, DashboardNode>([
        ['a1', makeAgent({ id: 'a1', name: 'Running', stage: 'PLAN', status: 'running' })],
        ['a2', makeAgent({ id: 'a2', name: 'Blocked', stage: 'ACT', status: 'blocked' })],
        ['a3', makeAgent({ id: 'a3', name: 'Done', stage: 'EVAL', status: 'done' })],
      ]);

      const result = renderFlowMapCompact(agents);
      expect(result).toContain('● Running (PLAN)');
      expect(result).toContain('⏸ Blocked (ACT)');
      expect(result).toContain('✓ Done (EVAL)');
    });

    it('should return empty string for empty agents', () => {
      const agents = new Map<string, DashboardNode>();
      const result = renderFlowMapCompact(agents);
      expect(result).toBe('');
    });

    it('should mark primary agents with ★', () => {
      const agents = new Map<string, DashboardNode>([
        [
          'a1',
          makeAgent({
            id: 'a1',
            name: 'Builder',
            stage: 'ACT',
            status: 'running',
            isPrimary: true,
          }),
        ],
      ]);
      const result = renderFlowMapCompact(agents);
      expect(result).toContain('★');
    });

    it('should show progress percentage for agents with progress > 0', () => {
      const agents = new Map<string, DashboardNode>([
        [
          'a1',
          makeAgent({
            id: 'a1',
            name: 'Builder',
            stage: 'ACT',
            status: 'running',
            isPrimary: true,
            progress: 75,
          }),
        ],
      ]);
      const result = renderFlowMapCompact(agents);
      expect(result).toContain('75%');
    });

    it('should not show progress when 0', () => {
      const agents = new Map<string, DashboardNode>([
        [
          'a1',
          makeAgent({
            id: 'a1',
            name: 'Idle',
            stage: 'PLAN',
            status: 'idle',
            isPrimary: false,
            progress: 0,
          }),
        ],
      ]);
      const result = renderFlowMapCompact(agents);
      expect(result).not.toContain('%');
    });
  });
});
