import { Injectable, Logger } from '@nestjs/common';
import { execSync } from 'child_process';
import { FileSpecialistMapper } from './file-specialist-mapper';
import { ChecklistService } from '../checklist/checklist.service';
import type { ReviewPrInput, ReviewPrResult, PrMeta } from './review-pr.types';

@Injectable()
export class ReviewPrService {
  private readonly logger = new Logger(ReviewPrService.name);
  private readonly mapper = new FileSpecialistMapper();

  constructor(private readonly checklistService: ChecklistService) {}

  async reviewPr(input: ReviewPrInput): Promise<ReviewPrResult> {
    const start = Date.now();
    const { prNumber, issueNumber } = input;

    const prMeta = this.fetchPrMeta(prNumber);
    const diff = this.fetchPrDiff(prNumber);

    const checklists = await this.generateChecklists(prMeta.changedFiles);
    const recommendedSpecialists = this.mapSpecialists(prMeta.changedFiles);
    const acceptanceCriteria = issueNumber ? this.fetchIssueCriteria(issueNumber) : null;

    const reviewProtocol = this.buildReviewProtocol(prNumber, issueNumber);

    return {
      prMeta,
      diff,
      checklists,
      recommendedSpecialists,
      acceptanceCriteria,
      reviewProtocol,
      duration: Date.now() - start,
    };
  }

  private fetchPrMeta(prNumber: number): PrMeta {
    try {
      const raw = execSync(
        `gh pr view ${prNumber} --json title,headRefName,files,additions,deletions`,
        { encoding: 'utf-8', timeout: 15000 },
      );
      const data = JSON.parse(raw);
      return {
        title: data.title ?? '',
        branch: data.headRefName ?? '',
        changedFiles: (data.files ?? []).map((f: { path: string }) => f.path),
        additions: data.additions ?? 0,
        deletions: data.deletions ?? 0,
      };
    } catch (error) {
      throw new Error(
        `Failed to fetch PR #${prNumber}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private fetchPrDiff(prNumber: number): string {
    try {
      return execSync(`gh pr diff ${prNumber}`, {
        encoding: 'utf-8',
        timeout: 15000,
        maxBuffer: 10 * 1024 * 1024,
      });
    } catch (error) {
      this.logger.warn(`Failed to fetch diff for PR #${prNumber}: ${error}`);
      return '';
    }
  }

  private async generateChecklists(changedFiles: string[]): Promise<unknown[]> {
    if (changedFiles.length === 0) return [];
    try {
      const result = await this.checklistService.generateChecklist({
        files: changedFiles,
      });
      return result.checklists;
    } catch (error) {
      this.logger.warn(`Checklist generation failed: ${error}`);
      return [];
    }
  }

  private mapSpecialists(changedFiles: string[]): string[] {
    const mapped = this.mapper.mapFiles(changedFiles);
    const specialists = [...new Set(mapped.map(m => m.specialist))];
    return specialists;
  }

  private fetchIssueCriteria(issueNumber: number): string | null {
    try {
      const raw = execSync(`gh issue view ${issueNumber} --json body`, {
        encoding: 'utf-8',
        timeout: 10000,
      });
      const data = JSON.parse(raw);
      const body: string = data.body ?? '';

      const criteriaMatch = body.match(/## Acceptance criteria\s*\n([\s\S]*?)(?=\n## |\n---|$)/i);
      return criteriaMatch ? criteriaMatch[1].trim() : body.slice(0, 2000);
    } catch {
      return null;
    }
  }

  private buildReviewProtocol(prNumber: number, issueNumber?: number): string {
    const issueCmd = issueNumber ? `\ngh issue view ${issueNumber}` : '';
    return [
      'Follow the canonical PR review cycle (pr-review-cycle.md):',
      '',
      '1. CI GATE (BLOCKING): gh pr checks ' + prNumber,
      '2. LOCAL VERIFICATION: yarn lint && yarn type-check',
      '3. READ THE DIFF: gh pr diff ' + prNumber,
      '4. CODE QUALITY SCAN: unused imports, any types, missing error handling, dead code',
      '5. SPEC COMPLIANCE: ' + (issueNumber ? `gh issue view ${issueNumber}` : 'N/A'),
      '6. TEST COVERAGE: new logic tested? edge cases covered?',
      '7. WRITE REVIEW: gh pr review ' + prNumber + ' --comment --body "<structured review>"',
      '',
      'Severity scale: critical / high / medium / low (see severity-classification.md)',
      'Approval gate: Critical=0 AND High=0',
      '',
      'Commands:',
      `gh pr checks ${prNumber}`,
      `gh pr diff ${prNumber}`,
      issueCmd,
    ]
      .filter(Boolean)
      .join('\n');
  }
}
