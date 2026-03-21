export interface IssueFiles {
  issue: number;
  files: string[];
}

export interface OverlapEntry {
  issueA: number;
  issueB: number;
  overlappingFiles: string[];
}

/**
 * Builds an overlap matrix from issue-file mappings.
 * For each pair of issues, checks if they share any files.
 * Returns entries only for pairs that have overlapping files.
 * issueA is always < issueB. overlappingFiles are sorted alphabetically.
 */
export function buildOverlapMatrix(issues: IssueFiles[]): OverlapEntry[] {
  if (issues.length < 2) {
    return [];
  }

  const entries: OverlapEntry[] = [];

  for (let i = 0; i < issues.length; i++) {
    const filesA = new Set(issues[i].files);
    for (let j = i + 1; j < issues.length; j++) {
      const overlapping = issues[j].files.filter(f => filesA.has(f)).sort();

      if (overlapping.length > 0) {
        const [issueA, issueB] =
          issues[i].issue < issues[j].issue
            ? [issues[i].issue, issues[j].issue]
            : [issues[j].issue, issues[i].issue];

        entries.push({ issueA, issueB, overlappingFiles: overlapping });
      }
    }
  }

  return entries;
}
