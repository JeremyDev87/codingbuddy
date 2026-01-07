import type { ParseModeResult, AutoConfig } from './keyword.types';

// Re-export AutoConfig for convenience
export type { AutoConfig };

/** AUTO 모드 실행 옵션 */
export interface AutoExecutorOptions {
  /** 최대 반복 횟수 */
  maxIterations: number;
  /** 사용자 프롬프트 */
  prompt: string;
}

/** 이슈 심각도 */
export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';

/** EVAL 결과에서 추출한 이슈 정보 */
export interface EvalIssue {
  severity: IssueSeverity;
  description: string;
}

/** EVAL 결과 요약 */
export interface EvalSummary {
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  issues: EvalIssue[];
}

/** 단일 이터레이션 결과 */
export interface IterationResult {
  iteration: number;
  planResult: ParseModeResult;
  actResult: ParseModeResult;
  evalResult: ParseModeResult;
  evalSummary: EvalSummary;
  approach: string;
}

/** AUTO 모드 최종 결과 */
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

/** AUTO 모드 상태 */
export type AutoPhase =
  | 'starting'
  | 'plan'
  | 'act'
  | 'eval'
  | 'completed'
  | 'failed';

/** AUTO 모드 진행 상황 콜백 */
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

/** 기본 AUTO 설정 */
export const DEFAULT_AUTO_CONFIG: AutoConfig = {
  maxIterations: 3,
};
