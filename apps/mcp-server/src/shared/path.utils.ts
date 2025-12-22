/**
 * Normalize path separators to forward slashes.
 * Ensures consistent path handling across platforms.
 */
export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

/**
 * Check if a path contains a specific directory segment.
 * Handles both forward and back slashes, and segment at start of path.
 *
 * @param filePath - The file path to check
 * @param segment - The directory segment to look for
 * @returns true if the segment exists in the path
 */
export function pathContainsSegment(
  filePath: string,
  segment: string,
): boolean {
  const normalized = normalizePath(filePath.toLowerCase());
  const lowerSegment = segment.toLowerCase();

  return (
    normalized.includes(`/${lowerSegment}/`) ||
    normalized.startsWith(`${lowerSegment}/`)
  );
}
