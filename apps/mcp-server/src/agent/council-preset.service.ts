import { Injectable } from '@nestjs/common';
import type { Mode } from '../keyword/keyword.types';

/**
 * A deterministic council preset: a primary agent plus specialist reviewers
 */
export interface CouncilPreset {
  mode: 'PLAN' | 'EVAL';
  primary: string;
  specialists: string[];
}

type CouncilMode = Extract<Mode, 'PLAN' | 'EVAL'>;

const COUNCIL_PRESETS: Record<CouncilMode, CouncilPreset> = {
  PLAN: {
    mode: 'PLAN',
    primary: 'technical-planner',
    specialists: [
      'architecture-specialist',
      'test-strategy-specialist',
      'code-quality-specialist',
      'security-specialist',
    ],
  },
  EVAL: {
    mode: 'EVAL',
    primary: 'code-reviewer',
    specialists: ['security-specialist', 'performance-specialist', 'accessibility-specialist'],
  },
};

@Injectable()
export class CouncilPresetService {
  /**
   * Resolve the council preset for a given mode.
   * Returns null for modes without a preset (ACT, AUTO).
   */
  resolvePreset(mode: Mode): CouncilPreset | null {
    const preset = COUNCIL_PRESETS[mode as CouncilMode];
    if (!preset) return null;
    return { ...preset, specialists: [...preset.specialists] };
  }

  /**
   * List all available council presets.
   */
  listPresets(): CouncilPreset[] {
    return Object.values(COUNCIL_PRESETS).map(p => ({
      ...p,
      specialists: [...p.specialists],
    }));
  }
}
