import { describe, it, expect } from 'vitest';
import {
  layoutStageColumns,
  layoutAgentNodes,
  renderFlowMap,
  renderFlowMapSimplified,
  renderFlowMapCompact,
} from './flow-map.pure';
import type { DashboardNode, Edge } from '../dashboard-types';
import type { Mode } from '../../keyword/keyword.types';

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

      // Architect (PLAN) should be in PLAN column
      expect(archPos!.x).toBeGreaterThanOrEqual(columns.PLAN.startX);
      expect(archPos!.x).toBeLessThan(columns.PLAN.startX + columns.PLAN.width);

      // Developer (ACT) should be in ACT column
      expect(devPos!.x).toBeGreaterThanOrEqual(columns.ACT.startX);
      expect(devPos!.x).toBeLessThan(columns.ACT.startX + columns.ACT.width);

      // Reviewer (EVAL) should be in EVAL column
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
      // Primary should be above (lower y) than secondary
      expect(primaryPos!.y).toBeLessThan(secondaryPos!.y);
    });

    it('should handle empty agents map', () => {
      const agents = new Map<string, DashboardNode>();
      const columns = layoutStageColumns(120);
      const positions = layoutAgentNodes(agents, columns);
      expect(positions.size).toBe(0);
    });
  });

  describe('renderFlowMap (wide)', () => {
    it('should render agents as boxes with status icons', () => {
      const agents = createTestAgents();
      const edges = createTestEdges();
      const result = renderFlowMap(agents, edges, 120, 30);

      expect(result).toContain('Architect');
      expect(result).toContain('Developer');
      expect(result).toContain('Reviewer');
      // Running icon
      expect(result).toContain('●');
      // Idle icon
      expect(result).toContain('○');
    });

    it('should render edges between agents', () => {
      const agents = createTestAgents();
      const edges = createTestEdges();
      const result = renderFlowMap(agents, edges, 120, 30);

      // Edge path uses horizontal line character
      expect(result).toContain('─');
    });

    it('should render stage labels', () => {
      const agents = createTestAgents();
      const result = renderFlowMap(agents, [], 120, 30);

      expect(result).toContain('PLAN');
      expect(result).toContain('ACT');
      expect(result).toContain('EVAL');
    });

    it('should render legend at bottom', () => {
      const agents = createTestAgents();
      const result = renderFlowMap(agents, [], 120, 30);

      expect(result).toContain('Legend:');
      expect(result).toContain('running');
      expect(result).toContain('idle');
      expect(result).toContain('blocked');
      expect(result).toContain('error');
      expect(result).toContain('done');
    });

    it('should render box-drawing characters', () => {
      const agents = createTestAgents();
      const result = renderFlowMap(agents, [], 120, 30);

      // Box corners
      expect(result).toContain('┌');
      expect(result).toContain('┐');
      expect(result).toContain('└');
      expect(result).toContain('┘');
    });

    it('should handle empty agents and edges', () => {
      const agents = new Map<string, DashboardNode>();
      const result = renderFlowMap(agents, [], 120, 30);
      // Should still render stage labels and legend
      expect(result).toContain('PLAN');
      expect(result).toContain('Legend:');
    });
  });

  describe('renderFlowMapSimplified (medium)', () => {
    it('should render agent boxes grouped by stage', () => {
      const agents = createTestAgents();
      const result = renderFlowMapSimplified(agents, 100, 30);

      expect(result).toContain('Architect');
      expect(result).toContain('Developer');
      expect(result).toContain('Reviewer');
    });

    it('should contain stage labels', () => {
      const agents = createTestAgents();
      const result = renderFlowMapSimplified(agents, 100, 30);

      expect(result).toContain('PLAN');
      expect(result).toContain('ACT');
      expect(result).toContain('EVAL');
    });

    it('should not render arrows', () => {
      const agents = createTestAgents();
      const result = renderFlowMapSimplified(agents, 100, 30);

      // No arrow tip characters from edge routing
      expect(result).not.toContain('>');
      expect(result).not.toContain('<');
    });

    it('should render box drawing characters', () => {
      const agents = createTestAgents();
      const result = renderFlowMapSimplified(agents, 100, 30);

      expect(result).toContain('┌');
      expect(result).toContain('┘');
    });

    it('should handle empty agents', () => {
      const agents = new Map<string, DashboardNode>();
      const result = renderFlowMapSimplified(agents, 100, 30);
      // Should return buffer with only spaces
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
      expect(result).toBe('● Architect (PLAN)');
    });

    it('should group by stage: PLAN before ACT before EVAL', () => {
      const agents = createTestAgents();
      const result = renderFlowMapCompact(agents);
      const lines = result.split('\n');

      // Find the line indices for each stage
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
        [
          'a1',
          makeAgent({
            id: 'a1',
            name: 'Running',
            stage: 'PLAN',
            status: 'running',
          }),
        ],
        [
          'a2',
          makeAgent({
            id: 'a2',
            name: 'Blocked',
            stage: 'ACT',
            status: 'blocked',
          }),
        ],
        [
          'a3',
          makeAgent({
            id: 'a3',
            name: 'Done',
            stage: 'EVAL',
            status: 'done',
          }),
        ],
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
  });
});
