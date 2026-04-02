/**
 * Plugin Manifest Types
 *
 * Re-exports Zod-inferred types as the single source of truth.
 * Manual interfaces kept for PluginProvides (used independently).
 */

export interface PluginProvides {
  agents?: string[];
  rules?: string[];
  skills?: string[];
  checklists?: string[];
}

export type { PluginManifest } from './plugin-manifest.schema';
