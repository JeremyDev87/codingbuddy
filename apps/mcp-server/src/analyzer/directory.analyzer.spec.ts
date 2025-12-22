import { describe, it, expect } from 'vitest';
import {
  detectArchitecturePatterns,
  categorizeDirectory,
  ARCHITECTURE_PATTERNS,
} from './directory.analyzer';

describe('directory.analyzer', () => {
  describe('ARCHITECTURE_PATTERNS', () => {
    it('should have definitions for common patterns', () => {
      const names = ARCHITECTURE_PATTERNS.map(p => p.name);

      expect(names).toContain('Next.js App Router');
      expect(names).toContain('Next.js Pages Router');
      expect(names).toContain('NestJS Modular');
      expect(names).toContain('Feature-Sliced Design');
      expect(names).toContain('Component-Based');
    });
  });

  describe('detectArchitecturePatterns', () => {
    it('should detect Next.js App Router pattern', () => {
      const dirs = ['app', 'components', 'lib', 'public'];

      const result = detectArchitecturePatterns(dirs);

      expect(result).toContainEqual(
        expect.objectContaining({
          name: 'Next.js App Router',
          confidence: expect.any(Number),
        }),
      );
    });

    it('should detect Next.js Pages Router pattern', () => {
      const dirs = ['pages', 'components', 'styles', 'public'];

      const result = detectArchitecturePatterns(dirs);

      expect(result).toContainEqual(
        expect.objectContaining({
          name: 'Next.js Pages Router',
          confidence: expect.any(Number),
        }),
      );
    });

    it('should detect NestJS Modular pattern', () => {
      const dirs = ['src/modules', 'src/common', 'src/config'];

      const result = detectArchitecturePatterns(dirs);

      expect(result).toContainEqual(
        expect.objectContaining({
          name: 'NestJS Modular',
        }),
      );
    });

    it('should detect Feature-Sliced Design', () => {
      const dirs = [
        'src/features',
        'src/entities',
        'src/shared',
        'src/widgets',
      ];

      const result = detectArchitecturePatterns(dirs);

      expect(result).toContainEqual(
        expect.objectContaining({
          name: 'Feature-Sliced Design',
        }),
      );
    });

    it('should detect Component-Based architecture', () => {
      const dirs = ['src/components', 'src/hooks', 'src/utils'];

      const result = detectArchitecturePatterns(dirs);

      expect(result).toContainEqual(
        expect.objectContaining({
          name: 'Component-Based',
        }),
      );
    });

    it('should detect Monorepo pattern', () => {
      const dirs = ['packages', 'apps'];

      const result = detectArchitecturePatterns(dirs);

      expect(result).toContainEqual(
        expect.objectContaining({
          name: 'Monorepo',
        }),
      );
    });

    it('should return empty array for unrecognized structure', () => {
      const dirs = ['random', 'unknown', 'folders'];

      const result = detectArchitecturePatterns(dirs);

      expect(result).toEqual([]);
    });

    it('should calculate confidence based on matching indicators', () => {
      // All indicators match (4/4 = 1.0)
      const fullMatch = detectArchitecturePatterns([
        'app',
        'components',
        'lib',
        'public',
      ]);
      const appRouterPattern = fullMatch.find(
        p => p.name === 'Next.js App Router',
      );

      expect(appRouterPattern?.confidence).toBe(1);
      expect(appRouterPattern?.indicators).toHaveLength(4);

      // Partial match (2/4 = 0.5)
      const partialMatch = detectArchitecturePatterns(['app', 'components']);
      const partialPattern = partialMatch.find(
        p => p.name === 'Next.js App Router',
      );

      expect(partialPattern?.confidence).toBe(0.5);
      expect(partialPattern?.indicators).toHaveLength(2);
    });

    it('should sort patterns by confidence descending', () => {
      const dirs = ['app', 'src/components', 'src/hooks'];

      const result = detectArchitecturePatterns(dirs);

      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].confidence).toBeGreaterThanOrEqual(
          result[i].confidence,
        );
      }
    });
  });

  describe('categorizeDirectory', () => {
    it('should categorize source directories', () => {
      expect(categorizeDirectory('src')).toBe('source');
      expect(categorizeDirectory('lib')).toBe('source');
    });

    it('should categorize test directories', () => {
      expect(categorizeDirectory('test')).toBe('test');
      expect(categorizeDirectory('tests')).toBe('test');
      expect(categorizeDirectory('__tests__')).toBe('test');
      expect(categorizeDirectory('spec')).toBe('test');
    });

    it('should categorize config directories', () => {
      expect(categorizeDirectory('config')).toBe('config');
      expect(categorizeDirectory('.config')).toBe('config');
    });

    it('should categorize build output directories', () => {
      expect(categorizeDirectory('dist')).toBe('build');
      expect(categorizeDirectory('build')).toBe('build');
      expect(categorizeDirectory('out')).toBe('build');
      expect(categorizeDirectory('.next')).toBe('build');
    });

    it('should categorize dependency directories', () => {
      expect(categorizeDirectory('node_modules')).toBe('dependencies');
    });

    it('should categorize public/static directories', () => {
      expect(categorizeDirectory('public')).toBe('static');
      expect(categorizeDirectory('static')).toBe('static');
      expect(categorizeDirectory('assets')).toBe('static');
    });

    it('should return other for unknown directories', () => {
      expect(categorizeDirectory('random')).toBe('other');
      expect(categorizeDirectory('custom')).toBe('other');
    });
  });
});
