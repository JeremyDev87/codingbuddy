import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  syncRules,
  readSourceData,
  generateFiles,
  diffFiles,
  writeFiles,
} from '../sync-rules';

describe('sync-rules', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-rules-test-'));

    // Create .ai-rules source structure
    const agentsDir = path.join(tmpDir, 'packages/rules/.ai-rules/agents');
    const rulesDir = path.join(tmpDir, 'packages/rules/.ai-rules/rules');
    await fs.mkdir(agentsDir, { recursive: true });
    await fs.mkdir(rulesDir, { recursive: true });

    // Create agent fixture
    await fs.writeFile(
      path.join(agentsDir, 'frontend-developer.json'),
      JSON.stringify({
        name: 'Frontend Developer',
        description: 'Frontend specialist',
        expertise: ['React'],
      }),
    );

    // Create rule fixture
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

  describe('readSourceData', () => {
    it('reads agents and rules from .ai-rules', async () => {
      const data = await readSourceData(tmpDir);

      expect(data.agents).toHaveLength(1);
      expect(data.agents[0].displayName).toBe('Frontend Developer');
      expect(data.rules).toHaveLength(1);
      expect(data.rules[0].name).toBe('core');
    });
  });

  describe('generateFiles', () => {
    it('generates files for all tools', async () => {
      const data = await readSourceData(tmpDir);
      const files = generateFiles(data);

      expect(files.length).toBeGreaterThanOrEqual(7);
      expect(files.some(f => f.relativePath.startsWith('.cursor/'))).toBe(true);
      expect(files.some(f => f.relativePath.startsWith('.claude/'))).toBe(true);
      expect(files.some(f => f.relativePath.startsWith('.codex/'))).toBe(true);
    });

    it('generates files for a specific tool', async () => {
      const data = await readSourceData(tmpDir);
      const files = generateFiles(data, ['cursor']);

      expect(files).toHaveLength(2);
      expect(files.every(f => f.relativePath.startsWith('.cursor/'))).toBe(true);
    });
  });

  describe('diffFiles', () => {
    it('reports added for missing files', async () => {
      const data = await readSourceData(tmpDir);
      const files = generateFiles(data, ['q']);
      // Don't write anything first — file is "new"
      // But we created the dir, so remove the file if it exists
      const absPath = path.join(tmpDir, '.q/rules/customizations.md');
      try {
        await fs.unlink(absPath);
      } catch {
        // doesn't exist, that's fine
      }

      const changes = await diffFiles(tmpDir, files);

      expect(changes).toHaveLength(1);
      expect(changes[0].status).toBe('added');
    });

    it('reports unchanged for identical files', async () => {
      const data = await readSourceData(tmpDir);
      const files = generateFiles(data, ['q']);
      await writeFiles(tmpDir, files);

      const changes = await diffFiles(tmpDir, files);

      expect(changes).toHaveLength(1);
      expect(changes[0].status).toBe('unchanged');
    });

    it('reports modified for differing files', async () => {
      const data = await readSourceData(tmpDir);
      const files = generateFiles(data, ['q']);
      // Write stale content
      const absPath = path.join(tmpDir, files[0].relativePath);
      await fs.writeFile(absPath, 'stale content', 'utf-8');

      const changes = await diffFiles(tmpDir, files);

      expect(changes).toHaveLength(1);
      expect(changes[0].status).toBe('modified');
    });
  });

  describe('syncRules', () => {
    it('writes files in default mode', async () => {
      const result = await syncRules(tmpDir);

      expect(result.outOfSync).toBe(true);
      expect(result.changes.some(c => c.status === 'added')).toBe(true);

      // Verify files were actually written
      const content = await fs.readFile(
        path.join(tmpDir, '.cursor/rules/auto-agent.mdc'),
        'utf-8',
      );
      expect(content).toContain('frontend-developer');
    });

    it('does not write files in dry-run mode', async () => {
      const result = await syncRules(tmpDir, { dryRun: true });

      expect(result.outOfSync).toBe(true);

      // Files should NOT have been written
      await expect(
        fs.readFile(path.join(tmpDir, '.codex/rules/system-prompt.md'), 'utf-8'),
      ).rejects.toThrow();
    });

    it('does not write files in check mode', async () => {
      const result = await syncRules(tmpDir, { check: true });

      expect(result.outOfSync).toBe(true);

      // Files should NOT have been written
      await expect(
        fs.readFile(path.join(tmpDir, '.codex/rules/system-prompt.md'), 'utf-8'),
      ).rejects.toThrow();
    });

    it('returns outOfSync=false when files match', async () => {
      // First sync to write all files
      await syncRules(tmpDir);

      // Check mode should pass
      const result = await syncRules(tmpDir, { check: true });

      expect(result.outOfSync).toBe(false);
      expect(result.changes.every(c => c.status === 'unchanged')).toBe(true);
    });

    it('syncs only specified tools', async () => {
      const result = await syncRules(tmpDir, { tools: ['kiro'] });

      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].relativePath).toBe('.kiro/rules/guidelines.md');
    });

    it('is idempotent — running twice produces same result', async () => {
      await syncRules(tmpDir);
      const first = await fs.readFile(
        path.join(tmpDir, '.cursor/rules/auto-agent.mdc'),
        'utf-8',
      );

      await syncRules(tmpDir);
      const second = await fs.readFile(
        path.join(tmpDir, '.cursor/rules/auto-agent.mdc'),
        'utf-8',
      );

      expect(first).toBe(second);
    });
  });
});
