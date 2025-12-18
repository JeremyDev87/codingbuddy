import { describe, it, expect } from 'vitest';
import { AnalyzerService } from './analyzer.service';

describe('AnalyzerService', () => {
  const service = new AnalyzerService();

  describe('analyzeProject', () => {
    it('should return null packageInfo for non-existent path', async () => {
      const result = await service.analyzeProject('/non/existent/path');

      expect(result.packageInfo).toBeNull();
      expect(result.directoryStructure.rootDirs).toEqual([]);
      expect(result.directoryStructure.rootFiles).toEqual([]);
      expect(result.codeSamples).toEqual([]);
    });

    it('should analyze current project', async () => {
      // Analyze the mcp-server itself
      const result = await service.analyzeProject(process.cwd());

      // Should find package.json
      expect(result.packageInfo).not.toBeNull();
      expect(result.packageInfo?.name).toBeDefined();

      // Should detect TypeScript
      expect(result.detectedPatterns).toContain('TypeScript');

      // Should find some directories
      expect(result.directoryStructure.rootDirs).toContain('src');
      expect(result.directoryStructure.totalDirs).toBeGreaterThan(0);
      expect(result.directoryStructure.totalFiles).toBeGreaterThan(0);

      // Should have allFiles populated
      expect(result.directoryStructure.allFiles.length).toBe(
        result.directoryStructure.totalFiles,
      );
    });

    it('should respect maxCodeSamples option', async () => {
      const result = await service.analyzeProject(process.cwd(), {
        maxCodeSamples: 2,
      });

      expect(result.codeSamples.length).toBeLessThanOrEqual(2);
    });

    it('should detect NestJS framework', async () => {
      const result = await service.analyzeProject(process.cwd());

      expect(result.packageInfo?.detectedFrameworks).toContainEqual(
        expect.objectContaining({ name: 'NestJS', category: 'backend' }),
      );

      expect(result.detectedPatterns).toContain('NestJS Backend');
    });

    it('should detect config files', async () => {
      const result = await service.analyzeProject(process.cwd());

      // Should find tsconfig.json
      expect(result.configFiles.typescript).toBeDefined();
      expect(result.configFiles.typescript?.path).toBe('tsconfig.json');
    });
  });

  describe('quickAnalyze', () => {
    it('should return package info only', async () => {
      const result = await service.quickAnalyze(process.cwd());

      expect(result).not.toBeNull();
      expect(result?.name).toBeDefined();
      expect(result?.detectedFrameworks).toBeDefined();
    });

    it('should return null for non-existent path', async () => {
      const result = await service.quickAnalyze('/non/existent/path');

      expect(result).toBeNull();
    });
  });

  describe('inferPatterns', () => {
    it('should infer patterns from analysis results', async () => {
      const result = await service.analyzeProject(process.cwd());

      // Should have detected patterns
      expect(result.detectedPatterns.length).toBeGreaterThan(0);

      // Should include TypeScript since we have it as dependency
      expect(result.detectedPatterns).toContain('TypeScript');
    });

    it('should remove duplicate patterns', async () => {
      const result = await service.analyzeProject(process.cwd());

      const uniquePatterns = new Set(result.detectedPatterns);
      expect(result.detectedPatterns.length).toBe(uniquePatterns.size);
    });
  });
});
