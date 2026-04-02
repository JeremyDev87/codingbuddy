/**
 * Plugin Install Command
 *
 * CLI command handler for `codingbuddy install <git-url>`.
 * Delegates to PluginInstallerService for the actual installation logic.
 */

import { PluginInstallerService } from '../../plugin/plugin-installer.service';
import { createConsoleUtils } from '../utils/console';

export interface InstallCommandOptions {
  source: string;
  projectRoot: string;
  force: boolean;
}

export interface InstallCommandResult {
  success: boolean;
  error?: string;
}

export async function runInstall(options: InstallCommandOptions): Promise<InstallCommandResult> {
  const console = createConsoleUtils();
  const installer = new PluginInstallerService();

  try {
    const resolved = await installer.resolveSource(options.source);

    console.log.step('📦', `Installing plugin from ${resolved.source}...`);

    const result = await installer.install({
      source: resolved.source,
      targetRoot: options.projectRoot,
      force: options.force,
      version: resolved.version,
    });

    if (result.success) {
      console.log.success(result.summary ?? `Installed ${result.pluginName}`);
      return { success: true };
    }

    console.log.error(result.error ?? 'Installation failed');
    return { success: false, error: result.error };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log.error(message);
    return { success: false, error: message };
  }
}
