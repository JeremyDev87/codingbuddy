/**
 * Plugin Manifest Types
 *
 * TypeScript types for plugin.json manifest files used by community plugins.
 */

export interface PluginProvides {
  agents?: string[];
  rules?: string[];
  skills?: string[];
  checklists?: string[];
}

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  tags?: string[];
  compatibility?: string;
  provides: PluginProvides;
}
