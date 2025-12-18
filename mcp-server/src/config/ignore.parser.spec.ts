import { describe, it, expect } from 'vitest';
import {
  parseIgnoreLine,
  parseIgnoreContent,
  patternToRegex,
  shouldIgnore,
  filterIgnored,
  getDefaultIgnorePatterns,
} from './ignore.parser';

describe('ignore.parser', () => {
  describe('parseIgnoreLine', () => {
    it('should return null for empty lines', () => {
      expect(parseIgnoreLine('')).toBe(null);
      expect(parseIgnoreLine('   ')).toBe(null);
      expect(parseIgnoreLine('\t')).toBe(null);
    });

    it('should return null for comments', () => {
      expect(parseIgnoreLine('# comment')).toBe(null);
      expect(parseIgnoreLine('  # indented comment')).toBe(null);
    });

    it('should return trimmed pattern for valid lines', () => {
      expect(parseIgnoreLine('node_modules/')).toBe('node_modules/');
      expect(parseIgnoreLine('  dist/  ')).toBe('dist/');
      expect(parseIgnoreLine('*.log')).toBe('*.log');
    });
  });

  describe('parseIgnoreContent', () => {
    it('should parse multiple lines correctly', () => {
      const content = `
# Build outputs
dist/
build/

# Dependencies
node_modules/

# Logs
*.log
`;
      const patterns = parseIgnoreContent(content);
      expect(patterns).toEqual(['dist/', 'build/', 'node_modules/', '*.log']);
    });

    it('should handle empty content', () => {
      expect(parseIgnoreContent('')).toEqual([]);
    });

    it('should handle content with only comments', () => {
      const content = `# comment 1
# comment 2`;
      expect(parseIgnoreContent(content)).toEqual([]);
    });
  });

  describe('patternToRegex', () => {
    it('should match simple patterns', () => {
      const regex = patternToRegex('node_modules/');
      expect(regex.test('node_modules/')).toBe(true);
      expect(regex.test('src/node_modules/')).toBe(true);
    });

    it('should match wildcard patterns', () => {
      const regex = patternToRegex('*.log');
      expect(regex.test('app.log')).toBe(true);
      expect(regex.test('error.log')).toBe(true);
      expect(regex.test('logs/app.log')).toBe(true);
    });

    it('should match double wildcard patterns', () => {
      const regex = patternToRegex('**/*.test.ts');
      expect(regex.test('app.test.ts')).toBe(true);
      expect(regex.test('src/app.test.ts')).toBe(true);
      expect(regex.test('src/deep/nested/app.test.ts')).toBe(true);
    });

    it('should handle root-anchored patterns', () => {
      const regex = patternToRegex('/dist/');
      expect(regex.test('dist/')).toBe(true);
      expect(regex.test('src/dist/')).toBe(false);
    });

    it('should handle question mark wildcard', () => {
      const regex = patternToRegex('file?.txt');
      expect(regex.test('file1.txt')).toBe(true);
      expect(regex.test('fileA.txt')).toBe(true);
      expect(regex.test('file12.txt')).toBe(false);
    });
  });

  describe('shouldIgnore', () => {
    const patterns = ['node_modules/', 'dist/', '*.log', '!important.log'];

    it('should ignore matching paths', () => {
      expect(shouldIgnore('node_modules/package', patterns)).toBe(true);
      expect(shouldIgnore('dist/bundle.js', patterns)).toBe(true);
      expect(shouldIgnore('error.log', patterns)).toBe(true);
    });

    it('should not ignore non-matching paths', () => {
      expect(shouldIgnore('src/index.ts', patterns)).toBe(false);
      expect(shouldIgnore('package.json', patterns)).toBe(false);
    });

    it('should handle negation patterns', () => {
      expect(shouldIgnore('debug.log', patterns)).toBe(true);
      expect(shouldIgnore('important.log', patterns)).toBe(false);
    });

    it('should normalize Windows paths', () => {
      expect(shouldIgnore('node_modules\\package', patterns)).toBe(true);
      expect(shouldIgnore('dist\\bundle.js', patterns)).toBe(true);
    });
  });

  describe('filterIgnored', () => {
    it('should filter out ignored paths', () => {
      const paths = [
        'src/index.ts',
        'node_modules/lodash/index.js',
        'dist/bundle.js',
        'package.json',
      ];
      const patterns = ['node_modules/', 'dist/'];

      const result = filterIgnored(paths, patterns);
      expect(result).toEqual(['src/index.ts', 'package.json']);
    });

    it('should return all paths when no patterns match', () => {
      const paths = ['src/index.ts', 'src/utils.ts'];
      const patterns = ['node_modules/'];

      const result = filterIgnored(paths, patterns);
      expect(result).toEqual(paths);
    });
  });

  describe('getDefaultIgnorePatterns', () => {
    it('should include common ignore patterns', () => {
      const defaults = getDefaultIgnorePatterns();

      expect(defaults).toContain('node_modules/');
      expect(defaults).toContain('.git/');
      expect(defaults).toContain('dist/');
      expect(defaults).toContain('.env');
    });

    it('should include negation for .env.example', () => {
      const defaults = getDefaultIgnorePatterns();
      expect(defaults).toContain('!.env.example');
    });
  });
});
