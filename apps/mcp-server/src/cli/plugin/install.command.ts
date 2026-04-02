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

  console.log.step('📦', `Installing plugin from ${options.source}...`);

  try {
    const result = await installer.install({
      source: options.source,
      targetRoot: options.projectRoot,
      force: options.force,
    });

    if (result.success) {
      console.log.success(result.summary ?? `Installed ${result.pluginName}`);
      return { success: true };
    }

    console.log.error(result.error ?? 'Installation failed');
    return { success: false, error: result.error };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log.error(`Unexpected error: ${message}`);
    return { success: false, error: message };
  }
}
