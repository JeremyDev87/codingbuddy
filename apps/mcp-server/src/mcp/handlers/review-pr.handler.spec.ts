import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReviewPrHandler } from './review-pr.handler';
import { ReviewPrService } from '../../ship/review-pr.service';
import type { ReviewPrResult } from '../../ship/review-pr.types';

describe('ReviewPrHandler', () => {
  let handler: ReviewPrHandler;
  let mockService: { reviewPr: ReturnType<typeof vi.fn> };

  const sampleResult: ReviewPrResult = {
    prMeta: {
      title: 'feat: add feature',
      branch: 'feat/add-feature-123',
      changedFiles: ['src/auth/login.ts', 'src/auth/login.spec.ts'],
      additions: 50,
      deletions: 10,
    },
    diff: 'diff --git a/src/auth/login.ts ...',
    checklists: [{ domain: 'security', items: ['Check auth'] }],
    recommendedSpecialists: ['security-specialist', 'code-quality-specialist'],
    acceptanceCriteria: '- [ ] Login works\n- [ ] Tests pass',
    reviewProtocol: 'Follow pr-review-cycle.md',
    duration: 150,
  };

  beforeEach(() => {
    mockService = { reviewPr: vi.fn().mockResolvedValue(sampleResult) };
    handler = new ReviewPrHandler(mockService as unknown as ReviewPrService);
  });

  it('should return null for unhandled tools', async () => {
    const result = await handler.handle('unknown_tool', {});
    expect(result).toBeNull();
  });

  it('should handle review_pr with pr_number', async () => {
    const result = await handler.handle('review_pr', { pr_number: 1406 });
    expect(result).not.toBeNull();
    expect(result!.isError).toBeUndefined();
    const data = JSON.parse(result!.content[0].text);
    expect(data.prMeta.title).toBe('feat: add feature');
    expect(data.recommendedSpecialists).toContain('security-specialist');
    expect(mockService.reviewPr).toHaveBeenCalledWith({
      prNumber: 1406,
      issueNumber: undefined,
      timeout: 30000,
    });
  });

  it('should pass issue_number when provided', async () => {
    await handler.handle('review_pr', { pr_number: 1406, issue_number: 1364 });
    expect(mockService.reviewPr).toHaveBeenCalledWith({
      prNumber: 1406,
      issueNumber: 1364,
      timeout: 30000,
    });
  });

  it('should return error when pr_number is missing', async () => {
    const result = await handler.handle('review_pr', {});
    expect(result).not.toBeNull();
    expect(result!.isError).toBe(true);
    expect(result!.content[0].text).toContain('pr_number');
  });

  it('should return error when pr_number is not a number', async () => {
    const result = await handler.handle('review_pr', { pr_number: 'abc' });
    expect(result).not.toBeNull();
    expect(result!.isError).toBe(true);
  });

  it('should handle service errors gracefully', async () => {
    mockService.reviewPr.mockRejectedValue(new Error('gh command failed'));
    const result = await handler.handle('review_pr', { pr_number: 9999 });
    expect(result).not.toBeNull();
    expect(result!.isError).toBe(true);
    expect(result!.content[0].text).toContain('gh command failed');
  });

  it('should expose tool definitions', () => {
    const defs = handler.getToolDefinitions();
    expect(defs).toHaveLength(1);
    expect(defs[0].name).toBe('review_pr');
    expect(defs[0].inputSchema.required).toContain('pr_number');
  });
});
