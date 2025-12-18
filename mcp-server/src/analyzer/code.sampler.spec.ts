import { describe, it, expect } from 'vitest';
import {
  categorizeFile,
  detectLanguage,
  isCodeFile,
  selectSampleFiles,
  LANGUAGE_EXTENSIONS,
} from './code.sampler';

describe('code.sampler', () => {
  describe('LANGUAGE_EXTENSIONS', () => {
    it('should have common language extensions', () => {
      expect(LANGUAGE_EXTENSIONS['.ts']).toBe('typescript');
      expect(LANGUAGE_EXTENSIONS['.tsx']).toBe('typescript');
      expect(LANGUAGE_EXTENSIONS['.js']).toBe('javascript');
      expect(LANGUAGE_EXTENSIONS['.jsx']).toBe('javascript');
      expect(LANGUAGE_EXTENSIONS['.py']).toBe('python');
    });
  });

  describe('detectLanguage', () => {
    it('should detect TypeScript files', () => {
      expect(detectLanguage('index.ts')).toBe('typescript');
      expect(detectLanguage('App.tsx')).toBe('typescript');
      expect(detectLanguage('src/utils/helper.ts')).toBe('typescript');
    });

    it('should detect JavaScript files', () => {
      expect(detectLanguage('index.js')).toBe('javascript');
      expect(detectLanguage('App.jsx')).toBe('javascript');
    });

    it('should detect Python files', () => {
      expect(detectLanguage('main.py')).toBe('python');
    });

    it('should return unknown for unrecognized extensions', () => {
      expect(detectLanguage('file.xyz')).toBe('unknown');
      expect(detectLanguage('noextension')).toBe('unknown');
    });
  });

  describe('isCodeFile', () => {
    it('should return true for code files', () => {
      expect(isCodeFile('index.ts')).toBe(true);
      expect(isCodeFile('app.js')).toBe(true);
      expect(isCodeFile('main.py')).toBe(true);
      expect(isCodeFile('style.css')).toBe(true);
    });

    it('should return false for non-code files', () => {
      expect(isCodeFile('image.png')).toBe(false);
      expect(isCodeFile('document.pdf')).toBe(false);
      expect(isCodeFile('archive.zip')).toBe(false);
      expect(isCodeFile('README.md')).toBe(false);
    });

    it('should return false for files without extension', () => {
      expect(isCodeFile('Makefile')).toBe(false);
      expect(isCodeFile('Dockerfile')).toBe(false);
    });
  });

  describe('categorizeFile', () => {
    it('should categorize component files', () => {
      expect(categorizeFile('src/components/Button.tsx')).toBe('component');
      expect(categorizeFile('components/Header/index.tsx')).toBe('component');
      expect(categorizeFile('src/ui/Card.tsx')).toBe('component');
    });

    it('should categorize page files', () => {
      expect(categorizeFile('pages/index.tsx')).toBe('page');
      expect(categorizeFile('app/dashboard/page.tsx')).toBe('page');
      expect(categorizeFile('src/pages/Home.tsx')).toBe('page');
    });

    it('should categorize utility files', () => {
      expect(categorizeFile('src/utils/format.ts')).toBe('util');
      expect(categorizeFile('src/lib/helpers.ts')).toBe('util');
      expect(categorizeFile('utils/date.ts')).toBe('util');
    });

    it('should categorize hook files', () => {
      expect(categorizeFile('src/hooks/useAuth.ts')).toBe('hook');
      expect(categorizeFile('hooks/useForm.ts')).toBe('hook');
      expect(categorizeFile('src/useCounter.ts')).toBe('hook');
    });

    it('should categorize API/route files', () => {
      expect(categorizeFile('src/api/users.ts')).toBe('api');
      expect(categorizeFile('pages/api/auth.ts')).toBe('api');
      expect(categorizeFile('app/api/users/route.ts')).toBe('api');
    });

    it('should categorize service files', () => {
      expect(categorizeFile('src/services/auth.service.ts')).toBe('service');
      expect(categorizeFile('services/user.service.ts')).toBe('service');
    });

    it('should categorize model files', () => {
      expect(categorizeFile('src/models/User.ts')).toBe('model');
      expect(categorizeFile('src/entities/Product.ts')).toBe('model');
      expect(categorizeFile('models/Order.ts')).toBe('model');
    });

    it('should categorize test files', () => {
      expect(categorizeFile('src/utils/format.spec.ts')).toBe('test');
      expect(categorizeFile('src/utils/format.test.ts')).toBe('test');
      expect(categorizeFile('__tests__/app.test.tsx')).toBe('test');
    });

    it('should categorize config files', () => {
      expect(categorizeFile('src/config/database.ts')).toBe('config');
      expect(categorizeFile('config/env.ts')).toBe('config');
    });

    it('should return other for unrecognized patterns', () => {
      expect(categorizeFile('src/index.ts')).toBe('other');
      expect(categorizeFile('main.ts')).toBe('other');
    });
  });

  describe('selectSampleFiles', () => {
    it('should select files from different categories', () => {
      const files = [
        'src/components/Button.tsx',
        'src/components/Card.tsx',
        'src/hooks/useAuth.ts',
        'src/utils/format.ts',
        'src/index.ts',
      ];

      const result = selectSampleFiles(files, 3);

      // Should have samples from different categories
      const categories = result.map((f) => categorizeFile(f));
      expect(new Set(categories).size).toBeGreaterThan(1);
    });

    it('should limit to maxSamples', () => {
      const files = [
        'src/components/Button.tsx',
        'src/components/Card.tsx',
        'src/components/Input.tsx',
        'src/hooks/useAuth.ts',
        'src/utils/format.ts',
      ];

      const result = selectSampleFiles(files, 2);

      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should return empty array for no code files', () => {
      const files = ['README.md', 'package.json', 'image.png'];

      const result = selectSampleFiles(files, 5);

      expect(result).toEqual([]);
    });

    it('should filter out test files from samples', () => {
      const files = [
        'src/utils/format.ts',
        'src/utils/format.spec.ts',
        'src/utils/format.test.ts',
      ];

      const result = selectSampleFiles(files, 5);

      expect(result).not.toContain('src/utils/format.spec.ts');
      expect(result).not.toContain('src/utils/format.test.ts');
    });

    it('should prioritize diverse categories', () => {
      const files = [
        'src/components/A.tsx',
        'src/components/B.tsx',
        'src/components/C.tsx',
        'src/hooks/useA.ts',
        'src/utils/a.ts',
      ];

      const result = selectSampleFiles(files, 3);
      const categories = result.map((f) => categorizeFile(f));

      // Should have files from at least 2 different categories
      expect(new Set(categories).size).toBeGreaterThanOrEqual(2);
    });
  });
});
