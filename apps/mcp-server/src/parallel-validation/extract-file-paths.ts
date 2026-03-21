/**
 * Regex for file paths with known prefixes.
 * Captures: prefix + path segments + file extension.
 */
const FILE_PATH_PATTERN =
  /(?<![/\w])(?:(?:packages|src|apps|\.claude|\.cursor|\.kiro|\.q|\.antigravity|\.codex)\/[\w./@-]+\.\w+)/g;

/**
 * Matches URLs to filter them out (http:// or https://).
 */
const URL_PATTERN = /https?:\/\/\S+/g;

/**
 * Extracts file paths from a GitHub issue body markdown text.
 *
 * Recognizes:
 * - Paths with common prefixes (packages/, src/, apps/, .claude/, .cursor/, .kiro/, .q/, .antigravity/, .codex/)
 * - Filters out URLs
 * - Deduplicates results
 */
export function extractFilePaths(issueBody: string): string[] {
  if (!issueBody.trim()) {
    return [];
  }

  // Remove URLs first to avoid false matches
  const withoutUrls = issueBody.replace(URL_PATTERN, '');

  const paths = new Set<string>();

  // Extract paths matching known prefixes
  const matches = withoutUrls.matchAll(FILE_PATH_PATTERN);
  for (const match of matches) {
    const path = match[0].replace(/[,;:)}\]]+$/, ''); // strip trailing punctuation
    paths.add(path);
  }

  return [...paths];
}
