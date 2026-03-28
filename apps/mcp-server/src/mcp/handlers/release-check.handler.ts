import { Injectable, Logger } from '@nestjs/common';
import { readFile, access } from 'fs/promises';
import { resolve } from 'path';
import type { ToolDefinition } from './base.handler';
import type { ToolResponse } from '../response.utils';
import { AbstractHandler } from './abstract-handler';
import { ConfigService } from '../../config/config.service';
import { createJsonResponse, createErrorResponse } from '../response.utils';
import { extractOptionalString, extractStringArray } from '../../shared/validation.constants';

interface EcosystemConfig {
  name: string;
  versionFiles: string[];
  lockfiles: string[];
}

const ECOSYSTEMS: Record<string, EcosystemConfig> = {
  node: {
    name: 'Node.js',
    versionFiles: ['package.json'],
    lockfiles: ['yarn.lock', 'package-lock.json', 'pnpm-lock.yaml'],
  },
  python: {
    name: 'Python',
    versionFiles: ['pyproject.toml', 'setup.py', 'setup.cfg'],
    lockfiles: ['Pipfile.lock', 'poetry.lock'],
  },
  go: {
    name: 'Go',
    versionFiles: ['go.mod'],
    lockfiles: ['go.sum'],
  },
  rust: {
    name: 'Rust',
    versionFiles: ['Cargo.toml'],
    lockfiles: ['Cargo.lock'],
  },
  java: {
    name: 'Java',
    versionFiles: ['build.gradle', 'build.gradle.kts', 'pom.xml'],
    lockfiles: ['gradle.lockfile'],
  },
};

interface CheckResult {
  check: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  details?: string[];
}

@Injectable()
export class ReleaseCheckHandler extends AbstractHandler {
  private readonly logger = new Logger(ReleaseCheckHandler.name);

  constructor(private readonly configService: ConfigService) {
    super();
  }

  protected getHandledTools(): string[] {
    return ['pre_release_check'];
  }

  protected async handleTool(
    _toolName: string,
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    try {
      const projectRoot = this.configService.getProjectRoot();
      const ecosystem = extractOptionalString(args, 'ecosystem') || 'auto';
      const requestedChecks = extractStringArray(args, 'checks') || [];

      // Auto-detect ecosystem
      const detected = await this.detectEcosystem(projectRoot, ecosystem);

      // Run checks
      const allChecks =
        requestedChecks.length > 0 ? requestedChecks : ['version-sync', 'lockfile', 'manifest'];

      const results: CheckResult[] = [];

      for (const check of allChecks) {
        switch (check) {
          case 'version-sync':
            results.push(await this.checkVersionSync(projectRoot, detected));
            break;
          case 'lockfile':
            results.push(await this.checkLockfile(projectRoot, detected));
            break;
          case 'manifest':
            results.push(await this.checkManifest(projectRoot));
            break;
          default:
            results.push({
              check,
              status: 'skip',
              message: `Unknown check: ${check}`,
            });
        }
      }

      const passed = results.filter(r => r.status === 'pass').length;
      const failed = results.filter(r => r.status === 'fail').length;
      const skipped = results.filter(r => r.status === 'skip').length;

      return createJsonResponse({
        ecosystem: detected.name,
        summary: {
          total: results.length,
          passed,
          failed,
          skipped,
          ready: failed === 0,
        },
        results,
      });
    } catch (error) {
      this.logger.error(`Pre-release check failed: ${error}`);
      return createErrorResponse(
        `Pre-release check failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async detectEcosystem(projectRoot: string, requested: string): Promise<EcosystemConfig> {
    if (requested !== 'auto' && ECOSYSTEMS[requested]) {
      return ECOSYSTEMS[requested];
    }

    // Auto-detect by checking for ecosystem-specific files
    for (const [, eco] of Object.entries(ECOSYSTEMS)) {
      for (const file of eco.versionFiles) {
        try {
          await access(resolve(projectRoot, file));
          return eco;
        } catch {
          // File not found, try next
        }
      }
    }

    return ECOSYSTEMS.node; // Default fallback
  }

  private async checkVersionSync(
    projectRoot: string,
    ecosystem: EcosystemConfig,
  ): Promise<CheckResult> {
    const versionFiles = ecosystem.versionFiles;
    const versions: Record<string, string> = {};
    const missing: string[] = [];

    for (const file of versionFiles) {
      try {
        const content = await readFile(resolve(projectRoot, file), 'utf-8');
        const parsed = JSON.parse(content);
        if (parsed.version) {
          versions[file] = parsed.version;
        }
      } catch {
        missing.push(file);
      }
    }

    const uniqueVersions = new Set(Object.values(versions));

    if (uniqueVersions.size === 0) {
      return {
        check: 'version-sync',
        status: 'skip',
        message: 'No version files found',
        details: missing.length > 0 ? [`Missing: ${missing.join(', ')}`] : [],
      };
    }

    if (uniqueVersions.size === 1) {
      const version = [...uniqueVersions][0];
      return {
        check: 'version-sync',
        status: 'pass',
        message: `All versions consistent: ${version}`,
        details: Object.entries(versions).map(([f, v]) => `${f}: ${v}`),
      };
    }

    return {
      check: 'version-sync',
      status: 'fail',
      message: `Version mismatch detected (${uniqueVersions.size} different versions)`,
      details: Object.entries(versions).map(([f, v]) => `${f}: ${v}`),
    };
  }

  private async checkLockfile(
    projectRoot: string,
    ecosystem: EcosystemConfig,
  ): Promise<CheckResult> {
    for (const lockfile of ecosystem.lockfiles) {
      try {
        await access(resolve(projectRoot, lockfile));
        return {
          check: 'lockfile',
          status: 'pass',
          message: `Lockfile present: ${lockfile}`,
        };
      } catch {
        // Try next
      }
    }

    return {
      check: 'lockfile',
      status: 'fail',
      message: `No lockfile found (expected: ${ecosystem.lockfiles.join(' or ')})`,
    };
  }

  private async checkManifest(projectRoot: string): Promise<CheckResult> {
    const manifestPath = resolve(projectRoot, '.claude-plugin', 'plugin.json');

    try {
      const raw = await readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(raw);

      const issues: string[] = [];
      if (!manifest.name) issues.push('Missing "name"');
      if (!manifest.version) issues.push('Missing "version"');
      if (!manifest.description) issues.push('Missing "description"');

      if (issues.length > 0) {
        return {
          check: 'manifest',
          status: 'fail',
          message: 'Plugin manifest has issues',
          details: issues,
        };
      }

      return {
        check: 'manifest',
        status: 'pass',
        message: `Plugin manifest valid (v${manifest.version})`,
      };
    } catch {
      return {
        check: 'manifest',
        status: 'skip',
        message: 'No .claude-plugin/plugin.json found (not a plugin project)',
      };
    }
  }

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'pre_release_check',
        description:
          'Comprehensive pre-release validation. Auto-detects project language and checks version sync, lockfile consistency, and manifest validity.',
        inputSchema: {
          type: 'object',
          properties: {
            ecosystem: {
              type: 'string',
              enum: ['auto', 'node', 'python', 'java', 'go', 'rust'],
              description: 'Project ecosystem. Defaults to auto-detect.',
            },
            checks: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['version-sync', 'lockfile', 'manifest'],
              },
              description: 'Specific checks to run. Defaults to all.',
            },
          },
          required: [],
        },
      },
    ];
  }
}
