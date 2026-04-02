import { describe, it, expect } from 'vitest';
import { FileSpecialistMapper } from './file-specialist-mapper';

describe('FileSpecialistMapper', () => {
  let mapper: FileSpecialistMapper;

  beforeEach(() => {
    mapper = new FileSpecialistMapper();
  });

  describe('mapFile', () => {
    it('should map .ts files to code-quality-specialist', () => {
      const result = mapper.mapFile('src/utils/helper.ts');
      expect(result).toContainEqual(
        expect.objectContaining({
          specialist: 'code-quality-specialist',
          domain: 'code-quality',
        }),
      );
    });

    it('should map .tsx files to both code-quality and accessibility specialists', () => {
      const result = mapper.mapFile('src/components/Button.tsx');
      const specialists = result.map(r => r.specialist);
      expect(specialists).toContain('code-quality-specialist');
      expect(specialists).toContain('accessibility-specialist');
    });

    it('should map auth-related files to security-specialist', () => {
      const result = mapper.mapFile('src/auth/login.ts');
      expect(result).toContainEqual(
        expect.objectContaining({
          specialist: 'security-specialist',
          domain: 'security',
        }),
      );
    });

    it('should map jwt-related files to security-specialist', () => {
      const result = mapper.mapFile('src/utils/jwt-helper.ts');
      expect(result).toContainEqual(
        expect.objectContaining({
          specialist: 'security-specialist',
          domain: 'security',
        }),
      );
    });

    it('should map package.json to performance-specialist', () => {
      const result = mapper.mapFile('package.json');
      expect(result).toContainEqual(
        expect.objectContaining({
          specialist: 'performance-specialist',
          domain: 'performance',
        }),
      );
    });

    it('should map webpack config to performance-specialist', () => {
      const result = mapper.mapFile('webpack.config.js');
      expect(result).toContainEqual(
        expect.objectContaining({
          specialist: 'performance-specialist',
          domain: 'performance',
        }),
      );
    });

    it('should return empty array for unrecognized files', () => {
      const result = mapper.mapFile('README.md');
      expect(result).toEqual([]);
    });
  });

  describe('mapFiles', () => {
    it('should deduplicate specialists across multiple files', () => {
      const result = mapper.mapFiles(['src/a.ts', 'src/b.ts']);
      const codeQualityEntries = result.filter(r => r.domain === 'code-quality');
      expect(codeQualityEntries).toHaveLength(1);
    });

    it('should return multiple specialists for diverse file sets', () => {
      const result = mapper.mapFiles(['src/auth/login.tsx', 'package.json']);
      const domains = result.map(r => r.domain);
      expect(domains).toContain('code-quality');
      expect(domains).toContain('security');
      expect(domains).toContain('accessibility');
      expect(domains).toContain('performance');
    });

    it('should return empty array for empty input', () => {
      const result = mapper.mapFiles([]);
      expect(result).toEqual([]);
    });

    it('should return empty array when no files match', () => {
      const result = mapper.mapFiles(['README.md', 'LICENSE', 'docs/guide.txt']);
      expect(result).toEqual([]);
    });
  });
});
