import type {
  AutoExecutorOptions,
  AutoResult,
  EvalSummary,
  IterationResult,
  AutoProgressCallback,
} from './auto-executor.types';
import type { ParseModeResult } from './keyword.types';

export interface AutoExecutorDependencies {
  parsePlan: (prompt: string) => Promise<ParseModeResult>;
  parseAct: (prompt: string) => Promise<ParseModeResult>;
  parseEval: (prompt: string) => Promise<ParseModeResult>;
  extractEvalSummary: (evalResult: ParseModeResult) => EvalSummary;
}

export class AutoExecutor {
  constructor(
    private readonly deps: AutoExecutorDependencies,
    private readonly progressCallback?: AutoProgressCallback,
  ) {}

  async execute(options: AutoExecutorOptions): Promise<AutoResult> {
    const iterationHistory: IterationResult[] = [];
    const modifiedFiles: string[] = [];

    for (let i = 1; i <= options.maxIterations; i++) {
      this.progressCallback?.onPhaseStart('plan', i, options.maxIterations);
      const planResult = await this.deps.parsePlan(
        this.buildPrompt(options.prompt, i, iterationHistory),
      );
      this.progressCallback?.onPhaseComplete('plan', planResult);

      this.progressCallback?.onPhaseStart('act', i, options.maxIterations);
      const actResult = await this.deps.parseAct(options.prompt);
      this.progressCallback?.onPhaseComplete('act', actResult);

      this.progressCallback?.onPhaseStart('eval', i, options.maxIterations);
      const evalResult = await this.deps.parseEval(options.prompt);
      this.progressCallback?.onPhaseComplete('eval', evalResult);

      const evalSummary = this.deps.extractEvalSummary(evalResult);

      const iterationResult: IterationResult = {
        iteration: i,
        planResult,
        actResult,
        evalResult,
        evalSummary,
        approach: `Iteration ${i} approach`,
      };

      iterationHistory.push(iterationResult);
      this.progressCallback?.onIterationComplete(iterationResult);

      if (this.isQualityAchieved(evalSummary)) {
        const result: AutoResult = {
          success: true,
          iterations: i,
          maxIterations: options.maxIterations,
          finalEvalSummary: evalSummary,
          iterationHistory,
          modifiedFiles,
          fallbackToPlan: false,
        };
        this.progressCallback?.onComplete(result);
        return result;
      }
    }

    // Max iterations reached - fallback to PLAN
    const fallbackPlanResult = await this.deps.parsePlan(
      this.buildFallbackPrompt(options.prompt, iterationHistory),
    );

    const result: AutoResult = {
      success: false,
      iterations: options.maxIterations,
      maxIterations: options.maxIterations,
      finalEvalSummary:
        iterationHistory[iterationHistory.length - 1]?.evalSummary,
      iterationHistory,
      modifiedFiles,
      fallbackToPlan: true,
      fallbackPlanResult,
    };

    this.progressCallback?.onComplete(result);
    return result;
  }

  isQualityAchieved(summary: EvalSummary): boolean {
    return summary.criticalCount === 0 && summary.highCount === 0;
  }

  private buildPrompt(
    originalPrompt: string,
    iteration: number,
    history: IterationResult[],
  ): string {
    if (iteration === 1) {
      return originalPrompt;
    }

    const lastIteration = history[history.length - 1];
    const issues = lastIteration?.evalSummary.issues
      .filter(i => i.severity === 'critical' || i.severity === 'high')
      .map(i => `- ${i.description}`)
      .join('\n');

    return `${originalPrompt}\n\nPrevious issues to address:\n${issues}`;
  }

  private buildFallbackPrompt(
    originalPrompt: string,
    history: IterationResult[],
  ): string {
    const attempts = history
      .map(h => `- Iteration ${h.iteration}: ${h.approach}`)
      .join('\n');

    const remainingIssues = history[history.length - 1]?.evalSummary.issues
      .filter(i => i.severity === 'critical' || i.severity === 'high')
      .map(i => `- [${i.severity.toUpperCase()}] ${i.description}`)
      .join('\n');

    return `${originalPrompt}

Previous attempts:
${attempts}

Remaining issues:
${remainingIssues}

Please propose a new approach.`;
  }
}
