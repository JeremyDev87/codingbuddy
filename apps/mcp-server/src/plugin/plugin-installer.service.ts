/**
 * Plugin Installer Service
 *
 * Handles cloning, validating, and installing plugins from git repositories.
 * Copies plugin assets (agents, rules, skills, checklists) into .ai-rules/
 * and records installations in .codingbuddy/plugins.json.
 */

import { execSync } from 'child_process';
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  cpSync,
  rmSync,
  readdirSync,
  mkdtempSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { validatePluginManifest, PluginManifest } from './plugin-manifest.schema';
import { RegistryClient } from './registry-client';
import { getPackageVersion } from '../shared/version.utils';

// ============================================================================
// Types
// ============================================================================

export interface InstallOptions {
  source: string;
  targetRoot: string;
  force: boolean;
  version?: string;
}

export interface ResolvedSource {
  source: string;
  version?: string;
}

export interface InstallResult {
  success: boolean;
  pluginName?: string;
  summary?: string;
  error?: string;
}

export interface PluginRecord {
  name: string;
  version: string;
  source: string;
  installedAt: string;
  provides: {
    agents: string[];
    rules: string[];
    skills: string[];
    checklists: string[];
  };
}

interface PluginsRegistry {
  plugins: PluginRecord[];
}

// ============================================================================
// Asset directories to copy
// ============================================================================

const ASSET_DIRS = ['agents', 'rules', 'skills', 'checklists'] as const;

// ============================================================================
// Service
// ============================================================================

export class PluginInstallerService {
  /**
   * Resolve a plugin name or URL to a git source.
   * If input is a git URL (github: or https://), pass through.
   * Otherwise, look up the plugin name in the registry.
   * Supports name@version syntax.
   */
  async resolveSource(nameOrUrl: string): Promise<ResolvedSource> {
    if (nameOrUrl.startsWith('github:') || nameOrUrl.startsWith('https://')) {
      return { source: nameOrUrl };
    }

    const { name, version } = this.parseNameVersion(nameOrUrl);
    const client = new RegistryClient();
    const plugin = await client.findByName(name);

    if (!plugin) {
      throw new Error(
        `Plugin "${name}" not found in registry. Use a git URL (github:user/repo or https://...) for unregistered plugins.`,
      );
    }

    return version ? { source: plugin.source, version } : { source: plugin.source };
  }

  /**
   * Parse name@version syntax into name and optional version.
   */
  private parseNameVersion(input: string): { name: string; version?: string } {
    const atIndex = input.lastIndexOf('@');
    if (atIndex > 0) {
      return { name: input.slice(0, atIndex), version: input.slice(atIndex + 1) };
    }
    return { name: input };
  }

  /**
   * Resolve a git source string to a clone-able URL.
   * Supports: github:user/repo shorthand, full HTTPS URLs.
   */
  resolveGitUrl(source: string): string {
    if (source.startsWith('github:')) {
      const path = source.slice('github:'.length);
      return `https://github.com/${path}.git`;
    }

    if (source.startsWith('https://')) {
      return source;
    }

    throw new Error(`Invalid git URL format: "${source}". Use github:user/repo or https://...`);
  }

  /**
   * Install a plugin from a git source.
   */
  async install(options: InstallOptions): Promise<InstallResult> {
    let tempDir: string | undefined;

    try {
      // 1. Resolve URL
      const gitUrl = this.resolveGitUrl(options.source);

      // 2. Clone to temp directory
      tempDir = mkdtempSync(join(tmpdir(), 'codingbuddy-plugin-'));
      try {
        const branchFlag = options.version ? ` --branch v${options.version}` : '';
        execSync(`git clone --depth=1${branchFlag} ${gitUrl} ${tempDir}`, {
          stdio: 'pipe',
          timeout: 60_000,
        });
      } catch {
        return this.fail(
          'Failed to clone repository. Check the URL and your network connection.',
          tempDir,
        );
      }

      // 3. Validate plugin.json
      const manifestPath = join(tempDir, 'plugin.json');
      if (!existsSync(manifestPath)) {
        return this.fail('plugin.json not found in repository root.', tempDir);
      }

      let manifest: PluginManifest;
      try {
        const raw = readFileSync(manifestPath, 'utf-8');
        manifest = validatePluginManifest(JSON.parse(raw));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return this.fail(message, tempDir);
      }

      // 4. Check compatibility
      if (manifest.compatibility) {
        if (!this.isCompatible(manifest.compatibility)) {
          return this.fail(
            `Plugin "${manifest.name}" requires codingbuddy ${manifest.compatibility} but current version is ${getPackageVersion()}. Version incompatible.`,
            tempDir,
          );
        }
      }

      // 5. Detect conflicts
      const aiRulesDir = join(options.targetRoot, '.ai-rules');
      if (!options.force) {
        const conflicts = this.detectConflicts(tempDir, aiRulesDir, manifest);
        if (conflicts.length > 0) {
          return this.fail(
            `Name conflict detected: ${conflicts.join(', ')}. Use --force to overwrite.`,
            tempDir,
          );
        }
      }

      // 6. Copy assets
      const provides = this.copyAssets(tempDir, aiRulesDir);

      // 7. Record in plugins.json
      const pluginsJsonPath = join(options.targetRoot, '.codingbuddy', 'plugins.json');
      this.recordInstallation(pluginsJsonPath, {
        name: manifest.name,
        version: manifest.version,
        source: options.source,
        installedAt: new Date().toISOString(),
        provides,
      });

      // 8. Build summary
      const summary = `Installed ${manifest.name}@${manifest.version}: ${provides.agents.length} agents, ${provides.rules.length} rules, ${provides.skills.length} skills`;

      // 9. Cleanup
      this.cleanup(tempDir);

      return { success: true, pluginName: manifest.name, summary };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return this.fail(message, tempDir);
    }
  }

  /**
   * Check if current version satisfies the compatibility range.
   * Supports simple >=X.Y.Z format.
   */
  private isCompatible(compatibility: string): boolean {
    const currentVersion = getPackageVersion();
    const match = compatibility.match(/^>=(\d+\.\d+\.\d+)$/);
    if (!match) return true; // Unknown format — skip check

    const required = match[1];
    return this.compareVersions(currentVersion, required) >= 0;
  }

  /**
   * Simple semver comparison. Returns negative if a < b, 0 if equal, positive if a > b.
   */
  private compareVersions(a: string, b: string): number {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
      if (diff !== 0) return diff;
    }
    return 0;
  }

  /**
   * Detect name conflicts between plugin assets and existing assets.
   */
  private detectConflicts(tempDir: string, aiRulesDir: string, manifest: PluginManifest): string[] {
    const conflicts: string[] = [];

    for (const dir of ASSET_DIRS) {
      const providedNames = manifest.provides[dir] ?? [];
      for (const name of providedNames) {
        // Check common file extensions
        const extensions = dir === 'agents' ? ['.json'] : ['.md', '.json', '.yaml', '.yml'];
        for (const ext of extensions) {
          const targetPath = join(aiRulesDir, dir, `${name}${ext}`);
          if (existsSync(targetPath)) {
            conflicts.push(`${dir}/${name}`);
            break;
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Copy plugin assets from temp directory to .ai-rules/.
   */
  private copyAssets(
    tempDir: string,
    aiRulesDir: string,
  ): { agents: string[]; rules: string[]; skills: string[]; checklists: string[] } {
    const provides: { agents: string[]; rules: string[]; skills: string[]; checklists: string[] } =
      { agents: [], rules: [], skills: [], checklists: [] };

    for (const dir of ASSET_DIRS) {
      const sourceDir = join(tempDir, dir);
      const targetDir = join(aiRulesDir, dir);

      if (!existsSync(sourceDir)) continue;

      mkdirSync(targetDir, { recursive: true });

      const files = readdirSync(sourceDir);
      for (const file of files) {
        cpSync(join(sourceDir, file), join(targetDir, file), { recursive: true });
        // Track by name without extension
        const name = file.replace(/\.[^.]+$/, '');
        provides[dir].push(name);
      }
    }

    return provides;
  }

  /**
   * Record plugin installation in plugins.json.
   */
  private recordInstallation(pluginsJsonPath: string, record: PluginRecord): void {
    let registry: PluginsRegistry = { plugins: [] };

    if (existsSync(pluginsJsonPath)) {
      try {
        registry = JSON.parse(readFileSync(pluginsJsonPath, 'utf-8'));
      } catch {
        // Corrupted file — start fresh
        registry = { plugins: [] };
      }
    }

    // Remove existing record for same plugin name (update scenario)
    registry.plugins = registry.plugins.filter(p => p.name !== record.name);
    registry.plugins.push(record);

    // Ensure directory exists
    const dir = pluginsJsonPath.replace(/[/\\][^/\\]+$/, '');
    mkdirSync(dir, { recursive: true });

    writeFileSync(pluginsJsonPath, JSON.stringify(registry, null, 2), 'utf-8');
  }

  /**
   * Cleanup temp directory.
   */
  private cleanup(tempDir?: string): void {
    if (tempDir) {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Best effort cleanup
      }
    }
  }

  /**
   * Return failure result and cleanup.
   */
  private fail(error: string, tempDir?: string): InstallResult {
    this.cleanup(tempDir);
    return { success: false, error };
  }
}
