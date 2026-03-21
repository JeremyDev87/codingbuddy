import { describe, it, expect } from 'vitest';
import { splitIntoWaves } from './wave-splitter';
import type { IssueFiles } from './overlap-matrix';

describe('splitIntoWaves', () => {
  it('should return empty waves for empty input', () => {
    expect(splitIntoWaves([])).toEqual([]);
  });

  it('should put single issue in one wave', () => {
    const issues: IssueFiles[] = [{ issue: 732, files: ['src/main.ts'] }];
    expect(splitIntoWaves(issues)).toEqual([[732]]);
  });

  it('should put non-overlapping issues in the same wave', () => {
    const issues: IssueFiles[] = [
      { issue: 732, files: ['src/a.ts'] },
      { issue: 733, files: ['src/b.ts'] },
      { issue: 734, files: ['src/c.ts'] },
    ];
    const waves = splitIntoWaves(issues);
    expect(waves).toHaveLength(1);
    expect(waves[0].sort()).toEqual([732, 733, 734]);
  });

  it('should separate overlapping issues into different waves', () => {
    const issues: IssueFiles[] = [
      { issue: 732, files: ['src/shared.ts', 'src/a.ts'] },
      { issue: 733, files: ['src/shared.ts', 'src/b.ts'] },
    ];
    const waves = splitIntoWaves(issues);
    expect(waves).toHaveLength(2);
    // Each wave has exactly one issue
    expect(waves.map(w => w.length)).toEqual([1, 1]);
  });

  it('should handle complex overlap graph (3 issues, 2 overlap)', () => {
    const issues: IssueFiles[] = [
      { issue: 732, files: ['src/a.ts', 'src/shared.ts'] },
      { issue: 733, files: ['src/b.ts'] },
      { issue: 734, files: ['src/c.ts', 'src/shared.ts'] },
    ];
    const waves = splitIntoWaves(issues);
    // 732 and 734 overlap, 733 is independent
    // Wave 1: [732, 733] or [733, 734], Wave 2: [734] or [732]
    expect(waves.length).toBeGreaterThanOrEqual(2);

    // Verify no wave has overlapping issues
    for (const wave of waves) {
      const waveIssues = issues.filter(i => wave.includes(i.issue));
      for (let i = 0; i < waveIssues.length; i++) {
        for (let j = i + 1; j < waveIssues.length; j++) {
          const filesA = new Set(waveIssues[i].files);
          const overlap = waveIssues[j].files.filter(f => filesA.has(f));
          expect(overlap).toEqual([]);
        }
      }
    }
  });

  it('should handle chain overlap (A-B, B-C but not A-C)', () => {
    const issues: IssueFiles[] = [
      { issue: 1, files: ['src/ab.ts'] },
      { issue: 2, files: ['src/ab.ts', 'src/bc.ts'] },
      { issue: 3, files: ['src/bc.ts'] },
    ];
    const waves = splitIntoWaves(issues);
    // Issue 2 overlaps with both 1 and 3, but 1 and 3 don't overlap
    // Minimum: 2 waves. e.g. Wave1: [1, 3], Wave2: [2]
    expect(waves.length).toBeGreaterThanOrEqual(2);

    // Issue 1 and 3 can be in the same wave
    const waveWith1 = waves.find(w => w.includes(1));
    const waveWith3 = waves.find(w => w.includes(3));
    // They could share a wave since they don't overlap
    if (waveWith1 === waveWith3) {
      expect(waveWith1).toContain(1);
      expect(waveWith1).toContain(3);
    }
  });

  it('should ensure every issue appears in exactly one wave', () => {
    const issues: IssueFiles[] = [
      { issue: 1, files: ['src/a.ts'] },
      { issue: 2, files: ['src/a.ts', 'src/b.ts'] },
      { issue: 3, files: ['src/b.ts', 'src/c.ts'] },
      { issue: 4, files: ['src/d.ts'] },
    ];
    const waves = splitIntoWaves(issues);
    const allIssues = waves.flat().sort();
    expect(allIssues).toEqual([1, 2, 3, 4]);
  });
});
