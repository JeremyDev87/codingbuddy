import { describe, it, expect, vi } from 'vitest';
import * as path from 'path';
import {
  resolveRulesDir,
  readRuleContent,
  listAgentNames,
  loadAgentProfile,
  searchInRuleFiles,
  listSkillSummaries,
  loadSkill,
} from './rules-core';
import type { FileSystemDeps } from './rules-core';

// ============================================================================
// Test Helpers
// ============================================================================

function makeDeps(overrides?: Partial<FileSystemDeps>): FileSystemDeps {
  return {
    readFile:
      overrides?.readFile ?? vi.fn().mockRejectedValue(new Error('not mocked')),
    readdir:
      overrides?.readdir ?? vi.fn().mockRejectedValue(new Error('not mocked')),
  };
}

const VALID_AGENT_JSON = JSON.stringify({
  name: 'test-agent',
  description: 'A test agent',
  role: {
    title: 'Tester',
    expertise: ['testing'],
  },
});

const VALID_SKILL_MD = `---
name: test-skill
description: A test skill
---

# Test Skill

This is the content of the test skill.`;

// ============================================================================
// resolveRulesDir
// ============================================================================

describe('resolveRulesDir', () => {
  const dirname = '/app/mcp-server/dist/src/shared';

  describe('priority order', () => {
    it('returns envRulesDir when set', () => {
      const result = resolveRulesDir(dirname, {
        envRulesDir: '/custom/rules',
        packageRulesPath: '/pkg/rules',
      });
      expect(result).toBe('/custom/rules');
    });

    it('returns packageRulesPath when envRulesDir is not set', () => {
      const result = resolveRulesDir(dirname, {
        packageRulesPath: '/pkg/rules',
      });
      expect(result).toBe('/pkg/rules');
    });

    it('searches dev fallback candidates when neither option is set', () => {
      // The second candidate is ../../../packages/rules/.ai-rules
      const secondCandidate = path.resolve(
        dirname,
        '../../../packages/rules/.ai-rules',
      );
      const existsSync = vi
        .fn()
        .mockImplementation((p: string) => p === secondCandidate);

      const result = resolveRulesDir(dirname, { existsSync });
      expect(result).toBe(secondCandidate);
    });

    it('returns first candidate as fallback when no candidate exists', () => {
      const existsSync = vi.fn().mockReturnValue(false);
      const result = resolveRulesDir(dirname, { existsSync });
      expect(result).toBe(
        path.resolve(dirname, '../../../../packages/rules/.ai-rules'),
      );
    });
  });

  describe('no options provided', () => {
    it('returns first candidate when no options given', () => {
      const result = resolveRulesDir(dirname);
      expect(result).toBe(
        path.resolve(dirname, '../../../../packages/rules/.ai-rules'),
      );
    });

    it('returns first candidate when empty options given', () => {
      const result = resolveRulesDir(dirname, {});
      expect(result).toBe(
        path.resolve(dirname, '../../../../packages/rules/.ai-rules'),
      );
    });
  });

  describe('existsSync behavior', () => {
    it('returns first existing candidate', () => {
      const thirdCandidate = path.resolve(dirname, '../../../../.ai-rules');
      const existsSync = vi
        .fn()
        .mockImplementation((p: string) => p === thirdCandidate);

      const result = resolveRulesDir(dirname, { existsSync });
      expect(result).toBe(thirdCandidate);
    });

    it('does not call existsSync when envRulesDir is set', () => {
      const existsSync = vi.fn();
      resolveRulesDir(dirname, {
        envRulesDir: '/custom',
        existsSync,
      });
      expect(existsSync).not.toHaveBeenCalled();
    });

    it('does not call existsSync when packageRulesPath is set', () => {
      const existsSync = vi.fn();
      resolveRulesDir(dirname, {
        packageRulesPath: '/pkg',
        existsSync,
      });
      expect(existsSync).not.toHaveBeenCalled();
    });

    it('skips existsSync check when not provided', () => {
      // Should not throw
      const result = resolveRulesDir(dirname, {});
      expect(typeof result).toBe('string');
    });
  });
});

// ============================================================================
// readRuleContent
// ============================================================================

describe('readRuleContent', () => {
  const rulesDir = '/app/rules';

  it('reads a file with valid path', async () => {
    const deps = makeDeps({
      readFile: vi.fn().mockResolvedValue('file content'),
    });

    const result = await readRuleContent(rulesDir, 'rules/core.md', deps);
    expect(result).toBe('file content');
    expect(deps.readFile).toHaveBeenCalledWith(
      path.join(rulesDir, 'rules/core.md'),
      'utf-8',
    );
  });

  it('throws on path traversal attempt', async () => {
    const deps = makeDeps({
      readFile: vi.fn().mockResolvedValue('should not reach'),
    });

    await expect(
      readRuleContent(rulesDir, '../../../etc/passwd', deps),
    ).rejects.toThrow('Access denied: Invalid path');

    expect(deps.readFile).not.toHaveBeenCalled();
  });

  it('throws on read failure with descriptive message', async () => {
    const deps = makeDeps({
      readFile: vi.fn().mockRejectedValue(new Error('ENOENT')),
    });

    await expect(
      readRuleContent(rulesDir, 'rules/missing.md', deps),
    ).rejects.toThrow('Failed to read rule file: rules/missing.md');
  });

  it('rejects null byte injection', async () => {
    const deps = makeDeps({
      readFile: vi.fn().mockResolvedValue('content'),
    });

    await expect(
      readRuleContent(rulesDir, 'rules/test\x00.md', deps),
    ).rejects.toThrow('Access denied: Invalid path');
  });

  it('accepts nested relative paths', async () => {
    const deps = makeDeps({
      readFile: vi.fn().mockResolvedValue('nested content'),
    });

    const result = await readRuleContent(
      rulesDir,
      'agents/deep/file.json',
      deps,
    );
    expect(result).toBe('nested content');
  });
});

// ============================================================================
// listAgentNames
// ============================================================================

describe('listAgentNames', () => {
  const rulesDir = '/app/rules';

  it('returns agent names from .json files', async () => {
    const deps = makeDeps({
      readdir: vi
        .fn()
        .mockResolvedValue([
          'frontend-developer.json',
          'security-specialist.json',
          'README.md',
        ]),
    });

    const result = await listAgentNames(rulesDir, deps);
    expect(result).toEqual(['frontend-developer', 'security-specialist']);
  });

  it('returns empty array when directory does not exist', async () => {
    const deps = makeDeps({
      readdir: vi.fn().mockRejectedValue(new Error('ENOENT')),
    });

    const result = await listAgentNames(rulesDir, deps);
    expect(result).toEqual([]);
  });

  it('filters out non-json files', async () => {
    const deps = makeDeps({
      readdir: vi
        .fn()
        .mockResolvedValue([
          'agent.json',
          'notes.txt',
          'config.yaml',
          '.gitkeep',
        ]),
    });

    const result = await listAgentNames(rulesDir, deps);
    expect(result).toEqual(['agent']);
  });

  it('returns empty array for empty directory', async () => {
    const deps = makeDeps({
      readdir: vi.fn().mockResolvedValue([]),
    });

    const result = await listAgentNames(rulesDir, deps);
    expect(result).toEqual([]);
  });

  it('reads from agents subdirectory', async () => {
    const deps = makeDeps({
      readdir: vi.fn().mockResolvedValue([]),
    });

    await listAgentNames(rulesDir, deps);
    expect(deps.readdir).toHaveBeenCalledWith(path.join(rulesDir, 'agents'));
  });
});

// ============================================================================
// loadAgentProfile
// ============================================================================

describe('loadAgentProfile', () => {
  const rulesDir = '/app/rules';

  it('loads and validates a valid agent profile', async () => {
    const deps = makeDeps({
      readFile: vi.fn().mockResolvedValue(VALID_AGENT_JSON),
    });

    const result = await loadAgentProfile(rulesDir, 'test-agent', deps);
    expect(result.name).toBe('test-agent');
    expect(result.description).toBe('A test agent');
    expect(result.role.title).toBe('Tester');
    expect(result.role.expertise).toEqual(['testing']);
  });

  it('throws on invalid JSON', async () => {
    const deps = makeDeps({
      readFile: vi.fn().mockResolvedValue('not valid json'),
    });

    await expect(
      loadAgentProfile(rulesDir, 'bad-agent', deps),
    ).rejects.toThrow();
  });

  it('throws "Invalid agent profile" on schema validation failure', async () => {
    const invalidAgent = JSON.stringify({
      name: 'no-role',
      description: 'Missing required role field',
      // missing role
    });
    const deps = makeDeps({
      readFile: vi.fn().mockResolvedValue(invalidAgent),
    });

    await expect(loadAgentProfile(rulesDir, 'no-role', deps)).rejects.toThrow(
      'Invalid agent profile: no-role',
    );
  });

  it('reads from agents subdirectory', async () => {
    const deps = makeDeps({
      readFile: vi.fn().mockResolvedValue(VALID_AGENT_JSON),
    });

    await loadAgentProfile(rulesDir, 'my-agent', deps);
    expect(deps.readFile).toHaveBeenCalledWith(
      path.join(rulesDir, 'agents/my-agent.json'),
      'utf-8',
    );
  });

  it('propagates read errors from readRuleContent', async () => {
    const deps = makeDeps({
      readFile: vi.fn().mockRejectedValue(new Error('ENOENT')),
    });

    await expect(loadAgentProfile(rulesDir, 'missing', deps)).rejects.toThrow(
      'Failed to read rule file: agents/missing.json',
    );
  });

  it('throws on prototype pollution attempt', async () => {
    const malicious =
      '{"__proto__": {"polluted": true}, "name": "bad", "description": "x", "role": {"title": "x", "expertise": []}}';
    const deps = makeDeps({
      readFile: vi.fn().mockResolvedValue(malicious),
    });

    await expect(loadAgentProfile(rulesDir, 'malicious', deps)).rejects.toThrow(
      'Invalid agent profile: malicious',
    );
  });
});

// ============================================================================
// searchInRuleFiles
// ============================================================================

describe('searchInRuleFiles', () => {
  const rulesDir = '/app/rules';

  it('finds matching lines across files', async () => {
    const deps = makeDeps({
      readFile: vi.fn().mockImplementation((filePath: string) => {
        if (filePath.includes('core.md')) {
          return Promise.resolve(
            '# Core Rules\nTDD approach\nSolid principles',
          );
        }
        if (filePath.includes('project.md')) {
          return Promise.resolve('# Project\nTDD is important\nArchitecture');
        }
        return Promise.reject(new Error('not found'));
      }),
    });

    const results = await searchInRuleFiles(
      rulesDir,
      'TDD',
      ['rules/core.md', 'rules/project.md'],
      deps,
    );

    expect(results).toHaveLength(2);
    expect(results[0].file).toBe('rules/core.md');
    expect(results[0].score).toBe(1);
    expect(results[0].matches).toEqual(['Line 2: TDD approach']);
    expect(results[1].file).toBe('rules/project.md');
  });

  it('performs case-insensitive search', async () => {
    const deps = makeDeps({
      readFile: vi.fn().mockResolvedValue('UPPERCASE\nlowercase\nMiXeD'),
    });

    const results = await searchInRuleFiles(
      rulesDir,
      'uppercase',
      ['file.md'],
      deps,
    );

    expect(results).toHaveLength(1);
    expect(results[0].matches).toEqual(['Line 1: UPPERCASE']);
  });

  it('sorts results by score descending', async () => {
    const deps = makeDeps({
      readFile: vi.fn().mockImplementation((filePath: string) => {
        if (filePath.includes('many.md')) {
          return Promise.resolve('match\nmatch\nmatch');
        }
        if (filePath.includes('few.md')) {
          return Promise.resolve('match\nno\nno');
        }
        return Promise.reject(new Error('not found'));
      }),
    });

    const results = await searchInRuleFiles(
      rulesDir,
      'match',
      ['rules/few.md', 'rules/many.md'],
      deps,
    );

    expect(results).toHaveLength(2);
    expect(results[0].file).toBe('rules/many.md');
    expect(results[0].score).toBe(3);
    expect(results[1].file).toBe('rules/few.md');
    expect(results[1].score).toBe(1);
  });

  it('skips files that fail to read', async () => {
    const deps = makeDeps({
      readFile: vi.fn().mockImplementation((filePath: string) => {
        if (filePath.includes('good.md')) {
          return Promise.resolve('search term here');
        }
        return Promise.reject(new Error('read error'));
      }),
    });

    const results = await searchInRuleFiles(
      rulesDir,
      'search',
      ['rules/bad.md', 'rules/good.md'],
      deps,
    );

    expect(results).toHaveLength(1);
    expect(results[0].file).toBe('rules/good.md');
  });

  it('returns empty array when no matches found', async () => {
    const deps = makeDeps({
      readFile: vi.fn().mockResolvedValue('nothing relevant here'),
    });

    const results = await searchInRuleFiles(
      rulesDir,
      'nonexistent-query-xyz',
      ['rules/core.md'],
      deps,
    );

    expect(results).toEqual([]);
  });

  it('returns empty array for empty files list', async () => {
    const deps = makeDeps();
    const results = await searchInRuleFiles(rulesDir, 'query', [], deps);
    expect(results).toEqual([]);
  });

  it('includes line numbers in matches', async () => {
    const deps = makeDeps({
      readFile: vi
        .fn()
        .mockResolvedValue('line1\nfind me\nline3\nfind me again'),
    });

    const results = await searchInRuleFiles(
      rulesDir,
      'find me',
      ['test.md'],
      deps,
    );

    expect(results[0].matches).toEqual([
      'Line 2: find me',
      'Line 4: find me again',
    ]);
    expect(results[0].score).toBe(2);
  });
});

// ============================================================================
// listSkillSummaries
// ============================================================================

describe('listSkillSummaries', () => {
  const rulesDir = '/app/rules';

  it('lists skill summaries from subdirectories', async () => {
    const deps = makeDeps({
      readdir: vi.fn().mockResolvedValue([
        { name: 'tdd', isDirectory: () => true },
        { name: 'debugging', isDirectory: () => true },
      ]),
      readFile: vi.fn().mockImplementation((filePath: string) => {
        if (filePath.includes('tdd')) {
          return Promise.resolve(`---
name: tdd
description: Test-driven development
---

# TDD Skill content`);
        }
        if (filePath.includes('debugging')) {
          return Promise.resolve(`---
name: debugging
description: Systematic debugging
---

# Debugging Skill content`);
        }
        return Promise.reject(new Error('not found'));
      }),
    });

    const results = await listSkillSummaries(rulesDir, deps);
    expect(results).toEqual([
      { name: 'tdd', description: 'Test-driven development' },
      { name: 'debugging', description: 'Systematic debugging' },
    ]);
  });

  it('skips non-directory entries', async () => {
    const deps = makeDeps({
      readdir: vi.fn().mockResolvedValue([
        { name: 'valid-skill', isDirectory: () => true },
        { name: 'README.md', isDirectory: () => false },
      ]),
      readFile: vi.fn().mockResolvedValue(VALID_SKILL_MD),
    });

    const results = await listSkillSummaries(rulesDir, deps);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('test-skill');
  });

  it('skips invalid skills', async () => {
    const deps = makeDeps({
      readdir: vi
        .fn()
        .mockResolvedValue([{ name: 'bad-skill', isDirectory: () => true }]),
      readFile: vi.fn().mockResolvedValue('not valid skill md'),
    });

    const results = await listSkillSummaries(rulesDir, deps);
    expect(results).toEqual([]);
  });

  it('skips skills with missing SKILL.md', async () => {
    const deps = makeDeps({
      readdir: vi
        .fn()
        .mockResolvedValue([{ name: 'missing-file', isDirectory: () => true }]),
      readFile: vi.fn().mockRejectedValue(new Error('ENOENT')),
    });

    const results = await listSkillSummaries(rulesDir, deps);
    expect(results).toEqual([]);
  });

  it('returns empty array when skills directory does not exist', async () => {
    const deps = makeDeps({
      readdir: vi.fn().mockRejectedValue(new Error('ENOENT')),
    });

    const results = await listSkillSummaries(rulesDir, deps);
    expect(results).toEqual([]);
  });

  it('returns empty array for empty skills directory', async () => {
    const deps = makeDeps({
      readdir: vi.fn().mockResolvedValue([]),
    });

    const results = await listSkillSummaries(rulesDir, deps);
    expect(results).toEqual([]);
  });

  it('reads from skills subdirectory with withFileTypes option', async () => {
    const deps = makeDeps({
      readdir: vi.fn().mockResolvedValue([]),
    });

    await listSkillSummaries(rulesDir, deps);
    expect(deps.readdir).toHaveBeenCalledWith(path.join(rulesDir, 'skills'), {
      withFileTypes: true,
    });
  });
});

// ============================================================================
// loadSkill
// ============================================================================

describe('loadSkill', () => {
  const rulesDir = '/app/rules';

  it('loads a valid skill', async () => {
    const deps = makeDeps({
      readFile: vi.fn().mockResolvedValue(VALID_SKILL_MD),
    });

    const result = await loadSkill(rulesDir, 'test-skill', deps);
    expect(result.name).toBe('test-skill');
    expect(result.description).toBe('A test skill');
    expect(result.content).toContain('Test Skill');
    expect(result.path).toBe('skills/test-skill/SKILL.md');
  });

  it('throws on invalid name format - uppercase', async () => {
    const deps = makeDeps();
    await expect(loadSkill(rulesDir, 'InvalidName', deps)).rejects.toThrow(
      'Invalid skill name format: InvalidName',
    );
  });

  it('throws on invalid name format - spaces', async () => {
    const deps = makeDeps();
    await expect(loadSkill(rulesDir, 'bad name', deps)).rejects.toThrow(
      'Invalid skill name format: bad name',
    );
  });

  it('throws on invalid name format - special characters', async () => {
    const deps = makeDeps();
    await expect(loadSkill(rulesDir, 'bad_name!', deps)).rejects.toThrow(
      'Invalid skill name format: bad_name!',
    );
  });

  it('throws on empty name', async () => {
    const deps = makeDeps();
    await expect(loadSkill(rulesDir, '', deps)).rejects.toThrow(
      'Invalid skill name format: ',
    );
  });

  it('accepts valid hyphenated names', async () => {
    const deps = makeDeps({
      readFile: vi.fn().mockResolvedValue(VALID_SKILL_MD),
    });

    const result = await loadSkill(rulesDir, 'test-driven-development', deps);
    expect(result.name).toBe('test-skill');
  });

  it('accepts numeric names', async () => {
    const deps = makeDeps({
      readFile: vi.fn().mockResolvedValue(VALID_SKILL_MD),
    });

    const result = await loadSkill(rulesDir, '123', deps);
    expect(result.name).toBe('test-skill');
  });

  it('throws "Invalid skill" on schema validation failure', async () => {
    const deps = makeDeps({
      readFile: vi.fn().mockResolvedValue('not valid skill md'),
    });

    await expect(loadSkill(rulesDir, 'bad-skill', deps)).rejects.toThrow(
      'Invalid skill: bad-skill',
    );
  });

  it('throws "Skill not found" on read failure', async () => {
    const deps = makeDeps({
      readFile: vi.fn().mockRejectedValue(new Error('ENOENT')),
    });

    await expect(loadSkill(rulesDir, 'missing-skill', deps)).rejects.toThrow(
      'Skill not found: missing-skill',
    );
  });

  it('reads from correct path', async () => {
    const deps = makeDeps({
      readFile: vi.fn().mockResolvedValue(VALID_SKILL_MD),
    });

    await loadSkill(rulesDir, 'my-skill', deps);
    expect(deps.readFile).toHaveBeenCalledWith(
      path.join(rulesDir, 'skills/my-skill/SKILL.md'),
      'utf-8',
    );
  });

  it('performs security check on skill path', async () => {
    // A name like "../../etc" passes the regex check but isPathSafe should catch it
    // However, the regex /^[a-z0-9-]+$/ rejects paths with slashes and dots
    // So we verify that the regex is the first line of defense
    const deps = makeDeps();
    await expect(loadSkill(rulesDir, '../etc', deps)).rejects.toThrow(
      'Invalid skill name format',
    );
  });
});
