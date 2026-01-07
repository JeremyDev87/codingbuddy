import type { AutoResult, AutoPhase, EvalSummary } from './auto-executor.types';

export class AutoFormatter {
  static formatStart(task: string, maxIterations: number): string {
    return `# Mode: AUTO
## Autonomous Execution Started

Task: ${task}
Max Iterations: ${maxIterations}

---`;
  }

  static formatIterationPhase(
    phase: AutoPhase,
    iteration: number,
    maxIterations: number,
  ): string {
    const phaseNames: Record<AutoPhase, string> = {
      starting: 'Starting',
      plan: 'PLAN Phase',
      act: 'ACT Phase',
      eval: 'EVAL Phase',
      completed: 'Completed',
      failed: 'Failed',
    };

    return `
## Iteration ${iteration}/${maxIterations} - ${phaseNames[phase]}`;
  }

  static formatEvalSummary(summary: EvalSummary): string {
    const needsIteration = summary.criticalCount > 0 || summary.highCount > 0;
    return `
Issues Found:
- Critical: ${summary.criticalCount}
- High: ${summary.highCount}${needsIteration ? ' <- iteration needed' : ''}
- Medium: ${summary.mediumCount}
- Low: ${summary.lowCount}`;
  }

  static formatSuccess(result: AutoResult): string {
    const summary = result.finalEvalSummary;
    const files =
      result.modifiedFiles.length > 0
        ? result.modifiedFiles.map(f => `- ${f}`).join('\n')
        : '(none)';

    return `
---
# Mode: AUTO - COMPLETED

Task completed successfully!
Final Stats:
- Iterations: ${result.iterations}/${result.maxIterations}
- Critical: ${summary?.criticalCount ?? 0}, High: ${summary?.highCount ?? 0}
- Medium: ${summary?.mediumCount ?? 0}, Low: ${summary?.lowCount ?? 0}

Modified Files:
${files}`;
  }

  static formatFailure(result: AutoResult): string {
    const summary = result.finalEvalSummary;
    const remainingIssues =
      summary?.issues
        .filter(i => i.severity === 'critical' || i.severity === 'high')
        .map(i => `- [${i.severity.toUpperCase()}] ${i.description}`)
        .join('\n') || '(none)';

    const attempts =
      result.iterationHistory
        .map(h => `- Iteration ${h.iteration}: ${h.approach}`)
        .join('\n') || '(none)';

    return `
---
# Mode: AUTO - MAX ITERATIONS REACHED

Tried ${result.maxIterations} iterations but some issues remain.

Remaining Issues:
${remainingIssues}

Attempted approaches:
${attempts}

---
# Mode: PLAN`;
  }
}
