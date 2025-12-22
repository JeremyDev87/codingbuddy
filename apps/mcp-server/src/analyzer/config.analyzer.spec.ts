import { describe, it, expect } from 'vitest';
import {
  parseTsConfig,
  parseEslintConfig,
  parsePrettierConfig,
  detectConfigFiles,
  CONFIG_FILE_PATTERNS,
} from './config.analyzer';

describe('config.analyzer', () => {
  describe('CONFIG_FILE_PATTERNS', () => {
    it('should have patterns for major config types', () => {
      expect(CONFIG_FILE_PATTERNS.typescript).toContain('tsconfig.json');
      expect(CONFIG_FILE_PATTERNS.eslint).toContain('.eslintrc.json');
      expect(CONFIG_FILE_PATTERNS.prettier).toContain('.prettierrc');
    });
  });

  describe('parseTsConfig', () => {
    it('should parse basic tsconfig.json', () => {
      const content = JSON.stringify({
        compilerOptions: {
          strict: true,
          target: 'ES2020',
          module: 'ESNext',
        },
      });

      const result = parseTsConfig(content, 'tsconfig.json');

      expect(result).not.toBeNull();
      expect(result!.path).toBe('tsconfig.json');
      expect(result!.strict).toBe(true);
      expect(result!.target).toBe('ES2020');
      expect(result!.module).toBe('ESNext');
      expect(result!.hasPathAliases).toBe(false);
    });

    it('should detect path aliases', () => {
      const content = JSON.stringify({
        compilerOptions: {
          paths: {
            '@/*': ['./src/*'],
          },
        },
      });

      const result = parseTsConfig(content, 'tsconfig.json');

      expect(result).not.toBeNull();
      expect(result!.hasPathAliases).toBe(true);
    });

    it('should handle missing compilerOptions', () => {
      const content = JSON.stringify({});

      const result = parseTsConfig(content, 'tsconfig.json');

      expect(result).not.toBeNull();
      expect(result!.strict).toBeUndefined();
      expect(result!.hasPathAliases).toBe(false);
    });

    it('should return null for invalid JSON', () => {
      const result = parseTsConfig('invalid', 'tsconfig.json');

      expect(result).toBeNull();
    });
  });

  describe('parseEslintConfig', () => {
    it('should parse legacy eslintrc format', () => {
      const content = JSON.stringify({
        extends: [
          'eslint:recommended',
          'plugin:@typescript-eslint/recommended',
        ],
        plugins: ['@typescript-eslint'],
      });

      const result = parseEslintConfig(content, '.eslintrc.json', 'legacy');

      expect(result).not.toBeNull();
      expect(result!.path).toBe('.eslintrc.json');
      expect(result!.format).toBe('legacy');
      expect(result!.extends).toContain('eslint:recommended');
      expect(result!.plugins).toContain('@typescript-eslint');
    });

    it('should handle eslint config without extends or plugins', () => {
      const content = JSON.stringify({
        rules: {
          'no-console': 'warn',
        },
      });

      const result = parseEslintConfig(content, '.eslintrc.json', 'legacy');

      expect(result).not.toBeNull();
      expect(result!.extends).toBeUndefined();
      expect(result!.plugins).toBeUndefined();
    });

    it('should return null for invalid JSON', () => {
      const result = parseEslintConfig('invalid', '.eslintrc.json', 'legacy');

      expect(result).toBeNull();
    });
  });

  describe('parsePrettierConfig', () => {
    it('should parse prettier config', () => {
      const content = JSON.stringify({
        tabWidth: 2,
        semi: true,
        singleQuote: true,
        trailingComma: 'all',
      });

      const result = parsePrettierConfig(content, '.prettierrc');

      expect(result).not.toBeNull();
      expect(result!.path).toBe('.prettierrc');
      expect(result!.tabWidth).toBe(2);
      expect(result!.semi).toBe(true);
      expect(result!.singleQuote).toBe(true);
      expect(result!.trailingComma).toBe('all');
    });

    it('should handle partial config', () => {
      const content = JSON.stringify({
        semi: false,
      });

      const result = parsePrettierConfig(content, '.prettierrc');

      expect(result).not.toBeNull();
      expect(result!.semi).toBe(false);
      expect(result!.tabWidth).toBeUndefined();
      expect(result!.singleQuote).toBeUndefined();
    });

    it('should return null for invalid JSON', () => {
      const result = parsePrettierConfig('invalid', '.prettierrc');

      expect(result).toBeNull();
    });
  });

  describe('detectConfigFiles', () => {
    it('should detect TypeScript config files', () => {
      const files = ['tsconfig.json', 'src/index.ts', 'package.json'];

      const result = detectConfigFiles(files);

      expect(result).toContain('tsconfig.json');
    });

    it('should detect ESLint config files (legacy)', () => {
      const files = ['.eslintrc.json', 'src/index.ts'];

      const result = detectConfigFiles(files);

      expect(result).toContain('.eslintrc.json');
    });

    it('should detect ESLint config files (flat)', () => {
      const files = ['eslint.config.js', 'src/index.ts'];

      const result = detectConfigFiles(files);

      expect(result).toContain('eslint.config.js');
    });

    it('should detect Prettier config files', () => {
      const files = ['.prettierrc', 'src/index.ts'];

      const result = detectConfigFiles(files);

      expect(result).toContain('.prettierrc');
    });

    it('should detect multiple config files', () => {
      const files = [
        'tsconfig.json',
        '.eslintrc.json',
        '.prettierrc',
        'vite.config.ts',
        'tailwind.config.js',
      ];

      const result = detectConfigFiles(files);

      expect(result).toHaveLength(5);
    });

    it('should return empty array when no config files found', () => {
      const files = ['src/index.ts', 'src/app.ts'];

      const result = detectConfigFiles(files);

      expect(result).toEqual([]);
    });
  });
});
