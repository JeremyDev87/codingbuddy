/**
 * Agent Name Utilities
 *
 * Provides consistent agent name transformations across the codebase.
 */

/**
 * Normalize an agent name to kebab-case identifier format.
 * Converts "Frontend Developer" to "frontend-developer".
 *
 * Handles edge cases:
 * - Empty or whitespace-only input returns empty string
 * - Special characters are removed (keeps alphanumeric, spaces, hyphens)
 * - Multiple spaces/hyphens are collapsed to single hyphen
 * - Leading/trailing spaces and hyphens are trimmed
 *
 * @param name - The agent display name
 * @returns Normalized kebab-case identifier
 */
export function normalizeAgentName(name: string): string {
  if (!name) return '';

  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/[\s-]+/g, '-') // Replace spaces and multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Trim leading/trailing hyphens
}
