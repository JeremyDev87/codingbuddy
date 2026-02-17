/**
 * Format bytes as human-readable file size
 * ACC-004: Improves cognitive accessibility by showing sizes in MB, KB instead of raw bytes
 *
 * @param bytes - File size in bytes
 * @returns Human-readable file size (e.g., "1 MB", "500 KB", "256 bytes")
 *
 * @example
 * ```typescript
 * formatBytes(1024)       // "1 KB"
 * formatBytes(1048576)    // "1 MB"
 * formatBytes(2097152)    // "2 MB"
 * formatBytes(512)        // "512 bytes"
 * ```
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 bytes';
  if (bytes === 1) return '1 byte';

  const units = ['bytes', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  // Round to 2 decimal places for KB and above, show exact for bytes
  // Remove trailing zeros and unnecessary decimal point
  const formatted = unitIndex === 0 ? size.toString() : size.toFixed(2).replace(/\.?0+$/, '');

  return `${formatted} ${units[unitIndex]}`;
}
