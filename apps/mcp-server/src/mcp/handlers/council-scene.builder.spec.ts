import { describe, it, expect } from 'vitest';
import { buildCouncilScene } from './council-scene.builder';
import type { CouncilPreset } from '../../agent/council-preset.types';
import type { VisualData } from '../../keyword/keyword.types';

describe('buildCouncilScene', () => {
  const planPreset: CouncilPreset = {
    mode: 'PLAN',
    primary: 'technical-planner',
    specialists: ['architecture-specialist', 'security-specialist'],
  };

  const evalPreset: CouncilPreset = {
    mode: 'EVAL',
    primary: 'code-reviewer',
    specialists: ['security-specialist', 'performance-specialist'],
  };

  const visual: VisualData = {
    banner: '╭━━━━━╮\n┃ ◊‿◊ ┃ PLAN mode!\n╰━━┳━━╯',
    agents: [
      { name: 'Technical Planner', face: '◇‿◇', color: 'magenta', status: 'analyzing' },
      { name: 'Architecture Specialist', face: '⬡‿⬡', color: 'blue', status: 'waiting' },
      { name: 'Security Specialist', face: '◮‿◮', color: 'red', status: 'waiting' },
    ],
    collaboration: { format: 'minimal', renderHint: 'Display agent collaboration' },
  };

  it('returns undefined for ACT mode', () => {
    expect(buildCouncilScene('ACT', planPreset, visual)).toBeUndefined();
  });

  it('returns councilScene for PLAN mode with councilPreset', () => {
    const scene = buildCouncilScene('PLAN', planPreset, undefined);
    expect(scene).toBeDefined();
    expect(scene!.enabled).toBe(true);
    expect(scene!.format).toBe('tiny-actor-grid');
    expect(scene!.moderatorCopy).toContain('design this together');
    expect(scene!.cast).toHaveLength(3);
    expect(scene!.cast[0]).toEqual({
      name: 'technical-planner',
      role: 'primary',
      face: '●‿●',
    });
    expect(scene!.cast[1].role).toBe('specialist');
  });

  it('returns councilScene for EVAL mode with councilPreset', () => {
    const scene = buildCouncilScene('EVAL', evalPreset, undefined);
    expect(scene).toBeDefined();
    expect(scene!.enabled).toBe(true);
    expect(scene!.moderatorCopy).toContain('Review council');
    expect(scene!.cast[0].name).toBe('code-reviewer');
    expect(scene!.cast[0].role).toBe('primary');
  });

  it('returns councilScene for AUTO mode from visual agents', () => {
    const scene = buildCouncilScene('AUTO', undefined, visual);
    expect(scene).toBeDefined();
    expect(scene!.enabled).toBe(true);
    expect(scene!.moderatorCopy).toContain('Autonomous council');
    expect(scene!.cast[0].role).toBe('primary');
    expect(scene!.cast[0].name).toBe('Technical Planner');
    expect(scene!.cast[0].face).toBe('◇‿◇');
    expect(scene!.cast.slice(1).every(m => m.role === 'specialist')).toBe(true);
  });

  it('returns councilScene for AUTO mode from fallback when visual is undefined', () => {
    const scene = buildCouncilScene('AUTO', undefined, undefined, {
      delegatesTo: 'agent-architect',
      specialists: ['security-specialist'],
    });
    expect(scene).toBeDefined();
    expect(scene!.cast[0]).toEqual({
      name: 'agent-architect',
      role: 'primary',
      face: '●‿●',
    });
    expect(scene!.cast[1]).toEqual({
      name: 'security-specialist',
      role: 'specialist',
      face: '●‿●',
    });
  });

  it('returns undefined when no data is available', () => {
    const scene = buildCouncilScene('AUTO', undefined, undefined);
    expect(scene).toBeUndefined();
  });

  it('cross-references faces from visual data for councilPreset agents', () => {
    const scene = buildCouncilScene('PLAN', planPreset, visual);
    expect(scene).toBeDefined();
    // "technical-planner" slug matches "Technical Planner" → face "◇‿◇"
    expect(scene!.cast[0].face).toBe('◇‿◇');
    // "architecture-specialist" slug matches "Architecture Specialist" → face "⬡‿⬡"
    expect(scene!.cast[1].face).toBe('⬡‿⬡');
  });

  it('cast has exactly one primary member', () => {
    const scene = buildCouncilScene('PLAN', planPreset, visual);
    expect(scene).toBeDefined();
    const primaries = scene!.cast.filter(m => m.role === 'primary');
    expect(primaries).toHaveLength(1);
  });

  it('is serializable JSON', () => {
    const scene = buildCouncilScene('PLAN', planPreset, visual);
    expect(scene).toBeDefined();
    const roundTripped = JSON.parse(JSON.stringify(scene));
    expect(roundTripped).toEqual(scene);
  });
});
