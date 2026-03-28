import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReleaseCheckHandler } from './release-check.handler';
import { ConfigService } from '../../config/config.service';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdtempSync } from 'fs';

describe('ReleaseCheckHandler', () => {
  let handler: ReleaseCheckHandler;
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'release-check-'));
    const mockConfigService = {
      getProjectRoot: vi.fn().mockReturnValue(projectRoot),
      getConfig: vi.fn().mockReturnValue({}),
    } as unknown as ConfigService;
    handler = new ReleaseCheckHandler(mockConfigService);
  });

  it('should return null for unhandled tools', async () => {
    const result = await handler.handle('unknown_tool', {});
    expect(result).toBeNull();
  });

  it('should detect Node.js ecosystem', async () => {
    await writeFile(
      join(projectRoot, 'package.json'),
      JSON.stringify({ name: 'test', version: '1.0.0' }),
    );
    await writeFile(join(projectRoot, 'yarn.lock'), '');

    const result = await handler.handle('pre_release_check', {});
    expect(result).not.toBeNull();
    const data = JSON.parse(result!.content[0].text);
    expect(data.ecosystem).toBe('Node.js');
  });

  it('should check version sync — pass when consistent', async () => {
    await writeFile(
      join(projectRoot, 'package.json'),
      JSON.stringify({ name: 'test', version: '2.0.0' }),
    );
    await writeFile(join(projectRoot, 'yarn.lock'), '');

    const result = await handler.handle('pre_release_check', {
      checks: ['version-sync'],
    });
    const data = JSON.parse(result!.content[0].text);
    expect(data.results[0].status).toBe('pass');
    expect(data.results[0].message).toContain('2.0.0');
  });

  it('should check lockfile — pass when present', async () => {
    await writeFile(join(projectRoot, 'package.json'), JSON.stringify({ version: '1.0.0' }));
    await writeFile(join(projectRoot, 'yarn.lock'), '');

    const result = await handler.handle('pre_release_check', {
      checks: ['lockfile'],
    });
    const data = JSON.parse(result!.content[0].text);
    expect(data.results[0].status).toBe('pass');
  });

  it('should check lockfile — fail when missing', async () => {
    await writeFile(join(projectRoot, 'package.json'), JSON.stringify({ version: '1.0.0' }));

    const result = await handler.handle('pre_release_check', {
      checks: ['lockfile'],
    });
    const data = JSON.parse(result!.content[0].text);
    expect(data.results[0].status).toBe('fail');
  });

  it('should check manifest — skip when no plugin', async () => {
    await writeFile(join(projectRoot, 'package.json'), JSON.stringify({ version: '1.0.0' }));

    const result = await handler.handle('pre_release_check', {
      checks: ['manifest'],
    });
    const data = JSON.parse(result!.content[0].text);
    expect(data.results[0].status).toBe('skip');
  });

  it('should return summary with ready flag', async () => {
    await writeFile(
      join(projectRoot, 'package.json'),
      JSON.stringify({ name: 'test', version: '1.0.0' }),
    );
    await writeFile(join(projectRoot, 'yarn.lock'), '');

    const result = await handler.handle('pre_release_check', {});
    const data = JSON.parse(result!.content[0].text);
    expect(data.summary).toBeDefined();
    expect(typeof data.summary.ready).toBe('boolean');
  });

  it('should expose tool definitions', () => {
    const defs = handler.getToolDefinitions();
    expect(defs).toHaveLength(1);
    expect(defs[0].name).toBe('pre_release_check');
  });
});
