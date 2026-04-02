import { describe, it, expect, beforeEach } from 'vitest';
import { QualityReportService } from './quality-report.service';

describe('QualityReportService', () => {
  let service: QualityReportService;

  beforeEach(() => {
    service = new QualityReportService();
  });

  describe('generateReport', () => {
    it('should return empty report for empty file list', async () => {
      const result = await service.generateReport({ changedFiles: [] });
      expect(result.domains).toEqual([]);
      expect(result.markdown).toContain('No changed files');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should detect domains from changed files', async () => {
      const result = await service.generateReport({
        changedFiles: ['src/auth/login.ts', 'src/components/Button.tsx'],
      });
      const domains = result.domains.map(d => d.domain);
      expect(domains).toContain('code-quality');
      expect(domains).toContain('security');
      expect(domains).toContain('accessibility');
    });

    it('should set pass status with no findings by default', async () => {
      const result = await service.generateReport({
        changedFiles: ['src/utils/helper.ts'],
      });
      expect(result.domains).toHaveLength(1);
      expect(result.domains[0].status).toBe('pass');
      expect(result.domains[0].findings).toEqual([]);
    });

    it('should include duration in result', async () => {
      const result = await service.generateReport({
        changedFiles: ['src/app.ts'],
      });
      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('markdown formatting', () => {
    it('should include Quality Report header', async () => {
      const result = await service.generateReport({
        changedFiles: ['src/app.ts'],
      });
      expect(result.markdown).toContain('# Quality Report');
    });

    it('should include domain sections', async () => {
      const result = await service.generateReport({
        changedFiles: ['src/auth/login.tsx'],
      });
      expect(result.markdown).toContain('code-quality');
      expect(result.markdown).toContain('security');
      expect(result.markdown).toContain('accessibility');
    });

    it('should include status indicators', async () => {
      const result = await service.generateReport({
        changedFiles: ['src/app.ts'],
      });
      // pass status should show a check mark
      expect(result.markdown).toMatch(/pass/i);
    });

    it('should include file count summary', async () => {
      const result = await service.generateReport({
        changedFiles: ['src/a.ts', 'src/b.ts', 'src/c.ts'],
      });
      expect(result.markdown).toContain('3');
    });

    it('should show no domains message for unrecognized files', async () => {
      const result = await service.generateReport({
        changedFiles: ['README.md'],
      });
      expect(result.markdown).toContain('No changed files');
    });
  });
});
