import { describe, it, expect, beforeEach } from 'vitest';
import { QualityReportHandler } from './quality-report.handler';
import { QualityReportService } from '../../ship/quality-report.service';

describe('QualityReportHandler', () => {
  let handler: QualityReportHandler;

  beforeEach(() => {
    const service = new QualityReportService();
    handler = new QualityReportHandler(service);
  });

  it('should return null for unhandled tools', async () => {
    const result = await handler.handle('unknown_tool', {});
    expect(result).toBeNull();
  });

  it('should handle pr_quality_report with changed files', async () => {
    const result = await handler.handle('pr_quality_report', {
      changedFiles: ['src/auth/login.ts'],
    });
    expect(result).not.toBeNull();
    expect(result!.isError).toBeUndefined();
    const data = JSON.parse(result!.content[0].text);
    expect(data.domains).toBeDefined();
    expect(data.markdown).toBeDefined();
    expect(data.duration).toBeDefined();
  });

  it('should handle empty changedFiles', async () => {
    const result = await handler.handle('pr_quality_report', {
      changedFiles: [],
    });
    expect(result).not.toBeNull();
    const data = JSON.parse(result!.content[0].text);
    expect(data.domains).toEqual([]);
    expect(data.markdown).toContain('No changed files');
  });

  it('should handle missing changedFiles gracefully', async () => {
    const result = await handler.handle('pr_quality_report', {});
    expect(result).not.toBeNull();
    const data = JSON.parse(result!.content[0].text);
    expect(data.domains).toEqual([]);
  });

  it('should detect security domain for auth files', async () => {
    const result = await handler.handle('pr_quality_report', {
      changedFiles: ['src/auth/token.ts'],
    });
    const data = JSON.parse(result!.content[0].text);
    const domains = data.domains.map((d: { domain: string }) => d.domain);
    expect(domains).toContain('security');
    expect(domains).toContain('code-quality');
  });

  it('should expose tool definitions', () => {
    const defs = handler.getToolDefinitions();
    expect(defs).toHaveLength(1);
    expect(defs[0].name).toBe('pr_quality_report');
    expect(defs[0].inputSchema.required).toContain('changedFiles');
  });
});
