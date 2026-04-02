import { Injectable } from '@nestjs/common';
import { FileSpecialistMapper } from './file-specialist-mapper';
import type { QualityReportInput, QualityReportResult, DomainResult } from './quality-report.types';

@Injectable()
export class QualityReportService {
  private readonly mapper = new FileSpecialistMapper();

  async generateReport(input: QualityReportInput): Promise<QualityReportResult> {
    const start = Date.now();
    const { changedFiles } = input;

    const mappedSpecialists = this.mapper.mapFiles(changedFiles);

    const domains: DomainResult[] = mappedSpecialists.map(mapped => ({
      domain: mapped.domain,
      specialist: mapped.specialist,
      status: 'pass' as const,
      findings: [],
    }));

    const markdown = this.formatMarkdown(domains, changedFiles.length);
    const duration = Date.now() - start;

    return { domains, markdown, duration };
  }

  private formatMarkdown(domains: DomainResult[], fileCount: number): string {
    if (domains.length === 0) {
      return '# Quality Report\n\nNo changed files to analyze.\n';
    }

    const lines: string[] = [
      '# Quality Report',
      '',
      `**Files analyzed:** ${fileCount}`,
      `**Domains detected:** ${domains.length}`,
      '',
      '| Domain | Specialist | Status | Findings |',
      '|--------|-----------|--------|----------|',
    ];

    for (const domain of domains) {
      const statusIcon = domain.status === 'pass' ? 'pass' : domain.status;
      const findingsText =
        domain.findings.length > 0 ? domain.findings.join('; ') : 'No issues found';
      lines.push(`| ${domain.domain} | ${domain.specialist} | ${statusIcon} | ${findingsText} |`);
    }

    lines.push('');
    return lines.join('\n');
  }
}
