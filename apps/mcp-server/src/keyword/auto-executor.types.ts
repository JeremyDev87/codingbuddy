import type { ParseModeResult, AutoConfig } from './keyword.types';

// Re-export AutoConfig for convenience
export type { AutoConfig };

/** AUTO mode execution options */
export interface AutoExecutorOptions {
  /** Maximum iteration count */
  maxIterations: number;
  /** User prompt */
  prompt: string;
}

/** Issue severity */
export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';

/** Issue info extracted from EVAL result */
export interface EvalIssue {
  severity: IssueSeverity;
  description: string;
}

/** EVAL result summary */
export interface EvalSummary {
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  issues: EvalIssue[];
}

/** Single iteration result */
export interface IterationResult {
  iteration: number;
  planResult: ParseModeResult;
  actResult: ParseModeResult;
  evalResult: ParseModeResult;
  evalSummary: EvalSummary;
  approach: string;
}

/** AUTO mode final result */
export interface AutoResult {
  success: boolean;
  iterations: number;
  maxIterations: number;
  finalEvalSummary?: EvalSummary;
  iterationHistory: IterationResult[];
  modifiedFiles: string[];
  fallbackToPlan: boolean;
  fallbackPlanResult?: ParseModeResult;
}

/** AUTO mode phase */
export type AutoPhase =
  | 'starting'
  | 'plan'
  | 'act'
  | 'eval'
  | 'completed'
  | 'failed';

/** AUTO mode progress callback */
export interface AutoProgressCallback {
  onPhaseStart: (
    phase: AutoPhase,
    iteration: number,
    maxIterations: number,
  ) => void;
  onPhaseComplete: (phase: AutoPhase, result: ParseModeResult) => void;
  onIterationComplete: (result: IterationResult) => void;
  onComplete: (result: AutoResult) => void;
}

/** Default AUTO configuration */
export const DEFAULT_AUTO_CONFIG: AutoConfig = {
  maxIterations: 3,
};
