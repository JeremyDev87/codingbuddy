/**
 * Council Preset Types — extracted to break circular dependency
 * between keyword.types and council-preset.service.
 */

/** Modes that support council presets */
export type CouncilMode = 'PLAN' | 'EVAL';

/**
 * A deterministic council preset: a primary agent plus specialist reviewers.
 */
export interface CouncilPreset {
  mode: CouncilMode;
  primary: string;
  specialists: string[];
}
