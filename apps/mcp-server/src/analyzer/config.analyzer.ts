import { existsSync } from 'fs';
import * as path from 'path';
import type {
  ConfigFilesSummary,
  TsConfigSummary,
  EslintSummary,
  PrettierSummary,
} from './analyzer.types';
import { tryReadFile } from '../shared/file.utils';

/**
 * Known config file patterns by type
 */
export const CONFIG_FILE_PATTERNS: Record<string, string[]> = {
  typescript: ['tsconfig.json', 'tsconfig.*.json', 'jsconfig.json'],
  eslint: [
    '.eslintrc',
    '.eslintrc.json',
    '.eslintrc.js',
    '.eslintrc.cjs',
    '.eslintrc.yaml',
    '.eslintrc.yml',
    'eslint.config.js',
    'eslint.config.mjs',
    'eslint.config.cjs',
  ],
  prettier: [
    '.prettierrc',
    '.prettierrc.json',
    '.prettierrc.js',
    '.prettierrc.cjs',
    '.prettierrc.yaml',
    '.prettierrc.yml',
    'prettier.config.js',
    'prettier.config.mjs',
    'prettier.config.cjs',
  ],
  vite: [
    'vite.config.ts',
    'vite.config.js',
    'vite.config.mts',
    'vite.config.mjs',
  ],
  webpack: ['webpack.config.js', 'webpack.config.ts'],
  tailwind: ['tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.cjs'],
  jest: ['jest.config.js', 'jest.config.ts', 'jest.config.json'],
  vitest: ['vitest.config.ts', 'vitest.config.js', 'vitest.config.mts'],
};

/**
 * All known config file patterns (flattened)
 */
const ALL_CONFIG_PATTERNS = Object.values(CONFIG_FILE_PATTERNS).flat();

/**
 * Parse tsconfig.json content
 */
export function parseTsConfig(
  content: string,
  filePath: string,
): TsConfigSummary | null {
  try {
    const config = JSON.parse(content);
    const compilerOptions = config.compilerOptions ?? {};

    return {
      path: filePath,
      strict: compilerOptions.strict,
      target: compilerOptions.target,
      module: compilerOptions.module,
      hasPathAliases:
        !!compilerOptions.paths &&
        Object.keys(compilerOptions.paths).length > 0,
    };
  } catch {
    return null;
  }
}

/**
 * Parse ESLint config content
 */
export function parseEslintConfig(
  content: string,
  filePath: string,
  format: 'legacy' | 'flat',
): EslintSummary | null {
  try {
    const config = JSON.parse(content);

    return {
      path: filePath,
      format,
      extends: config.extends,
      plugins: config.plugins,
    };
  } catch {
    return null;
  }
}

/**
 * Parse Prettier config content
 */
export function parsePrettierConfig(
  content: string,
  filePath: string,
): PrettierSummary | null {
  try {
    const config = JSON.parse(content);

    return {
      path: filePath,
      tabWidth: config.tabWidth,
      semi: config.semi,
      singleQuote: config.singleQuote,
      trailingComma: config.trailingComma,
    };
  } catch {
    return null;
  }
}

/**
 * Check if a filename matches a config pattern
 */
function matchesConfigPattern(fileName: string): boolean {
  const baseName = path.basename(fileName);

  for (const pattern of ALL_CONFIG_PATTERNS) {
    if (pattern.includes('*')) {
      // Simple wildcard matching
      const regex = new RegExp(
        '^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$',
      );
      if (regex.test(baseName)) {
        return true;
      }
    } else if (baseName === pattern) {
      return true;
    }
  }

  return false;
}

/**
 * Detect config files from a list of file paths
 */
export function detectConfigFiles(files: string[]): string[] {
  return files.filter(file => matchesConfigPattern(file));
}

/**
 * Determine if ESLint config is legacy or flat format
 */
function getEslintFormat(fileName: string): 'legacy' | 'flat' {
  const baseName = path.basename(fileName);
  if (baseName.startsWith('eslint.config.')) {
    return 'flat';
  }
  return 'legacy';
}

/**
 * Analyze config files in a project
 *
 * @param projectRoot - Project root directory
 * @param rootFiles - List of root-level files
 * @returns Config files summary
 */
export async function analyzeConfigs(
  projectRoot: string,
  rootFiles: string[],
): Promise<ConfigFilesSummary> {
  const detected = detectConfigFiles(rootFiles);
  const result: ConfigFilesSummary = { detected };

  // Parse TypeScript config
  for (const pattern of CONFIG_FILE_PATTERNS.typescript) {
    if (!pattern.includes('*')) {
      const filePath = path.join(projectRoot, pattern);
      if (existsSync(filePath)) {
        const content = await tryReadFile(filePath);
        if (content !== undefined) {
          const parsed = parseTsConfig(content, pattern);
          if (parsed) {
            result.typescript = parsed;
            break;
          }
        }
      }
    }
  }

  // Parse ESLint config (JSON files only for simplicity)
  const eslintJsonFiles = ['.eslintrc', '.eslintrc.json'];
  for (const fileName of eslintJsonFiles) {
    const filePath = path.join(projectRoot, fileName);
    if (existsSync(filePath)) {
      const content = await tryReadFile(filePath);
      if (content !== undefined) {
        const parsed = parseEslintConfig(
          content,
          fileName,
          getEslintFormat(fileName),
        );
        if (parsed) {
          result.eslint = parsed;
          break;
        }
      }
    }
  }

  // Check for flat config (just record its presence)
  for (const pattern of [
    'eslint.config.js',
    'eslint.config.mjs',
    'eslint.config.cjs',
  ]) {
    if (existsSync(path.join(projectRoot, pattern))) {
      if (!result.eslint) {
        result.eslint = {
          path: pattern,
          format: 'flat',
        };
      }
      break;
    }
  }

  // Parse Prettier config (JSON files only for simplicity)
  const prettierJsonFiles = ['.prettierrc', '.prettierrc.json'];
  for (const fileName of prettierJsonFiles) {
    const filePath = path.join(projectRoot, fileName);
    if (existsSync(filePath)) {
      const content = await tryReadFile(filePath);
      if (content !== undefined) {
        const parsed = parsePrettierConfig(content, fileName);
        if (parsed) {
          result.prettier = parsed;
          break;
        }
      }
    }
  }

  return result;
}
