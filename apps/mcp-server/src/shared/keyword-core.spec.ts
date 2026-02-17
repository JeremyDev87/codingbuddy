import { describe, it, expect, vi } from 'vitest';
import { extractModeFromPrompt, getDefaultModeConfig, loadRulesForMode } from './keyword-core';
import type { KeywordModesConfig } from '../keyword/keyword.types';

// ============================================================================
// extractModeFromPrompt
// ============================================================================

describe('extractModeFromPrompt', () => {
  // --------------------------------------------------------------------------
  // English keyword extraction
  // --------------------------------------------------------------------------

  describe('English keywords', () => {
    it('extracts PLAN keyword and remaining prompt', () => {
      const result = extractModeFromPrompt('PLAN design auth feature', 'PLAN');

      expect(result.mode).toBe('PLAN');
      expect(result.originalPrompt).toBe('design auth feature');
      expect(result.warnings).toEqual([]);
    });

    it('extracts ACT keyword and remaining prompt', () => {
      const result = extractModeFromPrompt('ACT implement login', 'PLAN');

      expect(result.mode).toBe('ACT');
      expect(result.originalPrompt).toBe('implement login');
      expect(result.warnings).toEqual([]);
    });

    it('extracts EVAL keyword and remaining prompt', () => {
      const result = extractModeFromPrompt('EVAL review code quality', 'PLAN');

      expect(result.mode).toBe('EVAL');
      expect(result.originalPrompt).toBe('review code quality');
      expect(result.warnings).toEqual([]);
    });

    it('extracts AUTO keyword and remaining prompt', () => {
      const result = extractModeFromPrompt('AUTO build user dashboard', 'PLAN');

      expect(result.mode).toBe('AUTO');
      expect(result.originalPrompt).toBe('build user dashboard');
      expect(result.warnings).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // Case-insensitivity
  // --------------------------------------------------------------------------

  describe('case-insensitivity', () => {
    it('recognises lowercase "plan"', () => {
      const result = extractModeFromPrompt('plan do something', 'PLAN');

      expect(result.mode).toBe('PLAN');
      expect(result.originalPrompt).toBe('do something');
    });

    it('recognises mixed-case "Act"', () => {
      const result = extractModeFromPrompt('Act now', 'PLAN');

      expect(result.mode).toBe('ACT');
      expect(result.originalPrompt).toBe('now');
    });

    it('recognises mixed-case "eVaL"', () => {
      const result = extractModeFromPrompt('eVaL check tests', 'PLAN');

      expect(result.mode).toBe('EVAL');
      expect(result.originalPrompt).toBe('check tests');
    });

    it('recognises lowercase "auto"', () => {
      const result = extractModeFromPrompt('auto run everything', 'PLAN');

      expect(result.mode).toBe('AUTO');
      expect(result.originalPrompt).toBe('run everything');
    });
  });

  // --------------------------------------------------------------------------
  // Colon separator support
  // --------------------------------------------------------------------------

  describe('colon separator support', () => {
    it('handles "KEYWORD: task" (colon attached)', () => {
      const result = extractModeFromPrompt('PLAN: design feature', 'PLAN');

      expect(result.mode).toBe('PLAN');
      expect(result.originalPrompt).toBe('design feature');
    });

    it('handles "KEYWORD : task" (colon separated)', () => {
      const result = extractModeFromPrompt('ACT : implement it', 'PLAN');

      expect(result.mode).toBe('ACT');
      expect(result.originalPrompt).toBe('implement it');
    });

    it('handles full-width colon "KEYWORD\uff1a task" (CJK keyboards)', () => {
      const result = extractModeFromPrompt('EVAL\uff1a review code', 'PLAN');

      expect(result.mode).toBe('EVAL');
      expect(result.originalPrompt).toBe('review code');
    });
  });

  // --------------------------------------------------------------------------
  // Localized keyword support
  // --------------------------------------------------------------------------

  describe('localized keywords', () => {
    it('recognises Korean keyword \uacc4\ud68d (PLAN)', () => {
      const result = extractModeFromPrompt(
        '\uacc4\ud68d \uc778\uc99d \uae30\ub2a5 \uc124\uacc4',
        'PLAN',
      );

      expect(result.mode).toBe('PLAN');
      expect(result.originalPrompt).toBe('\uc778\uc99d \uae30\ub2a5 \uc124\uacc4');
    });

    it('recognises Japanese keyword \u5b9f\u884c (ACT)', () => {
      const result = extractModeFromPrompt(
        '\u5b9f\u884c \u30ed\u30b0\u30a4\u30f3\u5b9f\u88c5',
        'PLAN',
      );

      expect(result.mode).toBe('ACT');
      expect(result.originalPrompt).toBe('\u30ed\u30b0\u30a4\u30f3\u5b9f\u88c5');
    });

    it('recognises Chinese keyword \u8bc4\u4f30 (EVAL)', () => {
      const result = extractModeFromPrompt('\u8bc4\u4f30 \u4ee3\u7801\u8d28\u91cf', 'PLAN');

      expect(result.mode).toBe('EVAL');
      expect(result.originalPrompt).toBe('\u4ee3\u7801\u8d28\u91cf');
    });

    it('recognises Spanish keyword PLANIFICAR (case-insensitive)', () => {
      const result = extractModeFromPrompt('PLANIFICAR algo nuevo', 'PLAN');

      expect(result.mode).toBe('PLAN');
      expect(result.originalPrompt).toBe('algo nuevo');
    });
  });

  // --------------------------------------------------------------------------
  // Multiple keyword warning
  // --------------------------------------------------------------------------

  describe('multiple keyword warning', () => {
    it('warns when a second English keyword follows the first', () => {
      const result = extractModeFromPrompt('PLAN ACT something', 'PLAN');

      expect(result.mode).toBe('PLAN');
      expect(result.originalPrompt).toBe('ACT something');
      expect(result.warnings).toContain('Multiple keywords found, using first');
    });

    it('warns when a localized keyword follows an English keyword', () => {
      const result = extractModeFromPrompt('PLAN \uacc4\ud68d something', 'PLAN');

      expect(result.mode).toBe('PLAN');
      expect(result.warnings).toContain('Multiple keywords found, using first');
    });

    it('does not warn when only a single keyword is present', () => {
      const result = extractModeFromPrompt('PLAN do work', 'PLAN');

      expect(result.warnings).not.toContain('Multiple keywords found, using first');
    });
  });

  // --------------------------------------------------------------------------
  // Empty content warning
  // --------------------------------------------------------------------------

  describe('empty content warning', () => {
    it('warns when prompt has only a keyword with no content', () => {
      const result = extractModeFromPrompt('PLAN', 'PLAN');

      expect(result.mode).toBe('PLAN');
      expect(result.originalPrompt).toBe('');
      expect(result.warnings).toContain('No prompt content after keyword');
    });

    it('warns when keyword is followed by only whitespace', () => {
      const result = extractModeFromPrompt('ACT   ', 'PLAN');

      expect(result.mode).toBe('ACT');
      expect(result.originalPrompt).toBe('');
      expect(result.warnings).toContain('No prompt content after keyword');
    });

    it('does not warn when content follows the keyword', () => {
      const result = extractModeFromPrompt('EVAL check it', 'PLAN');

      expect(result.warnings).not.toContain('No prompt content after keyword');
    });
  });

  // --------------------------------------------------------------------------
  // No keyword — default behaviour
  // --------------------------------------------------------------------------

  describe('no keyword (default mode)', () => {
    it('falls back to defaultMode and warns', () => {
      const result = extractModeFromPrompt('just do some refactoring', 'PLAN');

      expect(result.mode).toBe('PLAN');
      expect(result.originalPrompt).toBe('just do some refactoring');
      expect(result.warnings).toContain('No keyword found, defaulting to PLAN');
    });

    it('respects a non-PLAN defaultMode', () => {
      const result = extractModeFromPrompt('hello world', 'ACT');

      expect(result.mode).toBe('ACT');
      expect(result.originalPrompt).toBe('hello world');
      expect(result.warnings).toContain('No keyword found, defaulting to PLAN');
    });

    it('falls back for an empty prompt', () => {
      const result = extractModeFromPrompt('', 'PLAN');

      expect(result.mode).toBe('PLAN');
      expect(result.originalPrompt).toBe('');
      expect(result.warnings).toContain('No keyword found, defaulting to PLAN');
    });

    it('falls back for whitespace-only prompt', () => {
      const result = extractModeFromPrompt('   ', 'PLAN');

      expect(result.mode).toBe('PLAN');
      expect(result.originalPrompt).toBe('');
      expect(result.warnings).toContain('No keyword found, defaulting to PLAN');
    });
  });

  // --------------------------------------------------------------------------
  // Whitespace handling
  // --------------------------------------------------------------------------

  describe('whitespace handling', () => {
    it('trims leading and trailing whitespace from prompt', () => {
      const result = extractModeFromPrompt('  PLAN  build it  ', 'PLAN');

      expect(result.mode).toBe('PLAN');
      expect(result.originalPrompt).toBe('build it');
    });

    it('handles multiple spaces between keyword and content', () => {
      const result = extractModeFromPrompt('ACT    do stuff', 'PLAN');

      expect(result.mode).toBe('ACT');
      expect(result.originalPrompt).toBe('do stuff');
    });
  });

  // --------------------------------------------------------------------------
  // Combined warnings
  // --------------------------------------------------------------------------

  describe('combined warnings', () => {
    it('can produce both multiple-keyword and empty-content warnings', () => {
      // "PLAN ACT" — second word is keyword AND originalPrompt after
      // removing "ACT" is not empty (it contains "ACT"), so only
      // multiple-keyword warning applies.
      const result = extractModeFromPrompt('PLAN ACT', 'PLAN');

      expect(result.mode).toBe('PLAN');
      expect(result.warnings).toContain('Multiple keywords found, using first');
      // originalPrompt is "ACT" which is not empty
      expect(result.originalPrompt).toBe('ACT');
    });
  });
});

// ============================================================================
// getDefaultModeConfig
// ============================================================================

describe('getDefaultModeConfig', () => {
  it('returns a config with all four modes', () => {
    const config = getDefaultModeConfig();

    expect(config.modes).toHaveProperty('PLAN');
    expect(config.modes).toHaveProperty('ACT');
    expect(config.modes).toHaveProperty('EVAL');
    expect(config.modes).toHaveProperty('AUTO');
  });

  it('sets PLAN as the default mode', () => {
    const config = getDefaultModeConfig();

    expect(config.defaultMode).toBe('PLAN');
  });

  it('includes description, instructions, and rules for every mode', () => {
    const config = getDefaultModeConfig();

    for (const mode of ['PLAN', 'ACT', 'EVAL', 'AUTO'] as const) {
      const modeConfig = config.modes[mode];
      expect(typeof modeConfig.description).toBe('string');
      expect(modeConfig.description.length).toBeGreaterThan(0);
      expect(typeof modeConfig.instructions).toBe('string');
      expect(modeConfig.instructions.length).toBeGreaterThan(0);
      expect(Array.isArray(modeConfig.rules)).toBe(true);
      expect(modeConfig.rules.length).toBeGreaterThan(0);
    }
  });

  it('includes rules/core.md in every mode', () => {
    const config = getDefaultModeConfig();

    for (const mode of ['PLAN', 'ACT', 'EVAL', 'AUTO'] as const) {
      expect(config.modes[mode].rules).toContain('rules/core.md');
    }
  });

  it('includes rules/project.md only in ACT and AUTO modes', () => {
    const config = getDefaultModeConfig();

    expect(config.modes.PLAN.rules).not.toContain('rules/project.md');
    expect(config.modes.ACT.rules).toContain('rules/project.md');
    expect(config.modes.EVAL.rules).not.toContain('rules/project.md');
    expect(config.modes.AUTO.rules).toContain('rules/project.md');
  });

  it('includes rules/augmented-coding.md in every mode', () => {
    const config = getDefaultModeConfig();

    for (const mode of ['PLAN', 'ACT', 'EVAL', 'AUTO'] as const) {
      expect(config.modes[mode].rules).toContain('rules/augmented-coding.md');
    }
  });

  it('returns a fresh object on each call (no shared references)', () => {
    const a = getDefaultModeConfig();
    const b = getDefaultModeConfig();

    expect(a).toEqual(b);
    expect(a).not.toBe(b);
    expect(a.modes).not.toBe(b.modes);
    expect(a.modes.PLAN).not.toBe(b.modes.PLAN);
    expect(a.modes.PLAN.rules).not.toBe(b.modes.PLAN.rules);
  });

  it('does not include optional service-level fields like agent or delegates_to', () => {
    const config = getDefaultModeConfig();

    for (const mode of ['PLAN', 'ACT', 'EVAL', 'AUTO'] as const) {
      expect(config.modes[mode]).not.toHaveProperty('agent');
      expect(config.modes[mode]).not.toHaveProperty('delegates_to');
      expect(config.modes[mode]).not.toHaveProperty('defaultSpecialists');
    }
  });
});

// ============================================================================
// loadRulesForMode
// ============================================================================

describe('loadRulesForMode', () => {
  const config: KeywordModesConfig = {
    modes: {
      PLAN: {
        description: 'Plan',
        instructions: 'Plan instructions',
        rules: ['rules/core.md', 'rules/augmented-coding.md'],
      },
      ACT: {
        description: 'Act',
        instructions: 'Act instructions',
        rules: ['rules/core.md', 'rules/project.md', 'rules/augmented-coding.md'],
      },
      EVAL: {
        description: 'Eval',
        instructions: 'Eval instructions',
        rules: ['rules/core.md', 'rules/augmented-coding.md'],
      },
      AUTO: {
        description: 'Auto',
        instructions: 'Auto instructions',
        rules: ['rules/core.md', 'rules/project.md', 'rules/augmented-coding.md'],
      },
    },
    defaultMode: 'PLAN',
  };

  it('loads all rules successfully for PLAN mode', async () => {
    const readRuleFn = vi.fn().mockImplementation((path: string) => {
      return Promise.resolve(`content of ${path}`);
    });

    const rules = await loadRulesForMode('PLAN', config, readRuleFn);

    expect(rules).toEqual([
      { name: 'rules/core.md', content: 'content of rules/core.md' },
      {
        name: 'rules/augmented-coding.md',
        content: 'content of rules/augmented-coding.md',
      },
    ]);
    expect(readRuleFn).toHaveBeenCalledTimes(2);
    expect(readRuleFn).toHaveBeenCalledWith('rules/core.md');
    expect(readRuleFn).toHaveBeenCalledWith('rules/augmented-coding.md');
  });

  it('loads all rules successfully for ACT mode (3 rules)', async () => {
    const readRuleFn = vi
      .fn()
      .mockImplementation((path: string) => Promise.resolve(`content of ${path}`));

    const rules = await loadRulesForMode('ACT', config, readRuleFn);

    expect(rules).toHaveLength(3);
    expect(rules.map(r => r.name)).toEqual([
      'rules/core.md',
      'rules/project.md',
      'rules/augmented-coding.md',
    ]);
    expect(readRuleFn).toHaveBeenCalledTimes(3);
  });

  it('skips rules that fail to load', async () => {
    const readRuleFn = vi.fn().mockImplementation((path: string) => {
      if (path === 'rules/core.md') {
        return Promise.reject(new Error('File not found'));
      }
      return Promise.resolve(`content of ${path}`);
    });

    const rules = await loadRulesForMode('PLAN', config, readRuleFn);

    expect(rules).toEqual([
      {
        name: 'rules/augmented-coding.md',
        content: 'content of rules/augmented-coding.md',
      },
    ]);
  });

  it('returns empty array when all rules fail to load', async () => {
    const readRuleFn = vi.fn().mockRejectedValue(new Error('Read error'));

    const rules = await loadRulesForMode('PLAN', config, readRuleFn);

    expect(rules).toEqual([]);
    expect(readRuleFn).toHaveBeenCalledTimes(2);
  });

  it('handles mixed success and failure across rules', async () => {
    const readRuleFn = vi.fn().mockImplementation((path: string) => {
      if (path === 'rules/project.md') {
        return Promise.reject(new Error('Permission denied'));
      }
      return Promise.resolve(`content of ${path}`);
    });

    const rules = await loadRulesForMode('ACT', config, readRuleFn);

    expect(rules).toHaveLength(2);
    expect(rules.map(r => r.name)).toEqual(['rules/core.md', 'rules/augmented-coding.md']);
  });

  it('calls readRuleFn with the exact paths from config', async () => {
    const readRuleFn = vi
      .fn()
      .mockImplementation((path: string) => Promise.resolve(`content of ${path}`));

    await loadRulesForMode('AUTO', config, readRuleFn);

    expect(readRuleFn).toHaveBeenCalledWith('rules/core.md');
    expect(readRuleFn).toHaveBeenCalledWith('rules/project.md');
    expect(readRuleFn).toHaveBeenCalledWith('rules/augmented-coding.md');
  });

  it('returns empty array for a mode with no rules', async () => {
    const emptyConfig: KeywordModesConfig = {
      modes: {
        PLAN: {
          description: 'Plan',
          instructions: 'Plan',
          rules: [],
        },
        ACT: {
          description: 'Act',
          instructions: 'Act',
          rules: [],
        },
        EVAL: {
          description: 'Eval',
          instructions: 'Eval',
          rules: [],
        },
        AUTO: {
          description: 'Auto',
          instructions: 'Auto',
          rules: [],
        },
      },
      defaultMode: 'PLAN',
    };

    const readRuleFn = vi.fn();

    const rules = await loadRulesForMode('PLAN', emptyConfig, readRuleFn);

    expect(rules).toEqual([]);
    expect(readRuleFn).not.toHaveBeenCalled();
  });

  it('preserves order of successfully loaded rules', async () => {
    const readRuleFn = vi.fn().mockImplementation((path: string) => {
      // Simulate varying response times — order should still match config
      const delay = path.includes('project') ? 50 : 0;
      return new Promise<string>(resolve => setTimeout(() => resolve(`content of ${path}`), delay));
    });

    const rules = await loadRulesForMode('ACT', config, readRuleFn);

    // Sequential loading preserves declaration order
    expect(rules.map(r => r.name)).toEqual([
      'rules/core.md',
      'rules/project.md',
      'rules/augmented-coding.md',
    ]);
  });
});
