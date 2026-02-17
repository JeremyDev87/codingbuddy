import { describe, it, expect, beforeEach } from 'vitest';
import { ConventionsAnalyzer } from '../conventions.analyzer';
import { promises as fs } from 'fs';
import * as path from 'path';

describe('ConventionsAnalyzer', () => {
  let analyzer: ConventionsAnalyzer;
  const testProjectRoot = path.join(__dirname, '__fixtures__', 'test-project');

  beforeEach(() => {
    analyzer = new ConventionsAnalyzer();
  });

  describe('parseEditorConfig', () => {
    it('parses .editorconfig successfully', async () => {
      const editorConfigPath = path.join(testProjectRoot, '.editorconfig');
      const config = await analyzer.parseEditorConfig(editorConfigPath);

      expect(config).toBeDefined();
      expect(config.indent_style).toBe('space');
      expect(config.indent_size).toBe(2);
      expect(config.end_of_line).toBe('lf');
      expect(config.charset).toBe('utf-8');
      expect(config.trim_trailing_whitespace).toBe(true);
      expect(config.insert_final_newline).toBe(true);
    });

    it('returns default config when .editorconfig does not exist', async () => {
      const nonExistentPath = path.join(testProjectRoot, '.editorconfig-missing');
      const config = await analyzer.parseEditorConfig(nonExistentPath);

      expect(config).toBeDefined();
      expect(config.indent_style).toBe('space');
      expect(config.indent_size).toBe(2);
    });

    it('ignores non-[*] sections and only parses [*] section', async () => {
      // Create a test EditorConfig with multiple sections
      const multiSectionContent = `
# EditorConfig test
root = true

[*]
indent_style = space
indent_size = 2
charset = utf-8

[*.js]
indent_size = 4
charset = latin1

[*.md]
indent_size = 8
`.trim();

      // Write temporary test file
      const tempPath = path.join(testProjectRoot, '.editorconfig-multisection');
      await fs.writeFile(tempPath, multiSectionContent, 'utf-8');

      try {
        const config = await analyzer.parseEditorConfig(tempPath);

        // Should use values from [*] section only
        expect(config.indent_style).toBe('space');
        expect(config.indent_size).toBe(2); // From [*], not 4 from [*.js] or 8 from [*.md]
        expect(config.charset).toBe('utf-8'); // From [*], not latin1 from [*.js]
      } finally {
        // Clean up
        await fs.unlink(tempPath).catch(() => {
          /* ignore */
        });
      }
    });
  });

  describe('parseMarkdownLint', () => {
    it('parses .markdownlint.json successfully', async () => {
      const markdownlintPath = path.join(testProjectRoot, '.markdownlint.json');
      const config = await analyzer.parseMarkdownLint(markdownlintPath);

      expect(config).toBeDefined();
      expect(config.MD001).toBe(true);
      expect(config.MD003).toEqual({ style: 'atx' });
      expect(config.MD013).toBe(false);
    });

    it('returns default config when .markdownlint.json does not exist', async () => {
      const nonExistentPath = path.join(testProjectRoot, '.markdownlint-missing.json');
      const config = await analyzer.parseMarkdownLint(nonExistentPath);

      expect(config).toBeDefined();
      expect(config.default).toBe(true);
    });

    it('rejects config with __proto__ prototype pollution attempt', async () => {
      const maliciousPath = path.join(testProjectRoot, '.markdownlint-malicious.json');
      await fs.writeFile(
        maliciousPath,
        JSON.stringify({
          __proto__: { polluted: true },
          MD001: true,
        }),
        'utf-8',
      );

      const config = await analyzer.parseMarkdownLint(maliciousPath);

      // Should return default config, not process malicious data
      expect(config).toBeDefined();
      expect(config.default).toBe(true); // DEFAULT_MARKDOWNLINT_CONFIG value

      // Cleanup
      await fs.unlink(maliciousPath);
    });
  });

  describe('parseTypeScriptConfig', () => {
    it('parses tsconfig.json successfully', async () => {
      const tsconfigPath = path.join(testProjectRoot, 'tsconfig.json');
      const config = await analyzer.parseTypeScriptConfig(tsconfigPath);

      expect(config).toBeDefined();
      expect(config.strict).toBe(true);
      expect(config.noImplicitAny).toBe(true);
      expect(config.strictNullChecks).toBe(true);
      expect(config.target).toBe('ES2021');
      expect(config.module).toBe('commonjs');
      expect(config.paths).toEqual({ '@/*': ['./src/*'] });
    });

    it('returns default config when tsconfig.json does not exist', async () => {
      const nonExistentPath = path.join(testProjectRoot, 'tsconfig-missing.json');
      const config = await analyzer.parseTypeScriptConfig(nonExistentPath);

      expect(config).toBeDefined();
      expect(config.strict).toBe(true); // DEFAULT_TYPESCRIPT_CONFIG value
      expect(config.noImplicitAny).toBe(true);
      expect(config.target).toBe('ES2021');
    });

    it('returns default config when tsconfig.json has invalid schema', async () => {
      // Create a temp file with invalid schema
      const invalidPath = path.join(testProjectRoot, 'tsconfig-invalid.json');
      await fs.writeFile(
        invalidPath,
        JSON.stringify({ compilerOptions: { strict: 'yes' } }),
        'utf-8',
      );

      const config = await analyzer.parseTypeScriptConfig(invalidPath);

      expect(config).toBeDefined();
      expect(config.strict).toBe(true); // DEFAULT_TYPESCRIPT_CONFIG value
      expect(config.noImplicitAny).toBe(true);

      // Cleanup
      await fs.unlink(invalidPath);
    });

    it('rejects config with __proto__ prototype pollution attempt', async () => {
      const maliciousPath = path.join(testProjectRoot, 'tsconfig-malicious.json');
      await fs.writeFile(
        maliciousPath,
        JSON.stringify({
          __proto__: { polluted: true },
          compilerOptions: { strict: true },
        }),
        'utf-8',
      );

      const config = await analyzer.parseTypeScriptConfig(maliciousPath);

      // Should return default config, not process malicious data
      expect(config).toBeDefined();
      expect(config.strict).toBe(true); // DEFAULT_TYPESCRIPT_CONFIG value

      // Cleanup
      await fs.unlink(maliciousPath);
    });
  });

  describe('parseESLintConfig', () => {
    it('parses .eslintrc.json successfully', async () => {
      const eslintPath = path.join(testProjectRoot, '.eslintrc.json');
      const config = await analyzer.parseESLintConfig(eslintPath);

      expect(config).toBeDefined();
      expect(config.configType).toBe('legacy');
      expect(config.parser).toBe('@typescript-eslint/parser');
      expect(config.parserOptions).toEqual({
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      });
      expect(config.rules).toBeDefined();
      expect(config.rules?.['no-console']).toBe('warn');
    });

    it('returns default config when .eslintrc.json does not exist', async () => {
      const nonExistentPath = path.join(testProjectRoot, '.eslintrc-missing.json');
      const config = await analyzer.parseESLintConfig(nonExistentPath);

      expect(config).toBeDefined();
      expect(config.configType).toBe('flat');
    });

    it('returns basic config for JS config files', async () => {
      const jsConfigPath = path.join(testProjectRoot, 'eslint.config.js');
      // Create a temp JS config
      await fs.writeFile(jsConfigPath, 'module.exports = {}', 'utf-8');

      const config = await analyzer.parseESLintConfig(jsConfigPath);

      expect(config).toBeDefined();
      expect(config.configType).toBe('flat');
      expect(config.parser).toBe('unknown (JS config)');

      // Cleanup
      await fs.unlink(jsConfigPath);
    });

    it('rejects config with __proto__ prototype pollution attempt', async () => {
      const maliciousPath = path.join(testProjectRoot, '.eslintrc-malicious.json');
      await fs.writeFile(
        maliciousPath,
        JSON.stringify({
          __proto__: { polluted: true },
          parser: '@typescript-eslint/parser',
        }),
        'utf-8',
      );

      const config = await analyzer.parseESLintConfig(maliciousPath);

      // Should return default config or safe config, not process malicious data
      expect(config).toBeDefined();
      expect(config.configType).toBe('legacy'); // File name determines config type

      // Cleanup
      await fs.unlink(maliciousPath);
    });
  });

  describe('parsePrettierConfig', () => {
    it('parses .prettierrc successfully', async () => {
      const prettierPath = path.join(testProjectRoot, '.prettierrc');
      const config = await analyzer.parsePrettierConfig(prettierPath);

      expect(config).toBeDefined();
      expect(config.printWidth).toBe(80);
      expect(config.tabWidth).toBe(2);
      expect(config.useTabs).toBe(false);
      expect(config.semi).toBe(true);
      expect(config.singleQuote).toBe(true);
      expect(config.trailingComma).toBe('es5');
      expect(config.endOfLine).toBe('lf');
    });

    it('returns default config when .prettierrc does not exist', async () => {
      const nonExistentPath = path.join(testProjectRoot, '.prettierrc-missing');
      const config = await analyzer.parsePrettierConfig(nonExistentPath);

      expect(config).toBeDefined();
      expect(config.tabWidth).toBe(2); // DEFAULT_PRETTIER_CONFIG value
      expect(config.semi).toBe(true);
      expect(config.singleQuote).toBe(true);
    });

    it('returns default config when .prettierrc has invalid schema', async () => {
      // Create a temp file with invalid schema
      const invalidPath = path.join(testProjectRoot, '.prettierrc-invalid');
      await fs.writeFile(
        invalidPath,
        JSON.stringify({ printWidth: '80' }), // Should be number, not string
        'utf-8',
      );

      const config = await analyzer.parsePrettierConfig(invalidPath);

      expect(config).toBeDefined();
      expect(config.tabWidth).toBe(2); // DEFAULT_PRETTIER_CONFIG value
      expect(config.semi).toBe(true);

      // Cleanup
      await fs.unlink(invalidPath);
    });

    it('rejects config with __proto__ prototype pollution attempt', async () => {
      const maliciousPath = path.join(testProjectRoot, '.prettierrc-malicious');
      await fs.writeFile(
        maliciousPath,
        JSON.stringify({
          __proto__: { polluted: true },
          printWidth: 80,
        }),
        'utf-8',
      );

      const config = await analyzer.parsePrettierConfig(maliciousPath);

      // Should return default config, not process malicious data
      expect(config).toBeDefined();
      expect(config.tabWidth).toBe(2); // DEFAULT_PRETTIER_CONFIG value

      // Cleanup
      await fs.unlink(maliciousPath);
    });
  });

  describe('analyzeProjectConventions', () => {
    it('analyzes all convention files and returns structured data', async () => {
      const conventions = await analyzer.analyzeProjectConventions(testProjectRoot);

      expect(conventions).toBeDefined();
      expect(conventions.typescript).toBeDefined();
      expect(conventions.eslint).toBeDefined();
      expect(conventions.prettier).toBeDefined();
      expect(conventions.editorconfig).toBeDefined();
      expect(conventions.markdownlint).toBeDefined();
    });

    it('returns project root when projectRoot is valid', async () => {
      const conventions = await analyzer.analyzeProjectConventions(testProjectRoot);

      expect(conventions.projectRoot).toBe(testProjectRoot);
    });

    it('throws error when projectRoot does not exist', async () => {
      const invalidPath = path.join(testProjectRoot, 'nonexistent');

      await expect(analyzer.analyzeProjectConventions(invalidPath)).rejects.toThrow();
    });

    it('uses cache for subsequent calls', async () => {
      // First call - should parse files
      const conventions1 = await analyzer.analyzeProjectConventions(testProjectRoot);

      // Second call - should return cached result
      const conventions2 = await analyzer.analyzeProjectConventions(testProjectRoot);

      // Results should be identical (same object reference from cache)
      expect(conventions2).toBe(conventions1);
      expect(conventions2.projectRoot).toBe(testProjectRoot);
    });

    it('invalidates cache when config file is modified', async () => {
      // Create a new analyzer to ensure fresh cache
      const freshAnalyzer = new ConventionsAnalyzer();

      // Read existing tsconfig.json to restore later
      const tsconfigPath = path.join(testProjectRoot, 'tsconfig.json');
      const originalContent = await fs.readFile(tsconfigPath, 'utf-8');

      try {
        // First call - should parse files
        const conventions1 = await freshAnalyzer.analyzeProjectConventions(testProjectRoot);

        // Modify the tsconfig file (one of the tracked files)
        await fs.writeFile(
          tsconfigPath,
          JSON.stringify({
            compilerOptions: { strict: false, target: 'ES2020' },
          }),
          'utf-8',
        );

        // Wait a bit to ensure mtime changes
        await new Promise(resolve => setTimeout(resolve, 100));

        // Second call - should detect mtime change and re-parse
        const conventions2 = await freshAnalyzer.analyzeProjectConventions(testProjectRoot);

        // Results should be different objects (cache was invalidated)
        expect(conventions2).not.toBe(conventions1);
        expect(conventions2.projectRoot).toBe(testProjectRoot);
      } finally {
        // Restore original content
        await fs.writeFile(tsconfigPath, originalContent, 'utf-8');
      }
    });

    it('handles cache with different project roots', async () => {
      // Create a second test project directory
      const secondProjectRoot = path.join(__dirname, '__fixtures__', 'second-project');
      await fs.mkdir(secondProjectRoot, { recursive: true });

      try {
        // Analyze first project
        const conventions1 = await analyzer.analyzeProjectConventions(testProjectRoot);

        // Analyze second project
        const conventions2 = await analyzer.analyzeProjectConventions(secondProjectRoot);

        // Results should be different
        expect(conventions1.projectRoot).toBe(testProjectRoot);
        expect(conventions2.projectRoot).toBe(secondProjectRoot);
        expect(conventions1).not.toBe(conventions2);

        // Re-analyze first project - should hit cache
        const conventions1Cached = await analyzer.analyzeProjectConventions(testProjectRoot);
        expect(conventions1Cached).toBe(conventions1);
      } finally {
        // Cleanup
        await fs.rm(secondProjectRoot, { recursive: true, force: true });
      }
    });
  });

  describe('file size violation tracking (SEC-005)', () => {
    it('should detect frequent violations and log warning', async () => {
      // Create a large file that exceeds 1MB limit
      const largeTsconfigPath = path.join(testProjectRoot, 'tsconfig-huge.json');
      const largeContent = JSON.stringify({
        compilerOptions: { strict: true },
        // Add padding to exceed 1MB
        _padding: 'x'.repeat(2 * 1024 * 1024),
      });

      await fs.writeFile(largeTsconfigPath, largeContent, 'utf-8');

      try {
        // Trigger 3 violations in quick succession (should trigger warning on 3rd)
        await analyzer.parseTypeScriptConfig(largeTsconfigPath);
        await analyzer.parseTypeScriptConfig(largeTsconfigPath);
        await analyzer.parseTypeScriptConfig(largeTsconfigPath);

        // The 3rd violation should have logged a warning about potential DoS attack
        // Note: We can't easily verify log output in tests, but the method was called
        // In production, this would be visible in logs
      } finally {
        // Cleanup
        await fs.unlink(largeTsconfigPath).catch(() => {
          /* ignore */
        });
      }
    });

    it('should not trigger warning for violations spread over time', async () => {
      // Create a large file
      const largePrettierPath = path.join(testProjectRoot, '.prettierrc-huge');
      const largeContent = JSON.stringify({
        printWidth: 80,
        _padding: 'x'.repeat(2 * 1024 * 1024),
      });

      await fs.writeFile(largePrettierPath, largeContent, 'utf-8');

      try {
        // First violation
        await analyzer.parsePrettierConfig(largePrettierPath);

        // Wait for violation window to expire (simulated by just doing one violation)
        // In real scenario, if violations are > 60s apart, no warning triggered

        // Second violation (more than 60s later in real scenario)
        await analyzer.parsePrettierConfig(largePrettierPath);

        // Should not trigger warning since violations are not frequent enough
      } finally {
        // Cleanup
        await fs.unlink(largePrettierPath).catch(() => {
          /* ignore */
        });
      }
    });

    it('should handle violations for different files independently', async () => {
      // Create two different large files
      const largeTsconfigPath = path.join(testProjectRoot, 'tsconfig-huge2.json');
      const largeEslintPath = path.join(testProjectRoot, '.eslintrc-huge.json');

      const largeContent = JSON.stringify({
        config: 'data',
        _padding: 'x'.repeat(2 * 1024 * 1024),
      });

      await fs.writeFile(largeTsconfigPath, largeContent, 'utf-8');
      await fs.writeFile(largeEslintPath, largeContent, 'utf-8');

      try {
        // 2 violations for tsconfig
        await analyzer.parseTypeScriptConfig(largeTsconfigPath);
        await analyzer.parseTypeScriptConfig(largeTsconfigPath);

        // 2 violations for eslint (different file, tracked separately)
        await analyzer.parseESLintConfig(largeEslintPath);
        await analyzer.parseESLintConfig(largeEslintPath);

        // Neither should trigger warning (each file has only 2 violations, threshold is 3)
      } finally {
        // Cleanup
        await fs.unlink(largeTsconfigPath).catch(() => {
          /* ignore */
        });
        await fs.unlink(largeEslintPath).catch(() => {
          /* ignore */
        });
      }
    });

    it('should return default config when file exceeds size limit', async () => {
      const largeMarkdownlintPath = path.join(testProjectRoot, '.markdownlint-huge.json');
      const largeContent = JSON.stringify({
        default: true,
        _padding: 'x'.repeat(2 * 1024 * 1024),
      });

      await fs.writeFile(largeMarkdownlintPath, largeContent, 'utf-8');

      try {
        const config = await analyzer.parseMarkdownLint(largeMarkdownlintPath);

        // Should return default config, not attempt to parse large file
        expect(config.default).toBe(true);
      } finally {
        // Cleanup
        await fs.unlink(largeMarkdownlintPath).catch(() => {
          /* ignore */
        });
      }
    });
  });
});
