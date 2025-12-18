import { describe, it, expect } from 'vitest';
import {
  parsePackageJson,
  detectFrameworks,
  analyzePackage,
  FRAMEWORK_DEFINITIONS,
} from './package.analyzer';
import type { PackageInfo } from './analyzer.types';

describe('package.analyzer', () => {
  describe('parsePackageJson', () => {
    it('should parse minimal package.json', () => {
      const content = JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
      });

      const result = parsePackageJson(content);

      expect(result.name).toBe('test-project');
      expect(result.version).toBe('1.0.0');
      expect(result.dependencies).toEqual({});
      expect(result.devDependencies).toEqual({});
      expect(result.scripts).toEqual({});
    });

    it('should parse full package.json', () => {
      const content = JSON.stringify({
        name: 'full-project',
        version: '2.0.0',
        description: 'A test project',
        type: 'module',
        dependencies: {
          react: '^18.0.0',
        },
        devDependencies: {
          typescript: '^5.0.0',
        },
        scripts: {
          build: 'tsc',
          test: 'vitest',
        },
      });

      const result = parsePackageJson(content);

      expect(result.name).toBe('full-project');
      expect(result.version).toBe('2.0.0');
      expect(result.description).toBe('A test project');
      expect(result.type).toBe('module');
      expect(result.dependencies).toEqual({ react: '^18.0.0' });
      expect(result.devDependencies).toEqual({ typescript: '^5.0.0' });
      expect(result.scripts).toEqual({ build: 'tsc', test: 'vitest' });
    });

    it('should throw on invalid JSON', () => {
      expect(() => parsePackageJson('invalid json')).toThrow();
    });

    it('should handle missing name/version with defaults', () => {
      const content = JSON.stringify({});

      const result = parsePackageJson(content);

      expect(result.name).toBe('unknown');
      expect(result.version).toBe('0.0.0');
    });
  });

  describe('detectFrameworks', () => {
    it('should detect React', () => {
      const deps = { react: '^18.0.0', 'react-dom': '^18.0.0' };

      const result = detectFrameworks(deps, {});

      expect(result).toContainEqual(
        expect.objectContaining({ name: 'React', category: 'frontend' }),
      );
    });

    it('should detect Next.js', () => {
      const deps = { next: '^14.0.0', react: '^18.0.0' };

      const result = detectFrameworks(deps, {});

      expect(result).toContainEqual(
        expect.objectContaining({ name: 'Next.js', category: 'fullstack' }),
      );
    });

    it('should detect NestJS', () => {
      const deps = { '@nestjs/core': '^10.0.0', '@nestjs/common': '^10.0.0' };

      const result = detectFrameworks(deps, {});

      expect(result).toContainEqual(
        expect.objectContaining({ name: 'NestJS', category: 'backend' }),
      );
    });

    it('should detect Vue', () => {
      const deps = { vue: '^3.0.0' };

      const result = detectFrameworks(deps, {});

      expect(result).toContainEqual(
        expect.objectContaining({ name: 'Vue', category: 'frontend' }),
      );
    });

    it('should detect testing frameworks from devDependencies', () => {
      const devDeps = { vitest: '^1.0.0', jest: '^29.0.0' };

      const result = detectFrameworks({}, devDeps);

      expect(result).toContainEqual(
        expect.objectContaining({ name: 'Vitest', category: 'testing' }),
      );
      expect(result).toContainEqual(
        expect.objectContaining({ name: 'Jest', category: 'testing' }),
      );
    });

    it('should detect build tools', () => {
      const devDeps = { vite: '^5.0.0' };

      const result = detectFrameworks({}, devDeps);

      expect(result).toContainEqual(
        expect.objectContaining({ name: 'Vite', category: 'build' }),
      );
    });

    it('should return empty array for no recognized frameworks', () => {
      const result = detectFrameworks({}, {});

      expect(result).toEqual([]);
    });
  });

  describe('FRAMEWORK_DEFINITIONS', () => {
    it('should have definitions for major frameworks', () => {
      const names = FRAMEWORK_DEFINITIONS.map((f) => f.name);

      expect(names).toContain('React');
      expect(names).toContain('Next.js');
      expect(names).toContain('NestJS');
      expect(names).toContain('Vue');
      expect(names).toContain('Express');
    });
  });

  describe('analyzePackage', () => {
    it('should return null for non-existent package.json', async () => {
      const result = await analyzePackage('/non/existent/path');

      expect(result).toBeNull();
    });
  });
});
