import type { OverlapEntry } from './overlap-matrix';

export interface ValidationResult {
  issues: Array<{
    issue: number;
    files: string[];
  }>;
  overlapMatrix: OverlapEntry[];
  hasOverlap: boolean;
  severity: 'OK' | 'WARNING';
  suggestedWaves: number[][];
  message: string;
}
