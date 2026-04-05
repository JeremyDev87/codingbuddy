/**
 * Unit Tests for Legacy Hook Migration (#1381 + #1384)
 *
 * Covers the migration path that cleans up the stale global hook script
 * `~/.claude/hooks/codingbuddy-mode-detect.py` and its corresponding
 * `UserPromptSubmit` entry in `~/.claude/settings.json` left behind by
 * plugin versions prior to the self-contained hook refactor.
 *
 * Requirements derived from issues #1381 / #1384:
 *   - Remove stale global `codingbuddy-mode-detect.py`.
 *   - Remove `~/.claude/hooks/lib` only when it is a symlink (never a real dir).
 *   - Strip only the legacy `UserPromptSubmit` entry; preserve unrelated ones.
 *   - Delete the `UserPromptSubmit` key if it becomes empty.
 *   - Back up `settings.json` before writing.
 *   - Respect `CODINGBUDDY_POSTINSTALL_DRY_RUN=1` (or opts.dryRun).
 *   - Idempotent: a second run must be a no-op.
 *   - Graceful degrade on malformed/missing files.
 *   - Emit clear log lines describing what changed (#1384 visibility).
 */

import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// CJS require via createRequire so the migration module can be authored
// as plain JS (it is executed from `node scripts/postinstall.js` in user
// environments where ts-node is not guaranteed to be available).
import { createRequire } from 'module';
const requireCjs = createRequire(__filename);
const migrateLegacyHooks = requireCjs('./migrate-legacy-hooks.js') as {
  migrateLegacyHooks: (opts?: MigrateOpts) => MigrateResult;
  LEGACY_SCRIPT_NAME: string;
};

type MigrateOpts = {
  homeDir?: string;
  dryRun?: boolean;
  logger?: (line: string) => void;
};

type MigrateResult = {
  removedScript: boolean;
  removedSymlink: boolean;
  strippedSettingsEntries: number;
  removedUserPromptSubmitKey: boolean;
  backupPath: string | null;
  dryRun: boolean;
  warnings: string[];
};

// -----------------------------------------------------------------------------
// Fixture helpers
// -----------------------------------------------------------------------------

function makeTmpHome(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cb-migrate-'));
  fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.claude', 'hooks'), { recursive: true });
  return dir;
}

function writeSettings(homeDir: string, content: unknown): string {
  const p = path.join(homeDir, '.claude', 'settings.json');
  fs.writeFileSync(p, typeof content === 'string' ? content : JSON.stringify(content, null, 2));
  return p;
}

function writeLegacyScript(homeDir: string): string {
  const p = path.join(homeDir, '.claude', 'hooks', 'codingbuddy-mode-detect.py');
  fs.writeFileSync(p, '# stale legacy hook\n');
  return p;
}

function legacyEntry() {
  return {
    hooks: [
      {
        type: 'command',
        command: 'python3 ~/.claude/hooks/codingbuddy-mode-detect.py',
      },
    ],
  };
}

function unrelatedEntry() {
  return {
    hooks: [
      {
        type: 'command',
        command: 'python3 ~/.claude/hooks/other-user-hook.py',
      },
    ],
  };
}

// Keep temp dirs bounded across tests.
const createdDirs: string[] = [];
function tmpHome(): string {
  const d = makeTmpHome();
  createdDirs.push(d);
  return d;
}

afterEach(() => {
  while (createdDirs.length > 0) {
    const d = createdDirs.pop();
    if (d && fs.existsSync(d)) {
      fs.rmSync(d, { recursive: true, force: true });
    }
  }
});

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

describe('migrate-legacy-hooks', () => {
  describe('stale global script removal', () => {
    it('removes ~/.claude/hooks/codingbuddy-mode-detect.py when present', () => {
      const home = tmpHome();
      const scriptPath = writeLegacyScript(home);

      const result = migrateLegacyHooks.migrateLegacyHooks({ homeDir: home });

      expect(fs.existsSync(scriptPath)).toBe(false);
      expect(result.removedScript).toBe(true);
    });

    it('leaves unrelated files in ~/.claude/hooks/ untouched', () => {
      const home = tmpHome();
      writeLegacyScript(home);
      const otherPath = path.join(home, '.claude', 'hooks', 'my-own-hook.py');
      fs.writeFileSync(otherPath, '# user hook\n');

      migrateLegacyHooks.migrateLegacyHooks({ homeDir: home });

      expect(fs.existsSync(otherPath)).toBe(true);
    });

    it('is a no-op when the legacy script does not exist', () => {
      const home = tmpHome();

      const result = migrateLegacyHooks.migrateLegacyHooks({ homeDir: home });

      expect(result.removedScript).toBe(false);
    });
  });

  describe('~/.claude/hooks/lib symlink handling', () => {
    it('removes ~/.claude/hooks/lib when it is a symlink', () => {
      const home = tmpHome();
      const target = fs.mkdtempSync(path.join(os.tmpdir(), 'cb-lib-target-'));
      createdDirs.push(target);
      const libLink = path.join(home, '.claude', 'hooks', 'lib');
      fs.symlinkSync(target, libLink, 'dir');

      const result = migrateLegacyHooks.migrateLegacyHooks({ homeDir: home });

      expect(fs.existsSync(libLink)).toBe(false);
      // Target directory must NOT be deleted.
      expect(fs.existsSync(target)).toBe(true);
      expect(result.removedSymlink).toBe(true);
    });

    it('does NOT touch ~/.claude/hooks/lib when it is a real directory', () => {
      const home = tmpHome();
      const libDir = path.join(home, '.claude', 'hooks', 'lib');
      fs.mkdirSync(libDir, { recursive: true });
      fs.writeFileSync(path.join(libDir, 'user-owned.txt'), 'keep me');

      const result = migrateLegacyHooks.migrateLegacyHooks({ homeDir: home });

      expect(fs.existsSync(libDir)).toBe(true);
      expect(fs.existsSync(path.join(libDir, 'user-owned.txt'))).toBe(true);
      expect(result.removedSymlink).toBe(false);
    });
  });

  describe('settings.json UserPromptSubmit filtering', () => {
    it('strips the legacy entry and preserves unrelated entries', () => {
      const home = tmpHome();
      const settingsPath = writeSettings(home, {
        hooks: {
          UserPromptSubmit: [legacyEntry(), unrelatedEntry()],
        },
      });

      const result = migrateLegacyHooks.migrateLegacyHooks({ homeDir: home });

      const after = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      expect(after.hooks.UserPromptSubmit).toHaveLength(1);
      expect(after.hooks.UserPromptSubmit[0].hooks[0].command).toContain('other-user-hook.py');
      expect(result.strippedSettingsEntries).toBeGreaterThanOrEqual(1);
    });

    it('removes UserPromptSubmit key when it becomes empty', () => {
      const home = tmpHome();
      const settingsPath = writeSettings(home, {
        hooks: {
          UserPromptSubmit: [legacyEntry()],
          SessionStart: [{ hooks: [{ type: 'command', command: 'echo hi' }] }],
        },
      });

      const result = migrateLegacyHooks.migrateLegacyHooks({ homeDir: home });

      const after = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      expect(after.hooks.UserPromptSubmit).toBeUndefined();
      // SessionStart must remain intact.
      expect(after.hooks.SessionStart).toBeDefined();
      expect(result.removedUserPromptSubmitKey).toBe(true);
    });

    it('filters nested hooks arrays where only some sub-entries are legacy', () => {
      const home = tmpHome();
      const settingsPath = writeSettings(home, {
        hooks: {
          UserPromptSubmit: [
            {
              hooks: [
                {
                  type: 'command',
                  command: 'python3 ~/.claude/hooks/codingbuddy-mode-detect.py',
                },
                {
                  type: 'command',
                  command: 'python3 ~/.claude/hooks/other-user-hook.py',
                },
              ],
            },
          ],
        },
      });

      migrateLegacyHooks.migrateLegacyHooks({ homeDir: home });

      const after = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      expect(after.hooks.UserPromptSubmit).toHaveLength(1);
      const inner = after.hooks.UserPromptSubmit[0].hooks;
      expect(inner).toHaveLength(1);
      expect(inner[0].command).toContain('other-user-hook.py');
    });

    it('does nothing when settings.json has no legacy entries', () => {
      const home = tmpHome();
      const original = {
        hooks: {
          UserPromptSubmit: [unrelatedEntry()],
        },
      };
      const settingsPath = writeSettings(home, original);
      const before = fs.readFileSync(settingsPath, 'utf8');

      const result = migrateLegacyHooks.migrateLegacyHooks({ homeDir: home });

      expect(fs.readFileSync(settingsPath, 'utf8')).toBe(before);
      expect(result.strippedSettingsEntries).toBe(0);
      expect(result.backupPath).toBeNull();
    });
  });

  describe('backup behavior', () => {
    it('creates a timestamped backup before rewriting settings.json', () => {
      const home = tmpHome();
      writeSettings(home, {
        hooks: {
          UserPromptSubmit: [legacyEntry()],
        },
      });

      const result = migrateLegacyHooks.migrateLegacyHooks({ homeDir: home });

      expect(result.backupPath).toBeTruthy();
      expect(result.backupPath).toMatch(/settings\.json\.bak-codingbuddy-migration-\d+/);
      expect(fs.existsSync(result.backupPath as string)).toBe(true);
    });

    it('does not create a backup when nothing changes', () => {
      const home = tmpHome();
      writeSettings(home, { hooks: { UserPromptSubmit: [unrelatedEntry()] } });

      const result = migrateLegacyHooks.migrateLegacyHooks({ homeDir: home });

      expect(result.backupPath).toBeNull();
    });
  });

  describe('dry-run mode', () => {
    it('does not write any files when dryRun is true', () => {
      const home = tmpHome();
      const scriptPath = writeLegacyScript(home);
      const settingsPath = writeSettings(home, {
        hooks: { UserPromptSubmit: [legacyEntry()] },
      });
      const before = fs.readFileSync(settingsPath, 'utf8');

      const result = migrateLegacyHooks.migrateLegacyHooks({
        homeDir: home,
        dryRun: true,
      });

      expect(fs.existsSync(scriptPath)).toBe(true);
      expect(fs.readFileSync(settingsPath, 'utf8')).toBe(before);
      expect(result.dryRun).toBe(true);
      // Result reports what *would* change even in dry-run.
      expect(result.removedScript).toBe(true);
      expect(result.strippedSettingsEntries).toBeGreaterThanOrEqual(1);
      expect(result.backupPath).toBeNull();
    });

    it('honors CODINGBUDDY_POSTINSTALL_DRY_RUN=1 env var', () => {
      const home = tmpHome();
      writeLegacyScript(home);
      writeSettings(home, { hooks: { UserPromptSubmit: [legacyEntry()] } });
      const prev = process.env.CODINGBUDDY_POSTINSTALL_DRY_RUN;
      process.env.CODINGBUDDY_POSTINSTALL_DRY_RUN = '1';
      try {
        const result = migrateLegacyHooks.migrateLegacyHooks({ homeDir: home });
        expect(result.dryRun).toBe(true);
        expect(
          fs.existsSync(path.join(home, '.claude', 'hooks', 'codingbuddy-mode-detect.py')),
        ).toBe(true);
      } finally {
        if (prev === undefined) {
          delete process.env.CODINGBUDDY_POSTINSTALL_DRY_RUN;
        } else {
          process.env.CODINGBUDDY_POSTINSTALL_DRY_RUN = prev;
        }
      }
    });
  });

  describe('idempotency', () => {
    it('running twice produces the same state and no extra backups', () => {
      const home = tmpHome();
      writeLegacyScript(home);
      writeSettings(home, { hooks: { UserPromptSubmit: [legacyEntry()] } });

      const first = migrateLegacyHooks.migrateLegacyHooks({ homeDir: home });
      const second = migrateLegacyHooks.migrateLegacyHooks({ homeDir: home });

      expect(first.removedScript).toBe(true);
      expect(second.removedScript).toBe(false);
      expect(second.strippedSettingsEntries).toBe(0);
      expect(second.backupPath).toBeNull();
    });
  });

  describe('graceful degradation', () => {
    it('does not throw when ~/.claude is missing entirely', () => {
      const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cb-migrate-empty-'));
      createdDirs.push(home);
      // No .claude directory at all.
      expect(() => migrateLegacyHooks.migrateLegacyHooks({ homeDir: home })).not.toThrow();
    });

    it('does not throw when settings.json is malformed', () => {
      const home = tmpHome();
      writeSettings(home, 'this is not JSON {');

      const result = migrateLegacyHooks.migrateLegacyHooks({ homeDir: home });

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.strippedSettingsEntries).toBe(0);
      // Original content must remain untouched when parse fails.
      const raw = fs.readFileSync(path.join(home, '.claude', 'settings.json'), 'utf8');
      expect(raw).toBe('this is not JSON {');
    });

    it('does not throw when settings.json is missing', () => {
      const home = tmpHome();
      // No settings.json written.
      expect(() => migrateLegacyHooks.migrateLegacyHooks({ homeDir: home })).not.toThrow();
    });
  });

  describe('log visibility (#1384)', () => {
    it('emits a log line when stale script is removed', () => {
      const home = tmpHome();
      writeLegacyScript(home);
      const lines: string[] = [];

      migrateLegacyHooks.migrateLegacyHooks({
        homeDir: home,
        logger: line => lines.push(line),
      });

      expect(lines.some(l => /codingbuddy-mode-detect\.py/.test(l))).toBe(true);
      expect(lines.some(l => /Migrat/i.test(l))).toBe(true);
    });

    it('emits a log line when settings.json is updated', () => {
      const home = tmpHome();
      writeSettings(home, { hooks: { UserPromptSubmit: [legacyEntry()] } });
      const lines: string[] = [];

      migrateLegacyHooks.migrateLegacyHooks({
        homeDir: home,
        logger: line => lines.push(line),
      });

      expect(lines.some(l => /settings\.json/.test(l))).toBe(true);
    });

    it('remains quiet when there is nothing to migrate', () => {
      const home = tmpHome();
      const lines: string[] = [];
      migrateLegacyHooks.migrateLegacyHooks({
        homeDir: home,
        logger: line => lines.push(line),
      });
      // No legacy script, no settings.json => no "Migrated" lines.
      expect(lines.some(l => /Migrat/i.test(l))).toBe(false);
    });
  });

  describe('legacy script name constant', () => {
    it('exposes the canonical legacy script file name for callers', () => {
      expect(migrateLegacyHooks.LEGACY_SCRIPT_NAME).toBe('codingbuddy-mode-detect.py');
    });
  });
});
