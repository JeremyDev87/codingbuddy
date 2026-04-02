/**
 * Plugin Manifest Schema
 *
 * Zod-based validation for plugin.json manifest files.
 * Validates name format (lowercase-dash), version (semver),
 * and the provides structure for community plugins.
 */

import { z } from 'zod';
import type { PluginManifest } from './plugin.types';

// ============================================================================
// Custom Error
// ============================================================================

export class PluginManifestSchemaError extends Error {
  constructor(
    message: string,
    public readonly details?: z.ZodError,
  ) {
    super(message);
    this.name = 'PluginManifestSchemaError';
  }
}

// ============================================================================
// Zod Schema
// ============================================================================

const PluginProvidesSchema = z.object({
  agents: z.array(z.string()).optional(),
  rules: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  checklists: z.array(z.string()).optional(),
});

export const PluginManifestSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'Plugin name must be lowercase alphanumeric with hyphens only'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be in semver format (e.g. 1.0.0)'),
  description: z.string().min(1),
  author: z.string().min(1),
  tags: z.array(z.string()).optional(),
  compatibility: z.string().optional(),
  provides: PluginProvidesSchema,
});

// ============================================================================
// Validation Function
// ============================================================================

/**
 * Parse and validate a plugin manifest JSON against the schema.
 *
 * @param json - Raw JSON object to validate
 * @returns Typed PluginManifest on success
 * @throws PluginManifestSchemaError with descriptive messages on failure
 */
export function validatePluginManifest(json: unknown): PluginManifest {
  const result = PluginManifestSchema.safeParse(json);

  if (result.success) {
    return result.data as PluginManifest;
  }

  const errorMessage = result.error.issues
    .map(issue => {
      const pathStr = issue.path.length > 0 ? issue.path.join('.') : 'root';
      return `${pathStr}: ${issue.message}`;
    })
    .join(', ');

  throw new PluginManifestSchemaError(`Invalid plugin manifest: ${errorMessage}`, result.error);
}
