import type { IssueFiles } from './overlap-matrix';

/**
 * Splits issues into zero-conflict waves using greedy graph coloring.
 * Issues in the same wave have no overlapping files.
 * Returns array of waves, each wave is an array of issue numbers.
 */
export function splitIntoWaves(issues: IssueFiles[]): number[][] {
  if (issues.length === 0) {
    return [];
  }

  // Build adjacency: which issues conflict with each other
  const conflicts = new Map<number, Set<number>>();
  for (const issue of issues) {
    conflicts.set(issue.issue, new Set());
  }

  for (let i = 0; i < issues.length; i++) {
    const filesA = new Set(issues[i].files);
    for (let j = i + 1; j < issues.length; j++) {
      const hasOverlap = issues[j].files.some(f => filesA.has(f));
      if (hasOverlap) {
        conflicts.get(issues[i].issue)!.add(issues[j].issue);
        conflicts.get(issues[j].issue)!.add(issues[i].issue);
      }
    }
  }

  // Greedy coloring: assign each issue to the first wave where it has no conflicts
  const waves: number[][] = [];

  for (const issue of issues) {
    let assigned = false;
    for (const wave of waves) {
      const hasConflict = wave.some(id => conflicts.get(issue.issue)!.has(id));
      if (!hasConflict) {
        wave.push(issue.issue);
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      waves.push([issue.issue]);
    }
  }

  return waves;
}
