import { describe, it, expect, beforeEach } from 'vitest';
import { syncSettings } from '../sync';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

describe('syncSettings', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-test-'));

    // Create .ai-rules source structure
    const agentsDir = path.join(tmpDir, 'packages/rules/.ai-rules/agents');
    const rulesDir = path.join(tmpDir, 'packages/rules/.ai-rules/rules');
    await fs.mkdir(agentsDir, { recursive: true });
    await fs.mkdir(rulesDir, { recursive: true });

    // Create agent fixtures
    await fs.writeFile(
      path.join(agentsDir, 'frontend-developer.json'),
      JSON.stringify({
        name: 'Frontend Developer',
        description: 'Frontend specialist',
        expertise: ['React'],
      }),
    );

    // Create rule fixtures
    await fs.writeFile(path.join(rulesDir, 'core.md'), '# Core Rules\n');

    // Create target directories
    for (const dir of [
      '.cursor/rules',
      '.claude/rules',
      '.antigravity/rules',
      '.codex/rules',
      '.q/rules',
      '.kiro/rules',
    ]) {
      await fs.mkdir(path.join(tmpDir, dir), { recursive: true });
    }
  });

  it('generates all tool config files', async () => {
    const result = await syncSettings(tmpDir);

    expect(result.filesWritten).toBeGreaterThanOrEqual(7);

    // Verify key files exist
    const cursorAgent = await fs.readFile(
      path.join(tmpDir, '.cursor/rules/auto-agent.mdc'),
      'utf-8',
    );
    expect(cursorAgent).toContain('frontend-developer');

    const claudeCI = await fs.readFile(
      path.join(tmpDir, '.claude/rules/custom-instructions.md'),
      'utf-8',
    );
    expect(claudeCI).toContain('Frontend Developer');
  });

  it('is idempotent — running twice produces same files', async () => {
    await syncSettings(tmpDir);
    const firstContent = await fs.readFile(
      path.join(tmpDir, '.cursor/rules/auto-agent.mdc'),
      'utf-8',
    );

    await syncSettings(tmpDir);
    const secondContent = await fs.readFile(
      path.join(tmpDir, '.cursor/rules/auto-agent.mdc'),
      'utf-8',
    );

    expect(firstContent).toBe(secondContent);
  });

  it('can sync a single tool independently', async () => {
    const result = await syncSettings(tmpDir, { tools: ['cursor'] });

    expect(result.filesWritten).toBe(2); // auto-agent.mdc + imports.mdc

    // Claude file should NOT be generated
    await expect(
      fs.access(path.join(tmpDir, '.claude/rules/custom-instructions.md')),
    ).rejects.toThrow();
  });

  it('returns summary of what was written', async () => {
    const result = await syncSettings(tmpDir);

    expect(result.filesWritten).toBeGreaterThan(0);
    expect(result.files).toBeInstanceOf(Array);
    expect(result.files.length).toBe(result.filesWritten);
    expect(result.files[0]).toMatch(/^\./); // starts with .
  });
});
