import { describe, it, expect } from 'vitest';
import { buildOverlapMatrix, type IssueFiles } from './overlap-matrix';

describe('buildOverlapMatrix', () => {
  it('should return empty matrix for empty input', () => {
    expect(buildOverlapMatrix([])).toEqual([]);
  });

  it('should return empty matrix for single issue', () => {
    const issues: IssueFiles[] = [{ issue: 732, files: ['src/main.ts'] }];
    expect(buildOverlapMatrix(issues)).toEqual([]);
  });

  it('should return empty matrix when no files overlap', () => {
    const issues: IssueFiles[] = [
      { issue: 732, files: ['src/main.ts'] },
      { issue: 733, files: ['src/config.ts'] },
      { issue: 734, files: ['src/utils.ts'] },
    ];
    expect(buildOverlapMatrix(issues)).toEqual([]);
  });

  it('should detect overlap between two issues', () => {
    const issues: IssueFiles[] = [
      { issue: 733, files: ['apps/mcp-server/src/config.yaml', 'src/main.ts'] },
      { issue: 734, files: ['apps/mcp-server/src/config.yaml', 'src/other.ts'] },
    ];
    const result = buildOverlapMatrix(issues);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      issueA: 733,
      issueB: 734,
      overlappingFiles: ['apps/mcp-server/src/config.yaml'],
    });
  });

  it('should detect multiple overlapping files', () => {
    const issues: IssueFiles[] = [
      { issue: 733, files: ['src/a.ts', 'src/b.ts', 'src/c.ts'] },
      { issue: 734, files: ['src/b.ts', 'src/c.ts', 'src/d.ts'] },
    ];
    const result = buildOverlapMatrix(issues);
    expect(result).toHaveLength(1);
    expect(result[0].overlappingFiles).toEqual(['src/b.ts', 'src/c.ts']);
  });

  it('should detect overlaps across multiple issue pairs', () => {
    const issues: IssueFiles[] = [
      { issue: 732, files: ['src/a.ts', 'src/shared.ts'] },
      { issue: 733, files: ['src/b.ts', 'src/shared.ts'] },
      { issue: 734, files: ['src/a.ts', 'src/c.ts'] },
    ];
    const result = buildOverlapMatrix(issues);
    expect(result).toHaveLength(2);

    const pair732_733 = result.find(e => e.issueA === 732 && e.issueB === 733);
    expect(pair732_733?.overlappingFiles).toEqual(['src/shared.ts']);

    const pair732_734 = result.find(e => e.issueA === 732 && e.issueB === 734);
    expect(pair732_734?.overlappingFiles).toEqual(['src/a.ts']);
  });

  it('should sort overlapping files alphabetically', () => {
    const issues: IssueFiles[] = [
      { issue: 1, files: ['src/z.ts', 'src/a.ts', 'src/m.ts'] },
      { issue: 2, files: ['src/m.ts', 'src/z.ts'] },
    ];
    const result = buildOverlapMatrix(issues);
    expect(result[0].overlappingFiles).toEqual(['src/m.ts', 'src/z.ts']);
  });

  it('should always have issueA < issueB', () => {
    const issues: IssueFiles[] = [
      { issue: 999, files: ['src/shared.ts'] },
      { issue: 100, files: ['src/shared.ts'] },
    ];
    const result = buildOverlapMatrix(issues);
    expect(result[0].issueA).toBe(100);
    expect(result[0].issueB).toBe(999);
  });
});
