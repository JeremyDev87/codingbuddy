import type {
  AutoExecutorOptions,
  AutoResult,
  EvalSummary,
  IterationResult,
  AutoProgressCallback,
} from './auto-executor.types';
import type { ParseModeResult } from './keyword.types';
import { AutoPromptBuilder } from './auto-prompt-builder';

export interface AutoExecutorDependencies {
  parsePlan: (prompt: string) => Promise<ParseModeResult>;
  parseAct: (prompt: string) => Promise<ParseModeResult>;
  parseEval: (prompt: string) => Promise<ParseModeResult>;
  extractEvalSummary: (evalResult: ParseModeResult) => EvalSummary;
}

export class AutoExecutor {
  private readonly promptBuilder: AutoPromptBuilder;

  constructor(
    private readonly deps: AutoExecutorDependencies,
    private readonly progressCallback?: AutoProgressCallback,
  ) {
    this.promptBuilder = new AutoPromptBuilder();
  }

  async execute(options: AutoExecutorOptions): Promise<AutoResult> {
    const iterationHistory: IterationResult[] = [];
    const modifiedFiles: string[] = [];

    for (let i = 1; i <= options.maxIterations; i++) {
      this.progressCallback?.onPhaseStart('plan', i, options.maxIterations);
      const planResult = await this.deps.parsePlan(
        this.promptBuilder.buildIterationPrompt(
          options.prompt,
          i,
          iterationHistory,
        ),
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
        approach: this.extractApproach(planResult, i),
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
      this.promptBuilder.buildFallbackPrompt(options.prompt, iterationHistory),
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

  /**
   * Extract approach description from plan result
   * Uses delegate agent name and instructions to describe the iteration approach
   *
   * @param planResult - Plan phase result containing agent and instructions
   * @param iteration - Iteration number for fallback description
   * @returns Human-readable approach description
   * @private
   */
  private extractApproach(
    planResult: ParseModeResult,
    iteration: number,
  ): string {
    const agent =
      planResult.delegates_to || planResult.agent || 'default agent';
    const instructions = planResult.instructions;

    // Create concise approach description
    if (instructions && instructions.length > 0) {
      // Take first sentence or first 60 characters of instructions
      const firstSentence = instructions.split('.')[0];
      const shortInstructions =
        firstSentence.length > 60
          ? firstSentence.substring(0, 60) + '...'
          : firstSentence;
      return `${agent}: ${shortInstructions}`;
    }

    // Fallback if no instructions available
    return `${agent} iteration ${iteration}`;
  }
}
