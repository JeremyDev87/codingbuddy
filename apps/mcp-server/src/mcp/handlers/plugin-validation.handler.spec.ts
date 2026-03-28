import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PluginValidationHandler } from './plugin-validation.handler';
import { ConfigService } from '../../config/config.service';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdtempSync } from 'fs';

describe('PluginValidationHandler', () => {
  let handler: PluginValidationHandler;
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'plugin-val-'));
    const mockConfigService = {
      getProjectRoot: vi.fn().mockReturnValue(projectRoot),
    } as unknown as ConfigService;
    handler = new PluginValidationHandler(mockConfigService);
  });

  it('should return null for unhandled tools', async () => {
    const result = await handler.handle('unknown_tool', {});
    expect(result).toBeNull();
  });

  it('should validate valid plugin.json', async () => {
    await mkdir(join(projectRoot, '.claude-plugin'), { recursive: true });
    await writeFile(
      join(projectRoot, '.claude-plugin', 'plugin.json'),
      JSON.stringify({
        name: 'my-plugin',
        version: '1.0.0',
        description: 'A test plugin',
      }),
    );

    const result = await handler.handle('validate_plugin_manifest', {});
    expect(result).not.toBeNull();
    const data = JSON.parse(result!.content[0].text);
    expect(data.valid).toBe(true);
    expect(data.issues).toHaveLength(0);
  });

  it('should detect missing required fields', async () => {
    await mkdir(join(projectRoot, '.claude-plugin'), { recursive: true });
    await writeFile(
      join(projectRoot, '.claude-plugin', 'plugin.json'),
      JSON.stringify({ name: 'test' }),
    );

    const result = await handler.handle('validate_plugin_manifest', {});
    const data = JSON.parse(result!.content[0].text);
    expect(data.valid).toBe(false);
    expect(data.issues.some((i: { field: string }) => i.field === 'version')).toBe(true);
    expect(data.issues.some((i: { field: string }) => i.field === 'description')).toBe(true);
  });

  it('should detect unknown fields', async () => {
    await mkdir(join(projectRoot, '.claude-plugin'), { recursive: true });
    await writeFile(
      join(projectRoot, '.claude-plugin', 'plugin.json'),
      JSON.stringify({
        name: 'test',
        version: '1.0.0',
        description: 'test',
        commands: [],
      }),
    );

    const result = await handler.handle('validate_plugin_manifest', {});
    const data = JSON.parse(result!.content[0].text);
    expect(data.valid).toBe(false);
    expect(data.issues.some((i: { field: string }) => i.field === 'commands')).toBe(true);
  });

  it('should handle file not found', async () => {
    const result = await handler.handle('validate_plugin_manifest', {});
    const data = JSON.parse(result!.content[0].text);
    expect(data.valid).toBe(false);
    expect(data.issues[0].message).toContain('not found');
  });

  it('should expose tool definitions', () => {
    const defs = handler.getToolDefinitions();
    expect(defs).toHaveLength(1);
    expect(defs[0].name).toBe('validate_plugin_manifest');
  });
});
