import { describe, it, expect } from 'vitest';
import {
  buildAnalysisPrompt,
  buildSystemPrompt,
  formatPackageInfo,
  formatDirectoryStructure,
  formatConfigFiles,
  formatCodeSamples,
} from './prompt.builder';
import type { ProjectAnalysis } from '../../analyzer';

describe('prompt.builder', () => {
  const mockAnalysis: ProjectAnalysis = {
    packageInfo: {
      name: 'my-app',
      version: '1.0.0',
      description: 'Test application',
      dependencies: {
        react: '^18.0.0',
        next: '^14.0.0',
      },
      devDependencies: {
        typescript: '^5.0.0',
        vitest: '^1.0.0',
      },
      scripts: {
        dev: 'next dev',
        build: 'next build',
        test: 'vitest',
      },
      type: 'module',
      detectedFrameworks: [
        { name: 'React', category: 'frontend', version: '^18.0.0' },
        { name: 'Next.js', category: 'fullstack', version: '^14.0.0' },
        { name: 'TypeScript', category: 'other', version: '^5.0.0' },
      ],
    },
    directoryStructure: {
      rootDirs: ['app', 'components', 'lib', 'public'],
      rootFiles: ['package.json', 'tsconfig.json', 'next.config.js'],
      allFiles: ['app/page.tsx', 'components/Button.tsx'],
      patterns: [
        {
          name: 'Next.js App Router',
          confidence: 1.0,
          indicators: ['app', 'components', 'lib', 'public'],
        },
      ],
      totalFiles: 50,
      totalDirs: 10,
    },
    configFiles: {
      typescript: {
        path: 'tsconfig.json',
        strict: true,
        target: 'ES2022',
        module: 'ESNext',
        hasPathAliases: true,
      },
      eslint: {
        path: '.eslintrc.json',
        format: 'legacy',
        extends: ['next/core-web-vitals'],
        plugins: ['@typescript-eslint'],
      },
      prettier: {
        path: '.prettierrc',
        tabWidth: 2,
        semi: true,
        singleQuote: true,
        trailingComma: 'all',
      },
      detected: ['tsconfig.json', '.eslintrc.json', '.prettierrc'],
    },
    codeSamples: [
      {
        path: 'app/page.tsx',
        language: 'typescript',
        category: 'page',
        preview:
          'export default function Home() {\n  return <div>Hello</div>;\n}',
        lineCount: 10,
      },
      {
        path: 'components/Button.tsx',
        language: 'typescript',
        category: 'component',
        preview:
          'export function Button({ children }) {\n  return <button>{children}</button>;\n}',
        lineCount: 5,
      },
    ],
    detectedPatterns: ['Next.js App Router', 'TypeScript', 'React Project'],
  };

  describe('buildSystemPrompt', () => {
    it('should return system prompt with role definition', () => {
      const result = buildSystemPrompt();

      expect(result).toContain('CodingBuddy');
      expect(result).toContain('configuration');
      expect(result).toContain('JSON');
    });

    it('should include output format instructions', () => {
      const result = buildSystemPrompt();

      expect(result).toContain('CodingBuddyConfig');
      expect(result).toMatch(/\bjson\b/i);
    });
  });

  describe('buildAnalysisPrompt', () => {
    it('should include package information section', () => {
      const result = buildAnalysisPrompt(mockAnalysis);

      expect(result).toContain('my-app');
      expect(result).toContain('React');
      expect(result).toContain('Next.js');
    });

    it('should include directory structure section', () => {
      const result = buildAnalysisPrompt(mockAnalysis);

      expect(result).toContain('app');
      expect(result).toContain('components');
      expect(result).toContain('Next.js App Router');
    });

    it('should include config files section', () => {
      const result = buildAnalysisPrompt(mockAnalysis);

      expect(result).toContain('TypeScript');
      expect(result).toContain('Strict mode');
      expect(result).toContain('ESLint');
      expect(result).toContain('Prettier');
    });

    it('should include code samples section', () => {
      const result = buildAnalysisPrompt(mockAnalysis);

      expect(result).toContain('app/page.tsx');
      expect(result).toContain('components/Button.tsx');
    });

    it('should include detected patterns', () => {
      const result = buildAnalysisPrompt(mockAnalysis);

      expect(result).toContain('Next.js App Router');
      expect(result).toContain('TypeScript');
    });

    it('should handle missing package info', () => {
      const analysisWithoutPackage: ProjectAnalysis = {
        ...mockAnalysis,
        packageInfo: null,
      };

      const result = buildAnalysisPrompt(analysisWithoutPackage);

      expect(result).toContain('No package.json found');
    });

    it('should handle empty code samples', () => {
      const analysisWithoutSamples: ProjectAnalysis = {
        ...mockAnalysis,
        codeSamples: [],
      };

      const result = buildAnalysisPrompt(analysisWithoutSamples);

      expect(result).toContain('No code samples');
    });
  });

  describe('formatPackageInfo', () => {
    it('should format package info with frameworks', () => {
      const result = formatPackageInfo(mockAnalysis.packageInfo!);

      expect(result).toContain('my-app');
      expect(result).toContain('1.0.0');
      expect(result).toContain('React');
      expect(result).toContain('Next.js');
    });

    it('should include scripts', () => {
      const result = formatPackageInfo(mockAnalysis.packageInfo!);

      expect(result).toContain('dev');
      expect(result).toContain('build');
      expect(result).toContain('test');
    });
  });

  describe('formatDirectoryStructure', () => {
    it('should format directory structure with patterns', () => {
      const result = formatDirectoryStructure(mockAnalysis.directoryStructure);

      expect(result).toContain('app');
      expect(result).toContain('components');
      expect(result).toContain('Next.js App Router');
      expect(result).toContain('1'); // confidence 1.0
    });

    it('should include file counts', () => {
      const result = formatDirectoryStructure(mockAnalysis.directoryStructure);

      expect(result).toContain('50'); // total files
      expect(result).toContain('10'); // total dirs
    });
  });

  describe('formatConfigFiles', () => {
    it('should format all config file summaries', () => {
      const result = formatConfigFiles(mockAnalysis.configFiles);

      expect(result).toContain('TypeScript');
      expect(result).toContain('ESLint');
      expect(result).toContain('Prettier');
    });

    it('should include config details', () => {
      const result = formatConfigFiles(mockAnalysis.configFiles);

      expect(result).toContain('Strict mode');
      expect(result).toContain('ES2022');
      expect(result).toContain('path aliases');
    });
  });

  describe('formatCodeSamples', () => {
    it('should format code samples with metadata', () => {
      const result = formatCodeSamples(mockAnalysis.codeSamples);

      expect(result).toContain('app/page.tsx');
      expect(result).toContain('typescript');
      expect(result).toContain('page');
    });

    it('should include code preview', () => {
      const result = formatCodeSamples(mockAnalysis.codeSamples);

      expect(result).toContain('export default function Home');
      expect(result).toContain('Button');
    });
  });
});
