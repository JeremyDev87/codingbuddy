import { existsSync } from 'fs';
import * as path from 'path';
import type {
  PackageInfo,
  DetectedFramework,
  FrameworkCategory,
} from './analyzer.types';
import { safeReadFile } from '../shared/file.utils';

/**
 * Framework detection definition
 */
interface FrameworkDefinition {
  /** Framework name */
  name: string;
  /** Package name to detect */
  packageName: string;
  /** Framework category */
  category: FrameworkCategory;
  /** Check in devDependencies only */
  devOnly?: boolean;
}

/**
 * Known framework definitions for detection
 */
export const FRAMEWORK_DEFINITIONS: FrameworkDefinition[] = [
  // Frontend frameworks
  { name: 'React', packageName: 'react', category: 'frontend' },
  { name: 'Vue', packageName: 'vue', category: 'frontend' },
  { name: 'Angular', packageName: '@angular/core', category: 'frontend' },
  { name: 'Svelte', packageName: 'svelte', category: 'frontend' },
  { name: 'Solid', packageName: 'solid-js', category: 'frontend' },

  // Fullstack frameworks
  { name: 'Next.js', packageName: 'next', category: 'fullstack' },
  { name: 'Nuxt', packageName: 'nuxt', category: 'fullstack' },
  { name: 'Remix', packageName: '@remix-run/react', category: 'fullstack' },
  { name: 'Astro', packageName: 'astro', category: 'fullstack' },

  // Backend frameworks
  { name: 'NestJS', packageName: '@nestjs/core', category: 'backend' },
  { name: 'Express', packageName: 'express', category: 'backend' },
  { name: 'Fastify', packageName: 'fastify', category: 'backend' },
  { name: 'Hono', packageName: 'hono', category: 'backend' },
  { name: 'Koa', packageName: 'koa', category: 'backend' },

  // Testing frameworks
  { name: 'Jest', packageName: 'jest', category: 'testing', devOnly: true },
  { name: 'Vitest', packageName: 'vitest', category: 'testing', devOnly: true },
  { name: 'Mocha', packageName: 'mocha', category: 'testing', devOnly: true },
  {
    name: 'Playwright',
    packageName: '@playwright/test',
    category: 'testing',
    devOnly: true,
  },
  {
    name: 'Cypress',
    packageName: 'cypress',
    category: 'testing',
    devOnly: true,
  },

  // Build tools
  { name: 'Vite', packageName: 'vite', category: 'build', devOnly: true },
  { name: 'Webpack', packageName: 'webpack', category: 'build', devOnly: true },
  { name: 'esbuild', packageName: 'esbuild', category: 'build', devOnly: true },
  { name: 'Rollup', packageName: 'rollup', category: 'build', devOnly: true },
  { name: 'Turbopack', packageName: 'turbo', category: 'build', devOnly: true },

  // Linting
  { name: 'ESLint', packageName: 'eslint', category: 'linting', devOnly: true },
  {
    name: 'Prettier',
    packageName: 'prettier',
    category: 'linting',
    devOnly: true,
  },
  {
    name: 'Biome',
    packageName: '@biomejs/biome',
    category: 'linting',
    devOnly: true,
  },

  // Styling
  {
    name: 'Tailwind CSS',
    packageName: 'tailwindcss',
    category: 'styling',
    devOnly: true,
  },
  {
    name: 'Styled Components',
    packageName: 'styled-components',
    category: 'styling',
  },
  { name: 'Emotion', packageName: '@emotion/react', category: 'styling' },
  { name: 'Sass', packageName: 'sass', category: 'styling', devOnly: true },

  // Database
  { name: 'Prisma', packageName: '@prisma/client', category: 'database' },
  { name: 'TypeORM', packageName: 'typeorm', category: 'database' },
  { name: 'Drizzle', packageName: 'drizzle-orm', category: 'database' },
  { name: 'Mongoose', packageName: 'mongoose', category: 'database' },
];

/**
 * Raw package.json structure
 */
interface RawPackageJson {
  name?: string;
  version?: string;
  description?: string;
  type?: 'module' | 'commonjs';
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

/**
 * Parse package.json content into PackageInfo (without framework detection)
 */
export function parsePackageJson(
  content: string,
): Omit<PackageInfo, 'detectedFrameworks'> {
  const raw: RawPackageJson = JSON.parse(content);

  return {
    name: raw.name ?? 'unknown',
    version: raw.version ?? '0.0.0',
    description: raw.description,
    type: raw.type,
    dependencies: raw.dependencies ?? {},
    devDependencies: raw.devDependencies ?? {},
    scripts: raw.scripts ?? {},
  };
}

/**
 * Detect frameworks from dependencies
 */
export function detectFrameworks(
  dependencies: Record<string, string>,
  devDependencies: Record<string, string>,
): DetectedFramework[] {
  const allDeps = { ...dependencies, ...devDependencies };
  const detected: DetectedFramework[] = [];

  for (const def of FRAMEWORK_DEFINITIONS) {
    const version = def.devOnly
      ? devDependencies[def.packageName]
      : allDeps[def.packageName];

    if (version) {
      detected.push({
        name: def.name,
        category: def.category,
        version,
      });
    }
  }

  return detected;
}

/**
 * Analyze package.json in the project root
 *
 * @param projectRoot - Project root directory
 * @returns PackageInfo or null if package.json not found
 */
export async function analyzePackage(
  projectRoot: string,
): Promise<PackageInfo | null> {
  const packagePath = path.join(projectRoot, 'package.json');

  if (!existsSync(packagePath)) {
    return null;
  }

  const content = await safeReadFile(packagePath);

  if (content === null) {
    return null;
  }

  try {
    const parsed = parsePackageJson(content);
    const frameworks = detectFrameworks(
      parsed.dependencies,
      parsed.devDependencies,
    );

    return {
      ...parsed,
      detectedFrameworks: frameworks,
    };
  } catch {
    return null;
  }
}
