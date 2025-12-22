import {
  KEYWORDS,
  type Mode,
  type RuleContent,
  type ParseModeResult,
  type KeywordModesConfig,
} from './keyword.types';

const DEFAULT_CONFIG: KeywordModesConfig = {
  modes: {
    PLAN: {
      description: 'Task planning and design phase',
      instructions:
        'Design first approach. Define test cases from TDD perspective. Review architecture before implementation.',
      rules: ['rules/core.md', 'rules/augmented-coding.md'],
    },
    ACT: {
      description: 'Actual task execution phase',
      instructions:
        'Follow Red-Green-Refactor cycle. Implement minimally then improve incrementally. Verify quality standards.',
      rules: ['rules/core.md', 'rules/project.md', 'rules/augmented-coding.md'],
    },
    EVAL: {
      description: 'Result review and assessment phase',
      instructions:
        'Review code quality. Verify SOLID principles. Check test coverage. Suggest improvements.',
      rules: ['rules/core.md', 'rules/augmented-coding.md'],
    },
  },
  defaultMode: 'PLAN',
};

export class KeywordService {
  private configCache: KeywordModesConfig | null = null;

  constructor(
    private readonly loadConfigFn: () => Promise<KeywordModesConfig>,
    private readonly loadRuleFn: (path: string) => Promise<string>,
  ) {}

  async parseMode(prompt: string): Promise<ParseModeResult> {
    const config = await this.loadModeConfig();
    const warnings: string[] = [];

    const trimmed = prompt.trim();
    const parts = trimmed.split(/\s+/);
    const firstWord = parts[0]?.toUpperCase() ?? '';

    let mode: Mode;
    let originalPrompt: string;

    const isKeyword = KEYWORDS.includes(firstWord as Mode);

    if (isKeyword) {
      mode = firstWord as Mode;
      originalPrompt = trimmed.slice(parts[0].length).trim();

      // Check for multiple keywords
      if (parts.length > 1) {
        const secondWord = parts[1].toUpperCase();
        if (KEYWORDS.includes(secondWord as Mode)) {
          warnings.push('Multiple keywords found, using first');
        }
      }

      // Check for empty content after keyword
      if (originalPrompt === '') {
        warnings.push('No prompt content after keyword');
      }
    } else {
      mode = config.defaultMode;
      originalPrompt = trimmed;
      warnings.push('No keyword found, defaulting to PLAN');
    }

    const modeConfig = config.modes[mode];
    const rules = await this.getRulesForMode(mode);

    return {
      mode,
      originalPrompt,
      instructions: modeConfig.instructions,
      rules,
      ...(warnings.length > 0 ? { warnings } : {}),
    };
  }

  async loadModeConfig(): Promise<KeywordModesConfig> {
    if (this.configCache) {
      return this.configCache;
    }

    try {
      this.configCache = await this.loadConfigFn();
      return this.configCache;
    } catch {
      this.configCache = DEFAULT_CONFIG;
      return DEFAULT_CONFIG;
    }
  }

  async getRulesForMode(mode: Mode): Promise<RuleContent[]> {
    const config = await this.loadModeConfig();
    const modeConfig = config.modes[mode];
    const rules: RuleContent[] = [];

    for (const rulePath of modeConfig.rules) {
      try {
        const content = await this.loadRuleFn(rulePath);
        rules.push({ name: rulePath, content });
      } catch {
        // Skip missing files
      }
    }

    return rules;
  }
}
